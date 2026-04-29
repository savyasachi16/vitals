import fs from 'fs';
import readline from 'readline';
import Database from 'better-sqlite3';

// Usage: node scripts/parse-health-xml.js [path-to-export.xml]
async function main() {
  const xmlPath = process.argv[2] || '/Users/savya/Downloads/apple_health_export/export.xml';
  const dbPath = 'health.db';

  if (!fs.existsSync(xmlPath)) {
    console.error(`File not found: ${xmlPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(xmlPath);
  console.log(`Parsing ${xmlPath} (${(stats.size / 1024 / 1024 / 1024).toFixed(2)} GB)...`);

  // Remove existing DB
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log(`Removed existing ${dbPath}`);
  }

  const db = new Database(dbPath);
  console.log(`Created SQLite database: ${dbPath}`);

  // Create tables
  db.exec(`
    CREATE TABLE records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      source_name TEXT,
      date TEXT GENERATED ALWAYS AS (substr(start_date, 1, 10)) STORED
    );

    CREATE INDEX idx_records_type ON records(type);
    CREATE INDEX idx_records_date ON records(date);
    CREATE INDEX idx_records_type_date ON records(type, date);

    CREATE TABLE workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_type TEXT NOT NULL,
      duration REAL,
      duration_unit TEXT,
      total_energy_kcal REAL,
      total_distance REAL,
      distance_unit TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      source_name TEXT,
      date TEXT GENERATED ALWAYS AS (substr(start_date, 1, 10)) STORED
    );

    CREATE INDEX idx_workouts_type ON workouts(activity_type);
    CREATE INDEX idx_workouts_date ON workouts(date);
  `);
  console.log('Database schema created');

  const insertRecord = db.prepare(`
    INSERT INTO records (type, value, unit, start_date, end_date, source_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertWorkout = db.prepare(`
    INSERT INTO workouts (activity_type, duration, duration_unit, total_energy_kcal, total_distance, distance_unit, start_date, end_date, source_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Regex patterns
  const recordRegex = /<Record\s+([^>]+)\/?>/g;
  const workoutRegex = /<Workout\s+([^>]+)\/?>/g;
  const attrRegex = /(\w+)\s*=\s*"([^"]*)"/g;

  let recordCount = 0;
  let workoutCount = 0;
  const typesSeen = new Set();

  // Use transaction for faster inserts
  const insertMany = db.transaction((records) => {
    for (const r of records) {
      try {
        insertRecord.run(r.type, r.value, r.unit, r.start_date, r.end_date, r.source_name);
        typesSeen.add(r.type);
        recordCount++;
      } catch (e) {
        // Skip duplicates
      }
    }
  });

  console.log('Reading file line by line...');
  const fileStream = fs.createReadStream(xmlPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  const batchSize = 50000;
  let recordBatch = [];

  for await (const line of rl) {
    lineCount++;
    if (lineCount % 1000000 === 0) {
      console.log(`Read ${lineCount} lines, parsed ${recordCount} records, ${workoutCount} workouts...`);
    }

    // Parse Record entries
    let match;
    recordRegex.lastIndex = 0;
    while ((match = recordRegex.exec(line)) !== null) {
      const attrs = {};
      let attrMatch;
      attrRegex.lastIndex = 0;
      while ((attrMatch = attrRegex.exec(match[1])) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }

      if (attrs.type && attrs.startDate) {
        let value = parseFloat(attrs.value);
        let unit = attrs.unit || '';

        // Handle sleep analysis (category type) - calculate duration in hours
        if (attrs.type === 'HKCategoryTypeIdentifierSleepAnalysis' && attrs.startDate && attrs.endDate) {
          // Fix Apple Health date format: "2021-01-10 10:11:49 -0500" → parse manually
          const parseDate = (str) => {
            // Format: "2021-01-10 10:11:49 -0500"
            const parts = str.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})/);
            if (!parts) return new Date(str);
            const [_, y, m, d, h, min, s, tz] = parts;
            // Convert timezone offset to minutes
            const tzSign = tz[0] === '+' ? 1 : -1;
            const tzHours = parseInt(tz.substring(1, 3));
            const tzMins = parseInt(tz.substring(3, 5));
            const tzOffset = tzSign * (tzHours * 60 + tzMins);
            const date = new Date(Date.UTC(y, m-1, d, h, min - tzOffset, s));
            return date;
          };
          const start = parseDate(attrs.startDate);
          const end = parseDate(attrs.endDate);
          const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          value = durationHours;
          unit = 'hr';
        }

        if (!isNaN(value)) {
          recordBatch.push({
            type: attrs.type,
            value,
            unit,
            start_date: attrs.startDate,
            end_date: attrs.endDate || attrs.startDate,
            source_name: attrs.sourceName || '',
          });

          if (recordBatch.length >= batchSize) {
            insertMany(recordBatch);
            recordBatch = [];
          }
        }
      }
    }

    // Parse Workout entries
    workoutRegex.lastIndex = 0;
    while ((match = workoutRegex.exec(line)) !== null) {
      const attrs = {};
      let attrMatch;
      attrRegex.lastIndex = 0;
      while ((attrMatch = attrRegex.exec(match[1])) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }

      if (attrs.workoutActivityType && attrs.startDate) {
        try {
          insertWorkout.run(
            attrs.workoutActivityType,
            parseFloat(attrs.duration || '0'),
            attrs.durationUnit || 'min',
            parseFloat(attrs.totalEnergyBurned || '0'),
            parseFloat(attrs.totalDistance || '0'),
            attrs.totalDistanceUnit || '',
            attrs.startDate,
            attrs.endDate || attrs.startDate,
            attrs.sourceName || ''
          );
          workoutCount++;
        } catch (e) {
          // Skip
        }
      }
    }
  }

  // Insert remaining batches
  if (recordBatch.length > 0) {
    insertMany(recordBatch);
  }

  console.log(`Done. Records: ${recordCount}, Workouts: ${workoutCount}`);

  // Get stats
  const dateRange = db.prepare('SELECT MIN(date) as start, MAX(date) as end FROM records').get();
  const types = db.prepare('SELECT DISTINCT type FROM records ORDER BY type').all();
  const workoutTypes = db.prepare('SELECT DISTINCT activity_type FROM workouts ORDER BY activity_type').all();

  console.log(`Date range: ${dateRange.start} to ${dateRange.end}`);
  console.log(`Unique record types: ${types.length}`);
  console.log(`Unique workout types: ${workoutTypes.length}`);

  db.close();
  console.log(`Database saved to ${dbPath}`);
  console.log(`\nNext step: Run 'node scripts/generate-json.js' to create static JSON files for the dashboard`);
}

main().catch(console.error);

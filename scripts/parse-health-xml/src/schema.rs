//! SQLite schema for the `records` and `workouts` tables.
//!
//! Matches the layout produced by `scripts/parse-health-xml.js`
//! so that `scripts/generate-json.js` keeps working unchanged.

use rusqlite::{Connection, Result};

const DDL: &str = r#"
CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    source_name TEXT,
    date TEXT GENERATED ALWAYS AS (substr(start_date, 1, 10)) STORED
);

CREATE INDEX IF NOT EXISTS idx_records_type ON records(type);
CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
CREATE INDEX IF NOT EXISTS idx_records_type_date ON records(type, date);

CREATE TABLE IF NOT EXISTS workouts (
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

CREATE INDEX IF NOT EXISTS idx_workouts_type ON workouts(activity_type);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
"#;

pub fn create_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(DDL)
}

use std::fs;
use std::io::BufReader;
use std::path::PathBuf;

use anyhow::{bail, Context, Result};
use clap::Parser;
use parse_health_xml::ingest::{ingest_xml, IngestMode};
use parse_health_xml::schema::create_schema;
use rusqlite::Connection;

const DEFAULT_XML: &str = "/Users/savya/Downloads/apple_health_export/export.xml";
const DEFAULT_DB: &str = "health.db";

#[derive(Debug, Parser)]
#[command(
    name = "parse-health-xml",
    about = "Stream Apple Health export.xml into SQLite",
    version
)]
struct Args {
    /// Path to export.xml from the iPhone Health app.
    #[arg(default_value = DEFAULT_XML)]
    xml_path: PathBuf,

    /// SQLite database path to write into.
    #[arg(long, default_value = DEFAULT_DB)]
    db: PathBuf,

    /// Delete the existing database before ingesting.
    #[arg(long)]
    fresh: bool,
}

fn main() -> Result<()> {
    let args = Args::parse();

    if !args.xml_path.exists() {
        bail!("File not found: {}", args.xml_path.display());
    }

    let xml_meta = fs::metadata(&args.xml_path)
        .with_context(|| format!("stat {}", args.xml_path.display()))?;
    println!(
        "Parsing {} ({:.2} GB)...",
        args.xml_path.display(),
        xml_meta.len() as f64 / 1024.0 / 1024.0 / 1024.0
    );

    let db_existed = args.db.exists();
    if args.fresh && db_existed {
        fs::remove_file(&args.db).with_context(|| format!("remove {}", args.db.display()))?;
        println!("Removed existing {} (--fresh)", args.db.display());
    }
    let incremental = !args.fresh && db_existed;

    let conn = Connection::open(&args.db).with_context(|| format!("open {}", args.db.display()))?;
    create_schema(&conn).context("create schema")?;

    if incremental {
        println!("Incremental update on {}", args.db.display());
    } else {
        println!("Created SQLite database: {}", args.db.display());
    }
    println!("Database schema created");

    let mode = if incremental {
        IngestMode::Incremental
    } else {
        IngestMode::Fresh
    };

    let file = fs::File::open(&args.xml_path)
        .with_context(|| format!("open {}", args.xml_path.display()))?;
    let reader = BufReader::with_capacity(1 << 20, file);

    let stats = ingest_xml(reader, &conn, mode).context("ingest")?;

    println!(
        "Done. Records: {}, Workouts: {}",
        stats.records_inserted, stats.workouts_inserted
    );
    if let Some((start, end)) = stats.date_range {
        println!("Date range: {start} to {end}");
    }
    println!("Unique record types: {}", stats.unique_record_types);
    println!("Unique workout types: {}", stats.unique_workout_types);
    println!("Database saved to {}", args.db.display());
    println!();
    println!("Next step: Run 'node scripts/generate-json.js' to create static JSON files for the dashboard");

    Ok(())
}

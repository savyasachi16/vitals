//! Stream Apple Health XML into SQLite.
//!
//! Rows are buffered up to `BATCH_SIZE` and flushed inside a single transaction,
//! matching the 50k-row batching the JS parser used. Incremental mode reads
//! `MAX(start_date)` per table and only inserts strictly newer rows (`>` cutoff,
//! matching the JS comparison `attrs.startDate > cutoff`).

use std::io::BufRead;

use rusqlite::{params, Connection};
use thiserror::Error;

use crate::parser::{parse_stream, ParsedItem, Record, Workout};

pub const BATCH_SIZE: usize = 50_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IngestMode {
    Fresh,
    Incremental,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct IngestStats {
    pub records_inserted: u64,
    pub workouts_inserted: u64,
    pub unique_record_types: u64,
    pub unique_workout_types: u64,
    pub date_range: Option<(String, String)>,
}

#[derive(Debug, Error)]
pub enum IngestError {
    #[error(transparent)]
    Sqlite(#[from] rusqlite::Error),
    #[error(transparent)]
    Parse(#[from] crate::parser::ParseError),
}

pub fn ingest_xml<R: BufRead>(
    reader: R,
    conn: &Connection,
    mode: IngestMode,
) -> Result<IngestStats, IngestError> {
    let (record_cutoff, workout_cutoff) = match mode {
        IngestMode::Fresh => (None, None),
        IngestMode::Incremental => (
            max_start_date(conn, "records")?,
            max_start_date(conn, "workouts")?,
        ),
    };

    let tx = conn.unchecked_transaction()?;

    let mut record_buf: Vec<Record> = Vec::with_capacity(BATCH_SIZE);
    let mut workout_buf: Vec<Workout> = Vec::with_capacity(BATCH_SIZE);
    let mut records_inserted: u64 = 0;
    let mut workouts_inserted: u64 = 0;

    // We do all flushing inside the closure so the buffers never exceed BATCH_SIZE.
    // Any sqlite error mid-stream is captured here and surfaced after parsing ends.
    let mut flush_err: Option<rusqlite::Error> = None;

    let result = parse_stream(reader, |item| {
        if flush_err.is_some() {
            return;
        }
        match item {
            ParsedItem::Record(r) => {
                if !cutoff_allows(&record_cutoff, &r.start_date) {
                    return;
                }
                record_buf.push(r);
                if record_buf.len() >= BATCH_SIZE {
                    if let Err(e) = flush_records(&tx, &mut record_buf, &mut records_inserted) {
                        flush_err = Some(e);
                    }
                }
            }
            ParsedItem::Workout(w) => {
                if !cutoff_allows(&workout_cutoff, &w.start_date) {
                    return;
                }
                workout_buf.push(w);
                if workout_buf.len() >= BATCH_SIZE {
                    if let Err(e) = flush_workouts(&tx, &mut workout_buf, &mut workouts_inserted) {
                        flush_err = Some(e);
                    }
                }
            }
        }
    });

    if let Some(e) = flush_err {
        return Err(e.into());
    }
    result?;

    flush_records(&tx, &mut record_buf, &mut records_inserted)?;
    flush_workouts(&tx, &mut workout_buf, &mut workouts_inserted)?;
    tx.commit()?;

    let unique_record_types = conn.query_row(
        "SELECT COUNT(DISTINCT type) FROM records",
        [],
        |r| r.get::<_, i64>(0),
    )? as u64;
    let unique_workout_types = conn.query_row(
        "SELECT COUNT(DISTINCT activity_type) FROM workouts",
        [],
        |r| r.get::<_, i64>(0),
    )? as u64;
    let date_range: Option<(String, String)> = conn.query_row(
        "SELECT MIN(date), MAX(date) FROM records",
        [],
        |r| {
            let min: Option<String> = r.get(0)?;
            let max: Option<String> = r.get(1)?;
            Ok(min.zip(max))
        },
    )?;

    Ok(IngestStats {
        records_inserted,
        workouts_inserted,
        unique_record_types,
        unique_workout_types,
        date_range,
    })
}

fn cutoff_allows(cutoff: &Option<String>, start_date: &str) -> bool {
    match cutoff {
        None => true,
        Some(c) => start_date > c.as_str(),
    }
}

fn max_start_date(conn: &Connection, table: &str) -> Result<Option<String>, IngestError> {
    let value: Option<String> = conn.query_row(
        &format!("SELECT MAX(start_date) FROM {table}"),
        [],
        |r| r.get(0),
    )?;
    Ok(value)
}

fn flush_records(
    conn: &Connection,
    buf: &mut Vec<Record>,
    counter: &mut u64,
) -> Result<(), rusqlite::Error> {
    if buf.is_empty() {
        return Ok(());
    }
    let mut stmt = conn.prepare_cached(
        "INSERT INTO records (type, value, unit, start_date, end_date, source_name)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )?;
    for r in buf.drain(..) {
        stmt.execute(params![r.r#type, r.value, r.unit, r.start_date, r.end_date, r.source_name])?;
        *counter += 1;
    }
    Ok(())
}

fn flush_workouts(
    conn: &Connection,
    buf: &mut Vec<Workout>,
    counter: &mut u64,
) -> Result<(), rusqlite::Error> {
    if buf.is_empty() {
        return Ok(());
    }
    let mut stmt = conn.prepare_cached(
        "INSERT INTO workouts (activity_type, duration, duration_unit, total_energy_kcal, total_distance, distance_unit, start_date, end_date, source_name)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
    )?;
    for w in buf.drain(..) {
        stmt.execute(params![
            w.activity_type,
            w.duration,
            w.duration_unit,
            w.total_energy_kcal,
            w.total_distance,
            w.distance_unit,
            w.start_date,
            w.end_date,
            w.source_name,
        ])?;
        *counter += 1;
    }
    Ok(())
}

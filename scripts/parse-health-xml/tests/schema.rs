//! Schema DDL parity tests.
//!
//! These match the table/column/index layout produced by the JS parser
//! (`scripts/parse-health-xml.js`) so `scripts/generate-json.js` keeps
//! working without changes.

use parse_health_xml::schema::create_schema;
use rusqlite::Connection;

fn columns(conn: &Connection, table: &str) -> Vec<(String, String, i64)> {
    // PRAGMA table_xinfo returns: cid, name, type, notnull, dflt_value, pk, hidden
    // (table_info hides STORED generated columns; xinfo includes them.)
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_xinfo({table})"))
        .unwrap();
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
            ))
        })
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap();
    rows
}

fn index_names(conn: &Connection, table: &str) -> Vec<String> {
    let mut stmt = conn
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name=?1 AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .unwrap();
    stmt.query_map([table], |row| row.get::<_, String>(0))
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap()
}

#[test]
fn creates_records_table_with_expected_columns() {
    let conn = Connection::open_in_memory().unwrap();
    create_schema(&conn).unwrap();

    let cols = columns(&conn, "records");
    let names: Vec<&str> = cols.iter().map(|(n, _, _)| n.as_str()).collect();
    assert_eq!(
        names,
        vec![
            "id",
            "type",
            "value",
            "unit",
            "start_date",
            "end_date",
            "source_name",
            "date",
        ]
    );
}

#[test]
fn creates_workouts_table_with_expected_columns() {
    let conn = Connection::open_in_memory().unwrap();
    create_schema(&conn).unwrap();

    let cols = columns(&conn, "workouts");
    let names: Vec<&str> = cols.iter().map(|(n, _, _)| n.as_str()).collect();
    assert_eq!(
        names,
        vec![
            "id",
            "activity_type",
            "duration",
            "duration_unit",
            "total_energy_kcal",
            "total_distance",
            "distance_unit",
            "start_date",
            "end_date",
            "source_name",
            "date",
        ]
    );
}

#[test]
fn records_date_is_a_stored_generated_column() {
    let conn = Connection::open_in_memory().unwrap();
    create_schema(&conn).unwrap();
    conn.execute(
        "INSERT INTO records (type, value, unit, start_date, end_date, source_name)
         VALUES ('HKQuantityTypeIdentifierStepCount', 100.0, 'count', '2024-03-15 10:00:00 -0400', '2024-03-15 10:05:00 -0400', 'iPhone')",
        [],
    )
    .unwrap();
    let date: String = conn
        .query_row("SELECT date FROM records LIMIT 1", [], |r| r.get(0))
        .unwrap();
    assert_eq!(date, "2024-03-15");
}

#[test]
fn workouts_date_is_a_stored_generated_column() {
    let conn = Connection::open_in_memory().unwrap();
    create_schema(&conn).unwrap();
    conn.execute(
        "INSERT INTO workouts (activity_type, duration, duration_unit, total_energy_kcal, total_distance, distance_unit, start_date, end_date, source_name)
         VALUES ('HKWorkoutActivityTypeRunning', 30.0, 'min', 250.0, 5.0, 'km', '2024-03-15 07:00:00 -0400', '2024-03-15 07:30:00 -0400', 'Apple Watch')",
        [],
    )
    .unwrap();
    let date: String = conn
        .query_row("SELECT date FROM workouts LIMIT 1", [], |r| r.get(0))
        .unwrap();
    assert_eq!(date, "2024-03-15");
}

#[test]
fn creates_expected_indexes() {
    let conn = Connection::open_in_memory().unwrap();
    create_schema(&conn).unwrap();
    assert_eq!(
        index_names(&conn, "records"),
        vec![
            "idx_records_date",
            "idx_records_type",
            "idx_records_type_date"
        ]
    );
    assert_eq!(
        index_names(&conn, "workouts"),
        vec!["idx_workouts_date", "idx_workouts_type"]
    );
}

#[test]
fn create_schema_is_idempotent() {
    let conn = Connection::open_in_memory().unwrap();
    create_schema(&conn).unwrap();
    // Second call must not error (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS).
    create_schema(&conn).unwrap();
    create_schema(&conn).unwrap();
}

#[test]
fn type_and_start_date_are_not_null() {
    let conn = Connection::open_in_memory().unwrap();
    create_schema(&conn).unwrap();
    let cols = columns(&conn, "records");
    let by_name = |name: &str| cols.iter().find(|(n, _, _)| n == name).unwrap();
    assert_eq!(by_name("type").2, 1, "records.type should be NOT NULL");
    assert_eq!(by_name("value").2, 1, "records.value should be NOT NULL");
    assert_eq!(
        by_name("start_date").2,
        1,
        "records.start_date should be NOT NULL"
    );
    assert_eq!(
        by_name("end_date").2,
        1,
        "records.end_date should be NOT NULL"
    );
}

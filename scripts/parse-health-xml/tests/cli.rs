//! End-to-end CLI tests via assert_cmd.

use std::fs;

use assert_cmd::Command;
use predicates::prelude::*;
use rusqlite::Connection;
use tempfile::tempdir;

fn write_xml(dir: &std::path::Path, contents: &str) -> std::path::PathBuf {
    let p = dir.join("export.xml");
    fs::write(&p, contents).unwrap();
    p
}

const TINY: &str = r#"<HealthData>
<Record type="HKQuantityTypeIdentifierStepCount" value="100" unit="count" startDate="2024-03-15 10:00:00 -0400" endDate="2024-03-15 10:05:00 -0400" sourceName="iPhone"/>
<Record type="HKQuantityTypeIdentifierStepCount" value="200" unit="count" startDate="2024-03-16 10:00:00 -0400" endDate="2024-03-16 10:05:00 -0400" sourceName="iPhone"/>
<Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="30" durationUnit="min" totalEnergyBurned="250" totalDistance="5.2" totalDistanceUnit="km" startDate="2024-03-15 07:00:00 -0400" endDate="2024-03-15 07:30:00 -0400" sourceName="Apple Watch"/>
</HealthData>"#;

#[test]
fn fresh_ingest_creates_db_and_reports_stats() {
    let dir = tempdir().unwrap();
    let xml = write_xml(dir.path(), TINY);
    let db = dir.path().join("health.db");

    Command::cargo_bin("parse-health-xml")
        .unwrap()
        .arg(&xml)
        .arg("--db")
        .arg(&db)
        .assert()
        .success()
        .stdout(predicate::str::contains("Parsing"))
        .stdout(predicate::str::contains("Created SQLite database"))
        .stdout(predicate::str::contains("Records: 2"))
        .stdout(predicate::str::contains("Workouts: 1"));

    let conn = Connection::open(&db).unwrap();
    let n: i64 = conn
        .query_row("SELECT COUNT(*) FROM records", [], |r| r.get(0))
        .unwrap();
    assert_eq!(n, 2);
}

#[test]
fn missing_xml_file_exits_with_error() {
    let dir = tempdir().unwrap();
    Command::cargo_bin("parse-health-xml")
        .unwrap()
        .arg(dir.path().join("does-not-exist.xml"))
        .arg("--db")
        .arg(dir.path().join("health.db"))
        .assert()
        .failure()
        .stderr(predicate::str::contains("not found").or(predicate::str::contains("No such file")));
}

#[test]
fn incremental_run_skips_already_ingested_rows() {
    let dir = tempdir().unwrap();
    let xml = write_xml(dir.path(), TINY);
    let db = dir.path().join("health.db");

    // First pass: fresh.
    Command::cargo_bin("parse-health-xml")
        .unwrap()
        .arg(&xml)
        .arg("--db")
        .arg(&db)
        .assert()
        .success();

    // Second pass: incremental over the same XML inserts nothing new.
    Command::cargo_bin("parse-health-xml")
        .unwrap()
        .arg(&xml)
        .arg("--db")
        .arg(&db)
        .assert()
        .success()
        .stdout(predicate::str::contains("Incremental"))
        .stdout(predicate::str::contains("Records: 0"))
        .stdout(predicate::str::contains("Workouts: 0"));

    let conn = Connection::open(&db).unwrap();
    let n: i64 = conn
        .query_row("SELECT COUNT(*) FROM records", [], |r| r.get(0))
        .unwrap();
    assert_eq!(n, 2);
}

#[test]
fn incremental_run_picks_up_newer_rows() {
    let dir = tempdir().unwrap();
    let xml1 = write_xml(dir.path(), TINY);
    let db = dir.path().join("health.db");

    Command::cargo_bin("parse-health-xml")
        .unwrap()
        .arg(&xml1)
        .arg("--db")
        .arg(&db)
        .assert()
        .success();

    let bigger = format!(
        "{}\n<HealthData><Record type=\"HKQuantityTypeIdentifierStepCount\" value=\"999\" unit=\"count\" startDate=\"2024-04-01 10:00:00 -0400\" endDate=\"2024-04-01 10:05:00 -0400\"/></HealthData>",
        TINY
    );
    let xml2 = dir.path().join("export2.xml");
    fs::write(&xml2, bigger).unwrap();

    Command::cargo_bin("parse-health-xml")
        .unwrap()
        .arg(&xml2)
        .arg("--db")
        .arg(&db)
        .assert()
        .success()
        .stdout(predicate::str::contains("Records: 1"));

    let conn = Connection::open(&db).unwrap();
    let n: i64 = conn
        .query_row("SELECT COUNT(*) FROM records", [], |r| r.get(0))
        .unwrap();
    assert_eq!(n, 3);
}

#[test]
fn fresh_flag_wipes_existing_database() {
    let dir = tempdir().unwrap();
    let xml = write_xml(dir.path(), TINY);
    let db = dir.path().join("health.db");

    Command::cargo_bin("parse-health-xml")
        .unwrap()
        .arg(&xml)
        .arg("--db")
        .arg(&db)
        .assert()
        .success();

    Command::cargo_bin("parse-health-xml")
        .unwrap()
        .arg(&xml)
        .arg("--db")
        .arg(&db)
        .arg("--fresh")
        .assert()
        .success()
        .stdout(predicate::str::contains("Removed existing"))
        .stdout(predicate::str::contains("Records: 2"));

    let conn = Connection::open(&db).unwrap();
    let n: i64 = conn
        .query_row("SELECT COUNT(*) FROM records", [], |r| r.get(0))
        .unwrap();
    assert_eq!(n, 2);
}

#[test]
fn sleep_record_is_stored_as_duration_hours_end_to_end() {
    let dir = tempdir().unwrap();
    let xml = write_xml(
        dir.path(),
        r#"<HealthData><Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAsleepCore" startDate="2024-03-15 22:30:00 -0400" endDate="2024-03-16 06:45:00 -0400" sourceName="Apple Watch"/></HealthData>"#,
    );
    let db = dir.path().join("health.db");

    Command::cargo_bin("parse-health-xml")
        .unwrap()
        .arg(&xml)
        .arg("--db")
        .arg(&db)
        .assert()
        .success();

    let conn = Connection::open(&db).unwrap();
    let (v, u): (f64, String) = conn
        .query_row("SELECT value, unit FROM records LIMIT 1", [], |r| {
            Ok((r.get(0)?, r.get(1)?))
        })
        .unwrap();
    assert!((v - 8.25).abs() < 1e-9, "value was {v}");
    assert_eq!(u, "hr");
}

#[test]
fn final_output_includes_date_range_and_type_counts() {
    let dir = tempdir().unwrap();
    let xml = write_xml(dir.path(), TINY);
    let db = dir.path().join("health.db");

    Command::cargo_bin("parse-health-xml")
        .unwrap()
        .arg(&xml)
        .arg("--db")
        .arg(&db)
        .assert()
        .success()
        .stdout(predicate::str::contains(
            "Date range: 2024-03-15 to 2024-03-16",
        ))
        .stdout(predicate::str::contains("Unique record types: 1"))
        .stdout(predicate::str::contains("Unique workout types: 1"));
}

#[test]
fn help_lists_args() {
    Command::cargo_bin("parse-health-xml")
        .unwrap()
        .arg("--help")
        .assert()
        .success()
        .stdout(predicate::str::contains("--fresh"))
        .stdout(predicate::str::contains("--db"));
}

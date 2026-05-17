//! Ingest tests: glue between the streaming parser and SQLite.

use parse_health_xml::ingest::{ingest_xml, IngestMode, IngestStats};
use parse_health_xml::schema::create_schema;
use rusqlite::Connection;

fn fresh_conn() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    create_schema(&conn).unwrap();
    conn
}

fn count(conn: &Connection, table: &str) -> i64 {
    conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |r| r.get(0))
        .unwrap()
}

#[test]
fn fresh_mode_inserts_all_rows() {
    let conn = fresh_conn();
    let xml = r#"<HealthData>
        <Record type="HKQuantityTypeIdentifierStepCount" value="100" unit="count" startDate="2024-03-15 10:00:00 -0400" endDate="2024-03-15 10:05:00 -0400" sourceName="iPhone"/>
        <Record type="HKQuantityTypeIdentifierStepCount" value="200" unit="count" startDate="2024-03-16 10:00:00 -0400" endDate="2024-03-16 10:05:00 -0400" sourceName="iPhone"/>
        <Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="30" durationUnit="min" totalEnergyBurned="250" totalDistance="5.2" totalDistanceUnit="km" startDate="2024-03-15 07:00:00 -0400" endDate="2024-03-15 07:30:00 -0400" sourceName="Apple Watch"/>
    </HealthData>"#;

    let stats = ingest_xml(xml.as_bytes(), &conn, IngestMode::Fresh).unwrap();
    assert_eq!(stats.records_inserted, 2);
    assert_eq!(stats.workouts_inserted, 1);
    assert_eq!(count(&conn, "records"), 2);
    assert_eq!(count(&conn, "workouts"), 1);
}

#[test]
fn ingest_persists_all_fields_for_records() {
    let conn = fresh_conn();
    let xml = r#"<HealthData>
        <Record type="HKQuantityTypeIdentifierStepCount" value="42" unit="count" startDate="2024-03-15 10:00:00 -0400" endDate="2024-03-15 10:05:00 -0400" sourceName="iPhone"/>
    </HealthData>"#;
    ingest_xml(xml.as_bytes(), &conn, IngestMode::Fresh).unwrap();

    let (t, v, u, s, e, src, date): (String, f64, String, String, String, String, String) = conn
        .query_row(
            "SELECT type, value, unit, start_date, end_date, source_name, date FROM records LIMIT 1",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?, r.get(6)?)),
        )
        .unwrap();
    assert_eq!(t, "HKQuantityTypeIdentifierStepCount");
    assert_eq!(v, 42.0);
    assert_eq!(u, "count");
    assert_eq!(s, "2024-03-15 10:00:00 -0400");
    assert_eq!(e, "2024-03-15 10:05:00 -0400");
    assert_eq!(src, "iPhone");
    assert_eq!(date, "2024-03-15");
}

#[test]
fn ingest_persists_all_fields_for_workouts() {
    let conn = fresh_conn();
    let xml = r#"<HealthData>
        <Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="30" durationUnit="min" totalEnergyBurned="250" totalDistance="5.2" totalDistanceUnit="km" startDate="2024-03-15 07:00:00 -0400" endDate="2024-03-15 07:30:00 -0400" sourceName="Apple Watch"/>
    </HealthData>"#;
    ingest_xml(xml.as_bytes(), &conn, IngestMode::Fresh).unwrap();

    let (at, dur, du, kcal, dist, distu, src, date): (String, f64, String, f64, f64, String, String, String) = conn
        .query_row(
            "SELECT activity_type, duration, duration_unit, total_energy_kcal, total_distance, distance_unit, source_name, date FROM workouts LIMIT 1",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?, r.get(6)?, r.get(7)?)),
        )
        .unwrap();
    assert_eq!(at, "HKWorkoutActivityTypeRunning");
    assert_eq!(dur, 30.0);
    assert_eq!(du, "min");
    assert_eq!(kcal, 250.0);
    assert_eq!(dist, 5.2);
    assert_eq!(distu, "km");
    assert_eq!(src, "Apple Watch");
    assert_eq!(date, "2024-03-15");
}

#[test]
fn incremental_mode_skips_rows_with_start_date_at_or_below_cutoff() {
    let conn = fresh_conn();
    conn.execute(
        "INSERT INTO records (type, value, unit, start_date, end_date, source_name)
         VALUES ('HKQuantityTypeIdentifierStepCount', 50, 'count', '2024-03-14 10:00:00 -0400', '2024-03-14 10:05:00 -0400', 'iPhone')",
        [],
    )
    .unwrap();

    let xml = r#"<HealthData>
        <Record type="HKQuantityTypeIdentifierStepCount" value="100" unit="count" startDate="2024-03-14 10:00:00 -0400" endDate="2024-03-14 10:05:00 -0400"/>
        <Record type="HKQuantityTypeIdentifierStepCount" value="200" unit="count" startDate="2024-03-15 10:00:00 -0400" endDate="2024-03-15 10:05:00 -0400"/>
    </HealthData>"#;

    let stats = ingest_xml(xml.as_bytes(), &conn, IngestMode::Incremental).unwrap();
    // The same-timestamp row is skipped (cutoff is <=), the newer one is inserted.
    assert_eq!(stats.records_inserted, 1);
    assert_eq!(count(&conn, "records"), 2);
}

#[test]
fn incremental_mode_independent_cutoffs_for_records_and_workouts() {
    let conn = fresh_conn();
    conn.execute(
        "INSERT INTO records (type, value, unit, start_date, end_date, source_name)
         VALUES ('HKQuantityTypeIdentifierStepCount', 1, 'count', '2024-03-15 10:00:00 -0400', '2024-03-15 10:05:00 -0400', '')",
        [],
    )
    .unwrap();
    // No existing workouts -> workout cutoff is None -> all workouts insert.

    let xml = r#"<HealthData>
        <Record type="HKQuantityTypeIdentifierStepCount" value="2" startDate="2024-03-14 09:00:00 -0400" endDate="2024-03-14 09:05:00 -0400"/>
        <Workout workoutActivityType="HKWorkoutActivityTypeYoga" duration="30" startDate="2024-01-01 07:00:00 -0400" endDate="2024-01-01 07:30:00 -0400"/>
    </HealthData>"#;
    let stats = ingest_xml(xml.as_bytes(), &conn, IngestMode::Incremental).unwrap();
    assert_eq!(stats.records_inserted, 0);
    assert_eq!(stats.workouts_inserted, 1);
}

#[test]
fn stats_report_min_max_date_and_unique_types() {
    let conn = fresh_conn();
    let xml = r#"<HealthData>
        <Record type="A" value="1" startDate="2024-03-15 10:00:00 -0400" endDate="2024-03-15 10:05:00 -0400"/>
        <Record type="B" value="2" startDate="2024-03-10 10:00:00 -0400" endDate="2024-03-10 10:05:00 -0400"/>
        <Record type="A" value="3" startDate="2024-04-01 10:00:00 -0400" endDate="2024-04-01 10:05:00 -0400"/>
        <Workout workoutActivityType="W1" duration="30" startDate="2024-03-15 07:00:00 -0400" endDate="2024-03-15 07:30:00 -0400"/>
        <Workout workoutActivityType="W2" duration="20" startDate="2024-03-16 07:00:00 -0400" endDate="2024-03-16 07:20:00 -0400"/>
    </HealthData>"#;
    let stats = ingest_xml(xml.as_bytes(), &conn, IngestMode::Fresh).unwrap();
    assert_eq!(stats.records_inserted, 3);
    assert_eq!(stats.workouts_inserted, 2);
    assert_eq!(stats.unique_record_types, 2);
    assert_eq!(stats.unique_workout_types, 2);
    assert_eq!(stats.date_range, Some(("2024-03-10".into(), "2024-04-01".into())));
}

#[test]
fn empty_xml_produces_zero_stats_and_no_date_range() {
    let conn = fresh_conn();
    let stats = ingest_xml(b"<HealthData></HealthData>".as_ref(), &conn, IngestMode::Fresh).unwrap();
    assert_eq!(stats.records_inserted, 0);
    assert_eq!(stats.workouts_inserted, 0);
    assert_eq!(stats.unique_record_types, 0);
    assert_eq!(stats.unique_workout_types, 0);
    assert_eq!(stats.date_range, None);
}

#[test]
fn sleep_record_value_persists_as_duration_hours() {
    let conn = fresh_conn();
    let xml = r#"<HealthData>
        <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAsleepCore" startDate="2024-03-15 22:30:00 -0400" endDate="2024-03-16 06:45:00 -0400" sourceName="Apple Watch"/>
    </HealthData>"#;
    ingest_xml(xml.as_bytes(), &conn, IngestMode::Fresh).unwrap();
    let (value, unit): (f64, String) = conn
        .query_row("SELECT value, unit FROM records LIMIT 1", [], |r| {
            Ok((r.get(0)?, r.get(1)?))
        })
        .unwrap();
    assert!((value - 8.25).abs() < 1e-9);
    assert_eq!(unit, "hr");
}

#[test]
fn ingest_handles_large_batch_boundary() {
    // Two full batches' worth of rows to make sure the boundary flush behaves.
    // We can't easily cross the 50k threshold in a unit test without inflating
    // the suite runtime, but we can confirm a few thousand rows behave correctly.
    let conn = fresh_conn();
    let mut xml = String::from("<HealthData>");
    for i in 0..2500 {
        xml.push_str(&format!(
            r#"<Record type="HKQuantityTypeIdentifierStepCount" value="{i}" startDate="2024-03-15 10:00:{:02} -0400" endDate="2024-03-15 10:00:{:02} -0400"/>"#,
            i % 60, i % 60
        ));
    }
    xml.push_str("</HealthData>");
    let stats = ingest_xml(xml.as_bytes(), &conn, IngestMode::Fresh).unwrap();
    assert_eq!(stats.records_inserted, 2500);
    assert_eq!(count(&conn, "records"), 2500);
}

#[test]
fn ingest_stats_struct_is_debuggable() {
    let s = IngestStats {
        records_inserted: 1,
        workouts_inserted: 2,
        unique_record_types: 3,
        unique_workout_types: 4,
        date_range: None,
    };
    assert!(format!("{s:?}").contains("records_inserted"));
}

//! Parser tests: pulling Record + Workout structs out of a stream of XML events.

use parse_health_xml::parser::{parse_stream, ParsedItem, Record, Workout};

fn parse(xml: &str) -> Vec<ParsedItem> {
    let mut out = Vec::new();
    parse_stream(xml.as_bytes(), |item| out.push(item)).unwrap();
    out
}

#[test]
fn parses_a_single_quantity_record() {
    let xml = r#"<HealthData><Record type="HKQuantityTypeIdentifierStepCount" value="42" unit="count" startDate="2024-03-15 10:00:00 -0400" endDate="2024-03-15 10:05:00 -0400" sourceName="iPhone"/></HealthData>"#;
    let items = parse(xml);
    assert_eq!(items.len(), 1);
    match &items[0] {
        ParsedItem::Record(r) => {
            assert_eq!(r.r#type, "HKQuantityTypeIdentifierStepCount");
            assert_eq!(r.value, 42.0);
            assert_eq!(r.unit, "count");
            assert_eq!(r.start_date, "2024-03-15 10:00:00 -0400");
            assert_eq!(r.end_date, "2024-03-15 10:05:00 -0400");
            assert_eq!(r.source_name, "iPhone");
        }
        other => panic!("expected Record, got {other:?}"),
    }
}

#[test]
fn parses_a_single_workout() {
    let xml = r#"<HealthData><Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="30.5" durationUnit="min" totalEnergyBurned="250" totalDistance="5.2" totalDistanceUnit="km" startDate="2024-03-15 07:00:00 -0400" endDate="2024-03-15 07:30:30 -0400" sourceName="Apple Watch"/></HealthData>"#;
    let items = parse(xml);
    assert_eq!(items.len(), 1);
    match &items[0] {
        ParsedItem::Workout(w) => {
            assert_eq!(w.activity_type, "HKWorkoutActivityTypeRunning");
            assert_eq!(w.duration, 30.5);
            assert_eq!(w.duration_unit, "min");
            assert_eq!(w.total_energy_kcal, 250.0);
            assert_eq!(w.total_distance, 5.2);
            assert_eq!(w.distance_unit, "km");
            assert_eq!(w.start_date, "2024-03-15 07:00:00 -0400");
            assert_eq!(w.end_date, "2024-03-15 07:30:30 -0400");
            assert_eq!(w.source_name, "Apple Watch");
        }
        other => panic!("expected Workout, got {other:?}"),
    }
}

#[test]
fn sleep_record_value_is_duration_in_hours() {
    let xml = r#"<HealthData><Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAsleepCore" startDate="2024-03-15 22:30:00 -0400" endDate="2024-03-16 06:45:00 -0400" sourceName="Apple Watch"/></HealthData>"#;
    let items = parse(xml);
    assert_eq!(items.len(), 1);
    match &items[0] {
        ParsedItem::Record(r) => {
            assert_eq!(r.r#type, "HKCategoryTypeIdentifierSleepAnalysis");
            assert!((r.value - 8.25).abs() < 1e-9, "value was {}", r.value);
            assert_eq!(r.unit, "hr");
        }
        other => panic!("expected Record, got {other:?}"),
    }
}

#[test]
fn skips_record_with_non_numeric_value_outside_sleep() {
    let xml = r#"<HealthData>
        <Record type="HKQuantityTypeIdentifierStepCount" value="not-a-number" startDate="2024-03-15 10:00:00 -0400" endDate="2024-03-15 10:05:00 -0400"/>
        <Record type="HKQuantityTypeIdentifierStepCount" value="100" startDate="2024-03-15 11:00:00 -0400" endDate="2024-03-15 11:05:00 -0400"/>
    </HealthData>"#;
    let items = parse(xml);
    assert_eq!(items.len(), 1);
    assert!(matches!(&items[0], ParsedItem::Record(r) if r.value == 100.0));
}

#[test]
fn skips_record_missing_type() {
    let xml = r#"<HealthData><Record value="100" startDate="2024-03-15 10:00:00 -0400"/></HealthData>"#;
    assert!(parse(xml).is_empty());
}

#[test]
fn skips_record_missing_start_date() {
    let xml = r#"<HealthData><Record type="HKQuantityTypeIdentifierStepCount" value="100"/></HealthData>"#;
    assert!(parse(xml).is_empty());
}

#[test]
fn skips_workout_missing_activity_type() {
    let xml = r#"<HealthData><Workout duration="30" startDate="2024-03-15 07:00:00 -0400"/></HealthData>"#;
    assert!(parse(xml).is_empty());
}

#[test]
fn end_date_defaults_to_start_date_when_absent() {
    let xml = r#"<HealthData><Record type="HKQuantityTypeIdentifierStepCount" value="1" startDate="2024-03-15 10:00:00 -0400"/></HealthData>"#;
    let items = parse(xml);
    match &items[0] {
        ParsedItem::Record(r) => assert_eq!(r.end_date, "2024-03-15 10:00:00 -0400"),
        other => panic!("expected Record, got {other:?}"),
    }
}

#[test]
fn workout_numeric_defaults_are_zero_when_missing() {
    let xml = r#"<HealthData><Workout workoutActivityType="HKWorkoutActivityTypeYoga" startDate="2024-03-15 07:00:00 -0400" endDate="2024-03-15 07:30:00 -0400"/></HealthData>"#;
    let items = parse(xml);
    match &items[0] {
        ParsedItem::Workout(w) => {
            assert_eq!(w.duration, 0.0);
            assert_eq!(w.duration_unit, "min"); // JS default
            assert_eq!(w.total_energy_kcal, 0.0);
            assert_eq!(w.total_distance, 0.0);
            assert_eq!(w.distance_unit, "");
            assert_eq!(w.source_name, "");
        }
        other => panic!("expected Workout, got {other:?}"),
    }
}

#[test]
fn ignores_unknown_elements() {
    let xml = r#"<HealthData>
        <ExportDate value="2024-03-15 12:00:00 -0400"/>
        <Me HKCharacteristicTypeIdentifierBiologicalSex="HKBiologicalSexMale"/>
        <Record type="HKQuantityTypeIdentifierStepCount" value="100" startDate="2024-03-15 10:00:00 -0400" endDate="2024-03-15 10:05:00 -0400"/>
        <ActivitySummary dateComponents="2024-03-15"/>
    </HealthData>"#;
    assert_eq!(parse(xml).len(), 1);
}

#[test]
fn parses_many_mixed_items_in_order() {
    let xml = r#"<HealthData>
        <Record type="A" value="1" startDate="2024-03-15 10:00:00 -0400"/>
        <Workout workoutActivityType="W" startDate="2024-03-15 10:00:00 -0400" endDate="2024-03-15 10:30:00 -0400"/>
        <Record type="B" value="2" startDate="2024-03-15 11:00:00 -0400"/>
    </HealthData>"#;
    let items = parse(xml);
    assert_eq!(items.len(), 3);
    assert!(matches!(&items[0], ParsedItem::Record(_)));
    assert!(matches!(&items[1], ParsedItem::Workout(_)));
    assert!(matches!(&items[2], ParsedItem::Record(_)));
}

#[test]
fn record_unit_defaults_to_empty_string_when_absent() {
    let xml = r#"<HealthData><Record type="HKQuantityTypeIdentifierStepCount" value="100" startDate="2024-03-15 10:00:00 -0400"/></HealthData>"#;
    let items = parse(xml);
    match &items[0] {
        ParsedItem::Record(r) => assert_eq!(r.unit, ""),
        other => panic!("expected Record, got {other:?}"),
    }
}

#[test]
fn record_struct_clones_independently() {
    let r = Record {
        r#type: "T".into(),
        value: 1.0,
        unit: "u".into(),
        start_date: "2024-01-01 00:00:00 +0000".into(),
        end_date: "2024-01-01 00:01:00 +0000".into(),
        source_name: "s".into(),
    };
    let w = Workout {
        activity_type: "A".into(),
        duration: 1.0,
        duration_unit: "min".into(),
        total_energy_kcal: 0.0,
        total_distance: 0.0,
        distance_unit: "".into(),
        start_date: "2024-01-01 00:00:00 +0000".into(),
        end_date: "2024-01-01 00:01:00 +0000".into(),
        source_name: "".into(),
    };
    let _ = r.clone();
    let _ = w.clone();
}

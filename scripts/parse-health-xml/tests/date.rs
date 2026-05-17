//! Apple Health timestamp parser.
//!
//! Format observed in `export.xml`: `2021-01-10 10:11:49 -0500`.
//! Space-separated date/time, then a space, then a signed four-digit TZ offset.

use parse_health_xml::date::{parse_apple_health_timestamp, DateParseError};

#[test]
fn parses_negative_offset() {
    let ts = parse_apple_health_timestamp("2021-01-10 10:11:49 -0500").unwrap();
    assert_eq!(ts.to_rfc3339(), "2021-01-10T10:11:49-05:00");
}

#[test]
fn parses_positive_offset() {
    let ts = parse_apple_health_timestamp("2024-06-15 23:45:00 +0530").unwrap();
    assert_eq!(ts.to_rfc3339(), "2024-06-15T23:45:00+05:30");
}

#[test]
fn parses_utc_zero_offset() {
    let ts = parse_apple_health_timestamp("2023-12-31 00:00:00 +0000").unwrap();
    assert_eq!(ts.to_rfc3339(), "2023-12-31T00:00:00+00:00");
}

#[test]
fn parses_midnight() {
    let ts = parse_apple_health_timestamp("2025-01-01 00:00:00 -0800").unwrap();
    assert_eq!(ts.to_rfc3339(), "2025-01-01T00:00:00-08:00");
}

#[test]
fn rejects_missing_timezone() {
    let err = parse_apple_health_timestamp("2021-01-10 10:11:49").unwrap_err();
    assert!(matches!(err, DateParseError::InvalidFormat(_)));
}

#[test]
fn rejects_empty_string() {
    let err = parse_apple_health_timestamp("").unwrap_err();
    assert!(matches!(err, DateParseError::InvalidFormat(_)));
}

#[test]
fn rejects_garbage() {
    assert!(parse_apple_health_timestamp("not-a-date").is_err());
}

#[test]
fn duration_hours_between_two_timestamps_matches_js_sleep_calc() {
    // The JS parser does (end - start) / (1000 * 60 * 60) to compute sleep hours.
    let start = parse_apple_health_timestamp("2021-01-10 22:30:00 -0500").unwrap();
    let end = parse_apple_health_timestamp("2021-01-11 06:45:00 -0500").unwrap();
    let hours = (end - start).num_seconds() as f64 / 3600.0;
    assert!((hours - 8.25).abs() < 1e-9);
}

#[test]
fn duration_handles_dst_style_offset_crossover() {
    // Both sides in different offsets; difference is computed in absolute UTC instants.
    let start = parse_apple_health_timestamp("2021-03-13 22:00:00 -0500").unwrap();
    let end = parse_apple_health_timestamp("2021-03-14 07:00:00 -0400").unwrap();
    let hours = (end - start).num_seconds() as f64 / 3600.0;
    assert!((hours - 8.0).abs() < 1e-9);
}

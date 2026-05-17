//! Stream `<Record>` and `<Workout>` elements out of Apple Health `export.xml`.
//!
//! The parser mirrors `scripts/parse-health-xml.js`:
//! - records with non-numeric `value` are skipped, EXCEPT
//!   `HKCategoryTypeIdentifierSleepAnalysis` whose value field is a category
//!   enum string and gets replaced with `(end - start)` in hours, unit `"hr"`
//! - records with missing `type` or `startDate` are skipped
//! - workouts with missing `workoutActivityType` are skipped
//! - missing `endDate` defaults to `startDate`
//! - missing numeric workout fields default to `0`; missing units default to
//!   `"min"` (duration) or `""` (distance); missing `sourceName` defaults to `""`

use std::io::BufRead;

use quick_xml::events::{BytesStart, Event};
use quick_xml::Reader;
use thiserror::Error;

use crate::date::parse_apple_health_timestamp;

const SLEEP_TYPE: &str = "HKCategoryTypeIdentifierSleepAnalysis";

#[derive(Debug, Clone, PartialEq)]
pub struct Record {
    pub r#type: String,
    pub value: f64,
    pub unit: String,
    pub start_date: String,
    pub end_date: String,
    pub source_name: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Workout {
    pub activity_type: String,
    pub duration: f64,
    pub duration_unit: String,
    pub total_energy_kcal: f64,
    pub total_distance: f64,
    pub distance_unit: String,
    pub start_date: String,
    pub end_date: String,
    pub source_name: String,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ParsedItem {
    Record(Record),
    Workout(Workout),
}

#[derive(Debug, Error)]
pub enum ParseError {
    #[error("xml error: {0}")]
    Xml(#[from] quick_xml::Error),
    #[error("xml attr error: {0}")]
    Attr(#[from] quick_xml::events::attributes::AttrError),
}

pub fn parse_stream<R, F>(reader: R, mut sink: F) -> Result<(), ParseError>
where
    R: BufRead,
    F: FnMut(ParsedItem),
{
    let mut xml = Reader::from_reader(reader);
    xml.config_mut().trim_text(false);
    let mut buf = Vec::with_capacity(4096);

    loop {
        match xml.read_event_into(&mut buf)? {
            Event::Empty(e) | Event::Start(e) => {
                if let Some(item) = element_to_item(&e)? {
                    sink(item);
                }
            }
            Event::Eof => break,
            _ => {}
        }
        buf.clear();
    }
    Ok(())
}

fn element_to_item(e: &BytesStart<'_>) -> Result<Option<ParsedItem>, ParseError> {
    match e.name().as_ref() {
        b"Record" => Ok(record_from_attrs(e)?.map(ParsedItem::Record)),
        b"Workout" => Ok(workout_from_attrs(e)?.map(ParsedItem::Workout)),
        _ => Ok(None),
    }
}

fn record_from_attrs(e: &BytesStart<'_>) -> Result<Option<Record>, ParseError> {
    let attrs = collect_attrs(e)?;

    let r#type = match attrs.get("type") {
        Some(v) => v.clone(),
        None => return Ok(None),
    };
    let start_date = match attrs.get("startDate") {
        Some(v) => v.clone(),
        None => return Ok(None),
    };
    let end_date = attrs.get("endDate").cloned().unwrap_or_else(|| start_date.clone());
    let unit_attr = attrs.get("unit").cloned().unwrap_or_default();
    let source_name = attrs.get("sourceName").cloned().unwrap_or_default();
    let value_attr = attrs.get("value").map(String::as_str).unwrap_or("");

    let (value, unit) = if r#type == SLEEP_TYPE {
        // Sleep records carry a category enum as `value`; the JS parser replaces
        // it with the duration in hours and forces unit="hr".
        let start = parse_apple_health_timestamp(&start_date).ok();
        let end = parse_apple_health_timestamp(&end_date).ok();
        match (start, end) {
            (Some(s), Some(e)) => {
                let hours = (e - s).num_seconds() as f64 / 3600.0;
                (hours, "hr".to_string())
            }
            _ => return Ok(None),
        }
    } else {
        match value_attr.parse::<f64>() {
            Ok(v) if !v.is_nan() => (v, unit_attr),
            _ => return Ok(None),
        }
    };

    Ok(Some(Record {
        r#type,
        value,
        unit,
        start_date,
        end_date,
        source_name,
    }))
}

fn workout_from_attrs(e: &BytesStart<'_>) -> Result<Option<Workout>, ParseError> {
    let attrs = collect_attrs(e)?;

    let activity_type = match attrs.get("workoutActivityType") {
        Some(v) => v.clone(),
        None => return Ok(None),
    };
    let start_date = match attrs.get("startDate") {
        Some(v) => v.clone(),
        None => return Ok(None),
    };
    let end_date = attrs.get("endDate").cloned().unwrap_or_else(|| start_date.clone());

    Ok(Some(Workout {
        activity_type,
        duration: parse_f64_default(attrs.get("duration").map(String::as_str), 0.0),
        duration_unit: attrs.get("durationUnit").cloned().unwrap_or_else(|| "min".to_string()),
        total_energy_kcal: parse_f64_default(attrs.get("totalEnergyBurned").map(String::as_str), 0.0),
        total_distance: parse_f64_default(attrs.get("totalDistance").map(String::as_str), 0.0),
        distance_unit: attrs.get("totalDistanceUnit").cloned().unwrap_or_default(),
        start_date,
        end_date,
        source_name: attrs.get("sourceName").cloned().unwrap_or_default(),
    }))
}

fn collect_attrs(e: &BytesStart<'_>) -> Result<std::collections::HashMap<String, String>, ParseError> {
    let mut map = std::collections::HashMap::with_capacity(8);
    for attr in e.attributes() {
        let a = attr?;
        let key = std::str::from_utf8(a.key.as_ref())
            .map(str::to_string)
            .unwrap_or_default();
        let value = a
            .unescape_value()
            .map(|c| c.into_owned())
            .unwrap_or_default();
        map.insert(key, value);
    }
    Ok(map)
}

fn parse_f64_default(s: Option<&str>, default: f64) -> f64 {
    s.and_then(|v| v.parse::<f64>().ok()).unwrap_or(default)
}

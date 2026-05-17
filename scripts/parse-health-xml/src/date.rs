//! Apple Health timestamp parsing.
//!
//! `export.xml` uses the format `YYYY-MM-DD HH:MM:SS ±ZZZZ`, e.g.
//! `2021-01-10 10:11:49 -0500`. Chrono can parse this with format string
//! `"%Y-%m-%d %H:%M:%S %z"`, returning a `DateTime<FixedOffset>` that
//! preserves the original wall clock + offset.

use chrono::{DateTime, FixedOffset};
use thiserror::Error;

const FORMAT: &str = "%Y-%m-%d %H:%M:%S %z";

#[derive(Debug, Error)]
pub enum DateParseError {
    #[error("invalid Apple Health timestamp: {0:?}")]
    InvalidFormat(String),
}

pub fn parse_apple_health_timestamp(input: &str) -> Result<DateTime<FixedOffset>, DateParseError> {
    DateTime::parse_from_str(input, FORMAT)
        .map_err(|_| DateParseError::InvalidFormat(input.to_string()))
}

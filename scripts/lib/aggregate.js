// Aggregation helpers shared between the generator and tests.

export const SUM_TYPES = new Set([
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierBasalEnergyBurned',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'HKQuantityTypeIdentifierDistanceCycling',
  'HKQuantityTypeIdentifierDistanceDownhillSnowSports',
  'HKQuantityTypeIdentifierFlightsClimbed',
  'HKQuantityTypeIdentifierAppleExerciseTime',
  'HKQuantityTypeIdentifierAppleStandTime',
  'HKQuantityTypeIdentifierTimeInDaylight',
  'HKQuantityTypeIdentifierSwimmingStrokeCount',
  'HKCategoryTypeIdentifierSleepAnalysis',
]);

export const DEFAULT_METRICS = [
  // Activity
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'HKQuantityTypeIdentifierDistanceCycling',
  'HKQuantityTypeIdentifierDistanceDownhillSnowSports',
  'HKQuantityTypeIdentifierSwimmingStrokeCount',
  'HKQuantityTypeIdentifierFlightsClimbed',
  'HKQuantityTypeIdentifierAppleExerciseTime',
  'HKQuantityTypeIdentifierAppleStandTime',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierBasalEnergyBurned',
  'HKQuantityTypeIdentifierPhysicalEffort',

  // Heart
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierWalkingHeartRateAverage',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierHeartRateRecoveryOneMinute',
  'HKQuantityTypeIdentifierVO2Max',
  'HKQuantityTypeIdentifierAtrialFibrillationBurden',

  // Respiratory
  'HKQuantityTypeIdentifierRespiratoryRate',
  'HKQuantityTypeIdentifierOxygenSaturation',

  // Body
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierBodyMassIndex',
  'HKQuantityTypeIdentifierBodyFatPercentage',
  'HKQuantityTypeIdentifierLeanBodyMass',
  'HKQuantityTypeIdentifierHeight',
  'HKQuantityTypeIdentifierBloodGlucose',

  // Sleep
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKQuantityTypeIdentifierAppleSleepingWristTemperature',
  'HKQuantityTypeIdentifierAppleSleepingBreathingDisturbances',

  // Walking + running form
  'HKQuantityTypeIdentifierWalkingSpeed',
  'HKQuantityTypeIdentifierWalkingStepLength',
  'HKQuantityTypeIdentifierRunningSpeed',
  'HKQuantityTypeIdentifierRunningPower',
  'HKQuantityTypeIdentifierRunningStrideLength',
  'HKQuantityTypeIdentifierRunningGroundContactTime',
  'HKQuantityTypeIdentifierRunningVerticalOscillation',

  // Environment
  'HKQuantityTypeIdentifierTimeInDaylight',
  'HKQuantityTypeIdentifierEnvironmentalAudioExposure',
  'HKQuantityTypeIdentifierHeadphoneAudioExposure',
  'HKQuantityTypeIdentifierEnvironmentalSoundReduction',
];

export function metricFilename(type) {
  return type
    .replace('HKQuantityTypeIdentifier', '')
    .replace('HKCategoryTypeIdentifier', '')
    .toLowerCase();
}

export function metricUnit(db, type) {
  const row = db.prepare(`
    SELECT unit, COUNT(*) AS c FROM records
    WHERE type = ? AND unit IS NOT NULL AND unit != ''
    GROUP BY unit ORDER BY c DESC LIMIT 1
  `).get(type);
  return row?.unit ?? '';
}

export function buildDailySeries(db, type) {
  const isSum = SUM_TYPES.has(type);
  const sql = isSum
    ? `SELECT date, SUM(value) AS value, COUNT(*) AS count
       FROM records WHERE type = ? GROUP BY date ORDER BY date`
    : `SELECT date, AVG(value) AS value, MIN(value) AS min, MAX(value) AS max, COUNT(*) AS count
       FROM records WHERE type = ? GROUP BY date ORDER BY date`;

  return db.prepare(sql).all(type).map((r) => {
    const point = {
      date: r.date,
      value: parseFloat((r.value ?? 0).toFixed(4)),
      count: r.count,
    };
    if (!isSum) {
      point.min = parseFloat((r.min ?? 0).toFixed(4));
      point.max = parseFloat((r.max ?? 0).toFixed(4));
    }
    return point;
  });
}

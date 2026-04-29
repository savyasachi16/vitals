export interface HealthRecord {
  type: string;
  value: number;
  unit: string;
  startDate: string;
  endDate: string;
  source: string;
}

export interface HealthData {
  records: HealthRecord[];
  lastUpdated: string;
}

export type MetricType =
  | 'HKQuantityTypeIdentifierStepCount'
  | 'HKQuantityTypeIdentifierHeartRate'
  | 'HKQuantityTypeIdentifierActiveEnergyBurned'
  | 'HKQuantityTypeIdentifierBasalEnergyBurned'
  | 'HKQuantityTypeIdentifierBodyMass'
  | 'HKQuantityTypeIdentifierSleepAnalysis'
  | 'HKQuantityTypeIdentifierVO2Max'
  | 'HKQuantityTypeIdentifierRestingHeartRate'
  | 'HKQuantityTypeIdentifierWalkingHeartRateAverage'
  | 'HKQuantityTypeIdentifierBodyFatPercentage'
  | 'HKQuantityTypeIdentifierLeanBodyMass'
  | string;

export type TimeRange = 'day' | 'week' | 'month' | 'year' | 'all';

export interface MetricConfig {
  type: MetricType;
  label: string;
  unit: string;
  color: string;
  icon: string;
}

export const METRICS: MetricConfig[] = [
  { type: 'HKQuantityTypeIdentifierStepCount', label: 'Steps', unit: 'count', color: '#30D158', icon: '👟' },
  { type: 'HKQuantityTypeIdentifierHeartRate', label: 'Heart Rate', unit: 'count/min', color: '#FF375F', icon: '❤️' },
  { type: 'HKQuantityTypeIdentifierActiveEnergyBurned', label: 'Active Calories', unit: 'kcal', color: '#FF9F0A', icon: '🔥' },
  { type: 'HKQuantityTypeIdentifierBasalEnergyBurned', label: 'Basal Calories', unit: 'kcal', color: '#FF9F0A', icon: '🔥' },
  { type: 'HKQuantityTypeIdentifierBodyMass', label: 'Weight', unit: 'kg', color: '#0A84FF', icon: '⚖️' },
  { type: 'HKCategoryTypeIdentifierSleepAnalysis', label: 'Sleep', unit: 'hr', color: '#BF5AF2', icon: '😴' },
  { type: 'HKQuantityTypeIdentifierVO2Max', label: 'VO2 Max', unit: 'mL/kg·min', color: '#0A84FF', icon: '💨' },
  { type: 'HKQuantityTypeIdentifierRestingHeartRate', label: 'Resting HR', unit: 'count/min', color: '#FF375F', icon: '❤️' },
  { type: 'HKQuantityTypeIdentifierBodyFatPercentage', label: 'Body Fat', unit: '%', color: '#FF375F', icon: '📊' },
  { type: 'HKQuantityTypeIdentifierLeanBodyMass', label: 'Lean Mass', unit: 'kg', color: '#30D158', icon: '💪' },
];

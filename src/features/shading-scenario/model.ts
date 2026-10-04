import { heatStep } from '../thermal-scenario/model.ts';

export const METHOD_VERSION = 'external-window-shading-scenario-v1';
export const shadingScenarioFields = {
  windowAreaM2: ['Window area (m²)', 0.1, 40],
  glazingShgc: ['Window solar heat gain coefficient', 0, 1],
  existingShadePercent: ['Sun blocked before (%)', 0, 100],
  proposedShadePercent: ['Sun blocked after (%)', 0, 100],
  roomVolumeM3: ['Room volume (m³)', 10, 500],
  fabricWPerK: ['Room fabric heat transfer (W/K)', 1, 1000],
  thermalMassMjPerK: ['Effective thermal capacity (MJ/K)', 0.1, 100],
  backgroundAch: ['Background air changes per hour', 0, 20],
  internalGainsW: ['Internal heat gains (W)', 0, 3000],
  initialTempC: ['Starting room temperature (°C)', 10, 45],
  setpointC: ['Cooling temperature setting (°C)', 16, 32],
  coolingCapacityKw: ['Thermal cooling capacity (kW output)', 0, 20],
  cop: ['Cooling efficiency (COP)', 1, 8],
  tariffAudPerKwh: ['Electricity usage rate (AUD/kWh)', 0, 3],
  coolingStartHour: ['Cooling starts (hour, 0–23)', 0, 23],
  coolingEndHour: ['Cooling ends (hour, 0–23)', 0, 23],
  coolingDays: ['Cooling days in your comparison', 1, 366],
} as const;
export type ShadingScenarioField = keyof typeof shadingScenarioFields;
export type ShadingScenarioParameters = Record<ShadingScenarioField, number>;
export const directions = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'] as const;
export type ShadingDirection = typeof directions[number];

export type ShadingScenarioDraft = Record<ShadingScenarioField, string> & {
  version: 1;
  direction: ShadingDirection | 'unknown';
  weatherMode: '' | 'synthetic-hot-day';
  assumptionsAccepted: boolean;
  periodLabel: string;
  installedCostAud: string;
  installedCostScope: string;
  updatedAt: string;
};

const fieldKeys = Object.keys(shadingScenarioFields) as ShadingScenarioField[];
const draftKeys: ReadonlySet<string> = new Set([...fieldKeys, 'version', 'direction', 'weatherMode', 'assumptionsAccepted', 'periodLabel', 'installedCostAud', 'installedCostScope', 'updatedAt']);
const integerFields: ShadingScenarioField[] = ['coolingStartHour', 'coolingEndHour', 'coolingDays'];
const numericText = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const WARMUP_DAYS = 7;
const SECONDS = 300;

export function blankShadingScenario(now = new Date().toISOString()): ShadingScenarioDraft {
  return {
    ...Object.fromEntries(fieldKeys.map((key) => [key, ''])) as Record<ShadingScenarioField, string>,
    version: 1,
    direction: 'unknown',
    weatherMode: '',
    assumptionsAccepted: false,
    periodLabel: '',
    installedCostAud: '',
    installedCostScope: '',
    updatedAt: now,
  };
}

// Only call in response to a deliberate example/assumptions action. These are
// demonstration inputs, not inferred building properties or weather evidence.
export function createReferenceShadingScenario(overrides: Partial<ShadingScenarioDraft> = {}): ShadingScenarioDraft {
  return {
    ...blankShadingScenario(),
    windowAreaM2: '3', glazingShgc: '0.7', existingShadePercent: '0', proposedShadePercent: '75',
    roomVolumeM3: '40', fabricWPerK: '65', thermalMassMjPerK: '3', backgroundAch: '0.5',
    internalGainsW: '100', initialTempC: '26', setpointC: '25', coolingCapacityKw: '2.5',
    cop: '3.5', tariffAudPerKwh: '0.35', coolingStartHour: '14', coolingEndHour: '23',
    coolingDays: '30', direction: 'west', weatherMode: 'synthetic-hot-day',
    periodLabel: '30 assumed hot days', ...overrides,
  };
}

/** Shape validation retains incomplete inputs without treating them as numbers. */
export function isShadingScenarioDraft(value: unknown): value is ShadingScenarioDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const boundedText = (key: string, max: number) => typeof v[key] === 'string' && (v[key] as string).length <= max;
  return Object.keys(v).every((key) => draftKeys.has(key))
    && v.version === 1 && (v.direction === 'unknown' || directions.some((d) => d === v.direction))
    && (v.weatherMode === '' || v.weatherMode === 'synthetic-hot-day')
    && typeof v.assumptionsAccepted === 'boolean'
    && fieldKeys.every((key) => boundedText(key, 32))
    && boundedText('periodLabel', 200) && boundedText('installedCostAud', 32) && boundedText('installedCostScope', 240)
    && boundedText('updatedAt', 32) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v.updatedAt as string)
    && Number.isFinite(Date.parse(v.updatedAt as string));
}

export type ShadingWeatherHour = { outdoorC: number; incidentWPerM2: number };

/** A synthetic solar day at 33.86°S, not retrieved or measured Sydney weather. */
export function buildSyntheticShadingDay(direction: ShadingDirection): ShadingWeatherHour[] {
  const radians = Math.PI / 180;
  const latitude = -33.86 * radians;
  const declination = -21.3 * radians;
  const azimuth = directions.indexOf(direction) * Math.PI / 4;
  return Array.from({ length: 24 }, (_, hour) => {
    const midHour = hour + 0.5;
    const hourAngle = (midHour - 12) * Math.PI / 12;
    const east = -Math.cos(declination) * Math.sin(hourAngle);
    const north = Math.cos(latitude) * Math.sin(declination) - Math.sin(latitude) * Math.cos(declination) * Math.cos(hourAngle);
    const up = Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
    const projectedDirect = Math.max(0, east * Math.sin(azimuth) + north * Math.cos(azimuth));
    return {
      outdoorC: 28 + 7 * Math.sin((midHour - 9) * Math.PI / 12),
      incidentWPerM2: up > 0 ? 650 * projectedDirect + 120 / 2 + 20 : 0,
    };
  });
}

/** Hour boundaries are exclusive at the end; matching hours explicitly mean all day. */
export function isCoolingScheduled(hour: number, start: number, end: number): boolean {
  if (start === end) return true;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

export type ShadingCase = {
  dailyKwh: number;
  dailyCostAud: number;
  periodKwh: number;
  periodCostAud: number;
  /** Hours above setpoint + 0.1°C during the daily cooling schedule only. */
  unmetComfortHours: number;
  peakIndoorC: number;
};

/** Internal calculation entry point also used by analytical reference tests. */
export function simulateShadingCase(p: ShadingScenarioParameters, weather: readonly ShadingWeatherHour[], shadePercent: number): ShadingCase {
  if (weather.length !== 24 || weather.some((w) => !Number.isFinite(w.outdoorC) || !Number.isFinite(w.incidentWPerM2) || w.incidentWPerM2 < 0)) {
    throw new Error('Supply 24 finite hourly outdoor temperatures and nonnegative incident solar values.');
  }
  const conductance = p.fabricWPerK + 1.2 * 1006 * p.roomVolumeM3 * p.backgroundAch / 3600;
  const capacityJ = p.thermalMassMjPerK * 1e6;
  const response = -Math.expm1(-conductance * SECONDS / capacityJ) / conductance;
  let temperature = p.initialTempC;
  let dailyKwh = 0;
  let unmetComfortHours = 0;
  let peakIndoorC = -Infinity;
  // Warm-up is run independently in both cases. Only day eight is counted.
  for (let day = 0; day <= WARMUP_DAYS; day++) {
    if (day === WARMUP_DAYS) peakIndoorC = temperature;
    for (const [hour, w] of weather.entries()) {
      const scheduled = isCoolingScheduled(hour, p.coolingStartHour, p.coolingEndHour);
      const solarGainW = p.windowAreaM2 * p.glazingShgc * w.incidentWPerM2 * (1 - shadePercent / 100);
      for (let step = 0; step < 12; step++) {
        const free = heatStep(temperature, w.outdoorC, p.internalGainsW + solarGainW, conductance, capacityJ, 0, SECONDS);
        const coolingW = scheduled ? Math.min(p.coolingCapacityKw * 1000, Math.max(0, (free - p.setpointC) / response)) : 0;
        temperature = free - coolingW * response;
        if (day === WARMUP_DAYS) {
          dailyKwh += coolingW * SECONDS / 3.6e6 / p.cop;
          if (scheduled && temperature > p.setpointC + 0.1) unmetComfortHours += SECONDS / 3600;
          peakIndoorC = Math.max(peakIndoorC, temperature);
        }
      }
    }
  }
  return {
    dailyKwh, dailyCostAud: dailyKwh * p.tariffAudPerKwh,
    periodKwh: dailyKwh * p.coolingDays, periodCostAud: dailyKwh * p.coolingDays * p.tariffAudPerKwh,
    unmetComfortHours, peakIndoorC,
  };
}

type IncompleteScenario = { status: 'incomplete'; missing: string[]; errors: string[] };
type ReadyScenario = {
  status: 'ready'; methodVersion: string; periodLabel: string; coolingDays: number;
  baseline: ShadingCase; improved: ShadingCase;
  savingsKwh: number; savingsAud: number; dailySavingsKwh: number; dailySavingsAud: number;
  installedCostAud: number | null; assumptions: string[]; limitations: string[];
};

export function evaluateShadingScenario(draft: ShadingScenarioDraft): IncompleteScenario | ReadyScenario {
  if (!isShadingScenarioDraft(draft)) return { status: 'incomplete', missing: [], errors: ['The saved scenario format is not supported. Start a new comparison.'] };
  const p = {} as ShadingScenarioParameters;
  const missing: string[] = [];
  const errors: string[] = [];
  for (const key of fieldKeys) {
    const [label, min, max] = shadingScenarioFields[key];
    const raw = draft[key].trim();
    const value = Number(raw);
    if (!raw) missing.push(label);
    else if (!numericText.test(raw) || !Number.isFinite(value) || value < min || value > max || (integerFields.includes(key) && !Number.isInteger(value))) {
      errors.push(`${label}: enter ${integerFields.includes(key) ? 'a whole number' : 'a number'} from ${min} to ${max}.`);
    } else p[key] = value;
  }
  if (draft.direction === 'unknown') missing.push('Window direction');
  if (!draft.weatherMode) missing.push('Choose the illustrative hot-day scenario');
  if (!draft.assumptionsAccepted) missing.push('Confirm the scenario assumptions');
  if (!draft.periodLabel.trim()) missing.push('Name the comparison period');
  let installedCostAud: number | null = null;
  const cost = draft.installedCostAud.trim();
  if (cost) {
    const value = Number(cost);
    if (!numericText.test(cost) || !Number.isFinite(value) || value < 0 || value > 1e6) errors.push('Installed cost: enter a number from 0 to 1000000 AUD, or leave blank.');
    else if (draft.installedCostScope.trim()) installedCostAud = value;
  }
  if (missing.length || errors.length || draft.direction === 'unknown') return { status: 'incomplete', missing, errors };
  const weather = buildSyntheticShadingDay(draft.direction);
  const baseline = simulateShadingCase(p, weather, p.existingShadePercent);
  const improved = simulateShadingCase(p, weather, p.proposedShadePercent);
  const dailySavingsKwh = baseline.dailyKwh - improved.dailyKwh;
  return {
    status: 'ready', methodVersion: METHOD_VERSION, periodLabel: draft.periodLabel.trim(), coolingDays: p.coolingDays,
    baseline, improved, dailySavingsKwh, dailySavingsAud: dailySavingsKwh * p.tariffAudPerKwh,
    savingsKwh: baseline.periodKwh - improved.periodKwh, savingsAud: baseline.periodCostAud - improved.periodCostAud,
    installedCostAud,
    assumptions: [
      `Window direction: ${draft.direction}; one vertical window or group of identical windows facing this direction. Other window solar gains are omitted.`,
      ...fieldKeys.map((key) => `${shadingScenarioFields[key][0]}: ${p[key]}.`),
      'Both shade percentages are assumed effective reductions in incident solar energy at the window, not product ratings, window area coverage, or a percentage reduction in your bill.',
      'Illustrative weather: a repeated synthetic day varying from 21 to 35°C; no current, forecast or historic weather was retrieved.',
      'Synthetic sun: latitude 33.86°S, declination −21.3°, noon at 12:00 without daylight-saving correction. Assumed direct normal irradiance 650 W/m², diffuse horizontal irradiance 120 W/m² (half on the vertical window) and reflected irradiance 20 W/m² while the sun is above the horizon.',
      'Window SHGC is constant at every solar angle; effective external shading is applied to all solar components at every daylight hour.',
      `The same room, temperature target, cooling schedule and efficiency are used in both cases. Matching start and end hours mean all-day cooling. Seven repeated warm-up days precede the measured model day; its cost is multiplied by ${p.coolingDays} assumed identical cooling days.`,
      `Comparison period: ${draft.periodLabel.trim()}. Method: ${METHOD_VERSION}.`,
      installedCostAud === null ? 'Installed cost remains unknown; no scoped cost was supplied.' : `User-supplied installed cost: AUD ${installedCostAud}; scope/source: ${draft.installedCostScope.trim()}.`,
    ],
    limitations: [
      'An uncalibrated, assumed scenario, not a validated prediction of your home, measured bedroom spending or guaranteed savings.',
      'A single effective room temperature represents walls, contents and air. Humidity, radiant comfort, adjacent rooms, solar heating of the roof/walls, other windows, detailed shading geometry and winter effects are omitted.',
      'The ideal cooling system modulates perfectly at a constant COP; cycling, standby, fan and dehumidification electricity are omitted. Cooling capacity is thermal output, not electrical input.',
      'Unmet comfort hours count scheduled five-minute endpoints more than 0.1°C above the temperature setting. A capacity-limited system may use less electricity without reaching the target; compare unmet hours in both cases.',
      'Flat electricity usage charges only. No supply charges, time-of-use rates, solar opportunity costs, maintenance, annualisation, payback or emissions estimate. Do not add this result to other improvement savings.',
    ],
  };
}

export type ShadingScenarioResult = Extract<ReturnType<typeof evaluateShadingScenario>, { status: 'ready' }>;

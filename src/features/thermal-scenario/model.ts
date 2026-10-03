export const fields = {
  volume: ['Room volume (m³)', 10, 1000],
  capacity: ['Effective thermal capacity (MJ/K)', 0.1, 100],
  conductance: ['Envelope heat transfer (W/K)', 1, 2000],
  ach: ['Background air changes per hour', 0, 20],
  internal: ['Internal heat gains (W)', 0, 3000],
  initial: ['Starting indoor temperature (°C)', 10, 45],
  setpoint: ['AC temperature setting (°C)', 16, 32],
  cooling: ['AC thermal cooling capacity (W)', 0, 20000],
  cop: ['AC efficiency / COP', 1, 8],
  tariff: ['Electricity rate (AUD/kWh)', 0, 3],
  shade: ['Reduction in solar gains (%)', 0, 100],
  insulation: ['Reduction in envelope heat transfer (%)', 0, 95],
  nightAch: ['Improved night air changes per hour', 0, 20],
} as const;
export type Field = keyof typeof fields;
export type Parameters = Record<Field, number>;
export type Draft = Record<Field, string> & { weather: string };
export type Weather = { outdoor: number; solar: number };
export function parse(draft: Draft): { parameters: Parameters; weather: Weather[] } {
  const parameters = {} as Parameters;
  for (const key of Object.keys(fields) as Field[]) {
    const [label, min, max] = fields[key];
    const value = Number(draft[key]);
    if (!draft[key].trim() || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label}: enter a value from ${min} to ${max}.`);
    parameters[key] = value;
  }
  const rows = draft.weather.trim().split(/\r?\n/);
  if (rows.length !== 24) throw new Error('Supply 24 rows, one per hour from midnight: outdoor °C, solar heat entering the room in W.');
  const weather = rows.map((row, i) => {
    const cells = row.split(',');
    const outdoor = Number(cells[0]); const solar = Number(cells[1]);
    if (cells.length !== 2 || cells.some(cell => !cell.trim()) || !Number.isFinite(outdoor) || !Number.isFinite(solar) || outdoor < -30 || outdoor > 60 || solar < 0 || solar > 10000) throw new Error(`Weather row ${i + 1}: outdoor must be −30 to 60°C and solar gain 0 to 10000 W.`);
    return { outdoor, solar };
  });
  return { parameters, weather };
}
export function blankDraft(): Draft {
  return { ...Object.fromEntries(Object.keys(fields).map(key => [key, ''])), weather: '' } as Draft;
}
export function exampleDraft(): Draft {
  return { volume: '40', capacity: '3', conductance: '65', ach: '0.5', internal: '100', initial: '26', setpoint: '25', cooling: '2500', cop: '3.5', tariff: '0.35', shade: '60', insulation: '30', nightAch: '4',
    weather: Array.from({ length: 24 }, (_, h) => `${(29 + 7 * Math.sin((h - 9) * Math.PI / 12)).toFixed(1)},${Math.round(800 * Math.max(0, Math.sin((h - 6) * Math.PI / 12)))}`).join('\n') };
}
// Exact solution for constant forcing over each five-minute interval.
export function heatStep(temperature: number, outdoor: number, gain: number, conductance: number, capacityJ: number, coolingW: number, seconds = 300) {
  const decay = Math.exp(-conductance * seconds / capacityJ);
  return outdoor + (temperature - outdoor) * decay + (gain - coolingW) * (1 - decay) / conductance;
}
export function simulate(draft: Draft) {
  const { parameters: p, weather } = parse(draft);
  function run(improved: boolean, withAc: boolean) {
    let temperature = p.initial; let electricity = 0; let aboveSetpointHours = 0; let peak = temperature;
    const temperatures = [temperature];
    for (const [hour, w] of weather.entries()) {
      for (let step = 0; step < 12; step++) {
        const nightVent = improved && (hour >= 20 || hour < 7) && w.outdoor < temperature;
        const ach = nightVent ? Math.max(p.ach, p.nightAch) : p.ach;
        const h = p.conductance * (improved ? 1 - p.insulation / 100 : 1) + 1.2 * 1006 * p.volume * ach / 3600;
        const gain = p.internal + w.solar * (improved ? 1 - p.shade / 100 : 1);
        const free = heatStep(temperature, w.outdoor, gain, h, p.capacity * 1e6, 0);
        const response = -Math.expm1(-h * 300 / (p.capacity * 1e6)) / h;
        const cooling = withAc ? Math.min(p.cooling, Math.max(0, (free - p.setpoint) / response)) : 0;
        temperature = free - cooling * response;
        electricity += cooling * 300 / 3.6e6 / p.cop;
        if (temperature > p.setpoint + 0.1) aboveSetpointHours += 1 / 12;
        peak = Math.max(peak, temperature);
      }
      temperatures.push(temperature);
    }
    return { temperatures, electricity, cost: electricity * p.tariff, aboveSetpointHours, peak };
  }
  return { baseline: run(false, false), improved: run(true, false), baselineAc: run(false, true), improvedAc: run(true, true), weather, parameters: p };
}

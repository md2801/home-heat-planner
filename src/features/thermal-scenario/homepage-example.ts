import { exampleDraft, simulate } from './model.ts';

/** Synthetic hot day, not weather or a prediction for the visitor's room. */
export const homepageAssumptions = {
  ...exampleDraft(), initial: '25', insulation: '0', nightAch: '0.5',
  weather: Array.from({ length: 24 }, (_, hour) =>
    `32,${Math.round(800 * Math.max(0, Math.sin((hour - 6) * Math.PI / 12)))}`).join('\n'),
};
const result = simulate(homepageAssumptions);
export const homepageComparison = {
  before: result.baselineAc,
  after: result.improvedAc,
  target: result.parameters.setpoint,
  comparable: result.baselineAc.aboveSetpointHours === 0 && result.improvedAc.aboveSetpointHours === 0,
};

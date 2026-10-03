import { homepageComparison as comparison } from '../thermal-scenario/homepage-example';
import styles from './dynamic-room.module.css';

const money = (n: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);
export function CoolingStory({ stage }: { stage: number }) {
  const shaded = stage > 0;
  const current = shaded ? comparison.after : comparison.before;
  const reduction = comparison.before.cost - comparison.after.cost;
  return <div className={styles.story}>
    <span>{['01 · HEAT ENTERING THE ROOM', '02 · KEEP HEAT OUT, REDUCE DEMAND', '03 · RELEASE HEAT WHEN CONDITIONS ALLOW'][stage]}</span>
    <strong>{['Start with the heat entering your room.', 'Keep heat out. Reduce cooling demand.', 'Let cooler outdoor air do some of the work.'][stage]}</strong>
    {stage === 2 ? <div className={styles.evening}><p>Open windows when outside air is cooler and safe. AC is off in this illustration; the fan keeps air moving.</p><small>This evening scene has no cost or comfort prediction. Close windows when running AC.</small></div> : <>
      <div className={styles.comfort}><span aria-hidden="true">●</span> {comparison.target}°C cooling target <b>{comparison.comparable ? 'Maintained in both cases' : 'Target not maintained — comparison limited'}</b></div>
      <div className={styles.energyHeader}><span>AC electricity · example day</span><strong>{current.electricity.toFixed(2)} <small>kWh</small></strong></div>
      <div className={styles.energyTrack} role="img" aria-label={`AC electricity ${current.electricity.toFixed(2)} kilowatt-hours; baseline ${comparison.before.electricity.toFixed(2)}`}><div style={{ width: `${current.electricity / comparison.before.electricity * 100}%` }} /></div>
      <div className={styles.costRow}><div><small>24-hour AC cost</small><strong>{money(current.cost)}</strong></div><div><small>{shaded ? 'Compared with unshaded' : 'After adding shade'}</small><b>{comparison.comparable && reduction > 0 ? `${money(reduction)} ${shaded ? 'less for this day' : 'potentially less'}` : 'Comparable saving not established'}</b></div></div>
      <p>{shaded ? 'External shade reduces incoming solar heat. The AC stays available, with less cooling energy needed in this example.' : 'The same room and AC, before external shading. Watch the electricity bar fall when shade appears.'}</p>
      <small>Less electricity can mean lower electricity emissions; the effect depends on the power supply. Orange rays illustrate sunlight; blue streams illustrate airflow. Neither is measured.</small>
      <details className={styles.storyAssumptions}><summary>Illustrative scenario · see assumptions</summary><p>Synthetic 24-hour day: constant 32°C outdoors, solar gain 0–800 W, 40 m³ room, 3 MJ/K thermal capacity, envelope 65 W/K, 0.5 air changes/hour, internal gains 100 W. Starts at 25°C; 2.5 kW thermal AC, COP 3.5, available all day; electricity $0.35/kWh. Shading assumes 60% less transmitted solar heat. Insulation and ventilation are unchanged.</p><p>Both runs stay at the cooling target. This uncalibrated heat-balance model does not establish perceived comfort, installation cost, fan electricity, annual savings or payback. No user answers are used.</p></details>
    </>}
    <a className={styles.storySource} href="https://www.yourhome.gov.au/passive-design/passive-cooling" target="_blank" rel="noreferrer">About passive cooling ↗</a>
  </div>;
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { rewardAvailability, rewardCategories, type MarketplaceReward, type MarketplaceSnapshot } from "./model";
import { demoMarketplaceService, type MarketplaceService } from "./service";
import styles from "./marketplace.module.css";

const points = (value: number) => value.toLocaleString("en-AU");

function RewardDetail({ reward, snapshot, service, onClose }: { reward: MarketplaceReward; snapshot: MarketplaceSnapshot; service: MarketplaceService; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const availability = rewardAvailability(snapshot, reward);
  const prototype = snapshot.mode === "prototype";
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    // Removing the element also removes its modal layer. Calling close in an
    // effect cleanup fires onClose during React's development effect replay.
  }, []);
  async function redeem() {
    if (busy.current || !availability.canRedeem) return;
    busy.current = true; setPending(true); setError("");
    try {
      const result = await service.redeem(reward.id);
      if (result.ok) setSuccess(true);
      else setError(result.reason === "insufficient-points" ? "Your balance has changed. You need more points for this reward." : result.reason === "already-redeemed" ? "This reward has already been redeemed." : "This reward could not be redeemed. Please try again.");
    } catch { setError("Could not redeem right now. Please try again."); }
    finally { busy.current = false; setPending(false); }
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="reward-title" aria-describedby="reward-description" onClose={onClose} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    <div className={styles.dialogBody}>
      <div className={styles.detailTop}><span className={styles.eyebrow}>{reward.category}</span><button className={styles.close} autoFocus onClick={() => dialog.current?.close()} aria-label="Close reward details">×</button></div>
      <p className={styles.offer}>{prototype ? "Prototype reward · no real partner" : "Reward details"}</p>
      <h2 id="reward-title">{reward.name}</h2>
      <p id="reward-description">{reward.detail}</p>
      <dl className={styles.summary}>
        <div><dt>Points required</dt><dd>{points(reward.points)} points</dd></div>
        <div><dt>{prototype ? "Current demo balance" : "Current balance"}</dt><dd>{points(snapshot.balance)} points</dd></div>
        {!availability.redeemed && <div><dt>Balance after redemption</dt><dd>{availability.shortfall ? "Not enough points" : `${points(snapshot.balance - reward.points)} points`}</dd></div>}
      </dl>
      <div aria-live="polite" aria-atomic="true">
        {success ? <div className={styles.success}><strong>{prototype ? "Demo redemption complete" : "Reward redeemed"}</strong><p>{points(reward.points)} points used. Your {prototype ? "demo " : ""}balance is now {points(snapshot.balance)} points.{prototype && " Nothing has been ordered or issued."}</p></div> : availability.redeemed ? <p className={styles.success}>Already redeemed{prototype ? " in this demo session" : ""}. Find it in Recent rewards.</p> : availability.shortfall > 0 ? <p className={styles.insufficient}>You need {points(availability.shortfall)} more points for this reward.</p> : <p className={styles.ready}>You have enough points for this reward.</p>}
      </div>
      {prototype && <p className={styles.disclosure}>This is a demonstration. Points have no cash value. No payment, bill credit, purchase, booking or delivery takes place.</p>}
      {error && <p role="alert" className={styles.insufficient}>{error}</p>}
      <div className={styles.detailActions}>{availability.redeemed ? <button className={styles.primary} onClick={() => dialog.current?.close()}>Back to rewards →</button> : <button className={styles.primary} disabled={!availability.canRedeem || pending} onClick={redeem}>{pending ? "Redeeming…" : prototype ? "Redeem in demo" : "Redeem reward"}</button>}<button className={styles.secondary} onClick={() => dialog.current?.close()}>Close</button></div>
    </div>
  </dialog>;
}

/** Only the service port knows where balances and redemption receipts come from. */
export function MarketplacePage({ service = demoMarketplaceService }: { service?: MarketplaceService }) {
  const snapshot = useSyncExternalStore(service.subscribe, service.getSnapshot, service.getServerSnapshot);
  const [category, setCategory] = useState<(typeof rewardCategories)[number]>("All");
  const [selected, setSelected] = useState<MarketplaceReward | null>(null);
  const rewards = snapshot.catalogue.filter(reward => category === "All" || reward.category === category);
  const prototype = snapshot.mode === "prototype";
  return <div className={styles.page}>
    <section className={styles.hero} aria-labelledby="marketplace-title">
      <div><span className={styles.eyebrow}>SMALL ACTIONS · SOMETHING TO LOOK FORWARD TO</span><h1 id="marketplace-title">Rewards<br /><span>Marketplace</span></h1><p className={styles.intro}>Turn the actions you take at home into rewards you can use at home.</p><p className={styles.explanation}>Points recognise qualifying completed household actions.<br />A little encouragement to keep your home plan moving.</p><Link href="/cooling-plan" className={styles.textLink}>Return to my room plan <span aria-hidden="true">↗</span></Link></div>
      <aside className={styles.balance} aria-label={prototype ? "Demo points balance" : "Points balance"}>
        <svg className={styles.house} viewBox="0 0 260 130" fill="none" aria-hidden="true"><circle cx="216" cy="32" r="21" fill="#efd6a5"/><path d="M22 123H249M44 122V48L119 13L194 48V122M32 50L119 9L206 50" stroke="#8da493" strokeWidth="2"/><path d="M80 57H157V122H80Z" fill="#faf7f1" stroke="#8da493" strokeWidth="2"/><path d="M118 57V122M80 89H157" stroke="#8da493" strokeWidth="2"/><path d="M75 54H162L150 39H87Z" fill="#b6c8b0"/><path d="M206 98C203 81 219 66 231 68C234 85 223 97 206 98ZM205 122V96L223 78" stroke="#8da493" strokeWidth="2"/></svg>
        <span className={styles.eyebrow}>{prototype ? "YOUR DEMO BALANCE" : "YOUR AVAILABLE BALANCE"}</span><p className={styles.balanceValue} aria-live="polite" aria-atomic="true">{points(snapshot.balance)} <span>points</span></p>
        <p>{prototype ? "1,250 sample points to explore with. Your household actions are not connected to this demo balance." : "Available points from your rewards account."}</p>
        {prototype && <small>Just this browser session · resets on refresh</small>}
      </aside>
    </section>
    {prototype && <div className={styles.prototypeNote}><span>PROTOTYPE PREVIEW</span><p>Useful rewards for a future programme. All offers below are illustrative; no companies are partners and no real products or credits are issued.</p></div>}
    <section className={styles.catalogue} aria-labelledby="catalogue-title">
      <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>FOR YOUR HOME, AND YOUR EVERYDAY</span><h2 id="catalogue-title">Find something useful.</h2></div><span className={styles.count} aria-live="polite">{rewards.length} rewards{category !== "All" && ` · ${category}`}</span></div>
      <div className={styles.filters} role="group" aria-label="Reward categories">{rewardCategories.map(value => <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div>
      <ul className={styles.rewards}>{rewards.map(reward => {
        const availability = rewardAvailability(snapshot, reward);
        return <li key={reward.id}><article className={styles.reward}><span className={styles.eyebrow}>{reward.category}</span><h3>{reward.name}</h3><p>{reward.description}</p><div className={styles.rewardFooter}><div><strong>{points(reward.points)} <span>points</span></strong><small className={availability.canRedeem ? styles.available : undefined}>{availability.redeemed ? "Redeemed this session" : availability.shortfall ? `${points(availability.shortfall)} more points needed` : "Within your balance"}</small></div><button className={styles.viewReward} onClick={() => setSelected(reward)} aria-label={`View reward: ${reward.name}`}>View reward <span aria-hidden="true">↗</span></button></div>{prototype && <small className={styles.offer}>Prototype reward</small>}</article></li>;
      })}</ul>
      {!rewards.length && <p className={styles.empty}>No rewards in this category yet. Explore All rewards.</p>}
    </section>
    <section className={styles.activity} aria-labelledby="activity-title"><div><span className={styles.eyebrow}>{prototype ? "JUST THIS SESSION" : "YOUR REWARD ACTIVITY"}</span><h2 id="activity-title">Recent rewards</h2><p>{prototype ? "A small record of what you tried. Refreshing clears these demo redemptions." : "Your latest reward redemptions."}</p></div>{snapshot.activity.length ? <ul>{snapshot.activity.map(entry => <li key={entry.id}><div><strong>{entry.rewardName}</strong><small>{prototype ? "Demo redemption · nothing ordered" : "Redeemed"}</small></div><span>−{points(entry.points)} points</span></li>)}</ul> : <div className={styles.empty}><strong>Your next useful thing starts here.</strong><p>View a reward to explore the details.{prototype ? " Try a demo redemption when you’re ready." : " Your redemptions will appear here."}</p></div>}</section>
    <footer className={styles.footer}><p>Keep taking practical steps at home.</p><Link href="/knowledge-base">Explore simple techniques →</Link></footer>
    {selected && <RewardDetail key={selected.id} reward={selected} snapshot={snapshot} service={service} onClose={() => setSelected(null)} />}
  </div>;
}

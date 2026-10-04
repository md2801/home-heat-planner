"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { rewardAvailability, rewardCategories, type MarketplaceReward, type MarketplaceSnapshot } from "./model";
import { demoMarketplaceService, type MarketplaceService } from "./service";
import { MarketplaceIcon, RewardVisual } from "./reward-visual";
import styles from "./marketplace.module.css";

const points = (value: number) => value.toLocaleString("en-AU");
const categoryIcons = { All: "gift", "Home comfort": "home", Energy: "energy", Services: "service", "Everyday essentials": "leaf" } as const;

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
    // Unmount removes the modal layer; close() here would fire during effect replay.
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
    <div className={styles.detailImage}><RewardVisual reward={reward} detail /><span className={styles.imageCategory}>{reward.category}</span><button className={styles.close} autoFocus onClick={() => dialog.current?.close()} aria-label="Close reward details">×</button></div>
    <div className={styles.dialogBody}>
      <span className={styles.eyebrow}>{prototype ? "Explore a demo reward" : "A little something for your home"}</span>
      <h2 id="reward-title">{reward.name}</h2>
      <p id="reward-description">{reward.detail}</p>
      <a className={styles.retailerLink} href={reward.url} target="_blank" rel="noopener noreferrer">View product at {reward.retailer} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
      <dl className={styles.summary}>
        <div><dt>Points required</dt><dd>{points(reward.points)} <span>pts</span></dd></div>
        <div><dt>{prototype ? "Your demo balance" : "Your balance"}</dt><dd>{points(snapshot.balance)} <span>pts</span></dd></div>
        {!availability.redeemed && <div><dt>After redemption</dt><dd>{availability.shortfall ? "Not enough points" : `${points(snapshot.balance - reward.points)} pts`}</dd></div>}
      </dl>
      <div aria-live="polite" aria-atomic="true">
        {success ? <div className={styles.success}><MarketplaceIcon name="check" /><div><strong>{prototype ? "Demo redemption complete" : "Reward redeemed"}</strong><p>{points(reward.points)} points used. Your balance is now {points(snapshot.balance)} points.{prototype && " Nothing has been ordered or issued."}</p></div></div> : availability.redeemed ? <p className={styles.ready}>Already redeemed{prototype ? " in this demo session" : ""}. Find it in Recent rewards.</p> : availability.shortfall > 0 ? <p className={styles.insufficient}>You need {points(availability.shortfall)} more points for this reward.</p> : <p className={styles.ready}><MarketplaceIcon name="check" /> You have enough points for this reward.</p>}
      </div>
      {error && <p role="alert" className={styles.insufficient}>{error}</p>}
      <div className={styles.detailActions}>{availability.redeemed ? <button className={styles.primary} onClick={() => dialog.current?.close()}>Back to rewards <MarketplaceIcon name="arrow" /></button> : <button className={styles.primary} disabled={!availability.canRedeem || pending} onClick={redeem}>{pending ? "Redeeming…" : prototype ? "Redeem in demo" : "Redeem reward"}<MarketplaceIcon name="arrow" /></button>}</div>
      {prototype && <p className={styles.disclosure}>Illustrative imagery. Demo points have no cash value; no product is ordered or delivered. No retailer partnership is implied.</p>}
    </div>
  </dialog>;
}

/** Only the service port knows where balances and redemption receipts come from. */
export function MarketplacePage({ service = demoMarketplaceService }: { service?: MarketplaceService }) {
  const snapshot = useSyncExternalStore(service.subscribe, service.getSnapshot, service.getServerSnapshot);
  const [category, setCategory] = useState<(typeof rewardCategories)[number]>("All");
  const [query, setQuery] = useState("");
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [sort, setSort] = useState("catalogue");
  const [selected, setSelected] = useState<MarketplaceReward | null>(null);
  const search = query.trim().toLowerCase();
  const rewards = snapshot.catalogue.filter(reward =>
    (category === "All" || reward.category === category) &&
    (!affordableOnly || rewardAvailability(snapshot, reward).canRedeem) &&
    (!search || `${reward.name} ${reward.category} ${reward.description}`.toLowerCase().includes(search)),
  ).sort((a, b) => sort === "low" ? a.points - b.points : sort === "high" ? b.points - a.points : 0);
  const availableCount = snapshot.catalogue.filter(reward => rewardAvailability(snapshot, reward).canRedeem).length;
  const prototype = snapshot.mode === "prototype";
  const filtered = category !== "All" || !!query || affordableOnly;
  function resetFilters() { setCategory("All"); setQuery(""); setAffordableOnly(false); }
  return <div className={styles.page}>
    <div className={styles.pageHeading}><p><MarketplaceIcon name="gift" /> Rewards marketplace</p><a href="#reward-activity"><MarketplaceIcon name="clock" /> Recent rewards</a></div>
    <section className={styles.hero} aria-labelledby="marketplace-title">
      <div className={styles.heroStory}>
        <div className={styles.heroCopy}><span className={styles.eyebrow}>A little extra for your everyday</span><h1 id="marketplace-title">Good changes.<br /><span>Useful rewards.</span></h1><p>Thoughtful things for a more comfortable home. Find something to put your points towards.</p><a href="#reward-catalogue" className={styles.heroLink}>Explore the rewards <MarketplaceIcon name="arrow" /></a></div>
        <div className={styles.heroImage}><Image src="/images/techniques/close-curtains.png" alt="An illustrative bedroom with soft green curtains and warm natural light" fill sizes="(max-width: 700px) 90vw, 400px" preload /><span><MarketplaceIcon name="leaf" /> A little better, every day.</span></div>
      </div>
      <aside className={styles.balance} aria-label={prototype ? "Demo points balance" : "Points balance"}>
        <div className={styles.balanceTop}><span>{prototype ? "Your demo balance" : "Your available balance"}</span><MarketplaceIcon name="leaf" /></div>
        <p className={styles.balanceValue} aria-live="polite" aria-atomic="true">{points(snapshot.balance)} <span>points</span></p>
        <p className={styles.balanceHint}>{availableCount ? <><MarketplaceIcon name="gift" /> {availableCount} rewards within reach</> : "Explore rewards to work towards."}</p>
        <a href="#reward-catalogue" className={styles.balanceLink} onClick={() => { resetFilters(); setAffordableOnly(true); }}>See what I can redeem <MarketplaceIcon name="arrow" /></a>
        <small>{prototype ? "Sample points · resets on refresh" : "Available from your rewards account"}</small>
      </aside>
    </section>
    {prototype && <p className={styles.prototypeNote}><span>Demo preview</span> Explore real product references with sample points. Redemptions are a demo; no retailer partnership, purchase or delivery.</p>}
    <section id="reward-catalogue" className={styles.catalogue} aria-labelledby="catalogue-title">
      <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Small comforts. Everyday possibilities.</span><h2 id="catalogue-title">Find your next useful thing.</h2></div><label className={styles.search}><MarketplaceIcon name="search" /><span className="sr-only">Search rewards</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search rewards…" /></label></div>
      <div className={styles.filters} role="group" aria-label="Reward categories">{rewardCategories.map(value => <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}><MarketplaceIcon name={categoryIcons[value]} />{value === "All" ? "All rewards" : value}<span>{snapshot.catalogue.filter(reward => value === "All" || reward.category === value).length}</span></button>)}</div>
      <div className={styles.catalogueTools}><p className={styles.count} role="status">{rewards.length} {rewards.length === 1 ? "reward" : "rewards"}{category !== "All" ? ` in ${category.toLowerCase()}` : " to explore"}{filtered && <button onClick={resetFilters}>Clear filters</button>}</p><div className={styles.controls}><label className={styles.affordable}><input type="checkbox" checked={affordableOnly} onChange={event => setAffordableOnly(event.target.checked)} />Within my balance</label><label className={styles.sort}><span className="sr-only">Sort rewards</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="catalogue">Default order</option><option value="low">Points: low to high</option><option value="high">Points: high to low</option></select></label></div></div>
      <ul className={styles.rewards}>{rewards.map(reward => {
        const availability = rewardAvailability(snapshot, reward);
        return <li key={reward.id}><article className={styles.reward}>
          <div className={styles.rewardImage}><RewardVisual reward={reward} /><span className={styles.imageCategory}>{reward.category}</span>{availability.redeemed && <span className={styles.redeemedTag}><MarketplaceIcon name="check" /> Redeemed</span>}</div>
          <div className={styles.rewardBody}><span className={styles.retailer}>{reward.retailer}</span><h3>{reward.name}</h3><p>{reward.description}</p><div className={styles.rewardFooter}><div><strong>{points(reward.points)} <span>points</span></strong><small className={availability.canRedeem || availability.redeemed ? styles.available : styles.shortfall}>{availability.redeemed ? "Redeemed this session" : availability.shortfall ? `${points(availability.shortfall)} more points to go` : <><MarketplaceIcon name="check" /> Ready to redeem</>}</small></div><button className={styles.viewReward} onClick={() => setSelected(reward)} aria-label={`View reward: ${reward.name}`}>View reward <MarketplaceIcon name="arrow" /></button></div></div>
        </article></li>;
      })}</ul>
      {!rewards.length && <div className={styles.noResults}><MarketplaceIcon name="search" /><h3>No rewards match just yet.</h3><p>Try a different search or open up your filters.</p><button className={styles.secondary} onClick={resetFilters}>Show all rewards</button></div>}
      {prototype && <p className={styles.imageNote}>Images and product illustrations show reward concepts, not items supplied by a partner.</p>}
    </section>
    <section id="reward-activity" className={styles.activity} aria-labelledby="activity-title"><div><span className={styles.eyebrow}>{prototype ? "Your demo, so far" : "Your reward activity"}</span><h2 id="activity-title">Recent rewards</h2><p>{prototype ? "The little things you’ve tried this session. Your demo history resets on refresh." : "Your latest reward redemptions."}</p></div>{snapshot.activity.length ? <ul>{snapshot.activity.map(entry => <li key={entry.id}><span className={styles.activityIcon}><MarketplaceIcon name="gift" /></span><div><strong>{entry.rewardName}</strong><small>{prototype ? "Demo redemption · nothing ordered" : "Redeemed"}</small></div><span>−{points(entry.points)} pts</span></li>)}</ul> : <div className={styles.activityEmpty}><MarketplaceIcon name="gift" /><div><strong>Something to look forward to.</strong><p>Choose a reward above. Your first redemption will appear here.</p></div></div>}</section>
    <footer className={styles.footer}><div><MarketplaceIcon name="leaf" /><div><strong>A better home starts with a small change.</strong><p>Find practical ideas you can try with what you already have.</p></div></div><Link href="/knowledge-base">Explore simple techniques <MarketplaceIcon name="arrow" /></Link></footer>
    {selected && <RewardDetail key={selected.id} reward={selected} snapshot={snapshot} service={service} onClose={() => setSelected(null)} />}
  </div>;
}

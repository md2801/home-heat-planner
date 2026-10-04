"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { rewardAvailability, rewardCategories, type MarketplaceReward, type MarketplaceSnapshot } from "./model";
import type { MarketplaceService } from "./service";
import { connectedMarketplaceService } from "./connected-service";
import { useRewards, rewardsClient } from "../rewards/client";
import { RewardsNavigation } from "../rewards/navigation";
import { MarketplaceIcon, RewardVisual } from "./reward-visual";
import styles from "./marketplace.module.css";

const points = (value: number) => value.toLocaleString("en-AU");
const categoryIcons = { All: "gift", "Home comfort": "home", Energy: "energy", Services: "service", "Everyday essentials": "leaf" } as const;

function RewardDetail({ reward, snapshot, service, signedIn, ready, onClose }: { reward: MarketplaceReward; snapshot: MarketplaceSnapshot; service: MarketplaceService; signedIn: boolean; ready: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), busy = useRef(false);
  const [pending, setPending] = useState(false), [consent, setConsent] = useState(false), [error, setError] = useState(""), [copied, setCopied] = useState(false);
  const availability = rewardAvailability(snapshot, reward);
  const coupon = snapshot.activity.find(item => item.rewardId === reward.id);
  useEffect(() => { if (dialog.current && !dialog.current.open) dialog.current.showModal(); }, []);
  async function redeem() {
    if (busy.current || !availability.canRedeem || !consent || !signedIn || !ready) return;
    busy.current = true; setPending(true); setError("");
    try {
      const result = await service.redeem(reward.id);
      if (!result.ok) setError(result.reason === "insufficient-points" ? "Your balance changed. Earn more coins for this coupon." : "Could not generate the coupon. Refresh your wallet and retry.");
    } catch { setError("Could not generate the coupon. Refresh your wallet and retry."); }
    finally { busy.current = false; setPending(false); }
  }
  async function copy() {
    if (!coupon?.code) return;
    try { await navigator.clipboard.writeText(coupon.code); setCopied(true); }
    catch { setError("Copy is unavailable. Select the code to copy it manually."); }
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="reward-title" aria-describedby="reward-description" onClose={onClose} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><div className={styles.detailImage}><RewardVisual reward={reward} detail /><span className={styles.imageCategory}>{reward.category}</span><button className={styles.close} autoFocus onClick={() => dialog.current?.close()} aria-label="Close reward details">×</button></div><div className={styles.dialogBody}>
    <span className={styles.eyebrow}>{reward.retailer}</span>
    <p className={styles.offer}>Demo coupon · retailer does not accept this code</p><h2 id="reward-title">{reward.name}</h2><p id="reward-description">{reward.detail}</p>
    <dl className={styles.summary}><div><dt>Coins required</dt><dd>{points(reward.points)} coins</dd></div><div><dt>Your available coins</dt><dd>{ready ? `${points(snapshot.balance)} coins` : signedIn ? "Loading…" : "Sign in to view"}</dd></div>{!availability.redeemed && ready && <div><dt>Balance after redemption</dt><dd>{availability.shortfall ? "More coins needed" : `${points(snapshot.balance - reward.points)} coins`}</dd></div>}</dl>
    <div aria-live="polite" aria-atomic="true">{coupon ? <div className={styles.success}><MarketplaceIcon name="check" /><div><strong>Your demo coupon</strong><p>{points(coupon.points)} coins used. Nothing has been ordered.</p><code className={styles.couponCode}>{coupon.code}</code><button className={styles.secondary} onClick={() => void copy()}>{copied ? "Copied" : "Copy demo code"}</button></div></div> : !signedIn ? <p className={styles.insufficient}>Sign in and complete recommended tasks to earn coins.</p> : ready && availability.shortfall > 0 ? <p className={styles.insufficient}>Earn {points(availability.shortfall)} more coins for this demo coupon. <Link href="/rewards">Find a task</Link>.</p> : ready ? <p className={styles.ready}>You have enough coins for this demo coupon.</p> : <p role="status">Loading your wallet…</p>}</div>
    <p className={styles.disclosure}><strong>Demo only.</strong> Retailers do not accept this code. No real discount, purchase or delivery is included. Check price and availability at the retailer; purchases use their normal checkout.</p>
    {!coupon && signedIn && ready && availability.canRedeem && <label className={styles.consent}><input type="checkbox" checked={consent} disabled={pending} onChange={event => setConsent(event.target.checked)} /><span>I understand this uses {points(reward.points)} of my saved coins for a demo coupon that will not work at retailer checkout.</span></label>}
    {error && <p role="alert" className={styles.insufficient}>{error}</p>}
    <div className={styles.detailActions}>{!signedIn ? <Link href="/sign-in" className={styles.primary}>Sign in to earn coins</Link> : !coupon && <button className={styles.primary} disabled={!ready || !availability.canRedeem || !consent || pending} onClick={() => void redeem()}>{pending ? "Generating…" : "Generate demo coupon"}</button>}<a className={styles.secondary} href={reward.url} target="_blank" rel="noreferrer">View product at {reward.retailer} ↗</a><button className={styles.secondary} onClick={() => dialog.current?.close()}>Close</button></div>
  </div></dialog>;
}
/** Only the service port knows where balances and redemption receipts come from. */
export function MarketplacePage({ service = connectedMarketplaceService }: { service?: MarketplaceService }) {
  const { account, wallet, error } = useRewards();
  const snapshot = useSyncExternalStore(service.subscribe, service.getSnapshot, service.getServerSnapshot);
  const [category, setCategory] = useState<(typeof rewardCategories)[number]>("All");
  const [query, setQuery] = useState("");
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [sort, setSort] = useState("catalogue");
  const [selected, setSelected] = useState<MarketplaceReward | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const search = query.trim().toLowerCase();
  const rewards = snapshot.catalogue.filter(reward =>
    (category === "All" || reward.category === category) &&
    (!affordableOnly || Boolean(wallet) && rewardAvailability(snapshot, reward).canRedeem) &&
    (!search || `${reward.name} ${reward.category} ${reward.description}`.toLowerCase().includes(search)),
  ).sort((a, b) => sort === "low" ? a.points - b.points : sort === "high" ? b.points - a.points : 0);
  const availableCount = wallet ? snapshot.catalogue.filter(reward => rewardAvailability(snapshot, reward).canRedeem).length : 0;
  const filtered = category !== "All" || !!query || affordableOnly;
  function resetFilters() { setCategory("All"); setQuery(""); setAffordableOnly(false); }
  return <div className={styles.page}><RewardsNavigation marketplace />
    <div className={styles.pageHeading}><p><MarketplaceIcon name="gift" /> Rewards marketplace</p><a href="#reward-activity"><MarketplaceIcon name="clock" /> Saved coupons</a></div>
    <section className={styles.hero} aria-labelledby="marketplace-title">
      <div className={styles.heroStory}>
        <div className={styles.heroCopy}><span className={styles.eyebrow}>A little extra for your everyday</span><h1 id="marketplace-title">Good changes.<br /><span>Useful rewards.</span></h1><p>Thoughtful things for a more comfortable home. Approved recommended tasks add coins you can use for demo coupons.</p><Link href="/rewards" className={styles.heroLink}>Earn coins with a task <MarketplaceIcon name="arrow" /></Link><Link href="/rewards#approvals" className={styles.earnLink}>See my approvals ↗</Link></div>
        <div className={styles.heroImage}><Image src="/images/techniques/close-curtains.png" alt="An illustrative bedroom with soft green curtains and warm natural light" fill sizes="(max-width: 700px) 90vw, 400px" preload /><span><MarketplaceIcon name="leaf" /> A little better, every day.</span></div>
      </div>
      <aside className={styles.balance} aria-label="Your coin balance">
        <div className={styles.balanceTop}><span>Your available coins</span><MarketplaceIcon name="leaf" /></div>
        <p className={styles.balanceValue} aria-live="polite" aria-atomic="true">{wallet ? points(wallet.balance) : "—"} <span>coins</span></p>
        <p className={styles.balanceHint}>{wallet ? `${wallet.completed} approved tasks. ${points(wallet.earned)} coins earned in total.` : account.user ? "Loading your private wallet…" : "Sign in to earn and save your own coins."}</p>{wallet && <p className={styles.balanceHint}>{availableCount ? `${availableCount} demo coupons within reach` : "Complete a task to work towards a coupon."}</p>}
        <a href="#reward-catalogue" className={styles.balanceLink} onClick={() => { resetFilters(); setAffordableOnly(true); }}>See what I can redeem <MarketplaceIcon name="arrow" /></a>
        <small>Saved to your own account · prototype coins have no cash value</small>
      </aside>
    </section>
    <p className={styles.prototypeNote}><span>Demo coupons</span> Real product links with demo codes. Retailers do not accept our codes; no partnership, discount or purchase is included.</p>
    {error && <p role="alert" className={styles.insufficient}>{error} <button className={styles.viewReward} onClick={() => void rewardsClient.refresh()}>Retry wallet</button></p>}
    <section id="reward-catalogue" className={styles.catalogue} aria-labelledby="catalogue-title">
      <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Small comforts. Everyday possibilities.</span><h2 id="catalogue-title">Find your next useful thing.</h2></div><label className={styles.search}><MarketplaceIcon name="search" /><span className="sr-only">Search rewards</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search rewards…" /></label></div>
      <div className={styles.filters} role="group" aria-label="Reward categories">{rewardCategories.map(value => <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}><MarketplaceIcon name={categoryIcons[value]} />{value === "All" ? "All rewards" : value}<span>{snapshot.catalogue.filter(reward => value === "All" || reward.category === value).length}</span></button>)}</div>
      <div className={styles.catalogueTools}><p className={styles.count} role="status">{rewards.length} {rewards.length === 1 ? "reward" : "rewards"}{category !== "All" ? ` in ${category.toLowerCase()}` : " to explore"}{filtered && <button onClick={resetFilters}>Clear filters</button>}</p><div className={styles.controls}><label className={styles.affordable}><input type="checkbox" checked={affordableOnly} onChange={event => setAffordableOnly(event.target.checked)} />Within my balance</label><label className={styles.sort}><span className="sr-only">Sort rewards</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="catalogue">Default order</option><option value="low">Coins: low to high</option><option value="high">Coins: high to low</option></select></label></div></div>
      <ul className={styles.rewards}>{rewards.map(reward => {
        const availability = rewardAvailability(snapshot, reward);
        return <li key={reward.id}><article className={styles.reward}>
          <div className={styles.rewardImage}><RewardVisual reward={reward} /><span className={styles.imageCategory}>{reward.category}</span>{wallet && availability.redeemed && <span className={styles.redeemedTag}><MarketplaceIcon name="check" /> Coupon saved</span>}</div>
          <div className={styles.rewardBody}><span className={styles.retailer}>{reward.retailer}</span><h3>{reward.name}</h3><p>{reward.description}</p><div className={styles.rewardFooter}><div><strong>{points(reward.points)} <span>coins</span></strong><small className={wallet && (availability.canRedeem || availability.redeemed) ? styles.available : styles.shortfall}>{!account.user ? "Earn coins after signing in" : !wallet ? "Loading wallet…" : availability.redeemed ? "Demo coupon saved" : availability.shortfall ? `${points(availability.shortfall)} more coins to go` : <><MarketplaceIcon name="check" /> Ready to redeem</>}</small></div><button className={styles.viewReward} onClick={() => { setSelected(reward); setSelectedOwner(account.user?.id ?? null); }} aria-label={`View reward: ${reward.name}`}>{wallet && availability.redeemed ? "View coupon" : "View product"} <MarketplaceIcon name="arrow" /></button></div></div>
        </article></li>;
      })}</ul>
      {!rewards.length && <div className={styles.noResults}><MarketplaceIcon name="search" /><h3>No rewards match just yet.</h3><p>Try a different search or open up your filters.</p><button className={styles.secondary} onClick={resetFilters}>Show all rewards</button></div>}
      <p className={styles.imageNote}>Images and illustrations show product concepts, not retailer-supplied items.</p>
    </section>
    <section id="reward-activity" className={styles.activity} aria-labelledby="activity-title"><div><span className={styles.eyebrow}>Your reward activity</span><h2 id="activity-title">Your saved coupons</h2><p>Demo codes and coin deductions stay with your account across devices.</p><Link className={styles.earnLink} href="/rewards">See coin history ↗</Link></div>{wallet && snapshot.activity.length ? <ul>{snapshot.activity.map(entry => <li key={entry.id}><span className={styles.activityIcon}><MarketplaceIcon name="gift" /></span><div><strong>{entry.rewardName}</strong><small>{entry.code} · demo only</small></div><span>−{points(entry.points)} coins</span></li>)}</ul> : <div className={styles.activityEmpty}><MarketplaceIcon name="gift" /><div><strong>Your next useful thing starts with a task.</strong><p>Submit photo proof for a recommended task. Approved tasks add coins automatically.</p><Link className={styles.earnLink} href={account.user ? "/rewards" : "/sign-in"}>{account.user ? "Find a task to earn coins" : "Sign in"} ↗</Link></div></div>}</section>
    <footer className={styles.footer}><div><MarketplaceIcon name="leaf" /><div><strong>A better home starts with a small change.</strong><p>Find practical ideas you can try with what you already have.</p></div></div><Link href="/rewards#approvals">Track my task approvals <MarketplaceIcon name="arrow" /></Link></footer>
    {selected && selectedOwner === (account.user?.id ?? null) && <RewardDetail key={`${selectedOwner}-${selected.id}`} reward={selected} snapshot={snapshot} service={service} signedIn={Boolean(account.user)} ready={Boolean(wallet)} onClose={() => setSelected(null)} />}
  </div>;
}

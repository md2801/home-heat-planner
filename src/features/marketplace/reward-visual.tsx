import Image from "next/image";
import type { ReactNode } from "react";
import type { MarketplaceReward } from "./model";
import styles from "./marketplace.module.css";

type IconName = "leaf" | "arrow" | "gift" | "home" | "energy" | "service" | "search" | "check" | "clock" | "wifi";

export function MarketplaceIcon({ name, className }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    leaf: <><path d="M5 19C3 8 12 8 20 3c2 10-3 17-12 15" /><path d="m4 21 12-12M8 17v-5m4 1h5" /></>,
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    gift: <><path d="M4 11h16v10H4zM3 7h18v4H3zM12 7v14" /><path d="M12 7C5 8 4 2 8 3c3 0 4 4 4 4Zm0 0c7 1 8-5 4-4-3 0-4 4-4 4Z" /></>,
    home: <><path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8" /></>,
    energy: <path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z" />,
    service: <><path d="M14 6a5 5 0 0 0-6 6l-5 5a2.8 2.8 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-3 3-4-4 3-3Z" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    wifi: <><path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0m-9 4a4 4 0 0 1 6 0" /><circle cx="12" cy="20" r=".6" /></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const photos: Record<string, string> = {
  "pedestal-fan": "fans",
  "curtain-voucher": "close-curtains",
  "draught-kit": "draught-seals",
  "ac-service": "clean-filters",
  "home-assessment": "cooler-air",
  "insulation-credit": "check-insulation",
};

/** Decorative concepts only; these are not photographs of supplied products. */
export function RewardVisual({ reward, detail = false }: { reward: MarketplaceReward; detail?: boolean }) {
  const photo = photos[reward.id];
  if (photo) return <Image src={`/images/techniques/${photo}.png`} alt="" fill sizes={detail ? "640px" : "(max-width: 700px) 90vw, (max-width: 1050px) 45vw, 440px"} className={styles.rewardPhoto} />;
  if (reward.id === "thermometer") return <div className={styles.plugArt} aria-hidden="true">
    <svg viewBox="0 0 320 200" fill="none"><ellipse cx="160" cy="176" rx="69" ry="8" fill="#c3d0c5" opacity=".6" /><rect x="96" y="25" width="133" height="143" rx="22" fill="#cbd6c9" /><rect x="90" y="21" width="133" height="143" rx="22" fill="#fffdfa" stroke="#b8c7b9" /><rect x="105" y="39" width="103" height="86" rx="9" fill="#dce6d4" /><path d="M121 66h16m10 0h16m-42 30h12m10 0h12" stroke="#59735a" strokeWidth="5" strokeLinecap="round" /><circle cx="180" cy="58" r="4" stroke="#59735a" strokeWidth="2" /><path d="M194 59a7 7 0 1 0 0 14M183 86c-3 5-7 9-7 13a7 7 0 0 0 14 0c0-4-4-8-7-13Z" stroke="#59735a" strokeWidth="2" strokeLinecap="round" /><circle cx="141" cy="145" r="4" fill="#d3ddcc" /><circle cx="171" cy="145" r="4" fill="#d3ddcc" /></svg>
    <span>Get to know your room.</span>
  </div>;
  if (reward.id === "energy-plug") return <div className={styles.plugArt} aria-hidden="true">
    <svg viewBox="0 0 320 200" fill="none"><ellipse cx="163" cy="173" rx="66" ry="8" fill="#c3d0c5" opacity=".6" /><path d="M138 38V19h8v19m27 0V19h8v19" stroke="#8a968c" strokeWidth="6" strokeLinecap="round" /><rect x="103" y="35" width="111" height="127" rx="27" fill="#d2dcd0" /><rect x="98" y="31" width="111" height="126" rx="26" fill="#fffdfa" stroke="#b8c7b9" /><circle cx="154" cy="85" r="34" fill="#f1f2e9" stroke="#d4ddd0" /><path d="m141 74 5 9m16-9-5 9m-3 10v9" stroke="#657c6a" strokeWidth="5" strokeLinecap="round" /><circle cx="154" cy="137" r="4" fill="#578469" /><path d="M224 64c7 7 7 17 0 24m9-33c12 12 12 31 0 43" stroke="#86a591" strokeWidth="2" strokeLinecap="round" /></svg>
    <span>Know what’s using energy.</span>
  </div>;
  const internet = reward.id === "internet-credit";
  const energy = reward.id === "electricity-credit";
  return <div className={`${styles.voucherArt} ${internet ? styles.blueArt : energy ? styles.sageArt : styles.sandArt}`} aria-hidden="true">
    <div className={styles.voucher}><MarketplaceIcon name={internet ? "wifi" : energy ? "energy" : "home"} /><span>HOME HEAT PLANNER</span><strong>{internet ? "Stay connected." : energy ? "A little bill relief." : "Make room\nfor better."}</strong><div><span>{internet ? "INTERNET CREDIT" : energy ? "ENERGY CREDIT" : "HOME UPGRADE"}</span><MarketplaceIcon name="arrow" /></div></div>
  </div>;
}


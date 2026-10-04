"use client";
import { useEffect, useSyncExternalStore } from "react";
import { accountStore } from "../account/account-store.ts";
import type { RewardsSnapshot } from "../../contracts/rewards.ts";

interface State { owner: string | null; wallet: RewardsSnapshot | null; loading: boolean; error: string; busyTask: string | null }
const initial: State = { owner: null, wallet: null, loading: false, error: "", busyTask: null };
let state = initial;
let run = 0;
let loading: Promise<void> | null = null;
let connected = false;
let walletVersion = 0;
const listeners = new Set<() => void>();
function update(change: Partial<State>) { state = { ...state, ...change }; listeners.forEach(listener => listener()); }
function current(owner: string, generation: number) { return run === generation && accountStore.getSnapshot().user?.id === owner; }
async function request(owner: string, init: RequestInit = {}) {
  if (accountStore.getSnapshot().user?.id !== owner) throw new Error("Your account changed. Reload this page.");
  const response = await fetch(init.body instanceof FormData ? "/api/rewards/proof" : "/api/rewards", { ...init, cache: "no-store", headers: { "X-Account-User": owner, ...(init.headers ?? {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "Rewards are unavailable. Retry when connected.");
  if (!Number.isSafeInteger(body.balance) || body.balance < 0 || !Array.isArray(body.attempts) || !Array.isArray(body.coupons) || !Array.isArray(body.tasks) || !Array.isArray(body.entries)) throw new Error("Could not read your rewards. Retry.");
  return body as RewardsSnapshot;
}
export const rewardsClient = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => state,
  getServerSnapshot: () => initial,
  connect() {
    if (connected) return;
    connected = true;
    const sync = () => {
      const account = accountStore.getSnapshot();
      const owner = account.ready ? account.user?.id ?? null : null;
      if (state.owner === owner) return;
      run++; loading = null;
      update({ ...initial, owner });
      if (owner) void this.refresh();
    };
    accountStore.subscribe(sync); sync();
  },
  refresh(): Promise<void> {
    if (loading) return loading;
    const owner = state.owner, generation = run;
    const version = walletVersion;
    if (!owner) return Promise.resolve();
    update({ loading: true, error: "" });
    const pending = (async () => {
      try {
        await accountStore.flush();
        if (!current(owner, generation)) return;
        const wallet = await request(owner);
        if (current(owner, generation) && version === walletVersion) update({ wallet, error: "" });
      } catch (error) { if (current(owner, generation)) update({ error: error instanceof Error ? error.message : "Could not load rewards. Retry." }); }
      finally { if (current(owner, generation)) { loading = null; update({ loading: false }); } }
    })();
    loading = pending;
    return pending;
  },
  async submit(taskId: string, form: FormData) {
    const owner = state.owner, generation = run;
    if (!owner || state.busyTask) throw new Error("Sign in and finish the current submission before trying again.");
    if (!await accountStore.flush()) throw new Error("Save your account journey before submitting. Retry saving from My account.");
    if (!current(owner, generation)) throw new Error("Your account changed. Reload this page.");
    if (state.busyTask) throw new Error("Finish the current submission before trying again.");
    update({ busyTask: taskId, error: "" });
    try {
      const wallet = await request(owner, { method: "POST", body: form });
      if (!current(owner, generation)) throw new Error("Your account changed. Reload this page.");
      walletVersion++; update({ wallet, error: "" });
      return wallet.attempts.find(attempt => attempt.taskId === taskId)!;
    } finally { if (current(owner, generation)) update({ busyTask: null }); }
  },
  async redeem(rewardId: string) {
    const owner = state.owner, generation = run;
    if (!owner) throw new Error("Sign in to use your earned coins.");
    const wallet = await request(owner, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "redeem", rewardId, demoConsent: true }) });
    if (!current(owner, generation)) throw new Error("Your account changed. Reload this page.");
    walletVersion++; update({ wallet, error: "" });
    return wallet.coupons.find(coupon => coupon.rewardId === rewardId)!;
  },
};
export function useRewards() {
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  const rewards = useSyncExternalStore(rewardsClient.subscribe, rewardsClient.getSnapshot, rewardsClient.getServerSnapshot);
  useEffect(() => { rewardsClient.connect(); void rewardsClient.refresh(); }, []);
  // Keep an in-flight assessment visible after navigation or a reload.
  useEffect(() => {
    if (!rewards.owner || !rewards.busyTask && !rewards.wallet?.attempts.some(item => item.status === "checking")) return;
    const timer = setInterval(() => { void rewardsClient.refresh(); }, 3000);
    return () => clearInterval(timer);
  }, [rewards.owner, rewards.busyTask, rewards.wallet]);
  return { account, ...rewards, wallet: rewards.owner === account.user?.id ? rewards.wallet : null };
}

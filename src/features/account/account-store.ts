"use client";
import { authClient } from "../../lib/auth/client.ts";
import { createBrowserPersistence } from "../../lib/persistence/browser-storage.ts";
import { assessmentRepository, ASSESSMENT_STORAGE_KEY } from "../assessment/repository.ts";
import { emptyAssessment, isAssessmentDraft, type AssessmentDraft } from "../assessment/state.ts";
import { createAccountCache, createAccountSync, AccountSyncError, type SyncPhase } from "./sync.ts";

export interface AccountUser { id: string; name: string; email: string }
interface Snapshot { ready: boolean; user: AccountUser | null; phase: SyncPhase | "guest"; message: string; importDraft: AssessmentDraft | null }
const initial: Snapshot = { ready: false, user: null, phase: "loading", message: "", importDraft: null };
let snapshot = initial;
const listeners = new Set<() => void>();
let boot: Promise<void> | null = null;
let sync: ReturnType<typeof createAccountSync> | null = null;
let generation = 0;
const guestStorage = () => createBrowserPersistence(ASSESSMENT_STORAGE_KEY, isAssessmentDraft);
function update(change: Partial<Snapshot>) { snapshot = { ...snapshot, ...change }; listeners.forEach(listener => listener()); }
async function response(request: Promise<Response>) {
  const result = await request;
  if (!result.ok) throw new AccountSyncError(result.status);
  return result.json();
}
async function initialise(run: number) {
  try {
    const { data, error } = await authClient.getSession();
    if (run !== generation) return;
    if (error) throw new Error("Session unavailable");
    const user = data?.user;
    if (!user) { assessmentRepository.hydrate(); update({ ready: true, user: null, phase: "guest", message: "Sign in to save your journey across devices." }); return; }
    const guest = guestStorage().load();
    const cache = createAccountCache(user.id);
    assessmentRepository.switchPersistence(cache.persistence);
    update({ user: { id: user.id, name: user.name, email: user.email } });
    sync = createAccountSync(assessmentRepository, cache, {
      async load() {
        const value = await response(fetch("/api/account/journey", { cache: "no-store", headers: { "X-Account-User": user.id } }));
        if (!(value.draft === null || isAssessmentDraft(value.draft)) || !Number.isSafeInteger(value.revision) || value.revision < 0) throw new Error("Invalid account data");
        return value;
      },
      async save(draft, revision) {
        const value = await response(fetch("/api/account/journey", { method: "PUT", headers: { "Content-Type": "application/json", "X-Account-User": user.id }, body: JSON.stringify({ draft, revision }) }));
        if (value.saved !== true || !Number.isSafeInteger(value.revision) || value.revision <= revision) throw new Error("Invalid save receipt");
        return value.revision;
      },
    }, state => update(state));
    await sync.start();
    if (run !== generation) return;
    const empty = Object.keys(assessmentRepository.getSnapshot().draft.answers).length === 0;
    update({ ready: true, importDraft: empty && snapshot.phase === "saved" && guest.ok && guest.value && Object.keys(guest.value.answers).length ? guest.value : null });
  } catch {
    if (run !== generation) return;
    assessmentRepository.hydrate();
    update({ ready: true, phase: "offline", message: "Sign-in is unavailable. You can continue in this browser and retry sign-in later." });
  }
}
export const accountStore = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => snapshot,
  getServerSnapshot: () => initial,
  initialise() { return boot ??= initialise(generation); },
  async refresh() {
    generation++;
    sync?.stop(); sync = null; boot = null;
    update({ ready: false, user: null, phase: "loading", message: "", importDraft: null });
    await this.initialise();
  },
  async retry() { if (sync) await sync.retry(); else { boot = null; await this.initialise(); } },
  async flush() { await sync?.flush(); return snapshot.phase === "saved"; },
  async resolve(choice: "account" | "device") {
    try { await sync?.resolve(choice); }
    catch { update({ phase: "offline", message: "Could not load the latest version. Your changes remain on this device; retry." }); }
  },
  importGuest() {
    if (!snapshot.importDraft || !snapshot.user || snapshot.phase !== "saved") return;
    assessmentRepository.save(snapshot.importDraft);
    update({ importDraft: null });
  },
  dismissImport() { update({ importDraft: null }); },
  async signOut() {
    await sync?.flush();
    const { error } = await authClient.signOut();
    if (error) throw new Error("Could not sign out. Retry.");
    generation++;
    sync?.stop(); sync = null;
    assessmentRepository.switchPersistence(guestStorage());
    update({ user: null, phase: "guest", message: "You’re signed out.", importDraft: null });
  },
  resetAccount() { assessmentRepository.save(emptyAssessment()); },
};

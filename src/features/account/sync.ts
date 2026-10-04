import { createBrowserPersistence, type Persistence, type StoragePort } from "../../lib/persistence/browser-storage.ts";
import { emptyAssessment, isAssessmentDraft, type AssessmentDraft } from "../assessment/state.ts";
import type { createAssessmentRepository } from "../assessment/repository.ts";

interface CacheValue { draft: AssessmentDraft; revision: number; dirty: boolean }
export type SyncPhase = "loading" | "saved" | "saving" | "offline" | "conflict" | "signed-out";
export interface SyncState { phase: SyncPhase; message: string }
export interface AccountTransport {
  load(): Promise<{ draft: AssessmentDraft | null; revision: number }>;
  save(draft: AssessmentDraft, revision: number): Promise<number>;
}
export class AccountSyncError extends Error {
  status: number;
  constructor(status: number) { super("Account request failed"); this.status = status; }
}
export function createAccountCache(userId: string, getStorage?: () => StoragePort | null) {
  let value: CacheValue = { draft: emptyAssessment(), revision: 0, dirty: false };
  const storage = createBrowserPersistence<CacheValue>(`home-heat-planner:account:${encodeURIComponent(userId)}:v1`, (input): input is CacheValue => {
    if (typeof input !== "object" || input === null) return false;
    const v = input as CacheValue;
    return isAssessmentDraft(v.draft) && Number.isSafeInteger(v.revision) && v.revision >= 0 && typeof v.dirty === "boolean";
  }, getStorage);
  let loaded = storage.load();
  if (loaded.ok && loaded.value) value = loaded.value;
  const persistence: Persistence<AssessmentDraft> = {
    load: () => loaded.ok ? { ok: true, value: value.draft } : loaded,
    save(draft) { value = { ...value, draft, dirty: true }; loaded = { ok: true, value }; return storage.save(value); },
    remove() { value = { ...value, draft: emptyAssessment(), dirty: true }; loaded = { ok: true, value }; return storage.save(value); },
  };
  return {
    persistence,
    get: () => value,
    baseline(draft: AssessmentDraft, revision: number, dirty = false) { value = { draft, revision, dirty }; loaded = { ok: true, value }; return storage.save(value); },
  };
}
type Repository = ReturnType<typeof createAssessmentRepository>;
type Cache = ReturnType<typeof createAccountCache>;
/** Serialises writes and preserves offline edits across reloads; a revision conflict requires a choice. */
export function createAccountSync(repository: Repository, cache: Cache, transport: AccountTransport, report: (state: SyncState) => void) {
  let revision = cache.get().revision;
  let stopped = false, paused = true, running = false, replacing = false;
  let pending: AssessmentDraft | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let remote: Awaited<ReturnType<AccountTransport["load"]>> | null = null;
  let conflicted = false;
  let flushing: Promise<void> | null = null;
  const show = (phase: SyncPhase, message: string) => { if (!stopped) report({ phase, message }); };
  const unsubscribe = repository.subscribe(() => {
    if (stopped || replacing) return;
    pending = repository.getSnapshot().draft;
    show(conflicted ? "conflict" : paused ? "offline" : "saving", conflicted ? "Two journey versions need your choice. New edits stay on this device." : paused ? "Changes are kept on this device. Retry account saving." : "Saving to your account…");
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void flush(); }, 300);
  });
  function flush(): Promise<void> {
    if (flushing) return flushing;
    flushing = flushWrites().finally(() => { flushing = null; });
    return flushing;
  }
  async function flushWrites() {
    if (running || paused || stopped || !pending) return;
    running = true;
    try {
      while (pending && !stopped && !paused) {
        const draft = pending; pending = null;
        show("saving", "Saving to your account…");
        try {
          const nextRevision = await transport.save(draft, revision);
          if (stopped) return;
          revision = nextRevision;
          cache.baseline(repository.getSnapshot().draft, revision, pending !== null);
        } catch (error) {
          if (stopped) return;
          pending ??= draft; paused = true;
          if (error instanceof AccountSyncError && error.status === 409) {
            conflicted = true;
            show("conflict", "Another device has a newer saved journey. Choose which version to keep.");
          } else if (error instanceof AccountSyncError && error.status === 401) {
            show("signed-out", "Your session ended. Sign in again to save; changes are kept on this device.");
          } else show("offline", "Your progress is kept on this device. Account saving failed; retry when connected.");
          return;
        }
      }
      if (!stopped) show("saved", "Saved to your account.");
    } finally { running = false; }
  }
  function replace(draft: AssessmentDraft, nextRevision: number) {
    revision = nextRevision; replacing = true;
    const result = cache.baseline(draft, revision);
    repository.switchPersistence(cache.persistence);
    replacing = false;
    if (!result.ok) show("offline", "Account loaded. Saving a copy on this device is unavailable.");
  }
  async function restore() {
    show("loading", "Loading your saved journey…"); paused = true;
    try {
      remote = await transport.load();
      if (stopped) return;
      const local = cache.get();
      if (local.dirty && JSON.stringify(local.draft) !== JSON.stringify(remote.draft ?? emptyAssessment())) {
        if (local.revision !== remote.revision) { conflicted = true; show("conflict", "This device has unsaved changes and your account has another version. Choose which to keep."); return; }
        revision = remote.revision; pending = local.draft;
      } else { pending = null; replace(remote.draft ?? emptyAssessment(), remote.revision); }
      paused = false; conflicted = false;
      if (pending) await flush(); else show("saved", remote.draft ? "Saved to your account." : "Your account is ready for your first assessment.");
    } catch (error) {
      if (error instanceof AccountSyncError && error.status === 401) show("signed-out", "Sign in again to access your account. Changes are kept on this device.");
      else show("offline", "Could not load your account. Your device's saved progress is available; retry when connected.");
    }
  }
  return {
    start: restore,
    retry: restore,
    async resolve(choice: "account" | "device") {
      const latest = await transport.load();
      if (stopped) return;
      conflicted = false;
      if (choice === "account") { pending = null; replace(latest.draft ?? emptyAssessment(), latest.revision); paused = false; show("saved", "Loaded the saved account version."); }
      else { revision = latest.revision; pending = repository.getSnapshot().draft; paused = false; await flush(); }
    },
    async flush() { if (timer) clearTimeout(timer); await flush(); },
    stop() { stopped = true; unsubscribe(); if (timer) clearTimeout(timer); },
  };
}

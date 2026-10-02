export type PersistenceResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "unavailable" | "invalid-data" | "write-failed" };

export interface Persistence<T> {
  load(): PersistenceResult<T | null>;
  save(value: T): PersistenceResult<null>;
  remove(): PersistenceResult<null>;
}

export type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserStorage(): StoragePort | null {
  // Lazy access keeps imports safe during server rendering.
  return typeof window === "undefined" ? null : window.localStorage;
}

/** Callers supply a runtime validator; corrupt or old payloads are never cast into state. */
export function createBrowserPersistence<T>(
  key: string,
  validate: (value: unknown) => value is T,
  getStorage: () => StoragePort | null = browserStorage,
): Persistence<T> {
  return {
    load() {
      let raw: string | null;
      try {
        const storage = getStorage();
        if (!storage) return { ok: false, reason: "unavailable" };
        raw = storage.getItem(key);
      } catch { return { ok: false, reason: "unavailable" }; }
      if (raw === null) return { ok: true, value: null };
      try {
        const value: unknown = JSON.parse(raw);
        return validate(value) ? { ok: true, value } : { ok: false, reason: "invalid-data" };
      } catch { return { ok: false, reason: "invalid-data" }; }
    },
    save(value) {
      try {
        if (!validate(value)) return { ok: false, reason: "invalid-data" };
        const storage = getStorage();
        if (!storage) return { ok: false, reason: "unavailable" };
        storage.setItem(key, JSON.stringify(value));
        return { ok: true, value: null };
      } catch { return { ok: false, reason: "write-failed" }; }
    },
    remove() {
      try {
        const storage = getStorage();
        if (!storage) return { ok: false, reason: "unavailable" };
        storage.removeItem(key);
        return { ok: true, value: null };
      } catch { return { ok: false, reason: "write-failed" }; }
    },
  };
}

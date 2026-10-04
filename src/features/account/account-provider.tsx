"use client";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { accountStore } from "./account-store";
import Link from "next/link";
import { usePathname } from "next/navigation";

const publicPages = new Set(["/", "/sign-in", "/sign-up", "/reset-password", "/knowledge-base", "/explore", "/energy-assistant", "/document-import", "/thermal-scenario", "/marketplace", "/rewards"]);

export function AccountProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  useEffect(() => { void accountStore.initialise(); }, []);
  // Resolve the account before mounting journey screens, avoiding a guest-data flash.
  return account.ready || publicPages.has(pathname) ? <>{account.user && <div className="account-save-status" role="status"><span>{account.message}</span>{account.phase === "offline" && <button onClick={() => void accountStore.retry()}>Retry saving</button>}{account.phase === "conflict" && <Link href="/account">Choose a journey version</Link>}{account.phase === "signed-out" && <Link href="/sign-in">Sign in again</Link>}</div>}{children}</> : <p role="status" className="mx-auto max-w-7xl px-6 py-12">Opening Home Heat Planner…</p>;
}

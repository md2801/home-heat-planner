"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import styles from "./account.module.css";

export function ResetPasswordPage() {
  const query = useSearchParams();
  const token = query.get("token");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!token || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await authClient.resetPassword({ token, newPassword: password });
      if (result.error) setError("This reset link may have expired. Request a new link and try again.");
      else { setPassword(""); setDone(true); }
    } catch { setError("Could not reset your password. Please retry."); }
    finally { setBusy(false); }
  }
  return <section className={styles.resetPanel}><h1>{done ? "Password updated" : "Choose a new password"}</h1>{done ? <><p>You can now sign in with your new password.</p><Link className={styles.primary} href="/sign-in">Sign in</Link></> : !token || query.has("error") ? <><p>This reset link is invalid or has expired. Return to sign in and choose “Forgot password?”.</p><Link className={styles.primary} href="/sign-in">Back to sign in</Link></> : <form onSubmit={event => void submit(event)}><div className={styles.field}><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} required aria-describedby="reset-help" /><p id="reset-help" className={styles.hint}>Use at least 12 characters.</p></div><button className={styles.primary} disabled={busy}>{busy ? "Saving…" : "Save new password"}</button></form>}{error && <p className={styles.error} role="alert">{error}</p>}</section>;
}

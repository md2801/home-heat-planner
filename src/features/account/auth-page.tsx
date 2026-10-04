"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { JourneyHeader } from "@/components/layout/journey-header";
import { authClient } from "@/lib/auth/client";
import { accountStore } from "./account-store";
import { authErrorMessage } from "./auth-error";
import styles from "./account.module.css";

function HomeDrawing() {
  return <svg viewBox="0 0 600 330" fill="none" aria-hidden="true" className={styles.house}>
    <circle cx="484" cy="79" r="37" fill="#ffb13b" /><g stroke="#b96708" strokeWidth="2" strokeLinecap="round"><path d="M484 22V13M484 136V145M427 79H418M541 79H550M444 39L437 32M524 39L531 32M444 119L437 126M524 119L531 126" /></g>
    <path d="M101 282V137L274 48L447 137V282" fill="#fffdfa" stroke="#24584a" strokeWidth="2.5" /><path d="M76 145L274 42L472 145" stroke="#24584a" strokeWidth="5" strokeLinecap="round" /><path d="M102 154H446" stroke="#ded8cd" strokeWidth="2" />
    <path d="M111 138L274 55L435 138" stroke="#c9d6c8" strokeWidth="2" /><path d="M162 281V197H238V281" fill="#eaf0e9" stroke="#24584a" strokeWidth="2" /><circle cx="222" cy="244" r="3" fill="#24584a" />
    <path d="M295 191H392V251H295Z" fill="#edf2f3" stroke="#24584a" strokeWidth="2" /><path d="M343 191V251M295 221H392" stroke="#597d8a" strokeWidth="1.5" /><path d="M286 182H402L414 191H275L286 182Z" fill="#24584a" /><path d="M68 282H489M149 295H252M143 309H258" stroke="#24584a" strokeWidth="2" strokeLinecap="round" />
    <path d="M60 278V242M60 259C37 261 34 237 40 226C56 232 59 245 60 259ZM61 250C80 253 89 229 83 216C67 222 62 235 61 250Z" fill="#c9d6c8" stroke="#24584a" strokeWidth="1.5" />
    <path d="M487 279V244M487 257C472 259 459 241 465 229C480 230 488 244 487 257ZM488 249C510 251 523 228 514 208C496 216 487 229 488 249Z" fill="#c9d6c8" stroke="#24584a" strokeWidth="1.5" />
  </svg>;
}
function GoogleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.4Z" /><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2.1 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2H3v2.6A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.3 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9l3.3-2.6Z" /><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.5l3.3 2.6C7.1 7.7 9.4 5.9 12 5.9Z" /></svg>;
}
export function AuthPage({ initialMode = "sign-in", ssoError = false }: { initialMode?: "sign-in" | "sign-up"; ssoError?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "forgot">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(ssoError ? "Google sign-in wasn’t completed. Try again or use your email and password." : null);
  const [sent, setSent] = useState(false);
  const heading = mode === "sign-up" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back";
  function changeMode(next: typeof mode) { setMode(next); setPassword(""); setMessage(null); setSent(false); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setMessage(null);
    try {
      const result = mode === "sign-up"
        ? await authClient.signUp.email({ email: email.trim(), password, name: name.trim(), callbackURL: "/account" })
        : mode === "forgot"
          ? await authClient.requestPasswordReset({ email: email.trim(), redirectTo: `${window.location.origin}/reset-password` })
          : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        setMessage(authErrorMessage(result.error, mode));
      } else if (mode === "forgot") setSent(true);
      else { await accountStore.refresh(); router.push("/account"); router.refresh(); }
    } catch (error) { setMessage(authErrorMessage(error, mode)); }
    finally { setBusy(false); }
  }
  async function google() {
    if (busy) return; setBusy(true); setMessage(null);
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: `${window.location.origin}/account`, errorCallbackURL: `${window.location.origin}/sign-in?error=sso` });
      if (result.error) setMessage("Google sign-in couldn’t start. Retry or use your email and password.");
    } catch { setMessage("Google sign-in couldn’t connect. Retry or use your email and password."); }
    finally { setBusy(false); }
  }
  return <div className={styles.page}><JourneyHeader />
    <div className={styles.authLayout}>
      <section className={styles.introduction} aria-labelledby="account-intro"><h2 id="account-intro">Your home.<br />Your plan.</h2><p>Keep your room assessment, improvements and check-ins together. Pick up where you left off, on any device.</p><HomeDrawing /><ul className={styles.promises}><li>Your own private room plan</li><li>Your progress, saved as you go</li><li>A place to return when you’re ready</li></ul></section>
      <section className={styles.formPanel} aria-labelledby="auth-title"><h1 id="auth-title">{heading}</h1><p className={styles.formIntro}>{mode === "sign-up" ? "Save the next steps towards a more comfortable home." : mode === "forgot" ? "Enter your email and we’ll send a reset link." : "Sign in to return to your home’s next steps."}</p>
        {mode !== "forgot" && <><button type="button" className={styles.google} disabled={busy} onClick={() => void google()}><GoogleIcon />Continue with Google</button><div className={styles.divider}><span>or use your email</span></div></>}
        {sent ? <div className={styles.success} role="status"><h2>Check your inbox</h2><p>If this email has an account, you’ll receive a link to reset your password.</p><button type="button" className={styles.textButton} onClick={() => changeMode("sign-in")}>Back to sign in</button></div> : <form onSubmit={event => void submit(event)}>
          <fieldset disabled={busy} className={styles.fields}>
            {mode === "sign-up" && <div className={styles.field}><label htmlFor="account-name">Your name</label><input id="account-name" autoComplete="name" value={name} maxLength={100} required onChange={event => setName(event.target.value)} /></div>}
            <div className={styles.field}><label htmlFor="account-email">Email address</label><input id="account-email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} maxLength={254} required onChange={event => setEmail(event.target.value)} /></div>
            {mode !== "forgot" && <div className={styles.field}><div className={styles.labelRow}><label htmlFor="account-password">Password</label>{mode === "sign-in" && <button type="button" className={styles.textButton} onClick={() => changeMode("forgot")}>Forgot password?</button>}</div><div className={styles.password}><input id="account-password" type={visible ? "text" : "password"} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} value={password} minLength={mode === "sign-up" ? 12 : 1} maxLength={128} required aria-describedby={mode === "sign-up" ? "password-help" : undefined} onChange={event => setPassword(event.target.value)} /><button type="button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? "Hide" : "Show"}</button></div>{mode === "sign-up" && <p id="password-help" className={styles.hint}>Use at least 12 characters. A memorable phrase works well.</p>}</div>}
            <button className={styles.primary} type="submit">{busy ? "Please wait…" : mode === "sign-up" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}</button>
          </fieldset>
        </form>}
        {message && <p className={styles.error} role="alert">{message}</p>}
        <p className={styles.switchMode}>{mode === "sign-in" ? <>New here? <button type="button" disabled={busy} onClick={() => changeMode("sign-up")}>Create an account</button></> : mode === "sign-up" ? <>Already have an account? <button type="button" disabled={busy} onClick={() => changeMode("sign-in")}>Sign in</button></> : !sent && <button type="button" disabled={busy} onClick={() => changeMode("sign-in")}>Back to sign in</button>}</p>
        <p className={styles.privacy}>Your assessment and plan belong to your account. You choose whether to bring in an existing browser assessment.</p>
      </section>
    </div><footer className={styles.footer}><Link href="/assessment">Continue without an account</Link><span>You can still assess your room and save in this browser.</span></footer>
  </div>;
}

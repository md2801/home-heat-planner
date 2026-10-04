"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import type { RewardAttempt } from "../../contracts/rewards";
import { rewardReasons, type RewardTask } from "./catalogue";
import { rewardsClient } from "./client";
import styles from "./rewards.module.css";

interface Photo { file: File; url: string }
async function taskPhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 12000000) throw new Error("Choose a JPG, PNG or WebP photo under 12 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare this photo. Try another.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", .82));
    if (!blob || blob.size > 1500000) throw new Error("Choose a smaller photo.");
    return new File([blob], "task-photo.jpg", { type: "image/jpeg" });
  } finally { bitmap.close(); }
}
export function ProofDialog({ task, busy, close }: { task: RewardTask; busy: boolean; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const active = useRef(true);
  const urls = useRef<string[]>([]);
  const selections = useRef([0, 0]);
  const [photos, setPhotos] = useState<(Photo | null)[]>([null, null]);
  const [preparing, setPreparing] = useState(0);
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RewardAttempt | null>(null);
  useEffect(() => {
    active.current = true; dialog.current?.showModal();
    const liveUrls = urls.current;
    return () => { active.current = false; liveUrls.forEach(url => URL.revokeObjectURL(url)); };
  }, []);
  async function choose(index: number, file?: File) {
    const generation = ++selections.current[index]!;
    setError(""); setResult(null);
    if (!file) return;
    setPreparing(value => value + 1);
    try {
      const prepared = await taskPhoto(file);
      if (!active.current || generation !== selections.current[index]) return;
      if (urls.current[index]) URL.revokeObjectURL(urls.current[index]);
      const url = URL.createObjectURL(prepared); urls.current[index] = url;
      setPhotos(value => value.map((photo, i) => i === index ? { file: prepared, url } : photo));
    } catch (error) { if (active.current) setError(error instanceof Error ? error.message : "Choose your photo again."); }
    finally { if (active.current) setPreparing(value => value - 1); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy || preparing || !consent) return;
    const form = new FormData(); form.set("taskId", task.id); form.set("notes", notes); form.set("consent", "yes");
    for (let index = 0; index < task.photoCount; index++) { const photo = photos[index]; if (!photo) return; form.set(`photo${index + 1}`, photo.file); }
    setError(""); setResult(null);
    try { const receipt = await rewardsClient.submit(task.id, form); if (active.current) setResult(receipt); }
    catch (error) { if (active.current) setError(error instanceof Error ? error.message : "Your submission could not finish. Check Approvals before retrying."); }
  }
  const approved = result?.status === "approved";
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="proof-title" onClose={close} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    <div className={styles.dialogBody}><div className={styles.dialogHeading}><span>{task.coins} coins after approval</span><button aria-label="Close photo submission" onClick={() => dialog.current?.close()} className={styles.close}>×</button></div>
      <h2 id="proof-title">{task.title}</h2><p>{task.proof}</p>
      <ul className={styles.checks}>{task.checks.map(check => <li key={check}>{check}</li>)}</ul>
      <div aria-live="polite" aria-atomic="true">{busy && <p className={styles.feedback}>Checking your photos… You can close this window and follow the result in Approvals.</p>}{result && <div className={approved ? styles.success : styles.feedback}><strong>{approved ? `Approved. ${result.coins} coins added.` : result.status === "unavailable" ? "Assessment unavailable" : "More photo evidence needed"}</strong><p>{result.reason && rewardReasons[result.reason]}</p></div>}</div>
      {!approved && <form onSubmit={submit}>
        <div className={styles.photoFields}>{Array.from({ length: task.photoCount }, (_, index) => {
          const label = task.photoCount === 1 ? "Task photo" : task.id === "cooler-air" ? index === 0 ? "Indoor reading photo" : "Outdoor reading photo" : index === 0 ? "Before photo" : "After photo";
          return <div key={index} className={styles.photoField}><label htmlFor={`proof-photo-${index}`}>{label}</label><input id={`proof-photo-${index}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => void choose(index, event.target.files?.[0])} />{photos[index] && <Image src={photos[index]!.url} alt={`Your ${label.toLowerCase()} preview`} width={1400} height={1400} unoptimized className={styles.preview} />}</div>;
        })}</div>
        <p className={styles.small}>Use your own photos of this task. JPG, PNG or WebP; large photos are resized before upload. Keep people, addresses and identifying details out of frame.</p>
        <label className={styles.notesLabel} htmlFor="proof-notes">Anything useful to point out? <span>(optional)</span></label><textarea id="proof-notes" value={notes} maxLength={500} rows={2} disabled={busy} onChange={event => setNotes(event.target.value)} />
        <label className={styles.consent}><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} /><span>I agree to send these photos to OpenAI for automated task assessment. Home Heat Planner does not retain the photos; it saves the result and photo fingerprints. <a href="https://developers.openai.com/api/docs/guides/your-data" target="_blank" rel="noreferrer">Provider data controls</a>.</span></label>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <div className={styles.dialogActions}><button className={styles.primary} disabled={busy || preparing > 0 || !consent || photos.slice(0, task.photoCount).some(photo => !photo)}>{busy ? "Checking photos…" : preparing ? "Preparing photos…" : "Submit for approval"}</button><button type="button" className={styles.secondary} onClick={() => dialog.current?.close()}>{busy ? "View approvals" : "Close"}</button></div>
      </form>}
      {approved && <button className={styles.primary} onClick={() => dialog.current?.close()}>See my updated coins</button>}
      <p className={styles.small}>Assessment checks visible task details. It does not verify savings, temperature changes or photo authenticity.</p>
    </div>
  </dialog>;
}

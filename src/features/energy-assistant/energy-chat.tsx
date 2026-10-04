"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { billFields, emptyBill, validatePdfFile, type Bill, type BillKey, type ChatMessage, type ConfirmedBill } from "@/contracts/energy-assistant";
import { askEnergy, uploadBill } from "@/services/energy-assistant";
import { billingDays, confirmBill, correctBill, loadChoices, remember, type Household } from "./logic";
import { answerConversation, questionText, startConversation, type BillConversation } from "./conversation";
import { BillDetails, EnergyAnalysis } from "./bill-details";
import styles from "./energy-assistant.module.css";
type Stage = "start" | "general" | "upload" | "confirm" | "followup" | "final";
const importantEditKeys: BillKey[] = ["billingDays", "consumptionKwh", "totalAmountAud", "usageRateAud", "supplyDailyAud"];
const greeting: ChatMessage = { role: "assistant", content: "Hi — what can I help you with today?" };
export function EnergyChat() {
  const [stage, setStage] = useState<Stage>("start"), [messages, setMessages] = useState<ChatMessage[]>([greeting]);
  const [bill, setBill] = useState<Bill>(emptyBill), [corrected, setCorrected] = useState<BillKey[]>([]), [confirmed, setConfirmed] = useState<ConfirmedBill | null>(null);
  const [household, setHousehold] = useState<Household>({}), [input, setInput] = useState(""), [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [fileName, setFileName] = useState(""), [editing, setEditing] = useState(false);
  const [conversation, setConversation] = useState<BillConversation>({ asked: [], current: null, clarification: null });
  const [pendingChat, setPendingChat] = useState<ChatMessage[] | null>(null);
  const controller = useRef<AbortController | null>(null), generation = useRef(0), end = useRef<HTMLDivElement>(null);
  useEffect(() => () => { generation.current++; controller.current?.abort(); }, []);
  useEffect(() => { if (messages.length > 1) end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [messages, stage, busy]);
  function append(...entries: ChatMessage[]) { setMessages(current => entries.reduce(remember, current)); }
  function reset() {
    generation.current++; controller.current?.abort(); setBusy(false); setError(""); setStage("start"); setMessages([greeting]); setBill(emptyBill()); setCorrected([]); setConfirmed(null); setHousehold({}); setConversation({ asked: [], current: null, clarification: null }); setInput(""); setSelected([]); setFileName(""); setEditing(false); setPendingChat(null);
  }
  function chooseBill() { setStage("upload"); setError(""); setPendingChat(null); append({ role: "user", content: "Analyse my electricity bill" }, { role: "assistant", content: "I can help you understand your electricity use and identify areas worth investigating. Upload a recent electricity bill to get started, then we'll check the details together." }); }
  function chooseGeneral() { setStage("general"); setError(""); append({ role: "user", content: "Ask an energy question" }, { role: "assistant", content: "Ask me about household electricity use or practical ways to reduce demand. What would you like to understand?" }); }
  async function generalChat(history: ChatMessage[]) {
    controller.current?.abort(); const c = new AbortController(); controller.current = c; const id = ++generation.current;
    setBusy(true); setError(""); setPendingChat(history);
    try {
      const result = await askEnergy(history, AbortSignal.any([c.signal, AbortSignal.timeout(35000)]));
      if (generation.current !== id) return;
      if (result.ok) { setMessages(remember(history, { role: "assistant", content: result.answer })); setPendingChat(null); } else setError(result.message);
    } catch { if (generation.current === id) setError("The answer couldn't finish. Retry or browse Simple techniques; your recent messages are still here."); }
    finally { if (generation.current === id) setBusy(false); }
  }
  async function upload(file: File) {
    const problem = validatePdfFile(file); if (problem) { setError(problem); return; }
    controller.current?.abort(); const c = new AbortController(); controller.current = c; const id = ++generation.current;
    setBusy(true); setError(""); setFileName(file.name); append({ role: "user", content: `Uploaded: ${file.name}` });
    try {
      const result = await uploadBill(file, AbortSignal.any([c.signal, AbortSignal.timeout(60000)]));
      if (generation.current !== id) return;
      if (result.ok) { setBill(result.bill); setCorrected([]); setStage("confirm"); append({ role: "assistant", content: "I found these details on your bill. Does this look right? Please check the period, imported electricity and current bill total. Missing values are still unknown." }); }
      else setError(result.message);
    } catch { if (generation.current === id) setError("The upload couldn't finish. Please choose the PDF again to retry."); }
    finally { if (generation.current === id) setBusy(false); }
  }
  function confirm() {
    try { const value = confirmBill(bill, corrected); setConfirmed(value); setStage("followup"); setError(""); const session = startConversation(household, bill); setConversation(session); const q = session.current; append({ role: "user", content: "These bill details look right." }, { role: "assistant", content: "Thanks. I'll use only these confirmed details and what you tell me. " + (q ? questionText(q, bill) : "Let's look at what we know.") }); if (!q) setStage("final"); }
    catch (e) { setError(e instanceof Error ? e.message : "Check the bill details."); }
  }
  function answer(value: string) {
    if (!conversation.current || !value.trim()) return;
    const result = answerConversation(conversation, household, bill, value);
    setConversation(result.state); setHousehold(result.household); setInput(""); setSelected([]); setError("");
    append({ role: "user", content: value.trim().slice(0, 1000) }, { role: "assistant", content: result.reply });
    if (!result.state.current) setStage("final");
  }
  function submit(e: FormEvent) {
    e.preventDefault(); const text = input.trim(); if (!text || busy) return;
    if (stage === "followup") { answer(text); return; }
    setStage("general"); setInput(""); const history = remember(messages, { role: "user", content: text }); setMessages(history); void generalChat(history);
  }
  function saveCorrection(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const data = new FormData(e.currentTarget), edits: Partial<Record<BillKey, string>> = {};
    for (const key of Object.keys(billFields) as BillKey[]) if (data.has(key)) edits[key] = String(data.get(key));
    try { const result = correctBill(bill, edits, corrected); setBill(result.bill); setCorrected(result.correctedFields); setEditing(false); setError(""); append({ role: "user", content: "I've checked and edited the bill details." }, { role: "assistant", content: "Updated. Please review the details and confirm before we continue." }); }
    catch (e) { setError(e instanceof Error ? e.message : "Check the edited values."); }
  }
  function editFields(keys: BillKey[]) { return <div className={styles.editFields}>{keys.map(key => <label key={key}>{billFields[key].label} {billFields[key].unit && `(${billFields[key].unit})`}<input name={key} type={billFields[key].type === "number" ? "number" : billFields[key].type === "date" ? "date" : "text"} step="any" maxLength={600} defaultValue={bill[key].value ?? ""} /></label>)}</div>; }
  const question = stage === "followup" ? conversation.current : null;
  return <div className={styles.chat}>
    <div className={styles.chatBar}><span>HOUSEHOLD ENERGY · A PRACTICAL CONVERSATION</span><button type="button" onClick={reset}>New chat ↺</button></div>
    <div aria-live="polite" aria-relevant="additions text" className={styles.transcript}>{messages.map((m, index) => <div key={`${index}-${m.content}`} className={m.role === "user" ? styles.user : styles.assistant}><span className={styles.speaker}>{m.role === "user" ? "You" : "Energy Assistant"}</span><p>{m.content}</p></div>)}</div>
    {stage === "start" && <div className={styles.starters}><button onClick={chooseBill}><strong>Analyse my electricity bill <span>→</span></strong><small>Understand your usage and find areas worth investigating.</small></button><button onClick={chooseGeneral}><strong>Ask an energy question <span>→</span></strong><small>Explore household energy use and practical ways to reduce demand.</small></button></div>}
    {stage === "upload" && <section className={styles.inlinePanel} aria-label="Electricity bill upload"><label className={styles.upload}>Choose a PDF bill<input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(file); }} /></label><p>Digital PDFs with selectable text · up to 4 MB and 12 pages. Scans and password-protected files may not be readable.</p>{fileName && <p>Uploaded file: {fileName}. The original isn’t kept for retry; choose it again if needed.</p>}<p className={styles.privacy}>Processed temporarily on the server. Extracted bill text is sent to OpenAI to read the details. The app doesn’t intentionally save your PDF or bill text. Provider processing and retention policies still apply. Use a redacted bill where possible.</p></section>}
    {stage === "confirm" && <section className={styles.inlinePanel} aria-label="Review bill details">{editing ? <form onSubmit={saveCorrection}><p>Correct what you can verify on the bill. Leave missing values blank. Rates are dollars, not cents.</p>{editFields(importantEditKeys)}<details><summary>Edit dates, retailer, solar or other details</summary>{editFields((Object.keys(billFields) as BillKey[]).filter(k => !importantEditKeys.includes(k)))}</details><button className={styles.primary}>Save corrections</button> <button type="button" onClick={() => { setEditing(false); setError(""); }}>Cancel</button></form> : <><BillDetails bill={bill} correctedFields={corrected} />{bill.billingDays.value === null && billingDays(bill).value !== null && <p>{billingDays(bill).value} days calculated by counting both dates. Confirm that this matches the bill, or enter its billing-day count.</p>}<div className={styles.controls}><button className={styles.primary} onClick={confirm}>Confirm details →</button><button onClick={() => { setEditing(true); setError(""); }}>Correct a value</button></div></>}</section>}
    {question && <p className={styles.privacy}>Question {conversation.asked.length} of up to 5{conversation.clarification ? " · Checking this answer" : ""}</p>}
    {question && <div className={styles.choices}>{question === "loads" ? <><div className={styles.loadChoices}>{loadChoices.map(load => <label key={load}><input type="checkbox" checked={selected.includes(load)} onChange={e => setSelected(current => e.target.checked ? [...current, load] : current.filter(x => x !== load))} />{load}</label>)}</div><button className={styles.primary} disabled={!selected.length} onClick={() => answer(selected.join("; "))}>Use these answers</button><button onClick={() => answer("None of these")}>None of these</button></> : question === "occupancy" ? ["One", "Two", "Three", "Four", "Five or more"].map(value => <button key={value} onClick={() => answer(value)}>{value}</button>) : question === "solar" ? ["Yes", "No"].map(value => <button key={value} onClick={() => answer(value)}>{value}</button>) : null}<button onClick={() => answer("Not sure / skipped")}>Not sure / skip</button></div>}
    {stage === "final" && confirmed && <><EnergyAnalysis confirmed={confirmed} household={household} /><div className={styles.controls}><button onClick={() => { setStage("confirm"); setHousehold({}); setEditing(true); }}>Revisit bill details</button><button onClick={reset}>Start another conversation</button></div></>}
    {busy && <p role="status" className={styles.status}>{stage === "upload" ? "Reading the PDF and checking bill details…" : "Thinking through your question…"}</p>}
    {error && <div role="alert" className={styles.error}><p>{error}</p>{pendingChat && <button disabled={busy} onClick={() => void generalChat(pendingChat)}>Retry answer</button>} <Link href="/knowledge-base">Browse Simple techniques →</Link></div>}
    {["start", "general", "followup"].includes(stage) && <form onSubmit={submit} className={styles.composer}><label htmlFor="energy-message">{stage === "followup" ? "Your answer" : "Your energy question"}</label><div><textarea id="energy-message" rows={2} maxLength={stage === "followup" ? 1000 : 1800} value={input} disabled={busy} placeholder={stage === "followup" ? "Tell me what you know, or choose Not sure…" : "Ask about energy use in your home…"} onChange={e => setInput(e.target.value)} /><button className={styles.primary} disabled={busy || !input.trim()}>{stage === "followup" ? "Reply →" : "Send →"}</button></div></form>}
    <div ref={end} /><p className={styles.privacy}>This chat remembers the most recent ten messages and your current bill answers while this page is open. New chat, refreshing or leaving resets it. Nothing is saved to browser storage. General answers may need checking; <Link href="/knowledge-base">review our sourced guides</Link>.</p>
  </div>;
}

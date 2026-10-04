"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { type AcRole, type DocumentImportResult, type DocumentKind } from "../../contracts/document-import.ts";
import { documentMime, uploadDocument, validateDocumentFile } from "../../services/document-import.ts";
import { FieldReview } from "./field-review.tsx";
import { finishDocumentReview, startDocumentReview, type ReviewedDocumentField } from "./review.ts";
import styles from "./document-import.module.css";
type Phase = "upload" | "processing" | "failed" | "review" | "complete";
const choices: { value: DocumentKind; label: string }[] = [{ value: "electricity-bill", label: "Electricity bill" }, { value: "ac-label", label: "AC energy label" }, { value: "installation-quote", label: "Installation quote" }];
export function DocumentImport() {
  const [kind, setKind] = useState<DocumentKind>("electricity-bill");
  const [role, setRole] = useState<AcRole>("existing");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("upload");
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentImportResult | null>(null);
  const [items, setItems] = useState<ReviewedDocumentField[]>([]);
  const active = useRef<AbortController | null>(null);
  const objectUrl = useRef<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => () => { active.current?.abort(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);
  const busy = phase === "processing";
  const reviewed = items.filter(item => item.decision !== "pending").length;
  function clearReview() { active.current?.abort(); active.current = null; setPhase("upload"); setMessage(null); setResult(null); setItems([]); }
  function chooseFile(next: File | null) {
    clearReview();
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null; setPreview(null); setFile(null);
    if (!next) return;
    const error = validateDocumentFile(next);
    if (error) { setMessage(error); setPhase("failed"); if (picker.current) picker.current.value = ""; return; }
    objectUrl.current = URL.createObjectURL(next); setPreview(objectUrl.current); setFile(next);
  }
  function reset() { chooseFile(null); if (picker.current) picker.current.value = ""; }
  async function read() {
    if (!file) return;
    const controller = new AbortController();
    active.current?.abort(); active.current = controller;
    setPhase("processing"); setMessage(null); setResult(null); setItems([]);
    try {
      const response = await uploadDocument(file, kind, role, AbortSignal.any([controller.signal, AbortSignal.timeout(55000)]));
      if (active.current !== controller || controller.signal.aborted) return;
      if (response.ok) { setResult(response.result); setItems(startDocumentReview(response.result)); setPhase("review"); }
      else { setMessage(response.message); setPhase("failed"); }
    } catch {
      if (active.current !== controller || controller.signal.aborted) return;
      setMessage("Document reading took too long. Retry with a smaller or clearer document."); setPhase("failed");
    } finally { if (active.current === controller) active.current = null; }
  }
  function finish() {
    if (!result) return;
    try { finishDocumentReview(result, items); setPhase("complete"); }
    catch { setMessage("Review every field before finishing."); }
  }
  function download() {
    if (!result || phase !== "complete") return;
    const snapshot = finishDocumentReview(result, items);
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `reviewed-${kind}.json`; link.click(); URL.revokeObjectURL(url);
  }
  return <div className={styles.workspace}>
    <section className={styles.upload} aria-labelledby="upload-title">
      <h2 id="upload-title">Your document</h2>
      <label htmlFor="document-kind">What are you uploading?<select id="document-kind" value={kind} disabled={busy} onChange={event => { clearReview(); setKind(event.target.value as DocumentKind); }}>{choices.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>
      {kind === "ac-label" && <label htmlFor="ac-role">Which AC is this label for?<select id="ac-role" value={role} disabled={busy} onChange={event => { clearReview(); setRole(event.target.value as AcRole); }}><option value="existing">My existing AC</option><option value="proposed">A replacement I am considering</option></select></label>}
      <label htmlFor="document-file">Choose a file<input ref={picker} id="document-file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className={styles.fileInput} disabled={busy} onChange={event => chooseFile(event.target.files?.[0] ?? null)} /></label>
      <p className={styles.small}>PDF, JPG or PNG · Up to 4 MB and 12 PDF pages. Use a clear, readable document.</p>
      <p className={styles.small}>Your file is sent to OpenAI for reading. This app keeps it only for this review; provider retention policies apply.</p>
      <div className={styles.actions}><button type="button" className={styles.primary} disabled={!file || busy} onClick={() => void read()}>{phase === "failed" ? "Retry reading" : "Read document"}</button>{busy ? <button type="button" onClick={clearReview}>Cancel reading</button> : file && <button type="button" onClick={reset}>Clear document</button>}</div>
      {file && preview && <div className={styles.documentPreview}><h3>Original document</h3><p className={styles.filename}>{file.name}</p>{documentMime(file) === "application/pdf" ? <iframe src={preview} title="Original document preview" /> : <Image src={preview} alt="Uploaded document for comparison with extracted fields" width={800} height={600} unoptimized style={{ width: "100%", height: "auto", maxHeight: 500, objectFit: "contain" }} />}<a href={preview} target="_blank" rel="noreferrer">Open original document</a></div>}
    </section>
    <section className={styles.review} aria-labelledby="review-title" aria-busy={busy}>
      <h2 id="review-title">Review proposed values</h2>
      <p className={styles.scope}>{kind === "electricity-bill" ? "This bill describes property electricity. Its consumption will not be treated as bedroom cooling use. Multiple usage rates will not be averaged into a flat rate." : kind === "ac-label" ? "Check the cooling figure's printed climate and period. Cooling capacity and heating energy are different values. Reviewing a label does not establish its suitability for a comparison." : "A quote does not establish savings. Missing costs stay unknown, and recurring charges keep their stated period."}</p>
      {phase === "upload" && <div className={styles.empty}><h3>A careful read, then your review.</h3><p>Upload a document to see its proposed fields beside the source. Confirm, correct or reject each value.</p><p>Everything stays on this page until you choose what to keep. Your assessment is unchanged.</p></div>}
      {busy && <div className={styles.processing} role="status"><strong>Reading your document…</strong><p>Checking the printed labels, values and units. You will review every proposal before keeping it.</p></div>}
      {phase === "failed" && message && <div className={styles.failure} role="alert"><strong>We could not read this document.</strong><p>{message}</p><p>Choose another file or retry. Your assessment has not changed.</p></div>}
      {result && <><div className={styles.progress} role="status"><span>{reviewed} of {items.length} fields reviewed</span><span>{result.evidenceMode === "visual" ? "Check against the image" : "Check against the PDF"}</span></div>{items.map((item, i) => <FieldReview key={item.proposal.field} item={item} locked={phase === "complete"} onChange={value => setItems(current => current.map((entry, index) => index === i ? value : entry))} />)}
        {phase === "complete" ? <div className={styles.complete} role="status"><strong>Review complete</strong>These values are reviewed locally. Your assessment has not been changed.<div className={styles.actions}><button type="button" onClick={download}>Download reviewed values</button><button type="button" onClick={() => setPhase("review")}>Edit reviewed values</button></div></div> : <div className={styles.actions}><button type="button" className={styles.primary} disabled={reviewed !== items.length} onClick={finish}>Finish review</button><p className={styles.small}>Confirm, correct or keep every field unknown before finishing.</p></div>}
      </>}
    </section>
  </div>;
}

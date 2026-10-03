"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { coverings, directions, emptyScene, equipmentTypes, shades, type RoomScene as Scene, type SceneWindow } from "../../contracts/room-scene";
import { DynamicRoom as RoomScene } from "./dynamic-room";
import { requestRoomScene } from "../../services/room-scene";
import { assessmentRepository } from "../assessment/repository";
import { assessmentScene } from "./assessment-scene";
import { equipmentPlacement } from "./equipment-details";
import { confirmScene } from "./confirm-scene";
import { sceneUnknowns, withProposedShade } from "./model";
import styles from "./room-scene.module.css";

const names: Record<string, string> = { unknown: "Not sure", none: "None", awning: "External awning", "present-unspecified": "Shade present · type unknown", curtains: "Curtains", blinds: "Blinds", shutters: "Shutters", "split-ac": "Split-system AC", "ceiling-fan": "Ceiling fan", "portable-fan": "Portable fan", "ac-unspecified": "AC · type unknown", "fan-unspecified": "Fan · type unknown", roof: "Roof", "another-room": "Another room", "another-dwelling": "Another dwelling", present: "Present", absent: "Absent" };
const label = (value: string) => names[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
function Select({ title, value, options, onChange, disabled }: { title: string; value: string; options: readonly string[]; onChange: (value: string) => void; disabled: boolean }) {
  return <label className={styles.field}><span>{title}</span><select value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>{options.map(option => <option key={option} value={option}>{label(option)}</option>)}</select></label>;
}
export function RoomSceneBuilder({ initialDescription = "", fallback }: { initialDescription?: string; fallback: ReactNode }) {
  const { draft } = useSyncExternalStore(assessmentRepository.subscribe, assessmentRepository.getSnapshot, assessmentRepository.getServerSnapshot);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(initialDescription.slice(0, 1000));
  const [scene, setScene] = useState<Scene>(emptyScene);
  const [saved, setSaved] = useState<Scene | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [proposal, setProposal] = useState(false);
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);
  function launch() {
    const { draft } = assessmentRepository.getSnapshot();
    const current = assessmentScene(draft.answers, draft.sceneDetails);
    setScene(current); setSaved(current); setConfirmed(true); setPreview(false); setProposal(false); setMessage("");
    setOpen(true);
  }
  function edit(next: Scene) { setScene(next); setConfirmed(false); setProposal(false); setPreview(false); setMessage(""); }
  function editWindow(index: number, patch: Partial<SceneWindow>) { edit({ ...scene, windows: scene.windows!.map((w, i) => i === index ? { ...w, ...patch } : w) }); }
  async function generate() {
    const controller = new AbortController(); request.current = controller;
    setPending(true); setMessage(""); setPreview(false);
    const timer = setTimeout(() => controller.abort(), 20000);
    const result = await requestRoomScene({ description, current: scene }, controller.signal);
    clearTimeout(timer);
    if (request.current !== controller) return;
    request.current = null; setPending(false);
    if (result.ok) { setScene(result.scene); setConfirmed(false); setProposal(true); setMessage("Review each proposed detail below, correct anything missing, then confirm."); }
    else setMessage(result.message);
  }
  const unknowns = sceneUnknowns(scene);
  if (!open) return <>{fallback}<button className={styles.launch} onClick={launch}>Refine your room diagram →</button></>;
  return <section className={styles.builder} aria-label="Room diagram builder">
    <div className={styles.heading}><h2>Your room, illustrated</h2><button disabled={pending} onClick={() => setOpen(false)}>Close editor</button></div>
    <p className={styles.note}>One bedroom, up to four windows. Layout and sizes are schematic. Confirming corrections updates your assessment answers and may change which improvements are suitable. No costs are inferred from the picture.</p>
    <label className={styles.field}><span>Describe your room or a correction</span><textarea rows={3} maxLength={1000} disabled={pending} value={description} placeholder="Two west-facing windows with curtains, no external shade, a bed and a split-system AC." onChange={e => { setDescription(e.target.value); setMessage(""); }} /></label>
    <p className={styles.note}>Generate sends this description and diagram details to OpenAI. Leave out addresses and personal details. You can also use only the controls below.</p>
    <div className={styles.actions}><button disabled={pending || !description.trim()} onClick={generate}>{pending ? "Building proposal…" : "Generate room proposal"}</button>{pending && <button onClick={() => { request.current?.abort(); request.current = null; setPending(false); setMessage("Generation cancelled. Your diagram is unchanged."); }}>Cancel</button>}</div>
    <p className={styles.status}>{preview ? "Proposed change · external awnings" : confirmed ? "Current assessment diagram" : proposal ? "Unconfirmed proposal · review details" : "Draft · confirm your details"}</p>
    <div className={styles.viewSwitch} role="group" aria-label="Room view">
      <button aria-pressed={!preview} onClick={() => setPreview(false)}>{confirmed ? "Current room" : "Room draft"}</button>
      <button disabled={pending || !confirmed || !scene.windows?.length} aria-pressed={preview} onClick={() => setPreview(true)}>Proposed improvement</button>
    </div>
    <RoomScene scene={preview ? withProposedShade(scene) : scene} proposed={preview} {...(confirmed || (saved && JSON.stringify(saved.equipment) === JSON.stringify(scene.equipment)) ? { placement: equipmentPlacement(draft.answers) } : {})} />
    <p className={styles.note}>Furniture, finishes, roof shape and layout are illustrative{scene.bed === "unknown" ? "; bed presence is unconfirmed" : ""}. Equipment drawings represent the reported category; their type may still need checking.</p>
    {preview && <p className={styles.note}>Visual preview only. Feasibility, permission and cooling benefit have not been assessed. Your confirmed diagram is unchanged.</p>}
    <div className={styles.controls}>
      <Select title="Above this room" value={scene.above} options={["unknown", "roof", "another-room", "another-dwelling"]} disabled={pending} onChange={value => edit({ ...scene, above: value as Scene["above"] })} />
      <Select title="Bed" value={scene.bed} options={["unknown", "present", "absent"]} disabled={pending} onChange={value => edit({ ...scene, bed: value as Scene["bed"] })} />
      <label className={styles.field}><span>Window count</span><select disabled={pending} value={scene.windows === null ? "unknown" : scene.windows.length} onChange={e => edit({ ...scene, windows: e.target.value === "unknown" ? null : Array.from({ length: Number(e.target.value) }, (_, i) => scene.windows?.[i] ?? { direction: "unknown", covering: "unknown", shade: "unknown" }) })}><option value="unknown">Not sure / more than four</option>{[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n === 0 ? "No windows" : n}</option>)}</select></label>
    </div>
    {scene.windows?.map((w, i) => <fieldset key={i} className={styles.window}><legend>Window {i + 1}</legend><div className={styles.controls}>
      <Select title="Direction" value={w.direction} options={directions} disabled={pending} onChange={direction => editWindow(i, { direction: direction as SceneWindow["direction"] })} />
      <Select title="Inside covering" value={w.covering} options={coverings} disabled={pending} onChange={covering => editWindow(i, { covering: covering as SceneWindow["covering"] })} />
      <Select title="External shade" value={w.shade} options={shades} disabled={pending} onChange={shade => editWindow(i, { shade: shade as SceneWindow["shade"] })} />
    </div></fieldset>)}
    <fieldset className={styles.window}><legend>Cooling equipment</legend><label><input type="checkbox" disabled={pending} checked={scene.equipment !== null} onChange={e => edit({ ...scene, equipment: e.target.checked ? [] : null })} /> I know which equipment is present</label>
      {scene.equipment !== null && <><p className={styles.note}>Select all present. None selected means no equipment.</p><div className={styles.checks}>{equipmentTypes.map(kind => <label key={kind}><input type="checkbox" disabled={pending} checked={scene.equipment!.includes(kind)} onChange={e => {
        const conflicts = kind === "ac-unspecified" ? ["split-ac"] : kind === "split-ac" ? ["ac-unspecified"] : kind === "fan-unspecified" ? ["ceiling-fan", "portable-fan"] : ["fan-unspecified"];
        edit({ ...scene, equipment: e.target.checked ? [...scene.equipment!.filter(k => !conflicts.includes(k)), kind] : scene.equipment!.filter(k => k !== kind) });
      }} /> {label(kind)}</label>)}</div></>}
    </fieldset>
    <p className={styles.note}>{unknowns.length ? `Still unknown: ${unknowns.join(", ")}.` : "All supported diagram fields have been provided."} Dimensions, physical positions and construction performance are not established.</p>
    <div className={styles.actions}>
      <button disabled={pending || confirmed} onClick={() => { assessmentRepository.save(confirmScene(assessmentRepository.getSnapshot().draft, scene, new Date().toISOString())); setConfirmed(true); setProposal(false); setSaved(scene); setMessage(assessmentRepository.getSnapshot().notice ?? "Confirmed diagram and assessment answers saved together."); }}>Confirm diagram</button>
      {saved && !confirmed && <button disabled={pending} onClick={() => { setScene(saved); setConfirmed(true); setProposal(false); setPreview(false); setMessage("Restored your last confirmed diagram."); }}>Discard draft</button>}
      <button disabled={pending} onClick={() => { setScene(emptyScene()); setConfirmed(false); setProposal(false); setPreview(false); setDescription(""); setMessage("Draft reset to unknown. Your saved assessment is unchanged until you confirm."); }}>Reset draft to unknown</button>
    </div>
    <p role="status" className={styles.message}>{message}</p>
  </section>;
}

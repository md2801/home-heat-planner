"use client";
import { useEffect, useRef, useState } from "react";
import { RoomScene as FlatRoom } from "../../components/illustrations/room-scene";
import type { RoomScene } from "../../contracts/room-scene";
import type { EquipmentPlacement } from "./equipment-details";
import type { SceneFocus } from "./assessment-scene";
import { roomLayout } from "./room-layout";
import type { RoomEngine } from "./room-engine";
import styles from "./dynamic-room.module.css";
interface Props { scene: RoomScene; placement?: EquipmentPlacement; proposed?: boolean; focus?: SceneFocus; showDetails?: boolean }
export function DynamicRoom(props: Props) {
  const { scene, placement, proposed = false, focus = "none", showDetails = true } = props;
  const canvas = useRef<HTMLCanvasElement>(null), engine = useRef<RoomEngine | null>(null);
  const labelLayer = useRef<HTMLDivElement>(null);
  const [flat, setFlat] = useState(false), [failed, setFailed] = useState(false), [ready, setReady] = useState(false);
  const serialized = JSON.stringify(roomLayout(scene, placement));
  const layout = roomLayout(scene, placement);
  useEffect(() => {
    if (flat || failed || !canvas.current) return;
    let cancelled = false; const element = canvas.current;
    import("./room-engine").then(({ createRoomEngine }) => {
      if (cancelled) return;
      engine.current = createRoomEngine(element, () => setFailed(true), labelLayer.current); setReady(true);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; engine.current?.dispose(); engine.current = null; };
  }, [flat, failed]);
  useEffect(() => {
    if (!engine.current || flat || failed) return;
    let cancelled = false;
    engine.current.update(JSON.parse(serialized), proposed, focus).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [serialized, proposed, focus, ready, flat, failed]);
  return <div className={styles.room}>
    <div className={styles.heading}><span>{proposed ? "Proposed improvement · not installed" : flat || failed ? "Your room in 2D" : "Your room in 3D"}</span><button type="button" onClick={() => { if (failed) { setFailed(false); setFlat(false); } else setFlat(!flat); setReady(false); }}>{flat || failed ? "Show 3D" : "Show 2D"}</button></div>
    {flat || failed ? <><FlatRoom {...props} />{failed && <p role="status">3D is unavailable on this device. Your room is shown in 2D.</p>}</> : <>
      <div className={styles.viewport}>
        <canvas ref={canvas} className={styles.canvas} aria-label="Interactive bedroom built from your answers. Use the rotation buttons or drag to rotate." />
        <div ref={labelLayer} className={styles.labelLayer} />
      </div>
      <div className={styles.controls}><button type="button" aria-label="Rotate room left" onClick={() => engine.current?.turn(-Math.PI / 4)}>↶</button><span>Drag to rotate · scroll to zoom</span><button type="button" aria-label="Rotate room right" onClick={() => engine.current?.turn(Math.PI / 4)}>↷</button><button type="button" onClick={() => engine.current?.reset()}>Reset view</button></div>
    </>}
    <p className={styles.caption}>{scene.above === "roof" ? "Roof above" : scene.above === "another-room" ? "Another room above" : scene.above === "another-dwelling" ? "Another dwelling above" : "Above room unconfirmed"} · ceiling removed for viewing. Compass sides guide placement; dimensions, spacing and furniture are illustrative.</p>
    {showDetails && <details className={styles.details}><summary>Room placement & unconfirmed details</summary><ul>{layout.reported.map(t => <li key={t}>{t}</li>)}{layout.notes.map(t => <li key={t}>{t}</li>)}</ul></details>}
  </div>;
}

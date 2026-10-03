"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { RoomScene as FlatRoom } from "../../components/illustrations/room-scene";
import type { RoomScene } from "../../contracts/room-scene";
import type { EquipmentPlacement } from "./equipment-details";
import type { SceneFocus } from "./assessment-scene";
import { roomLayout } from "./room-layout";
import type { RoomEngine } from "./room-engine";
import { CoolingStory } from "./cooling-story";
import styles from "./dynamic-room.module.css";
interface Props { scene: RoomScene; placement?: EquipmentPlacement; proposed?: boolean; focus?: SceneFocus; showDetails?: boolean; title?: string; presentation?: boolean; coolingStory?: boolean; showStory?: boolean; onStoryStageChange?: (stage: number) => void }
export function DynamicRoom(props: Props) {
  const { scene, placement, proposed = false, focus = "none", showDetails = true, presentation = false, coolingStory = false, showStory = true, onStoryStageChange } = props;
  const canvas = useRef<HTMLCanvasElement>(null), engine = useRef<RoomEngine | null>(null);
  const labelLayer = useRef<HTMLDivElement>(null);
  const [flat, setFlat] = useState(false), [failed, setFailed] = useState(false), [ready, setReady] = useState(false);
  const [storyStage, setStoryStage] = useState(0);
  const handleStoryStage = useCallback((stage: number) => { setStoryStage(stage); onStoryStageChange?.(stage); }, [onStoryStageChange]);
  const [airflow, setAirflow] = useState(false);
  const serialized = JSON.stringify(roomLayout(scene, placement));
  const layout = roomLayout(scene, placement);
  useEffect(() => { engine.current?.airflow(airflow || presentation); }, [airflow, presentation, ready, flat, failed]);
  useEffect(() => {
    if (flat || failed || !canvas.current) return;
    let cancelled = false; const element = canvas.current;
    import("./room-engine").then(({ createRoomEngine }) => {
      if (cancelled) return;
      engine.current = createRoomEngine(element, () => setFailed(true), labelLayer.current, presentation, coolingStory ? handleStoryStage : undefined); setReady(true);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; engine.current?.dispose(); engine.current = null; };
  }, [flat, failed, presentation, coolingStory, handleStoryStage]);
  useEffect(() => {
    if (!engine.current || flat || failed) return;
    let cancelled = false;
    engine.current.update(JSON.parse(serialized), proposed, focus).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [serialized, proposed, focus, ready, flat, failed]);
  return <div className={`${styles.room} ${presentation ? styles.presentation : ""}`}>
    {!presentation && <div className={styles.heading}><span>{props.title ?? (proposed ? "Proposed improvement · not installed" : flat || failed ? "Your room in 2D" : "Your room in 3D")}</span><button type="button" onClick={() => { if (failed) { setFailed(false); setFlat(false); } else setFlat(!flat); setReady(false); }}>{flat || failed ? "Show 3D" : "Show 2D"}</button></div>}
    {flat || failed ? <><FlatRoom {...props} />{failed && <p role="status">3D is unavailable on this device. Your room is shown in 2D.</p>}</> : <>
      <div className={styles.viewport}>
        {coolingStory && showStory && <CoolingStory stage={storyStage} />}
        <canvas ref={canvas} className={styles.canvas} aria-label={presentation ? "Illustrative 3D bedroom" : "Interactive bedroom built from your answers. Use the rotation buttons or drag to rotate."} />
        {!presentation && <div ref={labelLayer} className={styles.labelLayer} />}
      </div>
      {!presentation && <div className={styles.controls}><button type="button" aria-label="Rotate room left" onClick={() => engine.current?.turn(-Math.PI / 4)}>↶</button><span>Drag to rotate · scroll to zoom</span><button type="button" aria-label="Rotate room right" onClick={() => engine.current?.turn(Math.PI / 4)}>↷</button><button type="button" onClick={() => engine.current?.reset()}>Reset view</button></div>}
      {!presentation && <div className={styles.controls}><button type="button" aria-pressed={airflow} onClick={() => setAirflow(!airflow)}>{airflow ? 'Hide airflow preview' : 'Show airflow preview'}</button></div>}
      {!presentation && airflow && <p className={styles.caption} role="status">{layout.equipment.length ? 'Blue: AC · teal: fan. Assumes equipment is on; stream direction and speed are illustrative. Paths do not account for furniture or wall collisions. This is not a physical airflow or temperature simulation.' : 'No cooling equipment has a confirmed placement yet. Add its type and location to preview airflow.'} Window airflow is not modelled.</p>}
    </>}
    {!presentation && <p className={styles.caption}>{scene.above === "roof" ? "Roof above" : scene.above === "another-room" ? "Another room above" : scene.above === "another-dwelling" ? "Another dwelling above" : "Above room unconfirmed"} · ceiling removed for viewing. Compass sides guide placement; dimensions, spacing and furniture are illustrative.</p>}
    {!presentation && showDetails && <details className={styles.details}><summary>Room placement & unconfirmed details</summary><ul>{layout.reported.map(t => <li key={t}>{t}</li>)}{layout.notes.map(t => <li key={t}>{t}</li>)}</ul></details>}
  </div>;
}

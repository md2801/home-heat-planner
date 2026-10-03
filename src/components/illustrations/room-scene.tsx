import { useId, type CSSProperties } from "react";
import type { RoomScene as Scene } from "../../contracts/room-scene";
import { windowSlots } from "../../features/room-scene/model";
import { Annotation, Bed, BedroomDecor, CoolingEquipment, Roof, RoomShell, Window } from "./room-parts";
import type { SceneFocus } from "../../features/room-scene/assessment-scene";
import type { EquipmentPlacement } from "../../features/room-scene/equipment-details";

export function RoomScene({ scene, proposed = false, focus = "none", placement }: { scene: Scene; proposed?: boolean; focus?: SceneFocus; placement?: EquipmentPlacement }) {
  const id = useId();
  const slots = windowSlots(scene.windows?.length ?? 0);
  const paints = Object.fromEntries(["timber", "plaster", "roof", "linen", "throw", "glass", "ground"].map(name => [`--scene-${name}`, `url(#${id}-${name})`])) as CSSProperties;
  return <svg style={paints} viewBox={scene.above === "roof" ? "0 0 760 550" : "0 125 760 425"} role="img" aria-labelledby={`${id}-title ${id}-desc`} xmlns="http://www.w3.org/2000/svg">
    <title id={`${id}-title`}>{proposed ? "Proposed external shading" : "Your bedroom schematic"}</title>
    <desc id={`${id}-desc`}>Not to scale. Objects are arranged schematically. Compass labels describe reported window and AC wall directions. Furniture, material finishes and room layout are illustrative. Equipment labels reflect reported details; unknown positions remain unconfirmed. No thermal simulation.</desc>
    <defs>
      <linearGradient id={`${id}-timber`}><stop stopColor="#cdb591" /><stop offset=".35" stopColor="#f1e4cc" /><stop offset=".8" stopColor="#e6d4b5" /><stop offset="1" stopColor="#c4ad88" /></linearGradient>
      <linearGradient id={`${id}-plaster`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#eae5db" /><stop offset=".5" stopColor="#fffcf4" /><stop offset="1" stopColor="#f4e8d2" /></linearGradient>
      <linearGradient id={`${id}-roof`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f4e8d4" /><stop offset="1" stopColor="#ddc7a6" /></linearGradient>
      <linearGradient id={`${id}-linen`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fffefb" /><stop offset=".6" stopColor="#faf6ec" /><stop offset="1" stopColor="#ddd6c7" /></linearGradient>
      <linearGradient id={`${id}-throw`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#d59872" /><stop offset="1" stopColor="#af6948" /></linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e4f0ef" /><stop offset="1" stopColor="#c7d9d7" /></linearGradient>
      <radialGradient id={`${id}-ground`}><stop stopColor="#a9b294" stopOpacity=".25" /><stop offset="1" stopColor="#a9b294" stopOpacity="0" /></radialGradient>
    </defs>
    <RoomShell />
    {focus !== "none" && <rect x={focus === "room" ? 88 : 105} y={focus === "roof" ? (scene.above === "roof" ? 40 : 163) : focus === "windows" ? 241 : 195} width={focus === "room" ? 590 : 550} height={focus === "roof" ? (scene.above === "roof" ? 163 : 40) : focus === "windows" ? 144 : focus === "cooling" ? 290 : 291} rx="8" fill="#f4d9a1" fillOpacity=".16" stroke="#be8732" strokeWidth="2" strokeDasharray="6 5" aria-hidden="true" />}
    {scene.above !== "unknown" && <Roof above={scene.above} />}
    {scene.windows?.map((w, index) => slots[index] ? <Window key={index} {...slots[index]} window={w} number={index + 1} proposed={proposed} /> : null)}
    <BedroomDecor />
    {scene.bed !== "absent" && <Bed />}
    {scene.equipment?.map(kind => <CoolingEquipment key={kind} kind={kind} {...(placement ? { placement } : {})} />)}
    <Annotation text={proposed ? "Dashed awnings = proposed change, not installed" : "Schematic · not to scale · positions illustrative"} />
  </svg>;
}

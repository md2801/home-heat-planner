import type { RoomScene, SceneWindow } from "../../contracts/room-scene";
import type { EquipmentPlacement } from "../../features/room-scene/equipment-details";

/** Architectural cutaway; all geometry and material finishes are illustrative. */
export function Wall() {
  return <g stroke="#55584e" strokeWidth="1.1">
    <path d="M114 196H647V481H114Z" fill="var(--scene-timber)" />
    <path d="M131 202H630V466H131Z" fill="var(--scene-plaster)" />
    <path d="M132 203H629L240 465H132Z" fill="#fffefa" opacity=".55" stroke="none" />
    <path d="M133 205H627V216H133Z" fill="#807458" opacity=".06" stroke="none" />
    <path d="M119 200V477M124 200V477M635 200V477M642 200V477" stroke="#b09c7a" strokeWidth=".6" />
    <path d="M131 456H630V466H131Z" fill="#f1e8d8" stroke="#c1b7a4" strokeWidth=".65" />
  </g>;
}
export function RoomShell() {
  return <g>
    <ellipse cx="380" cy="487" rx="325" ry="13" fill="var(--scene-ground)" />
    <g stroke="#9ba588" strokeWidth=".8" opacity=".25"><path d="M80 480L73 464M83 480L89 458M89 480L98 471M672 482L666 463M678 482L685 466M698 483L706 471" /></g>
    <Wall />
    <path d="M131 466H630L647 481H114Z" fill="var(--scene-timber)" stroke="#7e7967" strokeWidth=".9" />
    <path d="M114 481H647V488H114Z" fill="#c4ad89" stroke="#41483e" strokeWidth="1.2" />
    <g stroke="#b8a384" strokeWidth=".65"><path d="M121 472H636M117 478H643M207 467L201 481M297 467L293 481M389 467V481M483 467L488 481M571 467L579 481M122 484H639" /></g>
  </g>;
}
export function Roof({ above }: { above: Exclude<RoomScene["above"], "unknown"> }) {
  return <g strokeLinejoin="round">
    {above === "roof" ? <>
      <path d="M89 198L380 45L671 198Z" fill="var(--scene-roof)" stroke="#303b36" strokeWidth="1.7" />
      <g fill="none" stroke="#b9a381" strokeWidth=".65" opacity=".7"><path d="M109 195L380 60L650 195M136 195L380 74L624 195M162 195L380 88L598 195M188 195L380 102L572 195M380 60V102" /></g>
      <path d="M92 201H669" stroke="#b6a17f" strokeWidth="2" />
    </> : <><path d="M105 187H656V201H105Z" fill="var(--scene-timber)" stroke="#555c50" strokeWidth="1.2" /><path d="M110 192H651" stroke="#fff8e7" strokeWidth="2" /></>}
    <text x="380" y={above === "roof" ? 25 : 169} textAnchor="middle" fill="#5b655b" fontSize="13">{above === "roof" ? "Roof above · shape illustrated" : above === "another-dwelling" ? "Another dwelling above" : "Another room above"}</text>
  </g>;
}
export function Bed() {
  return <g stroke="#80725d" strokeWidth="1">
    <ellipse cx="295" cy="467" rx="146" ry="9" fill="#c9bda4" opacity=".25" stroke="none" />
    <rect x="159" y="382" width="17" height="82" rx="4" fill="var(--scene-timber)" />
    <path d="M176 428H408V458H176Z" fill="#b59973" />
    <rect x="176" y="413" width="233" height="33" rx="7" fill="var(--scene-linen)" />
    <rect x="187" y="400" width="72" height="21" rx="11" fill="var(--scene-linen)" />
    <path d="M277 413H402Q410 413 410 422V446H277Z" fill="var(--scene-throw)" />
    <path d="M288 416V442M298 416V442" stroke="#d0a888" />
    <path d="M181 458V469M399 458V469" strokeWidth="5" />
  </g>;
}
export function BedroomDecor() {
  return <g aria-hidden="true" stroke="#9b8b71" strokeWidth="1.5">
    <path d="M437 436L541 436L553 466H426Z" fill="#e7ddc8" stroke="none" />
    <path d="M449 443H531M446 450H535M442 458H539" stroke="#d0c6ae" />
    <rect x="590" y="413" width="43" height="59" rx="2" fill="var(--scene-timber)" />
    <path d="M591 433H632M591 454H632" /><circle cx="612" cy="423" r="1.5" /><circle cx="612" cy="443" r="1.5" />
    <g transform="translate(245 175) scale(.6)"><path d="M601 382H624L620 396H605Z" fill="#d8c7aa" />
    <path d="M613 383V351M613 373Q592 371 596 357Q611 357 613 373M613 365Q629 364 628 349Q613 350 613 365M613 381Q634 380 630 368Q614 368 613 381" fill="#a8b392" stroke="#7e916b" /></g>
  </g>;
}
export function Shade({ x, y, width, proposed = false }: { x: number; y: number; width: number; proposed?: boolean }) {
  return <g stroke={proposed ? "#b17d29" : "#476358"} strokeWidth="1" strokeDasharray={proposed ? "5 3" : undefined}><path d={`M${x - 8} ${y - 10}h${width + 16}l12 19H${x - 20}Z`} fill={proposed ? "#f4dbab" : "#c4d3d1"} /><path d={`M${x - 8} ${y + 9}v10m${width + 16} -10v10`} /></g>;
}
export function Window({ x, y, width, height, window, proposed, number }: { x: number; y: number; width: number; height: number; window: SceneWindow; proposed: boolean; number: number }) {
  return <g>
    <title>{`Window ${number}: ${window.direction === "unknown" ? "direction not known" : window.direction}`}</title>
    <rect x={x - 5} y={y - 5} width={width + 10} height={height + 10} fill="#f8f5e9" stroke="#a3a48f" strokeWidth=".8" />
    <path d={`M${x - 5} ${y + height + 5}h${width + 14}l-4 4H${x - 5}Z`} fill="#d4ccba" stroke="#9c9c87" strokeWidth=".6" />
    <rect x={x} y={y} width={width} height={height} fill="var(--scene-glass)" stroke="#70888a" strokeWidth="1.2" />
    <path d={`M${x + width / 2} ${y}v${height}M${x} ${y + height / 2}h${width}`} stroke="#97afb0" strokeWidth=".8" />
    <path d={`M${x + 3} ${y + 3}h${width - 6}L${x + 3} ${y + height - 3}Z`} fill="#ffffff" opacity=".33" />
    {window.covering === "curtains" && <g fill="var(--scene-timber)" stroke="#ae987a" strokeWidth=".7"><path d={`M${x} ${y}h19l-7 ${height}H${x}Z`} /><path d={`M${x + width} ${y}h-19l7 ${height}h12Z`} /></g>}
    {window.covering === "blinds" && <g stroke="#9f927c" strokeWidth="4">{[12, 23, 34, 45].map(d => <path key={d} d={`M${x + 3} ${y + d}h${width - 6}`} />)}</g>}
    {window.covering === "shutters" && <g stroke="#8a927a" strokeWidth="4">{[12, 27, 42, 57, 72, 87].map(d => <path key={d} d={`M${x + 4} ${y + d}h${width - 8}`} />)}</g>}
    {window.shade === "awning" && <Shade x={x} y={y} width={width} proposed={proposed} />}
    {window.shade === "present-unspecified" && <g><path d={`M${x - 5} ${y - 12}h${width + 10}`} stroke="#517561" strokeWidth="5" /><text x={x + width / 2} y={y - 24} textAnchor="middle" fill="#445447" fontSize="12">Shade present</text></g>}
    <text x={x + width / 2} y={y + height + 15} textAnchor="middle" fill="#445447" fontSize="11">{`Window ${number} · ${window.direction === "unknown" ? "?" : window.direction}`}</text>
  </g>;
}
export function CoolingEquipment({ kind, placement }: { kind: NonNullable<RoomScene["equipment"]>[number]; placement?: EquipmentPlacement }) {
  if (kind === "ac-unspecified" && placement?.acType === "portable") return <g stroke="#637478" strokeWidth="1" fill="var(--scene-linen)"><title>Portable air conditioner · position schematic</title><rect x="510" y="390" width="40" height="77" rx="5" /><path d="M519 405H541M519 411H541M519 417H541M550 429Q572 429 577 398" fill="none" /><text x="530" y="484" textAnchor="middle" fontSize="11" fill="#445447" stroke="none">Portable AC</text></g>;
  if (kind === "ac-unspecified" && placement?.acType === "ducted") return <g stroke="#637478" strokeWidth="1" fill="var(--scene-linen)"><title>Ducted cooling · ceiling vent placement schematic</title><rect x="310" y="210" width="80" height="18" rx="2" /><path d="M319 215H381M319 219H381M319 223H381" /><text x="350" y="244" textAnchor="middle" fontSize="11" fill="#445447" stroke="none">Ducted ceiling vent</text></g>;
  if (kind === "ac-unspecified" && placement?.acType === "window-mounted") return <g stroke="#637478" strokeWidth="1" fill="var(--scene-linen)"><title>Window or wall AC unit · {placement.acWall ?? "wall direction unknown"}</title><rect x="158" y="233" width="85" height="45" rx="3" /><path d="M168 244H218M168 251H218M168 258H218M227 240V266" /><text x="201" y="295" textAnchor="middle" fontSize="11" fill="#445447" stroke="none">Window/wall AC · {placement.acWall ?? "wall ?"}</text></g>;
  if (kind === "split-ac" || kind === "ac-unspecified") return <g><WallAirConditioner kind={kind} /><text x="215" y="261" textAnchor="middle" fontSize="11" fill="#445447">{placement?.acType === "other" ? "AC · another type" : "AC"} · {placement?.acWall ? `${placement.acWall} wall` : "wall unknown"}</text></g>;
  if (kind === "ceiling-fan") return <g stroke="#617467" strokeWidth="3" fill="#d9e0d2"><title>Ceiling fan · position schematic</title><path d="M440 195V216M440 216L385 225L393 217ZM440 216L493 210L482 219ZM440 216L449 241L437 238Z" /><circle cx="440" cy="217" r="5" /></g>;
  const x = placement?.fanPosition === "beside-bed" ? 145 : placement?.fanPosition === "foot-of-bed" ? 447 : placement?.fanPosition === "near-window" ? 565 : placement?.fanPosition === "near-door" ? 632 : 565;
  const position = placement?.fanPosition ? ({ "beside-bed": "Beside bed", "foot-of-bed": "Foot of bed", "near-window": "Near window", "near-door": "Near door", elsewhere: "Elsewhere" })[placement.fanPosition] : "Position unknown";
  return <g transform={`translate(${x - 565} 0)`} stroke="#788477" strokeWidth="1.3" fill="none"><title>{kind === "fan-unspecified" ? "Fan type unknown" : "Portable fan"} · {position} · placement schematic</title><circle cx="565" cy="409" r="22" /><path d="M565 431V461M546 464H584M565 409L553 395M565 409L580 408M565 409L561 425" /><circle cx="565" cy="409" r="4" fill="#617467" /><text x="565" y="484" textAnchor="middle" fontSize="11" fill="#445447" stroke="none">{position}</text></g>;
}
function WallAirConditioner({ kind }: { kind: "split-ac" | "ac-unspecified" }) {
  return <g transform="translate(0 -10)" stroke="#637478" strokeWidth="1"><title>{kind === "ac-unspecified" ? "Air conditioning · unit shape illustrative, type unknown" : "Split-system air conditioner"}</title><rect x="158" y="217" width="114" height="35" rx="5" fill="var(--scene-linen)" /><path d="M168 241H262M170 245H260M206 228H224" stroke="#a5b2b2" strokeWidth=".8" /><path d="M164 250H266" stroke="#687b7d" strokeWidth=".7" /></g>;
}
export function Annotation({ text }: { text: string }) {
  return <text x="380" y="520" textAnchor="middle" fill="#667266" fontSize="14">{text}</text>;
}

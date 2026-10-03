import * as T from "three";
import type { SceneFocus } from "./assessment-scene";
import { wallPoint, type Point, type Wall } from "./room-layout";
import { placeRoomLabel, type LabelRect } from "./room-label-layout";
import styles from "./dynamic-room.module.css";

type LabelKind = "compass" | "windows" | "cooling";
interface RoomLabel {
  text: HTMLSpanElement;
  line: SVGPolylineElement;
  dot: SVGCircleElement;
  anchor: T.Vector3;
  wall?: Wall;
  kind: LabelKind;
}
const svgNamespace = "http://www.w3.org/2000/svg";
/** Screen-space annotations stay upright and retain the same readable size at every zoom. */
export function createRoomLabels(layer: HTMLDivElement) {
  const svg = document.createElementNS(svgNamespace, "svg");
  svg.setAttribute("class", styles.labelLeaders ?? ""); svg.setAttribute("aria-hidden", "true"); layer.append(svg);
  const labels: RoomLabel[] = [];
  let focus: SceneFocus = "none";
  const clear = () => { labels.splice(0).forEach(label => label.text.remove()); svg.replaceChildren(); };
  const add = (text: string, point: Point, kind: LabelKind, wall?: Wall) => {
    const element = document.createElement("span"); element.className = styles.modelLabel ?? ""; element.textContent = text;
    element.dataset.kind = kind; layer.append(element);
    const line = document.createElementNS(svgNamespace, "polyline"), dot = document.createElementNS(svgNamespace, "circle");
    dot.setAttribute("r", "2.5"); svg.append(line, dot);
    labels.push({ text: element, line, dot, anchor: new T.Vector3(...point), kind, ...(wall ? { wall } : {}) });
  };
  const render = (camera: T.Camera, width: number, height: number, visible: Wall[], bedBounds?: T.Box3) => {
    if (!width || !height) return;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const project = (point: T.Vector3) => { const p = point.clone().project(camera); return { x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2, z: p.z }; };
    const center = project(new T.Vector3(0, 1.2, 0));
    const occupied: LabelRect[] = [];
    if (bedBounds) {
      const corners = [bedBounds.min.x, bedBounds.max.x].flatMap(x => [bedBounds.min.y, bedBounds.max.y].flatMap(y => [bedBounds.min.z, bedBounds.max.z].map(z => project(new T.Vector3(x, y, z)))));
      const xs = corners.map(p => p.x), ys = corners.map(p => p.y);
      occupied.push({ x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) });
    }
    // Compass bearings always get space first; the current question's objects follow.
    const ordered = [...labels].sort((a, b) => (a.kind === "compass" ? 0 : a.kind === focus ? 1 : 2) - (b.kind === "compass" ? 0 : b.kind === focus ? 1 : 2));
    for (const label of ordered) {
      const point = label.kind === "compass" && label.wall ? new T.Vector3(...wallPoint(label.wall, 0, visible.includes(label.wall) ? 2.8 : .05)) : label.anchor;
      const anchor = project(point);
      const onWall = label.kind === "compass" || !label.wall || visible.includes(label.wall);
      const active = label.kind === focus;
      label.text.dataset.active = String(active);
      const faded = focus !== "none" && label.kind !== "compass" && !active;
      const opacity = faded ? ".72" : "1";
      const size = { width: label.text.offsetWidth, height: label.text.offsetHeight };
      const rect = onWall && anchor.z > -1 && anchor.z < 1 && anchor.x >= 0 && anchor.x <= width && anchor.y >= 0 && anchor.y <= height
        ? placeRoomLabel(anchor, size, { width, height }, occupied, { x: anchor.x - center.x, y: anchor.y - center.y }) : null;
      label.text.style.visibility = rect ? "visible" : "hidden";
      label.line.style.visibility = label.dot.style.visibility = rect ? "visible" : "hidden";
      if (!rect) continue;
      occupied.push(rect);
      label.text.style.transform = `translate(${rect.x}px, ${rect.y}px)`;
      label.text.style.opacity = label.line.style.opacity = label.dot.style.opacity = opacity;
      const endX = Math.max(rect.x, Math.min(rect.x + rect.width, anchor.x)), endY = Math.max(rect.y, Math.min(rect.y + rect.height, anchor.y));
      label.line.setAttribute("points", `${anchor.x},${anchor.y} ${endX},${endY}`);
      label.dot.setAttribute("cx", String(anchor.x)); label.dot.setAttribute("cy", String(anchor.y));
    }
  };
  return { add, render, clear, setFocus: (value: SceneFocus) => { focus = value; }, dispose: () => { clear(); svg.remove(); } };
}

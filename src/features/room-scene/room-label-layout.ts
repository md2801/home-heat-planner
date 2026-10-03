export interface LabelRect { x: number; y: number; width: number; height: number }
export interface LabelPoint { x: number; y: number }
export function overlaps(a: LabelRect, b: LabelRect, gap = 6): boolean {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}
/** Search outward from the preferred anchor, keeping text inside the view and clear of earlier labels. */
export function placeRoomLabel(anchor: LabelPoint, size: { width: number; height: number }, view: { width: number; height: number }, occupied: LabelRect[], direction: LabelPoint): LabelRect | null {
  const margin = 8;
  if (size.width + margin * 2 > view.width || size.height + margin * 2 > view.height) return null;
  const length = Math.hypot(direction.x, direction.y) || 1;
  const dx = direction.x / length, dy = direction.y / length;
  for (const distance of [38, 62, 90, 120, 155]) {
    for (const slide of [0, -36, 36, -72, 72, -108, 108, -144, 144, -180, 180, -216, 216]) {
      const rect = {
        x: Math.max(margin, Math.min(view.width - size.width - margin, anchor.x + dx * distance - dy * slide - size.width / 2)),
        y: Math.max(margin, Math.min(view.height - size.height - margin, anchor.y + dy * distance + dx * slide - size.height / 2)),
        ...size,
      };
      if (!occupied.some(other => overlaps(rect, other))) return rect;
    }
  }
  return null;
}

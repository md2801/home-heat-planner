import * as T from 'three';
import { wallPoint, wallRotation, type RoomLayout } from './room-layout';

/** Illustrative paths only: not a velocity field, CFD, or a thermal calculation. */
export function createAirflowPreview(layout: RoomLayout, source: 'equipment' | 'open-windows' = 'equipment') {
  const group = new T.Group();
  const geometries: T.BufferGeometry[] = [], materials: T.Material[] = [];
  const moving: { object: T.Mesh; curve: T.CatmullRomCurve3; phase: number }[] = [];
  const dotGeometry = new T.SphereGeometry(.028, 6, 5); geometries.push(dotGeometry);
  // Window streams are opt-in for the homepage's explicitly open-window illustration only.
  const sources = source === 'open-windows' ? layout.windows.map(window => ({
    id: window.id, asset: 'open-window', wall: window.wall,
    position: wallPoint(window.wall, window.offset, .86 + .67 * window.scale, -.2),
    rotation: wallRotation[window.wall],
  })) : layout.equipment;
  for (const equipment of sources) {
    const ac = equipment.id === 'ac';
    const window = equipment.asset === 'open-window';
    const color = window ? '#69b9c3' : ac ? '#499ac7' : '#42a991';
    const vertical = equipment.id === 'ceiling-fan' || equipment.asset === 'vent';
    const origin = new T.Vector3(...equipment.position);
    if (equipment.id === 'portable-fan') origin.y += 1.05;
    const forward = vertical ? new T.Vector3(0, -1, 0)
      : equipment.wall ? new T.Vector3(Math.sin(equipment.rotation), window ? 0 : -.25, Math.cos(equipment.rotation)).normalize()
      : new T.Vector3(-origin.x, 0, -origin.z).normalize();
    const side = vertical ? new T.Vector3(1, 0, 0) : new T.Vector3(forward.z, 0, -forward.x).normalize();
    const material = new T.MeshBasicMaterial({ color, transparent: true, opacity: .85, depthWrite: false }); materials.push(material);
    for (let lane = -2; lane <= 2; lane++) {
      const start = origin.clone().addScaledVector(side, lane * .09);
      const mid = start.clone().addScaledVector(forward, .85).addScaledVector(side, lane * .12);
      const end = start.clone().addScaledVector(forward, 1.7).addScaledVector(side, lane * .23);
      end.y = Math.max(.35, end.y - (vertical || window ? 0 : .25));
      const curve = new T.CatmullRomCurve3([start, mid, end]);
      const geometry = new T.BufferGeometry().setFromPoints(curve.getPoints(30)); geometries.push(geometry);
      const lineMaterial = new T.LineBasicMaterial({ color, transparent: true, opacity: .20, depthWrite: false }); materials.push(lineMaterial);
      group.add(new T.Line(geometry, lineMaterial));
      for (let dot = 0; dot < 4; dot++) {
        const object = new T.Mesh(dotGeometry, material); group.add(object);
        moving.push({ object, curve, phase: dot / 4 + (lane + 2) * .035 });
      }
    }
  }
  return { group, animate(seconds: number) { for (const p of moving) p.object.position.copy(p.curve.getPoint((seconds * .22 + p.phase) % 1)); },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); } };
}

import * as T from 'three';

/** Homepage illustration: hinged casements and schematic solar rays, not heat simulation. */
export function createWindowStoryEffects(windowModel: T.Group) {
  const geometries: T.BufferGeometry[] = [], materials: T.Material[] = [];
  windowModel.traverse(node => {
    const name = node.name.replaceAll('_', ' ');
    if (/^(Glass|Mullion|Crossbar|Window latch)/.test(name)) node.visible = false;
  });
  const wood = new T.MeshStandardMaterial({ color: '#cfb58e', roughness: .8 });
  const glass = new T.MeshStandardMaterial({ color: '#c3dede', transparent: true, opacity: .23, roughness: .15, depthWrite: false });
  const metal = new T.MeshStandardMaterial({ color: '#647365', roughness: .5 });
  materials.push(wood, glass, metal);
  function box(parent: T.Object3D, size: [number, number, number], position: [number, number, number], material: T.Material) {
    const geometry = new T.BoxGeometry(...size); geometries.push(geometry);
    const mesh = new T.Mesh(geometry, material); mesh.position.set(...position); mesh.castShadow = material !== glass; parent.add(mesh);
  }
  const hinges: { group: T.Group; sign: number }[] = [];
  for (const sign of [1, -1]) {
    const hinge = new T.Group(); hinge.position.set(-sign * .53, .14, -.065); windowModel.add(hinge);
    box(hinge, [.49, 1.08, .012], [sign * .265, .55, 0], glass);
    for (const x of [sign * .02, sign * .51]) box(hinge, [.035, 1.12, .055], [x, .55, 0], wood);
    for (const y of [0, .55, 1.1]) box(hinge, [.53, .035, .055], [sign * .265, y, 0], wood);
    box(hinge, [.02, .12, .04], [sign * .46, .53, .04], metal);
    hinges.push({ group: hinge, sign });
  }
  const rays = new T.Group(); windowModel.add(rays);
  const rayMaterial = new T.LineBasicMaterial({ color: '#ef982b', transparent: true, opacity: .65, depthWrite: false });
  const particleMaterial = new T.MeshBasicMaterial({ color: '#ef982b', transparent: true, opacity: .9, depthWrite: false });
  materials.push(rayMaterial, particleMaterial);
  const particleGeometry = new T.SphereGeometry(.025, 6, 5); geometries.push(particleGeometry);
  const streams = [-.32, 0, .32].map(x => {
    const start = new T.Vector3(x, 2.2, -1.05);
    const stop = new T.Vector3(x, 1.6, -.5);
    const end = start.clone().lerp(stop, 3.0);
    const geometry = new T.BufferGeometry().setFromPoints([start, end]); geometries.push(geometry);
    rays.add(new T.Line(geometry, rayMaterial));
    const particles = Array.from({ length: 4 }, () => { const mesh = new T.Mesh(particleGeometry, particleMaterial); rays.add(mesh); return mesh; });
    return { start, stop, end, geometry, particles };
  });
  return {
    update(open: number, shaded: number, time: number) {
      for (const hinge of hinges) hinge.group.rotation.y = hinge.sign * open * Math.PI * .38;
      rays.visible = open < .99;
      rayMaterial.opacity = .65 * (1 - open); particleMaterial.opacity = .9 * (1 - open);
      for (const stream of streams) {
        const end = stream.end.clone().lerp(stream.stop, shaded);
        const positions = stream.geometry.getAttribute('position'); positions.setXYZ(1, end.x, end.y, end.z); positions.needsUpdate = true;
        stream.geometry.computeBoundingSphere();
        stream.particles.forEach((particle, index) => particle.position.lerpVectors(stream.start, end, (time * .3 + index / 4) % 1));
      }
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}

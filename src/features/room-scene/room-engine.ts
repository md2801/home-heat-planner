import type { SceneFocus } from "./assessment-scene";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { visibleWalls, wallPoint, wallRotation, wallWidths, type RoomLayout, type Wall } from "./room-layout";
import { createRoomLabels } from "./room-labels";
import { createWindowStoryEffects } from "./window-story-effects";
import { createAirflowPreview } from "./airflow-preview";
export interface RoomEngine { update(layout: RoomLayout, proposed: boolean, focus?: SceneFocus): Promise<void>; airflow(enabled: boolean): void; reset(): void; turn(amount: number): void; dispose(): void }
/** Browser-only renderer. No assessment writes or financial calculations. */
export function createRoomEngine(canvas: HTMLCanvasElement, onFailure: () => void, labelLayer: HTMLDivElement | null, presentation = false, onStory?: (stage: number) => void): RoomEngine {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(36, 1, .1, 60), loader = new GLTFLoader();
  scene.add(new T.HemisphereLight("#fff8e9", "#bcb8a5", 1.7));
  const sun = new T.DirectionalLight("#fff0d9", 3); sun.position.set(-4, 8, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: .1, far: 25 }); sun.shadow.normalBias = .018; scene.add(sun);
  const fill = new T.DirectionalLight("#e4efff", 1.1); fill.position.set(4, 3, 3); scene.add(fill);
  const templates = new Map<string, Promise<T.Group>>(); const loaded: T.Group[] = [];
  let disposed = false, revision = 0, root = new T.Group(), theta = .65, phi = 1.1, zoom = 1, drag = false, px = 0, py = 0;
  const annotations = labelLayer ? createRoomLabels(labelLayer) : null;
  let storyAngle = 0, storyStage = -1, passiveBlend = 0, windowBlend = 0;
  const storyWindowWalls = new Set<Wall>();
  let fadeMaterials = new WeakMap<T.Object3D, { material: T.Material; opacity: number; transparent: boolean; depthWrite: boolean }[]>();
  const storyAc: T.Object3D[] = [], storyShades: T.Object3D[] = [];
  const windowEffects: ReturnType<typeof createWindowStoryEffects>[] = [];
  let windowAirflow: ReturnType<typeof createAirflowPreview> | undefined;
  let passiveAirflow: ReturnType<typeof createAirflowPreview> | undefined;
  let bedBounds: T.Box3 | undefined;
  let airflow: ReturnType<typeof createAirflowPreview> | undefined, showAirflow = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ownGeometries: T.BufferGeometry[] = [], ownMaterials: T.Material[] = [];
  const releaseOwned = () => { ownGeometries.splice(0).forEach(g => g.dispose()); ownMaterials.splice(0).forEach(m => m.dispose()); };
  function fade(object: T.Object3D, opacity: number) {
    let entries = fadeMaterials.get(object);
    if (!entries) {
      entries = [];
      object.traverse(node => {
        if (!(node instanceof T.Mesh || node instanceof T.Line)) return;
        const clone = (source: T.Material) => {
          const material = source.clone(); ownMaterials.push(material);
          entries!.push({ material, opacity: source.opacity, transparent: source.transparent, depthWrite: source.depthWrite });
          return material;
        };
        node.material = Array.isArray(node.material) ? node.material.map(clone) : clone(node.material);
      });
      fadeMaterials.set(object, entries);
    }
    object.visible = opacity > .001;
    for (const entry of entries) {
      entry.material.opacity = entry.opacity * opacity;
      entry.material.transparent = opacity < .999 || entry.transparent;
      entry.material.depthWrite = opacity < .999 ? false : entry.depthWrite;
    }
  }
  function releaseTemplate(group: T.Group) { group.traverse(o => { if (o instanceof T.Mesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } }); }
  function asset(id: string) {
    let pending = templates.get(id);
    if (!pending) { pending = loader.loadAsync(`/models/room/${id}.glb`).then(gltf => { if (disposed) releaseTemplate(gltf.scene); else loaded.push(gltf.scene); return gltf.scene; }); templates.set(id, pending); }
    return pending;
  }
  function cube(parent: T.Object3D, name: string, w: number, h: number, d: number, color: string, position: [number, number, number]) {
    const geometry = new T.BoxGeometry(w, h, d), material = new T.MeshStandardMaterial({ color, roughness: .85 });
    ownGeometries.push(geometry); ownMaterials.push(material); const m = new T.Mesh(geometry, material); m.name = name; m.position.set(...position); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  async function update(layout: RoomLayout, proposed: boolean, focus: SceneFocus = "none") {
    const current = ++revision;
    const ids = new Set([...(layout.bed ? ["bed", "rug", "nightstand", "lamp"] : []), ...layout.equipment.map(e => e.asset)]);
    layout.windows.forEach(w => { ids.add(["curtains", "blinds", "shutters"].includes(w.covering) ? w.covering : "window"); if (w.shade === "awning") ids.add("awning"); });
    if (onStory) ids.add("awning");
    await Promise.all([...ids].map(asset)); if (disposed || current !== revision) return;
    airflow?.dispose(); airflow = undefined; passiveAirflow?.dispose(); passiveAirflow = undefined; windowAirflow?.dispose(); windowAirflow = undefined;
    storyAc.length = 0; storyShades.length = 0; windowEffects.splice(0).forEach(effect => effect.dispose());
    storyWindowWalls.clear();
    if (onStory) layout.windows.forEach(window => storyWindowWalls.add(window.wall));
    scene.remove(root); releaseOwned(); fadeMaterials = new WeakMap(); annotations?.clear(); annotations?.setFocus(focus); bedBounds = undefined; root = new T.Group(); scene.add(root);
    const clone = async (id: string) => (await asset(id)).clone(true);
    // All awaited loads above have finished. A stale update cannot attach to a newer root.
    const models = new Map<string, T.Group>(); for (const id of ids) models.set(id, await clone(id));
    if (disposed || current !== revision) return;
    const place = (id: string, parent: T.Object3D, position: [number, number, number], rotation = 0, scale = 1) => {
      const model = models.get(id)!.clone(true); model.position.set(...position); model.rotation.y = rotation; model.scale.setScalar(scale);
      model.traverse(o => { if (o instanceof T.Mesh) { o.castShadow = true; o.receiveShadow = true; } }); parent.add(model); return model;
    };
    // Wall-local +Z faces indoors. After the awning's 180° turn, its minimum
    // asset Z becomes its innermost point; keep that point beyond the outer face.
    const awningMinZ = models.has("awning") ? new T.Box3().setFromObject(models.get("awning")!).min.z : 0;
    const awningOffset = (scale: number) => -.06 - .005 + awningMinZ * scale;
    cube(root, "Foundation", 4.6, .12, 4.3, "#cfb58e", [0, -.06, 0]);
    for (let i = 0; i < 18; i++) cube(root, "Floor board", .246, .03, 4.20, i % 3 ? "#d7c2a0" : "#d0b894", [-2.125 + i * .25, .015, 0]);
    const walls = {} as Record<Wall, T.Group>;
    for (const side of ["north", "east", "south", "west"] as const) {
      const wall = new T.Group(); wall.name = `${side} wall`; wall.userData.wall = side; wall.position.set(...wallPoint(side, 0, 0)); wall.rotation.y = wallRotation[side]; root.add(wall); walls[side] = wall;
      const width = wallWidths[side], openings = layout.windows.filter(w => w.wall === side).sort((a, b) => a.offset - b.offset);
      let edge = -width / 2;
      for (const w of openings) {
        const half = .58 * w.scale, left = w.offset - half, right = w.offset + half, bottom = .86, top = bottom + 1.34 * w.scale;
        if (left > edge) cube(wall, "Wall pier", left - edge, 2.8, .12, "#eee8db", [(edge + left) / 2, 1.4, 0]);
        cube(wall, "Wall below window", half * 2, bottom, .12, "#eee8db", [w.offset, bottom / 2, 0]);
        cube(wall, "Wall above window", half * 2, 2.8 - top, .12, "#eee8db", [w.offset, (top + 2.8) / 2, 0]); edge = right;
        const windowModel = place(["curtains", "blinds", "shutters"].includes(w.covering) ? w.covering : "window", wall, [w.offset, bottom, .02], 0, w.scale);
        if (onStory) {
          const shade = place("awning", wall, [w.offset, top, awningOffset(.9 * w.scale)], Math.PI, .9 * w.scale);
          shade.visible = false; storyShades.push(shade);
          windowEffects.push(createWindowStoryEffects(windowModel));
        }
        if (w.shade === "awning") { const awning = place("awning", wall, [w.offset, top, awningOffset(.9 * w.scale)], Math.PI, .9 * w.scale); awning.name = proposed ? "Proposed awning, not installed" : "Reported awning"; }
        const direction = w.direction.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join("-");
        annotations?.add(`${w.id.replace("window-", "Window ")} · ${direction}`, wallPoint(side, w.offset, bottom + .67 * w.scale, .12), "windows", side);
      }
      if (edge < width / 2) cube(wall, "Wall pier", width / 2 - edge, 2.8, .12, "#eee8db", [(width / 2 + edge) / 2, 1.4, 0]);
      cube(wall, "Skirting", width, .09, .04, "#f2eee3", [0, .065, .09]);
      annotations?.add(side.charAt(0).toUpperCase() + side.slice(1), wallPoint(side, 0, .05), "compass", side);
    }
    if (layout.bed) { place("rug", root, [-.4, .04, .3], 0, .85); const bed = place("bed", root, [-.65, .045, .05]); bedBounds = new T.Box3().setFromObject(bed); place("nightstand", root, [.77, .045, -.83]); place("lamp", root, [.77, .64, -.83]); }
    for (const e of layout.equipment) {
      // Placement is in room coordinates; attach to the wall without changing its transform.
      const model = place(e.asset, root, e.position, e.rotation); if (e.asset === "vent") model.rotation.x = Math.PI / 2;
      if (onStory && e.id === "ac") storyAc.push(model);
      if (e.wall && !onStory) { root.updateMatrixWorld(true); walls[e.wall].attach(model); }
      const bearing = e.direction ?? e.wall;
      const direction = bearing?.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join("-");
      const text = e.id === "ceiling-fan" ? "Ceiling fan" : e.id === "portable-fan" ? "Portable fan" : e.asset === "vent" ? "Ducted vent" : `AC${direction ? ` · ${direction}` : ""}`;
      annotations?.add(text, new T.Box3().setFromObject(model).getCenter(new T.Vector3()).toArray() as [number, number, number], "cooling", e.wall);
    }
    root.updateMatrixWorld(true);
    // Focus is conveyed by annotation labels, never visible bounding-box helpers.
    canvas.dataset.roomWindows = String(layout.windows.length); canvas.dataset.roomEquipment = layout.equipment.map(e => e.id).join(",");
    if (onStory) {
      passiveAirflow = createAirflowPreview({ ...layout, equipment: layout.equipment.filter(e => e.id !== 'ac') });
      passiveAirflow.group.visible = false; root.add(passiveAirflow.group);
      windowAirflow = createAirflowPreview(layout, "open-windows");
      windowAirflow.group.visible = false; root.add(windowAirflow.group);
    }
    airflow = createAirflowPreview(layout); airflow.group.visible = showAirflow; root.add(airflow.group);
  }
  const reset = () => { theta = .65; phi = 1.1; zoom = 1; };
  const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  const down = (e: PointerEvent) => { drag = true; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId); };
  const up = () => { drag = false; };
  const move = (e: PointerEvent) => { if (!drag) return; theta -= (e.clientX - px) * .008; phi = Math.max(.18, Math.min(1.48, phi - (e.clientY - py) * .008)); px = e.clientX; py = e.clientY; };
  const wheel = (e: WheelEvent) => { e.preventDefault(); zoom = Math.max(.75, Math.min(1.6, zoom + e.deltaY * .001)); };
  const lost = (e: Event) => { e.preventDefault(); onFailure(); };
  if (!presentation) { canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up); canvas.addEventListener("pointermove", move); canvas.addEventListener("wheel", wheel, { passive: false }); }
  canvas.addEventListener("webglcontextlost", lost);
  let previousFrame: number | undefined;
  renderer.setAnimationLoop((time) => {
    const delta = previousFrame === undefined ? 0 : Math.min((time - previousFrame) / 1000, .05);
    previousFrame = time;
    if (presentation && !reducedMotion.matches && !document.hidden) {
      theta += delta * .16;
      if (airflow) storyAngle = (storyAngle + delta * .16) % (Math.PI * 4);
    }
    if (onStory && airflow) {
      const stage = reducedMotion.matches ? 2 : storyAngle < Math.PI * 2 ? 0 : storyAngle < Math.PI * 3 ? 1 : 2;
      if (stage !== storyStage) { storyStage = stage; onStory(stage); }
      const passive = stage > 0;
      // Camera azimuth is independent of the story: both rooms get a full orbit.
      const step = reducedMotion.matches ? 1 : delta / 1.8;
      const approach = (value: number, target: number) => value + Math.max(-step, Math.min(step, target - value));
      passiveBlend = approach(passiveBlend, passive ? 1 : 0);
      windowBlend = approach(windowBlend, stage === 2 ? 1 : 0);
      const smooth = (value: number) => value * value * (3 - 2 * value);
      const blend = smooth(passiveBlend);
      storyAc.forEach(o => { o.visible = true; });
      storyShades.forEach(o => fade(o, blend));
      windowEffects.forEach(effect => effect.update(smooth(windowBlend), blend, reducedMotion.matches ? 1 : time / 1000));
      fade(airflow.group, showAirflow ? (1 - .55 * blend) * (1 - smooth(windowBlend)) : 0);
      if (passiveAirflow) {
        fade(passiveAirflow.group, showAirflow ? blend * (.55 + .45 * smooth(windowBlend)) : 0);
        passiveAirflow.animate(reducedMotion.matches ? 1 : time / 1000);
      }
      if (windowAirflow) {
        fade(windowAirflow.group, showAirflow ? smooth(windowBlend) : 0);
        windowAirflow.animate(reducedMotion.matches ? 1 : time / 1000);
      }
      canvas.dataset.storyStage = String(stage);
    }
    const r = (presentation ? 10.2 : 8.9) * Math.max(1, .95 / camera.aspect) * zoom;
    camera.position.set(r * Math.sin(phi) * Math.sin(theta), 1.2 + r * Math.cos(phi), r * Math.sin(phi) * Math.cos(theta)); camera.lookAt(0, 1.2, 0);
    if (showAirflow) airflow?.animate(reducedMotion.matches ? 1 : time / 1000);
    const visible = visibleWalls(camera.position.x, camera.position.z);
    // Keep the featured window and its attached improvements visible throughout the second orbit.
    if (onStory && (storyStage > 0 || passiveBlend > .001)) {
      for (const wall of storyWindowWalls) if (!visible.includes(wall)) visible.push(wall);
    }
    root.children.forEach(o => { if (o.userData.wall) o.visible = visible.includes(o.userData.wall as Wall); }); renderer.render(scene, camera);
    annotations?.render(camera, canvas.clientWidth, canvas.clientHeight, visible, bedBounds);
  });
  return { update, airflow(enabled) { showAirflow = enabled; if (airflow) airflow.group.visible = enabled; }, reset, turn: amount => { theta += amount; }, dispose() {
    disposed = true; revision++; renderer.setAnimationLoop(null); observer.disconnect();
    canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("wheel", wheel); canvas.removeEventListener("webglcontextlost", lost);
    windowEffects.forEach(effect => effect.dispose()); windowAirflow?.dispose(); passiveAirflow?.dispose(); airflow?.dispose(); annotations?.dispose(); releaseOwned(); loaded.forEach(releaseTemplate); renderer.dispose(); renderer.forceContextLoss();
  } };
}

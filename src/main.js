// Try a second CDN if the primary module host is unavailable or blocked.
async function loadThreeModule() {
  const sources = [
    'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
    'https://unpkg.com/three@0.160.0/build/three.module.js'
  ];
  let lastError;
  for (const source of sources) {
    try {
      const module = await import(source);
      console.info('[ARENA ZERO] 3D engine loaded:', source);
      return module;
    } catch (error) {
      lastError = error;
      console.warn('[ARENA ZERO] Could not load 3D engine from', source, error);
    }
  }
  throw new Error('The 3D engine could not load from either CDN. Check your internet connection, then reload the game. ' + (lastError?.message || ''));
}
const THREE = await loadThreeModule();

const $ = id => document.getElementById(id);
const root = $('game');

const GRAPHICS_QUALITY_PRESETS = Object.freeze({
  low: {
    label: 'LOW',
    description: 'PERFORMANCE PRIORITY',
    pixelRatio: 1,
    pixelBudget: 3500000,
    mobilePixelRatio: .9,
    mobilePixelBudget: 1600000
  },
  medium: {
    label: 'MEDIUM',
    description: 'BALANCED QUALITY',
    pixelRatio: 1.25,
    pixelBudget: 6000000,
    mobilePixelRatio: 1.05,
    mobilePixelBudget: 2200000
  },
  high: {
    label: 'HIGH',
    description: 'HIGH VISUAL DETAIL',
    pixelRatio: 1.65,
    pixelBudget: 10000000,
    mobilePixelRatio: 1.25,
    mobilePixelBudget: 3000000
  },
  ultra: {
    label: 'ULTRA',
    description: 'MAXIMUM PRACTICAL QUALITY',
    pixelRatio: 2,
    pixelBudget: 14000000,
    mobilePixelRatio: 1.45,
    mobilePixelBudget: 4000000
  }
});

let graphicsQuality = 'high';
try {
  const savedGraphicsSettings = JSON.parse(localStorage.getItem('arena-zero-settings') || '{}');
  if (savedGraphicsSettings && Object.prototype.hasOwnProperty.call(GRAPHICS_QUALITY_PRESETS, savedGraphicsSettings.graphicsQuality)) {
    graphicsQuality = savedGraphicsSettings.graphicsQuality;
  }
} catch (_) {}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070d18);
scene.fog = new THREE.FogExp2(0x070d18, .0155);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, .1, 150);
camera.position.set(0, 12, 29);
camera.lookAt(0, 1, 0);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  depth: true,
  stencil: false,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: false
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
root.appendChild(renderer.domElement);

let activeRenderPixelRatio = 0;
function getGraphicsPixelRatio(width, height) {
  const profile = GRAPHICS_QUALITY_PRESETS[graphicsQuality] || GRAPHICS_QUALITY_PRESETS.high;
  const coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const compactDisplay = coarsePointer || Math.min(width, height) < 560;
  const maxRatio = compactDisplay ? profile.mobilePixelRatio : profile.pixelRatio;
  const pixelBudget = compactDisplay ? profile.mobilePixelBudget : profile.pixelBudget;
  const budgetRatio = Math.sqrt(pixelBudget / Math.max(1, width * height));
  return THREE.MathUtils.clamp(Math.min(maxRatio, budgetRatio), .5, maxRatio);
}

function resizeRenderer() {
  const width = Math.max(1, Math.floor(root.clientWidth || window.innerWidth));
  const height = Math.max(1, Math.floor(root.clientHeight || window.innerHeight));
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  const nextPixelRatio = getGraphicsPixelRatio(width, height);
  if (Math.abs(nextPixelRatio - activeRenderPixelRatio) > .005) {
    renderer.setPixelRatio(nextPixelRatio);
    activeRenderPixelRatio = nextPixelRatio;
  }
  renderer.setSize(width, height, false);

  const qualityNote = $('graphics-quality-note');
  if (qualityNote) {
    qualityNote.textContent = GRAPHICS_QUALITY_PRESETS[graphicsQuality].label +
      ' // ' + Math.round(activeRenderPixelRatio * 100) + '% RENDER SCALE';
  }
}

resizeRenderer();
window.addEventListener('resize', resizeRenderer, { passive: true });
window.visualViewport?.addEventListener('resize', resizeRenderer, { passive: true });
if (typeof ResizeObserver !== 'undefined') {
  const gameResizeObserver = new ResizeObserver(resizeRenderer);
  gameResizeObserver.observe(root);
}

const hemisphereLight = new THREE.HemisphereLight(0x9abfff, 0x101a27, 1.15);
scene.add(hemisphereLight);
const keyLight = new THREE.DirectionalLight(0xc0e5ff, 2.45);
keyLight.position.set(-12, 22, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1536, 1536);
keyLight.shadow.camera.left = -26;
keyLight.shadow.camera.right = 26;
keyLight.shadow.camera.top = 26;
keyLight.shadow.camera.bottom = -26;
keyLight.shadow.camera.near = .5;
keyLight.shadow.camera.far = 64;
keyLight.shadow.camera.updateProjectionMatrix();
keyLight.shadow.bias = -.00012;
keyLight.shadow.normalBias = .02;
keyLight.shadow.radius = 3;
scene.add(keyLight);

// Non-shadow-casting fill lights preserve shape readability without multiplying shadow-map cost.
const rimLight = new THREE.DirectionalLight(0x4c7cff, .95);
rimLight.position.set(14, 10, -18);
scene.add(rimLight);
const frontFillLight = new THREE.DirectionalLight(0x8bb8df, .38);
frontFillLight.position.set(0, 11, 20);
scene.add(frontFillLight);
const cyanLight = new THREE.PointLight(0x16cde8, 29, 40);
cyanLight.position.set(0, 6, 0);
scene.add(cyanLight);
const orangeLight = new THREE.PointLight(0xff653d, 18, 34);
orangeLight.position.set(-18, 5, -15);
scene.add(orangeLight);
const perimeterAccentLight = new THREE.PointLight(0x269bc8, 7, 23);
perimeterAccentLight.position.set(18, 3.8, 16);
scene.add(perimeterAccentLight);

const mat = (color, roughness = .7, metalness = .1, emissive = 0, emissiveIntensity = 1.5) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: THREE.MathUtils.clamp(roughness, .04, 1),
    metalness: THREE.MathUtils.clamp(metalness, 0, 1),
    emissive,
    emissiveIntensity: emissive ? emissiveIntensity : 0
  });
const floorMat = mat(0x0c1723, .86, .34, 0x030811, .2);
const wallMat = mat(0x1a2a3b, .56, .7, 0x030912, .3);
const cyanMat = mat(0x24d8ed, .28, .32, 0x087b90, 1.1);
const orangeMat = mat(0xff7a43, .34, .28, 0x8a260c, .85);
const violetMat = mat(0xb58aff, .3, .28, 0x5426a8, .95);

// Shared materials for the industrial arena architecture pass.
const architecturePanelMat = mat(0x20364a, .56, .68, 0x040a11, .25);
const architectureRibMat = mat(0x526d80, .34, .78, 0x07111a, .3);
const architectureRailMat = mat(0x304b60, .42, .72);
const architectureVentMat = mat(0x091521, .9, .28);
const architectureVentSlatMat = mat(0x6b8190, .38, .74);
const architectureFixtureMat = mat(0x142a3c, .48, .68);
const architectureWarningMat = mat(0xff9a55, .36, .28, 0x5a2109, .8);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(70, 35, 0x24516a, 0x1b3448);
grid.position.y = .014;
grid.material.transparent = true;
grid.material.opacity = .38;
scene.add(grid);

const floorRingPulses = [];
function addFloorRing(inner, outer, color, opacity, thetaStart = 0, thetaLength = Math.PI * 2) {
  const material = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 160, 1, thetaStart, thetaLength), material);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .026;
  scene.add(ring);
  floorRingPulses.push({ material, base: opacity, phase: thetaStart });
  return ring;
}
addFloorRing(8.7, 8.82, 0x19c5dc, .24);
addFloorRing(20.8, 20.94, 0x19c5dc, .2);
for (let i = 0; i < 8; i++) {
  addFloorRing(22.1, 22.22, i % 2 ? 0xff8152 : 0x27d9e9, .32, i * Math.PI / 4, Math.PI / 12);
}

const dustCount = 180;
const dustPositions = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i++) {
  dustPositions[i * 3] = (Math.random() - .5) * 48;
  dustPositions[i * 3 + 1] = .5 + Math.random() * 7;
  dustPositions[i * 3 + 2] = (Math.random() - .5) * 48;
}
const dustGeometry = new THREE.BufferGeometry();
dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
const dustField = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
  color: 0x8bddeb, size: .065, transparent: true, opacity: .48, depthWrite: false, sizeAttenuation: true
}));
scene.add(dustField);

const arena = new THREE.Group();
scene.add(arena);
const arenaColliders = [];

function box(parent, x, y, z, sx, sy, sz, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// Reuse one unit box and one draw call per material for static architectural detail.
// Decorative instances do not cast individual shadows; the arena's primary structure does.
const architectureUnitBox = new THREE.BoxGeometry(1, 1, 1);
function addInstancedBoxes(parent, material, entries, castShadow = false) {
  if (!entries.length) return null;
  const batch = new THREE.InstancedMesh(architectureUnitBox, material, entries.length);
  const transform = new THREE.Object3D();
  for (let index = 0; index < entries.length; index++) {
    const item = entries[index];
    transform.position.set(item.x, item.y, item.z);
    transform.rotation.set(item.rx ?? 0, item.ry ?? 0, item.rz ?? 0);
    transform.scale.set(item.sx, item.sy, item.sz);
    transform.updateMatrix();
    batch.setMatrixAt(index, transform.matrix);
  }
  batch.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  batch.instanceMatrix.needsUpdate = true;
  batch.castShadow = castShadow;
  batch.receiveShadow = true;
  batch.computeBoundingBox();
  batch.computeBoundingSphere();
  parent.add(batch);
  return batch;
}

for (let i = -1; i <= 1; i += 2) {
  box(arena, i * 24, 3, 0, 1, 6, 50, wallMat);
  box(arena, 0, 3, i * 24, 50, 6, 1, wallMat);
  box(arena, i * 23.46, 5.42, 0, .075, .075, 46, cyanMat);
  box(arena, 0, 5.42, i * 23.46, 46, .075, .075, cyanMat);
}
for (let i = 0; i < 4; i++) {
  const a = i * Math.PI / 2;
  const x = Math.cos(a) * 17;
  const z = Math.sin(a) * 17;
  box(arena, x, 2.8, z, 2, 5.6, 2, wallMat);
  box(arena, x, 4.8, z, 2.1, .12, 2.1, cyanMat);
  arenaColliders.push({ x, z, halfX: 1, halfZ: 1, centerY: 2.8, halfY: 2.8 });
}
for (let i = 0; i < 12; i++) {
  const a = i * Math.PI / 6;
  box(arena, Math.cos(a) * 22, .2, Math.sin(a) * 22, .35, .4, .35, cyanMat);
}
for (let i = 0; i < 4; i++) {
  const a = i * Math.PI / 2 + Math.PI / 4;
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(.07, .22, 4.6, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x39d9eb, transparent: true, opacity: .085, side: THREE.DoubleSide, depthWrite: false })
  );
  beacon.position.set(Math.cos(a) * 21.7, 2.3, Math.sin(a) * 21.7);
  scene.add(beacon);
}
for (let i = 0; i < 10; i++) {
  const x = (Math.random() - .5) * 34;
  const z = (Math.random() - .5) * 34;
  if (Math.hypot(x, z) > 8) {
    box(arena, x, .9, z, 2.2, 1.8, 2.2, wallMat);
    arenaColliders.push({ x, z, halfX: 1.1, halfZ: 1.1, centerY: .9, halfY: .9 });
  }
}

// Visual-only detail pass. All placements stay on the perimeter or existing pillars,
// so the established player/enemy navigation and projectile collision layout is preserved.
function buildArenaArchitectureDetails() {
  const wallPanels = [];
  const wallRibs = [];
  const wallRails = [];
  const ventBackplates = [];
  const ventSlats = [];
  const fixtureHousings = [];
  const fixtureLenses = [];
  const pillarEdgeTrims = [];
  const warningMarkers = [];

  for (const side of [-1, 1]) {
    // Large recessed-looking wall panels, kept clear of the four arena corners.
    for (let index = -4; index <= 4; index++) {
      const offset = index * 4.55;
      wallPanels.push({ x: side * 23.44, y: 2.95, z: offset, sx: .09, sy: 3.55, sz: 4.05 });
      wallPanels.push({ x: offset, y: 2.95, z: side * 23.44, sx: 4.05, sy: 3.55, sz: .09 });
    }

    // Repeated vertical structural ribs create scale and a stronger industrial silhouette.
    for (let index = -5; index <= 5; index++) {
      const offset = index * 4.2;
      wallRibs.push({ x: side * 23.32, y: 3, z: offset, sx: .18, sy: 5.25, sz: .24 });
      wallRibs.push({ x: offset, y: 3, z: side * 23.32, sx: .24, sy: 5.25, sz: .18 });
    }

    // Continuous upper and lower rails visually tie the four walls together.
    for (const y of [.72, 5.12]) {
      wallRails.push({ x: side * 23.26, y, z: 0, sx: .14, sy: .16, sz: 46 });
      wallRails.push({ x: 0, y, z: side * 23.26, sx: 46, sy: .16, sz: .14 });
    }

    // Dark vent recesses with five separated metallic slats in each module.
    for (const offset of [-9.1, 9.1]) {
      ventBackplates.push({ x: side * 23.25, y: 3, z: offset, sx: .07, sy: 1.55, sz: 2.15 });
      ventBackplates.push({ x: offset, y: 3, z: side * 23.25, sx: 2.15, sy: 1.55, sz: .07 });
      for (let slat = -2; slat <= 2; slat++) {
        ventSlats.push({ x: side * 23.17, y: 3 + slat * .22, z: offset, sx: .045, sy: .055, sz: 1.78 });
        ventSlats.push({ x: offset, y: 3 + slat * .22, z: side * 23.17, sx: 1.78, sy: .055, sz: .045 });
      }
    }

    // Recessed light housings and narrow cyan lenses; emissive surfaces provide the glow.
    for (const offset of [-16, -8, 0, 8, 16]) {
      fixtureHousings.push({ x: side * 23.22, y: 4.48, z: offset, sx: .16, sy: .34, sz: 1.05 });
      fixtureHousings.push({ x: offset, y: 4.48, z: side * 23.22, sx: 1.05, sy: .34, sz: .16 });
      fixtureLenses.push({ x: side * 23.12, y: 4.48, z: offset, sx: .06, sy: .1, sz: .72 });
      fixtureLenses.push({ x: offset, y: 4.48, z: side * 23.12, sx: .72, sy: .1, sz: .06 });
    }

    // Small orange warning modules at the lower wall corners.
    for (const offset of [-20.8, 20.8]) {
      warningMarkers.push({ x: side * 23.12, y: .92, z: offset, sx: .07, sy: .38, sz: .72 });
      warningMarkers.push({ x: offset, y: .92, z: side * 23.12, sx: .72, sy: .38, sz: .07 });
    }
  }

  // Four narrow armor strips on each of the existing central support pillars.
  for (const [x, z] of [[17, 0], [-17, 0], [0, 17], [0, -17]]) {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        pillarEdgeTrims.push({
          x: x + sx * .91, y: 2.8, z: z + sz * .91,
          sx: .085, sy: 5.35, sz: .085
        });
      }
    }
  }

  addInstancedBoxes(arena, architecturePanelMat, wallPanels);
  addInstancedBoxes(arena, architectureRibMat, wallRibs);
  addInstancedBoxes(arena, architectureRailMat, wallRails);
  addInstancedBoxes(arena, architectureVentMat, ventBackplates);
  addInstancedBoxes(arena, architectureVentSlatMat, ventSlats);
  addInstancedBoxes(arena, architectureFixtureMat, fixtureHousings);
  addInstancedBoxes(arena, cyanMat, fixtureLenses);
  addInstancedBoxes(arena, architectureRibMat, pillarEdgeTrims);
  addInstancedBoxes(arena, architectureWarningMat, warningMarkers);
}
buildArenaArchitectureDetails();

function resolveArenaCollisions(position, radius) {
  for (let pass = 0; pass < 2; pass++) {
    for (const obstacle of arenaColliders) {
      const nearestX = THREE.MathUtils.clamp(position.x, obstacle.x - obstacle.halfX, obstacle.x + obstacle.halfX);
      const nearestZ = THREE.MathUtils.clamp(position.z, obstacle.z - obstacle.halfZ, obstacle.z + obstacle.halfZ);
      const dx = position.x - nearestX;
      const dz = position.z - nearestZ;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq >= radius * radius) continue;

      if (distanceSq < 1e-8) {
        const exits = [
          { distance: position.x - (obstacle.x - obstacle.halfX), axis: 'x', value: obstacle.x - obstacle.halfX - radius - .002 },
          { distance: obstacle.x + obstacle.halfX - position.x, axis: 'x', value: obstacle.x + obstacle.halfX + radius + .002 },
          { distance: position.z - (obstacle.z - obstacle.halfZ), axis: 'z', value: obstacle.z - obstacle.halfZ - radius - .002 },
          { distance: obstacle.z + obstacle.halfZ - position.z, axis: 'z', value: obstacle.z + obstacle.halfZ + radius + .002 }
        ];
        exits.sort((a, b) => a.distance - b.distance);
        position[exits[0].axis] = exits[0].value;
      } else {
        const distance = Math.sqrt(distanceSq);
        const push = radius - distance + .002;
        position.x += dx / distance * push;
        position.z += dz / distance * push;
      }
    }
  }
}

const player = new THREE.Group();
scene.add(player);
const playerRig = new THREE.Group();
player.add(playerRig);
const playerArmor = mat(0x294a63, .42, .68);
const playerDark = mat(0x101d2b, .56, .66);
const playerJoint = mat(0x657f91, .34, .76);
const playerCore = mat(0x42e8f2, .26, .3, 0x16a9bd, 1.8);
const playerVisorMat = new THREE.MeshPhysicalMaterial({
  color: 0x164b62,
  metalness: .42,
  roughness: .16,
  clearcoat: .92,
  clearcoatRoughness: .12,
  emissive: 0x052b39,
  emissiveIntensity: .65
});
const playerTorso = new THREE.Mesh(new THREE.CapsuleGeometry(.39, .62, 6, 12), playerArmor);
playerTorso.position.set(0, 1.3, 0);
playerTorso.castShadow = true;
playerRig.add(playerTorso);
box(playerRig, 0, .88, 0, .52, .28, .42, playerDark);
box(playerRig, 0, 1.42, -.34, .7, .48, .17, playerArmor);
box(playerRig, 0, 1.13, -.32, .52, .16, .16, playerDark);
box(playerRig, -.39, 1.38, -.12, .16, .38, .34, playerDark);
box(playerRig, .39, 1.38, -.12, .16, .38, .34, playerDark);

// Layered chest, shoulder and backpack armor adds depth without changing the player rig.
for (const side of [-1, 1]) {
  const chestFlank = new THREE.Mesh(new THREE.BoxGeometry(.16, .28, .12), playerJoint);
  chestFlank.position.set(side * .29, 1.42, -.43);
  chestFlank.castShadow = true;
  playerRig.add(chestFlank);

  const shoulderGuard = new THREE.Mesh(new THREE.SphereGeometry(.25, 12, 10), playerArmor);
  shoulderGuard.scale.set(1.25, .62, 1.15);
  shoulderGuard.position.set(side * .52, 1.59, -.02);
  shoulderGuard.castShadow = true;
  playerRig.add(shoulderGuard);
  box(playerRig, side * .52, 1.64, -.22, .22, .045, .055, playerCore);

  box(playerRig, side * .34, 1.42, .48, .16, .42, .28, playerDark);
  box(playerRig, side * .34, 1.43, .635, .09, .24, .025, playerCore);
}
const chestCore = new THREE.Mesh(new THREE.SphereGeometry(.105, 12, 10), playerCore);
chestCore.position.set(0, 1.43, -.445);
playerRig.add(chestCore);
const chestRing = new THREE.Mesh(new THREE.TorusGeometry(.16, .025, 8, 24), playerJoint);
chestRing.position.set(0, 1.43, -.445);
chestRing.rotation.y = Math.PI;
playerRig.add(chestRing);
const backpack = box(playerRig, 0, 1.38, .39, .56, .62, .3, playerDark);
box(playerRig, 0, 1.58, .56, .34, .22, .08, playerCore);
const headRig = new THREE.Group();
headRig.position.set(0, 2.05, 0);
playerRig.add(headRig);
const helmet = new THREE.Mesh(new THREE.SphereGeometry(.29, 18, 14), playerArmor);
helmet.scale.set(1.08, 1.12, 1);
helmet.castShadow = true;
headRig.add(helmet);
box(headRig, 0, -.015, -.265, .43, .12, .075, playerVisorMat);
box(headRig, 0, .17, .035, .34, .09, .32, playerDark);
for (const side of [-1, 1]) {
  const ear = new THREE.Mesh(new THREE.BoxGeometry(.09, .2, .2), playerJoint);
  ear.position.set(side * .29, -.015, 0);
  headRig.add(ear);
}
const antenna = new THREE.Mesh(new THREE.CylinderGeometry(.018, .025, .2, 8), playerJoint);
antenna.position.set(.17, .36, .02);
headRig.add(antenna);
const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 8), playerCore);
antennaTip.position.set(.17, .47, .02);
headRig.add(antennaTip);

function buildPlayerArm(side) {
  const pivot = new THREE.Group();
  pivot.position.set(side * .49, 1.63, -.015);
  pivot.rotation.x = .38;
  playerRig.add(pivot);
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(.135, .38, 4, 8), playerArmor);
  upper.position.set(side * .015, -.22, 0);
  upper.castShadow = true;
  pivot.add(upper);
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 10), playerJoint);
  shoulder.scale.set(1.12, .72, 1);
  shoulder.position.set(side * .025, -.015, 0);
  pivot.add(shoulder);
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8), playerDark);
  elbow.position.set(side * .025, -.45, -.015);
  pivot.add(elbow);
  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(.115, .34, 4, 8), playerDark);
  forearm.position.set(side * .035, -.66, -.075);
  forearm.castShadow = true;
  pivot.add(forearm);
  box(pivot, side * .035, -.68, -.16, .25, .18, .22, playerArmor);
  box(pivot, side * .035, -.63, -.285, .14, .04, .025, playerCore);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(.105, 10, 8), playerJoint);
  hand.position.set(side * .035, -.89, -.12);
  pivot.add(hand);
  return pivot;
}
const leftArm = buildPlayerArm(-1);
const rightArm = buildPlayerArm(1);

function buildPlayerLeg(side) {
  const hip = new THREE.Group();
  hip.position.set(side * .205, .83, 0);
  playerRig.add(hip);
  const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(.17, .42, 4, 8), playerArmor);
  thigh.position.y = -.22;
  thigh.castShadow = true;
  hip.add(thigh);
  const knee = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), playerJoint);
  knee.position.set(0, -.45, -.025);
  hip.add(knee);
  box(hip, 0, -.23, -.15, .28, .28, .11, playerArmor);
  box(hip, 0, -.45, -.17, .26, .14, .09, playerJoint);
  const shinPivot = new THREE.Group();
  shinPivot.position.set(0, -.45, 0);
  hip.add(shinPivot);
  const shin = new THREE.Mesh(new THREE.CapsuleGeometry(.135, .39, 4, 8), playerDark);
  shin.position.y = -.22;
  shin.castShadow = true;
  shinPivot.add(shin);
  box(shinPivot, 0, -.37, -.07, .28, .2, .4, playerArmor);
  box(shinPivot, 0, -.18, -.145, .2, .08, .035, playerCore);
  box(shinPivot, 0, -.36, -.285, .18, .045, .025, playerCore);
  return { hip, knee: shinPivot };
}
const leftLeg = buildPlayerLeg(-1);
const rightLeg = buildPlayerLeg(1);
const playerParts = { leftArm, rightArm, leftLeg, rightLeg, torso: playerTorso, head: headRig };
const gunGroup = new THREE.Group();
player.add(gunGroup);
const muzzle = new THREE.Object3D();
player.add(muzzle);
player.position.set(0, 0, 8);

const weapons = {
  rifle: { name: 'ARC RIFLE', short: 'RIFLE', mag: 30, damage: 29, rate: 145, reload: 1200, pellets: 1, spread: .012, speed: 64, color: 0x50e6f2, description: 'BALANCED // FULL AUTO' },
  shotgun: { name: 'BREACH-7', short: 'SHOTGUN', mag: 8, damage: 13, rate: 650, reload: 1550, pellets: 7, spread: .105, speed: 48, color: 0xffad62, description: '7-PELLET // CLOSE RANGE' },
  precision: { name: 'LONGSHOT', short: 'PRECISION', mag: 6, damage: 105, rate: 850, reload: 1700, pellets: 1, spread: .002, speed: 95, color: 0xb99aff, description: 'HIGH IMPACT // SLOW FIRE' }
};
const magazines = { rifle: 30, shotgun: 8, precision: 6 };
let currentWeapon = 'rifle';
function buildWeaponVisual() {
  disposeObject3D(gunGroup);
  gunGroup.clear();
  const def = weapons[currentWeapon];
  const metal = mat(currentWeapon === 'shotgun' ? 0x9b795b : currentWeapon === 'precision' ? 0x8d83b4 : 0x9baebe, .3, .84);
  const darkMetal = mat(0x172635, .48, .74);
  const glow = mat(
    currentWeapon === 'shotgun' ? 0xff7a43 : currentWeapon === 'precision' ? 0xb58aff : 0x24d8ed,
    .28, .38,
    currentWeapon === 'shotgun' ? 0x8a260c : currentWeapon === 'precision' ? 0x5426a8 : 0x087b90,
    1.15
  );
  const isShotgun = currentWeapon === 'shotgun';
  const isPrecision = currentWeapon === 'precision';
  const receiverZ = -.48;
  box(gunGroup, .35, 1.36, receiverZ, isPrecision ? .25 : .22, .2, isShotgun ? .58 : .52, metal);
  box(gunGroup, .35, 1.47, receiverZ + .015, .13, .045, .48, darkMetal);
  box(gunGroup, .35, 1.36, -.34, .28, .13, .19, darkMetal);
  box(gunGroup, .35, 1.22, -.29, .14, .25, .18, darkMetal);
  box(gunGroup, .35, 1.18, .035, .2, .28, .34, metal);
  box(gunGroup, .35, 1.31, .205, .24, .12, .09, darkMetal);
  box(gunGroup, .35, 1.49, -.51, .09, .08, .26, glow);

  // Shared top rail and six compact cooling slots give the receiver a machined profile.
  box(gunGroup, .35, 1.58, -.5, .11, .035, .62, darkMetal);
  for (const railZ of [-.72, -.56, -.4]) {
    box(gunGroup, .35, 1.605, railZ, .17, .018, .045, metal);
  }
  const weaponCoolingVents = [];
  for (const side of [-1, 1]) {
    for (let slot = 0; slot < 3; slot++) {
      weaponCoolingVents.push({
        x: .35 + side * .14, y: 1.37, z: -.62 + slot * .13,
        sx: .025, sy: .065, sz: .07
      });
    }
  }
  for (const vent of weaponCoolingVents) {
    box(gunGroup, vent.x, vent.y, vent.z, vent.sx, vent.sy, vent.sz, darkMetal);
  }

  const barrelLength = isPrecision ? .96 : isShotgun ? .62 : .72;
  const barrelZ = isPrecision ? -1.15 : isShotgun ? -.91 : -.98;
  const barrelXs = isShotgun ? [.285, .415] : [.35];
  for (const x of barrelXs) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(isPrecision ? .065 : .055, .075, barrelLength, 12), metal);
    barrel.rotation.x = -Math.PI / 2;
    barrel.position.set(x, 1.36, barrelZ);
    barrel.castShadow = true;
    gunGroup.add(barrel);
    const muzzleRing = new THREE.Mesh(new THREE.TorusGeometry(isPrecision ? .07 : .06, .018, 8, 16), glow);
    muzzleRing.rotation.y = Math.PI;
    muzzleRing.position.set(x, 1.36, barrelZ - barrelLength * .51);
    gunGroup.add(muzzleRing);
    const barrelBand = new THREE.Mesh(new THREE.TorusGeometry(isPrecision ? .07 : .06, .012, 6, 14), darkMetal);
    barrelBand.position.set(x, 1.36, barrelZ + barrelLength * .28);
    gunGroup.add(barrelBand);
  }
  if (isPrecision) {
    box(gunGroup, .35, 1.57, -.52, .12, .13, .32, darkMetal);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .34, 12), metal);
    scope.rotation.x = -Math.PI / 2;
    scope.position.set(.35, 1.64, -.57);
    gunGroup.add(scope);
    box(gunGroup, .35, 1.65, -.57, .07, .055, .26, glow);
    const scopeLensMat = new THREE.MeshPhysicalMaterial({
      color: 0x347e9b,
      metalness: .28,
      roughness: .12,
      clearcoat: .96,
      clearcoatRoughness: .08,
      emissive: 0x052538,
      emissiveIntensity: .45
    });
    const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(.057, .057, .025, 16), scopeLensMat);
    scopeLens.rotation.x = -Math.PI / 2;
    scopeLens.position.set(.35, 1.64, -.75);
    gunGroup.add(scopeLens);
    box(gunGroup, .35, 1.11, -.08, .22, .28, .18, darkMetal);
  } else if (isShotgun) {
    box(gunGroup, .35, 1.12, -.35, .25, .19, .34, metal);
    box(gunGroup, .35, 1.53, -.4, .08, .08, .22, glow);
    // Three side-mounted shell cases make the close-range loadout immediately identifiable.
    for (let shell = 0; shell < 3; shell++) {
      const shellCase = new THREE.Mesh(new THREE.CylinderGeometry(.032, .032, .16, 8), orangeMat);
      shellCase.rotation.x = -Math.PI / 2;
      shellCase.position.set(.53, 1.27, -.5 + shell * .15);
      shellCase.castShadow = true;
      gunGroup.add(shellCase);
    }
  } else {
    box(gunGroup, .35, 1.56, -.5, .09, .1, .3, darkMetal);
    box(gunGroup, .35, 1.6, -.53, .055, .035, .22, glow);
    box(gunGroup, .35, 1.13, -.44, .16, .27, .19, darkMetal);
    // Exposed energy cell distinguishes the ARC rifle from the other two weapons.
    box(gunGroup, .5, 1.34, -.48, .055, .16, .22, glow);
  }
  muzzle.position.set(.35, 1.36, barrelZ - barrelLength * .57);
  $('weapon-name').textContent = def.name;
  $('weapon-desc').textContent = def.description;
  $('weapon-short').textContent = def.short;
  $('weapon-key-1').classList.toggle('selected', currentWeapon === 'rifle');
  $('weapon-key-2').classList.toggle('selected', currentWeapon === 'shotgun');
  $('weapon-key-3').classList.toggle('selected', currentWeapon === 'precision');
  updateAmmoHUD();
}
function switchWeapon(id) {
  if (!weapons[id] || currentWeapon === id) return;
  // Switching weapons cancels the current reload but preserves each magazine.
  reloading = false;
  reloadRemaining = 0;
  currentWeapon = id;
  buildWeaponVisual();
  showToast('LOADOUT // ' + weapons[id].name);
}
let keys = {};
let yaw = 0, pitch = -.13, started = false, gameOver = false;
let aimAssist = true, autoFire = true, aimRange = 24;
let health = 100, kills = 0, wave = 1, bestKills = 0;
let reloading = false, reloadRemaining = 0, lastShot = 0;
let dashCooldown = 0, invuln = 0, spawnTimer = 0, spawnCooldown = 0;
let toastTimer = 0, hitTimer = 0, damageFlashTimer = 0, target = null;
let spawnQueue = 0, animationClock = 0;
const enemies = [], shots = [], effects = [];
let intermission = false, upgradesTaken = 0, upgradeChoices = [];
let maxHealth = 100;
const runModifiers = { damage: 1, fireRate: 1, reloadSpeed: 1, moveSpeed: 1, magazine: 1 };
const upgradePool = [
  { id: 'overclock', name: 'OVERCLOCKED CORE', tag: 'OFFENSIVE SYSTEM', description: '+18% weapon damage', apply: () => { runModifiers.damage *= 1.18; } },
  { id: 'rapid-cycle', name: 'RAPID CYCLING', tag: 'WEAPON CONTROL', description: '+14% fire rate', apply: () => { runModifiers.fireRate *= 1.14; } },
  { id: 'reinforced', name: 'REINFORCED PLATING', tag: 'SURVIVABILITY', description: '+25 maximum health and restore 25', apply: () => { maxHealth += 25; health = Math.min(maxHealth, health + 25); } },
  { id: 'quick-mag', name: 'EXPANDED MAGAZINES', tag: 'AMMUNITION', description: '+18% magazine capacity and refill all weapons', apply: () => { runModifiers.magazine *= 1.18; for (const id of Object.keys(weapons)) magazines[id] = magazineSize(id); } },
  { id: 'kinetic', name: 'KINETIC SERVOS', tag: 'MOBILITY', description: '+12% movement speed', apply: () => { runModifiers.moveSpeed *= 1.12; } },
  { id: 'field-loader', name: 'FIELD LOADER', tag: 'RELOAD SYSTEM', description: '+20% reload speed and restore 10 health', apply: () => { runModifiers.reloadSpeed *= 1.2; health = Math.min(maxHealth, health + 10); } }
];
function magazineSize(id) {
  return Math.ceil(weapons[id].mag * runModifiers.magazine);
}
function renderUpgradeChoices() {
  const options = $('upgrade-options');
  options.innerHTML = upgradeChoices.map((choice, index) =>
    `<button class="upgrade-option" type="button" data-upgrade-index="${index}">
      <span class="upgrade-option__index">0${index + 1} // SELECT</span>
      <strong>${choice.name}</strong>
      <span class="upgrade-option__description">${choice.description}</span>
      <small>${choice.tag}</small>
    </button>`
  ).join('');
  options.querySelectorAll('[data-upgrade-index]').forEach(button => {
    button.addEventListener('click', () => chooseUpgrade(Number(button.dataset.upgradeIndex)));
  });
}
function openUpgradeSelection() {
  intermission = true;
  document.exitPointerLock?.();
  const available = [...upgradePool];
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  upgradeChoices = available.slice(0, 3);
  $('upgrade-round').textContent = `WAVE ${String(wave).padStart(2, '0')} CLEARED // SELECT ONE MODULE`;
  renderUpgradeChoices();
  $('upgrade-screen').classList.remove('hidden');
}
function chooseUpgrade(index) {
  const choice = upgradeChoices[index];
  if (!intermission || !choice) return;
  choice.apply();
  upgradesTaken++;
  intermission = false;
  upgradeChoices = [];
  $('upgrade-screen').classList.add('hidden');
  wave++;
  startWave();
  updateHUD();
  try {
    const lockRequest = renderer.domElement.requestPointerLock?.();
    if (lockRequest && typeof lockRequest.catch === 'function') {
      lockRequest.catch(() => showToast('MOUSE LOOK UNAVAILABLE // CLICK THE ARENA TO RETRY'));
    }
  } catch (_) {}
}
try {
  const storedBest = Number(localStorage.getItem('arena-zero-best') || 0);
  bestKills = Number.isFinite(storedBest) && storedBest > 0 ? Math.floor(storedBest) : 0;
  const saved = JSON.parse(localStorage.getItem('arena-zero-settings') || '{}');
  if (typeof saved.aimAssist === 'boolean') aimAssist = saved.aimAssist;
  if (typeof saved.autoFire === 'boolean') autoFire = saved.autoFire;
  if (Number.isFinite(saved.aimRange)) aimRange = THREE.MathUtils.clamp(saved.aimRange, 8, 36);
  if (saved.graphicsQuality && Object.prototype.hasOwnProperty.call(GRAPHICS_QUALITY_PRESETS, saved.graphicsQuality)) {
    graphicsQuality = saved.graphicsQuality;
  }
} catch (_) {}
$('aim-toggle').checked = aimAssist;
$('fire-toggle').checked = autoFire;
$('aim-range').value = aimRange;
$('graphics-quality').value = graphicsQuality;
resizeRenderer();
$('range-value').textContent = aimRange + 'm';
$('best-kills').textContent = String(bestKills).padStart(3, '0');

function saveSettings() {
  try {
    localStorage.setItem('arena-zero-settings', JSON.stringify({ aimAssist, autoFire, aimRange, graphicsQuality }));
  } catch (_) {}
}
function showToast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  toastTimer = 2.3;
}
function updateAmmoHUD() {
  const capacity = magazineSize(currentWeapon);
  $('ammo').innerHTML = magazines[currentWeapon] + '<span> / ' + capacity + '</span>';
  $('reload-label').textContent = reloading ? 'RELOADING' : 'READY';
}
function updateHUD() {
  $('kills').textContent = String(kills).padStart(3, '0');
  $('wave').textContent = String(wave).padStart(2, '0');
  $('hostiles').textContent = String(enemies.length + spawnQueue).padStart(2, '0');
  $('health-text').textContent = Math.ceil(health) + ' / ' + maxHealth;
  $('health-bar').style.width = (health / maxHealth * 100) + '%';
  $('upgrade-count').textContent = String(upgradesTaken).padStart(2, '0');
  $('threat').textContent = wave < 3 ? 'LOW' : wave < 6 ? 'ELEVATED' : 'CRITICAL';
  $('phase').textContent = started ? 'ACTIVE' : 'STANDBY';
  $('best-kills').textContent = String(Math.max(bestKills, kills)).padStart(3, '0');
  updateAmmoHUD();
}
function makeEnemy() {
  const roll = Math.random();
  let type = 'scout';
  if (wave >= 3 && roll > .82) type = 'heavy';
  else if (roll > (wave >= 3 ? .53 : .68)) type = 'gunner';

  const configs = {
    scout: { hp: 48 + wave * 2, speed: 3.15 + wave * .07, damage: 7, range: 1.7, cooldown: .8, scale: .78, color: 0xb95b39, eye: 0xffa15a, radius: .85 },
    gunner: { hp: 68 + wave * 3, speed: 1.35 + wave * .035, damage: 8, range: 13, cooldown: 1.75, scale: 1, color: 0x55477e, eye: 0xb99aff, radius: 1 },
    heavy: { hp: 190 + wave * 9, speed: .82 + wave * .025, damage: 16, range: 2.1, cooldown: 1.35, scale: 1.32, color: 0x536475, eye: 0xff805e, radius: 1.35 }
  };
  const cfg = configs[type];
  const enemy = new THREE.Group();
  enemy.scale.setScalar(cfg.scale);
  const rig = new THREE.Group();
  enemy.add(rig);
  const shell = mat(cfg.color, .42, .68, 0x180d18, .28);
  const dark = mat(type === 'heavy' ? 0x263644 : 0x182536, .56, .7);
  const joint = mat(type === 'scout' ? 0x7d5147 : type === 'gunner' ? 0x77709d : 0x8093a1, .36, .72);
  const core = mat(cfg.eye, .24, .32, cfg.eye, 1.8);
  const accent = mat(type === 'scout' ? 0xff9a57 : type === 'gunner' ? 0xc3a0ff : 0xff6f54, .32, .4, cfg.eye, 1.2);
  const torsoGeometry = type === 'scout'
    ? new THREE.CapsuleGeometry(.31, .58, 5, 9)
    : type === 'heavy'
      ? new THREE.BoxGeometry(1.12, 1.08, .76)
      : new THREE.CapsuleGeometry(.42, .72, 5, 10);
  const torso = new THREE.Mesh(torsoGeometry, shell);
  torso.position.set(0, 1.28, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  rig.add(torso);
  box(rig, 0, 1.38, -.34, type === 'heavy' ? 1.02 : .7, type === 'heavy' ? .62 : .46, .16, dark);
  box(rig, 0, 1.18, -.435, type === 'heavy' ? .58 : .38, .16, .075, accent);
  const enemyChestPlate = new THREE.Mesh(
    new THREE.BoxGeometry(type === 'heavy' ? .94 : type === 'gunner' ? .7 : .56, .22, .085),
    shell
  );
  enemyChestPlate.position.set(0, 1.57, -.43);
  enemyChestPlate.castShadow = true;
  rig.add(enemyChestPlate);
  box(rig, 0, 1.57, -.48, type === 'heavy' ? .48 : .34, .045, .035, accent);
  box(rig, 0, 1.34, .43, type === 'heavy' ? .9 : .58, .62, .28, dark);
  box(rig, 0, 1.58, .59, .3, .18, .08, core);

  const headRig = new THREE.Group();
  headRig.position.set(0, type === 'scout' ? 1.96 : 2.02, -.015);
  rig.add(headRig);
  const headGeometry = type === 'scout'
    ? new THREE.OctahedronGeometry(.36, 1)
    : type === 'heavy'
      ? new THREE.DodecahedronGeometry(.43, 0)
      : new THREE.SphereGeometry(.35, 14, 12);
  const head = new THREE.Mesh(headGeometry, shell);
  head.scale.set(type === 'heavy' ? 1.2 : 1, type === 'scout' ? .86 : 1, .92);
  head.castShadow = true;
  headRig.add(head);
  box(headRig, 0, -.015, -.31, type === 'heavy' ? .5 : .46, .12, .075, core);
  box(headRig, 0, .18, .035, .32, .09, .28, dark);
  for (const side of [-1, 1]) {
    const sensor = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 8), accent);
    sensor.position.set(side * .24, -.03, -.28);
    headRig.add(sensor);
  }

  function buildEnemyLimb(side, isArm) {
    const width = type === 'heavy' ? (isArm ? .19 : .2) : type === 'gunner' ? (isArm ? .14 : .15) : (isArm ? .105 : .12);
    const upperLength = isArm ? (type === 'heavy' ? .48 : .4) : (type === 'heavy' ? .52 : .43);
    const lowerLength = isArm ? (type === 'heavy' ? .43 : .36) : (type === 'heavy' ? .5 : .42);
    const pivot = new THREE.Group();
    pivot.position.set(side * (isArm ? (type === 'heavy' ? .68 : .49) : .25), isArm ? 1.62 : .82, 0);
    rig.add(pivot);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(width, upperLength, 4, 8), shell);
    upper.position.set(0, -upperLength * .43, 0);
    upper.castShadow = true;
    pivot.add(upper);
    const jointMesh = new THREE.Mesh(new THREE.SphereGeometry(width * 1.12, 9, 8), joint);
    jointMesh.position.set(0, -upperLength * .86, -.015);
    pivot.add(jointMesh);
    const lowerPivot = new THREE.Group();
    lowerPivot.position.set(0, -upperLength * .86, 0);
    pivot.add(lowerPivot);
    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(width * .86, lowerLength, 4, 8), dark);
    lower.position.set(0, -lowerLength * .43, -.025);
    lower.castShadow = true;
    lowerPivot.add(lower);

    const upperArmor = new THREE.Mesh(
      new THREE.BoxGeometry(width * 2.15, upperLength * .5, .1),
      shell
    );
    upperArmor.position.set(0, -upperLength * .43, -width * .75);
    upperArmor.castShadow = true;
    pivot.add(upperArmor);

    const lowerArmor = new THREE.Mesh(
      new THREE.BoxGeometry(width * 2.05, lowerLength * .42, .09),
      shell
    );
    lowerArmor.position.set(0, -lowerLength * .45, -width * .78);
    lowerPivot.add(lowerArmor);

    if (isArm) {
      const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(width * 2.15, .2, .25), shell);
      gauntlet.position.set(0, -lowerLength * .7, -.075);
      lowerPivot.add(gauntlet);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(width * .8, 8, 8), joint);
      hand.position.set(0, -lowerLength * .92, -.07);
      lowerPivot.add(hand);
    } else {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(width * 2.05, .16, .36), dark);
      foot.position.set(0, -lowerLength * .86, -.1);
      foot.castShadow = true;
      lowerPivot.add(foot);
      box(lowerPivot, 0, -lowerLength * .86, -.285, width * 1.25, .055, .04, accent);
    }
    return { upper: pivot, lower: lowerPivot };
  }

  const leftLeg = buildEnemyLimb(-1, false);
  const rightLeg = buildEnemyLimb(1, false);
  const leftArm = buildEnemyLimb(-1, true);
  const rightArm = buildEnemyLimb(1, true);
  for (const side of [-1, 1]) {
    if (type === 'heavy') {
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(.52, .36, .58), shell);
      shoulder.position.set(side * .68, 1.75, -.015);
      shoulder.castShadow = true;
      rig.add(shoulder);
      box(rig, side * .68, 1.88, -.12, .38, .08, .42, accent);
    } else {
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(type === 'gunner' ? .24 : .18, 10, 8), joint);
      shoulder.position.set(side * .52, 1.63, 0);
      shoulder.scale.set(1.15, .85, 1);
      rig.add(shoulder);
      const shoulderPlate = new THREE.Mesh(
        new THREE.BoxGeometry(type === 'gunner' ? .4 : .29, .14, .34),
        shell
      );
      shoulderPlate.position.set(side * .52, 1.76, -.035);
      shoulderPlate.castShadow = true;
      rig.add(shoulderPlate);
      box(rig, side * .52, 1.78, -.22, type === 'gunner' ? .24 : .17, .035, .035, accent);
    }
  }

  if (type === 'scout') {
    for (const side of [-1, 1]) {
      const blade = new THREE.Mesh(new THREE.ConeGeometry(.09, .48, 6), accent);
      blade.position.set(side * .58, .82, -.13);
      blade.rotation.z = side * -.22;
      rig.add(blade);
      const fin = new THREE.Mesh(new THREE.ConeGeometry(.1, .42, 6), shell);
      fin.position.set(side * .29, 1.45, .34);
      fin.rotation.z = side * .65;
      rig.add(fin);
    }
  } else if (type === 'gunner') {
    const cannon = new THREE.Group();
    cannon.position.set(.62, 1.68, -.04);
    rig.add(cannon);
    box(cannon, 0, 0, .02, .34, .32, .38, dark);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, .78, 12), shell);
    barrel.rotation.x = -Math.PI / 2;
    barrel.position.set(0, 0, -.43);
    cannon.add(barrel);
    const muzzleGlow = new THREE.Mesh(new THREE.TorusGeometry(.13, .025, 8, 14), core);
    muzzleGlow.rotation.y = Math.PI;
    muzzleGlow.position.set(0, 0, -.83);
    cannon.add(muzzleGlow);
    box(cannon, 0, .2, -.08, .12, .08, .3, accent);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(.025, .04, .34, 8), joint);
    antenna.position.set(-.22, .42, .08);
    cannon.add(antenna);
  } else {
    const reactor = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 10), core);
    reactor.position.set(0, 1.35, -.49);
    rig.add(reactor);
    const reactorRing = new THREE.Mesh(new THREE.TorusGeometry(.29, .045, 8, 18), accent);
    reactorRing.position.copy(reactor.position);
    reactorRing.rotation.y = Math.PI;
    rig.add(reactorRing);
    box(rig, 0, .82, -.28, .78, .25, .32, dark);
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(.13, .34, 6), accent);
      horn.position.set(side * .43, 2.05, .03);
      horn.rotation.z = side * -.45;
      rig.add(horn);
    }
  }

  const barY = type === 'heavy' ? 3.05 : 2.68;
  const barBack = new THREE.Mesh(new THREE.BoxGeometry(1.25, .09, .06), mat(0x101820));
  barBack.position.set(0, barY, 0);
  enemy.add(barBack);
  const barFill = new THREE.Mesh(new THREE.BoxGeometry(1.2, .055, .07), mat(0x69f2b7, .45, .08, 0x176b45, .9));
  barFill.position.set(0, barY, -.045);
  enemy.add(barFill);

  const a = Math.random() * Math.PI * 2;
  const r = 17 + Math.random() * 5;
  enemy.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
  resolveArenaCollisions(enemy.position, cfg.radius * .55);
  enemy.position.x = THREE.MathUtils.clamp(enemy.position.x, -22, 22);
  enemy.position.z = THREE.MathUtils.clamp(enemy.position.z, -22, 22);
  enemy.userData = {
    type, hp: cfg.hp, maxHp: cfg.hp, speed: cfg.speed, damage: cfg.damage,
    range: cfg.range, cooldown: Math.random() * .7, attackRate: cfg.cooldown,
    radius: cfg.radius, points: cfg.points, barFill, rig, shell,
    legs: { left: leftLeg, right: rightLeg },
    arms: { left: leftArm, right: rightArm },
    head: headRig, torso, animTime: Math.random() * 5, animOffset: Math.random() * Math.PI * 2,
    hitFlash: 0, recoil: 0
  };
  scene.add(enemy);
  enemies.push(enemy);
  updateHUD();
}
function startWave() {
  intermission = false;
  $('upgrade-screen').classList.add('hidden');
  spawnQueue = Math.min(5 + wave * 2, 22);
  spawnCooldown = .15;
  showToast('WAVE ' + String(wave).padStart(2, '0') + ' // ' + spawnQueue + ' HOSTILES');
  updateHUD();
}
function projectile(from, direction, hostile, damageAmount, speed, color) {
  const normalizedDirection = direction.clone().normalize();
  const material = hostile ? orangeMat : (color === 'violet' ? violetMat : color === 'orange' ? orangeMat : cyanMat);
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(hostile ? .06 : .038, hostile ? .2 : .24, 4, 8),
    material
  );
  mesh.position.copy(from);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalizedDirection);
  scene.add(mesh);
  shots.push({ mesh, dir: normalizedDirection, speed, life: 2.2, hostile, damage: damageAmount });
}

// Return the nearest point on a movement segment. This prevents fast projectiles
// from tunnelling through targets between rendered frames.
function closestPointOnSegment(point, start, end) {
  const segment = end.clone().sub(start);
  const lengthSq = segment.lengthSq();
  if (lengthSq === 0) return start.clone();
  const t = THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSq, 0, 1);
  return start.clone().addScaledVector(segment, t);
}

function segmentParameter(point, start, end) {
  const segment = end.clone().sub(start);
  const lengthSq = segment.lengthSq();
  if (lengthSq === 0) return 0;
  return THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSq, 0, 1);
}

function segmentObstacleHit(start, end) {
  let nearest = null;
  let nearestT = Infinity;
  for (const obstacle of arenaColliders) {
    const bounds = [
      ['x', obstacle.x - obstacle.halfX, obstacle.x + obstacle.halfX],
      ['y', obstacle.centerY - obstacle.halfY, obstacle.centerY + obstacle.halfY],
      ['z', obstacle.z - obstacle.halfZ, obstacle.z + obstacle.halfZ]
    ];
    let tMin = 0;
    let tMax = 1;
    for (const [axis, min, max] of bounds) {
      const delta = end[axis] - start[axis];
      if (Math.abs(delta) < 1e-8) {
        if (start[axis] < min || start[axis] > max) {
          tMin = Infinity;
          break;
        }
        continue;
      }
      let t1 = (min - start[axis]) / delta;
      let t2 = (max - start[axis]) / delta;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) break;
    }
    if (tMin <= tMax && tMin >= 0 && tMin < nearestT) {
      nearestT = tMin;
      nearest = { point: start.clone().lerp(end, tMin), t: tMin };
    }
  }
  return nearest;
}

// Dispose geometries and (optionally) materials when transient objects are removed.
function disposeObject3D(object, disposeMaterials = true) {
  object.traverse(child => {
    if (child.geometry) child.geometry.dispose();
    if (disposeMaterials && child.material) {
      if (Array.isArray(child.material)) child.material.forEach(material => material.dispose());
      else child.material.dispose();
    }
  });
}

function nearestTarget() {
  let best = null;
  let bestScore = Infinity;
  const cameraForward = camera.getWorldDirection(new THREE.Vector3());
  const muzzlePosition = new THREE.Vector3();
  muzzle.getWorldPosition(muzzlePosition);
  for (const enemy of enemies) {
    const aimPoint = enemy.position.clone().add(new THREE.Vector3(0, 1.25 * enemy.scale.y, 0));
    const playerDistance = aimPoint.distanceTo(player.position);
    if (playerDistance > aimRange) continue;
    const cameraToTarget = aimPoint.clone().sub(camera.position);
    const alignment = cameraForward.dot(cameraToTarget.normalize());
    // Only acquire targets near the centre of the screen and with a clear shot.
    if (alignment < .93 || segmentObstacleHit(muzzlePosition, aimPoint)) continue;
    const score = playerDistance + (1 - alignment) * 18 + (enemy.userData.type === 'heavy' ? 1.2 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = enemy;
    }
  }
  return best;
}
function shoot() {
  const def = weapons[currentWeapon];
  const fireDelay = def.rate / runModifiers.fireRate;
  if (magazines[currentWeapon] <= 0 || reloading || performance.now() - lastShot < fireDelay) return;
  lastShot = performance.now();
  magazines[currentWeapon]--;
  const origin = new THREE.Vector3();
  muzzle.getWorldPosition(origin);
  let baseDirection;
  if (aimAssist && target) {
    const aimPoint = target.position.clone().add(new THREE.Vector3(0, 1.25 * target.scale.y, 0));
    baseDirection = aimPoint.sub(origin).normalize();
  } else {
    // Fire through the centre-screen camera ray, not a separately guessed player angle.
    const cameraForward = camera.getWorldDirection(new THREE.Vector3());
    const crosshairPoint = camera.position.clone().addScaledVector(cameraForward, 80);
    baseDirection = crosshairPoint.sub(origin).normalize();
  }
  for (let i = 0; i < def.pellets; i++) {
    const direction = baseDirection.clone();
    direction.x += (Math.random() - .5) * def.spread;
    direction.y += (Math.random() - .5) * def.spread;
    direction.z += (Math.random() - .5) * def.spread;
    projectile(origin, direction, false, def.damage * runModifiers.damage, def.speed, currentWeapon === 'precision' ? 'violet' : currentWeapon === 'shotgun' ? 'orange' : 'cyan');
  }
  addMuzzleFlash(origin, baseDirection, def.color, currentWeapon);
  updateAmmoHUD();
}
function reload() {
  const def = weapons[currentWeapon];
  if (reloading || magazines[currentWeapon] === magazineSize(currentWeapon)) return;
  reloading = true;
  reloadRemaining = def.reload / 1000 / runModifiers.reloadSpeed;
  updateAmmoHUD();
}
function damage(amount) {
  if (invuln > 0 || gameOver) return;
  health = Math.max(0, health - amount);
  invuln = .28;
  damageFlashTimer = .24;
  $('damage-flash').classList.add('active');
  updateHUD();
  if (health <= 0) {
    gameOver = true;
    bestKills = Math.max(bestKills, kills);
    try { localStorage.setItem('arena-zero-best', String(bestKills)); } catch (_) {}
    document.exitPointerLock?.();
    $('final-kills').textContent = kills;
    $('final-wave').textContent = wave;
    $('end-screen').classList.remove('hidden');
    updateHUD();
  }
}
function addBurst(position, color = 0x50e6f2, size = .2) {
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(size, 0),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, depthWrite: false })
  );
  mesh.position.copy(position);
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  scene.add(mesh);
  effects.push({ mesh, life: .22, max: .22, kind: 'burst' });
}
function addMuzzleFlash(position, direction, color, weaponId) {
  const length = weaponId === 'precision' ? .62 : weaponId === 'shotgun' ? .48 : .38;
  const radius = weaponId === 'shotgun' ? .15 : weaponId === 'precision' ? .075 : .105;
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(radius, length, 8),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: .92,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    })
  );
  mesh.position.copy(position).addScaledVector(direction, length * .34);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  scene.add(mesh);
  effects.push({ mesh, life: .075, max: .075, kind: 'muzzle' });
}
function addShardBurst(position, color, count = 8, lifetime = .42) {
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) {
    const direction = new THREE.Vector3(
      (Math.random() - .5) * 2,
      .35 + Math.random() * 1.3,
      (Math.random() - .5) * 2
    ).normalize();
    const speed = 1.5 + Math.random() * 2.2;
    velocities[index * 3] = direction.x * speed;
    velocities[index * 3 + 1] = direction.y * speed;
    velocities[index * 3 + 2] = direction.z * speed;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color, size: .085, transparent: true, opacity: .95,
    depthWrite: false, sizeAttenuation: true
  });
  const mesh = new THREE.Points(geometry, material);
  mesh.position.copy(position);
  scene.add(mesh);
  effects.push({ mesh, life: lifetime, max: lifetime, velocities, kind: 'shards' });
}
function registerHit(position, enemy, damageAmount) {
  enemy.userData.hp = Math.max(0, enemy.userData.hp - damageAmount);
  const ratio = THREE.MathUtils.clamp(enemy.userData.hp / enemy.userData.maxHp, 0, 1);
  enemy.userData.barFill.scale.x = Math.max(.001, ratio);
  enemy.userData.barFill.position.x = -.6 * (1 - ratio);
  addBurst(position, enemy.userData.type === 'gunner' ? 0xb99aff : 0xffa15a, .13);
  enemy.userData.hitFlash = .16;
  enemy.userData.recoil = .2;
  hitTimer = .12;
  $('hitmarker').classList.add('active');
  if (enemy.userData.hp <= 0) eliminateEnemy(enemy);
}
function eliminateEnemy(enemy) {
  const index = enemies.indexOf(enemy);
  if (index < 0) return;
  const deathPoint = enemy.position.clone().add(new THREE.Vector3(0, 1.1 * enemy.scale.y, 0));
  addBurst(deathPoint, 0xffa15a, .3);
  addShardBurst(deathPoint, enemy.userData.type === 'gunner' ? 0xb99aff : 0xffa15a, 9, .46);
  scene.remove(enemy);
  enemies.splice(index, 1);
  disposeObject3D(enemy);
  kills += 1;
  bestKills = Math.max(bestKills, kills);
  try { localStorage.setItem('arena-zero-best', String(bestKills)); } catch (_) {}
  updateHUD();
}
function start() {
  started = true;
  gameOver = false;
  runModifiers.damage = 1;
  runModifiers.fireRate = 1;
  runModifiers.reloadSpeed = 1;
  runModifiers.moveSpeed = 1;
  runModifiers.magazine = 1;
  maxHealth = 100;
  health = maxHealth;
  upgradesTaken = 0;
  upgradeChoices = [];
  intermission = false;
  $('upgrade-screen').classList.add('hidden');
  kills = 0;
  wave = 1;
  magazines.rifle = magazineSize('rifle');
  magazines.shotgun = magazineSize('shotgun');
  magazines.precision = magazineSize('precision');
  reloading = false;
  reloadRemaining = 0;
  spawnTimer = 0;
  spawnCooldown = 0;
  spawnQueue = 0;
  lastShot = 0;
  dashCooldown = 0;
  invuln = 0;
  target = null;
  keys = {};
  toastTimer = 0;
  hitTimer = 0;
  damageFlashTimer = 0;
  $('toast').classList.remove('show');
  $('hitmarker').classList.remove('active');
  $('lock-label').classList.remove('visible');
  for (const enemy of enemies) {
    scene.remove(enemy);
    disposeObject3D(enemy);
  }
  enemies.length = 0;
  for (const shot of shots) {
    scene.remove(shot.mesh);
    disposeObject3D(shot.mesh, false);
  }
  shots.length = 0;
  for (const effect of effects) {
    scene.remove(effect.mesh);
    disposeObject3D(effect.mesh);
  }
  effects.length = 0;
  player.position.set(0, 0, 8);
  resolveArenaCollisions(player.position, .55);
  yaw = 0;
  pitch = -.13;
  currentWeapon = 'rifle';
  buildWeaponVisual();
  $('start-screen').classList.add('hidden');
  $('end-screen').classList.add('hidden');
  $('damage-flash').classList.remove('active');
  startWave();
  updateHUD();
  // Pointer lock is optional: browsers may deny it, but that must never cancel deployment.
  try {
    const lockRequest = renderer.domElement.requestPointerLock?.();
    if (lockRequest && typeof lockRequest.catch === 'function') {
      lockRequest.catch(() => showToast('MOUSE LOOK UNAVAILABLE // CLICK THE ARENA TO RETRY'));
    }
  } catch (_) {
    showToast('MOUSE LOOK UNAVAILABLE // KEYBOARD CONTROLS ACTIVE');
  }
}
$('aim-toggle').addEventListener('change', event => { aimAssist = event.target.checked; saveSettings(); });
$('fire-toggle').addEventListener('change', event => { autoFire = event.target.checked; saveSettings(); });
$('graphics-quality').addEventListener('change', event => {
  const selectedQuality = event.target.value;
  if (!Object.prototype.hasOwnProperty.call(GRAPHICS_QUALITY_PRESETS, selectedQuality)) {
    event.target.value = graphicsQuality;
    return;
  }
  graphicsQuality = selectedQuality;
  resizeRenderer();
  saveSettings();
  showToast('GRAPHICS PROFILE // ' + GRAPHICS_QUALITY_PRESETS[graphicsQuality].label);
});
$('aim-range').addEventListener('input', event => {
  aimRange = Number(event.target.value);
  $('range-value').textContent = aimRange + 'm';
  saveSettings();
});
renderer.domElement.addEventListener('click', () => {
  if (started && !gameOver && document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock();
});
renderer.domElement.addEventListener('pointerdown', event => { if (event.button === 0) keys.Mouse0 = true; });
addEventListener('pointerup', event => { if (event.button === 0) keys.Mouse0 = false; });
addEventListener('keydown', event => {
  if (intermission) {
    if (event.code === 'Digit1') chooseUpgrade(0);
    else if (event.code === 'Digit2') chooseUpgrade(1);
    else if (event.code === 'Digit3') chooseUpgrade(2);
    return;
  }
  keys[event.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  if (event.repeat && ['KeyR', 'KeyT', 'KeyF', 'Digit1', 'Digit2', 'Digit3'].includes(event.code)) return;
  if (event.code === 'KeyR') reload();
  if (event.code === 'KeyT') $('aim-toggle').click();
  if (event.code === 'KeyF') $('fire-toggle').click();
  if (event.code === 'Digit1') switchWeapon('rifle');
  if (event.code === 'Digit2') switchWeapon('shotgun');
  if (event.code === 'Digit3') switchWeapon('precision');
  if (event.code === 'Space' && started && dashCooldown <= 0) {
    const direction = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const dashStart = player.position.clone();
    const dashEnd = dashStart.clone().addScaledVector(direction, 5);
    const dashImpact = segmentObstacleHit(
      dashStart.clone().add(new THREE.Vector3(0, 1, 0)),
      dashEnd.clone().add(new THREE.Vector3(0, 1, 0))
    );
    if (dashImpact) {
      player.position.copy(dashStart.addScaledVector(direction, Math.max(0, 5 * dashImpact.t - .65)));
    } else {
      player.position.copy(dashEnd);
    }
    resolveArenaCollisions(player.position, .55);
    player.position.x = THREE.MathUtils.clamp(player.position.x, -21, 21);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -21, 21);
    dashCooldown = 2;
    invuln = .25;
    addBurst(player.position.clone().add(new THREE.Vector3(0, 1, 0)), 0x50e6f2, .35);
  }
});
addEventListener('keyup', event => { keys[event.code] = false; });
addEventListener('blur', () => { keys = {}; });
addEventListener('pointercancel', () => { keys.Mouse0 = false; });
addEventListener('mousemove', event => {
  if (document.pointerLockElement === renderer.domElement) {
    yaw -= event.movementX * .0022;
    pitch = THREE.MathUtils.clamp(pitch - event.movementY * .0018, -.65, .35);
  }
});
// Renderer size, camera projection and pixel ratio are updated together by resizeRenderer().
document.addEventListener('pointerlockerror', () => {
  if (started && !gameOver) showToast('MOUSE LOOK UNAVAILABLE // CLICK THE ARENA TO RETRY');
});

// The HTML bootstrap installs the click handler before this module finishes loading.
// Register only after all game listeners are ready, then replay any early click.
window.__ARENA_ZERO_REGISTER_START__?.(start);

function tick(dt) {
  if (!started || gameOver || intermission) return;
  animationClock += dt;
  invuln = Math.max(0, invuln - dt);
  dashCooldown = Math.max(0, dashCooldown - dt);
  if (reloadRemaining > 0) {
    reloadRemaining -= dt;
    if (reloadRemaining <= 0) {
      magazines[currentWeapon] = magazineSize(currentWeapon);
      reloading = false;
      updateAmmoHUD();
    }
  }
  if (spawnQueue > 0) {
    spawnCooldown -= dt;
    if (spawnCooldown <= 0) {
      makeEnemy();
      spawnQueue--;
      spawnCooldown = .46;
      updateHUD();
    }
  }
  const movement = new THREE.Vector3();
  if (keys.KeyW) movement.z -= 1;
  if (keys.KeyS) movement.z += 1;
  if (keys.KeyA) movement.x -= 1;
  if (keys.KeyD) movement.x += 1;
  const playerMoving = movement.lengthSq() > 0;
  const sprinting = playerMoving && !!keys.ShiftLeft;
  if (playerMoving) {
    movement.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    player.position.addScaledVector(movement, dt * (sprinting ? 10 : 6) * runModifiers.moveSpeed);
  }
  player.position.x = THREE.MathUtils.clamp(player.position.x, -21, 21);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -21, 21);
  resolveArenaCollisions(player.position, .55);
  player.position.x = THREE.MathUtils.clamp(player.position.x, -21, 21);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -21, 21);
  player.rotation.y = yaw;

  const playerCycle = animationClock * (sprinting ? 13 : 9);
  const playerStride = playerMoving ? (sprinting ? .82 : .56) : .025;
  playerParts.leftLeg.hip.rotation.x = Math.sin(playerCycle) * playerStride;
  playerParts.rightLeg.hip.rotation.x = -Math.sin(playerCycle) * playerStride;
  playerParts.leftLeg.knee.rotation.x = Math.max(0, -Math.sin(playerCycle)) * .42;
  playerParts.rightLeg.knee.rotation.x = Math.max(0, Math.sin(playerCycle)) * .42;
  playerParts.leftArm.rotation.x = .38 - Math.sin(playerCycle) * playerStride * .28;
  playerParts.rightArm.rotation.x = .38 + Math.sin(playerCycle) * playerStride * .28;
  playerParts.torso.position.y = 1.3 + (playerMoving ? Math.abs(Math.sin(playerCycle)) * .025 : Math.sin(animationClock * 2) * .012);
  playerParts.head.rotation.y = Math.sin(animationClock * 1.35) * .025;

  const cameraOffset = new THREE.Vector3(0, 4.1, 7.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  camera.position.lerp(player.position.clone().add(cameraOffset), 1 - Math.pow(.001, dt));
  const look = player.position.clone().add(new THREE.Vector3(0, 1.5, 0));
  look.add(new THREE.Vector3(-Math.sin(yaw) * 8, pitch * 5, -Math.cos(yaw) * 8));
  camera.lookAt(look);

  // Keep target acquisition available to auto-fire; aim assist only controls bullet magnetism.
  target = nearestTarget();
  $('lock-label').classList.toggle('visible', aimAssist && !!target);
  if (target) {
    const screen = new THREE.Vector3(target.position.x, target.position.y + 2.5 * target.scale.y, target.position.z).project(camera);
    $('lock-label').style.left = ((screen.x * .5 + .5) * innerWidth) + 'px';
    $('lock-label').style.top = ((-screen.y * .5 + .5) * innerHeight + 16) + 'px';
  }
  if (autoFire && target) shoot();
  else if (keys.Mouse0) shoot();

  for (const enemy of enemies) {
    const data = enemy.userData;
    const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.position);
    const distance = toPlayer.length();
    const direction = toPlayer.clone().normalize();
    // Enemy meshes face local -Z, so invert the direction when calculating yaw.
    enemy.rotation.y = Math.atan2(-direction.x, -direction.z);
    data.animTime += dt;
    const enemyMoving = data.type === 'gunner'
      ? Math.abs(distance - data.range) > 2
      : distance > data.range;
    const gait = enemyMoving ? Math.min(1, data.speed / 2.7) : .035;
    const cycle = data.animTime * (data.type === 'scout' ? 12 : data.type === 'heavy' ? 5.5 : 7.5) + data.animOffset;
    const stride = Math.sin(cycle) * gait * (data.type === 'scout' ? .72 : data.type === 'heavy' ? .34 : .46);
    data.legs.left.upper.rotation.x = stride;
    data.legs.right.upper.rotation.x = -stride;
    data.legs.left.lower.rotation.x = Math.max(0, -stride) * .55;
    data.legs.right.lower.rotation.x = Math.max(0, stride) * .55;
    data.arms.left.upper.rotation.x = -stride * .42;
    data.arms.right.upper.rotation.x = stride * .42 - data.recoil;
    data.arms.left.lower.rotation.x = Math.max(0, stride) * .25;
    data.arms.right.lower.rotation.x = Math.max(0, -stride) * .25;
    data.torso.rotation.z = Math.sin(cycle * .5) * (enemyMoving ? .035 : .012);
    data.head.rotation.x = Math.sin(cycle * .7) * .025;
    data.recoil = Math.max(0, data.recoil - dt * 1.8);
    if (data.hitFlash > 0) {
      data.hitFlash = Math.max(0, data.hitFlash - dt);
      data.shell.emissiveIntensity = 1.5 + (data.hitFlash / .16) * 2.4;
    } else data.shell.emissiveIntensity = 1.5;
    data.cooldown -= dt;
    if (data.type === 'gunner') {
      if (distance > data.range + 2) enemy.position.addScaledVector(direction, data.speed * dt);
      else if (distance < data.range - 2) enemy.position.addScaledVector(direction, -data.speed * .65 * dt);
      if (distance <= data.range + 3 && data.cooldown <= 0) {
        const from = enemy.position.clone().add(new THREE.Vector3(0, 1.25, 0));
        const to = player.position.clone().add(new THREE.Vector3(0, 1, 0));
        projectile(from, to.sub(from), true, data.damage, 17, 'orange');
        data.recoil = .24;
        data.cooldown = data.attackRate;
      }
    } else if (distance > data.range) {
      enemy.position.addScaledVector(direction, data.speed * dt);
    } else if (data.cooldown <= 0) {
      damage(data.damage);
      data.cooldown = data.attackRate;
    }
    resolveArenaCollisions(enemy.position, data.radius * .55);
    enemy.position.x = THREE.MathUtils.clamp(enemy.position.x, -22, 22);
    enemy.position.z = THREE.MathUtils.clamp(enemy.position.z, -22, 22);
  }

  for (let i = shots.length - 1; i >= 0; i--) {
    const shot = shots[i];
    const segmentStart = shot.mesh.position.clone();
    const segmentEnd = segmentStart.clone().addScaledVector(shot.dir, shot.speed * dt);
    shot.mesh.position.copy(segmentEnd);
    shot.life -= dt;
    let hit = false;
    const obstacleImpact = segmentObstacleHit(segmentStart, segmentEnd);
    let firstImpactT = obstacleImpact ? obstacleImpact.t : Infinity;

    if (!shot.hostile) {
      let hitEnemy = null;
      let hitPoint = null;
      for (const enemy of enemies) {
        const center = enemy.position.clone().add(new THREE.Vector3(0, 1.1 * enemy.scale.y, 0));
        const closest = closestPointOnSegment(center, segmentStart, segmentEnd);
        if (closest.distanceToSquared(center) >= enemy.userData.radius * enemy.userData.radius) continue;
        const impactT = segmentParameter(closest, segmentStart, segmentEnd);
        if (impactT < firstImpactT) {
          firstImpactT = impactT;
          hitEnemy = enemy;
          hitPoint = closest;
        }
      }
      if (hitEnemy) {
        registerHit(hitPoint, hitEnemy, shot.damage);
        hit = true;
      }
    } else {
      const playerCenter = player.position.clone().add(new THREE.Vector3(0, 1, 0));
      const closest = closestPointOnSegment(playerCenter, segmentStart, segmentEnd);
      if (closest.distanceToSquared(playerCenter) < .8 * .8) {
        const playerImpactT = segmentParameter(closest, segmentStart, segmentEnd);
        if (playerImpactT < firstImpactT) {
          damage(shot.damage);
          hit = true;
        }
      }
    }

    // A target hit wins only if it is closer along the segment than the cover.
    if (!hit && obstacleImpact) {
      addBurst(obstacleImpact.point, 0x8ba6ba, .09);
      hit = true;
    }
    if (hit || shot.life <= 0 || shot.mesh.position.length() > 55) {
      scene.remove(shot.mesh);
      disposeObject3D(shot.mesh, false);
      shots.splice(i, 1);
    }
  }
  for (let i = effects.length - 1; i >= 0; i--) {
    const effect = effects[i];
    effect.life -= dt;
    if (effect.kind === 'shards') {
      const positions = effect.mesh.geometry.attributes.position;
      for (let point = 0; point < effect.velocities.length; point += 3) {
        positions.array[point] += effect.velocities[point] * dt;
        positions.array[point + 1] += effect.velocities[point + 1] * dt;
        positions.array[point + 2] += effect.velocities[point + 2] * dt;
        effect.velocities[point + 1] -= 4.2 * dt;
      }
      positions.needsUpdate = true;
    } else {
      effect.mesh.scale.multiplyScalar(1 + dt * (effect.kind === 'muzzle' ? 9 : 7));
    }
    effect.mesh.material.opacity = Math.max(0, effect.life / effect.max);
    if (effect.life <= 0) {
      scene.remove(effect.mesh);
      disposeObject3D(effect.mesh);
      effects.splice(i, 1);
    }
  }
  if (spawnQueue === 0 && enemies.length === 0) {
    spawnTimer += dt;
    if (spawnTimer > 1.8) {
      spawnTimer = 0;
      openUpgradeSelection();
    }
  } else if (!intermission) spawnTimer = 0;
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) $('toast').classList.remove('show');
  }
  if (hitTimer > 0) {
    hitTimer -= dt;
    if (hitTimer <= 0) $('hitmarker').classList.remove('active');
  }
  if (damageFlashTimer > 0) {
    damageFlashTimer -= dt;
    if (damageFlashTimer <= 0) $('damage-flash').classList.remove('active');
  }
  if (magazines[currentWeapon] === 0 && !reloading) reload();
}

buildWeaponVisual();
updateHUD();
let previous = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - previous) / 1000, .04);
  previous = now;
  tick(dt);
  dustField.rotation.y += dt * .006;
  for (const ring of floorRingPulses) {
    ring.material.opacity = ring.base + Math.sin(now * .00135 + ring.phase) * .035;
  }
  cyanLight.intensity = 29 + Math.sin(now * .0011) * 1.6;
  orangeLight.intensity = 18 + Math.sin(now * .0009 + 1.4) * 1.0;
  perimeterAccentLight.intensity = 7 + Math.sin(now * .0008 + .7) * .45;
  renderer.render(scene, camera);
}
animate(previous);
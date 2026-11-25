import { parseBinarySTL } from './assets/binary-stl.mjs';
import { createFpsControllerState, resetFpsControllerState, stepFpsController } from './gameplay/fps-controller.mjs';
import {createWeaponSystem,canFireWeapon,consumeWeaponRound,beginWeaponReload,cancelWeaponReload,requestWeaponSwap,stepWeaponSystem,setWeaponCapacity,resetWeaponSystem} from './gameplay/weapon-system.mjs';
import {generatePelletDirections,resolveHitscan} from './gameplay/combat.mjs';
import {createNavigationGrid,createTacticalBrain,stepTacticalBrain,updateTacticalPath} from './gameplay/tactical-ai.mjs';
import {createCoverState,applyCoverDamage} from './gameplay/cover-system.mjs';

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
const camera = new THREE.PerspectiveCamera(82, innerWidth / innerHeight, .1, 150);
camera.rotation.order = 'YXZ';
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

// Optional, read-only render telemetry. Hidden in normal play; enable with ?debug=1 or F3.
let graphicsDiagnosticsEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
const graphicsDebugPanel = $('graphics-debug');
const graphicsFrameSamples = [];
const graphicsBufferSize = new THREE.Vector2();
let lastGraphicsDiagnosticsUpdate = 0;

function setGraphicsDiagnosticsVisible(visible) {
  graphicsDiagnosticsEnabled = Boolean(visible);
  graphicsDebugPanel.classList.toggle('hidden', !graphicsDiagnosticsEnabled);
  if (!graphicsDiagnosticsEnabled) graphicsFrameSamples.length = 0;
}

function updateGraphicsDiagnostics(frameMs, now) {
  if (!graphicsDiagnosticsEnabled) return;
  graphicsFrameSamples.push(Math.max(.1, frameMs));
  if (graphicsFrameSamples.length > 120) graphicsFrameSamples.shift();
  if (now - lastGraphicsDiagnosticsUpdate < 250) return;
  lastGraphicsDiagnosticsUpdate = now;

  const orderedSamples = graphicsFrameSamples.slice().sort((a, b) => a - b);
  const averageFrameMs = orderedSamples.reduce((sum, value) => sum + value, 0) / Math.max(1, orderedSamples.length);
  const p95FrameMs = orderedSamples[Math.min(orderedSamples.length - 1, Math.floor((orderedSamples.length - 1) * .95))] || 0;
  renderer.getDrawingBufferSize(graphicsBufferSize);

  $('debug-fps').textContent = String(Math.round(1000 / Math.max(.1, averageFrameMs)));
  $('debug-frame').textContent = averageFrameMs.toFixed(1) + ' ms';
  $('debug-p95').textContent = p95FrameMs.toFixed(1) + ' ms';
  $('debug-draw-calls').textContent = String(renderer.info.render.calls);
  $('debug-triangles').textContent = renderer.info.render.triangles.toLocaleString();
  $('debug-geometries').textContent = String(renderer.info.memory.geometries);
  $('debug-textures').textContent = String(renderer.info.memory.textures);
  $('debug-scale').textContent = Math.round(renderer.getPixelRatio() * 100) + '%';
  $('debug-buffer').textContent = Math.round(graphicsBufferSize.x) + ' × ' + Math.round(graphicsBufferSize.y);
}

setGraphicsDiagnosticsVisible(graphicsDiagnosticsEnabled);

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

// Deterministic, seamless procedural surface maps. These are generated locally;
// no external image downloads or runtime asset requests are required.
const textureAnisotropy = Math.max(1, Math.min(8, renderer.capabilities.getMaxAnisotropy()));
function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function configureSurfaceTexture(texture, repeatX, repeatY, colorSpace) {
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = textureAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

function createProceduralSurfaceMaps({
  size = 256,
  seed = 1,
  style = 'brushed',
  baseColor = [236, 239, 243],
  roughness = .82,
  roughnessVariation = .1,
  noiseAmplitude = 10,
  repeatX = 1,
  repeatY = 1
} = {}) {
  const random = createSeededRandom(seed);
  const phase = (seed % 997) / 997 * Math.PI * 2;
  const colorCanvas = document.createElement('canvas');
  const normalCanvas = document.createElement('canvas');
  const roughnessCanvas = document.createElement('canvas');
  for (const canvas of [colorCanvas, normalCanvas, roughnessCanvas]) {
    canvas.width = size;
    canvas.height = size;
  }

  const colorContext = colorCanvas.getContext('2d');
  const normalContext = normalCanvas.getContext('2d');
  const roughnessContext = roughnessCanvas.getContext('2d');
  if (!colorContext || !normalContext || !roughnessContext) {
    throw new Error('Canvas 2D is unavailable; procedural surface maps cannot be generated.');
  }

  const colorPixels = colorContext.createImageData(size, size);
  const normalPixels = normalContext.createImageData(size, size);
  const roughnessPixels = roughnessContext.createImageData(size, size);
  const heightField = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      let structure = 0;
      if (style === 'concrete') {
        structure =
          Math.sin(u * Math.PI * 2 * 7 + phase) * .018 +
          Math.cos(v * Math.PI * 2 * 9 + phase * .7) * .016 +
          Math.sin((u + v) * Math.PI * 2 * 13 + phase) * .009;
      } else if (style === 'brushed') {
        structure =
          Math.sin(v * Math.PI * 2 * 76 + phase) * .018 +
          Math.sin(v * Math.PI * 2 * 19 + phase * .4) * .012;
      } else {
        structure =
          Math.sin(u * Math.PI * 2 * 31 + phase) * .01 +
          Math.cos(v * Math.PI * 2 * 27 + phase * .6) * .01 +
          Math.sin((u - v) * Math.PI * 2 * 15 + phase) * .006;
      }

      const index = y * size + x;
      const grain = (random() - .5) * .035;
      heightField[index] = structure + grain;
      const luminance = (random() - .5) * noiseAmplitude + structure * 180;
      const roughnessValue = THREE.MathUtils.clamp(
        roughness + (random() - .5) * roughnessVariation + Math.abs(structure) * .45,
        .08,
        1
      );
      const offset = index * 4;
      colorPixels.data[offset] = THREE.MathUtils.clamp(baseColor[0] + luminance, 0, 255);
      colorPixels.data[offset + 1] = THREE.MathUtils.clamp(baseColor[1] + luminance, 0, 255);
      colorPixels.data[offset + 2] = THREE.MathUtils.clamp(baseColor[2] + luminance, 0, 255);
      colorPixels.data[offset + 3] = 255;
      const roughByte = Math.round(roughnessValue * 255);
      roughnessPixels.data[offset] = roughByte;
      roughnessPixels.data[offset + 1] = roughByte;
      roughnessPixels.data[offset + 2] = roughByte;
      roughnessPixels.data[offset + 3] = 255;
    }
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const left = y * size + (x + size - 1) % size;
      const right = y * size + (x + 1) % size;
      const up = ((y + size - 1) % size) * size + x;
      const down = ((y + 1) % size) * size + x;
      const dx = (heightField[right] - heightField[left]) * 12;
      const dy = (heightField[down] - heightField[up]) * 12;
      let nx = -dx;
      let ny = -dy;
      let nz = 1;
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= length;
      ny /= length;
      nz /= length;
      const offset = (y * size + x) * 4;
      normalPixels.data[offset] = Math.round((nx * .5 + .5) * 255);
      normalPixels.data[offset + 1] = Math.round((ny * .5 + .5) * 255);
      normalPixels.data[offset + 2] = Math.round((nz * .5 + .5) * 255);
      normalPixels.data[offset + 3] = 255;
    }
  }

  colorContext.putImageData(colorPixels, 0, 0);
  normalContext.putImageData(normalPixels, 0, 0);
  roughnessContext.putImageData(roughnessPixels, 0, 0);

  return {
    map: configureSurfaceTexture(new THREE.CanvasTexture(colorCanvas), repeatX, repeatY, THREE.SRGBColorSpace),
    normalMap: configureSurfaceTexture(new THREE.CanvasTexture(normalCanvas), repeatX, repeatY, THREE.NoColorSpace),
    roughnessMap: configureSurfaceTexture(new THREE.CanvasTexture(roughnessCanvas), repeatX, repeatY, THREE.NoColorSpace)
  };
}

function applySurfaceMaps(material, surfaceMaps, normalStrength = .16) {
  material.map = surfaceMaps.map;
  material.normalMap = surfaceMaps.normalMap;
  material.roughnessMap = surfaceMaps.roughnessMap;
  material.normalScale.set(normalStrength, normalStrength);
  material.needsUpdate = true;
}

const floorSurfaceMaps = createProceduralSurfaceMaps({
  size: 512, seed: 241, style: 'concrete', baseColor: [232, 236, 240],
  roughness: .9, roughnessVariation: .08, noiseAmplitude: 13, repeatX: 14, repeatY: 14
});
const industrialSurfaceMaps = createProceduralSurfaceMaps({
  size: 256, seed: 517, style: 'brushed', baseColor: [238, 241, 245],
  roughness: .76, roughnessVariation: .12, noiseAmplitude: 9, repeatX: 2.5, repeatY: 1.5
});
const armorSurfaceMaps = createProceduralSurfaceMaps({
  size: 256, seed: 823, style: 'armor', baseColor: [240, 242, 246],
  roughness: .72, roughnessVariation: .1, noiseAmplitude: 7, repeatX: 1.5, repeatY: 1.5
});

const floorMat = mat(0x0c1723, .86, .34, 0x030811, .2);
applySurfaceMaps(floorMat, floorSurfaceMaps, .24);
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
applySurfaceMaps(wallMat, industrialSurfaceMaps, .15);
applySurfaceMaps(architecturePanelMat, industrialSurfaceMaps, .14);
applySurfaceMaps(architectureRibMat, industrialSurfaceMaps, .1);
applySurfaceMaps(architectureRailMat, industrialSurfaceMaps, .1);
applySurfaceMaps(architectureVentMat, industrialSurfaceMaps, .08);
applySurfaceMaps(architectureVentSlatMat, industrialSurfaceMaps, .1);
applySurfaceMaps(architectureFixtureMat, industrialSurfaceMaps, .08);

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
  arenaColliders.push({ id: 'perimeter-x-' + i, x: i * 24, z: 0, halfX: .5, halfZ: 25, centerY: 3, halfY: 3, material: 'concrete' });
  arenaColliders.push({ id: 'perimeter-z-' + i, x: 0, z: i * 24, halfX: 25, halfZ: .5, centerY: 3, halfY: 3, material: 'concrete' });
  box(arena, i * 23.46, 5.42, 0, .075, .075, 46, cyanMat);
  box(arena, 0, 5.42, i * 23.46, 46, .075, .075, cyanMat);
}
for (let i = 0; i < 4; i++) {
  const a = i * Math.PI / 2;
  const x = Math.cos(a) * 17;
  const z = Math.sin(a) * 17;
  box(arena, x, 2.8, z, 2, 5.6, 2, wallMat);
  box(arena, x, 4.8, z, 2.1, .12, 2.1, cyanMat);
  arenaColliders.push({ id: 'pillar-' + i, x, z, halfX: 1, halfZ: 1, centerY: 2.8, halfY: 2.8, material: 'concrete' });
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
    arenaColliders.push({ id: 'crate-' + i, x, z, halfX: 1.1, halfZ: 1.1, centerY: .9, halfY: .9, material: 'composite' });
  }
}

// VTK barricades receive a synchronous fallback mesh and collider before the first frame.

const coverRuntime = new Map();

function createFallbackCoverVisual() {
  const group = new THREE.Group();
  const panelMaterial = architecturePanelMat.clone();
  panelMaterial.color.setHex(0x526d7d);
  const frameMaterial = architectureRibMat.clone();
  frameMaterial.color.setHex(0x9aabb5);
  const accentMaterial = architectureWarningMat.clone();
  box(group, 0, .09, 0, 3, .18, .78, frameMaterial);
  box(group, 0, .68, 0, 2.72, .88, .28, panelMaterial);
  box(group, 0, 1.17, 0, 2.9, .13, .48, frameMaterial);
  box(group, 0, .67, -.159, 2.18, .42, .035, accentMaterial);
  box(group, 0, .94, -.18, 2.55, .045, .045, frameMaterial);
  box(group, 0, .4, -.18, 2.55, .045, .045, frameMaterial);
  for (const side of [-1, 1]) {
    const brace = box(group, side * 1.24, .64, 0, .22, .92, .54, frameMaterial);
    brace.rotation.z = side * -.12;
    box(group, side * 1.08, .06, 0, .48, .12, .9, frameMaterial);
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .05, 12), accentMaterial);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(side * .92, .72, -.2);
    group.add(bolt);
  }
  return { group, materials: [panelMaterial, frameMaterial], allMaterials: [panelMaterial, frameMaterial, accentMaterial] };
}

function createCoverHealthIndicator() {
  const group = new THREE.Group();
  group.position.set(0, 1.56, -.34);
  const backMaterial = new THREE.MeshBasicMaterial({ color: 0x0a121a, transparent: true, opacity: .88, depthWrite: false });
  const fillMaterial = new THREE.MeshBasicMaterial({ color: 0x54e6b4, depthWrite: false, toneMapped: false });
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.45, .075, .04), backMaterial);
  const fill = new THREE.Mesh(new THREE.BoxGeometry(1.32, .045, .05), fillMaterial);
  fill.position.set(0, 0, -.028);
  group.add(back, fill);
  group.visible = false;
  return { group, fill, materials: [backMaterial, fillMaterial], hideAt: 0 };
}

function selectCoverPlacements() {
  const placements = [], reserved = [];
  const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI / 4, Math.PI * .75, Math.PI * 1.25, Math.PI * 1.75];
  for (const radius of [11.5, 13.5]) {
    for (const angle of angles) {
      const rotation = Math.PI / 2 - angle;
      const cosine = Math.abs(Math.cos(rotation)), sine = Math.abs(Math.sin(rotation));
      const halfX = cosine * 1.5 + sine * .5975 + .04;
      const halfZ = sine * 1.5 + cosine * .5975 + .04;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      if (Math.hypot(x, z - 8) < 3.2) continue;
      const candidate = { id: 'vtk-cover-' + (placements.length + 1), x, z, halfX, halfZ, centerY: .6783, halfY: .6783, material: 'composite' };
      const overlaps = [...arenaColliders, ...reserved].some(other =>
        Math.abs(candidate.x - other.x) < candidate.halfX + other.halfX + .65 &&
        Math.abs(candidate.z - other.z) < candidate.halfZ + other.halfZ + .65
      );
      if (overlaps) continue;
      placements.push({ collider: candidate, position: [x, 0, z], rotation });
      reserved.push(candidate);
      if (placements.length >= 4) return placements;
    }
  }
  return placements;
}

function applyCoverVisualStage(runtime) {
  const stage = runtime.state.stage;
  const palette = {
    intact: { color: 0x526d7d, emissive: 0x000000, intensity: 0 },
    damaged: { color: 0x87674f, emissive: 0x351507, intensity: .28 },
    critical: { color: 0x653b32, emissive: 0x791d0b, intensity: .72 },
    destroyed: { color: 0x342b2a, emissive: 0x000000, intensity: 0 }
  };
  const look = palette[stage] || palette.intact;
  for (const material of runtime.materials) {
    if (material.color) material.color.setHex(look.color);
    if (material.emissive) material.emissive.setHex(look.emissive);
    if ('emissiveIntensity' in material) material.emissiveIntensity = look.intensity;
  }
  const health = runtime.healthBar;
  health.fill.scale.x = Math.max(.001, runtime.state.ratio);
  health.fill.position.x = -.66 * (1 - runtime.state.ratio);
  health.group.visible = !runtime.state.destroyed && runtime.state.health < runtime.state.maxHealth;
  health.hideAt = performance.now() + 2600;
  health.fill.material.color.setHex(stage === 'critical' ? 0xff6c4c : stage === 'damaged' ? 0xffbd62 : 0x54e6b4);
}

const coverPlacements = selectCoverPlacements();
for (const placement of coverPlacements) {
  const state = createCoverState(placement.collider.id, 240);
  const root = new THREE.Group();
  root.position.set(...placement.position);
  root.rotation.y = placement.rotation;
  const fallback = createFallbackCoverVisual();
  root.add(fallback.group);
  const healthBar = createCoverHealthIndicator();
  root.add(healthBar.group);
  arena.add(root);
  const collider = { ...placement.collider, cover: state };
  arenaColliders.push(collider);
  coverRuntime.set(state.id, {
    state, collider, root, fallback: fallback.group,
    materials: fallback.materials, fallbackMaterials: fallback.allMaterials,
    healthBar, visualType: 'fallback'
  });
}

let enemyNavigationGrid = createNavigationGrid(arenaColliders, { min: -22, max: 22, cellSize: 1.5, clearance: .86 });
function rebuildEnemyNavigationGrid() {
  enemyNavigationGrid = createNavigationGrid(arenaColliders, { min: -22, max: 22, cellSize: 1.5, clearance: .86 });
  for (const enemy of enemies) {
    const brain = enemy.userData.brain;
    if (!brain) continue;
    brain.path = [];
    brain.pathIndex = 0;
    brain.repathTimer = 0;
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

const vtkGeometryCache = new Map();
async function loadVTKGeometry(relativePath) {
  if (!vtkGeometryCache.has(relativePath)) {
    const loading = (async () => {
      const response = await fetch(new URL(relativePath, document.baseURI));
      if (!response.ok) throw new Error('VTK asset request failed: ' + relativePath + ' (' + response.status + ')');
      if (typeof DecompressionStream === 'undefined') throw new Error('This browser does not support gzip decompression.');
      const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
      const buffer = await new Response(stream).arrayBuffer();
      const parsed = parseBinarySTL(buffer);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(parsed.positions, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(parsed.normals, 3));
      geometry.computeBoundingSphere();
      return geometry;
    })();
    vtkGeometryCache.set(relativePath, loading);
    loading.catch(() => vtkGeometryCache.delete(relativePath));
  }
  return vtkGeometryCache.get(relativePath);
}

async function loadVTKStaticMesh(relativePath, material, position, rotation = [0, 0, 0]) {
  const geometry = await loadVTKGeometry(relativePath);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.assetPipeline = 'VTK';
  scene.add(mesh);
  return mesh;
}

async function loadVTKEnvironmentAssets() {
  const placements = [
    ['wall_terminal.stl.gz', [23.17, 2.85, 0], [0, Math.PI / 2, 0], architecturePanelMat],
    ['wall_terminal.stl.gz', [-23.17, 2.85, 0], [0, -Math.PI / 2, 0], architecturePanelMat],
    ['wall_terminal.stl.gz', [0, 2.85, 23.17], [0, 0, 0], architecturePanelMat],
    ['wall_terminal.stl.gz', [0, 2.85, -23.17], [0, Math.PI, 0], architecturePanelMat],
    ['floor_service_hatch.stl.gz', [0, .002, -14], [0, 0, 0], architectureRailMat],
    ['floor_service_hatch.stl.gz', [0, .002, 14], [0, Math.PI / 2, 0], architectureRailMat]
  ];
  const results = await Promise.allSettled(placements.map(([file, position, rotation, material]) =>
    loadVTKStaticMesh('assets/vtk/' + file, material, position, rotation)
  ));
  const loaded = results.filter(result => result.status === 'fulfilled').length;
  for (const result of results) if (result.status === 'rejected') console.warn('[ARENA ZERO] Optional VTK prop skipped:', result.reason);
  console.info('[ARENA ZERO] VTK static props loaded:', loaded, '/', placements.length);

  if (coverPlacements.length) {
    try {
      const geometry = await loadVTKGeometry('assets/vtk/cover_barricade.stl.gz');
      for (const runtime of coverRuntime.values()) {
        const material = architecturePanelMat.clone();
        material.color.setHex(0x526d7d);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.assetPipeline = 'VTK';
        mesh.userData.coverId = runtime.state.id;
        runtime.root.add(mesh);
        runtime.root.remove(runtime.fallback);
        disposeObject3D(runtime.fallback, false);
        for (const oldMaterial of runtime.fallbackMaterials) oldMaterial.dispose();
        runtime.fallback = null;
        runtime.materials = [material];
        runtime.visualType = 'vtk';
        runtime.visual = mesh;
        applyCoverVisualStage(runtime);
      }
      console.info('[ARENA ZERO] Functional VTK cover barricades loaded:', coverRuntime.size);
    } catch (error) {
      console.warn('[ARENA ZERO] VTK cover unavailable; functional procedural cover remains active:', error);
    }
  }
}
loadVTKEnvironmentAssets().catch(error => console.warn('[ARENA ZERO] VTK asset pipeline unavailable; using procedural arena:', error));

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
applySurfaceMaps(playerArmor, armorSurfaceMaps, .18);
applySurfaceMaps(playerDark, armorSurfaceMaps, .12);
applySurfaceMaps(playerJoint, industrialSurfaceMaps, .1);
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
const viewModel = new THREE.Group();
camera.add(viewModel);
viewModel.visible = false;
function buildViewModelArm(side) {
  const arm = new THREE.Group();
  arm.position.set(side * .34, -.34, -.48);
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(.125, .34, 4, 8), playerArmor);
  upper.position.set(-side * .055, -.12, 0);
  upper.rotation.z = side * .42;
  arm.add(upper);
  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(.108, .38, 4, 8), playerDark);
  forearm.position.set(-side * .1, -.34, -.15);
  forearm.rotation.z = side * .28;
  arm.add(forearm);
  const cuff = new THREE.Mesh(new THREE.BoxGeometry(.25, .17, .2), playerArmor);
  cuff.position.set(-side * .1, -.42, -.25);
  arm.add(cuff);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(.105, 10, 8), playerJoint);
  hand.position.set(-side * .12, -.52, -.34);
  arm.add(hand);
  arm.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
  return arm;
}
viewModel.add(buildViewModelArm(-1), buildViewModelArm(1));
const gunGroup = new THREE.Group();
viewModel.add(gunGroup);
gunGroup.position.set(-.12, -1.45, 0);
const muzzle = new THREE.Object3D();
viewModel.add(muzzle);
player.position.set(0, 0, 8);
playerRig.visible = false;
const fpsMotion = createFpsControllerState();
let jumpPressed = false, slidePressed = false, recoilPitch = 0, paused = false;
let weaponKick = 0, weaponRollKick = 0, shotSequence = 0;

const weapons = {
  rifle: { name: 'ARC RIFLE', short: 'RIFLE', mag: 30, damage: 29, rate: 145, reload: 1200, pellets: 1, spread: .012, range: 72, speed: 64, recoil: .014, adsFov: 58, color: 0x50e6f2, description: 'CONTROLLED // FULL AUTO' },
  shotgun: { name: 'BREACH-7', short: 'SHOTGUN', mag: 8, damage: 13, rate: 650, reload: 1550, pellets: 7, spread: .105, range: 27, speed: 48, recoil: .052, adsFov: 62, color: 0xffad62, description: '7-PELLET // CLOSE RANGE' },
  precision: { name: 'LONGSHOT', short: 'PRECISION', mag: 6, damage: 105, rate: 850, reload: 1700, pellets: 1, spread: .002, range: 110, speed: 95, recoil: .038, adsFov: 43, color: 0xb99aff, description: 'HIGH IMPACT // SLOW FIRE' }
};
const weaponSystem=createWeaponSystem(weapons);
const magazines=weaponSystem.magazines;
let currentWeapon=weaponSystem.activeId;
function buildWeaponVisual() {
  disposeObject3D(gunGroup);
  gunGroup.clear();
  const def = weapons[currentWeapon];
  const metal = mat(currentWeapon === 'shotgun' ? 0x9b795b : currentWeapon === 'precision' ? 0x8d83b4 : 0x9baebe, .3, .84);
  const darkMetal = mat(0x172635, .48, .74);
  applySurfaceMaps(metal, industrialSurfaceMaps, .12);
  applySurfaceMaps(darkMetal, industrialSurfaceMaps, .08);
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
  muzzle.position.set(.35 + gunGroup.position.x, 1.36 + gunGroup.position.y, barrelZ - barrelLength * .57 + gunGroup.position.z);
  $('weapon-name').textContent = def.name;
  $('weapon-desc').textContent = def.description;
  $('weapon-short').textContent = def.short;
  $('weapon-key-1').classList.toggle('selected', currentWeapon === 'rifle');
  $('weapon-key-2').classList.toggle('selected', currentWeapon === 'shotgun');
  $('weapon-key-3').classList.toggle('selected', currentWeapon === 'precision');
  updateAmmoHUD();
}
function switchWeapon(id) {
  if (!weapons[id] || currentWeapon===id || weaponSystem.status==='swapping') return;
  if(weaponSystem.status==='reloading')cancelWeaponReload(weaponSystem);
  if(requestWeaponSwap(weaponSystem,id))showToast('SWAPPING // '+weapons[id].name);
}
let keys = {};
let yaw = 0, pitch = 0, started = false, gameOver = false;
let aimAssist = false, autoFire = false, aimRange = 24;
let mouseSensitivity = 1.0, fieldOfView = 82;
let health = 100, kills = 0, wave = 1, bestKills = 0;

let dashCooldown = 0, invuln = 0, spawnTimer = 0, spawnCooldown = 0;
let toastTimer = 0, hitTimer = 0, damageFlashTimer = 0, target = null;
let spawnQueue = 0, animationClock = 0;
const enemies = [], shots = [], effects = [];
let enemySequence = 0;
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
  if (saved.version === 2) {
    if (typeof saved.aimAssist === 'boolean') aimAssist = saved.aimAssist;
    if (typeof saved.autoFire === 'boolean') autoFire = saved.autoFire;
    if (Number.isFinite(saved.aimRange)) aimRange = THREE.MathUtils.clamp(saved.aimRange, 8, 36);
    if (Number.isFinite(saved.mouseSensitivity)) mouseSensitivity = THREE.MathUtils.clamp(saved.mouseSensitivity, .5, 2);
    if (Number.isFinite(saved.fieldOfView)) fieldOfView = THREE.MathUtils.clamp(saved.fieldOfView, 70, 105);
  } else {
    aimAssist = false;
    autoFire = false;
  }
  if (saved.graphicsQuality && Object.prototype.hasOwnProperty.call(GRAPHICS_QUALITY_PRESETS, saved.graphicsQuality)) {
    graphicsQuality = saved.graphicsQuality;
  }
} catch (_) {}
$('aim-toggle').checked = aimAssist;
$('fire-toggle').checked = autoFire;
$('aim-range').value = aimRange;
$('graphics-quality').value = graphicsQuality;
$('look-sensitivity').value = mouseSensitivity;
$('fov-range').value = fieldOfView;
$('sensitivity-value').textContent = mouseSensitivity.toFixed(1) + 'x';
$('fov-value').textContent = Math.round(fieldOfView) + '°';
camera.fov = fieldOfView;
camera.updateProjectionMatrix();
resizeRenderer();
$('range-value').textContent = aimRange + 'm';
$('best-kills').textContent = String(bestKills).padStart(3, '0');

function saveSettings() {
  try {
    localStorage.setItem('arena-zero-settings', JSON.stringify({ version: 2, aimAssist, autoFire, aimRange, graphicsQuality, mouseSensitivity, fieldOfView }));
  } catch (_) {}
}
function showToast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  toastTimer = 2.3;
}
function updateAmmoHUD() {
  const capacity=magazineSize(currentWeapon);
  $('ammo').innerHTML=magazines[currentWeapon]+'<span> / '+capacity+'</span><em class="ammo-reserve">'+weaponSystem.reserves[currentWeapon]+' RESERVE</em>';
  $('reload-label').textContent=weaponSystem.status==='reloading'?'RELOADING':weaponSystem.status==='swapping'?'SWAPPING':weaponSystem.status==='firing'?'FIRING':magazines[currentWeapon]===0?'EMPTY':'READY';
}
function updateHUD() {
  $('kills').textContent = String(kills).padStart(3, '0');
  $('wave').textContent = String(wave).padStart(2, '0');
  $('hostiles').textContent = String(enemies.length + spawnQueue).padStart(2, '0');
  $('health-text').textContent = Math.ceil(health) + ' / ' + maxHealth;
  $('health-bar').style.width = (health / maxHealth * 100) + '%';
  $('stamina-bar').style.width = fpsMotion.stamina + '%';
  $('stamina-text').textContent = Math.round(fpsMotion.stamina) + '%';
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
  applySurfaceMaps(shell, armorSurfaceMaps, .16);
  applySurfaceMaps(dark, armorSurfaceMaps, .1);
  applySurfaceMaps(joint, industrialSurfaceMaps, .08);
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
  const enemySeed = ++enemySequence;
  const brain = createTacticalBrain(type, { x: player.position.x, z: player.position.z }, enemySeed * 2654435761);
  const warningRadius = type === 'heavy' ? 3.65 : type === 'scout' ? 2.55 : .82;
  const telegraphMaterial = new THREE.MeshBasicMaterial({
    color: type === 'heavy' ? 0xff684e : type === 'scout' ? 0xffb15e : 0xb99aff,
    transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false
  });
  const attackTelegraph = new THREE.Mesh(
    new THREE.RingGeometry((warningRadius - .1) / cfg.scale, warningRadius / cfg.scale, 48),
    telegraphMaterial
  );
  attackTelegraph.rotation.x = -Math.PI / 2;
  attackTelegraph.position.y = .045;
  attackTelegraph.visible = false;
  enemy.add(attackTelegraph);
  enemy.userData = {
    type, hp: cfg.hp, maxHp: cfg.hp, speed: cfg.speed, damage: cfg.damage,
    range: cfg.range, attackRate: cfg.cooldown, brain, attackTelegraph,
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
      nearest = { point: start.clone().lerp(end, tMin), t: tMin, obstacle };
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
function enemyHitTargets() {
  return enemies.map(enemy => {
    const data=enemy.userData,scale=enemy.scale.x||1;
    const worldPoint=(x,y,z)=>enemy.localToWorld(new THREE.Vector3(x,y,z));
    const zones=[
      {zone:'head',center:worldPoint(0,data.type==='scout'?1.96:2.02,-.015),radius:.29*scale,damageMultiplier:2},
      {zone:'torso',center:worldPoint(0,1.3,-.015),radius:(data.type==='heavy'?.58:data.type==='gunner'?.47:.39)*scale,damageMultiplier:1}
    ];
    if(data.type==='heavy')zones.push({zone:'core',center:worldPoint(0,1.58,.67),radius:.12*scale,damageMultiplier:2.4});
    return{id:enemy.uuid,target:enemy,zones};
  });
}
function addBulletTracer(start,end,color,opacity=.7){
  const geometry=new THREE.BufferGeometry().setFromPoints([start,end]);
  const material=new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false});
  const line=new THREE.Line(geometry,material);scene.add(line);
  effects.push({mesh:line,life:.075,max:.075,kind:'tracer'});
}
function addSurfaceImpact(position,normal,surface){
  const palette={concrete:0x9aabb8,composite:0x65dce8,metal:0xffba72},color=palette[surface]||palette.concrete;
  const decal=new THREE.Mesh(new THREE.CircleGeometry(surface==='metal'?.075:.09,12),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:.88,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
  const n=new THREE.Vector3(normal.x,normal.y,normal.z);if(n.lengthSq()<.5)n.set(0,1,0);n.normalize();
  decal.position.copy(position).addScaledVector(n,.012);decal.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n);
  scene.add(decal);effects.push({mesh:decal,life:.58,max:.58,kind:'impact'});
  if(surface==='metal')addShardBurst(position,color,4,.24);else addBurst(position,color,.075);
}
function damageCover(obstacle, amount, impactPoint) {
  if (!obstacle?.cover) return false;
  const result = applyCoverDamage(obstacle.cover, amount);
  if (!result.applied) return false;
  const runtime = coverRuntime.get(obstacle.cover.id);
  if (runtime) applyCoverVisualStage(runtime);
  if (result.destroyed) {
    const index = arenaColliders.indexOf(obstacle);
    if (index >= 0) arenaColliders.splice(index, 1);
    if (runtime) {
      runtime.root.visible = false;
      runtime.healthBar.group.visible = false;
    }
    const burstPoint = impactPoint || new THREE.Vector3(obstacle.x, .8, obstacle.z);
    addBurst(burstPoint, 0xff8a55, .42);
    addShardBurst(burstPoint, 0xffad72, 14, .62);
    rebuildEnemyNavigationGrid();
    showToast('BARRICADE DESTROYED // ROUTES OPEN');
  }
  return result;
}
function shoot() {
  // Fire cadence is def.rate / runModifiers.fireRate and is enforced by the weapon state machine.
  // Player fire resolves synchronously against the nearest world obstruction or enemy zone.
  const def=weapons[currentWeapon],shotTime=performance.now();
  if(!canFireWeapon(weaponSystem,currentWeapon,shotTime,runModifiers.fireRate)||
     !consumeWeaponRound(weaponSystem,currentWeapon,shotTime,runModifiers.fireRate))return;
  recoilPitch = Math.min(.18, recoilPitch + def.recoil * (keys.Mouse2 ? .72 : 1));
  weaponKick=Math.min(.2,weaponKick+def.recoil*(currentWeapon==='shotgun'?2.8:2.1));
  weaponRollKick=THREE.MathUtils.clamp(weaponRollKick+(currentWeapon==='shotgun'?.035:currentWeapon==='precision'?.018:.009),-.09,.09);
  const origin=new THREE.Vector3();muzzle.getWorldPosition(origin);
  let baseDirection;
  if(aimAssist&&target&&enemies.includes(target)){
    const aimPoint=target.position.clone().add(new THREE.Vector3(0,1.25*target.scale.y,0));baseDirection=aimPoint.sub(origin).normalize();
  }else{
    const cameraForward=camera.getWorldDirection(new THREE.Vector3()),crosshairPoint=camera.position.clone().addScaledVector(cameraForward,def.range);
    baseDirection=crosshairPoint.sub(origin).normalize();
  }
  shotSequence=(shotSequence+1)>>>0;
  const seed=(0x0A2E2026^Math.imul(shotSequence,0x9e3779b9))>>>0;
  const directions=generatePelletDirections({x:baseDirection.x,y:baseDirection.y,z:baseDirection.z},def.pellets,def.spread,seed);
  const targets=enemyHitTargets(),tracerColor=currentWeapon==='precision'?0xb99aff:currentWeapon==='shotgun'?0xffad62:0x50e6f2;
  let criticalHit=false;
  for(let index=0;index<directions.length;index++){
    const hit=resolveHitscan({origin:{x:origin.x,y:origin.y,z:origin.z},direction:directions[index],maxDistance:def.range,obstacles:arenaColliders,targets});
    const endpoint=new THREE.Vector3(hit.point.x,hit.point.y,hit.point.z);
    if(currentWeapon!=='shotgun'||index<3)addBulletTracer(origin,endpoint,tracerColor,currentWeapon==='shotgun'?.34:.72);
    if(hit.kind==='enemy'){
      criticalHit ||= hit.zone==='head'||hit.zone==='core';
      const victim = hit.target.target;
      registerHit(endpoint, victim, def.damage * runModifiers.damage, hit);
      if(!enemies.includes(victim)){const removed=targets.indexOf(hit.target);if(removed>=0)targets.splice(removed,1);}
    }else if(hit.kind==='obstacle'){
      const obstacle=arenaColliders.find(item=>item.id===hit.obstacleId);
      if(obstacle?.cover)damageCover(obstacle,def.damage*runModifiers.damage,endpoint);
      addSurfaceImpact(endpoint,hit.normal,hit.material);
    }
  }
  $('hitmarker').classList.toggle('headshot',criticalHit);
  addMuzzleFlash(origin,baseDirection,def.color,currentWeapon);updateAmmoHUD();
}
// Reload duration uses def.reload / 1000 / runModifiers.reloadSpeed inside the weapon state module.
function reload() {
  if(beginWeaponReload(weaponSystem,currentWeapon,magazineSize(currentWeapon),runModifiers.reloadSpeed))updateAmmoHUD();
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
    paused = false;
    viewModel.visible = false;
    $('pause-screen').classList.add('hidden');
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
function registerHit(position,enemy,damageAmount,hitInfo={}){
  const critical=hitInfo.zone==='head'||hitInfo.zone==='core';
  enemy.userData.hp=Math.max(0,enemy.userData.hp-damageAmount*(hitInfo.damageMultiplier||1));
  const ratio=THREE.MathUtils.clamp(enemy.userData.hp/enemy.userData.maxHp,0,1);
  enemy.userData.barFill.scale.x=Math.max(.001,ratio);enemy.userData.barFill.position.x=-.6*(1-ratio);
  addBurst(position,critical?0xffe08a:enemy.userData.type==='gunner'?0xb99aff:0xffa15a,critical?.21:.13);
  if(critical)addShardBurst(position,0xffe08a,5,.28);
  enemy.userData.hitFlash=critical?.22:.16;enemy.userData.recoil=critical?.32:.2;hitTimer=critical?.2:.12;
  $('hitmarker').classList.add('active');$('hitmarker').classList.toggle('headshot',critical);
  if(enemy.userData.hp<=0)eliminateEnemy(enemy);
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
  paused = false;
  $('pause-screen').classList.add('hidden');
  viewModel.visible = true;
  resetFpsControllerState(fpsMotion);
  jumpPressed = false;
  slidePressed = false;
  recoilPitch = 0;
  weaponKick = 0;
  weaponRollKick = 0;
  shotSequence = 0;
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
  resetWeaponSystem(weaponSystem);
  for(const id of Object.keys(weapons))setWeaponCapacity(weaponSystem,id,magazineSize(id),true);
  currentWeapon=weaponSystem.activeId;
  spawnTimer = 0;
  spawnCooldown = 0;
  spawnQueue = 0;
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
  enemySequence = 0;
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
  resolveArenaCollisions(player.position, .45);
  yaw = 0;
  pitch = 0;
  camera.position.set(player.position.x, player.position.y + 1.68, player.position.z);
  camera.rotation.set(0, 0, 0, 'YXZ');
  camera.fov = fieldOfView;
  camera.updateProjectionMatrix();
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
$('look-sensitivity').addEventListener('input', event => {
  mouseSensitivity = THREE.MathUtils.clamp(Number(event.target.value) || 1, .5, 2);
  $('sensitivity-value').textContent = mouseSensitivity.toFixed(1) + 'x';
  saveSettings();
});
$('fov-range').addEventListener('input', event => {
  fieldOfView = THREE.MathUtils.clamp(Number(event.target.value) || 82, 70, 105);
  $('fov-value').textContent = Math.round(fieldOfView) + '°';
  if (!keys.Mouse2) camera.fov = fieldOfView;
  camera.updateProjectionMatrix();
  saveSettings();
});
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
renderer.domElement.addEventListener('contextmenu', event => event.preventDefault());
renderer.domElement.addEventListener('pointerdown', event => {
  if (event.button === 0) keys.Mouse0 = true;
  if (event.button === 2) keys.Mouse2 = true;
});
addEventListener('pointerup', event => {
  if (event.button === 0) keys.Mouse0 = false;
  if (event.button === 2) keys.Mouse2 = false;
});
addEventListener('keydown', event => {
  if (event.code === 'F3') {
    if (!event.repeat) setGraphicsDiagnosticsVisible(!graphicsDiagnosticsEnabled);
    event.preventDefault();
    return;
  }
  if (event.code === 'Escape' && started && !gameOver && !intermission) {
    event.preventDefault();
    if (paused) resumeGame();
    else pauseGame();
    return;
  }
  if (paused) return;
  if (intermission) {
    if (event.code === 'Digit1') chooseUpgrade(0);
    else if (event.code === 'Digit2') chooseUpgrade(1);
    else if (event.code === 'Digit3') chooseUpgrade(2);
    return;
  }
  keys[event.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ControlLeft', 'ControlRight'].includes(event.code)) event.preventDefault();
  if (event.repeat && ['Space', 'KeyQ', 'KeyR', 'KeyT', 'KeyF', 'Digit1', 'Digit2', 'Digit3'].includes(event.code)) return;
  if (event.code === 'Space') jumpPressed = true;
  if (['ControlLeft', 'ControlRight', 'KeyC'].includes(event.code)) slidePressed = true;
  if (event.code === 'KeyR') reload();
  if (event.code === 'KeyT') $('aim-toggle').click();
  if (event.code === 'KeyF') $('fire-toggle').click();
  if (event.code === 'Digit1') switchWeapon('rifle');
  if (event.code === 'Digit2') switchWeapon('shotgun');
  if (event.code === 'Digit3') switchWeapon('precision');
  if (event.code === 'KeyQ' && started && dashCooldown <= 0) {
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
    resolveArenaCollisions(player.position, .45);
    player.position.x = THREE.MathUtils.clamp(player.position.x, -21, 21);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -21, 21);
    fpsMotion.velocityX = 0;
    fpsMotion.velocityZ = 0;
    dashCooldown = 2;
    invuln = .25;
    addBurst(player.position.clone().add(new THREE.Vector3(0, 1, 0)), 0x50e6f2, .35);
  }
});
addEventListener('keyup', event => { keys[event.code] = false; });
addEventListener('blur', () => { keys = {}; jumpPressed = false; slidePressed = false; });
addEventListener('pointercancel', () => { keys.Mouse0 = false; keys.Mouse2 = false; });
addEventListener('mousemove', event => {
  if (document.pointerLockElement === renderer.domElement && !paused) {
    yaw -= event.movementX * .0022 * mouseSensitivity;
    pitch = THREE.MathUtils.clamp(pitch - event.movementY * .0018 * mouseSensitivity, -1.48, 1.48);
  }
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== renderer.domElement) {
    keys.Mouse0 = false;
    keys.Mouse2 = false;
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && started && !gameOver && !intermission && !paused) pauseGame();
});
// Renderer size, camera projection and pixel ratio are updated together by resizeRenderer().
document.addEventListener('pointerlockerror', () => {
  if (started && !gameOver) showToast('MOUSE LOOK UNAVAILABLE // CLICK THE ARENA TO RETRY');
});

// The HTML bootstrap installs the click handler before this module finishes loading.
// Register only after all game listeners are ready, then replay any early click.
window.__ARENA_ZERO_REGISTER_START__?.(start);

function pauseGame() {
  if (paused || !started || gameOver || intermission) return;
  paused = true;
  keys = {};
  jumpPressed = false;
  slidePressed = false;
  viewModel.visible = false;
  $('pause-screen').classList.remove('hidden');
  document.exitPointerLock?.();
}
function resumeGame() {
  if (!paused || gameOver) return;
  paused = false;
  $('pause-screen').classList.add('hidden');
  viewModel.visible = true;
  try {
    const request = renderer.domElement.requestPointerLock?.();
    if (request && typeof request.catch === 'function') request.catch(() => showToast('MOUSE LOOK UNAVAILABLE // KEYBOARD CONTROLS ACTIVE'));
  } catch (_) {}
}
$('resume-button').addEventListener('click', resumeGame);

function tick(dt) {
  if (!started || gameOver || intermission || paused) return;
  animationClock += dt;
  const coverNow = performance.now();
  for (const runtime of coverRuntime.values()) {
    if (runtime.healthBar.group.visible && coverNow > runtime.healthBar.hideAt) runtime.healthBar.group.visible = false;
  }
  invuln = Math.max(0, invuln - dt);
  dashCooldown = Math.max(0, dashCooldown - dt);
  const weaponStep=stepWeaponSystem(weaponSystem,dt);
  if(weaponStep.swappedTo){currentWeapon=weaponStep.swappedTo;buildWeaponVisual();}
  else if(weaponStep.reloaded)updateAmmoHUD();
  if (spawnQueue > 0) {
    spawnCooldown -= dt;
    if (spawnCooldown <= 0) {
      makeEnemy();
      spawnQueue--;
      spawnCooldown = .46;
      updateHUD();
    }
  }
  const crouching = Boolean(keys.ControlLeft || keys.ControlRight || keys.KeyC);
  const motion = stepFpsController(fpsMotion, {
    yaw,
    moveX: (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0),
    moveForward: (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0),
    sprint: Boolean(keys.ShiftLeft || keys.ShiftRight),
    crouch: crouching,
    jumpPressed,
    slidePressed
  }, dt, runModifiers.moveSpeed);
  jumpPressed = false;
  slidePressed = false;
  const previousX = player.position.x, previousZ = player.position.z;
  player.position.x += motion.dx;
  player.position.z += motion.dz;
  player.position.y = motion.height;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -21, 21);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -21, 21);
  const beforeCollisionX = player.position.x, beforeCollisionZ = player.position.z;
  resolveArenaCollisions(player.position, .45);
  player.position.x = THREE.MathUtils.clamp(player.position.x, -21, 21);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -21, 21);
  if (Math.abs(player.position.x - beforeCollisionX) > .001 || Math.abs(player.position.x - previousX - motion.dx) > .03) fpsMotion.velocityX = 0;
  if (Math.abs(player.position.z - beforeCollisionZ) > .001 || Math.abs(player.position.z - previousZ - motion.dz) > .03) fpsMotion.velocityZ = 0;
  player.rotation.y = yaw;

  const aiming = Boolean(keys.Mouse2);
  const eyeHeight = THREE.MathUtils.lerp(1.68, 1.08, motion.crouchBlend);
  camera.position.set(player.position.x, player.position.y + eyeHeight, player.position.z);
  recoilPitch = Math.max(0, recoilPitch - dt * 1.65);
  camera.rotation.set(THREE.MathUtils.clamp(pitch + recoilPitch, -1.48, 1.48), yaw, 0, 'YXZ');
  const targetFov = aiming ? weapons[currentWeapon].adsFov : fieldOfView;
  camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 12, dt);
  camera.updateProjectionMatrix();
  const bob = motion.moving ? Math.sin(motion.bobPhase) * (motion.sprinting ? .021 : .009) : 0;
  const sway = motion.moving ? Math.sin(motion.bobPhase * .5) * .008 : 0;
  weaponKick = Math.max(0, weaponKick - dt * (aiming ? .95 : 1.45));
  weaponRollKick = THREE.MathUtils.damp(weaponRollKick, 0, 11, dt);
  viewModel.position.set(sway, -.025 - motion.crouchBlend * .075 + bob - weaponKick, (aiming ? -.045 : 0) + weaponKick * .18);
  viewModel.rotation.set((aiming ? .018 : 0) + weaponKick * .16, 0, Math.sin(motion.bobPhase * .5) * (motion.moving ? .012 : .003) + weaponRollKick);
  $('game-shell').classList.toggle('is-aiming', aiming);
  $('stamina-bar').style.width = motion.stamina + '%';
  $('stamina-text').textContent = Math.round(motion.stamina) + '%';

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
    const brain = data.brain;
    const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.position);
    const distance = toPlayer.length();
    const direction = distance > .001 ? toPlayer.clone().normalize() : new THREE.Vector3(0, 0, -1);
    const sightOrigin = enemy.position.clone().add(new THREE.Vector3(0, 1.25 * enemy.scale.y, 0));
    const sightTarget = player.position.clone().add(new THREE.Vector3(0, 1.05, 0));
    const hasLineOfSight = !segmentObstacleHit(sightOrigin, sightTarget);

    // Enemies only update their last-known position when the player is actually visible.
    if (hasLineOfSight) {
      brain.lastKnown.x = player.position.x;
      brain.lastKnown.z = player.position.z;
      brain.lostSightTime = 0;
    } else {
      brain.lostSightTime += dt;
    }

    const attackDistance = data.type === 'heavy' ? 3.65 : data.type === 'scout' ? data.range + .7 : data.range + 2.5;
    const canAttack = hasLineOfSight && distance <= attackDistance &&
      (data.type !== 'gunner' || distance >= 7.0);
    const attackStep = stepTacticalBrain(brain, {
      dt, type: data.type, canAttack, hasLineOfSight, attackRate: data.attackRate
    });
    const busy = brain.state === 'windup' || brain.state === 'recover';

    // A visible, short-lived ground warning makes melee and heavy slam attacks dodgeable.
    const telegraph = data.attackTelegraph;
    if (attackStep.telegraph) {
      telegraph.visible = true;
      telegraph.material.opacity = .38 + (Math.sin(animationClock * 24) + 1) * .11;
    } else {
      telegraph.material.opacity = Math.max(0, telegraph.material.opacity - dt * 2.8);
      if (telegraph.material.opacity < .015) telegraph.visible = false;
    }

    let waypoint = null;
    if (!busy) {
      waypoint = updateTacticalPath(
        brain, enemy.position, brain.lastKnown, enemyNavigationGrid, arenaColliders, dt, data.type
      );
    }
    const moveDirection = new THREE.Vector3();
    if (waypoint && !busy) {
      moveDirection.set(waypoint.x - enemy.position.x, 0, waypoint.z - enemy.position.z);
      const remaining = moveDirection.length();
      if (remaining > .2) {
        moveDirection.multiplyScalar(1 / remaining);
        const speed = data.speed * (data.type === 'gunner' && hasLineOfSight && distance < 9 ? 1.12 : 1);
        enemy.position.addScaledVector(moveDirection, Math.min(speed * dt, remaining));
      } else {
        moveDirection.set(0, 0, 0);
      }
    }

    // Face the player only while visible; otherwise search toward the last known position.
    const knownDirection = new THREE.Vector3(brain.lastKnown.x - enemy.position.x, 0, brain.lastKnown.z - enemy.position.z);
    const facing = hasLineOfSight ? direction : moveDirection.lengthSq() > .001 ? moveDirection : knownDirection;
    if (facing.lengthSq() > .001) enemy.rotation.y = Math.atan2(-facing.x, -facing.z);

    data.animTime += dt;
    const enemyMoving = moveDirection.lengthSq() > .001 && !busy;
    const gait = enemyMoving ? Math.min(1, data.speed / 2.7) : .025;
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

    if (attackStep.attack) {
      if (data.type === 'gunner') {
        const from = enemy.position.clone().add(new THREE.Vector3(0, 1.25 * enemy.scale.y, 0));
        const to = player.position.clone().add(new THREE.Vector3(0, 1, 0));
        projectile(from, to.sub(from), true, data.damage, 17, 'orange');
        data.recoil = .42;
        addBurst(from, 0xb99aff, .13);
      } else if (data.type === 'scout') {
        if (hasLineOfSight && distance <= data.range + .85) {
          damage(data.damage);
          addBurst(player.position.clone().add(new THREE.Vector3(0, .8, 0)), 0xffa15a, .22);
        }
        data.recoil = .48;
      } else {
        // Heavy slam: the player can escape the clearly marked radius before impact.
        if (hasLineOfSight && distance <= 3.75) {
          damage(data.damage);
          addBurst(player.position.clone().add(new THREE.Vector3(0, .12, 0)), 0xff684e, .48);
        } else {
          addBurst(enemy.position.clone().add(new THREE.Vector3(0, .16, 0)), 0xff684e, .28);
        }
        data.recoil = .58;
      }
    }

    const beforeCollision = enemy.position.clone();
    resolveArenaCollisions(enemy.position, data.radius * .55);
    enemy.position.x = THREE.MathUtils.clamp(enemy.position.x, -22, 22);
    enemy.position.z = THREE.MathUtils.clamp(enemy.position.z, -22, 22);
    const actualMovement = enemy.position.distanceTo(beforeCollision);
    if (waypoint && !busy && actualMovement < Math.min(.025, data.speed * dt * .12)) {
      brain.stuckTime += dt;
      if (brain.stuckTime > .62) {
        brain.repathTimer = 0;
        brain.pathIndex = brain.path.length;
        brain.strafeSign *= -1;
        brain.stuckTime = 0;
      }
    } else {
      brain.stuckTime = 0;
    }
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
      if (obstacleImpact.obstacle?.cover) damageCover(obstacleImpact.obstacle, shot.damage, obstacleImpact.point);
      addBurst(obstacleImpact.point, obstacleImpact.obstacle?.cover ? 0xffa66b : 0x8ba6ba, .09);
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
  if(magazines[currentWeapon]===0&&weaponSystem.reserves[currentWeapon]>0&&weaponSystem.status!=='reloading'&&weaponSystem.status!=='swapping')reload();
}

buildWeaponVisual();
updateHUD();
let previous = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const frameMs = Math.max(0, now - previous);
  const dt = Math.min(frameMs / 1000, .04);
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
  updateGraphicsDiagnostics(frameMs, now);
}
animate(previous);
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, js, css, readme, workflow, graphicsPrompt, roadmap, graphicsAudit, fpsPrompt, vtkDoc, vtkGenerator] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('src/main.js', 'utf8'),
  readFile('src/styles.css', 'utf8'),
  readFile('README.md', 'utf8'),
  readFile('.github/workflows/deploy.yml', 'utf8'),
  readFile('docs/GRAPHICS_MASTER_PROMPT.md', 'utf8'),
  readFile('docs/ROADMAP.md', 'utf8'),
  readFile('docs/GRAPHICS_AUDIT.md', 'utf8'),
  readFile('docs/FPS_MASTER_PROMPT.md', 'utf8'),
  readFile('docs/VTK_ASSET_PIPELINE.md', 'utf8'),
  readFile('tools/vtk/generate_arena_assets.py', 'utf8')
]);

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML contains duplicate element IDs');

const referencedIds = [...new Set([...js.matchAll(/\$\(['"]([^'"]+)['"]\)/g)].map(match => match[1]))];
const missingIds = referencedIds.filter(id => !ids.includes(id));
assert.deepEqual(missingIds, [], 'Game code references missing HTML IDs');

for (const id of ['game', 'start-button', 'restart-button', 'aim-toggle', 'fire-toggle', 'aim-range', 'weapon-name', 'weapon-desc', 'weapon-short', 'weapon-key-1', 'weapon-key-2', 'weapon-key-3', 'hitmarker', 'damage-flash', 'best-kills', 'upgrade-screen', 'upgrade-round', 'upgrade-options', 'upgrade-count']) {
  assert.ok(ids.includes(id), 'Required HUD element is missing: ' + id);
}

assert.match(html, /href=["']\.\/src\/styles\.css["']/);
assert.match(html, /src=["']\.\/src\/main\.js["']/);
assert.ok(html.includes('id="boot-error"'), 'Startup error feedback is missing');
assert.ok(html.includes('<span id="weapon-short">RIFLE</span> <b id="reload-label">READY</b>'), 'Weapon label must not contain and erase the reload status element');
assert.ok(html.includes('window.__ARENA_ZERO_REGISTER_START__'), 'Early start-button bootstrap is missing');
assert.ok(html.includes('role="dialog" aria-modal="true"'), 'Upgrade selection must be an accessible modal');
assert.ok(html.includes('id="upgrade-count"'), 'Upgrade counter is missing from the HUD');
assert.ok(html.indexOf('window.__ARENA_ZERO_REGISTER_START__') < html.indexOf('src="./src/main.js"'), 'Start buttons must bind before the game module loads');
assert.ok(js.includes('async function loadThreeModule()'), 'Three.js CDN fallback loader is missing');
assert.ok(js.includes("https://unpkg.com/three@0.160.0/build/three.module.js"), 'Secondary Three.js CDN is missing');
assert.ok(js.includes('window.__ARENA_ZERO_REGISTER_START__?.(start)'), 'Game start callback is not registered');
assert.ok(js.includes("lockRequest.catch("), 'Pointer-lock rejection must not block deployment');
assert.doesNotMatch(js, /\$\(['"]start-button['"]\)\.addEventListener\('click'/, 'Start click must not depend on late module initialization');
assert.match(js, /camera\.getWorldDirection/);
assert.ok(js.includes('const playerRig = new THREE.Group()'));
assert.ok(js.includes('emissiveIntensity = 1.5'), 'Material helper must expose emissive intensity');
assert.ok(js.includes('roughness: THREE.MathUtils.clamp(roughness, .04, 1)'), 'PBR roughness must be bounded');
assert.ok(js.includes('metalness: THREE.MathUtils.clamp(metalness, 0, 1)'), 'PBR metalness must be bounded');
assert.ok(js.includes('const playerVisorMat = new THREE.MeshPhysicalMaterial('), 'Clear-coated visor material is missing');
assert.ok(js.includes('clearcoat: .92'), 'Visor clearcoat setting is missing');
assert.match(readme, /Visual Build 0\.8/);
assert.ok(js.includes('function addInstancedBoxes('), 'Instanced architecture helper is missing');
assert.ok(js.includes('function buildArenaArchitectureDetails()'), 'Arena architecture detail pass is missing');
assert.ok(js.includes('buildArenaArchitectureDetails();'), 'Arena architecture detail pass is not initialized');
assert.ok(js.includes('new THREE.InstancedMesh(architectureUnitBox'), 'Repeated architecture details must use instancing');
assert.ok(js.includes('batch.computeBoundingSphere();'), 'Instanced architecture bounds must be computed');
assert.ok(js.includes('const frontFillLight = new THREE.DirectionalLight'), 'Front fill light is missing');
assert.ok(js.includes('const perimeterAccentLight = new THREE.PointLight'), 'Perimeter accent light is missing');
assert.ok(js.includes('keyLight.shadow.camera.updateProjectionMatrix();'), 'Updated shadow camera projection is missing');
assert.ok(js.includes('keyLight.shadow.mapSize.set(1536, 1536)'), 'Shadow-map budget must remain explicitly bounded');
assert.ok(js.includes('perimeterAccentLight.intensity = 7 +'), 'Perimeter light pulse is missing');
assert.match(readme, /Visual Build 0\.6–0\.7/);
assert.match(readme, /Visual Build 0\.6/);
assert.match(graphicsPrompt, /## 12\. Ordered upgrade sequence/);
assert.match(graphicsPrompt, /Inspect\. Plan\. Implement one subsystem/);
assert.ok(js.includes('function buildPlayerArm('));
assert.ok(js.includes('function addMuzzleFlash('), 'Weapon muzzle flash function is missing');
assert.ok(js.includes('function addShardBurst('), 'Enemy death shard effect is missing');
assert.ok(js.includes('new THREE.CapsuleGeometry(hostile ? .06 : .038'), 'Directional capsule projectile is missing');
assert.ok(js.includes('positions.needsUpdate = true;'), 'Particle positions are not marked for GPU update');
assert.ok(js.includes("effect.kind === 'shards'"), 'Shard particle update path is missing');
assert.match(readme, /Visual Build 1\.1/);
assert.match(roadmap, /## 1\.1 — Combat effects/);
assert.ok(js.includes('const weaponCoolingVents = []'), 'Weapon cooling vents are missing');
assert.ok(js.includes('const scopeLensMat = new THREE.MeshPhysicalMaterial('), 'Precision optic material is missing');
assert.ok(js.includes('new THREE.CylinderGeometry(.032, .032, .16, 8)'), 'Shotgun shell details are missing');
assert.ok(js.includes('Exposed energy cell distinguishes the ARC rifle'), 'ARC rifle energy cell is missing');
assert.match(readme, /Visual Build 1\.0/);
assert.match(roadmap, /## 1\.0 — Weapon modelling and optics/);
assert.ok(js.includes('const shoulderGuard = new THREE.Mesh(new THREE.SphereGeometry(.25, 12, 10), playerArmor)'), 'Player shoulder armor is missing');
assert.ok(js.includes('box(hip, 0, -.23, -.15, .28, .28, .11, playerArmor)'), 'Player thigh armor is missing');
assert.ok(js.includes('const enemyChestPlate = new THREE.Mesh('), 'Enemy chest armor is missing');
assert.ok(js.includes('const upperArmor = new THREE.Mesh('), 'Enemy upper-limb armor is missing');
assert.ok(js.includes('const lowerArmor = new THREE.Mesh('), 'Enemy lower-limb armor is missing');
assert.match(readme, /Visual Build 0\.9/);
assert.match(roadmap, /## 0\.6 — Environment visual upgrade/);
assert.match(roadmap, /## 0\.7 — Lighting and shadows/);
assert.match(roadmap, /## 0\.8 — PBR materials and surface response/);
assert.match(roadmap, /## 0\.9 — Character silhouette and armor detail/);
assert.match(roadmap, /## 2\.0 — Performance and release QA/);
assert.ok(ids.includes('graphics-quality'), 'Graphics quality selector is missing');
assert.ok(ids.includes('graphics-quality-note'), 'Graphics quality feedback is missing');
assert.match(html, /<option value="low">LOW \/\/ PERFORMANCE<\/option>/);
assert.match(html, /<option value="medium">MEDIUM \/\/ BALANCED<\/option>/);
assert.match(html, /<option value="high">HIGH \/\/ DETAIL<\/option>/);
assert.match(html, /<option value="ultra">ULTRA \/\/ MAXIMUM<\/option>/);
assert.ok(js.includes('const GRAPHICS_QUALITY_PRESETS = Object.freeze({'), 'Graphics profiles are missing');
assert.ok(js.includes('function getGraphicsPixelRatio(width, height)'), 'Pixel-budget calculation is missing');
assert.ok(js.includes('function resizeRenderer()'), 'Coordinated renderer resize function is missing');
assert.ok(js.includes('renderer.setPixelRatio(nextPixelRatio);'), 'Quality profile is not applied to the renderer');
assert.ok(js.includes('renderer.setSize(width, height, false);'), 'Renderer must preserve CSS-controlled canvas sizing');
assert.ok(js.includes('window.visualViewport?.addEventListener'), 'Visual viewport resize handling is missing');
assert.ok(js.includes('new ResizeObserver(resizeRenderer)'), 'Container resize observation is missing');
assert.ok(js.includes('graphicsQuality, mouseSensitivity, fieldOfView }'), 'Graphics quality and FPS preferences are not persisted with settings');
assert.match(css, /\.graphics-quality-control/);
assert.match(readme, /## Graphics quality/);
assert.match(readme, /Visual Build 1\.2/);
assert.match(graphicsAudit, /No browser-rendered screenshot/);
assert.match(graphicsAudit, /Runtime baseline limitations/);
assert.ok(roadmap.includes('## 1.2 — Rendering pipeline and resolution'));
assert.ok(js.includes('function createProceduralSurfaceMaps('), 'Procedural texture factory is missing');
assert.ok(js.includes('function createSeededRandom(seed)'), 'Procedural texture generation must be deterministic');
assert.ok(js.includes('new THREE.CanvasTexture(colorCanvas)'), 'Procedural albedo map is missing');
assert.ok(js.includes('new THREE.CanvasTexture(normalCanvas)'), 'Procedural normal map is missing');
assert.ok(js.includes('new THREE.CanvasTexture(roughnessCanvas)'), 'Procedural roughness map is missing');
assert.ok(js.includes('texture.minFilter = THREE.LinearMipmapLinearFilter'), 'Procedural textures must use mipmapped minification');
assert.ok(js.includes('texture.anisotropy = textureAnisotropy'), 'Procedural textures must use supported anisotropic filtering');
assert.ok(js.includes('function applySurfaceMaps(material, surfaceMaps'), 'Shared material-map assignment is missing');
assert.ok(js.includes('applySurfaceMaps(floorMat, floorSurfaceMaps'), 'Floor texture maps are not applied');
assert.ok(js.includes('applySurfaceMaps(playerArmor, armorSurfaceMaps'), 'Player armor texture maps are not applied');
assert.ok(js.includes('applySurfaceMaps(shell, armorSurfaceMaps'), 'Enemy armor texture maps are not applied');
assert.ok(js.includes('applySurfaceMaps(metal, industrialSurfaceMaps'), 'Weapon metal texture maps are not applied');
assert.match(readme, /Visual Build 1\.3/);
assert.match(readme, /## Procedural surface detail/);
assert.ok(roadmap.includes('## 1.3 — Procedural textures and surface detail'));
assert.ok(roadmap.includes('## 2.0 — Performance and release QA'));
assert.ok(ids.includes('graphics-debug'), 'Graphics diagnostics panel is missing');
for (const id of ['debug-fps', 'debug-frame', 'debug-p95', 'debug-draw-calls', 'debug-triangles', 'debug-geometries', 'debug-textures', 'debug-scale', 'debug-buffer']) {
  assert.ok(ids.includes(id), 'Graphics diagnostic field is missing: ' + id);
}
assert.ok(js.includes("new URLSearchParams(window.location.search).get('debug') === '1'"), 'URL debug toggle is missing');
assert.ok(js.includes("if (event.code === 'F3')"), 'F3 debug toggle is missing');
assert.ok(js.includes('function updateGraphicsDiagnostics(frameMs, now)'), 'Graphics diagnostics updater is missing');
assert.ok(js.includes('renderer.info.render.calls'), 'Draw-call telemetry is missing');
assert.ok(js.includes('renderer.info.render.triangles'), 'Triangle telemetry is missing');
assert.ok(js.includes('renderer.info.memory.textures'), 'Texture memory count is missing');
assert.ok(js.includes('renderer.getDrawingBufferSize(graphicsBufferSize)'), 'Drawing-buffer telemetry is missing');
assert.match(readme, /## Graphics diagnostics/);
assert.match(readme, /Visual Build 1\.4/);
assert.ok(roadmap.includes('## 1.4 — Graphics diagnostics and profiling'));
assert.ok(roadmap.includes('## 2.0 — Performance and release QA'));
assert.match(graphicsAudit, /Visual Build 1\.4 — Runtime graphics diagnostics/);
assert.ok(ids.includes('stamina-text') && ids.includes('stamina-bar'), 'Stamina HUD is missing');
assert.ok(ids.includes('look-sensitivity') && ids.includes('fov-range'), 'FPS look settings are missing');
assert.ok(ids.includes('pause-screen') && ids.includes('resume-button'), 'Pause/resume UI is missing');
assert.match(html, /FIRST-PERSON PvE/);
assert.match(html, /<kbd>SPACE<\/kbd> JUMP/);
assert.match(html, /<kbd>CTRL<\/kbd> CROUCH \/ SLIDE/);
assert.match(html, /type="checkbox"><i><\/i>/);
assert.ok(js.includes("import { parseBinarySTL } from './assets/binary-stl.mjs'"), 'VTK STL parser import is missing');
assert.ok(js.includes("import { createFpsControllerState, resetFpsControllerState, stepFpsController } from './gameplay/fps-controller.mjs'"), 'FPS controller import is missing');
assert.ok(js.includes('function loadVTKStaticMesh('), 'VTK runtime loader is missing');
assert.ok(js.includes('loadVTKEnvironmentAssets()'), 'VTK props are not scheduled for loading');
assert.ok(js.includes('stepFpsController(fpsMotion'), 'FPS movement state is not integrated');
assert.ok(js.includes('camera.rotation.set('), 'First-person camera rotation is missing');
assert.ok(js.includes('camera.fov = THREE.MathUtils.damp'), 'ADS/FOV interpolation is missing');
assert.ok(js.includes('recoilPitch = Math.min'), 'Weapon recoil impulse is missing');
assert.ok(js.includes("if (event.code === 'KeyQ'"), 'Dash must be separate from jump');
assert.ok(js.includes("if (event.code === 'Space') jumpPressed = true"), 'Space jump input is missing');
assert.ok(js.includes('function pauseGame()') && js.includes('function resumeGame()'), 'Pause/resume handlers are missing');
assert.ok(js.includes('version: 2, aimAssist, autoFire, aimRange, graphicsQuality, mouseSensitivity, fieldOfView'), 'Versioned FPS settings are not persisted');
assert.ok(js.includes('aimAssist = false, autoFire = false'), 'Standard FPS assists must default off');
assert.match(readme, /## FPS controls/);
assert.match(readme, /## VTK asset pipeline/);
assert.match(fpsPrompt, /## FPS camera and input/);
assert.match(fpsPrompt, /## VTK geometry pipeline/);
assert.match(vtkDoc, /wall_terminal\.stl\.gz/);
assert.match(vtkGenerator, /vtkFeatureEdges/);
assert.ok(roadmap.includes('## 1.5 — FPS foundation'));
assert.ok(roadmap.includes('## 1.6 — VTK static environment asset pipeline'));
assert.match(graphicsAudit, /Visual Build 1\.3 — Procedural texture and surface detail/);
assert.match(graphicsAudit, /No external image downloads/);
assert.ok(js.includes('function buildPlayerLeg('));
assert.ok(js.includes('playerRig.visible = false'));
assert.ok(js.includes('function buildViewModelArm(side)'));
assert.ok(js.includes('function buildEnemyLimb('));
assert.ok(js.includes('function openUpgradeSelection()'), 'Wave-clear upgrade selection is missing');
assert.ok(js.includes('function chooseUpgrade(index)'), 'Upgrade selection handler is missing');
assert.ok(js.includes('function magazineSize(id)'), 'Dynamic magazine sizing is missing');
assert.ok(js.includes('available.slice(0, 3)'), 'Upgrade selection must offer three choices');
assert.match(js, /def\.damage \* runModifiers\.damage/);
assert.match(js, /def\.rate \/ runModifiers\.fireRate/);
assert.match(js, /def\.reload \/ 1000 \/ runModifiers\.reloadSpeed/);
assert.match(js, /runModifiers\.moveSpeed/);
assert.match(js, /if \(!started \|\| gameOver \|\| intermission \|\| paused\) return;/);
assert.match(js, /openUpgradeSelection\(\)/);
assert.match(css, /\.upgrade-options/);
assert.match(css, /button\.upgrade-option/);
assert.match(readme, /## Wave upgrades/);
assert.ok(js.includes('new THREE.OctahedronGeometry'));
assert.ok(js.includes('new THREE.DodecahedronGeometry'));
assert.ok(js.includes('new THREE.TorusGeometry'));
assert.ok(js.includes('data.legs.left.upper.rotation.x'));
assert.ok(js.includes('data.hitFlash'));
assert.ok(js.includes('data.recoil'));
assert.match(js, /closestPointOnSegment/);
assert.match(js, /segmentParameter/);
assert.match(js, /segmentObstacleHit/);
assert.match(js, /resolveArenaCollisions/);
assert.match(js, /dashImpact\.t/);
assert.match(js, /target = nearestTarget\(\)/);
assert.doesNotMatch(js, /target = aimAssist \? nearestTarget/);
assert.match(js, /registerHit\(hitPoint, hitEnemy, shot\.damage\)/);
assert.match(js, /enemy\.rotation\.y = Math\.atan2\(-direction\.x, -direction\.z\)/);
assert.doesNotMatch(js, /enemy\.userData\.hp -= 1/);
assert.match(js, /disposeObject3D/);
assert.match(js, /disposeObject3D\(gunGroup\)/);
assert.match(js, /segmentObstacleHit\(muzzlePosition, aimPoint\)/);
assert.match(js, /kills \+= 1/);
assert.match(css, /\.damage-flash/);
assert.match(css, /\.hitmarker/);
assert.match(readme, /centre-screen camera ray/);
assert.match(readme, /block player movement and projectiles/);
assert.match(workflow, /enablement: true/);

console.log('ARENA ZERO smoke checks passed: ' + ids.length + ' unique HTML IDs, ' + referencedIds.length + ' DOM references, combat and cover regression checks passed.');

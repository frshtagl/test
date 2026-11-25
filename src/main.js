import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const $ = id => document.getElementById(id);
const root = $('game');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080f1b);
scene.fog = new THREE.Fog(0x080f1b, 25, 85);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, .1, 150);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
root.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x9abfff, 0x18212d, 2));
const keyLight = new THREE.DirectionalLight(0x9edcff, 2.1);
keyLight.position.set(-12, 22, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);
const cyanLight = new THREE.PointLight(0x16cde8, 25, 35);
cyanLight.position.set(0, 6, 0);
scene.add(cyanLight);
const orangeLight = new THREE.PointLight(0xff653d, 18, 30);
orangeLight.position.set(-18, 5, -15);
scene.add(orangeLight);

const mat = (color, roughness = .7, metalness = .1, emissive = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: emissive ? 1.5 : 0 });
const floorMat = mat(0x111d2a, .9, .3);
const wallMat = mat(0x1c2b3c, .8, .45);
const cyanMat = mat(0x24d8ed, .35, .4, 0x087b90);
const orangeMat = mat(0xff7a43, .4, .3, 0x8a260c);
const violetMat = mat(0xb58aff, .35, .3, 0x5426a8);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(70, 35, 0x24516a, 0x1b3448);
grid.position.y = .012;
scene.add(grid);
const arena = new THREE.Group();
scene.add(arena);

function box(parent, x, y, z, sx, sy, sz, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
for (let i = -1; i <= 1; i += 2) {
  box(arena, i * 24, 3, 0, 1, 6, 50, wallMat);
  box(arena, 0, 3, i * 24, 50, 6, 1, wallMat);
}
for (let i = 0; i < 4; i++) {
  const a = i * Math.PI / 2;
  box(arena, Math.cos(a) * 17, 2.8, Math.sin(a) * 17, 2, 5.6, 2, wallMat);
  box(arena, Math.cos(a) * 17, 4.8, Math.sin(a) * 17, 2.1, .12, 2.1, cyanMat);
}
for (let i = 0; i < 12; i++) {
  const a = i * Math.PI / 6;
  box(arena, Math.cos(a) * 22, .2, Math.sin(a) * 22, .35, .4, .35, cyanMat);
}
for (let i = 0; i < 10; i++) {
  const x = (Math.random() - .5) * 34;
  const z = (Math.random() - .5) * 34;
  if (Math.hypot(x, z) > 8) box(arena, x, .9, z, 2.2, 1.8, 2.2, wallMat);
}

const player = new THREE.Group();
scene.add(player);
const body = new THREE.Mesh(new THREE.CapsuleGeometry(.48, .95, 5, 10), mat(0x294a63, .5, .55));
body.position.y = 1.12;
body.castShadow = true;
player.add(body);
const visor = new THREE.Mesh(new THREE.BoxGeometry(.55, .16, .12), cyanMat);
visor.position.set(0, 1.55, -.37);
player.add(visor);
box(player, -.42, 1.3, -.05, .28, .35, .35, mat(0x172b3e));
box(player, .42, 1.3, -.05, .28, .35, .35, mat(0x172b3e));
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
const weaponOrder = ['rifle', 'shotgun', 'precision'];
const magazines = { rifle: 30, shotgun: 8, precision: 6 };
let currentWeapon = 'rifle';
function buildWeaponVisual() {
  gunGroup.clear();
  const def = weapons[currentWeapon];
  const metal = mat(currentWeapon === 'shotgun' ? 0x9b795b : currentWeapon === 'precision' ? 0x8d83b4 : 0x9baebe, .3, .8);
  const glow = currentWeapon === 'shotgun' ? orangeMat : currentWeapon === 'precision' ? violetMat : cyanMat;
  box(gunGroup, .35, 1.25, -.55, currentWeapon === 'precision' ? .24 : .18, .18, currentWeapon === 'shotgun' ? 1 : currentWeapon === 'precision' ? 1.25 : .8, metal);
  box(gunGroup, .35, 1.25, currentWeapon === 'precision' ? -.7 : -.53, .1, .08, .35, glow);
  if (currentWeapon === 'shotgun') box(gunGroup, .35, 1.1, -.48, .2, .18, .35, metal);
  muzzle.position.set(.35, 1.25, currentWeapon === 'precision' ? -1.42 : currentWeapon === 'shotgun' ? -1.08 : -.98);
  $('weapon-name').textContent = def.name;
  $('weapon-desc').textContent = def.description;
  $('weapon-short').textContent = def.short;
  $('weapon-key-1').classList.toggle('selected', currentWeapon === 'rifle');
  $('weapon-key-2').classList.toggle('selected', currentWeapon === 'shotgun');
  $('weapon-key-3').classList.toggle('selected', currentWeapon === 'precision');
  updateAmmoHUD();
}
function switchWeapon(id) {
  if (!weapons[id] || currentWeapon === id || reloading) return;
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
let spawnQueue = 0;
const enemies = [], shots = [], effects = [];
try {
  bestKills = Number(localStorage.getItem('arena-zero-best') || 0);
  const saved = JSON.parse(localStorage.getItem('arena-zero-settings') || '{}');
  if (typeof saved.aimAssist === 'boolean') aimAssist = saved.aimAssist;
  if (typeof saved.autoFire === 'boolean') autoFire = saved.autoFire;
  if (Number.isFinite(saved.aimRange)) aimRange = THREE.MathUtils.clamp(saved.aimRange, 8, 36);
} catch (_) {}
$('aim-toggle').checked = aimAssist;
$('fire-toggle').checked = autoFire;
$('aim-range').value = aimRange;
$('range-value').textContent = aimRange + 'm';
$('best-kills').textContent = String(bestKills).padStart(3, '0');

function saveSettings() {
  try {
    localStorage.setItem('arena-zero-settings', JSON.stringify({ aimAssist, autoFire, aimRange }));
  } catch (_) {}
}
function showToast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  toastTimer = 2.3;
}
function updateAmmoHUD() {
  const def = weapons[currentWeapon];
  $('ammo').innerHTML = magazines[currentWeapon] + '<span> / ' + def.mag + '</span>';
  $('reload-label').textContent = reloading ? 'RELOADING' : 'READY';
}
function updateHUD() {
  $('kills').textContent = String(kills).padStart(3, '0');
  $('wave').textContent = String(wave).padStart(2, '0');
  $('hostiles').textContent = String(enemies.length + spawnQueue).padStart(2, '0');
  $('health-text').textContent = Math.ceil(health) + ' / 100';
  $('health-bar').style.width = health + '%';
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
    scout: { hp: 48 + wave * 2, speed: 3.15 + wave * .07, damage: 7, range: 1.7, cooldown: .8, scale: .78, color: 0xb95b39, eye: 0xffa15a, radius: .85, points: 1 },
    gunner: { hp: 68 + wave * 3, speed: 1.35 + wave * .035, damage: 8, range: 13, cooldown: 1.75, scale: 1, color: 0x55477e, eye: 0xb99aff, radius: 1, points: 2 },
    heavy: { hp: 190 + wave * 9, speed: .82 + wave * .025, damage: 16, range: 2.1, cooldown: 1.35, scale: 1.32, color: 0x536475, eye: 0xff805e, radius: 1.35, points: 4 }
  };
  const cfg = configs[type];
  const enemy = new THREE.Group();
  enemy.scale.setScalar(cfg.scale);
  const shell = mat(cfg.color, .48, .55, 0x180d18);
  const core = mat(cfg.eye, .3, .25, cfg.eye);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(type === 'heavy' ? 1.35 : .95, type === 'scout' ? .85 : 1.15, .7), shell);
  torso.position.y = 1.15;
  torso.castShadow = true;
  enemy.add(torso);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(type === 'heavy' ? .48 : .4, 1), shell);
  head.position.y = type === 'scout' ? 1.78 : 1.98;
  head.castShadow = true;
  enemy.add(head);
  const eye = new THREE.Mesh(new THREE.BoxGeometry(.48, .12, .08), core);
  eye.position.set(0, head.position.y, -.39);
  enemy.add(eye);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.25, type === 'heavy' ? .9 : .7, .3), shell);
    leg.position.set(side * .28, .36, 0);
    enemy.add(leg);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(type === 'heavy' ? .34 : .22, .8, .25), shell);
    arm.position.set(side * (type === 'heavy' ? .78 : .62), 1.2, 0);
    enemy.add(arm);
  }
  const barBack = new THREE.Mesh(new THREE.BoxGeometry(1.25, .09, .06), mat(0x101820));
  barBack.position.set(0, 2.55, 0);
  enemy.add(barBack);
  const barFill = new THREE.Mesh(new THREE.BoxGeometry(1.2, .055, .07), mat(0x69f2b7, .4, .1, 0x176b45));
  barFill.position.set(0, 2.55, -.045);
  enemy.add(barFill);
  const a = Math.random() * Math.PI * 2;
  const r = 17 + Math.random() * 5;
  enemy.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
  enemy.userData = {
    type, hp: cfg.hp, maxHp: cfg.hp, speed: cfg.speed, damage: cfg.damage,
    range: cfg.range, cooldown: Math.random() * .7, attackRate: cfg.cooldown,
    radius: cfg.radius, points: cfg.points, barFill
  };
  scene.add(enemy);
  enemies.push(enemy);
  updateHUD();
}
function startWave() {
  spawnQueue = Math.min(5 + wave * 2, 22);
  spawnCooldown = .15;
  showToast('WAVE ' + String(wave).padStart(2, '0') + ' // ' + spawnQueue + ' HOSTILES');
  updateHUD();
}
function projectile(from, direction, hostile, damageAmount, speed, color) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(hostile ? .095 : .07, 8, 8),
    hostile ? orangeMat : (color === 'violet' ? violetMat : color === 'orange' ? orangeMat : cyanMat)
  );
  mesh.position.copy(from);
  scene.add(mesh);
  shots.push({ mesh, dir: direction.clone().normalize(), speed, life: 2.2, hostile, damage: damageAmount });
}
function nearestTarget() {
  let best = null;
  let bestScore = Infinity;
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  for (const enemy of enemies) {
    const delta = new THREE.Vector3().subVectors(enemy.position, player.position);
    const distance = delta.length();
    if (distance > aimRange) continue;
    const dot = forward.dot(delta.clone().normalize());
    if (dot < .05) continue;
    const score = distance + (1 - dot) * 8 + (enemy.userData.type === 'heavy' ? 1.2 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = enemy;
    }
  }
  return best;
}
function shoot() {
  const def = weapons[currentWeapon];
  if (magazines[currentWeapon] <= 0 || reloading || performance.now() - lastShot < def.rate) return;
  lastShot = performance.now();
  magazines[currentWeapon]--;
  const origin = new THREE.Vector3();
  muzzle.getWorldPosition(origin);
  let baseDirection;
  if (aimAssist && target) {
    baseDirection = target.position.clone().add(new THREE.Vector3(0, 1.25 * target.scale.y, 0)).sub(origin).normalize();
  } else {
    baseDirection = new THREE.Vector3(-Math.sin(yaw), Math.sin(-pitch), -Math.cos(yaw)).normalize();
  }
  for (let i = 0; i < def.pellets; i++) {
    const direction = baseDirection.clone();
    direction.x += (Math.random() - .5) * def.spread;
    direction.y += (Math.random() - .5) * def.spread;
    direction.z += (Math.random() - .5) * def.spread;
    projectile(origin, direction, false, def.damage, def.speed, currentWeapon === 'precision' ? 'violet' : currentWeapon === 'shotgun' ? 'orange' : 'cyan');
  }
  addBurst(origin, def.color, .09);
  updateAmmoHUD();
}
function reload() {
  const def = weapons[currentWeapon];
  if (reloading || magazines[currentWeapon] === def.mag) return;
  reloading = true;
  reloadRemaining = def.reload / 1000;
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
    new THREE.SphereGeometry(size, 8, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9 })
  );
  mesh.position.copy(position);
  scene.add(mesh);
  effects.push({ mesh, life: .22, max: .22 });
}
function registerHit(position, enemy) {
  enemy.userData.hp -= 1;
  const ratio = THREE.MathUtils.clamp(enemy.userData.hp / enemy.userData.maxHp, 0, 1);
  enemy.userData.barFill.scale.x = Math.max(.001, ratio);
  enemy.userData.barFill.position.x = -.6 * (1 - ratio);
  addBurst(position, enemy.userData.type === 'gunner' ? 0xb99aff : 0xffa15a, .13);
  hitTimer = .12;
  $('hitmarker').classList.add('active');
}
function eliminateEnemy(enemy) {
  const index = enemies.indexOf(enemy);
  if (index < 0) return;
  scene.remove(enemy);
  enemies.splice(index, 1);
  kills += enemy.userData.points;
  bestKills = Math.max(bestKills, kills);
  try { localStorage.setItem('arena-zero-best', String(bestKills)); } catch (_) {}
  updateHUD();
}
function start() {
  started = true;
  gameOver = false;
  health = 100;
  kills = 0;
  wave = 1;
  magazines.rifle = weapons.rifle.mag;
  magazines.shotgun = weapons.shotgun.mag;
  magazines.precision = weapons.precision.mag;
  reloading = false;
  reloadRemaining = 0;
  spawnTimer = 0;
  for (const enemy of enemies) scene.remove(enemy);
  enemies.length = 0;
  for (const shot of shots) scene.remove(shot.mesh);
  shots.length = 0;
  for (const effect of effects) scene.remove(effect.mesh);
  effects.length = 0;
  player.position.set(0, 0, 8);
  yaw = 0;
  pitch = -.13;
  currentWeapon = 'rifle';
  buildWeaponVisual();
  $('start-screen').classList.add('hidden');
  $('end-screen').classList.add('hidden');
  $('damage-flash').classList.remove('active');
  startWave();
  updateHUD();
  renderer.domElement.requestPointerLock?.();
}
$('start-button').addEventListener('click', start);
$('restart-button').addEventListener('click', start);
$('aim-toggle').addEventListener('change', event => { aimAssist = event.target.checked; saveSettings(); });
$('fire-toggle').addEventListener('change', event => { autoFire = event.target.checked; saveSettings(); });
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
  keys[event.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  if (event.code === 'KeyR') reload();
  if (event.code === 'KeyT') $('aim-toggle').click();
  if (event.code === 'KeyF') $('fire-toggle').click();
  if (event.code === 'Digit1') switchWeapon('rifle');
  if (event.code === 'Digit2') switchWeapon('shotgun');
  if (event.code === 'Digit3') switchWeapon('precision');
  if (event.code === 'Space' && started && dashCooldown <= 0) {
    const direction = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    player.position.addScaledVector(direction, 5);
    dashCooldown = 2;
    invuln = .25;
    addBurst(player.position.clone().add(new THREE.Vector3(0, 1, 0)), 0x50e6f2, .35);
  }
});
addEventListener('keyup', event => { keys[event.code] = false; });
addEventListener('mousemove', event => {
  if (document.pointerLockElement === renderer.domElement) {
    yaw -= event.movementX * .0022;
    pitch = THREE.MathUtils.clamp(pitch - event.movementY * .0018, -.65, .35);
  }
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function tick(dt) {
  if (!started || gameOver) return;
  invuln = Math.max(0, invuln - dt);
  dashCooldown = Math.max(0, dashCooldown - dt);
  if (reloadRemaining > 0) {
    reloadRemaining -= dt;
    if (reloadRemaining <= 0) {
      magazines[currentWeapon] = weapons[currentWeapon].mag;
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
  if (movement.lengthSq()) {
    movement.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    player.position.addScaledVector(movement, dt * (keys.ShiftLeft ? 10 : 6));
  }
  player.position.x = THREE.MathUtils.clamp(player.position.x, -21, 21);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -21, 21);
  player.rotation.y = yaw;

  const cameraOffset = new THREE.Vector3(0, 4.1, 7.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  camera.position.lerp(player.position.clone().add(cameraOffset), 1 - Math.pow(.001, dt));
  const look = player.position.clone().add(new THREE.Vector3(0, 1.5, 0));
  look.add(new THREE.Vector3(-Math.sin(yaw) * 8, pitch * 5, -Math.cos(yaw) * 8));
  camera.lookAt(look);

  target = aimAssist ? nearestTarget() : null;
  $('lock-label').classList.toggle('visible', !!target);
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
    enemy.rotation.y = Math.atan2(direction.x, direction.z);
    data.cooldown -= dt;
    if (data.type === 'gunner') {
      if (distance > data.range + 2) enemy.position.addScaledVector(direction, data.speed * dt);
      else if (distance < data.range - 2) enemy.position.addScaledVector(direction, -data.speed * .65 * dt);
      if (distance <= data.range + 3 && data.cooldown <= 0) {
        const from = enemy.position.clone().add(new THREE.Vector3(0, 1.25, 0));
        const to = player.position.clone().add(new THREE.Vector3(0, 1, 0));
        projectile(from, to.sub(from), true, data.damage, 17, 'orange');
        data.cooldown = data.attackRate;
      }
    } else if (distance > data.range) {
      enemy.position.addScaledVector(direction, data.speed * dt);
    } else if (data.cooldown <= 0) {
      damage(data.damage);
      data.cooldown = data.attackRate;
    }
  }

  for (let i = shots.length - 1; i >= 0; i--) {
    const shot = shots[i];
    shot.mesh.position.addScaledVector(shot.dir, shot.speed * dt);
    shot.life -= dt;
    let hit = false;
    if (!shot.hostile) {
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        const center = enemy.position.clone().add(new THREE.Vector3(0, 1.1 * enemy.scale.y, 0));
        if (shot.mesh.position.distanceTo(center) < enemy.userData.radius) {
          registerHit(shot.mesh.position, enemy);
          enemy.userData.hp -= shot.damage;
          const ratio = THREE.MathUtils.clamp(enemy.userData.hp / enemy.userData.maxHp, 0, 1);
          enemy.userData.barFill.scale.x = Math.max(.001, ratio);
          enemy.userData.barFill.position.x = -.6 * (1 - ratio);
          if (enemy.userData.hp <= 0) eliminateEnemy(enemy);
          hit = true;
          break;
        }
      }
    } else if (shot.mesh.position.distanceTo(player.position.clone().add(new THREE.Vector3(0, 1, 0))) < .8) {
      damage(shot.damage);
      hit = true;
    }
    if (hit || shot.life <= 0 || shot.mesh.position.length() > 55) {
      scene.remove(shot.mesh);
      shots.splice(i, 1);
    }
  }
  for (let i = effects.length - 1; i >= 0; i--) {
    const effect = effects[i];
    effect.life -= dt;
    effect.mesh.scale.multiplyScalar(1 + dt * 7);
    effect.mesh.material.opacity = Math.max(0, effect.life / effect.max);
    if (effect.life <= 0) {
      scene.remove(effect.mesh);
      effects.splice(i, 1);
    }
  }
  if (spawnQueue === 0 && enemies.length === 0) {
    spawnTimer += dt;
    if (spawnTimer > 2.5) {
      spawnTimer = 0;
      wave++;
      startWave();
    }
  } else spawnTimer = 0;
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
  renderer.render(scene, camera);
}
animate(previous);
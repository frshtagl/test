import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, js, css, readme, workflow] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('src/main.js', 'utf8'),
  readFile('src/styles.css', 'utf8'),
  readFile('README.md', 'utf8'),
  readFile('.github/workflows/deploy.yml', 'utf8')
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
assert.ok(js.includes('function buildPlayerArm('));
assert.ok(js.includes('function buildPlayerLeg('));
assert.ok(js.includes('playerParts.leftLeg.hip.rotation.x'));
assert.ok(js.includes('function buildEnemyLimb('));
assert.ok(js.includes('function openUpgradeSelection()'), 'Wave-clear upgrade selection is missing');
assert.ok(js.includes('function chooseUpgrade(index)'), 'Upgrade selection handler is missing');
assert.ok(js.includes('function magazineSize(id)'), 'Dynamic magazine sizing is missing');
assert.ok(js.includes('available.slice(0, 3)'), 'Upgrade selection must offer three choices');
assert.match(js, /def\.damage \* runModifiers\.damage/);
assert.match(js, /def\.rate \/ runModifiers\.fireRate/);
assert.match(js, /def\.reload \/ 1000 \/ runModifiers\.reloadSpeed/);
assert.match(js, /runModifiers\.moveSpeed/);
assert.match(js, /if \(!started \|\| gameOver \|\| intermission\) return;/);
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

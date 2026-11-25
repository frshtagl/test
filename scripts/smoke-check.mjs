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

for (const id of ['game', 'start-button', 'restart-button', 'aim-toggle', 'fire-toggle', 'aim-range', 'weapon-name', 'weapon-desc', 'weapon-short', 'weapon-key-1', 'weapon-key-2', 'weapon-key-3', 'hitmarker', 'damage-flash', 'best-kills']) {
  assert.ok(ids.includes(id), 'Required HUD element is missing: ' + id);
}

assert.match(html, /href=["']\.\/src\/styles\.css["']/);
assert.match(html, /src=["']\.\/src\/main\.js["']/);
assert.match(js, /camera\.getWorldDirection/);
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
assert.match(css, /\.damage-flash/);
assert.match(css, /\.hitmarker/);
assert.match(readme, /centre-screen camera ray/);
assert.match(readme, /block player movement and projectiles/);
assert.match(workflow, /enablement: true/);

console.log('ARENA ZERO smoke checks passed: ' + ids.length + ' unique HTML IDs, ' + referencedIds.length + ' DOM references, combat and cover regression checks passed.');

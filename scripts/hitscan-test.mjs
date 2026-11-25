import assert from 'node:assert/strict';
import { raySphereIntersection, segmentAabbIntersection } from '../src/combat/hitscan.mjs';

const origin = { x: 0, y: 0, z: 0 };
const forward = { x: 0, y: 0, z: -1 };
const sphere = { x: 0, y: 0, z: -5 };
let hit = raySphereIntersection(origin, forward, sphere, 1, 20);
assert.ok(hit);
assert.ok(Math.abs(hit.distance - 4) < 1e-8);
assert.deepEqual(hit.point, { x: 0, y: 0, z: -4 });
assert.equal(raySphereIntersection(origin, forward, { x: 4, y: 0, z: -5 }, 1, 20), null);
assert.equal(raySphereIntersection(origin, forward, { x: 0, y: 0, z: 5 }, 1, 20), null);
assert.equal(raySphereIntersection(origin, forward, sphere, 1, 3), null);

const cover = { minX: -1, maxX: 1, minY: -1, maxY: 1, minZ: -4, maxZ: -3 };
hit = segmentAabbIntersection(origin, { x: 0, y: 0, z: -10 }, cover);
assert.ok(hit);
assert.ok(Math.abs(hit.t - .3) < 1e-8);
assert.deepEqual(hit.point, { x: 0, y: 0, z: -3 });
assert.equal(segmentAabbIntersection(origin, { x: 0, y: 0, z: -2 }, cover), null);
assert.equal(segmentAabbIntersection(origin, { x: 3, y: 0, z: -10 }, cover), null);
console.log('ARENA ZERO hitscan geometry tests passed.');

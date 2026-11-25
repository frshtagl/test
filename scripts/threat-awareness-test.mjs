import assert from 'node:assert/strict';
import {getThreatDirection,selectPrimaryThreat} from '../src/gameplay/threat-awareness.mjs';
const player={x:0,z:0};
assert.equal(getThreatDirection(player,0,{x:0,z:-5}).sector,'FRONT');
assert.equal(getThreatDirection(player,0,{x:5,z:0}).sector,'RIGHT');
assert.equal(getThreatDirection(player,0,{x:-5,z:0}).sector,'LEFT');
assert.equal(getThreatDirection(player,0,{x:0,z:5}).sector,'REAR');
assert.equal(getThreatDirection(player,Math.PI/2,{x:-5,z:0}).sector,'FRONT');
assert.equal(getThreatDirection(player,0,{x:0,z:0}),null);
assert.equal(getThreatDirection(player,0,{x:NaN,z:0}),null);
assert.equal(getThreatDirection(player,NaN,{x:0,z:-5}),null);
const selected=selectPrimaryThreat(player,0,[
 {position:{x:0,z:-12},kind:'distant',severity:1},
 {position:{x:4,z:0},kind:'projectile',severity:2,timeToImpact:.25},
 {position:{x:-2,z:0},kind:'melee',severity:1.5}
],22);
assert.equal(selected.kind,'PROJECTILE');
assert.equal(selected.sector,'RIGHT');
assert.ok(selected.timeToImpact<.3);
assert.equal(selectPrimaryThreat(player,0,[{position:{x:0,z:-30},severity:10}],22),null);
assert.equal(selectPrimaryThreat(player,0,[{position:{x:0,z:-2},severity:0}],22),null);
assert.equal(selectPrimaryThreat(player,0,[],22),null);
assert.equal(selectPrimaryThreat(player,NaN,[{position:{x:0,z:-2},severity:3}],22),null);
console.log('ARENA ZERO threat-awareness checks passed: camera-relative sectors, urgency ranking and invalid-threat filtering.');

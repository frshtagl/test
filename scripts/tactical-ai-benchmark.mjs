import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createNavigationGrid,createTacticalBrain,updateTacticalPath} from '../src/gameplay/tactical-ai.mjs';
import {createCoverCollider} from '../src/gameplay/cover-system.mjs';

const obstacles=[
  ...[[17,0],[-17,0],[0,17],[0,-17]].map(([x,z],i)=>({id:'pillar-'+i,x,z,halfX:1,halfZ:1})),
  ...[[7,5],[-7,5],[7,-5],[-7,-5],[15,8],[-15,-8]].map(([x,z],i)=>({id:'crate-'+i,x,z,halfX:1.1,halfZ:1.1})),
  createCoverCollider('cover-east',11.5,0,Math.PI/2),
  createCoverCollider('cover-north',0,11.5,0),
  createCoverCollider('cover-west',-11.5,0,-Math.PI/2),
  createCoverCollider('cover-south',0,-11.5,Math.PI)
].map(item=>item.cover?item:{...item,material:'concrete'});
for(const item of obstacles)if(item.id.startsWith('cover-'))item.cover={id:item.id};

const grid=createNavigationGrid(obstacles,{min:-22,max:22,cellSize:1.5,clearance:.86});
const target={x:0,z:8};
const types=['scout','gunner','heavy'];
const actors=Array.from({length:22},(_,index)=>{
  const angle=index*Math.PI*2/22;
  const radius=18+(index%4)*.7;
  const position={x:Math.cos(angle)*radius,z:Math.sin(angle)*radius};
  const type=types[index%types.length];
  return{position,type,brain:createTacticalBrain(type,target,index+1)};
});
function runBatch(){
  for(const actor of actors){
    actor.brain.repathTimer=0;
    updateTacticalPath(actor.brain,actor.position,target,grid,obstacles,1,actor.type);
  }
}
for(let warmup=0;warmup<5;warmup++)runBatch();
const samples=[];
for(let batch=0;batch<50;batch++){
  const start=performance.now();runBatch();samples.push(performance.now()-start);
}
const ordered=samples.slice().sort((a,b)=>a-b);
const percentile=p=>ordered[Math.min(ordered.length-1,Math.ceil(ordered.length*p)-1)];
const p50=percentile(.5),p95=percentile(.95),max=ordered[ordered.length-1];
assert.equal(actors.length,22);
assert.ok(actors.every(actor=>actor.brain.path.length>0),'Every test enemy should receive a route');
assert.ok(Number.isFinite(p95)&&p95<100, '22-enemy route-replanning p95 must stay below 100 ms');
console.log('ARENA ZERO pathfinding stress benchmark: 22 enemies, 14 obstacles, 50 full replanning batches; p50='+p50.toFixed(2)+' ms, p95='+p95.toFixed(2)+' ms, max='+max.toFixed(2)+' ms.');

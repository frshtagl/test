const EPSILON=1e-8;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const angleDelta=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));

export function isSegmentClear2D(start,end,obstacles=[],clearance=0){
  for(const obstacle of obstacles){
    const minX=obstacle.x-obstacle.halfX-clearance,maxX=obstacle.x+obstacle.halfX+clearance;
    const minZ=obstacle.z-obstacle.halfZ-clearance,maxZ=obstacle.z+obstacle.halfZ+clearance;
    let near=0,far=1;
    for(const[axis,min,max]of[['x',minX,maxX],['z',minZ,maxZ]]){
      const delta=end[axis]-start[axis];
      if(Math.abs(delta)<EPSILON){if(start[axis]<min||start[axis]>max){near=Infinity;break;}continue;}
      let a=(min-start[axis])/delta,b=(max-start[axis])/delta;if(a>b)[a,b]=[b,a];
      near=Math.max(near,a);far=Math.min(far,b);if(near>far)break;
    }
    if(near<=far&&far>=0&&near<=1)return false;
  }
  return true;
}
export function hasLineOfSight2D(start,end,obstacles=[],clearance=.05){
  return isSegmentClear2D(start,end,obstacles,clearance);
}
export function createNavigationGrid(obstacles=[],options={}){
  const min=Number.isFinite(options.min)?options.min:-21,max=Number.isFinite(options.max)?options.max:21;
  const cellSize=clamp(Number(options.cellSize)||1.5,.5,3),clearance=clamp(Number(options.clearance)||.85,0,2);
  const cols=Math.floor((max-min)/cellSize)+1,rows=cols,blocked=new Uint8Array(cols*rows);
  const copied=obstacles.map(o=>({x:o.x,z:o.z,halfX:o.halfX,halfZ:o.halfZ}));
  for(let z=0;z<rows;z++)for(let x=0;x<cols;x++){
    const px=min+x*cellSize,pz=min+z*cellSize,index=z*cols+x;
    if(copied.some(o=>px>=o.x-o.halfX-clearance&&px<=o.x+o.halfX+clearance&&pz>=o.z-o.halfZ-clearance&&pz<=o.z+o.halfZ+clearance))blocked[index]=1;
  }
  return{min,max,cellSize,cols,rows,blocked,obstacles:copied,clearance};
}
function cellIndex(grid,x,z){
  const ix=Math.round((x-grid.min)/grid.cellSize),iz=Math.round((z-grid.min)/grid.cellSize);
  if(ix<0||ix>=grid.cols||iz<0||iz>=grid.rows)return-1;
  return iz*grid.cols+ix;
}
function cellPoint(grid,index){
  const x=index%grid.cols,z=Math.floor(index/grid.cols);
  return{x:grid.min+x*grid.cellSize,z:grid.min+z*grid.cellSize};
}
function nearestWalkable(grid,index,maxRadius=8){
  if(index<0)return-1;if(!grid.blocked[index])return index;
  const sx=index%grid.cols,sz=Math.floor(index/grid.cols);
  for(let radius=1;radius<=maxRadius;radius++){
    let best=-1,bestDistance=Infinity;
    for(let z=Math.max(0,sz-radius);z<=Math.min(grid.rows-1,sz+radius);z++)
      for(let x=Math.max(0,sx-radius);x<=Math.min(grid.cols-1,sx+radius);x++){
        if(Math.max(Math.abs(x-sx),Math.abs(z-sz))!==radius)continue;
        const candidate=z*grid.cols+x;if(grid.blocked[candidate])continue;
        const d=(x-sx)*(x-sx)+(z-sz)*(z-sz);if(d<bestDistance){best=candidate;bestDistance=d;}
      }
    if(best>=0)return best;
  }
  return-1;
}
export function isWalkablePosition(grid,point){
  const index=cellIndex(grid,point.x,point.z);
  if(index<0||grid.blocked[index])return false;
  return !grid.obstacles.some(o=>point.x>=o.x-o.halfX-grid.clearance&&point.x<=o.x+o.halfX+grid.clearance&&point.z>=o.z-o.halfZ-grid.clearance&&point.z<=o.z+o.halfZ+grid.clearance);
}
class MinHeap{
  constructor(){this.items=[];}
  push(value){const a=this.items;a.push(value);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(a[p].f<=value.f)break;a[i]=a[p];i=p;}a[i]=value;}
  pop(){const a=this.items;if(!a.length)return null;const root=a[0],last=a.pop();if(a.length){let i=0;while(true){let c=i*2+1;if(c>=a.length)break;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=last.f)break;a[i]=a[c];i=c;}a[i]=last;}return root;}
}
function octile(ax,az,bx,bz){const dx=Math.abs(ax-bx),dz=Math.abs(az-bz);return Math.max(dx,dz)+(Math.SQRT2-1)*Math.min(dx,dz);}
export function findNavigationPath(grid,start,goal){
  let startIndex=nearestWalkable(grid,cellIndex(grid,start.x,start.z)),goalIndex=nearestWalkable(grid,cellIndex(grid,goal.x,goal.z));
  if(startIndex<0||goalIndex<0||startIndex===goalIndex)return[];
  const count=grid.cols*grid.rows,gScore=new Float64Array(count),parent=new Int32Array(count);gScore.fill(Infinity);parent.fill(-1);
  const open=new MinHeap(),goalPoint=cellPoint(grid,goalIndex);gScore[startIndex]=0;
  const startPoint=cellPoint(grid,startIndex);open.push({index:startIndex,g:0,f:octile(startPoint.x,startPoint.z,goalPoint.x,goalPoint.z)});
  const directions=[[-1,0,1],[1,0,1],[0,-1,1],[0,1,1],[-1,-1,Math.SQRT2],[-1,1,Math.SQRT2],[1,-1,Math.SQRT2],[1,1,Math.SQRT2]];
  let visited=0,found=false;
  while(open.items.length&&visited<grid.cols*grid.rows*4){
    const current=open.pop();if(!current)break;
    if(current.g>gScore[current.index]+EPSILON)continue;
    if(current.index===goalIndex){found=true;break;}visited++;
    const cx=current.index%grid.cols,cz=Math.floor(current.index/grid.cols);
    for(const[dx,dz,cost]of directions){
      const nx=cx+dx,nz=cz+dz;if(nx<0||nx>=grid.cols||nz<0||nz>=grid.rows)continue;
      const next=nz*grid.cols+nx;if(grid.blocked[next])continue;
      if(dx&&dz&&(grid.blocked[cz*grid.cols+nx]||grid.blocked[nz*grid.cols+cx]))continue;
      const nextG=current.g+cost;if(nextG>=gScore[next]-EPSILON)continue;
      gScore[next]=nextG;parent[next]=current.index;const p=cellPoint(grid,next);
      open.push({index:next,g:nextG,f:nextG+octile(p.x,p.z,goalPoint.x,goalPoint.z)});
    }
  }
  if(!found)return[];
  const raw=[];for(let at=goalIndex;at!==startIndex&&at>=0;at=parent[at])raw.push(cellPoint(grid,at));
  raw.reverse();if(!raw.length)return[];
  const smooth=[];let anchor={x:start.x,z:start.z},i=0;
  while(i<raw.length){
    let chosen=i;
    for(let j=raw.length-1;j>=i;j--)if(isSegmentClear2D(anchor,raw[j],grid.obstacles,grid.clearance*.92)){chosen=j;break;}
    smooth.push(raw[chosen]);anchor=raw[chosen];i=chosen+1;
  }
  return smooth;
}
function ringGoal({type,position,target,grid,obstacles,strafeSign}){
  const dx=position.x-target.x,dz=position.z-target.z,currentAngle=Math.atan2(dz,dx),currentDistance=Math.hypot(dx,dz);
  const radius=type==='scout'?2.25:type==='heavy'?3.05:12.4;
  const preferred=currentAngle+(type==='scout'?strafeSign*.95:type==='gunner'?strafeSign*.38:0);
  let best=null,bestScore=Infinity;
  const samples=type==='gunner'?24:16;
  for(let i=0;i<samples;i++){
    const angle=preferred+i*Math.PI*2/samples;
    const candidate={x:clamp(target.x+Math.cos(angle)*radius,grid.min,grid.max),z:clamp(target.z+Math.sin(angle)*radius,grid.min,grid.max)};
    if(!isWalkablePosition(grid,candidate))continue;
    const visible=hasLineOfSight2D(candidate,target,obstacles,.06);
    const score=distance(position,candidate)+(angleDelta(angle,preferred)*(type==='scout'?3.2:type==='heavy'?1.5:1.25))+(visible?0:type==='gunner'?80:type==='scout'?22:14);
    if(score<bestScore){bestScore=score;best=candidate;}
  }
  if(best)return best;
  return{x:clamp(target.x+Math.cos(currentAngle)*radius,grid.min,grid.max),z:clamp(target.z+Math.sin(currentAngle)*radius,grid.min,grid.max)};
}
export function chooseTacticalGoal({type,position,target,grid,obstacles=grid.obstacles,strafeSign=1}){
  if(type==='scout'||type==='heavy'||type==='gunner')return ringGoal({type,position,target,grid,obstacles,strafeSign});
  return{x:target.x,z:target.z};
}
export function createTacticalBrain(type,initialTarget,seed=1){
  const value=Number(seed)>>>0;
  return{
    type,state:'approach',stateTime:0,attackCooldown:((value>>>1)%350)/1000,
    windupDuration:0,repathTimer:0,path:[],pathIndex:0,goal:null,
    lastKnown:{x:initialTarget.x,z:initialTarget.z},lostSightTime:0,
    strafeSign:value&1?1:-1,stuckTime:0,lastPosition:null
  };
}
export function stepTacticalBrain(brain,{dt,type,canAttack,hasLineOfSight,attackRate}){
  brain.attackCooldown=Math.max(0,brain.attackCooldown-dt);
  if(brain.state==='windup'){
    if(!hasLineOfSight||!canAttack){brain.state=hasLineOfSight?(type==='gunner'?'hold':'approach'):'search';brain.stateTime=0;return{attack:false,telegraph:false,state:brain.state};}
    brain.stateTime-=dt;
    if(brain.stateTime<=0){
      brain.state='recover';brain.stateTime=type==='heavy'?.58:type==='scout'?.28:.24;
      brain.attackCooldown=attackRate;return{attack:true,telegraph:false,state:brain.state};
    }
    return{attack:false,telegraph:true,state:brain.state};
  }
  if(brain.state==='recover'){
    brain.stateTime-=dt;
    if(brain.stateTime<=0)brain.state=type==='scout'?'flank':type==='gunner'?'hold':'approach';
    return{attack:false,telegraph:false,state:brain.state};
  }
  if(canAttack&&hasLineOfSight&&brain.attackCooldown<=0){
    brain.state='windup';brain.windupDuration=type==='heavy'?.88:type==='scout'?.38:.52;
    brain.stateTime=brain.windupDuration;
    return{attack:false,telegraph:true,state:brain.state};
  }
  brain.state=!hasLineOfSight?'search':type==='scout'?'flank':type==='gunner'?'hold':'approach';
  return{attack:false,telegraph:false,state:brain.state};
}
export function updateTacticalPath(brain,position,target,grid,obstacles,dt,type){
  brain.repathTimer=Math.max(0,brain.repathTimer-dt);
  if(brain.repathTimer<=0){
    brain.goal=chooseTacticalGoal({type,position,target,grid,obstacles,strafeSign:brain.strafeSign});
    brain.path=findNavigationPath(grid,position,brain.goal);brain.pathIndex=0;
    brain.repathTimer=type==='scout'?.58:type==='gunner'?.82:1.05;
  }
  while(brain.pathIndex<brain.path.length&&distance(position,brain.path[brain.pathIndex])<.58)brain.pathIndex++;
  return brain.path[brain.pathIndex]||null;
}

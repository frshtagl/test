const EPSILON=1e-8;
const vec=v=>({x:Number(v?.x)||0,y:Number(v?.y)||0,z:Number(v?.z)||0});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const mul=(a,n)=>({x:a.x*n,y:a.y*n,z:a.z*n});
export function normalizeVector(v){const a=vec(v),m=Math.sqrt(dot(a,a));return m>EPSILON?mul(a,1/m):{x:0,y:0,z:-1};}
export function createSeededRandom(seed=1){let s=Number(seed)>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export function generatePelletDirections(baseDirection,pelletCount,spreadRadians,seed=1){
 const base=normalizeVector(baseDirection),count=Math.max(1,Math.min(128,Math.floor(Number(pelletCount)||1))),spread=Math.max(0,Math.min(Math.PI*.49,Number(spreadRadians)||0));
 const upRef=Math.abs(base.y)<.92?{x:0,y:1,z:0}:{x:1,y:0,z:0},right=normalizeVector(cross(base,upRef)),up=normalizeVector(cross(right,base)),random=createSeededRandom(seed),cosLimit=Math.cos(spread),out=[];
 for(let i=0;i<count;i++){const ct=1-random()*(1-cosLimit),st=Math.sqrt(Math.max(0,1-ct*ct)),phi=random()*Math.PI*2,tangent=add(mul(right,Math.cos(phi)),mul(up,Math.sin(phi)));out.push(normalizeVector(add(mul(base,ct),mul(tangent,st))));}
 return out;
}
export function raySphere(originValue,directionValue,centerValue,radius,maxDistance=Infinity){
 const origin=vec(originValue),direction=normalizeVector(directionValue),center=vec(centerValue),r=Math.max(0,Number(radius)||0);if(r<=0)return null;
 const offset=sub(origin,center),b=dot(offset,direction),c=dot(offset,offset)-r*r,disc=b*b-c;if(disc<0)return null;
 const root=Math.sqrt(disc);let distance=-b-root;if(distance<0)distance=-b+root;if(distance<0||distance>maxDistance)return null;
 const point=add(origin,mul(direction,distance));return{distance,point,normal:normalizeVector(sub(point,center))};
}
export function rayAabb(originValue,directionValue,obstacle,maxDistance=Infinity){
 const origin=vec(originValue),direction=normalizeVector(directionValue),bounds=[['x',obstacle.x-obstacle.halfX,obstacle.x+obstacle.halfX],['y',obstacle.centerY-obstacle.halfY,obstacle.centerY+obstacle.halfY],['z',obstacle.z-obstacle.halfZ,obstacle.z+obstacle.halfZ]];
 let near=-Infinity,far=Infinity,normNear={x:0,y:0,z:0},normFar={x:0,y:0,z:0};
 for(const[axis,min,max]of bounds){const d=direction[axis];if(Math.abs(d)<EPSILON){if(origin[axis]<min||origin[axis]>max)return null;continue;}
  let t1=(min-origin[axis])/d,t2=(max-origin[axis])/d,s1=-1,s2=1;if(t1>t2){[t1,t2]=[t2,t1];[s1,s2]=[s2,s1];}
  if(t1>near){near=t1;normNear={x:0,y:0,z:0};normNear[axis]=s1;}if(t2<far){far=t2;normFar={x:0,y:0,z:0};normFar[axis]=s2;}if(near>far)return null;
 }
 if(far<0)return null;const startedInside=near<0,distance=startedInside?far:near,normal=startedInside?normFar:normNear;if(distance<0||distance>maxDistance)return null;
 return{distance,point:add(origin,mul(direction,distance)),normal,startedInside};
}
export function resolveHitscan({origin:originValue,direction:directionValue,maxDistance=80,obstacles=[],targets=[]}){
 const origin=vec(originValue),direction=normalizeVector(directionValue),limit=Math.max(0,Number(maxDistance)||0);let nearest=null;
 for(let i=0;i<obstacles.length;i++){const obstacle=obstacles[i],hit=rayAabb(origin,direction,obstacle,limit);if(hit&&(!nearest||hit.distance<nearest.distance-1e-7||(Math.abs(hit.distance-nearest.distance)<=1e-7&&nearest.kind!=='obstacle')))nearest={kind:'obstacle',distance:hit.distance,point:hit.point,normal:hit.normal,material:obstacle.material||'concrete',obstacleId:obstacle.id??i};}
 for(const target of targets)for(const zone of target.zones||[]){const hit=raySphere(origin,direction,zone.center,zone.radius,limit);if(!hit||(nearest&&hit.distance>=nearest.distance-1e-7))continue;nearest={kind:'enemy',distance:hit.distance,point:hit.point,normal:hit.normal,target,zone:zone.zone||'torso',damageMultiplier:Math.max(0,Number(zone.damageMultiplier)||1)};}
 return nearest||{kind:'miss',distance:limit,point:add(origin,mul(direction,limit)),normal:{x:0,y:0,z:0}};
}

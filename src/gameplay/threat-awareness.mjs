const SECTORS=['FRONT','FRONT-RIGHT','RIGHT','REAR-RIGHT','REAR','REAR-LEFT','LEFT','FRONT-LEFT'];
const TAU=Math.PI*2;
function normalizeAngle(angle){return((angle+Math.PI)%(TAU)+TAU)%TAU-Math.PI;}
export function getThreatDirection(player,yaw,source){
  const dx=Number(source?.x)-Number(player?.x),dz=Number(source?.z)-Number(player?.z),heading=Number(yaw??0);
  if(!Number.isFinite(dx)||!Number.isFinite(dz)||!Number.isFinite(heading)||Math.hypot(dx,dz)<1e-6)return null;
  const angle=normalizeAngle(Math.atan2(dx,-dz)+heading);
  const sectorIndex=(Math.round(angle/(Math.PI/4))+8)%8;
  return{angle,angleDegrees:angle*180/Math.PI,sector:SECTORS[sectorIndex],sectorIndex,distance:Math.hypot(dx,dz)};
}
export function selectPrimaryThreat(player,yaw,threats,maxDistance=22){
  const limit=Number(maxDistance);
  if(!Number.isFinite(limit)||limit<=0)return null;
  let selected=null,bestScore=-Infinity;
  for(const threat of threats||[]){
    const direction=getThreatDirection(player,yaw,threat?.position);
    if(!direction||direction.distance>limit)continue;
    const severity=Number(threat.severity??1);
    if(!Number.isFinite(severity)||severity<=0)continue;
    const eta=Number(threat.timeToImpact);
    const urgency=Number.isFinite(eta)?1/(.45+Math.max(0,eta)):1;
    const score=severity*urgency/(direction.distance+2);
    if(score<=bestScore)continue;
    bestScore=score;
    selected={...direction,kind:String(threat.kind||'THREAT').toUpperCase(),score,timeToImpact:Number.isFinite(eta)?Math.max(0,eta):null};
  }
  return selected;
}

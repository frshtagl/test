const VALID_TYPES=new Set(['scout','gunner','heavy']);
export function createSquadAssignment(type,sequence,wave=1,groupSize=4){
  if(!VALID_TYPES.has(type))throw new TypeError('Unknown squad member type.');
  const index=Number(sequence),waveNumber=Number(wave),size=Number(groupSize);
  if(!Number.isInteger(index)||index<1||!Number.isInteger(waveNumber)||waveNumber<1||!Number.isInteger(size)||size<2||size>8)throw new RangeError('Squad sequence, wave and group size are invalid.');
  const slot=(index-1)%size,squadIndex=Math.floor((index-1)/size);
  const role=type==='heavy'?'anchor':type==='gunner'?(slot%2?'support-right':'support-left'):(slot%2?'flank-right':'flank-left');
  const strafeSign=role.endsWith('left')?-1:role.endsWith('right')?1:(slot%2?-1:1);
  return{squadId:'wave-'+waveNumber+'-squad-'+(squadIndex+1),squadIndex,slot,role,strafeSign};
}
export function calculateSquadSeparation(position,allies,squadId,self=null,minDistance=2.35){
  const px=Number(position?.x),pz=Number(position?.z),radius=Number(minDistance);
  if(!squadId||!Number.isFinite(px)||!Number.isFinite(pz)||!Number.isFinite(radius)||radius<=0)return{x:0,z:0,magnitude:0};
  let x=0,z=0;
  for(const ally of allies||[]){
    if(ally===self||ally?.userData?.squadId!==squadId||!ally.position||!Number.isFinite(ally.position.x)||!Number.isFinite(ally.position.z))continue;
    let dx=px-ally.position.x,dz=pz-ally.position.z,distance=Math.hypot(dx,dz);
    if(distance>=radius)continue;
    if(distance<1e-6){
      const selfSlot=Number(self?.userData?.squadSlot)||0;
      const allySlot=Number(ally?.userData?.squadSlot)||1;
      const angle=((selfSlot-allySlot+8)%8)*Math.PI/4;
      dx=Math.cos(angle);dz=Math.sin(angle);distance=1;
    }
    const weight=(radius-distance)/radius;
    x+=(dx/distance)*weight;z+=(dz/distance)*weight;
  }
  const magnitude=Math.hypot(x,z);
  if(magnitude>1){x/=magnitude;z/=magnitude;}
  return{x,z,magnitude:Math.min(1,magnitude)};
}
export function relaySquadContact(source,members,target){
  if(!source?.squadId||!source.brain||!Number.isFinite(target?.x)||!Number.isFinite(target?.z))return 0;
  let updated=0;
  for(const member of members||[]){
    if(member===source||member?.squadId!==source.squadId||!member.brain?.lastKnown)continue;
    const brain=member.brain,dx=brain.lastKnown.x-target.x,dz=brain.lastKnown.z-target.z;
    if(Math.hypot(dx,dz)>1.25||brain.lostSightTime>.35){
      brain.lastKnown.x=target.x;brain.lastKnown.z=target.z;
      brain.lostSightTime=0;brain.repathTimer=0;updated++;
    }
  }
  return updated;
}

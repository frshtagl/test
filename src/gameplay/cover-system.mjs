const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function createCoverState(id,maxHealth=180){
  if(typeof id!=='string'||!id.trim())throw new TypeError('Cover id must be a non-empty string.');
  const health=Number(maxHealth);
  if(!Number.isFinite(health)||health<=0)throw new RangeError('Cover maximum health must be a positive finite number.');
  return{id,maxHealth:health,health,ratio:1,stage:'intact',destroyed:false};
}
export function applyCoverDamage(state,amount){
  if(!state||!Number.isFinite(state.maxHealth)||!Number.isFinite(state.health))throw new TypeError('A valid cover state is required.');
  const requested=Number(amount);
  if(!Number.isFinite(requested)||requested<=0||state.destroyed||state.health<=0){
    return{applied:false,damage:0,health:Math.max(0,state.health),ratio:state.ratio,stage:state.stage,destroyed:state.destroyed};
  }
  const previousStage=state.stage,previousHealth=state.health;
  state.health=clamp(previousHealth-requested,0,state.maxHealth);
  state.ratio=state.health/state.maxHealth;
  state.destroyed=state.health<=0;
  state.stage=state.destroyed?'destroyed':state.ratio<=.2?'critical':state.ratio<=.65?'damaged':'intact';
  return{applied:true,damage:previousHealth-state.health,health:state.health,ratio:state.ratio,stage:state.stage,previousStage,destroyed:state.destroyed};
}

export function createCoverCollider(id,x,z,rotation=0){
  if(typeof id!=='string'||!id.trim())throw new TypeError('Cover collider id must be a non-empty string.');
  const px=Number(x),pz=Number(z),angle=Number(rotation);
  if(!Number.isFinite(px)||!Number.isFinite(pz)||!Number.isFinite(angle))throw new TypeError('Cover collider transform must be finite.');
  const cosine=Math.abs(Math.cos(angle)),sine=Math.abs(Math.sin(angle));
  return{
    id,x:px,z:pz,
    halfX:cosine*1.5+sine*.5975+.04,
    halfZ:sine*1.5+cosine*.5975+.04,
    centerY:.6783,halfY:.6783,material:'composite'
  };
}

export const FPS_MOVEMENT_TUNING = Object.freeze({
  walkSpeed:5.6, sprintSpeed:8.6, crouchSpeed:3.1,
  slideStartSpeed:9.4, slideEndSpeed:2.8, slideDuration:.68, slideCooldown:1.2,
  groundAcceleration:22, airAcceleration:7, groundFriction:20, airFriction:1.6,
  gravity:22, jumpVelocity:8.25, sprintDrain:27, staminaRegen:21,
  staminaRegenDelay:.9, crouchBlendSpeed:10, maxDelta:.05
});
export function createFpsControllerState() {
  return {velocityX:0,velocityZ:0,verticalVelocity:0,height:0,grounded:true,
    crouchBlend:0,slideRemaining:0,slideCooldown:0,slideDirectionX:0,slideDirectionZ:-1,
    stamina:100,staminaRegenDelay:0,bobPhase:0};
}
function approach(value,target,amount) {
  if(value<target) return Math.min(target,value+amount);
  return Math.max(target,value-amount);
}
export function stepFpsController(state,input,deltaSeconds,speedMultiplier=1) {
  const dt=Math.min(FPS_MOVEMENT_TUNING.maxDelta,Math.max(0,Number(deltaSeconds)||0));
  const t=FPS_MOVEMENT_TUNING, yaw=Number(input.yaw)||0;
  state.slideCooldown=Math.max(0,state.slideCooldown-dt);
  state.staminaRegenDelay=Math.max(0,state.staminaRegenDelay-dt);
  let axisX=Math.max(-1,Math.min(1,Number(input.moveX)||0));
  let axisForward=Math.max(-1,Math.min(1,Number(input.moveForward)||0));
  const axisLength=Math.hypot(axisX,axisForward);
  if(axisLength>1){axisX/=axisLength;axisForward/=axisLength;}
  const forwardX=-Math.sin(yaw),forwardZ=-Math.cos(yaw),rightX=Math.cos(yaw),rightZ=-Math.sin(yaw);
  let desiredX=forwardX*axisForward+rightX*axisX;
  let desiredZ=forwardZ*axisForward+rightZ*axisX;
  const desiredLength=Math.hypot(desiredX,desiredZ);
  if(desiredLength>1e-6){desiredX/=desiredLength;desiredZ/=desiredLength;}
  const horizontalSpeed=Math.hypot(state.velocityX,state.velocityZ);
  if(input.slidePressed&&input.sprint&&state.grounded&&!state.slideRemaining&&state.slideCooldown<=0&&horizontalSpeed>2.2){
    state.slideRemaining=t.slideDuration;state.slideCooldown=t.slideCooldown;
    if(horizontalSpeed>.1){state.slideDirectionX=state.velocityX/horizontalSpeed;state.slideDirectionZ=state.velocityZ/horizontalSpeed;}
    else{state.slideDirectionX=desiredX;state.slideDirectionZ=desiredZ;}
  }
  const sliding=state.slideRemaining>0,moving=desiredLength>1e-5||sliding;
  const wantsSprint=Boolean(input.sprint&&desiredLength>1e-5&&!input.crouch&&!sliding&&state.stamina>0);
  if(wantsSprint){state.stamina=Math.max(0,state.stamina-t.sprintDrain*dt);state.staminaRegenDelay=t.staminaRegenDelay;}
  else if(state.staminaRegenDelay<=0) state.stamina=Math.min(100,state.stamina+t.staminaRegen*dt);
  if(sliding){
    state.slideRemaining=Math.max(0,state.slideRemaining-dt);
    const progress=state.slideRemaining/t.slideDuration;
    const speed=t.slideEndSpeed+(t.slideStartSpeed-t.slideEndSpeed)*progress;
    state.velocityX=approach(state.velocityX,state.slideDirectionX*speed,t.groundAcceleration*1.25*dt);
    state.velocityZ=approach(state.velocityZ,state.slideDirectionZ*speed,t.groundAcceleration*1.25*dt);
  }else{
    const crouching=Boolean(input.crouch);
    const maxSpeed=(crouching?t.crouchSpeed:wantsSprint?t.sprintSpeed:t.walkSpeed)*Math.max(.25,Number(speedMultiplier)||1);
    const targetX=desiredX*maxSpeed,targetZ=desiredZ*maxSpeed;
    const acceleration=state.grounded?t.groundAcceleration:t.airAcceleration;
    const friction=state.grounded?t.groundFriction:t.airFriction;
    if(desiredLength>1e-5){state.velocityX=approach(state.velocityX,targetX,acceleration*dt);state.velocityZ=approach(state.velocityZ,targetZ,acceleration*dt);}
    else{state.velocityX=approach(state.velocityX,0,friction*dt);state.velocityZ=approach(state.velocityZ,0,friction*dt);}
  }
  if(input.jumpPressed&&state.grounded){state.verticalVelocity=t.jumpVelocity;state.grounded=false;state.slideRemaining=0;}
  state.verticalVelocity-=t.gravity*dt;
  state.height=Math.max(0,state.height+state.verticalVelocity*dt);
  if(state.height<=0&&state.verticalVelocity<=0){state.height=0;state.verticalVelocity=0;state.grounded=true;}
  const crouching=Boolean(input.crouch||state.slideRemaining>0);
  state.crouchBlend=approach(state.crouchBlend,crouching?1:0,t.crouchBlendSpeed*dt);
  const speed=Math.hypot(state.velocityX,state.velocityZ);
  state.bobPhase+=dt*(speed>.25?(wantsSprint?13:crouching?7:10):2);
  return {dx:state.velocityX*dt,dz:state.velocityZ*dt,height:state.height,moving:moving||speed>.25,
    sprinting:wantsSprint,crouching,sliding:state.slideRemaining>0,grounded:state.grounded,speed,
    stamina:state.stamina,crouchBlend:state.crouchBlend,bobPhase:state.bobPhase};
}
export function resetFpsControllerState(state){Object.assign(state,createFpsControllerState());return state;}

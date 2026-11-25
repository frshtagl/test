import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const root = document.querySelector('#game');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080f1b);
scene.fog = new THREE.Fog(0x080f1b, 25, 85);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, .1, 150);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
root.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x9abfff,0x18212d,2));
const key = new THREE.DirectionalLight(0x9edcff,2.1); key.position.set(-12,22,8); key.castShadow=true; key.shadow.mapSize.set(1024,1024); scene.add(key);
const cyanLight = new THREE.PointLight(0x16cde8,25,35); cyanLight.position.set(0,6,0); scene.add(cyanLight);
const orangeLight = new THREE.PointLight(0xff653d,18,30); orangeLight.position.set(-18,5,-15); scene.add(orangeLight);

const mat=(color,roughness=.7,metalness=.1,emissive=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness,emissive,emissiveIntensity:emissive?1.5:0});
const floorMat=mat(0x111d2a,.9,.3), wallMat=mat(0x1c2b3c,.8,.45), cyanMat=mat(0x24d8ed,.35,.4,0x087b90), orangeMat=mat(0xff7a43,.4,.3,0x8a260c);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(70,70),floorMat); floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
const grid=new THREE.GridHelper(70,35,0x24516a,0x1b3448); grid.position.y=.012; scene.add(grid);
const arena=new THREE.Group(); scene.add(arena);
function box(parent,x,y,z,sx,sy,sz,material){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
for(let i=-1;i<=1;i+=2){box(arena,i*24,3,0,1,6,50,wallMat);box(arena,0,3,i*24,50,6,1,wallMat);}
for(let i=0;i<4;i++){const a=i*Math.PI/2;const pillar=box(arena,Math.cos(a)*17,2.8,Math.sin(a)*17,2,5.6,2,wallMat);const strip=box(arena,Math.cos(a)*17,4.8,Math.sin(a)*17,2.1,.12,2.1,cyanMat);}
for(let i=0;i<12;i++){const a=i*Math.PI/6;const x=Math.cos(a)*22,z=Math.sin(a)*22;const p=box(arena,x,.2,z,.35,.4,.35,cyanMat);}
for(let i=0;i<10;i++){const x=(Math.random()-.5)*34,z=(Math.random()-.5)*34;if(Math.hypot(x,z)>8)box(arena,x,.9,z,2.2,1.8,2.2,wallMat);}
const player=new THREE.Group(); scene.add(player);
const body=new THREE.Mesh(new THREE.CapsuleGeometry(.48,.95,5,10),mat(0x294a63,.5,.55));body.position.y=1.12;body.castShadow=true;player.add(body);
const visor=new THREE.Mesh(new THREE.BoxGeometry(.55,.16,.12),cyanMat);visor.position.set(0,1.55,-.37);player.add(visor);
const shoulder=box(player,-.42,1.3,-.05,.28,.35,.35,mat(0x172b3e)); const shoulder2=box(player,.42,1.3,-.05,.28,.35,.35,mat(0x172b3e));
const gun=box(player,.35,1.25,-.55,.18,.18,.8,mat(0x9baebe,.3,.8));gun.rotation.x=-.06;
player.position.set(0,0,8);
const muzzle=new THREE.Object3D();muzzle.position.set(.35,1.25,-.98);player.add(muzzle);
const keys={};let yaw=0,pitch=-.13,started=false,gameOver=false,aimAssist=true,autoFire=true,aimRange=24,health=100,kills=0,wave=1,ammo=30,reloading=false,lastShot=0,dashCooldown=0,invuln=0,spawnTimer=0,toastTimer=0,target=null;
const enemies=[],shots=[],effects=[];
const $=id=>document.getElementById(id);
function showToast(t){$('toast').textContent=t;$('toast').classList.add('show');toastTimer=2.3;}
function updateHUD(){$('kills').textContent=String(kills).padStart(3,'0');$('wave').textContent=String(wave).padStart(2,'0');$('hostiles').textContent=String(enemies.length).padStart(2,'0');$('health-text').textContent=Math.ceil(health)+' / 100';$('health-bar').style.width=health+'%';$('ammo').innerHTML=ammo+'<span> / 30</span>';$('threat').textContent=wave<3?'LOW':wave<6?'ELEVATED':'CRITICAL';$('phase').textContent='ACTIVE';}
function makeEnemy(){const a=Math.random()*Math.PI*2,r=17+Math.random()*5;const e=new THREE.Group();const shell=mat(0x793d39,.45,.5,0x3b100d);const core=mat(0xff7651,.3,.3,0xc43d1d);const torso=new THREE.Mesh(new THREE.BoxGeometry(.95,1.05,.65),shell);torso.position.y=1.15;torso.castShadow=true;e.add(torso);const head=new THREE.Mesh(new THREE.IcosahedronGeometry(.43,1),shell);head.position.y=1.95;head.castShadow=true;e.add(head);const eye=new THREE.Mesh(new THREE.BoxGeometry(.48,.12,.08),core);eye.position.set(0,1.98,-.39);e.add(eye);for(let s of [-1,1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.25,.75,.3),shell);leg.position.set(s*.28,.38,0);e.add(leg);const arm=new THREE.Mesh(new THREE.BoxGeometry(.22,.8,.25),shell);arm.position.set(s*.62,1.2,0);e.add(arm);}e.position.set(Math.cos(a)*r,0,Math.sin(a)*r);e.userData={hp:wave>=5?100:70,speed:1.15+wave*.09,attack:0,flash:0};scene.add(e);enemies.push(e);}
function spawnWave(){const count=Math.min(4+wave*2,18);for(let i=0;i<count;i++)setTimeout(()=>{if(started&&!gameOver)makeEnemy();},i*420);showToast('WAVE '+String(wave).padStart(2,'0')+' // HOSTILES INBOUND');}
function projectile(from,to,hostile=false){const dir=new THREE.Vector3().subVectors(to,from).normalize();const mesh=new THREE.Mesh(new THREE.SphereGeometry(hostile?.09:.075,8,8),hostile?orangeMat:cyanMat);mesh.position.copy(from);scene.add(mesh);shots.push({mesh,dir,speed:hostile?16:48,life:2,hostile,damage:hostile?8:35});}
function nearestTarget(){let best=null,bestScore=Infinity;const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));for(const e of enemies){const delta=new THREE.Vector3().subVectors(e.position,player.position);const dist=delta.length();if(dist>aimRange)continue;const dot=forward.dot(delta.clone().normalize());if(dot<-.05)continue;const score=dist+(1-dot)*8;if(score<bestScore){bestScore=score;best=e;}}return best;}
function shoot(){if(ammo<=0||reloading||performance.now()-lastShot<155)return;lastShot=performance.now();ammo--;const origin=new THREE.Vector3();muzzle.getWorldPosition(origin);let dest;if(target){dest=target.position.clone().add(new THREE.Vector3(0,1.3,0));}else{const dir=new THREE.Vector3(-Math.sin(yaw),Math.sin(-pitch),-Math.cos(yaw));dest=origin.add(dir.multiplyScalar(45));}projectile(origin,dest);updateHUD();}
function reload(){if(reloading||ammo===30)return;reloading=true;$('reload-label').textContent='RELOADING';setTimeout(()=>{ammo=30;reloading=false;$('reload-label').textContent='READY';updateHUD();},1250);}
function damage(amount){if(invuln>0)return;health=Math.max(0,health-amount);invuln=.4;updateHUD();if(health<=0){gameOver=true;document.exitPointerLock?.();$('final-kills').textContent=kills;$('end-screen').classList.remove('hidden');}}
function addBurst(pos,color=0x50e6f2){const m=new THREE.Mesh(new THREE.SphereGeometry(.2,8,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}));m.position.copy(pos);scene.add(m);effects.push({mesh:m,life:.25,max:.25});}
function start(){started=true;gameOver=false;health=100;kills=0;wave=1;ammo=30;reloading=false;for(const e of enemies)scene.remove(e);enemies.length=0;for(const s of shots)scene.remove(s.mesh);shots.length=0;player.position.set(0,0,8);yaw=0;pitch=-.13;$('start-screen').classList.add('hidden');$('end-screen').classList.add('hidden');spawnWave();updateHUD();renderer.domElement.requestPointerLock?.();}
$('start-button').addEventListener('click',start);$('restart-button').addEventListener('click',start);
$('aim-toggle').addEventListener('change',e=>aimAssist=e.target.checked);$('fire-toggle').addEventListener('change',e=>autoFire=e.target.checked);$('aim-range').addEventListener('input',e=>{aimRange=+e.target.value;$('range-value').textContent=aimRange+'m';});
renderer.domElement.addEventListener('click',()=>{if(started&&!gameOver&&document.pointerLockElement!==renderer.domElement)renderer.domElement.requestPointerLock();});
addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyR')reload();if(e.code==='KeyT'){$('aim-toggle').click();}if(e.code==='KeyF'){$('fire-toggle').click();}if(e.code==='Space'&&started&&dashCooldown<=0){const d=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));player.position.addScaledVector(d,5);dashCooldown=2;invuln=.25;addBurst(player.position.clone().add(new THREE.Vector3(0,1,0)));}});
addEventListener('keyup',e=>keys[e.code]=false);
addEventListener('mousemove',e=>{if(document.pointerLockElement===renderer.domElement){yaw-=e.movementX*.0022;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.0018,-.65,.35);}});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function tick(dt){if(!started||gameOver)return;invuln=Math.max(0,invuln-dt);dashCooldown=Math.max(0,dashCooldown-dt);const move=new THREE.Vector3();if(keys.KeyW)move.z-=1;if(keys.KeyS)move.z+=1;if(keys.KeyA)move.x-=1;if(keys.KeyD)move.x+=1;if(move.lengthSq()){move.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),yaw);player.position.addScaledVector(move,dt*(keys.ShiftLeft?10:6));}player.position.x=THREE.MathUtils.clamp(player.position.x,-21,21);player.position.z=THREE.MathUtils.clamp(player.position.z,-21,21);player.rotation.y=yaw;
const camOffset=new THREE.Vector3(0,4.1,7.4).applyAxisAngle(new THREE.Vector3(0,1,0),yaw);const desired=player.position.clone().add(camOffset);camera.position.lerp(desired,1-Math.pow(.001,dt));const look=player.position.clone().add(new THREE.Vector3(0,1.5,0));look.add(new THREE.Vector3(-Math.sin(yaw)*8, pitch*5,-Math.cos(yaw)*8));camera.lookAt(look);
target=aimAssist?nearestTarget():null;$('lock-label').classList.toggle('visible',!!target);if(target){const screen=new THREE.Vector3(target.position.x,target.position.y+2.5,target.position.z).project(camera);$('lock-label').style.left=((screen.x*.5+.5)*innerWidth)+'px';$('lock-label').style.top=((-screen.y*.5+.5)*innerHeight+16)+'px';}
if(autoFire&&target)shoot();else if(keys.Mouse0)shoot();
for(let i=enemies.length-1;i>=0;i--){const e=enemies[i],data=e.userData;const delta=new THREE.Vector3().subVectors(player.position,e.position);const dist=delta.length();if(dist>1.65){delta.normalize();e.position.addScaledVector(delta,data.speed*dt);e.rotation.y=Math.atan2(delta.x,delta.z);}else{data.attack-=dt;if(data.attack<=0){damage(8);data.attack=1.05;}}}
for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.mesh.position.addScaledVector(s.dir,s.speed*dt);s.life-=dt;let hit=false;if(!s.hostile){for(let j=enemies.length-1;j>=0;j--){const e=enemies[j];if(s.mesh.position.distanceTo(e.position.clone().add(new THREE.Vector3(0,1.1,0)))<.95){e.userData.hp-=s.damage;addBurst(s.mesh.position);hit=true;if(e.userData.hp<=0){scene.remove(e);enemies.splice(j,1);kills++;updateHUD();}break;}}}else if(s.mesh.position.distanceTo(player.position.clone().add(new THREE.Vector3(0,1,0)))<.8){damage(s.damage);hit=true;}if(hit||s.life<=0||s.mesh.position.length()>55){scene.remove(s.mesh);shots.splice(i,1);}}
for(let i=effects.length-1;i>=0;i--){const fx=effects[i];fx.life-=dt;fx.mesh.scale.multiplyScalar(1+dt*7);fx.mesh.material.opacity=Math.max(0,fx.life/fx.max);if(fx.life<=0){scene.remove(fx.mesh);effects.splice(i,1);}}
if(enemies.length===0){spawnTimer+=dt;if(spawnTimer>2.5){spawnTimer=0;wave++;spawnWave();updateHUD();}}else spawnTimer=0;
if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('show');}
if(ammo===0&&!reloading)reload();
}
let previous=performance.now();function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-previous)/1000,.04);previous=now;tick(dt);renderer.render(scene,camera);}animate(previous);
updateHUD();
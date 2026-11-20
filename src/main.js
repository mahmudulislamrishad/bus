import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

const renderer = new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.7)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace; document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x9cc8e5); scene.fog=new THREE.Fog(0x9cc8e5,70,260);
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,500);
scene.add(new THREE.HemisphereLight(0xffffff,0x52613c,2)); const sun=new THREE.DirectionalLight(0xffffff,2.2); sun.position.set(-30,55,25); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);
const mat=(c)=>new THREE.MeshStandardMaterial({color:c,roughness:.85});
const grass=mat(0x508a43), asphalt=mat(0x34383b), stripe=mat(0xe5e1d2), busPaint=mat(0xd71f36), glass= new THREE.MeshStandardMaterial({color:0x152d3b,metalness:.2,roughness:.25}), tire=mat(0x141414), trim=mat(0xd9d9d9);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),grass); ground.rotation.x=-Math.PI/2; ground.position.y=-.06; ground.receiveShadow=true; scene.add(ground);
const road=new THREE.Mesh(new THREE.PlaneGeometry(12,400),asphalt); road.rotation.x=-Math.PI/2; road.position.z=-130; road.receiveShadow=true; scene.add(road);
// Road edge lines and dashed center line
for(let x of [-5.4,5.4]){const l=new THREE.Mesh(new THREE.BoxGeometry(.12,.025,400),stripe); l.position.set(x,.02,-130);scene.add(l)}
for(let z=15;z>-380;z-=12){let d=new THREE.Mesh(new THREE.BoxGeometry(.18,.03,5),stripe);d.position.set(0,.03,z);scene.add(d)}
// simple roadside trees and huts
function tree(x,z){let trunk=new THREE.Mesh(new THREE.CylinderGeometry(.22,.3,2.8,8),mat(0x795235));trunk.position.set(x,1.35,z);trunk.castShadow=true;scene.add(trunk);let crown=new THREE.Mesh(new THREE.SphereGeometry(1.7,10,8),mat(0x26733c));crown.position.set(x,3.4,z);crown.castShadow=true;scene.add(crown)}
for(let z=12;z>-350;z-=18){tree(-10-Math.random()*3,z);tree(10+Math.random()*3,z-7)}
function hut(x,z){let b=new THREE.Mesh(new THREE.BoxGeometry(5,3.2,5),mat(0xc9a477));b.position.set(x,1.6,z);b.castShadow=true;scene.add(b);let roof=new THREE.Mesh(new THREE.ConeGeometry(4,1.5,4),mat(0x7b4336));roof.position.set(x,3.8,z);roof.rotation.y=Math.PI/4;scene.add(roof)}
for(let z=-20;z>-300;z-=45){hut(-18,z);hut(18,z-20)}
// Procedural bus mesh
const bus=new THREE.Group();scene.add(bus);bus.position.set(0,0,5);
const body=new THREE.Mesh(new THREE.BoxGeometry(2.7,3.5,8),busPaint);body.position.y=2.25;body.castShadow=true;bus.add(body);
const upper=new THREE.Mesh(new THREE.BoxGeometry(2.55,1.35,7.4),busPaint);upper.position.set(0,4.15,-.15);upper.castShadow=true;bus.add(upper);
const windshield=new THREE.Mesh(new THREE.BoxGeometry(2.45,1.15,.08),glass);windshield.position.set(0,4.05,3.98);bus.add(windshield);
for(let side of [-1,1]){for(let z of [-2.8,-1.4,.1,1.5]){let w=new THREE.Mesh(new THREE.BoxGeometry(.06,1.1,1.1),glass);w.position.set(side*1.36,3.75,z);bus.add(w)};for(let z of [-2.7,2.6]){let wh=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.28,16),tire);wh.rotation.z=Math.PI/2;wh.position.set(side*1.45,.7,z);wh.castShadow=true;bus.add(wh)}}
const front=new THREE.Mesh(new THREE.BoxGeometry(2.4,.35,.1),trim);front.position.set(0,1.3,4.04);bus.add(front);const bumper=new THREE.Mesh(new THREE.BoxGeometry(2.6,.25,.3),trim);bumper.position.set(0,.55,4.1);bus.add(bumper);
// cockpit approximation dashboard
const dash=new THREE.Mesh(new THREE.BoxGeometry(2.4,.45,.8),mat(0x20272a));dash.position.set(0,1.6,3.2);bus.add(dash);
const wheel=new THREE.Mesh(new THREE.TorusGeometry(.38,.07,8,24),mat(0x111111));wheel.position.set(-.65,1.95,3.5);wheel.rotation.x=Math.PI/2;bus.add(wheel);
// Collision barriers
for(let x of [-6.8,6.8]){const barrier=new THREE.Mesh(new THREE.BoxGeometry(.5,1,400),mat(0x5b5c60));barrier.position.set(x,.5,-130);scene.add(barrier)}
let speed=0,steer=0,camMode=0,started=false,paused=false;const maxSpeed=28;const keys={left:false,right:false,gas:false,brake:false,reverse:false};
function setHold(id,key){const el=document.getElementById(id);const down=e=>{e.preventDefault();keys[key]=true},up=e=>{e.preventDefault();keys[key]=false};el.addEventListener('pointerdown',down);['pointerup','pointercancel','pointerleave'].forEach(ev=>el.addEventListener(ev,up));}
setHold('left','left');setHold('right','right');setHold('gas','gas');setHold('brake','brake');setHold('reverse','reverse');
document.getElementById('play').onclick=()=>{started=true;document.getElementById('menu').classList.add('hidden')};
document.getElementById('camera').onclick=()=>camMode=(camMode+1)%3;
document.getElementById('pause').onclick=()=>{paused=true;document.getElementById('paused').classList.remove('hidden')};document.getElementById('resume').onclick=()=>{paused=false;document.getElementById('paused').classList.add('hidden')};document.getElementById('restart').onclick=()=>{bus.position.set(0,0,5);speed=0;steer=0;paused=false;document.getElementById('paused').classList.add('hidden')};
document.getElementById('horn').onclick=()=>{ /* audio slot reserved */ };
window.addEventListener('keydown',e=>{if(['ArrowLeft','a'].includes(e.key))keys.left=true;if(['ArrowRight','d'].includes(e.key))keys.right=true;if(['ArrowUp','w'].includes(e.key))keys.gas=true;if(['ArrowDown','s'].includes(e.key))keys.brake=true;if(e.key===' ')keys.brake=true});window.addEventListener('keyup',e=>{if(['ArrowLeft','a'].includes(e.key))keys.left=false;if(['ArrowRight','d'].includes(e.key))keys.right=false;if(['ArrowUp','w'].includes(e.key))keys.gas=false;if(['ArrowDown','s',' '].includes(e.key))keys.brake=false});
const clock=new THREE.Clock();
function update(dt){if(!started||paused)return;const throttle=keys.gas?1:0, braking=keys.brake?1:0, rev=keys.reverse?1:0;speed+=throttle*12*dt;speed-=braking*22*dt;speed-=rev*7*dt;if(!throttle&&!braking&&!rev)speed*=Math.pow(.985,dt*60);speed=Math.max(-5,Math.min(maxSpeed,speed));steer=(keys.left?1:0)-(keys.right?1:0);bus.rotation.y+=steer*dt*(.8+Math.abs(speed)/30);bus.position.x+=Math.sin(bus.rotation.y)*speed*dt*.5;bus.position.x=Math.max(-4.3,Math.min(4.3,bus.position.x));bus.position.z-=speed*dt*.35; // move slowly forward through scene
// Keep the bus near camera and move scenery/road illusion by resetting z
if(bus.position.z<-25){bus.position.z=5;}
// camera modes
let target;if(camMode===0){target=new THREE.Vector3(bus.position.x,4.6,bus.position.z+9);camera.position.lerp(new THREE.Vector3(bus.position.x,4.65,bus.position.z+1.2),.15);camera.rotation.set(0,0,0);camera.lookAt(target)}else if(camMode===1){camera.position.lerp(new THREE.Vector3(bus.position.x+steer*.2,6,bus.position.z+13),.1);camera.lookAt(bus.position.x,2,bus.position.z)}else{camera.position.lerp(new THREE.Vector3(bus.position.x,2.7,bus.position.z-12),.1);camera.lookAt(bus.position.x,2,bus.position.z)}
document.getElementById('speed').innerHTML=Math.round(Math.abs(speed)*3.6)+' <small>KM/H</small>';document.getElementById('gear').textContent=speed<-.5?'R':speed<.5?'N':'D';}
function loop(){requestAnimationFrame(loop);let dt=Math.min(clock.getDelta(),.05);update(dt);if(!started){camera.position.set(0,8,22);camera.lookAt(0,2,0)}renderer.render(scene,camera)}loop();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});

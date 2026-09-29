import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd3e8);
scene.fog = new THREE.Fog(0x8fd3e8, 30, 125);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 180);
camera.position.set(8, 6.5, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.querySelector('#game').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xe6fbff, 0x294052, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 3.5);
sun.position.set(-10, 16, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); scene.add(sun);

const mat = (color, roughness = .8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const roadMat = mat(0x273449), grassMat = mat(0x4f9062), yellowMat = mat(0xfbbf24);
const railMat = mat(0xdbeafe, .25, .45), wheelMat = mat(0x111827, .55);
const world = new THREE.Group(); scene.add(world);
const objects = [];

function addMesh(geometry, material, position, parent = world) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(...position); item.castShadow = item.receiveShadow = true; parent.add(item); return item;
}
addMesh(new THREE.PlaneGeometry(170, 42), grassMat, [0, 0, -48]).rotation.x = -Math.PI / 2;
addMesh(new THREE.BoxGeometry(13, .25, 155), roadMat, [0, -.13, -48]);
for (let z = 22; z > -125; z -= 8) addMesh(new THREE.BoxGeometry(.16, .035, 3.2), yellowMat, [0, .02, z]);
for (let z = 15; z > -115; z -= 12) for (const x of [-7.4, 7.4]) {
  addMesh(new THREE.CylinderGeometry(.18, .3, 1.1, 8), mat(0xf97316), [x, .55, z]);
  addMesh(new THREE.BoxGeometry(.08, 1.2, .08), mat(0xffffff), [x, 1.25, z]);
}

const obstacles = [], coins = [];
function addRail(z, x, height = 1.15) {
  const rail = new THREE.Group(); rail.position.set(x, 0, z);
  addMesh(new THREE.BoxGeometry(2.5, .1, .1), railMat, [0, height, 0], rail);
  for (const side of [-1, 1]) addMesh(new THREE.BoxGeometry(.1, height, .1), railMat, [side * 1.05, height / 2, 0], rail);
  rail.userData.kind = 'obstacle'; world.add(rail); obstacles.push(rail);
}
function addRamp(z, x) {
  const ramp = addMesh(new THREE.BoxGeometry(3.8, 1.2, 2.8), mat(0xf97316), [x, .55, z]);
  ramp.rotation.x = -.28; ramp.userData.kind = 'obstacle'; obstacles.push(ramp);
}
function addCoin(z, x, y = 1.25) {
  const coin = addMesh(new THREE.TorusGeometry(.22, .07, 8, 18), mat(0xfde047, .35, .6), [x, y, z]);
  coin.rotation.x = Math.PI / 2; coin.userData.kind = 'coin'; coins.push(coin);
}
addRail(-16, -3.3); addCoin(-16, 1.4, 1.4);
addRamp(-28, 2.2); addCoin(-28, 2.2, 2.3);
addRail(-41, 3.2, 1.4); addCoin(-41, -1.2, 1.1);
addRamp(-55, -2.5); addCoin(-55, -2.5, 2.2);
addRail(-70, -3.1); addCoin(-70, 2.3, 1.35);
addRamp(-84, 2.5); addCoin(-84, 2.5, 2.2);
addRail(-100, 3.3, 1.3); addCoin(-100, -1.8, 1.2);

// Sideways skateboard stance: deck, feet, hips, and shoulders all run across the road.
const player = new THREE.Group(); player.position.set(0, .6, 7); scene.add(player);
addMesh(new THREE.BoxGeometry(2.25, .13, .44), mat(0xf43f5e, .55), [0, 0, 0], player);
for (const x of [-.72, .72]) {
  addMesh(new THREE.BoxGeometry(.12, .08, .5), railMat, [x, -.12, 0], player);
  for (const z of [-.19, .19]) { const wheel = addMesh(new THREE.CylinderGeometry(.145, .145, .13, 16), wheelMat, [x, -.24, z], player); wheel.rotation.x = Math.PI / 2; }
}
const rider = new THREE.Group(); rider.rotation.y = Math.PI / 2; rider.position.y = .08; player.add(rider);
const shirt = mat(0x2563eb), skin = mat(0xfbbf24), pants = mat(0x172554), shoe = mat(0xf8fafc);
addMesh(new THREE.CapsuleGeometry(.3, .58, 6, 12), shirt, [0, .72, 0], rider);
addMesh(new THREE.SphereGeometry(.25, 16, 12), skin, [0, 1.3, 0], rider);
addMesh(new THREE.CylinderGeometry(.28, .28, .08, 16), mat(0xf97316), [0, 1.5, 0], rider);
for (const x of [-.34, .34]) { const leg = addMesh(new THREE.CapsuleGeometry(.11, .38, 5, 8), pants, [x, .33, 0], rider); leg.rotation.z = x < 0 ? -.2 : .2; addMesh(new THREE.BoxGeometry(.34, .1, .18), shoe, [x, .08, 0], rider); }
for (const side of [-1, 1]) { const arm = addMesh(new THREE.CapsuleGeometry(.09, .45, 5, 8), skin, [side * .36, .82, 0], rider); arm.rotation.z = side * .95; }

const keys = new Set();
let running = false, dead = false, score = 0, speed = 10, jumpVelocity = 0, combo = 0, collected = 0;
const scoreEl = document.querySelector('#score'), bestEl = document.querySelector('#best'), messageEl = document.querySelector('#message');
let best = Number(localStorage.getItem('skate-test1-best') || 0); bestEl.textContent = best;
function reset() { player.position.set(0, .6, 7); player.rotation.set(0, 0, 0); world.position.z = 0; speed = 10; score = 0; combo = 0; collected = 0; jumpVelocity = 0; dead = false; running = true; scoreEl.textContent = '0'; messageEl.textContent = ''; obstacles.forEach(item => item.userData.checked = false); coins.forEach(coin => { coin.visible = true; coin.userData.collected = false; }); }
function start() { if (dead) reset(); running = true; messageEl.textContent = ''; }
function jump() { if (player.position.y <= .61) { jumpVelocity = 7.8; combo = 0; } }
function crash() { running = false; dead = true; best = Math.max(best, score); localStorage.setItem('skate-test1-best', best); bestEl.textContent = best; messageEl.textContent = `Wipeout! Score ${score} · Press R or Space`; }
addEventListener('keydown', event => { keys.add(event.key.toLowerCase()); if (event.code === 'Space') { event.preventDefault(); running ? jump() : start(); } if (event.key.toLowerCase() === 'r') reset(); });
addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
addEventListener('pointerdown', () => running ? jump() : start());

function animate(time) {
  requestAnimationFrame(animate); const dt = Math.min((time - (animate.last || time)) / 1000, .05); animate.last = time;
  coins.forEach(coin => { coin.rotation.z += dt * 4; });
  if (running) {
    const steer = (keys.has('a') || keys.has('arrowleft') ? -1 : 0) + (keys.has('d') || keys.has('arrowright') ? 1 : 0);
    player.position.x = THREE.MathUtils.clamp(player.position.x + steer * dt * 7, -5.2, 5.2);
    if ((keys.has(' ') || keys.has('spacebar')) && player.position.y <= .61) jump();
    jumpVelocity -= 18 * dt; player.position.y = Math.max(.6, player.position.y + jumpVelocity * dt); if (player.position.y === .6) jumpVelocity = 0;
    world.position.z += speed * dt; speed = Math.min(18, speed + dt * .12); score = Math.floor(world.position.z * 2) + collected * 50; scoreEl.textContent = Math.max(0, score);
    player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, -steer * .08, .12);
    if (Math.abs(player.position.x) > 5.05) crash();
    for (const obstacle of obstacles) if (!obstacle.userData.checked && obstacle.position.z + world.position.z > 3) { obstacle.userData.checked = true; if (Math.abs(obstacle.position.x - player.position.x) < 1.7 && player.position.y < 1.35) crash(); }
    for (const coin of coins) if (!coin.userData.collected && coin.position.z + world.position.z > 2.5) { coin.userData.collected = true; coin.visible = false; if (Math.abs(coin.position.x - player.position.x) < .9 && Math.abs(coin.position.y - player.position.y) < 1.1) { collected++; combo++; score += 50 + combo * 10; } }
  }
  camera.lookAt(player.position.x * .25, 1.05, -18 + world.position.z * .08);
  renderer.render(scene, camera);
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
requestAnimationFrame(animate);

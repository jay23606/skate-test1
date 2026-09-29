import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bd7e8);
scene.fog = new THREE.Fog(0x9bd7e8, 28, 115);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 180);
camera.position.set(8, 7, 11);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.querySelector('#game').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdff8ff, 0x35505f, 2.1));
const sun = new THREE.DirectionalLight(0xffffff, 3.2);
sun.position.set(-8, 14, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); scene.add(sun);

const mat = (color, roughness = .8) => new THREE.MeshStandardMaterial({ color, roughness });
const roadMat = mat(0x263244), lineMat = mat(0xfbbf24), grassMat = mat(0x4f8a61), railMat = mat(0xe2e8f0, .35);
const group = new THREE.Group(); scene.add(group);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(170, 36), grassMat); ground.rotation.x = -Math.PI / 2; ground.position.z = -48; ground.receiveShadow = true; group.add(ground);
const road = new THREE.Mesh(new THREE.BoxGeometry(13, .25, 150), roadMat); road.position.set(0, -.13, -48); road.receiveShadow = true; group.add(road);
for (let z = 22; z > -120; z -= 8) { const dash = new THREE.Mesh(new THREE.BoxGeometry(.18, .03, 3.3), lineMat); dash.position.set(0, .02, z); group.add(dash); }

function cube(size, material, position) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...position); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh; }
function addRail(z, x = 0, height = 1.1) { const rail = new THREE.Group(); rail.position.set(x, 0, z); rail.add(cube([.1, height, .1], railMat, [-1, height / 2, 0])); rail.add(cube([.1, height, .1], railMat, [1, height / 2, 0])); rail.add(cube([2.2, .1, .1], railMat, [0, height, 0])); group.add(rail); return rail; }
function addRamp(z, x = 0) { const ramp = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.25, 2.7), mat(0xf97316)); ramp.position.set(x, .58, z); ramp.rotation.x = -.27; ramp.castShadow = ramp.receiveShadow = true; group.add(ramp); return ramp; }
addRail(-15, -3.3); addRamp(-27, 2.2); addRail(-40, 3.4, 1.45); addRamp(-55, -2.4); addRail(-70, -3.2); addRamp(-83, 2.6);

const player = new THREE.Group(); player.position.set(0, .6, 7); scene.add(player);
const board = cube([1.8, .13, .42], mat(0xf43f5e), [0, 0, 0]); board.parent = player; group.remove(board);
for (const x of [-.62, .62]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .12, 16), mat(0x111827)); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, -.19, 0); wheel.castShadow = true; player.add(wheel); }
const body = new THREE.Mesh(new THREE.CapsuleGeometry(.3, .65, 6, 12), mat(0x2563eb)); body.position.set(0, .65, 0); body.castShadow = true; player.add(body);
const head = new THREE.Mesh(new THREE.SphereGeometry(.25, 16, 12), mat(0xfbbf24)); head.position.set(0, 1.2, 0); head.castShadow = true; player.add(head);

const keys = new Set(); let running = false, dead = false, score = 0, speed = 10, jumpVelocity = 0;
const scoreEl = document.querySelector('#score'), bestEl = document.querySelector('#best'), messageEl = document.querySelector('#message');
let best = Number(localStorage.getItem('skate-test1-best') || 0); bestEl.textContent = best;
function start() { if (dead) reset(); running = true; messageEl.textContent = ''; }
function reset() { player.position.set(0, .6, 7); jumpVelocity = 0; score = 0; speed = 10; dead = false; running = true; messageEl.textContent = ''; group.position.z = 0; }
function jump() { if (player.position.y <= .61) jumpVelocity = 7.7; }
addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); if (e.code === 'Space') { e.preventDefault(); running ? jump() : start(); } if (e.key.toLowerCase() === 'r') reset(); });
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('pointerdown', () => running ? jump() : start());
function crash() { running = false; dead = true; best = Math.max(best, score); localStorage.setItem('skate-test1-best', best); bestEl.textContent = best; messageEl.textContent = `Wipeout! Score ${score} · Press R or Space`; }
function animate(time) {
  requestAnimationFrame(animate); const dt = Math.min((time - (animate.last || time)) / 1000, .05); animate.last = time;
  if (running) {
    const steer = (keys.has('a') || keys.has('arrowleft') ? -1 : 0) + (keys.has('d') || keys.has('arrowright') ? 1 : 0);
    player.position.x = THREE.MathUtils.clamp(player.position.x + steer * dt * 7, -5.2, 5.2);
    if (keys.has(' ') && player.position.y <= .61) jump();
    jumpVelocity -= 18 * dt; player.position.y = Math.max(.6, player.position.y + jumpVelocity * dt); if (player.position.y === .6) jumpVelocity = 0;
    group.position.z += speed * dt; speed += dt * .08; score = Math.floor(group.position.z * 2); scoreEl.textContent = Math.max(0, score);
    if (Math.abs(player.position.x) > 5.05) crash();
    for (const obstacle of group.children) { if (!obstacle.userData.checked && obstacle.position.z + group.position.z > 3) { obstacle.userData.checked = true; const close = Math.abs(obstacle.position.x - player.position.x) < 1.7; if (close && player.position.y < 1.35) crash(); } }
  }
  player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, -(keys.has('a') || keys.has('arrowleft') ? .18 : 0) + (keys.has('d') || keys.has('arrowright') ? .18 : 0), .12);
  camera.lookAt(player.position.x * .25, 1.1, player.position.z - 9); renderer.render(scene, camera);
}
animate(0);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

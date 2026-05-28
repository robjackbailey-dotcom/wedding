import * as THREE from "https://esm.sh/three@0.133.1/build/three.module.js";
import * as BufferGeometryUtils from "https://esm.sh/three@0.133.1/examples/jsm/utils/BufferGeometryUtils.js";

const container = document.getElementById("disco-container");
const canvasEl = document.getElementById("disco-canvas");
if (!container || !canvasEl) throw new Error("Disco ball elements not found");

const W = container.clientWidth || 200;
const H = container.clientHeight || 280;

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
  canvas: canvasEl,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(W, H);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
camera.position.set(0, 0, 2.8);

// Ambient fill — matches the page blue
const ambientLight = new THREE.AmbientLight(0xffffff, 3);
scene.add(ambientLight);

// Multiple fixed lights — positions randomised each load
const LIGHT_COLORS = [
  0xffffff, 0xffd700, 0xff88cc, 0x88ffee, 0xaabbff, 0xffffff, 0xffd700,
  0xffffff, 0xffd700, 0xff88cc, 0x88ffee, 0xaabbff, 0xffffff, 0xffd700,
  0xff88cc, 0x88ffee, 0xaabbff,
  0xff88cc, 0x88ffee, 0xaabbff,
];
function randPos(min, max) {
  return min + Math.random() * (max - min);
}
LIGHT_COLORS.forEach((color) => {
  const l = new THREE.PointLight(color, 0.4, 4);
  l.position.set(randPos(-3, 3), randPos(-2.5, 3), randPos(-2, 3.5));
  scene.add(l);
});

const BALL_X = 0.1;
const ball = createDiscoBall();
ball.position.set(BALL_X, 3.5, 0); // start off-screen above
scene.add(ball);

// String: thin cylinder from ceiling anchor to top of ball
const STRING_ANCHOR_Y = 1.4;
const BALL_RADIUS = 0.55;
const STRING_RADIUS = 0.008;
let stringLength = STRING_ANCHOR_Y - (ball.position.y + BALL_RADIUS);
const stringGeo = new THREE.CylinderGeometry(
  STRING_RADIUS,
  STRING_RADIUS,
  stringLength,
  6,
);
const stringMat = new THREE.MeshBasicMaterial({ color: 0x666666 });
const stringMesh = new THREE.Mesh(stringGeo, stringMat);
// Cylinder origin is at its centre, so offset downward by half its length from anchor
stringMesh.position.set(BALL_X, STRING_ANCHOR_Y - stringLength / 2, 0.01);
scene.add(stringMesh);

animate(ball, stringMesh);

function createDiscoBall() {
  const dummy = new THREE.Object3D();
  const mirrorMat = new THREE.MeshPhongMaterial({
    color: 0x2b35af, // base tile colour matches page
    specular: 0xffffff, // pure white highlights
    shininess: 600, // very tight, sharp specular flash
    flatShading: true, // each mirror tile facet is distinct
  });

  let geo = new THREE.IcosahedronGeometry(0.55, 13);
  geo.deleteAttribute("normal");
  geo.deleteAttribute("uv");
  geo = BufferGeometryUtils.mergeVertices(geo);
  geo.computeVertexNormals();

  const mirrorGeo = new THREE.PlaneGeometry(0.035, 0.035);
  const instancedMesh = new THREE.InstancedMesh(
    mirrorGeo,
    mirrorMat,
    geo.attributes.position.count,
  );

  const positions = geo.attributes.position.array;
  const normals = geo.attributes.normal.array;
  for (let i = 0; i < positions.length; i += 3) {
    dummy.position.set(positions[i], positions[i + 1], positions[i + 2]);
    dummy.lookAt(
      positions[i] + normals[i],
      positions[i + 1] + normals[i + 1],
      positions[i + 2] + normals[i + 2],
    );
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i / 3, dummy.matrix);
  }

  const innerMesh = new THREE.Mesh(
    geo.clone(),
    new THREE.MeshBasicMaterial({ color: 0x111122 }),
  );

  const group = new THREE.Group();
  group.add(innerMesh, instancedMesh);
  return group;
}

function animate(ball, stringMesh) {
  let elapsed = 0;
  const clock = new THREE.Clock();
  const DROP_FROM = 3.5;
  const REST_Y = 0;
  const DROP_DURATION = 1.1;

  // Spring easing: drops fast, slight bounce at landing
  function springEase(t) {
    const c = 3.5,
      d = 4.5;
    return 1 - Math.exp(-c * t) * Math.cos(d * t);
  }

  (function loop() {
    requestAnimationFrame(loop);
    const delta = clock.getDelta();
    elapsed += delta;

    // Drop animation
    if (elapsed < DROP_DURATION) {
      const raw = elapsed / DROP_DURATION;
      const ease = Math.min(springEase(raw * 1.8), 1.15);
      ball.position.y = DROP_FROM + (REST_Y - DROP_FROM) * ease;
    } else {
      ball.position.y = REST_Y;
    }

    // Resize and reposition string cylinder to span anchor → top of ball
    const topOfBall = ball.position.y + BALL_RADIUS;
    const newLength = Math.max(0.001, STRING_ANCHOR_Y - topOfBall);
    stringMesh.scale.y = newLength / stringLength; // scale to current length
    stringMesh.position.y = STRING_ANCHOR_Y - newLength / 2;

    // Only the ball rotates
    ball.rotation.y = elapsed * 0.3;

    renderer.render(scene, camera);
  })();
}

window.addEventListener("resize", () => {
  const nw = container.clientWidth || 200;
  const nh = container.clientHeight || 280;
  camera.aspect = nw / nh;
  camera.updateProjectionMatrix();
  renderer.setSize(nw, nh);
});

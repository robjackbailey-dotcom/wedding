import * as THREE from 'https://esm.sh/three@0.133.1/build/three.module.js';
import * as BufferGeometryUtils from 'https://esm.sh/three@0.133.1/examples/jsm/utils/BufferGeometryUtils.js';

const container = document.getElementById('disco-container');
const canvasEl  = document.getElementById('disco-canvas');
if (!container || !canvasEl) throw new Error('Disco ball elements not found');

const W = container.clientWidth  || 200;
const H = container.clientHeight || 280;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas: canvasEl });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(W, H);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
camera.position.set(0, 0, 2.8);

// Ambient fill — matches the page blue
const ambientLight = new THREE.AmbientLight(0xffffff, 3);
scene.add(ambientLight);

// Multiple fixed lights around the ball
const lights = [
  { color: 0xffffff, intensity: 0.5, x:  2.0,  y:  2.0, z:  3.0 },  // main white, top-front
  { color: 0xffd700, intensity: 0.5, x: -2.5,  y:  1.0, z:  2.0 },  // gold, left
  { color: 0xff88cc, intensity: 0.5, x:  2.0,  y: -2.0, z:  2.0 },  // pink, bottom-right
  { color: 0x88ffee, intensity: 0.5, x: -1.5,  y: -1.5, z: -2.0 },  // cyan, behind-left
  { color: 0xffffff, intensity: 0.5, x:  0.0,  y:  3.0, z:  1.0 },  // white from above
];
lights.forEach(({ color, intensity, x, y, z }) => {
  const l = new THREE.PointLight(color, intensity, 12);
  l.position.set(x, y, z);
  scene.add(l);
});

const ball = createDiscoBall();
ball.position.set(0.1, 0, 0);
scene.add(ball);
animate(ball);

function createDiscoBall() {
  const dummy     = new THREE.Object3D();
  const mirrorMat = new THREE.MeshPhongMaterial({
    color: 0x2b35af,     // base tile colour matches page
    specular: 0xffffff,  // pure white highlights
    shininess: 600,      // very tight, sharp specular flash
    flatShading: true,   // each mirror tile facet is distinct
  });

  let geo = new THREE.IcosahedronGeometry(0.55, 13);
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  geo = BufferGeometryUtils.mergeVertices(geo);
  geo.computeVertexNormals();

  const mirrorGeo     = new THREE.PlaneGeometry(0.035, 0.035);
  const instancedMesh = new THREE.InstancedMesh(
    mirrorGeo,
    mirrorMat,
    geo.attributes.position.count
  );

  const positions = geo.attributes.position.array;
  const normals   = geo.attributes.normal.array;
  for (let i = 0; i < positions.length; i += 3) {
    dummy.position.set(positions[i], positions[i+1], positions[i+2]);
    dummy.lookAt(
      positions[i]   + normals[i],
      positions[i+1] + normals[i+1],
      positions[i+2] + normals[i+2]
    );
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i / 3, dummy.matrix);
  }

  const innerMesh = new THREE.Mesh(
    geo.clone(),
    new THREE.MeshBasicMaterial({ color: 0x111122 })
  );

  const group = new THREE.Group();
  group.add(innerMesh, instancedMesh);
  return group;
}

function animate(ball) {
  let elapsed = 0;
  const clock  = new THREE.Clock();

  (function loop() {
    requestAnimationFrame(loop);
    const delta = clock.getDelta();
    elapsed    += delta;

    // Only the ball rotates
    ball.rotation.y  = elapsed * 0.3;

    renderer.render(scene, camera);
  })();
}

window.addEventListener('resize', () => {
  const nw = container.clientWidth  || 200;
  const nh = container.clientHeight || 280;
  camera.aspect = nw / nh;
  camera.updateProjectionMatrix();
  renderer.setSize(nw, nh);
});

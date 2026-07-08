import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { BENCH_MODELS } from "./config.js";

const MODELS = BENCH_MODELS;

const BENCH_SCALE = 0.55;
const GRID_SIZE = 7;
const CELL_SIZE = 1.5;

const canvas = document.getElementById("cityCanvas");
const container = document.getElementById("city-container");
const clearBtn = document.getElementById("clearBenches");
const zoomInBtn = document.getElementById("cityZoomIn");
const zoomOutBtn = document.getElementById("cityZoomOut");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
camera.position.set(5, 7, 5);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 1.2;
controls.maxDistance = 50;
controls.zoomSpeed = 2.0;
controls.enableZoom = true;

const ambient = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0xffffff, 0x333333, 1.2);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
keyLight.position.set(5, 10, 6);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
fillLight.position.set(-6, 4, -4);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
rimLight.position.set(0, 6, -8);
scene.add(rimLight);

const clickable = [];
const benchTemplates = [];
const placedBenches = [];
const loader = new GLTFLoader();
loader.setCrossOrigin("anonymous");
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let pointerDown = { x: 0, y: 0 };
let modelsReady = false;

function createCity() {
  const groundSize = GRID_SIZE * CELL_SIZE + 4;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundSize, groundSize),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.userData.type = "ground";
  scene.add(ground);
  clickable.push(ground);

  const offset = ((GRID_SIZE - 1) * CELL_SIZE) / 2;

  for (let x = 0; x < GRID_SIZE; x++) {
    for (let z = 0; z < GRID_SIZE; z++) {
      if (Math.random() < 0.12) continue;

      const width = 0.9 + Math.random() * 0.4;
      const depth = 0.8 + Math.random() * 0.4;
      const height = 0.6 + Math.random() * 2.4;

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({
          color: 0x1a1a1a,
          roughness: 0.85,
          metalness: 0.05,
        })
      );

      building.position.set(
        x * CELL_SIZE - offset,
        height / 2,
        z * CELL_SIZE - offset
      );
      building.userData.type = "building";
      scene.add(building);
      clickable.push(building);

      const edges = new THREE.EdgesGeometry(building.geometry);
      const wire = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x333333 })
      );
      wire.raycast = () => {};
      building.add(wire);
    }
  }
}

function prepareBenchTemplate(gltfScene) {
  const wrapper = new THREE.Group();
  const box = new THREE.Box3().setFromObject(gltfScene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = BENCH_SCALE / maxDim;

  gltfScene.position.set(
    -center.x * scale,
    -center.y * scale,
    -center.z * scale
  );
  gltfScene.scale.setScalar(scale);
  wrapper.add(gltfScene);
  return wrapper;
}

function loadBenchTemplates() {
  return Promise.all(
    MODELS.map(
      (path) =>
        new Promise((resolve, reject) => {
          loader.load(
            path,
            (gltf) => {
              benchTemplates.push(prepareBenchTemplate(gltf.scene));
              resolve();
            },
            undefined,
            reject
          );
        })
    )
  );
}

function placeBench(x, y, z) {
  if (!modelsReady || benchTemplates.length === 0) return;

  const template =
    benchTemplates[Math.floor(Math.random() * benchTemplates.length)];
  const bench = template.clone(true);
  bench.position.set(x, y, z);
  bench.rotation.y = Math.random() * Math.PI * 2;
  scene.add(bench);
  placedBenches.push(bench);
}

function getTargetType(object) {
  let current = object;
  while (current) {
    if (current.userData.type) return current;
    current = current.parent;
  }
  return null;
}

function handleClick(event) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(clickable, true);

  for (const hit of hits) {
    const target = getTargetType(hit.object);
    if (!target) continue;

    if (target.userData.type === "building") {
      const box = new THREE.Box3().setFromObject(target);
      placeBench(target.position.x, box.max.y, target.position.z);
      return;
    }

    if (target.userData.type === "ground") {
      placeBench(hit.point.x, 0, hit.point.z);
      return;
    }
  }
}

function clearBenches() {
  placedBenches.forEach((bench) => scene.remove(bench));
  placedBenches.length = 0;
}

function resize() {
  const width = container.clientWidth || 720;
  const height = 480;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

canvas.addEventListener("pointerdown", (e) => {
  pointerDown = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener("pointerup", (e) => {
  const dx = e.clientX - pointerDown.x;
  const dy = e.clientY - pointerDown.y;
  if (Math.sqrt(dx * dx + dy * dy) > 6) return;
  handleClick(e);
});

clearBtn.addEventListener("click", clearBenches);

zoomInBtn.addEventListener("click", () => {
  const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
  const next = Math.max(controls.minDistance, offset.length() * 0.75);
  offset.setLength(next);
  camera.position.copy(controls.target).add(offset);
});

zoomOutBtn.addEventListener("click", () => {
  const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
  const next = Math.min(controls.maxDistance, offset.length() * 1.35);
  offset.setLength(next);
  camera.position.copy(controls.target).add(offset);
});

window.addEventListener("resize", resize);

createCity();
resize();
animate();

loadBenchTemplates()
  .then(() => {
    modelsReady = true;
  })
  .catch((err) => {
    console.error("Failed to load bench models:", err);
  });

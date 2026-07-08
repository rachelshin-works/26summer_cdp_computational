import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const MODELS = [
  "assets/iS9XFEEXfDZmXR77jrXT-.glb",
  "assets/TR16miUSzq2L9oNuVKUMq.glb",
  "assets/ifdbWyUKwlzNqxSWeo9vY.glb",
];

const canvas = document.getElementById("viewerCanvas");
const counterEl = document.getElementById("modelCounter");
const prevBtn = document.getElementById("prevModel");
const nextBtn = document.getElementById("nextModel");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.target.set(0, 0, 0);
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;

let autoRotateTimeout = null;

controls.addEventListener("start", () => {
  controls.autoRotate = false;
  clearTimeout(autoRotateTimeout);
});

controls.addEventListener("end", () => {
  clearTimeout(autoRotateTimeout);
  autoRotateTimeout = setTimeout(() => {
    controls.autoRotate = true;
  }, 3000);
});

const ambient = new THREE.AmbientLight(0xffffff, 3.0);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0xffffff, 0x555555, 1.2);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
keyLight.position.set(3, 5, 4);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
fillLight.position.set(-4, 2, 3);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
rimLight.position.set(0, 3, -5);
scene.add(rimLight);

const underLight = new THREE.DirectionalLight(0xcccccc, 0.7);
underLight.position.set(0, -4, 2);
scene.add(underLight);

const modelGroup = new THREE.Group();
scene.add(modelGroup);

const loader = new GLTFLoader();
const loadedModels = [];
let currentIndex = 0;
let isTransitioning = false;

const DEFAULT_CAMERA = new THREE.Vector3(0, 0.2, 2.4);

function fitModel(gltfScene) {
  const wrapper = new THREE.Group();

  const box = new THREE.Box3().setFromObject(gltfScene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 1.5 / maxDim;

  gltfScene.position.set(
    -center.x * scale,
    -center.y * scale,
    -center.z * scale
  );
  gltfScene.scale.setScalar(scale);
  wrapper.add(gltfScene);

  return wrapper;
}

function resetView() {
  camera.position.copy(DEFAULT_CAMERA);
  controls.target.set(0, 0, 0);
  controls.autoRotate = true;
  controls.update();
}

function loadAllModels() {
  return Promise.all(
    MODELS.map(
      (path) =>
        new Promise((resolve, reject) => {
          loader.load(
            path,
            (gltf) => {
              const model = fitModel(gltf.scene);
              model.visible = false;
              modelGroup.add(model);
              loadedModels.push(model);
              resolve();
            },
            undefined,
            reject
          );
        })
    )
  );
}

function showModel(index) {
  loadedModels.forEach((model, i) => {
    model.visible = i === index;
  });
  counterEl.textContent = `${index + 1} / ${MODELS.length}`;
  resetView();
}

function goTo(index) {
  if (isTransitioning || loadedModels.length === 0) return;

  const nextIndex =
    ((index % loadedModels.length) + loadedModels.length) %
    loadedModels.length;

  if (nextIndex === currentIndex) return;

  isTransitioning = true;
  currentIndex = nextIndex;
  showModel(currentIndex);

  setTimeout(() => {
    isTransitioning = false;
  }, 200);
}

function resize() {
  const wrap = canvas.parentElement;
  const width = wrap.clientWidth;
  const height = wrap.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

prevBtn.addEventListener("click", () => goTo(currentIndex - 1));
nextBtn.addEventListener("click", () => goTo(currentIndex + 1));

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") goTo(currentIndex - 1);
  if (e.key === "ArrowRight") goTo(currentIndex + 1);
});

window.addEventListener("resize", resize);

loadAllModels()
  .then(() => {
    showModel(0);
    resize();
    animate();
  })
  .catch((err) => {
    console.error("Failed to load models:", err);
    counterEl.textContent = "failed to load";
  });

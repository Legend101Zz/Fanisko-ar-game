import * as THREE from "three";
import * as ZapparThree from "@zappar/zappar-threejs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import ZapparWebGLSnapshot from "@zappar/webgl-snapshot";

import "./index.css";

if (ZapparThree.browserIncompatible()) {
  // The browserIncompatibleUI() function shows a full-page dialog that informs the user
  // they're using an unsupported browser, and provides a button to 'copy' the current page
  // URL so they can 'paste' it into the address bar of a compatible alternative.
  ZapparThree.browserIncompatibleUI();

  // If the browser is not compatible, we can avoid setting up the rest of the page
  // so we throw an exception here.
  throw new Error("Unsupported browser");
}

const manager = new ZapparThree.LoadingManager();

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
const scene = new THREE.Scene();
document.body.appendChild(renderer.domElement);

// As with a normal ThreeJS scene, resize the canvas if the window resizes
renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create a Zappar camera that we'll use instead of a ThreeJS camera
const camera = new ZapparThree.Camera();

// In order to use camera and motion data, we need to ask the users for permission
// The Zappar library comes with some UI to help with that, so let's use it
ZapparThree.permissionRequestUI().then((granted) => {
  // If the user granted us the permissions we need then we can start the camera
  // Otherwise let's them know that it's necessary with Zappar's permission denied UI
  if (granted) camera.start(true); // true parameter for user facing camera
  else ZapparThree.permissionDeniedUI();
});

// The Zappar component needs to know our WebGL context, so set it like this:
ZapparThree.glContextSet(renderer.getContext());

// Set the background of our scene to be the camera background texture
// that's provided by the Zappar camera
scene.background = camera.backgroundTexture;

// Create a FaceTracker and a FaceAnchorGroup from it to put Three content in
// Pass our loading manager to the loader to ensure that the progress bar
// works correctly
const faceTracker = new ZapparThree.FaceTrackerLoader(manager).load();
const faceTrackerGroup = new ZapparThree.FaceAnchorGroup(camera, faceTracker);
// Add our face tracker group into the ThreeJS scene
scene.add(faceTrackerGroup);

// Start with the content group invisible
faceTrackerGroup.visible = false;

// We want the user's face to appear in the center of the helmet
// so use ZapparThree.HeadMaskMesh to mask out the back of the helmet.
// In addition to constructing here we'll call mask.updateFromFaceAnchorGroup(...)
// in the frame loop later.
const mask = new ZapparThree.HeadMaskMeshLoader().load();
faceTrackerGroup.add(mask);

// Load a 3D model to place within our group (using ThreeJS's GLTF loader)
// Pass our loading manager in to ensure the progress bar works correctly
const helmetSrc = new URL("../assets/gloves.glb", import.meta.url).href;
const gltfLoader = new GLTFLoader(manager);
gltfLoader.load(
  helmetSrc,
  (gltf) => {
    gltf.scene.scale.set(2, 2, 2);
    gltf.scene.position.set(0, -0.7, 1);
    gltf.scene.rotation.set(Math.PI / 2, 0, 0);
    console.log(gltf.scene);
    // Add the scene to the tracker group
    faceTrackerGroup.add(gltf.scene);
  },
  undefined,
  () => {
    console.log("An error ocurred loading the GLTF model");
  }
);

//--------BALL_CODE-----------

// Create a random starting position for the ball
const startX = Math.random() * 2 - 1; // Random horizontal position between -1 and 1
const startY = 2; // Start the ball at the top of the screen
const startZ = Math.random() * 2 - 1; // Random depth position between -1 and 1
const speed = 0.01; // Adjust the speed as needed
const trajectory = new THREE.Vector3(startX, startY, startZ);
trajectory.normalize(); // Normalize the trajectory vector

const ballGeometry = new THREE.SphereGeometry(5, 32, 32);
const ballMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.position.set(startX, startY, startZ);
scene.add(ball);

// Let's add some lighting, first a directional light above the model pointing down
const directionalLight = new THREE.DirectionalLight("white", 0.8);
directionalLight.position.set(0, 5, 0);
directionalLight.lookAt(0, 0, 0);
scene.add(directionalLight);

// And then a little ambient light to brighten the model up a bit
const ambientLight = new THREE.AmbientLight("white", 0.4);
scene.add(ambientLight);

// Hide the 3D content when the face is out of view
faceTrackerGroup.faceTracker.onVisible.bind(() => {
  faceTrackerGroup.visible = true;
});
faceTrackerGroup.faceTracker.onNotVisible.bind(() => {
  faceTrackerGroup.visible = false;
});

// Get a reference to the 'Snapshot' button so we can attach a 'click' listener
const placeButton =
  document.getElementById("snapshot") || document.createElement("div");

placeButton.addEventListener("click", () => {
  // Get canvas from dom
  const canvas =
    document.querySelector("canvas") || document.createElement("canvas");

  // Convert canvas data to url
  const url = canvas.toDataURL("image/jpeg", 0.8);

  // Take snapshot
  ZapparWebGLSnapshot({
    data: url,
  });
});

// Use a function to render our scene as usual
function render(): void {
  // The Zappar camera must have updateFrame called every frame
  camera.updateFrame(renderer);

  // Update the head mask so it fits the user's head in this frame
  mask.updateFromFaceAnchorGroup(faceTrackerGroup);

  //  // Update the ball's position
  ball.position.add(trajectory.clone().multiplyScalar(speed));

  // Check if the ball is out of view (e.g., reached the bottom of the screen)
  if (ball.position.y < -1) {
    // Reset the ball's position at the top of the screen with a new random trajectory
    ball.position.set(startX, startY, startZ);
    trajectory.set(Math.random() * 2 - 1, 2, Math.random() * 2 - 1);
    trajectory.normalize();
  }

  // Draw the ThreeJS scene in the usual way, but using the Zappar camera
  renderer.render(scene, camera);

  // Call render() again next frame
  requestAnimationFrame(render);
}

// Start things off
render();

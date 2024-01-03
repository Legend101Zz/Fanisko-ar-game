import * as THREE from "three";
import * as ZapparThree from "@zappar/zappar-threejs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import TWEEN from "@tweenjs/tween.js";
import "./index.css";

const modelPath = new URL("../assets/gloves.glb", import.meta.url).href;
const imagePath1 = new URL("../assets/images/ball.png", import.meta.url).href;
const imagePath2 = new URL("../assets/images/ball2.png", import.meta.url).href;
const imagePath3 = new URL("../assets/images/ball3.png", import.meta.url).href;
const imagePath4 = new URL("../assets/images/ball4.png", import.meta.url).href;

// Listen for the popstate event
window.addEventListener("popstate", handlePopstate);
//@ts-ignore
const gameModal = new bootstrap.Modal(
  document.querySelector("#gameRulesModal"),
  {
    backdrop: "static", // Prevent clicking outside the modal to close it
    keyboard: false, // Prevent using the keyboard to close it
  }
);

window.addEventListener("load", () => {
  //on page load , open the login modal

  gameModal.show();
});
//@ts-ignore
document.querySelector(".start-game").addEventListener("click", (e) => {
  //hide the start modal
  gameModal.hide();
  // show the hiddenStart elements

  init();
});

const init = () => {
  var updateBoundingBoxes: () => void;
  var checkCollisions: () => void;
  var throwCricketBall: (obj: any) => void;
  var modelReady = false;
  var score = 0;

  var renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  var manager = new ZapparThree.LoadingManager();
  // Use this function to set your context
  var camera = new ZapparThree.Camera({
    rearCameraSource: "csO9c0YpAf274OuCPUA53CNE0YHlIr2yXCi+SqfBZZ8=",
    userCameraSource: "RKxXByjnabbADGQNNZqLVLdmXlS0YkETYCIbg+XxnvM=",
  });
  camera.userCameraMirrorMode = ZapparThree.CameraMirrorMode.Poses;
  ZapparThree.glContextSet(renderer.getContext());
  var scene = new THREE.Scene();
  scene.background = camera.backgroundTexture;

  if (ZapparThree.browserIncompatible()) {
    // The browserIncompatibleUI() function shows a full-page dialog that informs the user
    // they're using an unsupported browser, and provides a button to 'copy' the current page
    // URL so they can 'paste' it into the address bar of a compatible alternative.
    ZapparThree.browserIncompatibleUI();

    // If the browser is not compatible, we can avoid setting up the rest of the page
    // so we throw an exception here.
    throw new Error("Unsupported browser");
  }

  // Create a camera and set the scene background to the camera's backgroundTexture

  // Request camera permissions and start the camera
  ZapparThree.permissionRequestUI().then((granted) => {
    if (granted) {
      camera.start();
    } else ZapparThree.permissionDeniedUI();
  });

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

  // Hide the 3D content when the face is out of view
  faceTrackerGroup.faceTracker.onVisible.bind(() => {
    faceTrackerGroup.visible = true;

    window.history.pushState(
      { screen: "playing" },
      "Playing",
      window.location.href
    );
  });
  faceTrackerGroup.faceTracker.onNotVisible.bind(() => {
    faceTrackerGroup.visible = false;
  });

  //show lifes

  // Show the life icons after initialization
  const lifeIcons = document.querySelector(".life-icons");
  //@ts-ignore
  lifeIcons.style.display = "flex";

  // Create a cricket balls

  const cricketBallTextureLoader = new THREE.TextureLoader();
  const cricketBallTexture1 = cricketBallTextureLoader.load(imagePath1);
  const cricketBallTexture2 = cricketBallTextureLoader.load(imagePath2);
  const cricketBallTexture3 = cricketBallTextureLoader.load(imagePath3);
  const cricketBallTexture4 = cricketBallTextureLoader.load(imagePath4); // Adjust the path to your texture

  const cricketBallTextures = [
    cricketBallTexture1,
    cricketBallTexture2,
    cricketBallTexture3,
    cricketBallTexture4,
  ];

  // Create 6 ball icons
  const ballGeometry = new THREE.SphereGeometry(0.1, 32, 32);
  const ballMaterials = cricketBallTextures.map(
    (texture) => new THREE.MeshBasicMaterial({ map: texture })
  );

  let balls: THREE.Object3D<THREE.Event>[] = []; // Array to store the ball objects
  const ballBoundingBoxes: THREE.Box3[] = [];
  const boundingBoxMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });

  for (let i = 0; i < 6; i++) {
    const ball = new THREE.Mesh(
      ballGeometry,
      ballMaterials[i % ballMaterials.length]
    );
    ball.position.set(
      -0.757464742660522 + 0.3 * i,
      0.66717102974653244 + 2,
      -3.1538567543029785
    );
    ball.frustumCulled = false;
    ball.visible = false;
    scene.add(ball);
    // creating bounding boxes to check for collison
    const ballBoundingBox = new THREE.Box3();

    ballBoundingBox.min.x = 0.02; // Adjust min X position to narrow the box
    ballBoundingBox.max.x = -0.02; // Adjust max X position to narrow the box
    ballBoundingBox.min.z = 0.02; // Adjust min Z position to push the box forward
    ballBoundingBox.max.z = -0.02; // Adjust max Z position to push the box backward
    ballBoundingBox.max.y = 0.002; // Adjust max Y position to increase the height
    ballBoundingBox.min.y = -0.002;

    ballBoundingBox.setFromObject(ball);
    ballBoundingBox.expandByScalar(0.002); // Expand the bounding box a bit for accuracy
    // const boundingBoxGeometry = new THREE.Box3Helper(ballBoundingBox, 0xff0000);
    // scene.add(boundingBoxGeometry);
    ballBoundingBoxes.push(ballBoundingBox);

    ball.userData.index = i; // Store the index for later reference
    ball.userData.hit = 1;

    balls.push(ball);
  }

  //console.log("added_balls", balls);

  // const loadingText = document.createElement('div')
  // loadingText.innerText = 'Move your head to catch the balls'
  // loadingText.style.position = 'absolute'
  // loadingText.style.color = 'white'
  // loadingText.style.fontSize = '24px'
  // loadingText.style.top = '10px'
  // loadingText.style.left = '10px'
  // document.body.appendChild(loadingText)

  // // Add an arrow animation
  // const arrow = document.createElement('div')
  // arrow.style.width = '0'
  // arrow.style.height = '0'
  // arrow.style.borderLeft = '10px solid transparent'
  // arrow.style.borderRight = '10px solid transparent'
  // arrow.style.borderBottom = '20px solid white'
  // arrow.style.position = 'absolute'
  // arrow.style.top = '50px'
  // arrow.style.left = '50%'
  // arrow.style.transform = 'translateX(-50%)'
  // document.body.appendChild(arrow)

  // Create bounding boxes for the GLB model and balls

  // Create a directional light
  // Create a directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 5.0); // Color: white, Intensity: 1.0

  // Set the position of the light to your specified location
  directionalLight.position.set(
    -0.9557464742660522,
    0.26717102974653244,
    -3.1538567543029785
  );

  // Add the directional light to your scene
  scene.add(directionalLight);

  //-----CODE--FOR---GAME----LOGIC

  // Variables to keep track of player lives
  let playerLives: number = 3; // Start with 3 lives

  // Function to update the life icons
  function updateLifeIcons(): void {
    for (let i = 1; i <= 3; i++) {
      const lifeIcon: HTMLElement | null = document.getElementById(`life${i}`);
      if (lifeIcon) {
        if (i <= playerLives) {
          lifeIcon.style.display = "block";
        } else {
          lifeIcon.style.display = "none";
        }
      }
    }
  }

  // HTML element to display the missed text
  const missedTextElement = document.createElement("div");
  missedTextElement.style.fontSize = "0px";
  missedTextElement.style.position = "absolute";
  missedTextElement.style.color = "red";
  missedTextElement.style.top = "250px";
  missedTextElement.style.left = "50%";
  missedTextElement.style.transform = "translateX(-50%)";
  document.body.appendChild(missedTextElement);

  function showMissedText() {
    missedTextElement.style.display = "flex";
    missedTextElement.innerText = "Missed!";
    missedTextElement.style.position = "absolute";
    missedTextElement.style.color = "white";
    missedTextElement.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    missedTextElement.style.padding = "5px";
    missedTextElement.style.borderRadius = "5px";
    missedTextElement.style.fontSize = "30px";
    missedTextElement.style.top = "40%";
    missedTextElement.style.left = "50%";
    missedTextElement.style.transform = "translate(-50%, -50%)";

    setTimeout(() => {
      missedTextElement.innerText = "";
      missedTextElement.style.display = "none";
    }, 2000); // Remove the missed text after 2 seconds
  }

  // Call this function when the player misses the ball to reduce a life
  function playerMissedBall(): void {
    playerLives--; // Reduce the number of lives
    updateLifeIcons(); // Update the displayed life icons
    showMissedText();
    if (playerLives === 0) {
      // Game over logic (you can implement it here)
      balls = []; // Clear the balls array so no balls are spwaned at game end
      displayGameOverModal(score);
    }
  }

  // You can further adjust the light properties, such as shadow casting and shadow resolution, based on your scene requirements.
  directionalLight.castShadow = true; // Enable shadow casting
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;

  const gltfLoader = new GLTFLoader(manager);
  const gloveModel = gltfLoader.load(
    modelPath,
    (gltf) => {
      // setInterval(() => {
      //     document.body.removeChild(loadingText)
      //     document.body.removeChild(arrow)
      // }, 2000)

      gltf.scene.scale.set(2, 2, 2);
      gltf.scene.position.set(0, -0.7, 1);
      gltf.scene.rotation.set(Math.PI / 2, 0, 0);
      //console.log("model_here,11", gltf.scene);
      gltf.scene.name = "glove";

      // Add the scene to the tracker group
      gltf.scene.traverse(function (child) {
        if ((child as THREE.Mesh).isMesh) {
          let m = child as THREE.Mesh;
          child.castShadow = true;
          child.receiveShadow = true;
          //m.castShadow = true
          m.frustumCulled = false;
        }
      });
      const gloveBoundingBox = new THREE.Box3();

      // // Define a material for the bounding box outline
      // const boundingBoxOutlineMaterial = new THREE.LineBasicMaterial({
      //   color: 0x00ff00, // Choose your desired color
      //   linewidth: 2, // Adjust line width as needed
      // });
      // // Create a wireframe box to visualize the gloveBoundingBox
      // const gloveBoundingBoxHelper = new THREE.Box3Helper(
      //   gloveBoundingBox,
      //   boundingBoxOutlineMaterial
      // );

      // scene.add(gloveBoundingBoxHelper);

      // HTML element to display the score
      const scoreElement = document.createElement("div");
      scoreElement.innerText = "Score: 0";
      scoreElement.style.fontSize = "20px";
      scoreElement.style.position = "absolute";
      scoreElement.style.color = "white";
      scoreElement.style.top = "8px";
      scoreElement.style.left = "8px";
      scoreElement.style.backgroundColor = "rgba(0, 0, 0, 0.7)"; // Added semi-transparent black background
      scoreElement.style.padding = "5px"; // Added padding
      scoreElement.style.borderRadius = "5px"; // Added border radius for better aesthetics
      document.body.appendChild(scoreElement);
      // Define a variable to keep track of the score

      let scoreDisplayTimeout = null;

      function showConfetti() {
        const confetti = document.getElementById("confetti");
        if (confetti) confetti.style.display = "block";
      }

      function hideConfetti() {
        const confetti = document.getElementById("confetti");
        if (confetti) confetti.style.display = "none";
      }

      function showScoreText() {
        // const center = calculateCenterOfScreen();
        const scoreText = document.createElement("div");
        scoreText.innerText = "Score: " + score;
        scoreText.style.position = "absolute";
        scoreText.style.color = "white"; // Changed text color to white for better visibility on dark background
        scoreText.style.backgroundColor = "rgba(0, 0, 0, 0.7)"; // Added semi-transparent black background
        scoreText.style.padding = "5px"; // Added padding
        scoreText.style.borderRadius = "5px"; // Added border radius for better aesthetics
        scoreText.style.fontSize = "30px";
        // scoreText.style.top = center.y - 24 + "px"; // Adjust positioning as needed
        // scoreText.style.left = center.x - 100 + "px"; // Adjust positioning as needed
        scoreText.style.top = "40%";
        scoreText.style.left = "50%";
        scoreText.style.transform = "translate(-50%, -50%)";
        showConfetti();
        document.body.appendChild(scoreText);

        scoreDisplayTimeout = setTimeout(() => {
          hideConfetti();
          document.body.removeChild(scoreText);
        }, 2000); // Remove the score text after 2 seconds
      }

      // Collision detection
      checkCollisions = function () {
        // console.log("checking for collisions");

        // Check for collisions between glove and balls
        ballBoundingBoxes.forEach((ballBoundingBox, index) => {
          if (gloveBoundingBox.intersectsBox(ballBoundingBox)) {
            score++;
            scoreElement.innerText = "Score: " + score;
            //console.log("Collision detected with ball " + index);

            const ball = balls[index];
            ball.visible = false;

            // Call the score
            showScoreText();
            // Add the collided ball to the removedBalls array
            ball.userData.hit = 0;

            // removedBalls.push(index);
            // removedBalls.forEach((index: any) => {
            //   balls.splice(index, 1);
            // });
          }
        });
      };

      updateBoundingBoxes = function () {
        // Update glove bounding box
        // Update glove bounding box
        gloveBoundingBox.setFromObject(gltf.scene);
        //gloveBoundingBox.expandByScalar(0.003); // Original expansion
        console.log("bounding_box", gloveBoundingBox);
        gloveBoundingBox.min.x += 0.01; // Adjust min X position to narrow the box
        gloveBoundingBox.max.x -= gltf.scene.position.x; // Adjust max X position to narrow the box
        gloveBoundingBox.min.z += 0.02; // Adjust min Z position to push the box forward
        gloveBoundingBox.max.z -= 0.02; // Adjust max Z position to push the box backward
        gloveBoundingBox.max.y = gltf.scene.position.y; // Adjust max Y position to increase the height
        gloveBoundingBox.min.y = gltf.scene.position.y; // Adjust min Y position to lower the height

        // Update ball bounding boxes
        ballBoundingBoxes.forEach((boundingBox, index) => {
          if (balls[index].userData.hit == 1)
            boundingBox.setFromObject(balls[index]);
          //console.log("ballBounding", ballBoundingBoxes, balls);
        });
      };

      const fogTrailMaterial = new THREE.MeshBasicMaterial({
        color: 0x888888, // Color of the fog
        transparent: true,
        opacity: 0.09, // Adjust the opacity as needed (lower value for more transparency)
        depthWrite: false, // Ensure it doesn't interfere with depth
      });

      let fogTrailObjects: any = []; // Array to store fog trail objects

      // Function to create fog at a specific position
      function createFogTrail(position: any) {
        const fogGeometry = new THREE.SphereGeometry(0.1, 16, 16); // Adjust size as needed
        const fogObject = new THREE.Mesh(fogGeometry, fogTrailMaterial);
        fogObject.position.copy(position);
        scene.add(fogObject);
        fogTrailObjects.push(fogObject);
      }

      throwCricketBall = function (
        ball: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>
      ) {
        //console.log("started random");
        ball.visible = true;
        // Change the ball's mass to 1 when it is thrown

        //console.log("ball is thrown");
        const initialPosition = {
          x: ball.position.x,
          y: ball.position.y,
          z: ball.position.z,
        }; // Initial position
        const screenHeight = window.innerHeight;

        const randomX = Math.random() * 0.5 - 0.25; // Random variation in x-axis

        const randomZ = Math.random() * 0.5 - 0.25; // Random variation in z-axis

        // const maxY = -screenHeight / 2 + ball.geometry.parameters.radius;
        const targetPosition = {
          x: ball.position.x + randomX,
          //@ts-ignore
          y: gltf.scene.position.y - 1.1,
          z: ball.position.z + randomZ,
        }; // Target position
        const throwDuration = 3500; // Animation duration in milliseconds

        // // Create a timeout for the ball
        // const throwTimeout = setTimeout(() => {
        //   // Check if the ball was not caught (userData.hit is still 1)
        //   if (ball.userData.hit === 1) {
        //     playerMissedBall();
        //   }
        // }, throwDuration);

        new TWEEN.Tween(initialPosition)
          .to(targetPosition, throwDuration)
          .easing(TWEEN.Easing.Quadratic.Out)
          .onUpdate(() => {
            ball.position.set(
              initialPosition.x,
              initialPosition.y,
              initialPosition.z
            );
            // Create fog trail at the ball's position
            // createFogTrail(
            //   new THREE.Vector3(
            //     initialPosition.x,
            //     initialPosition.y,
            //     initialPosition.z
            //   )
            // );
          })
          .start()
          .onComplete((e) => {
            if (ball.userData.hit === 1) playerMissedBall();
            // setTimeout(() => {
            //   for (const fogObject of fogTrailObjects) {
            //     scene.remove(fogObject);
            //   }
            //   fogTrailObjects = []; // Clear the array
            // }, 0); // Animation complete, you can add further actions here

            // clearTimeout(throwTimeout);
            ball.visible = false;
            // Add the collided ball to the removedBalls array
            ball.userData.hit = 0;

            //console.log("ball thrown", e);

            //console.log("bounce");
          });
      };

      // Set an interval to throw balls periodically
      // Define an interval ID variable
      let throwInterval;

      function throwRandomBall() {
        if (balls.length > 0) {
          console.log(balls.length, "index");
          const randomBallIndex = Math.floor(Math.random() * balls.length);
          const randomBall = balls[randomBallIndex] as THREE.Mesh<
            THREE.SphereGeometry,
            THREE.MeshBasicMaterial
          >;

          throwCricketBall(randomBall);
        }
      }

      throwInterval = setInterval(throwRandomBall, 5000);

      faceTrackerGroup.add(gltf.scene);
      modelReady = true;

      // Call the updateTimer function every second (1000 milliseconds)
      setInterval(updateTimer, 1000);
    },
    undefined,
    () => {
      console.log("An error ocurred loading the GLTF model");
    }
  );

  // Add ambient light for overall illumination
  const ambientLight2 = new THREE.AmbientLight(0x404040); // Soft white ambient light
  scene.add(ambientLight2);

  //animation on catching the ball

  // Function to calculate the center of the viewport
  function calculateCenterOfScreen() {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    return { x: centerX, y: centerY };
  }

  const firecrackerCanvas: any = document.getElementById("firecrackerCanvas");
  const firecrackerContext = firecrackerCanvas.getContext("2d");

  function playFirecrackerAnimation() {
    const center = calculateCenterOfScreen();

    // Position the firecracker canvas at the center
    firecrackerCanvas.style.position = "absolute";
    firecrackerCanvas.style.top =
      center.y - firecrackerCanvas.height / 2 + "px";
    firecrackerCanvas.style.left =
      center.x - firecrackerCanvas.width / 2 + "px";

    // Your custom animation code using firecrackerContext
    // Example animation: draw a circle at the center
    firecrackerContext.clearRect(
      0,
      0,
      firecrackerCanvas.width,
      firecrackerCanvas.height
    );
    firecrackerContext.beginPath();
    firecrackerContext.arc(
      firecrackerCanvas.width / 2,
      firecrackerCanvas.height / 2,
      50,
      0,
      2 * Math.PI
    );
    firecrackerContext.fillStyle = "red";
    firecrackerContext.fill();
  }
  // And then a little ambient light to brighten the model up a bit
  const ambientLight = new THREE.AmbientLight("white", 0.4);
  scene.add(ambientLight);

  const clock = new THREE.Clock();
  let delta;

  //============GAME-END-LOGIC============

  // Add these functions for displaying the modals:
  function displayGameOverModal(finalScore: number) {
    // renderer.domElement.remove();
    //@ts-ignore
    const gameOverModal = new bootstrap.Modal(
      document.getElementById("gameOverModal"),
      {
        backdrop: false, // Prevent clicking outside the modal to close it
        keyboard: false, // Prevent using the keyboard to close it
      }
    );
    const gameOverScore = document.getElementById("gameOverScore");
    if (gameOverScore) gameOverScore.textContent = `Your Score: ${finalScore}`;
    gameOverModal.show();
    //@ts-ignore
    document.querySelector("#playEnded").addEventListener("click", (e) => {
      //hide the start modal
      gameOverModal.hide();
      // show the hiddenStart elements

      window.location.reload();
    });
  }

  function displayWinnerModal(finalScore: number) {
    // renderer.domElement.remove();
    //@ts-ignore
    const winnerModal = new bootstrap.Modal(
      document.getElementById("winnerModal"),
      {
        backdrop: false, // Prevent clicking outside the modal to close it
        keyboard: false, // Prevent using the keyboard to close it
      }
    );
    const winnerScore = document.getElementById("winnerScore");
    if (winnerScore) winnerScore.textContent = `Your Score: ${finalScore}`;
    winnerModal.show();
    //@ts-ignore
    document.querySelector("#playWon").addEventListener("click", (e) => {
      //hide the start modal
      winnerModal.hide();
      // show the hiddenStart elements

      window.location.reload();
    });
  }
  // function checkWinCondition() {
  //   if (balls.length === 0) {
  //     // Player has caught all the balls
  //     displayWinnerModal(score);
  //   }
  // }

  // Update the "showScoreText" function to call "checkWinCondition" as well:
  // function showScoreText() {
  //   const center = calculateCenterOfScreen();
  //   const scoreText = document.createElement("div");
  //   scoreText.innerText = "Score: " + score;
  //   scoreText.style.position = "absolute";
  //   scoreText.style.color = "red";
  //   scoreText.style.fontSize = "48px";
  //   scoreText.style.top = center.y - 24 + "px";
  //   scoreText.style.left = center.x - 100 + "px";
  //   document.body.appendChild(scoreText);

  //   // checkWinCondition();
  //   var scoreDisplayTimeout = setTimeout(() => {
  //     document.body.removeChild(scoreText);
  //   }, 20000);
  // }

  // Initialize the countdown timer to 60 seconds
  let countdown = 60;

  const timer = document.querySelector(".timer");
  //@ts-ignore
  timer.style.display = "flex";

  // Function to update and display the timer
  function updateTimer() {
    const timerElement = document.getElementById("timer-countdown");
    if (countdown > 0) {
      countdown--;
      if (timerElement) timerElement.textContent = String(countdown);
    } else {
      // Display the game over modal
      balls = [];
      displayGameOverModal(score);
    }
  }

  window.addEventListener("resize", onWindowResize, false);
  //console.log("scene", scene);
  function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
  }

  function animate() {
    requestAnimationFrame(animate);
    // Rotate the balls (for example)
    scene.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        child.rotation.x += 0.1;
        child.rotation.y += 0.1;
      }
    });
    delta = Math.min(clock.getDelta(), 0.1);

    if (modelReady && balls.length > 0) {
      checkCollisions(); // Check for collisions

      updateBoundingBoxes(); // Update bounding boxes' positions

      //console.log("balls.length", balls.length);

      // Create a new array to store the balls that will be kept
      const newBalls: any = [];
      // console.log("new_ballss", newBalls);
      for (let i = 0; i < balls.length; i++) {
        const ball = balls[i];

        if (ball && ball.userData && typeof ball.userData.hit !== "undefined") {
          if (ball.userData.hit === 0) {
            // Remove the ball from the scene
            scene.remove(ball);
            // Remove the ball's bounding box from the array

            ballBoundingBoxes.splice(i, 1);
            // Update the 'hit' status for that ball to indicate it has been removed
            ball.userData.hit = -1;
          } else {
            // Keep the ball
            newBalls.push(ball);
          }
        }
      }

      // Replace the old 'balls' array with the new one
      balls = newBalls;
      //console.log("balls_array", balls, ballBoundingBoxes);
    }
    if (balls.length === 0 && score === 6) {
      //console.log("game over");
      displayWinnerModal(score);
    } else if (balls.length === 0) {
      displayGameOverModal(score);
    }
    //cannonDebugRenderer.update()
    camera.updateFrame(renderer);
    mask.updateFromFaceAnchorGroup(faceTrackerGroup);
    TWEEN.update();

    render();
  }

  function render() {
    renderer.render(scene, camera);
  }
  animate();
};

function handlePopstate(event: any) {
  if (event.state && event.state.screen === "playing") {
    // Handle resuming the game here if needed
  } else {
    // Handle going back to the instruction screen
    // Show the game start modal here
    window.location.reload();
  }
}

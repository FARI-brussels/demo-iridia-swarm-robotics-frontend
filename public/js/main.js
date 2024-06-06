import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadGLB } from './loaders.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const drones = []; // Array to hold the drones
const scene = new THREE.Scene();
const clock = new THREE.Clock();

const randomDronePosition = (min = -15, max = 15) => Math.random() * (max - min) + min;

function createCircle(color) {
  const circleGeometry = new THREE.CircleGeometry(1, 32);
  // circleGeometry.vertices.shift(); // Remove the center vertex
  const circleMaterial = new THREE.LineBasicMaterial({ color: color });
  const circle = new THREE.LineLoop(circleGeometry, circleMaterial);
  // circle.rotation.x = Math.PI / 2; // Rotate to lay flat on the ground
  return circle;
}




// Number of drones you want to load
const N = 5; // For example, loading 5 drones
// Load N drones
for (let i = 0; i < N; i++) {
  const drone = loadGLB(scene, "./assets/drone_merged1.glb", null,
    {
      scale: { x: 0.6, y: 0.6, z: 0.6 },
      position: { x: randomDronePosition(), y: randomDronePosition(), z: randomDronePosition(2, 5) },
      rotation: { x: Math.PI / 2, y: 100, z: 180 },
      castShadow: true,
    },
    (loadedDrone) => { // This callback function is executed after the drone is loaded
      drones.push({

        ...loadedDrone,
        direction: {
          x: Math.random() - 0.5,
          y: Math.random() - 0.5,
          z: (Math.random() - 0.5) * 0.2
        }
      }); // Append the loaded drone to the drones array
      loadedDrone.castShadow = true;

      // const circle = createCircle('#00A607'); // Default color #F00
      // circle.position.set(0, 0, 0); // Adjust if necessary
      // loadedDrone.add(circle);
      // loadedDrone.circle = circle;

      // loadedDrone.traverse((node) => {
      //   if (node.isMesh) {
      //     node.material.color.set('#F00');
      //   }
      // });
      console.log({ loadedDrone })
    }
  );
}

//TODO: refactor
const loader = new GLTFLoader();

loader.load("./assets/swarm_map.glb", function (gltf) {
  gltf.scene.traverse((node) => {
    if (node.isMesh) { node.receiveShadow = true; }
  })

  gltf.scene.position.x = 3 // the object has a bit of an offset to the left for some reason, adjust this value if necessary (default is 1)
  gltf.scene.rotation.x = Math.PI / 2
  scene.add(gltf.scene);
}, undefined, function (error) {
  console.error('Error loading model:', error);
});


// Set up Camera
const initialCameraPosition = new THREE.Vector3(0, -265, 100);
const initialCameraQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)); // Assuming the initial rotation is 0
let resetAnimation = false;
let resetStartTime = 0;
const resetDuration = 2000;

function resetCameraPosition() {
  resetAnimation = true;
  controls.enabled = false; // Disable user input via controls during reset
  resetStartTime = Date.now(); // Record the start time
}

function updateCameraPosition() {
  if (!resetAnimation) return;

  const lerpFactor = 0.04;
  camera.position.lerp(initialCameraPosition, lerpFactor);
  camera.quaternion.slerp(initialCameraQuaternion, lerpFactor);

  const positionCloseEnough = camera.position.distanceTo(initialCameraPosition) < 1;  // Adjusted for more immediate response
  const rotationCloseEnough = camera.quaternion.angleTo(initialCameraQuaternion) < 2;  // Adjusted for more immediate response


  if (positionCloseEnough && rotationCloseEnough) {
    camera.position.copy(initialCameraPosition);
    camera.quaternion.copy(initialCameraQuaternion);
    resetAnimation = false;
    controls.enabled = true;
  }

  const elapsedTime = Date.now() - resetStartTime;
  if (elapsedTime > resetDuration) {
    camera.position.copy(initialCameraPosition);
    camera.quaternion.copy(initialCameraQuaternion);
    resetAnimation = false;
    controls.enabled = true;
  }
}

//timer

let isInteracting = false;
let autoResetTimer = null;
const originalPosition = new THREE.Vector3(0, -265, 100);
const originalQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));



function startAutoResetTimer() {
  clearAutoResetTimer(); // Clear existing timer to avoid duplicates
  autoResetTimer = setTimeout(() => {
    if (!isInteracting && !isCameraAtOriginalPosition()) {
      resetCameraPosition();
    }
  }, 5000); // 5 seconds
}

function clearAutoResetTimer() {
  if (autoResetTimer) {
    clearTimeout(autoResetTimer);
    autoResetTimer = null;
  }
}

function isCameraAtOriginalPosition() {
  return camera.position.equals(originalPosition) && camera.quaternion.equals(originalQuaternion);
}



const camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 10, 1000);
camera.position.set(0, -265, 100);

//Set scene lighting

const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
const spotLight = new THREE.SpotLight(0xffffff, 20000, undefined, undefined, 1);
spotLight.castShadow = true;

spotLight.position.set(0, 0, 80);
spotLight.shadow.mapSize = new THREE.Vector2(1024 * 2, 1024 * 2);

scene.add(ambientLight);
scene.add(spotLight);



const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true; // Enable shadow map
renderer.shadow
console.log({ renderer })

document.body.appendChild(renderer.domElement);


//uncomment for debugging
// const lightHelper = new THREE.SpotLightHelper(spotLight)
// scene.add(lightHelper);

// const gridHelper = new THREE.GridHelper(200, 20);
// const axesHelper = new THREE.AxesHelper(1000);
// const cameraHelper = new THREE.CameraHelper(camera);

// scene.add(gridHelper);
// scene.add(axesHelper);
// scene.add(cameraHelper);


// Create OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Optional: this enables inertia for smooth camera movement
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.enableZoom = false; // comment out to enable zoom



// Function to update drone positions based on the latest message from ROS

function updateDronePositions(newPositions) {
  newPositions.forEach(position => {
    // Assuming robot_id matches the drone's index in the drones array
    const drone = drones[position.robot_id];
    if (drone) {
      drone.position.x = 102 - position.position.x / 10;
      drone.position.y = - 40 + position.position.y / 10;
      console.log(drone.position)
    }
  });
}

// Connecting to ROS
var ros = new ROSLIB.Ros({
  url: 'ws://localhost:9090' // Replace with your websocket server address
});

ros.on('connection', function () {
  console.log('Connected to websocket server.');
});

ros.on('error', function (error) {
  console.log('Error connecting to websocket server: ', error);
});

ros.on('close', function () {
  console.log('Connection to websocket server closed.');
});

// Subscribing to the robot position topic
var robotPositionListener = new ROSLIB.Topic({
  ros: ros,
  name: '/robot_positions', // Replace with your topic name
  messageType: 'ultralytics_ros/RobotPositionArray' // Replace with your message type

});


function moveMockDrones() {
  const separationThreshold = 2.5;  // Minimum allowed distance between drones
  const speedFactor = 0.05;  // Control the movement speed
  const rotationSpeedFactor = 0.05;  // Control the rotation speed

  drones.forEach((drone, i) => {
    if (drone) {
      // to avoid collision
      drones.forEach((otherDrone, j) => {
        if (i !== j && otherDrone) {
          const dx = otherDrone.position.x - drone.position.x;
          const dy = otherDrone.position.y - drone.position.y;
          const dz = otherDrone.position.z - drone.position.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          // If too close, adjust directions to move them apart
          if (distance < separationThreshold) {
            drone.direction.x -= dx * 0.05;
            drone.direction.y -= dy * 0.05;
            drone.direction.z -= dz * 0.05;
          }
        }
      });

      // Normalize the direction vector
      const norm = Math.sqrt(drone.direction.x * drone.direction.x + drone.direction.y * drone.direction.y + drone.direction.z * drone.direction.z);
      drone.direction.x /= norm;
      drone.direction.y /= norm;
      drone.direction.z /= norm;

      // Update drone's position based on its direction
      drone.position.x += drone.direction.x * speedFactor;
      drone.position.y += drone.direction.y * speedFactor;

      // uncomment if movement on z-axis is needed
      // drone.position.z += drone.direction.z * speedFactor;

      // Calculate the target rotation angle for Y-axis only
      const targetAngle = Math.atan2(drone.direction.x, drone.direction.y);

      // Create a target quaternion for Y-axis rotation only
      const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);

      // Slerp the drone's current rotation towards the target rotation
      drone.quaternion.slerp(targetQuaternion, rotationSpeedFactor);

      drone.rotation.x = Math.PI / 2
      drone.rotation.z = 0;
      // drone.circle.rotation.x = 0

      // Randomly adjust the direction every so often
      if (Math.random() < 0.02) {  // 2% chance to change direction
        drone.direction.x = Math.random() - 0.5;
        drone.direction.y = Math.random() - 0.5;
        drone.direction.z = (Math.random() - 0.5) * 0.2;
      }


      // console.log({ drone })

      // constrain bounds, uncomment if needed
      // drone.position.x = Math.min(Math.max(drone.position.x, -15), 15);
      // drone.position.z = Math.min(Math.max(drone.position.z, 1), 10); // Keep z between 1 and 10
    }
  });
}


setTimeout(() => {
  console.log('Wait ends after 3 seconds');
  // Subscribing to the ROS topic
  robotPositionListener.subscribe(function (message) {
    updateDronePositions(message.positions); // Directly update positions
  });

}, 3000);


function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();
  updateCameraPosition(deltaTime);
  moveMockDrones();
  controls.update();
  renderer.render(scene, camera);
}

animate()


window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


document.addEventListener('DOMContentLoaded', function () {
  controls.addEventListener('start', function () {
    isInteracting = true;
    clearAutoResetTimer();
  });

  controls.addEventListener('end', function () {
    isInteracting = false;
    startAutoResetTimer();
  });
  const controlButtons = document.querySelector('.control-buttons')
  const connectButton = document.querySelector('.connect-button');
  const spreadButton = document.getElementById('spreadButton');
  const stopButton = document.getElementById('stopButton');
  const recenterButton = document.querySelector('.recenter-button');

  const pageTitle = document.querySelector('.title-bar')
  const pageFooter = document.querySelector('.footer')

  const languageSpans = document.querySelectorAll('.language');
  const cardContent = document.getElementById('explanation')
  const cardContainer = document.querySelector('.card-container')

  const toolTip = document.querySelector('.tooltip')
  const closeButton = document.querySelector('.close-button')

  const researchHead = document.querySelector('.research-head')
  const researchLead = document.querySelector('.research-lead')
  const cardFooter = document.querySelector('.card-footer')

  toolTip.addEventListener('click', () => {
    cardContainer.classList.add('visible')
    toolTip.classList.add('disabled')
  })
  closeButton.addEventListener('click', () => {
    cardContainer.classList.remove('visible')
    toolTip.classList.remove('disabled')
  })


  fetch('http://localhost:3000/content')
    .then(res => res.json())
    .then(explanations => {
      const researchers = explanations.find(element => element.hasOwnProperty('research_head') && element.hasOwnProperty('research_lead'));
      const { logo } = explanations.find(element => element.hasOwnProperty('logo'));
      cardFooter.innerHTML = logo

      researchHead.innerText = researchers.research_head
      researchLead.innerText = researchers.research_lead

      const defaultSelected = explanations.find(({ locale }) => locale === 'en');

      if (defaultSelected) {
        cardContent.innerText = defaultSelected.explanation_short;
        document.querySelector('.language[data-locale="en"]').classList.add('selected');
      }

      function updateExplanation(locale) {
        const explanation = explanations.find(item => item.locale === locale)?.explanation_short;
        cardContent.innerText = explanation;

      }

      languageSpans.forEach(span => {
        span.addEventListener('click', function () {
          languageSpans.forEach(s => s.classList.remove('selected'));

          this.classList.add('selected');
          const locale = this.getAttribute('data-locale');
          updateExplanation(locale);
        });
      });
    })
    .catch(error => {
      console.error('Error:', error);
      cardContent.innerText = 'Failed to load content.';
    });


  startAutoResetTimer();

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      clearAutoResetTimer(); // Clear the timer when the tab is not visible
    } else {
      startAutoResetTimer(); // Restart the timer when the tab becomes visible
    }
  });




  connectButton.addEventListener('click', function () {
    [pageTitle, pageFooter, connectButton].forEach(e => e.classList.remove('visible'))

    controlButtons.classList.add('visible')

    fetch('http://localhost:3000/start-robots')
      .then(response => response.text())
      .then(data => console.log(data))
      .catch(error => console.error('Error:', error));
  });

  spreadButton.addEventListener('click', function () {
    fetch('http://localhost:3000/spread')
      .then(response => response.text())
      .then(data => console.log(data))
      .catch(error => console.error('Error:', error));
  });

  recenterButton.addEventListener('click', resetCameraPosition)

  stopButton.addEventListener('click', function () {
    [pageTitle, pageFooter, connectButton].forEach(e => e.classList.add('visible'))

    controlButtons.classList.remove('visible')

    fetch('http://localhost:3000/stop-robots')
      .then(response => response.text())
      .then(data => console.log(data))
      .catch(error => console.error('Error:', error));
  });



});







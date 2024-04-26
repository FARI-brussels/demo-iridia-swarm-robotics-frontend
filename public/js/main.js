import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadGLB } from './loaders.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const drones = []; // Array to hold the drones
const scene = new THREE.Scene();

const randomDronePosition = (min = -15, max = 15) => Math.random() * (max - min) + min;

// Number of drones you want to load
const N = 5; // For example, loading 5 drones
// Load N drones
for (let i = 0; i < N; i++) {
  const drone = loadGLB(scene, "./assets/drone.glb", null,
    {
      scale: { x: 0.02, y: 0.02, z: 0.02 },
      position: { x: randomDronePosition(), y: randomDronePosition(), z: randomDronePosition(2, 5) },
      rotation: { x: Math.PI / 2, y: 100, z: 0 },
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
    }
  );
}

//TODO: refactor
const loader = new GLTFLoader();
loader.load("./assets/swarm_map.glb", function (gltf) {
  scene.add(gltf.scene);
  gltf.scene.position.x = 3 // the object has a bit of an offset to the left for some reason, adjust this value if necessary (default is 1)
  gltf.scene.rotation.x = Math.PI / 2
}, undefined, function (error) {
  console.error('Error loading model:', error);
});


// Set up Camera

const camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 10, 1000);
camera.position.set(0, -265, 100);

//Set scene lighting

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(0, 0, 1);
scene.add(ambientLight);
scene.add(directionalLight);


const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

document.body.appendChild(renderer.domElement);


//uncomment for debugging
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
      // drone.position.y += drone.direction.y * speedFactor;

      // uncomment if movement on z-axis is needed
      // drone.position.z += drone.direction.z * speedFactor;

      // Adjust drone rotation to match direction of travel
      drone.rotation.y = Math.atan2(-drone.direction.x, drone.direction.y);

      // Randomly adjust the direction every so often
      if (Math.random() < 0.02) {  // 2% chance to change direction
        drone.direction.x = Math.random() - 0.5;
        drone.direction.y = Math.random() - 0.5;
        drone.direction.z = (Math.random() - 0.5) * 0.2;
      }

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
  const connectButton = document.getElementById('connectButton');
  const spreadButton = document.getElementById('spreadButton');
  const stopButton = document.getElementById('stopButton');

  const isConnected = false;
  const introScreen = document.querySelector('.demo-intro')
  const loadingScreen = document.querySelector('.demo-loading')
  const activeScreen = document.querySelector('.demo-active')


  connectButton.addEventListener('click', function () {
    introScreen.classList.remove('visible')
    activeScreen.classList.add('visible')

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

  stopButton.addEventListener('click', function () {
    activeScreen.classList.remove('visible')
    introScreen.classList.add('visible')
    fetch('http://localhost:3000/stop-robots')
      .then(response => response.text())
      .then(data => console.log(data))
      .catch(error => console.error('Error:', error));
  });


});



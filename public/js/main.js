import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {loadGLB, loadSTL, loadOBJ} from './loaders.js'


const drones = []; // Array to hold the drones
const scene = new THREE.Scene();
scene.background = new THREE.Color("#0C95E4");

// Number of drones you want to load
const N = 5; // For example, loading 5 drones
// Load N drones
for (let i = 0; i < N; i++) {
  const drone = loadGLB(scene, "./assets/drone.glb", null,  
  {
    scale:{x: 0.02, y: 0.02, z: 0.02}, 
    position:{x:1000, y:1000, z:20}, 
    rotation: { x: Math.PI / 2, y: 0, z: 0 },
  },
  (loadedDrone) => { // This callback function is executed after the drone is loaded
    drones.push(loadedDrone); // Append the loaded drone to the drones array
  }
  );
}

// Ground plane
const groundMaterial = new THREE.MeshBasicMaterial({ color: "#eaeaea" }); // Blue
const buildingMaterial = new THREE.MeshBasicMaterial({ color: "#808080" }); // Blue
//const ground = new THREE.Mesh(groundGeometry, groundMaterial);


loadSTL(scene, "./assets/tabletop.stl", groundMaterial, {scale: { x: 100, y: 100, z: 100 }})
loadOBJ(scene, "./assets/buildings.obj", buildingMaterial, {scale: { x: 100, y: 100, z: 100 }, rotation: { x: Math.PI / 2, y: 0, z: 0 }})

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 100;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);



// Create OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Optional: this enables inertia for smooth camera movement
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;


// Function to update drone positions based on the latest message from ROS
function updateDronePositions(newPositions) {
  newPositions.forEach(position => {
    // Assuming robot_id matches the drone's index in the drones array
    const drone = drones[position.robot_id];
    if (drone) {
      drone.position.x = 102- position.position.x/10;
      drone.position.y = - 40 + position.position.y/10;
      drone.position.z = 20// Assuming you want to set z as well
    }
  });
}


// Connecting to ROS
var ros = new ROSLIB.Ros({
  url: 'ws://localhost:9090' // Replace with your websocket server address
});

ros.on('connection', function() {
  console.log('Connected to websocket server.');
});

ros.on('error', function(error) {
  console.log('Error connecting to websocket server: ', error);
});

ros.on('close', function() {
  console.log('Connection to websocket server closed.');
});

// Subscribing to the robot position topic
var robotPositionListener = new ROSLIB.Topic({
  ros: ros,
  name: '/robot_positions', // Replace with your topic name
  messageType: 'ultralytics_ros/RobotPositionArray' // Replace with your message type
});


setTimeout(() => {
  console.log('Wait ends after 3 seconds');
  // Subscribing to the ROS topic
  robotPositionListener.subscribe(function(message) {
  updateDronePositions(message.positions); // Directly update positions
  });
  
}, 3000); 



// Modified animate function to simply render the scene
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate()




window.addEventListener('resize',()=>{
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
})


document.addEventListener('DOMContentLoaded', function () {
  const connectButton = document.getElementById('connectButton');
  const spreadButton = document.getElementById('spreadButton');
  const stopButton = document.getElementById('stopButton');

  spreadButton.addEventListener('click', function () {
    fetch('http://localhost:3000/spread')
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));
  });

  connectButton.addEventListener('click', function () {
    fetch('http://localhost:3000/start-robots')
        .then(response => response.text())
        .then(data => console.log(data))
        .catch(error => console.error('Error:', error));
    document.body.style.backgroundColor = 'red';
});
  stopButton.addEventListener('click', function () {
    fetch('http://localhost:3000/stop-robots')
        .then(response => response.text())
        .then(data => console.log(data))
        .catch(error => console.error('Error:', error));
});
});



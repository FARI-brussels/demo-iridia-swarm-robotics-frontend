import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadGLB } from './loaders.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createCircleSprite, updateCircleSpritesColor } from './sprite.js'
import { droneConfig, DRONE_SETTINGS, moveMockDrones, updateDronePositions, setDroneBlinker, updateDroneStatus } from './drone.js'



const drones = []; // Array to hold the drones
const scene = new THREE.Scene();
const clock = new THREE.Clock();
const NUMBER_OF_DRONES = 8;

let blinkInterval = 500; // Interval in milliseconds
let lastBlinkTime = 0;

// Load N drones
for (let i = 0; i < NUMBER_OF_DRONES; i++) {
  const drone = loadGLB(
    scene, "./assets/drone_merged1.glb",
    null,
    DRONE_SETTINGS.options(),
    (drone) => drones.push(droneConfig(drone))
  );
}

//TODO: refactor
const loader = new GLTFLoader();

loader.load("./assets/swarm_map.glb", function (gltf) {
  gltf.scene.traverse((node) => {
    if (node.isMesh) node.receiveShadow = true;
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

function refreshPage(){
  window.location.reload()
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


setTimeout(() => {
  console.log('Wait ends after 3 seconds');
  // Subscribing to the ROS topic
  robotPositionListener.subscribe(function (message) {
    updateDronePositions({ drones, newPositions: message.positions }); // Directly update positions
  });

}, 3000);


function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();
  updateCameraPosition(deltaTime);


  //uncomment this when lights are ready to be used

  // const elapsedTime = clock.getElapsedTime();

  // if (elapsedTime - lastBlinkTime > blinkInterval / 1000) {
  //   drones.forEach(setDroneBlinker);
  //   lastBlinkTime = elapsedTime;
  // }


  //moveMockDrones(drones);
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
  const refreshButton = document.querySelector('.refresh-button');

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
    .then(cmsData => {
      cardFooter.innerHTML = cmsData.logos.map(logo => `<img src="${logo}" style="height: 50px; margin-right: 2rem">`).join('')
      researchHead.innerText = cmsData.research_head
      researchLead.innerText = cmsData.research_lead
      cardContent.innerText = cmsData.description.en
      document.querySelector('.language[data-locale="en"]').classList.add('selected');
      
      function updateExplanation(locale) {
        cardContent.innerText = cmsData.description[locale];
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

    drones.forEach(drone => updateCircleSpritesColor(drone, '#2BF2FF'))


    controlButtons.classList.add('visible')

    fetch('http://localhost:3000/start-robots')
      .then(response => response.text())
      .then(data => console.log(data))
      .then(() => drones.forEach(() => updateDroneStatus(drone, { connected: true })))
      .catch(error => {
        drones.forEach((drone) => updateDroneStatus(drone, { connected: false }))
        console.error('Error:', error)

      }
      );
  });

  //logic that implements gather/spread status
  spreadButton.addEventListener('click', function () {
    fetch('http://localhost:3000/spread')
      .then(response => response.text())
      .then(data => console.log(data))
      .then(() => drones.forEach((drone) => updateDroneStatus(drone, { exploring: true })))
      .catch(error => console.error('Error:', error));
  });

  recenterButton.addEventListener('click', function () {
    resetCameraPosition();  // Call your reset camera function
    fetch('http://localhost:3000/reset-robots')
      .then(response => response.text())
      .then(data => console.log(data))
      .then(() => drones.forEach(() => updateDroneStatus(drone, { connected: false, exploring: false, gathering: false })))
      .catch(error => console.error('Error:', error));
  });


  stopButton.addEventListener('click', async  function () {
    [pageTitle, pageFooter, connectButton].forEach(e => e.classList.add('visible'))
    
    controlButtons.classList.remove('visible')

    fetch('http://localhost:3000/stop-robots')
      .then(response => response.text())
      .then(data => console.log(data))
      .then(() => drones.forEach(() => updateDroneStatus(drone, { connected: false, exploring: false, gathering: false })))
      .catch(error => console.error('Error:', error));

      await sleep(2000); 
      window.location.reload(); 
      
  });


  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

});


const timeoutDuration = 300000; 
let timeout;

function startTimeout() {
    timeout = setTimeout(refreshPage, timeoutDuration);
}

function resetTimeout() {
    clearTimeout(timeout);
    startTimeout();
}

function debounce(func, delay) {
    let debounceTimer;
    return function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(func, delay);
    }
}

window.onload = startTimeout;
document.onmousemove = debounce(resetTimeout, 500);
document.onmousedown = resetTimeout;
document.onkeypress = resetTimeout;
document.ontouchstart = debounce(resetTimeout, 500);
document.ontouchend = debounce(resetTimeout, 500);
document.onclick = resetTimeout;
document.onscroll = debounce(resetTimeout, 500);







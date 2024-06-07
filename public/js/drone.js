import { loadGLB } from './loaders.js'
import { createCircleSprite, updateCircleSpritesColor } from './sprite.js'
import * as THREE from 'three';

const randomDronePosition = (min = -15, max = 15) => Math.random() * (max - min) + min;


export const DRONE_SETTINGS = {
  options: () => ({
    scale: { x: 0.6, y: 0.6, z: 0.6 },
    position: {
      x: randomDronePosition(),
      y: randomDronePosition(),
      z: randomDronePosition(2, 5)
    },
    rotation: {
      x: Math.PI / 2,
      y: 100,
      z: 180
    },
    castShadow: true,
  }),
  direction: () => ({
    x: Math.random() - 0.5,
    y: Math.random() - 0.5,
    z: (Math.random() - 0.5) * 0.2
  }),
  status: {
    type: 'drone',
    connected: false,
    exploring: false,
    gathering: false,
  }
}

export const droneConfig = (drone) => {
  //uncomment this when lights are ready to be used

  // const circleSprite = createCircleSprite('#F00');
  // drone.add(circleSprite);

  // drone.circleSprite = circleSprite;
  // drone.circleSprite.position.x = 0
  // drone.circleSprite.position.y = 0.5
  // drone.circleSprite.position.z = -2

  drone.status = DRONE_SETTINGS.status;
  drone.direction = DRONE_SETTINGS.direction();
  return drone;
}


export function moveMockDrones(drones) {
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

      if (Math.random() < 0.02) {
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

// Function to update drone positions based on the latest message from ROS
export function updateDronePositions({ drones, newPositions }) {
  newPositions.forEach(position => {
    // Assuming robot_id matches the drone's index in the drones array
    const drone = drones[position.robot_id];
    if (drone) {
      drone.position.x = 102 - position.position.x / 10;
      drone.position.y = - 40 + position.position.y / 10;
    }
  });
}

export function setDroneBlinker(drone) {
  if (!drone.status.connected) {
    drone.circleSprite.visible = !drone.circleSprite.visible;
  }
  else drone.circleSprite.visible = true;
}

export function updateDroneStatus(drone, status = DRONE_SETTINGS.status) {
  if (status.connected) {
    drone.status.connected = true;
  }

  if (!status.connected) {
    drone.status.connected = false;
    drone.status.gathering = false;
    drone.status.exploring = false;
  }

  if (status.exploring) {
    drone.status.exploring = true;
    drone.status.gathering = false;
  }

  if (status.gathering) {
    drone.status.gathering = true
    drone.status.exploring = false;
  }
}
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as THREE from 'three';
const GLBloader = new GLTFLoader();
const STLloader = new STLLoader();
const OBJloader = new OBJLoader();

export function loadGLB(
  scene,
  asset_path,
  material,
  {
    scale = { x: 1, y: 1, z: 1 },
    position = { x: 0, y: 0, z: 0 },
    rotation = { x: 0, y: 0, z: 0 }
  } = {},
  callback = null // Add a callback parameter

) {

  GLBloader.load(
    asset_path,
    function (gltf) {
      const object = gltf.scene;

      // If a material is provided, apply it to all child meshes
      if (material) {
        object.traverse((child) => {
          if (child.isMesh) {
            child.material = material;
          }
        });
      }

      object.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Apply scale, position, and rotation based on the provided options
      object.scale.set(scale.x, scale.y, scale.z);
      object.position.set(position.x, position.y, position.z);
      object.rotation.set(rotation.x, rotation.y, rotation.z);
      object.castShadow = true;
      scene.add(object);

      if (callback) callback(object); // Call the callback with the loaded object
      return object;
    },

    (xhr) => {
      console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
      console.log('An error happened while loading the GLB file:', error);
    }
  );
}


export function loadSTL(
  scene,
  asset_path,
  material,
  {
    scale = { x: 1, y: 1, z: 1 },
    position = { x: 0, y: 0, z: 0 },
    rotation = { x: 0, y: 0, z: 0 }
  } = {} // Default to an empty object if no options object is provided
) {
  STLloader.load(
    asset_path,
    function (geometry) {
      const object = new THREE.Mesh(geometry, material);


      // Apply scale, position, and rotation based on the provided options
      object.scale.set(scale.x, scale.y, scale.z);
      object.position.set(position.x, position.y, position.z);
      object.rotation.set(rotation.x, rotation.y, rotation.z);
      scene.add(object);
      if (callback) callback(object); // Execute the callback, if provided
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
      console.log('An error happened', error);
    }
  );
}



export function loadOBJ(
  scene,
  asset_path,
  material,
  {
    scale = { x: 1, y: 1, z: 1 },
    position = { x: 0, y: 0, z: 0 },
    rotation = { x: 0, y: 0, z: 0 }
  } = {},
  callback = null // Optional callback parameter
) {
  OBJloader.load(
    asset_path,
    function (object) {
      // If a material is provided, apply it to all child meshes
      if (material) {
        object.traverse((child) => {
          if (child.isMesh) {
            child.material = material;
          }
        });
      }
      // Apply scale, position, and rotation
      object.scale.set(scale.x, scale.y, scale.z);
      object.position.set(position.x, position.y, position.z);
      object.rotation.set(rotation.x, rotation.y, rotation.z);

      scene.add(object); // Add the object to the scene

      if (callback) callback(object); // Execute the callback, if provided
    },
    (xhr) => {
      console.log(`OBJ Load Progress: ${(xhr.loaded / xhr.total) * 100}% loaded`);
    },
    (error) => {
      console.error('An error happened while loading the OBJ file:', error);
    }
  );
}

export function loadSVGDrone(
  scene,
  asset_path,
  {
    scale = { x: 1, y: 1, z: 1 },
    position = { x: 0, y: 0, z: 0 },
    rotation = { x: 0, y: 0, z: 0 }
  } = {},
  callback = null
) {
  const loader = new THREE.TextureLoader();
  loader.load(
    asset_path,
    function (texture) {
      const geometry = new THREE.PlaneGeometry(1, 1);
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true }); // Added transparent: true for SVG transparency
      const mesh = new THREE.Mesh(geometry, material);


      mesh.scale.set(scale.x * texture.image.width, scale.y * texture.image.height, scale.z);
      mesh.position.set(position.x, position.y, position.z);
      mesh.rotation.set(rotation.x, rotation.y, rotation.z);

      scene.add(mesh);

      if (callback) callback(mesh);

    },
    undefined, // onProgress function, if needed
    error => console.error('An error happened during loading the texture:', error)
  );
}

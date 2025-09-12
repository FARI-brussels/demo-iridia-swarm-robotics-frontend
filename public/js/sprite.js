import * as THREE from 'three';

export function createCircleSprite(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');

  context.beginPath();
  context.arc(128, 128, 120, 0, 2 * Math.PI);

  context.fillStyle = color;
  context.fill();

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);

  sprite.scale.set(1, 1, 1);
  sprite.blinking = true;
  return sprite;
}


export function updateCircleSpritesColor(drone, hexColor) {
  const sprite = drone?.children?.find(child => child.type === "Sprite");
  if (!sprite || !hexColor) return

  const canvas = sprite.material.map.image;
  const context = canvas.getContext('2d');

  context.clearRect(0, 0, canvas.width, canvas.height);

  context.beginPath();
  context.arc(128, 128, 120, 0, 2 * Math.PI);

  context.fillStyle = hexColor;
  context.fill();

  sprite.material.map.needsUpdate = true;
}
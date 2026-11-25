import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';

export const BARGE_SCALE = 0.24;
export const DECK_HEIGHT = 3.71 * BARGE_SCALE;

// The source hull already straddles its waterline at Y=0.
function detailTexture(map, roughness) {
  const canvas = document.createElement('canvas');
  canvas.width = map.image.width;
  canvas.height = map.image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(map.image, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = image.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const luminance = .2126 * pixels[i] + .7152 * pixels[i+1] + .0722 * pixels[i+2];
    const value = roughness ? 230 - .35 * luminance : 80 + .4 * luminance;
    pixels[i] = pixels[i+1] = pixels[i+2] = value;
    pixels[i+3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = map.flipY;
  texture.wrapS = map.wrapS;
  texture.wrapT = map.wrapT;
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = map.anisotropy;
  return texture;
}

export async function addBarge(scene, renderer) {
  const {scene: barge} = await new GLTFLoader().loadAsync('./models/barge_aesthetic.glb');
  const prepared = new Set();
  barge.traverse(mesh => {
    if (!(mesh instanceof THREE.Mesh)) return;
    if (!mesh.geometry.getAttribute('normal')) mesh.geometry.computeVertexNormals();
    mesh.castShadow = mesh.receiveShadow = true;
    for (const material of [].concat(mesh.material)) {
      if (prepared.has(material)) continue;
      prepared.add(material);
      const map = material.map;
      map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      map.colorSpace = THREE.SRGBColorSpace;
      material.bumpMap = detailTexture(map, false);
      material.bumpScale = .025;
      material.roughnessMap = detailTexture(map, true);
      material.roughness = .78;
      material.metalness = .22;
      material.envMapIntensity = 1.15;
    }
  });
  barge.scale.setScalar(BARGE_SCALE);
  scene.add(barge);
}

export function daylight(scene, renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const room = new RoomEnvironment();
  const generator = new THREE.PMREMGenerator(renderer);
  scene.environment = generator.fromScene(room, .04).texture;
  generator.dispose();
  room.dispose();
  scene.add(new THREE.HemisphereLight(0xdbeafe, 0x0f2942, .65));
  const sun = new THREE.DirectionalLight(0xffedcc, 2.4);
  sun.position.set(-15, 25, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -.0004;
  sun.shadow.normalBias = .02;
  Object.assign(sun.shadow.camera, {left:-16,right:16,top:16,bottom:-16,near:.1,far:65});
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({color:0x21485c,roughness:.34,metalness:.24}));
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = true;
  scene.add(sea);
}

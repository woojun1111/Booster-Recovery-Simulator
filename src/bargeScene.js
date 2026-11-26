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

function oceanNormals() {
  const size = 256, pixels = new Uint8Array(size*size*4);
  const waves = [[2,1,.43],[5,-2,.29],[7,3,.21],[13,-3,.13],[19,7,.10],[31,-8,.06]];
  for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
    let dx=0, dy=0;
    for (const [kx,ky,amplitude] of waves) {
      const phase=(kx*x+ky*y)*Math.PI*2/size;
      const slope=amplitude*Math.cos(phase+.45*Math.sin(4*Math.PI*y/size))/Math.hypot(kx,ky);
      dx+=kx*slope; dy+=ky*slope;
    }
    const length=Math.hypot(dx,dy,1), i=4*(x+y*size);
    pixels.set([127.5*(1+dx/length),127.5*(1+dy/length),127.5*(1+1/length),255],i);
  }
  const texture=new THREE.DataTexture(pixels,size,size);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(440,440);
  texture.generateMipmaps=true;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.magFilter=THREE.LinearFilter;
  texture.needsUpdate=true;
  return texture;
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
  sun.shadow.bias = -.00018;
  sun.shadow.normalBias = .012;
  Object.assign(sun.shadow.camera, {left:-16,right:16,top:16,bottom:-16,near:.1,far:65});
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);
  const normals = oceanNormals();
  normals.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(5000,5000),
    new THREE.MeshStandardMaterial({color:0x23536a, roughness:.31, metalness:.36,
      normalMap:normals, normalScale:new THREE.Vector2(.33,.42), envMapIntensity:.85}));
  sea.material.onBeforeCompile = shader => {
    const waves = THREE.ShaderChunk.normal_fragment_maps.replaceAll(
      'texture2D( normalMap, vNormalMapUv )',
      'texture2D(normalMap, vNormalMapUv + .29*sin(vNormalMapUv.yx*.67) + .17*sin(vNormalMapUv.xy*1.37))'
    );
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', waves);
  };
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = true;
  scene.add(sea);
  // Keep a high-resolution shadow footprint around the approach and deck.
  scene.add(sun.target);
  return (time, altitude, x) => {
    normals.offset.set((time*.018)%1,(time*.009)%1);
    const approach=1-THREE.MathUtils.smoothstep(altitude,8,35);
    const extent = 17 - 4*approach;
    if (sun.shadow.camera.right !== extent) {
      Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent});
      sun.shadow.camera.updateProjectionMatrix();
    }
    sun.target.position.set(x*.35*approach,DECK_HEIGHT+4*approach,0);
    sun.position.copy(sun.target.position);
    sun.position.x-=15; sun.position.y+=25; sun.position.z+=12;
  };
}

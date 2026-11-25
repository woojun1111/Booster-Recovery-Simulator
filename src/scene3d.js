import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {addBarge, daylight, DECK_HEIGHT} from "./bargeScene.js";
import {buildExterior, poseFins} from './boosterExterior.js';
export async function scene3d(host) {
  const scene=new T.Scene();
  scene.background=new T.Color(0xb6cbda);
  scene.fog=new T.FogExp2(0xb6cbda,.009);
  const renderer=new T.WebGLRenderer({antialias:true});
  host.appendChild(renderer.domElement);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  const camera=new T.PerspectiveCamera(39,1,.1,200);
  camera.position.set(18,13,22);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,3,0);
  controls.maxPolarAngle=Math.PI*.487;
  controls.minDistance=5;
  controls.maxDistance=75;
  controls.enablePan=false;
  daylight(scene,renderer);
  await addBarge(scene,renderer);
  const body=new T.Group();scene.add(body);
  /** @param {T.BufferGeometry} geo @param {number} color @param {T.Object3D} [parent] */
  const mesh=(geo,color,parent=body)=>{
    const m=new T.Mesh(geo,new T.MeshStandardMaterial({color,metalness:.45,roughness:.43}));
    parent.add(m);return m;
  };
  const fins=buildExterior(body);
  const nozzle=mesh(new T.CylinderGeometry(.27,.52,.74,32),0x34414b);
  nozzle.position.y=-3.84;
  const flame=mesh(new T.ConeGeometry(.38,2.8,32),0xffb954,nozzle);
  flame.rotation.z=Math.PI;flame.position.y=-1.6;
  const gas=Array.from({length:24},()=>mesh(new T.SphereGeometry(.045,5,4),0xe7f7ff));
  const arrows=[0xffad50,0x50dfae,0x78b6fa].map(color=>{
    const a=new T.ArrowHelper(new T.Vector3(0,1,0),new T.Vector3(),1,color);
    scene.add(a);return a;
  });
  body.traverse(part=>{if(part instanceof T.Mesh && part!==flame && !gas.includes(part)) part.castShadow=true;});
  new ResizeObserver(()=>{
    const w=host.clientWidth,h=host.clientHeight;
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
  }).observe(host);
  return (s,showVectors,manual,time)=>{
    const [throttle,gimbal,fin,rcs]=s.action;
    body.position.set(manual?0:s.obs[0]/90,DECK_HEIGHT+4.21+(manual?0:s.obs[1]/300),0);
    body.rotation.z=manual?0:s.obs[4];
    nozzle.rotation.z=gimbal*Math.PI/12;
    flame.visible=throttle>=-.2;flame.scale.y=.65+.35*throttle;
    poseFins(fins,s.obs[3],fin,manual);
    gas.forEach((m,i)=>{
      const t=(time*1.8+i/gas.length)%1;
      m.visible=Math.abs(rcs)>.03;
      m.position.set(Math.sign(rcs)*(.945+2.4*t*Math.abs(rcs)),2.32+Math.sin(i*13)*t*.3,Math.cos(i*7)*t*.24);
    });
    arrows.forEach((a,i)=>{
      const [x,y]=s.vectors[i],len=Math.hypot(x,y);
      a.visible=showVectors&&len>.001;
      if(a.visible){a.position.copy(body.position);a.position.y+=[-3,2.6,0][i];
        a.setDirection(new T.Vector3(x/len,y/len,0));a.setLength(2*len,.2,.12);}
    });
    controls.update();renderer.render(scene,camera);
  };
}

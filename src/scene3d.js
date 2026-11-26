import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {addBarge, daylight, DECK_HEIGHT, BARGE_SCALE} from "./bargeScene.js";
import {loadBooster} from './boosterExterior.js';
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
  const [booster] = await Promise.all([loadBooster(), addBarge(scene,renderer)]);
  const body=new T.Group();scene.add(body);
  /** @param {T.BufferGeometry} geo @param {number} color @param {T.Object3D} [parent] */
  const mesh=(geo,color,parent=body)=>{
    const m=new T.Mesh(geo,new T.MeshStandardMaterial({color,metalness:.45,roughness:.43}));
    parent.add(m);return m;
  };
  body.add(booster.model);
  body.scale.setScalar(BARGE_SCALE);
  const nozzle=booster.nozzle;
  const flame=mesh(new T.ConeGeometry(.38,2.8,32),0xffb954,nozzle);
  flame.rotation.z=Math.PI;flame.position.y=-2.65;
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
  const focus = new T.Vector3(), shift = new T.Vector3();
  return (s,showVectors,manual,time)=>{
    const [throttle,gimbal,fin,rcs]=s.action;
    const height=manual ? 0 : Math.max(0,s.obs[1]);
    const descending=manual || s.obs[3]<=0;
    body.rotation.z=manual ? 0 : s.obs[4];
    body.position.set(manual ? 0 : s.obs[0]*BARGE_SCALE,
      DECK_HEIGHT+(height+booster.groundLift)*BARGE_SCALE,0);
    booster.pose(height,descending,fin,gimbal);
    flame.visible=throttle>=-.2;flame.scale.y=.65+.35*throttle;
    focus.set(body.position.x,body.position.y+22*BARGE_SCALE,0);
    camera.position.add(shift.subVectors(focus,controls.target));
    controls.target.copy(focus);
    gas.forEach((m,i)=>{
      const t=(time*1.8+i/gas.length)%1;
      m.visible=Math.abs(rcs)>.03;
      m.position.set(Math.sign(rcs)*(1.92+3.4*t*Math.abs(rcs)),42.15+Math.sin(i*13)*t*.3,Math.cos(i*7)*t*.24);
    });
    arrows.forEach((a,i)=>{
      const [x,y]=s.vectors[i],len=Math.hypot(x,y);
      a.visible=showVectors&&len>.001;
      if(a.visible){a.position.copy(body.position);a.position.y+=[0,42,22][i]*BARGE_SCALE;
        a.setDirection(new T.Vector3(x/len,y/len,0));a.setLength(2*len,.2,.12);}
    });
    controls.update();renderer.render(scene,camera);
  };
}

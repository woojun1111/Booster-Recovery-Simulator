import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {addBarge, daylight, DECK_HEIGHT, BARGE_SCALE} from "./bargeScene.js";
import {loadBooster, exhaust} from './boosterExterior.js';
export async function scene3d(host) {
  const scene=new T.Scene();
  scene.background=new T.Color(0xb6cbda);
  scene.fog=new T.FogExp2(0xb6cbda,.0028);
  const renderer=new T.WebGLRenderer({antialias:true});
  host.appendChild(renderer.domElement);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  const camera=new T.PerspectiveCamera(39,1,.035,3200);
  camera.position.set(18,13,22);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,3,0);
  controls.maxPolarAngle=Math.PI*.487;
  controls.minDistance=.65;
  controls.maxDistance=2400;
  controls.enableDamping=true;
  controls.zoomToCursor=true;
  const updateOcean=daylight(scene,renderer);
  const [booster] = await Promise.all([loadBooster(), addBarge(scene,renderer)]);
  const body=new T.Group();scene.add(body);
  body.add(booster.model);
  body.scale.setScalar(BARGE_SCALE);
  const updateExhaust=exhaust(booster.nozzle,body);
  const arrows=[0xffad50,0x50dfae,0x78b6fa].map(color=>{
    const a=new T.ArrowHelper(new T.Vector3(0,1,0),new T.Vector3(),1,color);
    scene.add(a);return a;
  });
  new ResizeObserver(()=>{
    const w=host.clientWidth,h=host.clientHeight;
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
  }).observe(host);
  const focus = new T.Vector3(), shift = new T.Vector3();
  const tracked = controls.target.clone(), offset = new T.Vector3();
  let lastTime, previousFit = camera.position.distanceTo(controls.target), previousManual;
  return (s,showVectors,manual,time)=>{
    const [throttle,gimbal,fin,rcs]=s.action;
    const height=manual ? 0 : Math.max(0,s.obs[1]);
    const descending=manual || s.obs[3]<=0;
    body.rotation.z=manual ? 0 : s.obs[4];
    body.position.set(manual ? 0 : s.obs[0]*BARGE_SCALE,
      DECK_HEIGHT+(height+booster.groundLift)*BARGE_SCALE,0);
    booster.pose(height,descending,fin,gimbal);
    updateExhaust(throttle,rcs,height,time,booster.groundLift);
    updateOcean(time,height*BARGE_SCALE,body.position.x);
    // Fit both the deck centre and booster top. Scale the user's orbit distance
    // by the change in framing, retaining their zoom, azimuth and pan offsets.
    const top = body.position.y+49*BARGE_SCALE;
    focus.set(body.position.x*.5,(top+DECK_HEIGHT)*.5,0);
    const halfAngle = Math.atan(Math.tan(T.MathUtils.degToRad(camera.fov*.5))*Math.min(1,camera.aspect));
    const radius = Math.hypot(body.position.x,top-DECK_HEIGHT)*.5+2.8;
    const desiredFit = Math.max(21,radius/Math.sin(halfAngle));
    const cut = lastTime===undefined || manual!==previousManual || focus.distanceTo(tracked)>20;
    const blend = cut ? 1 : 1-Math.exp(-5*Math.max(0,time-lastTime));
    const fit = T.MathUtils.lerp(previousFit,desiredFit,blend);
    shift.subVectors(focus,tracked).multiplyScalar(blend);
    offset.subVectors(camera.position,controls.target).multiplyScalar(fit/previousFit);
    tracked.add(shift); controls.target.add(shift);
    camera.position.copy(controls.target).add(offset);
    lastTime=time; previousFit=fit; previousManual=manual;
    arrows.forEach((a,i)=>{
      const [x,y]=s.vectors[i],len=Math.hypot(x,y);
      a.visible=showVectors&&len>.001;
      if(a.visible){a.position.copy(body.position);a.position.y+=[0,42,22][i]*BARGE_SCALE;
        a.setDirection(new T.Vector3(x/len,y/len,0));a.setLength(2*len,.2,.12);}
    });
    controls.update();renderer.render(scene,camera);
  };
}

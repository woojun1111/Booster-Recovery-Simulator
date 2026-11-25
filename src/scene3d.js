import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
export function scene3d(host) {
  const scene=new T.Scene();
  scene.background=new T.Color(0x101e2c);
  scene.fog=new T.FogExp2(0x101e2c,.023);
  const renderer=new T.WebGLRenderer({antialias:true});
  host.appendChild(renderer.domElement);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  const camera=new T.PerspectiveCamera(39,1,.1,200);
  camera.position.set(12,5,17);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enablePan=false;
  scene.add(new T.HemisphereLight(0xd4efff,0x737c84,2));
  const light=new T.DirectionalLight(0xffe5be,3);
  light.position.set(-6,12,8);scene.add(light);
  const body=new T.Group();scene.add(body);
  const mesh=(geo,color,parent=body)=>{
    const m=new T.Mesh(geo,new T.MeshStandardMaterial({color,metalness:.45,roughness:.43}));
    parent.add(m);return m;
  };
  mesh(new T.CylinderGeometry(.75,.75,7,64),0xdfe6eb);
  for(const y of [-3.35,-2.8,1.85,3.32])
    mesh(new T.CylinderGeometry(.76,.76,.17,64),0x293843).position.y=y;
  const nozzle=mesh(new T.CylinderGeometry(.27,.52,.74,32),0x34414b);
  nozzle.position.y=-3.84;
  const flame=mesh(new T.ConeGeometry(.38,2.8,32),0xffb954,nozzle);
  flame.rotation.z=Math.PI;flame.position.y=-1.6;
  const fins=[];
  for(let i=0;i<4;i++){
    const mount=new T.Group();body.add(mount);mount.rotation.y=i*Math.PI/2;
    const fin=new T.Group();mount.add(fin);fin.position.set(.74,2.6,0);fins.push(fin);
    for(let j=0;j<=5;j++){
      mesh(new T.BoxGeometry(1.08,.05,.055),0x8299a3,fin).position.set(.54,0,-.35+j*.14);
      mesh(new T.BoxGeometry(.055,.05,.72),0xb3c0c9,fin).position.set(j*.216,0,0);
    }
  }
  const gas=Array.from({length:24},()=>mesh(new T.SphereGeometry(.045,5,4),0xe7f7ff));
  const arrows=[0xffad50,0x50dfae,0x78b6fa].map(color=>{
    const a=new T.ArrowHelper(new T.Vector3(0,1,0),new T.Vector3(),1,color);
    scene.add(a);return a;
  });
  const grid=new T.GridHelper(120,80,0x608294,0x293f4c);scene.add(grid);
  new ResizeObserver(()=>{
    const w=host.clientWidth,h=host.clientHeight;
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
  }).observe(host);
  return (s,showVectors,manual,time)=>{
    const [throttle,gimbal,fin,rcs]=s.action;
    body.position.set(manual?0:s.obs[0]/90,manual?0:s.obs[1]/300,0);
    grid.position.y=-4.3;
    body.rotation.z=manual?0:s.obs[4];
    nozzle.rotation.z=gimbal*Math.PI/12;
    flame.visible=throttle>=-.2;flame.scale.y=.65+.35*throttle;
    fins.forEach(f=>f.rotation.z=fin*Math.PI/9);
    gas.forEach((m,i)=>{
      const t=(time*1.8+i/gas.length)%1;
      m.visible=Math.abs(rcs)>.03;
      m.position.set(Math.sign(rcs)*(.76+2.4*t*Math.abs(rcs)),2.2+Math.sin(i*13)*t*.3,Math.cos(i*7)*t*.24);
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

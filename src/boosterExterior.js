import * as T from 'three';

// The fin profile uses X for span and Y for chord before being laid flat.
const outline = [[0,-.22],[.32,-.61],[1.54,-.61],[1.54,.61],[.32,.61],[0,.22]];
const cross = (a,b,p) => (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);

function trimCell(points, a, b) {
  const inset = .058 * Math.hypot(b[0]-a[0], b[1]-a[1]);
  const result = [];
  for (let i=0;i<points.length;i++) {
    const p=points[i], q=points[(i+1)%points.length];
    const d=cross(a,b,p)-inset, e=cross(a,b,q)-inset;
    if (d>=0) result.push(p);
    if ((d>=0)!==(e>=0)) {
      const t=d/(d-e);
      result.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);
    }
  }
  return result;
}

function waffleGeometry() {
  const shape = new T.Shape(outline.map(([x,y])=>new T.Vector2(x,y)));
  const pitch=.145, radius=pitch-.012;
  for (let row=-5;row<=5;row++) {
    for (let col=-1;col<=7;col++) {
      const x=(2*col+Math.abs(row%2))*pitch, y=row*pitch;
      let cell=[[x-radius,y],[x,y-radius],[x+radius,y],[x,y+radius]];
      outline.forEach((a,i)=>{cell=trimCell(cell,a,outline[(i+1)%outline.length]);});
      if (cell.length>=3) shape.holes.push(new T.Path(cell.reverse().map(([u,v])=>new T.Vector2(u,v))));
    }
  }
  const geo=new T.ExtrudeGeometry(shape,{depth:.133,bevelEnabled:false});
  return geo.translate(.065,0,-.0665).rotateX(Math.PI/2);
}

export function buildExterior(body) {
  const titanium=new T.MeshStandardMaterial({color:0x26292e,metalness:.75,roughness:.42});
  const paint=new T.MeshStandardMaterial({color:0xf1f5f9,metalness:.12,roughness:.48});
  const hardware=new T.MeshStandardMaterial({color:0x595f65,metalness:.78,roughness:.36});
  function add(parent,geometry,material,x=0,y=0,z=0) {
    const part=new T.Mesh(geometry,material);
    part.position.set(x,y,z);
    part.castShadow=part.receiveShadow=true;
    parent.add(part);
    return part;
  }
  const shell=new T.CylinderGeometry(.75,.75,7,64,32);
  const position=shell.getAttribute('position'), colors=[];
  for(let i=0;i<position.count;i++){
    const soot=1-T.MathUtils.smoothstep(position.getY(i),-3.5,-1.1);
    colors.push(1-.50*soot,1-.53*soot,1-.55*soot);
  }
  shell.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const finish=paint.clone(); finish.vertexColors=true;
  add(body,shell,finish);
  add(body,new T.CylinderGeometry(.758,.758,1.044,64),titanium,0,2.98);
  for(const y of [-3.35,-2.8,2.46,3.46])
    add(body,new T.CylinderGeometry(.764,.764,.055,64),hardware,0,y);
  const race=new T.Group(); race.rotation.y=Math.PI/4;body.add(race);
  add(race,new T.CapsuleGeometry(.083,5.3,6,16),paint,.743,-.37).scale.z=1.35;

  const fins=[], geom=waffleGeometry();
  for(let i=0;i<4;i++){
    const mount=new T.Group();mount.rotation.y=i*Math.PI/2;body.add(mount);
    add(mount,new T.BoxGeometry(.22,.19,.32),titanium,.819,2.98);
    for(const z of [-.136,.136])
      add(mount,new T.BoxGeometry(.26,.17,.062),hardware,.864,2.99,z);
    add(mount,new T.CylinderGeometry(.058,.058,.37,16),hardware,.954,3).rotation.x=Math.PI/2;
    const deploy=new T.Group(), deflect=new T.Group();
    deploy.name='deployPivot'; deflect.name='deflectPivot';
    deploy.position.set(.954,3,0); mount.add(deploy); deploy.add(deflect);
    add(deflect,new T.CylinderGeometry(.065,.065,.18,16),titanium,.045).rotation.z=Math.PI/2;
    for(const chord of [-.29,.29]){
      const rib=add(deflect,new T.BoxGeometry(1.47,.136,.022),titanium,.87,0,chord);
      rib.name='spanwiseRib';
    }
    add(deflect,geom,titanium).name='gridFin';
    fins.push({deploy,deflect});
  }
  for(const side of [-1,1]){
    add(body,new T.SphereGeometry(1,24,16),hardware,side*.735,2.32).scale.set(.18,.255,.155);
    add(body,new T.CylinderGeometry(.065,.077,.065,20),titanium,side*.91,2.32).rotation.z=Math.PI/2;
  }
  return fins;
}

export function poseFins(fins,verticalSpeed,command,manual) {
  const deployed=manual ? 1 : 1-T.MathUtils.smoothstep(verticalSpeed,-2,2);
  for(const {deploy,deflect} of fins){
    deploy.rotation.z=-(1-deployed)*Math.PI/2;
    deflect.rotation.x=deployed*T.MathUtils.clamp(command,-1,1)*Math.PI/9;
  }
}

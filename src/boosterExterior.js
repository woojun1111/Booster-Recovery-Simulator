import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

const up = new T.Vector3(0, 1, 0);

// Preserve the FBX-derived affine transforms, including nonuniform scale.
function moveToPivot(part, pivot) {
  part.updateWorldMatrix(true, false);
  pivot.updateWorldMatrix(true, false);
  part.matrix.premultiply(part.parent.matrixWorld).premultiply(
    new T.Matrix4().copy(pivot.matrixWorld).invert()
  );
  part.matrixAutoUpdate = false;
  pivot.add(part);
}

// Keep source decals and UVs. Soot height is measured in the unposed asset's metres.
function finishPart(mesh, source) {
  const mat = source.clone();
  mat.envMapIntensity = 1.15;
  if (source.name === 'F9_First_Stage') {
    mat.metalness = .12;
    mat.roughness = .42;
    const points = mesh.geometry.attributes.position;
    const sootHeight = new Float32Array(points.count);
    const v = new T.Vector3();
    for (let i = 0; i < points.count; i++) {
      v.fromBufferAttribute(points, i).applyMatrix4(mesh.matrixWorld);
      const azimuth = Math.atan2(v.z, v.x);
      const streak = 1.3 * Math.sin(5 * azimuth) + .55 * Math.cos(9 * azimuth);
      sootHeight[i] = v.y + streak;
    }
    mesh.geometry.setAttribute('sootHeight', new T.BufferAttribute(sootHeight, 1));
    mat.onBeforeCompile = shader => {
      shader.vertexShader = 'attribute float sootHeight; varying float vSootHeight;\n' +
        shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vSootHeight = sootHeight;');
      shader.fragmentShader = 'varying float vSootHeight;\n' + shader.fragmentShader
        .replace('#include <color_fragment>', '#include <color_fragment>\n float soot = 1.0 - smoothstep(1.0, 15.0, vSootHeight); diffuseColor.rgb *= mix(vec3(1.),vec3(.48,.44,.41),soot);')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor += .20*soot;');
    };
  } else if (source.name === 'F9_Grid_Fin') {
    mat.color.setHex(0x777779); mat.metalness = .76; mat.roughness = .34;
    mat.envMapIntensity = 1.32;
  } else if (/^Interstage_F9/i.test(mesh.name)) {
    mat.color.setHex(0x686769); mat.metalness = .74; mat.roughness = .39;
  } else if (/Hydraulic/i.test(mesh.name)) {
    mat.color.setHex(0xc0cad0); mat.metalness = .91; mat.roughness = .23;
  } else if (/Merlin_Engine/.test(source.name)) {
    mat.color.setHex(0xa4988d); mat.metalness = .78; mat.roughness = .36;
  } else if (/Landing_Leg/.test(source.name)) {
    mat.metalness = .22; mat.roughness = .55;
  }
  return mat;
}

// A shared radial sprite softens the plume boundaries from every camera angle.
export function exhaust(nozzle, body) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const fade = ctx.createRadialGradient(48,48,0,48,48,48);
  for (const [stop, alpha] of [[0,1],[.22,.9],[.58,.32],[1,0]]) {
    fade.addColorStop(stop, 'rgba(255,255,255,' + alpha + ')');
  }
  ctx.fillStyle = fade; ctx.fillRect(0,0,96,96);
  const map = new T.CanvasTexture(canvas);
  function sprite(parent, color, blending) {
    const material = new T.SpriteMaterial({map,color,blending,transparent:true,depthWrite:false});
    const sprite = new T.Sprite(material);
    parent.add(sprite);
    return sprite;
  }
  const trail = Array.from({length:22}, (_,i) =>
    sprite(nozzle,i < 8 ? 0xd9faff : 0xff9760,T.AdditiveBlending));
  const jets = Array.from({length:18}, () => sprite(body,0xe1f1fa,T.NormalBlending));
  return (throttle,rcs,height,time,clearance) => {
    const power = .4 + .6 * T.MathUtils.clamp((throttle+.2)/1.2,0,1);
    const length = Math.min(9 * power, height + clearance);
    trail.forEach((p,i) => {
      p.visible = throttle >= -.2;
      const u = i/(trail.length-1);
      const diameter = (.48 + u*.92 + u*u*1.8*(1-T.MathUtils.smoothstep(height,0,7)))
        * (.96 + .04*Math.sin(time*32-i));
      p.position.set(0,-1.3-u*length,0);
      p.scale.setScalar(diameter);
      p.material.opacity = (1-u*u)*(.32+.38*power);
    });
    jets.forEach((p,i) => {
      p.visible = Math.abs(rcs) > .03;
      const u = (i/jets.length + time*1.4)%1;
      p.position.set(Math.sign(rcs)*(1.92+u*4*Math.abs(rcs)),
        42.15+u*.23*Math.sin(i*7), u*.22*Math.cos(i*9));
      p.scale.setScalar(.12+.79*u);
      p.material.opacity = .45*(1-u)*Math.abs(rcs);
    });
  };
}

export async function loadBooster() {
  const {scene: model} = await new GLTFLoader().loadAsync('./models/falcon9_booster_aesthetic.glb');
  model.updateMatrixWorld(true);
  model.traverse(part => {
    if (!(part instanceof T.Mesh)) return;
    part.castShadow = part.receiveShadow = true;
    part.material = Array.isArray(part.material)
      ? part.material.map(mat => finishPart(part, mat)) : finishPart(part, part.material);
  });
  const node = name => model.getObjectByName(T.PropertyBinding.sanitizeNodeName(name));
  const pivotAt = position => {
    const pivot = new T.Group();
    pivot.position.copy(position);
    model.add(pivot);
    return pivot;
  };
  const tangent = radial => radial.clone().cross(up).normalize();
  const fins = Array.from({length:4}, (_, i) => {
    const radial = new T.Vector3(i & 1 ? 1 : -1, 0, i & 2 ? 1 : -1).normalize();
    const pivot = pivotAt(radial.clone().multiplyScalar(2.09).setY(42.18));
    moveToPivot(node('FinPanel' + i), pivot);
    return {pivot, radial, axis:tangent(radial)};
  });
  const legs = [1, 2, 3, 4].map(i => {
    const leg = node('Landing Leg ' + i);
    const attachment = node('Landing Leg ' + i + ' Hydraulic Attachment');
    const hydraulic = node('Landing Leg Hydraulic Holder ' + i);
    const footPivot = pivotAt(leg.getWorldPosition(new T.Vector3()));
    const axis = tangent(footPivot.position);
    const joint = attachment.getWorldPosition(new T.Vector3());
    const anchor = hydraulic.getWorldPosition(new T.Vector3());
    const rest = joint.clone().sub(anchor);
    const rod = pivotAt(anchor);
    rod.quaternion.setFromUnitVectors(up, rest.clone().normalize());
    moveToPivot(hydraulic, rod);
    moveToPivot(leg, footPivot);
    return {footPivot, axis, rod, joint:joint.sub(footPivot.position), length:rest.length()};
  });
  const joint = new T.Vector3();
  function poseLegs(amount) {
    for (const leg of legs) {
      leg.footPivot.quaternion.setFromAxisAngle(leg.axis, -1.98 * amount);
      joint.copy(leg.joint).applyQuaternion(leg.footPivot.quaternion)
        .add(leg.footPivot.position).sub(leg.rod.position);
      leg.rod.scale.y = joint.length() / leg.length;
      leg.rod.quaternion.setFromUnitVectors(up, joint.normalize());
    }
  }
  poseLegs(1);
  const groundLift = -new T.Box3().setFromObject(model, true).min.y;
  const engine = node('Merlin 1D Engine Center');
  const nozzle = pivotAt(new T.Vector3(0, 1.3, 0));
  moveToPivot(engine, nozzle);
  function pose(height, descending, command, gimbal) {
    const spread = descending ? 1 : 0;
    for (const fin of fins) {
      fin.pivot.quaternion.setFromAxisAngle(fin.axis, Math.PI / 2 * spread);
      fin.pivot.rotateOnWorldAxis(fin.radial, spread * command * Math.PI / 9);
    }
    poseLegs(descending ? 1 - T.MathUtils.smoothstep(height, 6, 40) : 0);
    nozzle.rotation.z = gimbal * Math.PI / 12;
  }
  return {model, pose, groundLift, nozzle};
}

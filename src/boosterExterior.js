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

export async function loadBooster() {
  const {scene: model} = await new GLTFLoader().loadAsync('./models/falcon9_booster_aesthetic.glb');
  model.traverse(part => {
    if (!(part instanceof T.Mesh)) return;
    part.castShadow = part.receiveShadow = true;
    for (const mat of Array.isArray(part.material) ? part.material : [part.material]) {
      mat.envMapIntensity = 1.2;
    }
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

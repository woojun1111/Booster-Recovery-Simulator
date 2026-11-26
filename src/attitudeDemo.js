import {stepPlanarRigidBody} from './forwardPhysics.js';

const STEP = 0.01;
const degrees = radians => radians * 180 / Math.PI;
const acceleration = ({theta, omega}) => ({ax: 0, ay: 0, alpha: -5 * theta - 3 * omega});

export function createAttitudeDemo(canvas, telemetry) {
  const ctx = canvas.getContext('2d');
  let state, elapsed, remainder;

  function reset(preset) {
    const [angle, spin] = preset === 'spin' ? [0, -30] : [Number(preset), 0];
    state = {x: 0, y: 0, vx: 0, vy: 0, theta: angle * Math.PI / 180, omega: spin * Math.PI / 180};
    elapsed = remainder = 0;
  }

  function draw(delta) {
    remainder += delta;
    while (remainder >= STEP) {
      state = stepPlanarRigidBody(state, acceleration, STEP);
      remainder -= STEP;
      elapsed += STEP;
    }
    const {width, height} = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelsWide = Math.round(width * ratio);
    const pixelsHigh = Math.round(height * ratio);
    if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
      canvas.width = pixelsWide;
      canvas.height = pixelsHigh;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#101f2a';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    const arm = .32 * Math.min(width, height);
    ctx.strokeStyle = '#78939f';
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.moveTo(-arm * 1.2, 0);
    ctx.lineTo(arm * 1.2, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(-state.theta);
    ctx.fillStyle = '#75dab6';
    ctx.fillRect(-arm, -8, 2 * arm, 16);
    ctx.restore();
    ctx.fillStyle = '#dbe7ed';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 12, 0, 2 * Math.PI);
    ctx.fill();
    telemetry.textContent = [
      `경과 시간   ${elapsed.toFixed(2)} s`,
      `자세 오차   ${degrees(state.theta).toFixed(2)}°`,
      `각속도      ${degrees(state.omega).toFixed(2)} °/s`,
      `각가속도    ${degrees(acceleration(state).alpha).toFixed(2)} °/s²`,
    ].join('\n');
  }

  reset('15');
  return {reset, draw};
}

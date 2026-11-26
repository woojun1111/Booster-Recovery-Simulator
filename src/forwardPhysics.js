// Planar state uses metres, seconds and radians. +Y is up, +theta is
// counterclockwise. The caller supplies linear and angular accelerations.
const MAX_SUBSTEP = 0.01;
const STATE_KEYS = ['x', 'y', 'vx', 'vy', 'theta', 'omega'];

function advance(state, {ax, ay, alpha}, velocity, dt) {
  if (![ax, ay, alpha].every(Number.isFinite)) {
    throw new TypeError('Acceleration components must be finite');
  }
  return {
    ...state,
    x: state.x + velocity.vx * dt,
    y: state.y + velocity.vy * dt,
    vx: state.vx + ax * dt,
    vy: state.vy + ay * dt,
    theta: state.theta + velocity.omega * dt,
    omega: state.omega + alpha * dt,
  };
}

/**
 * Integrate a planar rigid body using the explicit midpoint method (RK2).
 * acceleration(state, elapsed) returns {ax, ay, alpha} in world coordinates.
 * The callback receives time in seconds relative to the beginning of this step.
 */
export function stepPlanarRigidBody(state, acceleration, dt) {
  if (!Number.isFinite(dt) || dt < 0) {
    throw new RangeError('dt must be finite and nonnegative');
  }
  if (!STATE_KEYS.every(key => Number.isFinite(state?.[key]))) {
    throw new TypeError('State components must be finite');
  }
  if (typeof acceleration !== 'function') {
    throw new TypeError('acceleration must be a function');
  }

  let next = {...state};
  const steps = Math.ceil(dt / MAX_SUBSTEP);
  if (!Number.isSafeInteger(steps)) {
    throw new RangeError('dt exceeds the supported step count');
  }
  for (let i = 0; i < steps; i++) {
    const elapsed = i * MAX_SUBSTEP;
    const h = Math.min(MAX_SUBSTEP, dt - elapsed);
    const midpoint = advance(next, acceleration(next, elapsed), next, h / 2);
    next = advance(next, acceleration(midpoint, elapsed + h / 2), midpoint, h);
  }
  return next;
}

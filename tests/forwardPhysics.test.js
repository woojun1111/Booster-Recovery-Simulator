import assert from 'node:assert/strict';
import test from 'node:test';
import {stepPlanarRigidBody} from '../src/forwardPhysics.js';

const origin = Object.freeze({x: 0, y: 0, vx: 0, vy: 0, theta: 0, omega: 0});
const near = (actual, expected, tolerance = 1e-12) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);

test('free fall matches the constant-gravity solution with a partial substep', () => {
  const dt = 0.537;
  const result = stepPlanarRigidBody(origin, () => ({ax: 0, ay: -9.81, alpha: 0}), dt);
  near(result.y, -0.5 * 9.81 * dt ** 2);
  near(result.vy, -9.81 * dt);
  assert.equal(origin.y, 0);
});

test('upward and signed angular accelerations integrate independently', () => {
  for (const sign of [-1, 1]) {
    const result = stepPlanarRigidBody(origin, () => ({ax: 0, ay: 4, alpha: 2 * sign}), 0.25);
    near(result.y, 0.125);
    near(result.vy, 1);
    near(result.theta, sign * 0.0625);
    near(result.omega, sign * 0.5);
  }
});

test('state-dependent acceleration is evaluated at the midpoint', () => {
  const initial = {...origin, x: 1};
  const result = stepPlanarRigidBody(initial, ({x}) => ({ax: -x, ay: 0, alpha: 0}), 1);
  near(result.x, Math.cos(1), 2e-5);
  near(result.vx, -Math.sin(1), 2e-5);
});

test('zero duration leaves state values intact and invalid duration is rejected', () => {
  const unused = () => assert.fail('Unexpected acceleration evaluation');
  assert.deepEqual(stepPlanarRigidBody(origin, unused, 0), origin);
  assert.throws(() => stepPlanarRigidBody(origin, unused, -1), RangeError);
});

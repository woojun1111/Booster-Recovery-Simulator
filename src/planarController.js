// src/planarController.js
import { BOOSTER_SPECS, airDensity } from './planarLandingEnv.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function computeGncActuators(state) {
  if (state.landed) {
    return { throttle: 0, gimbal: 0, finDeflection: 0, rcs: 0 };
  }

  const mass = BOOSTER_SPECS.dryMass + state.rp1 + state.n2;
  const iz = 0.08 * mass * BOOSTER_SPECS.height * BOOSTER_SPECS.height;
  const rho = airDensity(state.y);
  const vRelX = state.vx - state.windX;
  const vRelY = state.vy;
  const vRel = Math.hypot(vRelX, vRelY);
  const q = 0.5 * rho * vRel * vRel;

  // 1. 호버슬램(Hoverslam) 수직 감속 유도
  const fDragY = -0.5 * rho * vRel * vRelY * BOOSTER_SPECS.cdaVertical;
  const maxUpAccel =
    (BOOSTER_SPECS.maxThrust * Math.max(0.7, Math.cos(state.theta)) + fDragY) / mass -
    BOOSTER_SPECS.gravity;

  const targetTouchdownVy = -0.6;
  const speedSqDiff = Math.max(0, state.vy * state.vy - targetTouchdownVy * targetTouchdownVy);
  const stoppingDist = speedSqDiff / (2 * Math.max(3.0, maxUpAccel));
  const lateralMargin = 1.14 + 0.0045 * Math.abs(state.x);

  let ignited = state.ignited;
  if (!ignited && state.vy < 0 && state.y <= stoppingDist * lateralMargin) {
    ignited = true;
  }
  state.ignited = ignited;

  let throttle = 0;
  if (ignited && state.rp1 > 0) {
    const desiredVy = state.y > 4 ? -Math.sqrt(2 * Math.max(3.0, maxUpAccel * 0.85) * state.y + 0.36) : targetTouchdownVy;
    const ayCmd = BOOSTER_SPECS.gravity + 2.4 * (desiredVy - state.vy);
    const thrustReq = (mass * ayCmd - fDragY) / Math.max(0.6, Math.cos(state.theta));
    throttle = clamp(thrustReq / BOOSTER_SPECS.maxThrust, BOOSTER_SPECS.minThrottle, 1.0);
  }

  // 2. 수평 위치 -> 목표 기울기(theta_ref) 캐스케이드 유도
  const fDragX = -0.5 * rho * vRel * vRelX * BOOSTER_SPECS.cdaLateral;
  const axDes = clamp(-0.18 * state.x - 0.72 * state.vx, -6.5, 6.5);
  const fxDes = mass * axDes - fDragX;

  const effectiveAuthority = Math.max(
    throttle * BOOSTER_SPECS.maxThrust,
    q * BOOSTER_SPECS.cGlide,
    mass * BOOSTER_SPECS.gravity * 0.8
  );
  const maxTiltRad = state.y < 12 ? (5 * Math.PI) / 180 : (16 * Math.PI) / 180;
  const thetaRef = clamp(-fxDes / effectiveAuthority, -maxTiltRad, maxTiltRad);

  // 3. 요구 제어 토크(tau_cmd) 산출 및 동압(q) 기반 3종 구동기 배분
  const kpTheta = ignited ? 9.5 : 5.5;
  const kdTheta = ignited ? 5.2 : 3.8;
  const alphaCmd = kpTheta * (thetaRef - state.theta) - kdTheta * state.omega;
  let remainingTau = iz * alphaCmd;

  // (a) 상단 그리드 핀 배분 (동압 q에 비례하는 공력 조향)
  let finDeflection = 0;
  const maxFinTau = q * BOOSTER_SPECS.finAreaCl * BOOSTER_SPECS.finLeverArm * Math.sin(BOOSTER_SPECS.maxFinRad);
  if (maxFinTau > 50) {
    const finTau = clamp(remainingTau, -maxFinTau, maxFinTau);
    const sinFin = clamp(finTau / (q * BOOSTER_SPECS.finAreaCl * BOOSTER_SPECS.finLeverArm), -1, 1);
    finDeflection = clamp(Math.asin(sinFin), -BOOSTER_SPECS.maxFinRad, BOOSTER_SPECS.maxFinRad);
    remainingTau -= finTau;
  }

  // (b) 메인 엔진 TVC 배분 (엔진 점화 시 주 제어 권한)
  let gimbal = 0;
  const activeThrust = throttle * BOOSTER_SPECS.maxThrust;
  const maxTvcTau = activeThrust * BOOSTER_SPECS.tvcLeverArm * Math.sin(BOOSTER_SPECS.maxGimbalRad);
  if (maxTvcTau > 100) {
    const tvcTau = clamp(remainingTau, -maxTvcTau, maxTvcTau);
    const sinGimbal = clamp(-tvcTau / (activeThrust * BOOSTER_SPECS.tvcLeverArm), -1, 1);
    gimbal = clamp(Math.asin(sinGimbal), -BOOSTER_SPECS.maxGimbalRad, BOOSTER_SPECS.maxGimbalRad);
    remainingTau -= tvcTau;
  }

  // (c) 냉가스 RCS 배분 (저동압·비연소 구간 잔여 토크 담당)
  let rcs = 0;
  const maxRcsTau = BOOSTER_SPECS.rcsMaxForce * BOOSTER_SPECS.rcsLeverArm;
  if (state.n2 > 0 && Math.abs(remainingTau) > 50) {
    rcs = clamp(remainingTau / maxRcsTau, -1, 1);
  }

  return { throttle, gimbal, finDeflection, rcs };
}

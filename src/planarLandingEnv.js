// src/planarLandingEnv.js
export const BOOSTER_SPECS = {
  dryMass: 2200,          // 건조 질량 (kg)
  initialRp1: 500,        // 초기 RP-1 추진제 (kg)
  initialN2: 30,          // 초기 냉가스 N2 추진제 (kg)
  height: 48.707,         // GLB 모델 기준 기체 높이 (m)
  gravity: 9.81,          // 중력 가속도 (m/s^2)
  maxThrust: 68000,       // 최대 추력 (N)
  minThrottle: 0.2,       // 점화 시 최소 스로틀 비율
  rp1BurnRate: 22.0,      // 최대 추력 시 연료 소모율 (kg/s)
  maxGimbalRad: (10 * Math.PI) / 180, // TVC 최대 짐벌각 (±10°)
  tvcLeverArm: 22.0,      // 무게중심 대비 노즐 거리 (m)
  finLeverArm: 20.0,      // 무게중심 대비 그리드 핀 거리 (m)
  finAreaCl: 1.45,        // 그리드 핀 유효 공력 계수 (m^2)
  maxFinRad: (20 * Math.PI) / 180,    // 그리드 핀 최대 편향각 (±20°)
  rcsLeverArm: 21.0,      // 무게중심 대비 RCS 노즐 거리 (m)
  rcsMaxForce: 1800,      // 냉가스 RCS 최대 추력 (N)
  n2BurnRate: 0.45,       // RCS 최대 분사 시 질소 소모율 (kg/s)
  cdaVertical: 6.5,       // 수직 항력 계수*면적 (m^2)
  cdaLateral: 18.0,       // 측면 항력 계수*면적 (m^2)
  cGlide: 14.0,           // 활강 양력 계수*면적 (m^2)
  bargeHalfWidth: 26.0,   // 바지선 착륙 갑판 반폭 (m)
};

export const LANDING_PRESETS = {
  standard: {
    label: '표준 하강',
    x: 0,
    y: 220,
    vx: 0,
    vy: -42,
    theta: 0,
    omega: 0,
    windX: 0,
  },
  offset35: {
    label: '수평 오차 +35m',
    x: 35,
    y: 240,
    vx: -2.5,
    vy: -42,
    theta: 0.04,
    omega: 0,
    windX: 0,
  },
  crosswind12: {
    label: '측풍 12m/s',
    x: 10,
    y: 235,
    vx: 0,
    vy: -42,
    theta: 0,
    omega: 0,
    windX: 12,
  },
  tilt15: {
    label: '고각도 진입 15°',
    x: -14,
    y: 240,
    vx: 2.0,
    vy: -40,
    theta: (15 * Math.PI) / 180,
    omega: -0.05,
    windX: 0,
  },
};

export function createInitialLandingState(presetKey = 'standard') {
  const p = LANDING_PRESETS[presetKey] || LANDING_PRESETS.standard;
  const rho = airDensity(p.y);
  const vRelX = p.vx - p.windX;
  const vRelY = p.vy;
  const q = 0.5 * rho * (vRelX * vRelX + vRelY * vRelY);

  return {
    t: 0,
    x: p.x,
    y: p.y,
    vx: p.vx,
    vy: p.vy,
    theta: p.theta,
    omega: p.omega,
    rp1: BOOSTER_SPECS.initialRp1,
    n2: BOOSTER_SPECS.initialN2,
    q,
    windX: p.windX,
    legDeploy: 0,
    ignited: false,
    landed: false,
    outcome: null,
    // 현재 구동기 상태 (HUD 및 3D 모델 바인딩용)
    throttle: 0,
    gimbal: 0,
    finDeflection: 0,
    rcs: 0,
  };
}

export function airDensity(altitude) {
  const h = Math.max(0, altitude);
  return 1.225 * Math.exp(-h / 8500);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function computeAccelerations(s, act) {
  const mass = BOOSTER_SPECS.dryMass + Math.max(0, s.rp1) + Math.max(0, s.n2);
  const iz = 0.08 * mass * BOOSTER_SPECS.height * BOOSTER_SPECS.height;

  const rho = airDensity(s.y);
  const vRelX = s.vx - s.windX;
  const vRelY = s.vy;
  const vRel = Math.hypot(vRelX, vRelY);
  const q = 0.5 * rho * vRel * vRel;

  // 1. 메인 엔진 TVC 추력 및 피칭 토크
  const activeThrottle = s.rp1 > 0 ? clamp(act.throttle, 0, 1) : 0;
  const thrust = activeThrottle * BOOSTER_SPECS.maxThrust;
  const gimbal = clamp(act.gimbal, -BOOSTER_SPECS.maxGimbalRad, BOOSTER_SPECS.maxGimbalRad);

  const fThrustX = -thrust * Math.sin(s.theta + gimbal);
  const fThrustY = thrust * Math.cos(s.theta + gimbal);
  const tauTvc = -thrust * BOOSTER_SPECS.tvcLeverArm * Math.sin(gimbal);

  // 2. 동체 공력 항력/활강력 및 상단 그리드 핀 공력 토크
  const fDragX = -0.5 * rho * vRel * vRelX * BOOSTER_SPECS.cdaLateral;
  const fDragY = -0.5 * rho * vRel * vRelY * BOOSTER_SPECS.cdaVertical;
  const fGlideX = -q * BOOSTER_SPECS.cGlide * Math.sin(s.theta);

  const finDeflection = clamp(act.finDeflection, -BOOSTER_SPECS.maxFinRad, BOOSTER_SPECS.maxFinRad);
  const fFin = q * BOOSTER_SPECS.finAreaCl * Math.sin(finDeflection);
  const tauFin = fFin * BOOSTER_SPECS.finLeverArm;

  // 3. 냉가스 RCS 자세 토크
  const activeRcs = s.n2 > 0 ? clamp(act.rcs, -1, 1) : 0;
  const tauRcs = activeRcs * BOOSTER_SPECS.rcsMaxForce * BOOSTER_SPECS.rcsLeverArm;

  // 공력 회전 감쇠
  const tauDamp = -0.15 * q * BOOSTER_SPECS.height * s.omega;

  const ax = (fThrustX + fDragX + fGlideX) / mass;
  const ay = (fThrustY + fDragY) / mass - BOOSTER_SPECS.gravity;
  const alpha = (tauTvc + tauFin + tauRcs + tauDamp) / iz;

  return { ax, ay, alpha, q, activeThrottle, gimbal, finDeflection, activeRcs };
}

export function stepLandingDynamics(state, actuators, dt) {
  if (state.landed || dt <= 0) return state;

  const subDt = 0.01;
  const steps = Math.max(1, Math.ceil(dt / subDt));
  const h = dt / steps;

  let cur = { ...state };

  for (let i = 0; i < steps; i++) {
    if (cur.landed) break;

    // RK2 Midpoint 적분
    const d1 = computeAccelerations(cur, actuators);
    const mid = {
      ...cur,
      x: cur.x + 0.5 * h * cur.vx,
      y: cur.y + 0.5 * h * cur.vy,
      vx: cur.vx + 0.5 * h * d1.ax,
      vy: cur.vy + 0.5 * h * d1.ay,
      theta: cur.theta + 0.5 * h * cur.omega,
      omega: cur.omega + 0.5 * h * d1.alpha,
    };
    const d2 = computeAccelerations(mid, actuators);

    cur.t += h;
    cur.x += h * mid.vx;
    cur.y += h * mid.vy;
    cur.vx += h * d2.ax;
    cur.vy += h * d2.ay;
    cur.theta += h * mid.omega;
    cur.omega += h * d2.alpha;
    cur.q = d2.q;

    // 추진제 소모
    cur.rp1 = Math.max(0, cur.rp1 - d2.activeThrottle * BOOSTER_SPECS.rp1BurnRate * h);
    cur.n2 = Math.max(0, cur.n2 - Math.abs(d2.activeRcs) * BOOSTER_SPECS.n2BurnRate * h);

    // 착륙 다리 전개 (고도 40m 이하 하강 시 자동 전개)
    const legTarget = cur.y < 40 ? 1 : 0;
    cur.legDeploy += (legTarget - cur.legDeploy) * Math.min(1, h * 2.5);

    cur.throttle = d2.activeThrottle;
    cur.gimbal = d2.gimbal;
    cur.finDeflection = d2.finDeflection;
    cur.rcs = d2.activeRcs;

    // 갑판 접지 판정
    if (cur.y <= 0) {
      cur.y = 0;
      cur.landed = true;
      const tiltDeg = Math.abs((cur.theta * 180) / Math.PI);
      const onDeck = Math.abs(cur.x) <= BOOSTER_SPECS.bargeHalfWidth;
      const safeSpeed = Math.abs(cur.vy) <= 2.5 && Math.abs(cur.vx) <= 2.0;
      const safeTilt = tiltDeg <= 6.0;
      const success = onDeck && safeSpeed && safeTilt;

      cur.outcome = {
        success,
        reason: success
          ? '정밀 연착륙 성공'
          : !onDeck
          ? '바지선 갑판 이탈'
          : !safeSpeed
          ? '접지 속도 한계 초과'
          : '착륙 기울기 초과',
        xError: Number(cur.x.toFixed(2)),
        touchdownVy: Number(cur.vy.toFixed(2)),
        tiltDeg: Number(tiltDeg.toFixed(2)),
        remainingRp1: Number(cur.rp1.toFixed(1)),
      };
      cur.vx = 0;
      cur.vy = 0;
      cur.omega = 0;
      cur.throttle = 0;
      cur.rcs = 0;
    }
  }

  return cur;
}

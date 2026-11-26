import {LANDING_PRESETS} from './planarLandingEnv.js';

export const el=id=>document.getElementById(id);
export function createInputs(){
  return ['스로틀 (W/S)','짐벌 (A/D)','그리드 핀 (F/G)','RCS (J/K)','측풍 관측값 (m/s)'].map((name,i)=>{
    const label=document.createElement('label'),input=document.createElement('input');
    const limit=i===4?15:1;
    input.type='range';input.min=-limit;input.max=limit;input.step=i===4?.5:.05;
    input.value=i===0?-1:0;label.append(name,input);el('inputs').append(label);return input;
  });
}
export function createLandingPresets() {
  const select = el('landingPreset');
  for (const [key, {label}] of Object.entries(LANDING_PRESETS)) {
    select.add(new Option(label, key));
  }
  return select;
}

export function hud(s,manual){
  const [x,y,vx,vy,theta,,fuel,n2,q,w]=s.obs;
  const fixed=n=>n.toFixed(1);
  const prefix = s.legDeploy !== undefined ? 'RK2 · ' : manual ? '검사 · ' : '기록 · ';
  el('phase').textContent=prefix+(s.action[0]<-.2?'AERO-GLIDE':'TVC LANDING BURN');
  const telemetry = [
    '고도       '+fixed(y)+' m','수평 위치  '+fixed(x)+' m',
    'Vx / Vy    '+fixed(vx)+' / '+fixed(vy)+' m/s','기울기     '+fixed(theta*180/Math.PI)+'°',
    'RP-1 / N₂  '+fixed(fuel)+' / '+fixed(n2)+' kg','동압       '+(q/1000).toFixed(3)+' kPa',
    '측풍       '+fixed(w)+' m/s','TVC / FIN / RCS   '+[s.action[0]>=-.2,Math.abs(s.action[2])>.01,Math.abs(s.action[3])>.01].map(v=>v?'●':'○').join('    ')
  ];
  if (s.legDeploy !== undefined) {
    telemetry.push(`스로틀     ${fixed(s.throttle * 100)}%`, `착륙 다리  ${fixed(s.legDeploy * 100)}%`);
  }
  el('telemetry').textContent=telemetry.join('\n');
  el('clock').textContent=s.t.toFixed(2)+' s';
}

export function showLandingOutcome({reason, xError, touchdownVy, tiltDeg, remainingRp1}) {
  el('notice').textContent = [
    reason,
    `수평 오차 ${xError.toFixed(2)} m`,
    `접지 Vy ${touchdownVy.toFixed(2)} m/s`,
    `기울기 ${tiltDeg.toFixed(2)}°`,
    `남은 RP-1 ${remainingRp1.toFixed(1)} kg`,
  ].join(' · ');
}

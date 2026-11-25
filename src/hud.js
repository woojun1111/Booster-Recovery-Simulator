export const el=id=>document.getElementById(id);
export function createInputs(){
  return ['스로틀 (W/S)','짐벌 (A/D)','그리드 핀 (F/G)','RCS (J/K)','측풍 관측값 (m/s)'].map((name,i)=>{
    const label=document.createElement('label'),input=document.createElement('input');
    const limit=i===4?15:1;
    input.type='range';input.min=-limit;input.max=limit;input.step=i===4?.5:.05;
    input.value=i===0?-1:0;label.append(name,input);el('inputs').append(label);return input;
  });
}
export function hud(s,manual){
  const [x,y,vx,vy,theta,,fuel,n2,q,w]=s.obs;
  const fixed=n=>n.toFixed(1);
  el('phase').textContent=(manual?'검사 · ':'기록 · ')+(s.action[0]<-.2?'AERO-GLIDE':'TVC LANDING BURN');
  el('telemetry').textContent=[
    '고도       '+fixed(y)+' m','수평 위치  '+fixed(x)+' m',
    'Vx / Vy    '+fixed(vx)+' / '+fixed(vy)+' m/s','기울기     '+fixed(theta*180/Math.PI)+'°',
    'RP-1 / N₂  '+fixed(fuel)+' / '+fixed(n2)+' kg','동압       '+(q/1000).toFixed(3)+' kPa',
    '측풍       '+fixed(w)+' m/s','TVC / FIN / RCS   '+[s.action[0]>=-.2,Math.abs(s.action[2])>.01,Math.abs(s.action[3])>.01].map(v=>v?'●':'○').join('    ')
  ].join('\n');
  el('clock').textContent=s.t.toFixed(2)+' s';
}

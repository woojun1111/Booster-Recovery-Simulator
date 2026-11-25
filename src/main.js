import {Replay} from './replayController.js';
import {scene3d} from './scene3d.js';
import {el,createInputs,hud} from './hud.js';
import {loadModel} from './onnxController.js';
async function start(){
  const replay=new Replay();
  const sample=await fetch('./sample.json');
  replay.load(await sample.json());
  const draw=scene3d(el('scene')), inputs=createInputs();
  let predict, previous=performance.now(), pending=false, lastSample=null;
  loadModel().then(fn=>{
    predict=fn;el('modelOption').disabled=false;el('modelStatus').textContent='ONNX 기록 분석 가능';
  }).catch(e=>el('modelStatus').textContent='ONNX 비활성 · '+e.message);
  function setup(){
    const manual=el('mode').value==='manual';
    replay.running=false;replay.remainder=0;lastSample=null;
    el('notice').textContent='';
    inputs.forEach(input=>input.disabled=!manual);
    el('play').disabled=manual;el('timeline').disabled=manual;
    el('timeline').max=replay.last;
  }
  setup();el('mode').onchange=setup;
  el('play').onclick=()=>{
    if(replay.index===replay.last)replay.index=0;
    replay.running=!replay.running;
  };
  el('timeline').oninput=e=>{replay.running=false;replay.index=Number(e.target.value);replay.remainder=0;};
  el('file').onchange=async e=>{
    try{replay.load(JSON.parse(await e.target.files[0].text()));el('mode').value='replay';setup();}
    catch(error){el('notice').textContent=error.message;}
  };
  window.addEventListener('keydown',e=>{
    if(el('mode').value!=='manual'||e.ctrlKey||e.metaKey||e.altKey)return;
    const k=['s','w','a','d','f','g','j','k'].indexOf(e.key.toLowerCase());
    if(k>=0){const input=inputs[Math.floor(k/2)];k%2?input.stepUp():input.stepDown();}
  });
  function animate(now){
    replay.advance(Math.min(.15,(now-previous)/1000));previous=now;
    const s=replay.read(), manual=el('mode').value==='manual';
    if(manual){s.action=inputs.slice(0,4).map(input=>Number(input.value));s.obs[9]=Number(inputs[4].value);}
    if(el('mode').value==='model'&&predict&&!pending&&lastSample!==replay.index){
      const index=replay.index,record=replay.record;lastSample=index;pending=true;
      predict(s.obs).then(a=>{
        if(el('mode').value==='model'&&record===replay.record)el('notice').textContent=
          '예측 @ '+s.t.toFixed(2)+' s · '+a.map(x=>x.toFixed(3)).join(' / ');
      }).catch(e=>el('notice').textContent=e.message).finally(()=>pending=false);
    }
    hud(s,manual);draw(s,el('vectors').checked&&!manual,manual,now/1000);
    el('timeline').value=replay.index;el('play').textContent=replay.running?'일시정지':'재생';
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}
start().catch(e=>el('notice').textContent=e.message);

export async function loadModel() {
  const asset = async name => {
    const r = await fetch('./models/'+name);
    if (!r.ok || r.headers.get('content-type')?.includes('text/html')) throw Error(name+' 없음');
    return r;
  };
  const s = await (await asset('norm_stats.json')).json();
  if (![s.obs_mean,s.obs_var].every(a=>Array.isArray(a)&&a.length===10&&a.every(Number.isFinite)) ||
    s.obs_var.some(x=>x<0) || !(s.epsilon>0 && s.clip_obs>0)) throw Error('정규화 통계 오류');
  const bytes=await (await asset('booster_policy.onnx')).arrayBuffer();
  const ort=await import('onnxruntime-web');
  ort.env.wasm.numThreads=1;
  const session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm']});
  return async obs => {
    const normalized=Float32Array.from(obs,(x,i)=>Math.max(-s.clip_obs,Math.min(s.clip_obs,
      (Math.fround(x)-s.obs_mean[i])/Math.sqrt(s.obs_var[i]+s.epsilon))));
    const tensor=new ort.Tensor('float32',normalized,[1,10]);
    let outputs;
    try {
      outputs=await session.run({[session.inputNames[0]]:tensor});
      const v=outputs[session.outputNames[0]];
      if (v.dims.join(',')!=='1,4'||!v.data.every(Number.isFinite)) throw Error('출력 형식 오류');
      return Array.from(v.data);
    } finally {
      tensor.dispose();
      if(outputs) Object.values(outputs).forEach(v=>v.dispose());
    }
  };
}

// Playback coordinates are X right, Y up. Vectors are recorded display units.
export function frame(record, index, wind) {
  const t = index * record.dt;
  const keys = record.keys;
  let end = keys.findIndex((k,i) => i > 0 && t < k[0]);
  if (end < 0) end = keys.length - 1;
  const a = keys[end-1], b = keys[end];
  const u = (t-a[0])/(b[0]-a[0]);
  const obs = a[1].map((x,i) => x + (b[1][i]-x)*u);
  if (wind !== undefined) obs[9] = wind;
  const k = u >= 1 ? b : a;
  return {t, obs, action:k[2], vectors:k[3]};
}

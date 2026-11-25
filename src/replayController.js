import {frame} from './physics.js';
const numbers = (a,n) => Array.isArray(a) && a.length === n && a.every(Number.isFinite);
export class Replay {
  load(record) {
    if (record?.dt !== .05 || !Array.isArray(record.keys) || record.keys.length < 2 ||
        record.keys.some((k,i) => !Array.isArray(k) || !Number.isFinite(k[0]) ||
          (i ? k[0] <= record.keys[i-1][0] : k[0] !== 0) ||
          !numbers(k[1],10) || !numbers(k[2],4) || !Array.isArray(k[3]) ||
          k[3].length !== 3 || !k[3].every(v => numbers(v,2)))) throw Error('기록 형식을 확인하세요.');
    this.record = record;
    this.last = Math.floor(record.keys.at(-1)[0]/record.dt + 1e-9);
    this.index = 0;
    this.running = false;
    this.remainder = 0;
  }
  advance(dt) {
    if (!this.running) return;
    this.remainder += dt;
    const steps = Math.floor(this.remainder/this.record.dt);
    this.remainder -= steps*this.record.dt;
    this.index = Math.min(this.last,this.index+steps);
    if (this.index === this.last) this.running = false;
  }
  read() { return frame(this.record,this.index); }
}

import './sound-dsp.js?v=20260907-1';
import './loudness-dsp.js?v=20260908-1';
class SoundMeterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();this.programme=null;this.meters=[];this.buffers=[];this.fill=0;this.generation=0;this.maxFast=[0,0,0];this.maxSlow=[0,0,0];
    this.port.onmessage=event=>{if(event.data.type==='reset'){this.programme?.reset();this.meters.forEach(m=>m.reset());this.fill=0;this.generation=event.data.generation;this.maxFast=[0,0,0];this.maxSlow=[0,0,0];}else if(event.data.type==='pause'){this.programme?.pause(event.data.value);}};
  }
  process(inputs) {
    const channels=inputs[0];if(!channels?.length||!channels[0].length)return true;
    if(!this.programme)this.programme=new globalThis.ProgrammeLoudness.ProgrammeMeter(sampleRate,Math.min(channels.length,2));
    if(!this.meters.length)for(let c=0;c<Math.min(channels.length,2);c++){this.meters.push(new globalThis.SoundDSP.Meter(sampleRate));this.buffers.push(new Float32Array(4096));}
    for(let i=0;i<channels[0].length;i++){
      this.programme.frame(channels,i);
      for(let c=0;c<this.buffers.length;c++)this.buffers[c][this.fill]=channels[c]?.[i]??0;
      if(++this.fill===4096){
        const data=this.meters.map((m,c)=>m.analyze(this.buffers[c])),count=data.length,combined={seconds:data[0].seconds,generation:this.generation};
        for(const key of ['powers','fast','slow','leq','sel'])combined[key]=[0,1,2].map(k=>data.reduce((sum,d)=>sum+d[key][k],0)/count);
        for(let k=0;k<3;k++){this.maxFast[k]=Math.max(this.maxFast[k],combined.fast[k]);this.maxSlow[k]=Math.max(this.maxSlow[k],combined.slow[k]);}
        combined.maxFast=this.maxFast.slice();combined.maxSlow=this.maxSlow.slice();
        combined.peak=Math.max(...data.map(d=>d.peak));combined.clipped=data.reduce((sum,d)=>sum+d.clipped,0);
        combined.bands=data[0].bands.map((v,k)=>v===null?null:globalThis.SoundDSP.db(data.reduce((sum,d)=>sum+10**(d.bands[k]/10),0)/count));
        combined.programme=this.programme.read();this.fill=0;this.port.postMessage(combined);
      }
    }
    // Silent output. Channel energies are averaged, never waveform-downmixed:
    // opposite-phase stereo must not cancel in the level meter.
    return true;
  }
}
registerProcessor('sound-meter',SoundMeterProcessor);

const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
(async()=>{
 const dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://rexrockya.github.io/tuner/#sound',runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>t[k]??(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
 const q=id=>d.getElementById('sound-'+id);let tracks=[],nodes=[],contexts=[],calls=[],captureOptions,audioOptions,scenario='success',outputResolve,blob;
 function track(kind){const t={kind,readyState:'live',label:kind==='audio'?'Shared tab audio':'Screen',muted:false,getSettings:()=>({}),stop(){this.stopped=true;}};tracks.push(t);return t;}
 const stream=(items)=>({getTracks:()=>items,getAudioTracks:()=>items.filter(t=>t.kind==='audio')});
 const devices={
  async getUserMedia(options){audioOptions=options;return stream([track('audio')]);},
  async enumerateDevices(){return[{kind:'audioinput',deviceId:'external',label:'USB microphone'},{kind:'audiooutput',deviceId:'speaker',label:'Speaker'}];},
  getDisplayMedia(options){calls.push('capture');captureOptions=options;if(scenario==='cancel')return Promise.reject(Object.assign(new Error(),{name:'NotAllowedError'}));if(scenario==='pending')return new Promise(r=>outputResolve=r);return Promise.resolve(stream(scenario==='noaudio'?[track('video')]:[track('audio'),track('video')]));}
 };
 Object.defineProperty(w.navigator,'mediaDevices',{value:devices});
 w.AudioContext=class{constructor(){contexts.push(this);this.state='running';this.sampleRate=48000;this.audioWorklet={addModule:async()=>{}};}resume(){calls.push('resume');return Promise.resolve();}close(){this.closed=true;return Promise.resolve();}createMediaStreamSource(){return{connect(){},disconnect(){}};}};
 w.AudioWorkletNode=class{constructor(context,name,options){this.options=options;nodes.push(this);this.port={postMessage(){}};}connect(){}disconnect(){}};
 w.URL.createObjectURL=b=>{blob=b;return'blob:test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
 w.eval(fs.readFileSync('docs/sound-dsp.js','utf8'));w.eval(fs.readFileSync('docs/sound-meter.js','utf8'));
 assert.equal(q('source').querySelector('[value="output"]').disabled,false);
 await q('devices').onclick();assert.ok(tracks.every(t=>t.stopped));assert.equal(q('device').options.length,2);assert.equal(q('device').options[1].textContent,'USB microphone');
 q('device').value='external';await q('start').onclick();assert.equal(audioOptions.audio.deviceId.exact,'external');await q('start').onclick();
 q('source').value='output';q('source').onchange();calls=[];await q('start').onclick();
 assert.deepEqual(calls.slice(0,2),['capture','resume'],'display picker must run before any await');
 assert.equal(captureOptions.systemAudio,'include');assert.equal(captureOptions.video,true);assert.equal(nodes.at(-1).options.channelCount,2);
 assert.match(q('unit').textContent,/LUFS/);q('acoustic-mode').onclick();assert.match(q('unit').textContent,/输出数字电平/);assert.equal(q('calibration-panel').hidden,true);assert.equal(q('device-label').hidden,true);
 const meter=new w.SoundDSP.Meter(48000),data=meter.analyze(new Float32Array(4096).fill(.1));
 nodes.at(-1).port.onmessage({data:{...data,generation:0}});q('reference').value='80';q('calibrate').onclick();assert.doesNotMatch(q('unit').textContent,/SPL/);
 q('export').onclick();const text=await new Promise(r=>{const reader=new w.FileReader();reader.onload=()=>r(reader.result);reader.readAsText(blob);});
 assert.match(text,/"source_type","output"/);assert.doesNotMatch(text,/estimated dB SPL/);
 tracks.at(-1).onended();assert.ok(tracks.every(t=>t.stopped));assert.ok(contexts.at(-1).closed);
 scenario='noaudio';await q('start').onclick();assert.match(q('status').textContent,/没有收到共享音频/);assert.ok(tracks.every(t=>t.stopped));
 scenario='cancel';await q('start').onclick();assert.match(q('status').textContent,/取消/);assert.ok(contexts.at(-1).closed);
 scenario='pending';const pending=q('start').onclick();w.soundMeter.onPage('tools');const late=[track('audio'),track('video')];outputResolve(stream(late));await pending;assert.ok(late.every(t=>t.stopped));
 q('source').value='mic';q('source').onchange();assert.equal(q('calibration-panel').hidden,false);
 dom.window.close();
 const phone=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://rexrockya.github.io/tuner/',runScripts:'outside-only'}),pw=phone.window;
 Object.defineProperty(pw.navigator,'userAgent',{value:'iPhone'});Object.defineProperty(pw.navigator,'mediaDevices',{value:{getUserMedia:async()=>{throw Error('must not capture automatically');}}});
 pw.HTMLCanvasElement.prototype.getContext=()=>null;pw.eval(fs.readFileSync('docs/sound-dsp.js','utf8'));pw.eval(fs.readFileSync('docs/sound-meter.js','utf8'));
 const option=pw.document.querySelector('#sound-source [value="output"]');assert.match(option.textContent,/手机输出/);assert.equal(option.disabled,true);assert.match(pw.document.getElementById('sound-source-hint').textContent,/无法直接读取/);
 phone.window.close();console.log('PASS sources: microphone selection, desktop picker gesture, stereo, dBFS-only output, CSV, no audio, cancellation, late cleanup, mobile unsupported state');
})().catch(e=>{console.error(e);process.exit(1);});

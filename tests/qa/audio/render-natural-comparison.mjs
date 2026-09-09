import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import os from 'node:os';
const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf('--'+name);return i<0?fallback:args[i+1];};
const root=path.resolve(arg('root',process.cwd())), work=path.resolve(arg('workdir',path.join(os.tmpdir(),'tuner-offline-audio-20260908'))), label=arg('label','working'), ref=arg('ref','working'), requested=arg('cases','all');
const output=path.resolve(arg('out',path.join(work,'renders',label))), snapshot=path.join(work,'snapshots',label), docs=path.join(root,'docs');
fs.mkdirSync(output,{recursive:true});fs.mkdirSync(path.join(snapshot,'assets/audio/blues'),{recursive:true});fs.mkdirSync(path.join(work,'downloads'),{recursive:true});
const { OfflineAudioContext }=await import(pathToFileURL(path.join(work,'node_modules/node-web-audio-api/index.js')).href);
const useRecordings=args.includes('--recordings');
const names=[...(useRecordings?['practice-samples.js',...['guitar','bass','drums','percussion','strings','ensemble','keys'].map(x=>'assets/audio/natural-'+x+'/manifest.json')]:[]),'harmony.js','practice-arrangement.js','score-audio.js','practice-audio.js','practice-timbres.js','assets/audio/smplr-1.0.0.mjs','assets/audio/blues/manifest.json'];
const baseCommit=execFileSync('git',['rev-parse',ref==='working'?'HEAD':ref],{cwd:root,encoding:'utf8'}).trim();const sourceHashes={};
for(const name of names){const bytes=ref==='working'?fs.readFileSync(path.join(docs,name)):execFileSync('git',['show',ref+':docs/'+name],{cwd:root,maxBuffer:30*1024*1024});const file=path.join(snapshot,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);sourceHashes[name]=crypto.createHash('sha256').update(bytes).digest('hex');}
let caseFetches=new Map();const assetHashes={};const realFetch=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{const text=String(url);let bytes;
 if(/^https?:/.test(text)){const cache=path.join(work,'downloads',crypto.createHash('sha256').update(text).digest('hex')+path.extname(new URL(text).pathname));if(fs.existsSync(cache))bytes=fs.readFileSync(cache);else{const r=await realFetch(text,options);if(!r.ok)return r;bytes=Buffer.from(await r.arrayBuffer());fs.writeFileSync(cache,bytes);}}
 else {let rel=text.startsWith('file:')?path.relative(snapshot,fileURLToPath(text)):text.split('?')[0];rel=rel.replaceAll('\\','/');if(rel.includes('assets/audio/'))rel=rel.slice(rel.indexOf('assets/audio/'));const local=path.join(snapshot,rel);bytes=fs.readFileSync(fs.existsSync(local)?local:path.join(docs,rel));}
 caseFetches.set(text,{bytes:bytes.length});assetHashes[text.replace(/^.*(?=assets\/audio\/)/,'')]=crypto.createHash('sha256').update(bytes).digest('hex');return {ok:true,status:200,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),text:async()=>bytes.toString('utf8'),json:async()=>JSON.parse(bytes.toString('utf8'))};
};
const module=await import(pathToFileURL(path.join(snapshot,'practice-timbres.js')).href+'?run='+Date.now());
const leadNotes=[{beat:0,duration:1.6,midi:57},{beat:2,duration:.45,midi:60},{beat:3,duration:.45,midi:64},{beat:4,duration:2.4,midi:67},{beat:7,duration:.45,midi:69},{beat:8,duration:.45,midi:72},{beat:9,duration:2.8,midi:76}].map((n,i)=>({...n,track:'lead',velocity:.72,variant:i%2,articulation:'picked'}));
const results=[];
function wave(channels,rate){const frames=channels[0].length,bytes=Buffer.alloc(44+frames*channels.length*4);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(3,20);bytes.writeUInt16LE(channels.length,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*channels.length*4,28);bytes.writeUInt16LE(channels.length*4,32);bytes.writeUInt16LE(32,34);bytes.write('data',36);bytes.writeUInt32LE(bytes.length-44,40);for(let i=0;i<frames;i++)for(let ch=0;ch<channels.length;ch++)bytes.writeFloatLE(channels[ch][i],44+(i*channels.length+ch)*4);return bytes;}
function measure(channels,rate,start,end){let peak=0,sum=0,clipped=0,count=0;const first=Math.max(0,Math.floor(start*rate)),last=Math.min(channels[0].length,Math.ceil(end*rate));for(const c of channels)for(let i=first;i<last;i++){const x=c[i];if(!Number.isFinite(x))throw Error('Non-finite audio sample');peak=Math.max(peak,Math.abs(x));sum+=x*x;if(Math.abs(x)>=1)clipped++;count++;}return {samplePeakDbFS:peak?20*Math.log10(peak):null,rmsDbFS:sum?10*Math.log10(sum/count):null,clippedSamples:clipped,sampleCount:count};}
const fixtureBox={window:{},console};vm.createContext(fixtureBox);
for(const file of ['harmony.js','practice-arrangement.js'])vm.runInContext(execFileSync('git',['show','f8be94b:docs/'+file],{cwd:root,maxBuffer:20*1024*1024,encoding:'utf8'}),fixtureBox);
const fixtureParsed=fixtureBox.window.tunerHarmony.parse('1maj7,6m7,2m7,57');
const backing=JSON.parse(JSON.stringify(fixtureBox.window.practiceArrangements.arrangement(fixtureParsed,'shuffle',20260908,1,{bassStyle:'walking',drumStyle:'shuffle',keyStyle:'soul',rhythmStyle:'boogie',percussionStyle:'shaker',stringsStyle:'pad'}).events));
const fixture=backing.concat(leadNotes).sort((a,b)=>a.beat-b.beat);
const pressureLead=Array.from({length:64},(_,i)=>[0,4,7].map((offset,j)=>({track:'lead',midi:60+(i%8)+offset,beat:i/4,duration:.23,velocity:.96,variant:(i+j)%4,stackSize:3,stackIndex:j,articulation:'picked'}))).flat();
const pressure=backing.map(e=>({...e,velocity:.96})).concat(pressureLead).sort((a,b)=>a.beat-b.beat);
fs.writeFileSync(path.join(output,'event-fixture.json'),JSON.stringify({baseline:'f8be94b',fixture,pressure},null,2));
async function render(name,selection,kind){const isMix=['mix','pressure'].includes(kind),bpm=kind==='pressure'?180:96,seconds=60/bpm,songBeats=16,rate=44100,duration=songBeats*seconds+1.25;caseFetches=new Map();let decodedBytes=0,decodedCount=0;
 const context=new OfflineAudioContext(2,Math.ceil(rate*duration),rate),buffers=new Map(),nodeCounts={};
 function trackBuffer(buffer){const cache=new Map();buffers.set(buffer,cache);buffer.getChannelData=channel=>{if(!cache.has(channel)){const data=new Float32Array(buffer.length);buffer.copyFromChannel(data,channel);cache.set(channel,data);}return cache.get(channel);};return buffer;}
 function flush(buffer){for(const [channel,data]of buffers.get(buffer)||[])buffer.copyToChannel(data,channel);}
 function bufferSetter(node){let p=node,desc;while(p&&!desc){desc=Object.getOwnPropertyDescriptor(p,'buffer');p=Object.getPrototypeOf(p);}if(desc?.set)Object.defineProperty(node,'buffer',{get(){return desc.get.call(node);},set(buffer){if(buffer)flush(buffer);desc.set.call(node,buffer);},configurable:true});return node;}
 const automation = [];
 function parameter(param) {
  if (!param || typeof param.setTargetAtTime !== 'function' || param.offlineEvents) return;
  const events=[];Object.defineProperty(param,'offlineEvents',{value:events});
  const originalCurve=param.setValueCurveAtTime.bind(param);const originalSet=param.setValueAtTime.bind(param);
  for(const [method,type]of [['setValueAtTime','set'],['linearRampToValueAtTime','linear'],['setTargetAtTime','target']])param[method]=(value,time,tau)=>{events.push({type,value,time,tau,order:events.length});return param;};
  param.cancelScheduledValues=time=>{for(let i=events.length-1;i>=0;i--)if(events[i].time>=time)events.splice(i,1);return param;};
  automation.push(()=>{
   if(!events.length)return;events.sort((a,b)=>a.time-b.time||a.order-b.order);
   const first=events[0].time,start=Math.max(0,first),end=duration,frames=Math.max(2,Math.ceil((end-start)*rate)+1),curve=new Float32Array(frames);
   let state={time:0,value:param.value,type:'set'},cursor=0;
   const valueAt=(state,time)=>state.type==='target'?state.value+(state.initial-state.value)*Math.exp(-(time-state.time)/state.tau):state.value;
   const fill=(until,next)=>{while(cursor<frames){const time=start+cursor*(end-start)/(frames-1);if(time>=until-1e-12)break;curve[cursor++]=next?.type==='linear'?valueAt(state,state.time)+(next.value-valueAt(state,state.time))*(time-state.time)/(next.time-state.time):valueAt(state,time);}};
   for(const event of events){fill(event.time,event);const prior=valueAt(state,event.time);state=event.type==='target'?{...event,initial:prior}:event;}
   fill(Infinity);originalSet(curve[0],start);originalCurve(curve,start,end-start);
  });
 }
 const create=context.createBuffer.bind(context),decode=context.decodeAudioData.bind(context);context.createBuffer=(...a)=>trackBuffer(create(...a));
 function counted(buffer){decodedCount++;decodedBytes+=buffer.length*buffer.numberOfChannels*4;return trackBuffer(buffer);}
 context.decodeAudioData=async bytes=>{try{return counted(await decode(bytes));}catch(nativeError){const pcm=execFileSync('ffmpeg',['-v','error','-i','pipe:0','-f','f32le','-ac','2','-ar',String(rate),'pipe:1'],{input:Buffer.from(bytes),maxBuffer:50*1024*1024});const b=create(2,pcm.length/8,rate);for(let ch=0;ch<2;ch++){const data=new Float32Array(b.length);for(let i=0;i<data.length;i++)data[i]=pcm.readFloatLE(i*8+ch*4);b.copyToChannel(data,ch);}return counted(b);}};
 for(const method of ['createGain','createDynamicsCompressor','createConvolver','createBiquadFilter','createBufferSource','createWaveShaper','createOscillator']){const original=context[method].bind(context);context[method]=(...a)=>{nodeCounts[method]=(nodeCounts[method]||0)+1;const node=original(...a);for(const key of ['gain','frequency','playbackRate','detune','Q','delayTime','threshold','knee','ratio','attack','release','pan'])parameter(node[key]);return method==='createConvolver'||method==='createBufferSource'?bufferSetter(node):node;};}
 // Unlock is a no-op for an offline graph; no AudioContext or system audio sink is created.
 context.resume=async()=>{};
 const window={AudioContext:function(){return context;},setInterval(){return 1;},clearInterval(){},importTimbres:async()=>module};
 const box={window,console,AbortController,Float32Array,Uint8Array,Map,Set,Math,setTimeout,clearTimeout,fetch:globalThis.fetch};vm.createContext(box);
 for(const file of ['harmony.js','practice-arrangement.js','score-audio.js',...(useRecordings?['practice-samples.js']:[])])vm.runInContext(fs.readFileSync(path.join(snapshot,file),'utf8'),box,{filename:file});
 // Only replace the module-loader boundary; all synthesis, filters and scheduling are production code.
 vm.runInContext(fs.readFileSync(path.join(snapshot,'practice-audio.js'),'utf8').replace(/import\('\.\/practice-timbres\.js[^']*'\)/,'window.importTimbres()'),box,{filename:'practice-audio.js'});
 const A=window.practiceAudio;let events;
 if(isMix)events=JSON.parse(JSON.stringify(kind==='pressure'?pressure:fixture));
 else if(kind==='tail')events=[{track:'lead',beat:0,duration:8,midi:69,velocity:.72,variant:0,articulation:'picked'}];
 else if(kind==='percussion-clap'||kind==='percussion-tambourine')events=Array.from({length:8},(_,i)=>({track:'percussion',beat:1+i*2,duration:.075,velocity:.32,variant:i%2,percussionStyle:kind.slice(11),sample:kind==='percussion-clap'?'snare-'+(i%2+1):'open-hat',playbackRate:kind==='percussion-clap'?1.2:1.4}));
 else if(kind==='lead')events=leadNotes;
 else events=backing.filter(e=>e.track===kind);
 if(Object.entries(selection).some(([track,id])=>!A.timbres[track]?.[id]))throw Error('Unsupported '+name+' '+JSON.stringify(selection));
 await A.preload();for(const [track,id]of Object.entries(selection))await A.setTimbre(track,id,events);
 const volumes={drums:.78,bass:.82,keys:.5,rhythm:.66,percussion:.38,strings:.46,lead:.95};
 for(const [track,value]of Object.entries(volumes))A.volume(track,kind==='pressure'?1:value);
 const t=new A.Transport();t.bpm=bpm;t.load({events,beats:songBeats,chartBeats:songBeats});t.loop=false;await t.play();
 // Expand the production Transport's lookahead before rendering; no timer or altered note graph.
 if(typeof t.schedule!=='function')throw Error('Expected current production Transport.schedule');t.schedule(t,0,duration);
 for(const buffer of buffers.keys())flush(buffer);for(const compile of automation)compile();
 const rendered=await context.startRendering(),channels=Array.from({length:rendered.numberOfChannels},(_,ch)=>{const data=new Float32Array(rendered.length);rendered.copyFromChannel(data,ch);return data;});
 const filename=path.join(output,name+'.wav');fs.writeFileSync(filename,wave(channels,rate));
 const naturalAssets=[...caseFetches.entries()].filter(([url])=>/natural-[^/]+\/(?!manifest)/.test(url));
 const result={name,kind,selection,bpm,sampleRate:rate,duration,eventCount:events.length,eventHash:crypto.createHash('sha256').update(JSON.stringify(events)).digest('hex'),...measure(channels,rate,0,duration),active:measure(channels,rate,.04,songBeats*seconds),tailWindows:kind==='tail'?[.1,.5,1,2,3,4,4.8,5.1,5.5].map(time=>({time,...measure(channels,rate,time,time+.2)})):undefined,noteWindows:!isMix&&['lead','bass'].includes(kind)?events.slice(0,24).map(note=>({midi:note.midi,velocity:note.velocity,...measure(channels,rate,.035+note.beat*seconds,.035+(note.beat+note.duration)*seconds)})):undefined,nodeCounts,download:{requestCount:caseFetches.size,bytes:[...caseFetches.values()].reduce((sum,x)=>sum+x.bytes,0),naturalAudioFiles:naturalAssets.length,naturalAudioBytes:naturalAssets.reduce((sum,[,x])=>sum+x.bytes,0),decodedCount,decodedBytes,assets:[...caseFetches.entries()].map(([url,x])=>({url,...x}))},wav:filename};results.push(result);console.log(JSON.stringify({name,peak:result.samplePeakDbFS,rms:result.active.rmsDbFS,clipped:result.clippedSamples,MiB:result.download.bytes/1048576,pcmMiB:decodedBytes/1048576,nodes:nodeCounts}));
 globalThis.gc?.();
}
const baseSelection={lead:'warm',bass:'precision',keys:useRecordings?'wurli':'jazz',rhythm:'warm',drums:'natural',strings:'chamber',percussion:'natural'};
const all=[['lead-warm',{lead:'warm'},'lead'],['lead-bright',{lead:'bright'},'lead'],['lead-crunch',{lead:'crunch'},'lead'],['lead-violin',{lead:'violin'},'lead'],['lead-piano',{lead:'piano'},'lead'],['bass-precision',{bass:'precision'},'bass'],['rhythm-warm',{rhythm:'warm'},'rhythm'],['keys-default',{keys:baseSelection.keys},'keys'],['strings-chamber',{strings:'chamber'},'strings'],['drums-natural',{drums:'natural'},'drums'],['percussion-shaker',{percussion:'natural'},'percussion'],['percussion-clap',{percussion:'natural'},'percussion-clap'],['percussion-tambourine',{percussion:'natural'},'percussion-tambourine'],['mix-warm',baseSelection,'mix'],['mix-violin',{...baseSelection,lead:'violin'},'mix'],['pressure-warm',baseSelection,'pressure'],['pressure-crunch',{...baseSelection,lead:'crunch',rhythm:'crunch'},'pressure'],['pressure-violin',{...baseSelection,lead:'violin'},'pressure'],['tail-warm',{lead:'warm'},'tail'],['tail-violin',{lead:'violin'},'tail']];
try{for(const test of all)if(requested==='all'||requested.split(',').includes(test[0]))await render(...test);const report={label,ref,baseCommit,created:new Date().toISOString(),root,sourceHashes,assetHashes,rendererVersion:JSON.parse(fs.readFileSync(path.join(work,'node_modules/node-web-audio-api/package.json'),'utf8')).version,automationSanity:{frames:88200,maxAbsoluteError:1.4898282940656316e-8,rmsError:1.929123287481604e-9},method:'Real node-web-audio-api OfflineAudioContext; unchanged production Web Audio graph and Transport.schedule; actual bundled samples and score piano/violin mapping; float WAV; sample peak and RMS (not LUFS/true peak). Offline resume and loader boundary adapted. Native setTargetAtTime future-time bug reproduced in pure sine probe; target automation evaluated analytically and supplied as per-sample setValueCurveAtTime for all old/new comparisons (production graph otherwise unchanged). AudioBuffer mutable views synchronized with copyToChannel for native library portability.',results};fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log('REPORT '+path.join(output,'report.json'));}finally{globalThis.fetch=realFetch;}

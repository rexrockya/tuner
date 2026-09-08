const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const{setup,tick,raw,ROOT}=require('./qa/harness.cjs');
(async()=>{
 const h=setup({skipApp:true}),w=h.w,d=h.d,pending=[];
 for(const match of raw.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)){
  const url=new URL(match[1],'https://rexrockya.github.io/tuner/');Object.defineProperty(d,'currentScript',{value:{src:url.href},configurable:true});
  vm.runInContext(fs.readFileSync(path.join(ROOT,'docs',url.pathname.replace('/tuner/','')),'utf8'),h.dom.getInternalVMContext());
 }
 const append=d.head.appendChild.bind(d.head);d.head.appendChild=node=>{if(node.tagName==='SCRIPT')pending.push(node);return append(node);};
 const evaluate=name=>{const node=pending.find(n=>n.src.includes(name));assert.ok(node,'pending '+name);vm.runInContext(fs.readFileSync(path.join(ROOT,'docs',name),'utf8'),h.dom.getInternalVMContext());node.onload();};
 assert.equal(w.practiceStudio,undefined);assert.equal(w.soundMeter,undefined);assert.equal(h.streams.length,0);
 h.click('.tab[data-page="lesson"]');h.click('.tab[data-page="lesson"]');
 assert.equal(pending.filter(n=>n.src.includes('practice-audio.js')).length,1);assert.equal(pending.filter(n=>n.src.includes('practice.js')).length,0);
 evaluate('practice-audio.js');await tick();assert.equal(pending.filter(n=>n.src.includes('practice.js')).length,1);
 h.click('.brand');evaluate('practice.js');await tick();assert.equal(h.q('#lesson-page').style.display,'none');assert.equal(h.q('#practice-loader').hidden,true);assert.ok(w.practiceStudio);assert.equal(h.streams.length,0);
 let stopped=0;const stop=w.practiceStudio.stop;w.practiceStudio.stop=()=>{stopped++;stop();};
 h.click('.tab[data-page="lesson"]');h.click('.brand');assert.equal(stopped,1,'brand stops hidden accompaniment');
 w.location.hash='#sound';w.dispatchEvent(new w.Event('hashchange'));assert.ok(stopped>=2,'hash route stops accompaniment');
 assert.equal(pending.filter(n=>n.src.includes('sound-meter.js')).length,1);evaluate('sound-meter.js');await tick();assert.equal(h.q('#sound-start').disabled,false);assert.equal(h.q('#sound-page').style.display,'grid');assert.equal(h.streams.length,0);
 h.click('.brand');assert.equal(h.q('#sound-page').style.display,'none');assert.equal(h.errors.length,0,h.errors.join('\n'));
 h.close();console.log('PASS lazy features: sequential studio load, concurrency dedupe, late navigation, brand/hash accompaniment cleanup, lazy sound entry and no automatic capture');
})().catch(error=>{console.error(error);process.exit(1)});

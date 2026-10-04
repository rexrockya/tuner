const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{JSDOM}=require('jsdom');
const catalog=JSON.parse(fs.readFileSync('docs/assets/licks/fretboard/catalog.json','utf8'));
const flush=()=>new Promise(r=>setImmediate(r));
async function harness(id='Xbv40aTf'){
 const dom=new JSDOM(fs.readFileSync('docs/fretboard.html','utf8'),{url:'https://rexrockya.github.io/tuner/fretboard.html?lesson='+id,runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window,d=w.document,errors=[];
 w.addEventListener('error',e=>errors.push(e.error));
 w.HTMLMediaElement.prototype.pause=function(){Object.defineProperty(this,'paused',{configurable:true,value:true});};w.HTMLMediaElement.prototype.load=function(){};
 w.fetch=async url=>{const file=path.join('docs',String(url).split('?')[0]);return{ok:fs.existsSync(file),status:fs.existsSync(file)?200:404,json:async()=>JSON.parse(fs.readFileSync(file,'utf8'))};};
 w.eval(fs.readFileSync('docs/fretboard-core.js','utf8'));w.eval(fs.readFileSync('docs/fretboard.js','utf8'));await flush();await flush();
 return{dom,w,d,errors,click:s=>{assert.ok(d.querySelector(s),s);d.querySelector(s).click();},text:s=>d.querySelector(s).textContent};
}
(async()=>{
 const t=await harness(),{d,w,click,text}=t;
 assert.deepEqual(t.errors,[]);assert.equal(d.querySelector('#coach').hidden,false);assert.equal(text('#current-note'),'E3');assert.equal(d.querySelectorAll('.chord-segment').length,8);
 assert.equal(d.querySelector('#original-audio').getAttribute('src'),'https://bopland.org/data/Xbv40aTf.mp3');assert.equal(d.querySelector('.original-link').getAttribute('href'),'./#lick/Xbv40aTf');
 assert.match(text('#coverage-status'),/21/);assert.equal(d.querySelectorAll('#full-sequence [data-note]').length,28);
 const expected=['3','5','7','9','3','5','♭7','♭9','5','♭3','1','♭7','3','1','♭9','♯9','5','3','9','1','3','♭9','♭7','趋近','5','♭3','1','♭7'];
 for(let i=0;i<28;i++){click(`#full-sequence [data-note="${i}"]`);assert.equal(text('#current-degree'),expected[i],`1297 note ${i}`);}
 click('[data-segment="1"]');assert.equal(text('#board-title'),'A7');assert.equal(text('#current-note'),'C♯4');click('#root-anchors button');assert.equal(d.querySelector('#return-to-note').hidden,false);click('#return-to-note');assert.equal(text('#current-note'),'C♯4');
 const select=d.querySelector('#shape-select');select.value='-1';select.dispatchEvent(new w.Event('change'));assert.match(text('#shape-note'),/已隐藏/);
 for(const id of ['show-skeleton','show-equivalents','show-path'])click('#'+id);assert.equal(d.querySelectorAll('[data-equivalent]').length,0);assert.equal(d.querySelectorAll('[data-order]').length,0);
 const ids=[...d.querySelectorAll('[id]')].map(n=>n.id);assert.equal(ids.length,new Set(ids).size);
 for(const el of d.querySelectorAll('[aria-labelledby],label[for]'))assert.ok(d.getElementById(el.getAttribute('aria-labelledby')||el.htmlFor));
 // Exact-ID lesson switching, not a redirect to the former hardcoded lesson.
 const gs=catalog.lessons.find(x=>x.sourceType==='guitarset');d.querySelector('#lesson-select').value=gs.id;d.querySelector('#lesson-select').dispatchEvent(new w.Event('change'));await flush();await flush();assert.equal(text('#lesson-title'),gs.title);assert.match(d.querySelector('.original-link').href,new RegExp(gs.id));assert.notEqual(text('#current-note'),'E3');assert.ok(d.querySelector('#original-audio').src.includes(gs.id));assert.equal(new URL(w.location.href).searchParams.get('lesson'),gs.id);
 // All source annotations can render, including notes >12 frets, gaps and polyphony.
 for(const item of catalog.lessons.filter(x=>x.supported&&x.sourceType==='guitarset')){d.querySelector('#lesson-select').value=item.id;d.querySelector('#lesson-select').dispatchEvent(new w.Event('change'));await flush();await flush();assert.equal(d.querySelector('#coach').hidden,false,item.id);const notes=[...d.querySelectorAll('#full-sequence [data-note]')];assert.ok(notes.length>5,item.id);for(const b of [notes[0],notes.at(-1)]){b.click();assert.doesNotMatch(d.querySelector('#fretboard').innerHTML,/NaN|undefined/);}}
 click('#only-supported');const unsupported=catalog.lessons.find(x=>!x.supported);d.querySelector('#lesson-select').value=unsupported.id;d.querySelector('#lesson-select').dispatchEvent(new w.Event('change'));await flush();await flush();assert.equal(d.querySelector('#coach').hidden,false);assert.equal(d.querySelector('.phrase-panel').hidden,true);assert.match(text('#fidelity-note'),/尚未核对/);assert.equal(d.querySelectorAll('[data-order]').length,0);assert.ok(d.querySelector('#root-anchors button'));click('#root-anchors button');assert.match(text('#note-panel-title'),/探索/);assert.equal(d.querySelector('#return-to-note').hidden,true);assert.match(d.querySelector('.original-link').href,new RegExp(unsupported.id));
 const chordButtons=[...d.querySelectorAll('[data-segment]')];chordButtons.at(-1).click();assert.match(text('#position-label'),/和声地标/);
 assert.deepEqual(t.errors,[]);t.dom.window.close();
 const invalid=await harness('not-a-real-id');assert.match(invalid.text('#load-status'),/不在资料库/);assert.equal(invalid.d.querySelector('#coach').hidden,true);invalid.dom.window.close();
 // A later navigation wins even if the older request resolves late.
 const r=await harness(),oldFetch=r.w.fetch;let finish;const slow=catalog.lessons.find(x=>x.id==='Xbv40aTf');r.w.fetch=url=>String(url)===slow.data?new Promise(resolve=>finish=()=>resolve(oldFetch(url))):oldFetch(url);
 r.d.querySelector('#lesson-select').value=slow.id;r.d.querySelector('#lesson-select').dispatchEvent(new r.w.Event('change'));r.d.querySelector('#lesson-select').value=gs.id;r.d.querySelector('#lesson-select').dispatchEvent(new r.w.Event('change'));await flush();await flush();finish();await flush();await flush();assert.equal(r.text('#lesson-title'),gs.title);assert.ok(r.d.querySelector('#original-audio').src.includes(gs.id));r.dom.window.close();
 console.log('PASS fretboard UI: exact IDs, all 21 source routes, 28 verified1297 roles, harmony-only map, honest coverage, source media, dynamic chords, roots/octaves, layers, >12 frets, late-load guard, unknown ID, labels');
})().catch(e=>{console.error(e);process.exitCode=1;});

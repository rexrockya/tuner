const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('docs/index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,'');
for(const [id,order]of [['nS2bCeIt',['guitarset-index.js','guitar-index.js']],['gs00bn5',['guitar-index.js','guitarset-index.js']],['Xbv40aTf',['guitar-index.js','guitarset-index.js']]]){
 const dom=new JSDOM(html,{url:'https://rexrockya.github.io/tuner/#lick/'+id,runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.scrollTo=()=>{};w.HTMLElement.prototype.scrollTo=()=>{};w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};w.HTMLMediaElement.prototype.pause=()=>{};
 for(const file of ['storage.js','harmony.js','lessons.js'])w.eval(fs.readFileSync('docs/'+file,'utf8'));
 assert.equal(d.querySelector('#lesson-page').getAttribute('aria-busy'),'true');assert.match(d.querySelector('#lesson-title').textContent,/载入/);assert.equal(d.querySelector('#lick-staff img'),null);assert.ok(!d.querySelector('#lick-fretboard-link')||d.querySelector('#lick-fretboard-link').hidden);assert.ok(d.querySelector('#play-lick').disabled);
 for(const file of order)w.eval(fs.readFileSync('docs/assets/licks/'+file,'utf8'));
 assert.equal(d.querySelector('#lesson-page').getAttribute('aria-busy'),'false');assert.equal(d.querySelector('#lick-fretboard-link').getAttribute('href'),'fretboard.html?lesson='+id);assert.equal(d.querySelector('#lick-fretboard-link').hidden,false);assert.ok(d.querySelector('#lick-staff img').src.includes(id));assert.equal(d.querySelector('#play-lick').disabled,false);dom.window.close();
}
console.log('PASS exact-ID library return: unresolved deep links hide fallback player/coach; both source load orders resolve original score and coach target');

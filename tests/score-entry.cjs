const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const {IDBFactory}=require('fake-indexeddb');
const html=fs.readFileSync('docs/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
const database=new IDBFactory();
function create(){
  const dom=new JSDOM(html,{url:'https://rexrockya.github.io/tuner/',runScripts:'outside-only'}),w=dom.window;
  w.indexedDB=database;w.Blob=Blob;w.File=File;
  w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  w.confirm=()=>true;
  w.fetch=()=>{throw new Error('Drafts must not be uploaded');};
  w.eval(fs.readFileSync('docs/score-entry.js','utf8'));
  return dom;
}
async function settled(w){for(let i=0;i<50;i++){await new Promise(resolve=>setTimeout(resolve,5));if(!w.document.getElementById('score-files-button').disabled)return;}throw new Error('operation timed out');}
async function select(w,files){const input=w.document.getElementById('score-files-input');Object.defineProperty(input,'files',{value:files,configurable:true});input.dispatchEvent(new w.Event('change'));await settled(w);}
(async()=>{
  let dom=create(),w=dom.window,$=id=>w.document.getElementById(id);
  $('score-entry-open').click();await settled(w);
  assert.equal($('score-camera-input').getAttribute('capture'),'environment');
  assert.equal($('score-entry-recognize').disabled,true);
  await select(w,[new File(['not a pdf'],'fake.pdf',{type:'application/pdf'})]);
  assert.match($('score-entry-status').textContent,/不是支持/);
  assert.equal($('score-entry-files').children.length,0);
  const pdf=new File(['%PDF-1.7\nexample'],'page1.pdf',{type:'application/pdf'});
  const png=new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],'page2.png',{type:'image/png'});
  await select(w,[pdf,png]);
  assert.equal($('score-entry-files').children.length,2);
  assert.match($('score-entry-status').textContent,/尚未上传或识别/);
  $('score-entry-files').querySelector('button[aria-label="下移 page1.pdf"]').click();await settled(w);
  assert.match($('score-entry-files').firstChild.textContent,/page2.png/);
  dom.window.close();dom=create();w=dom.window;
  $('score-entry-open').click();await settled(w);
  assert.equal($('score-entry-files').children.length,2,'temporary drafts survive reload');
  assert.match($('score-entry-files').firstChild.textContent,/page2.png/);
  await select(w,Array(9).fill(pdf));assert.match($('score-entry-status').textContent,/最多保留 10/);
  assert.equal($('score-entry-files').children.length,2,'failed batch cannot partially save');
  $('score-entry-files').querySelector('button[aria-label="移除 page2.png"]').click();await settled(w);
  assert.equal($('score-entry-files').children.length,1);
  $('score-entry-clear').click();await settled(w);assert.equal($('score-entry-files').children.length,0);
  assert.equal($('score-entry-clear').disabled,true);
  dom.window.close();
  const css=fs.readFileSync('docs/score-controls.css','utf8');
  assert.match(css,/\.sheet-transport\{[^}]*flex-wrap:wrap/);
  assert.match(css,/\.sheet-transport button\{flex-shrink:0\}/);
  assert.match(css,/\.sheet-stepper\{flex-shrink:0;overflow:visible\}/);
  assert.match(css,/\.sheet-stepper button\{width:44px;min-width:44px;height:44px\}/);
  assert.ok(html.indexOf('score-controls.css')>html.indexOf('</style>'),'responsive overrides load last');
  console.log('PASS: capture input, file signatures, persistent local drafts, order/removal/limits, no upload, control sizing contracts');
})().catch(error=>{console.error(error);process.exitCode=1;});

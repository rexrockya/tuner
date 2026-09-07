const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('docs/index.html','utf8'),dom=new JSDOM(html),d=dom.window.document;
const ids=[...d.querySelectorAll('[id]')].map(n=>n.id);
assert.equal(new Set(ids).size,ids.length,'duplicate HTML IDs');
for(const element of d.querySelectorAll('[aria-controls],[aria-labelledby],label[for]')){
 const refs=element.getAttribute('aria-controls')||element.getAttribute('aria-labelledby')||element.htmlFor;
 for(const id of refs.split(/\s+/))assert.ok(d.getElementById(id)||(id==='jam-room-title'&&fs.readFileSync('docs/app.js','utf8').includes('id="jam-room-title"')),`missing accessibility target ${id}`);
}
for(const element of d.querySelectorAll('script[src],link[rel="stylesheet"][href]')){
 const url=element.getAttribute('src')||element.getAttribute('href');
 if(/^(https?:)?\/\//.test(url))continue;
 const file=path.resolve('docs',url.split('?')[0]);assert.ok(fs.existsSync(file),`missing script/style ${url}`);
 if(element.tagName==='SCRIPT')new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
}
for(const script of d.querySelectorAll('script:not([src])')){
 if(script.type==='application/json')JSON.parse(script.textContent);else new vm.Script(script.textContent);
}
for(const page of ['tuner','lesson','sheet','metro','jam'])assert.equal(d.querySelectorAll(`.tab[data-page="${page}"]`).length,1);
for(const button of d.querySelectorAll('button'))assert.ok(button.textContent.trim()||button.getAttribute('aria-label'),'unlabelled button');
assert.ok(d.querySelector('meta[name="viewport"]').content.includes('width=device-width'));
assert.doesNotMatch(d.querySelector('meta[name="viewport"]').content,/user-scalable=no|maximum-scale=1/);
assert.equal(d.querySelector('.score-entry'),null);
dom.window.close();
console.log('PASS site shell: 5 sections, unique IDs, labels, accessibility references, script syntax, local assets, mobile viewport');

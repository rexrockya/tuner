// Exercise the small main-site facade through the actual lazy asset loader.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const docs=path.resolve(__dirname,'../docs');
const flush=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));};
const ctx=(id='one')=>({id,title:'Lesson '+id,text:id==='two'?'F7 | Bb7':'Dm7 | G7 | Cmaj7',key:id==='two'?'F':'C',genre:'jazz',bpm:96});
function fixture(){
  const dom=new JSDOM('<!doctype html><button id="open">伴奏</button>',{url:'https://rexrockya.github.io/tuner/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,scripts=[];
  const run=file=>{const script=d.createElement('script');script.src='https://rexrockya.github.io/tuner/'+file;Object.defineProperty(d,'currentScript',{configurable:true,value:script});w.eval(fs.readFileSync(path.join(docs,file),'utf8'));Object.defineProperty(d,'currentScript',{configurable:true,value:null});};
  const append=d.head.appendChild.bind(d.head);d.head.appendChild=node=>{const result=append(node);if(node.tagName==='SCRIPT')scripts.push(node);return result;};
  run('harmony.js');run('asset-loader.js');run('floating-backing-loader.js');
  return {w,d,scripts,facade:w.floatingBacking,
    deliver(file='floating-backing.js'){const script=scripts.find(s=>s.src.includes('/'+file)&&!s.delivered);assert.ok(script,'requested '+file);script.delivered=true;run(file);script.onload?.();},
    fail(file='floating-backing.js'){const script=scripts.find(s=>s.src.includes('/'+file)&&!s.delivered);assert.ok(script);script.delivered=true;script.onerror?.();},
    close(){w.floatingBacking.close();dom.window.close();}
  };
}
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
test('real player replaces facade, renders and keeps generated audio stopped',async()=>{
  const f=fixture();try{
    f.facade.setContext(ctx());assert.equal(f.scripts.length,0,'context-only activation stays lazy');
    f.facade.open();assert.equal(f.scripts.length,1);assert.equal(f.d.querySelectorAll('link[data-floating-backing]').length,1);
    f.deliver();await flush();assert.equal(f.w.floatingBacking.isReady,true,'full module must replace facade');
    assert.equal(f.w.floatingBacking.getState().contextId,'one');assert.equal(f.w.floatingBacking.getState().visible,true);assert.equal(f.w.floatingBacking.getState().playing,false);
    assert.equal(f.d.getElementById('backing-loader-status').hidden,true);assert.equal(f.d.querySelectorAll('#floating-backing').length,1);
  }finally{f.close();}
});
test('cancel during lazy load does not reopen the full player',async()=>{
  const f=fixture();try{
    f.facade.open(ctx());f.facade.close();f.deliver();await flush();
    assert.equal(f.w.floatingBacking.isReady,true);assert.equal(f.w.floatingBacking.getState().visible,false);assert.equal(f.w.floatingBacking.getState().playing,false);
    assert.equal(f.w.floatingBacking.getState().contextId,'one');assert.equal(f.d.getElementById('backing-loader-status').hidden,true);
  }finally{f.close();}
});
test('repeated opens share one module and latest requested lesson wins',async()=>{
  const f=fixture();try{
    f.facade.open(ctx());f.facade.open(ctx('two'));f.facade.open(ctx('two'));
    assert.equal(f.scripts.length,1);assert.equal(f.d.querySelectorAll('link[data-floating-backing]').length,1);
    f.deliver();await flush();assert.equal(f.w.floatingBacking.getState().contextId,'two');assert.equal(f.w.floatingBacking.getState().visible,true);
    assert.equal(f.d.getElementById('fb-title').textContent,'Lesson two');
  }finally{f.close();}
});
test('navigation during load cancels visibility and keeps only next context',async()=>{
  const f=fixture();try{
    f.facade.open(ctx());f.facade.setContext(ctx('two'));f.deliver();await flush();
    assert.equal(f.w.floatingBacking.getState().visible,false);assert.equal(f.w.floatingBacking.getState().contextId,'two');
  }finally{f.close();}
});
test('failed module is retryable without duplicate style sheets',async()=>{
  const f=fixture();try{
    f.facade.open(ctx());f.fail();await flush();assert.match(f.d.getElementById('backing-loader-status').textContent,/重试/);
    f.facade.open(ctx('two'));assert.equal(f.scripts.length,2);f.deliver();await flush();
    assert.equal(f.w.floatingBacking.isReady,true);assert.equal(f.w.floatingBacking.getState().contextId,'two');assert.equal(f.d.querySelectorAll('link[data-floating-backing]').length,1);
  }finally{f.close();}
});
(async()=>{let failed=0;for(const [name,fn]of tests){try{await fn();console.log('PASS floating loader: '+name);}catch(error){failed++;console.error('FAIL floating loader: '+name+'\n'+error.stack);}}if(failed)process.exitCode=1;else console.log(`PASS ${tests.length} real lazy-loader scenarios`);})();

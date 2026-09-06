// Publish one reviewed commit through GitHub's Git data API when git transport
// is unavailable. gh owns authentication; never export credentials into files.
const {execFileSync,spawn}=require('node:child_process');
const path=require('node:path');
const cwd=path.resolve(__dirname,'..');
const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8',maxBuffer:30*1024*1024});
function api(endpoint,body,method){return new Promise((resolve,reject)=>{
 const args=['api','repos/rexrockya/tuner/'+endpoint];
 if(body)args.push('--method',method||'POST','--input','-');
 const proc=spawn('gh',args,{cwd,windowsHide:true});let out='',err='';
 proc.stdout.on('data',x=>out+=x);proc.stderr.on('data',x=>err+=x);
 proc.on('error',reject);proc.on('close',code=>{
  if(code)return reject(Error(endpoint+': '+err));
  try{resolve(JSON.parse(out));}catch(error){reject(error);}
 });
 proc.stdin.end(body?JSON.stringify(body):undefined);
});}
(async()=>{
 if(git('branch','--show-current').trim()!=='main')throw Error('Only the reviewed main branch may publish');
 if(git('status','--porcelain','--untracked-files=no').trim())throw Error('Commit tracked changes before publishing');
 const head=git('rev-parse','HEAD').trim(),parent=git('rev-parse','HEAD^').trim();
 const remote=(await api('git/ref/heads/main')).object.sha;
 if(remote===head){console.log('Already published '+head);return;}
 if(remote!==parent)throw Error('Remote is not the parent commit; refusing overwrite');
 const changes=git('diff-tree','--no-commit-id','--name-status','--no-renames','-r',head).trim().split('\n').map(line=>line.split('\t'));
 const allowed=/^(docs\/|tests\/|scripts\/|notes\/|website\/tests\/|(?:PRD|HANDOFF|README)\.md$|package\.json$)/;
 for(const [status,file] of changes)if(!/^[AMD]$/.test(status)||!allowed.test(file))throw Error('Unexpected publication path/status: '+file);
 const entries=[];
 for(const [status,file] of changes){
  if(status==='D'){entries.push({path:file,mode:'100644',type:'blob',sha:null});continue;}
  const content=execFileSync('git',['show',`${head}:${file}`],{cwd,maxBuffer:30*1024*1024});
  const blob=await api('git/blobs',{content:content.toString('base64'),encoding:'base64'});
  if(blob.sha!==git('rev-parse',`${head}:${file}`).trim())throw Error('Blob mismatch: '+file);
  entries.push({path:file,mode:'100644',type:'blob',sha:blob.sha});
 }
 const tree=await api('git/trees',{base_tree:git('rev-parse','HEAD^1^{tree}').trim(),tree:entries});
 if(tree.sha!==git('rev-parse','HEAD^{tree}').trim())throw Error('Tree mismatch');
 const raw=git('cat-file','commit',head);
 const person=kind=>{const m=raw.split('\n').find(s=>s.startsWith(kind+' ')).match(/^[^ ]+ (.+) <([^>]+)> (\d+) ([+-]\d{4})$/);return{name:m[1],email:m[2],date:git('show','-s',`--format=%${kind==='author'?'a':'c'}I`,head).trim()};};
 const commit=await api('git/commits',{message:raw.slice(raw.indexOf('\n\n')+2),tree:tree.sha,parents:[parent],author:person('author'),committer:person('committer')});
 if(commit.sha!==head)throw Error('Commit mismatch');
 if((await api('git/ref/heads/main')).object.sha!==parent)throw Error('Remote changed during upload');
 await api('git/refs/heads/main',{sha:head,force:false},'PATCH');
 console.log(`Published exact commit ${head}; ${entries.length} reviewed paths`);
})().catch(error=>{console.error(error.message);process.exitCode=1;});

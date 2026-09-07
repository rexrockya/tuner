const {spawnSync}=require('node:child_process');
const path=require('node:path');
for(const file of ['site.cjs','modules.cjs','jam.cjs','loader.cjs','boot.cjs','tuner-benchmark.cjs']){const result=spawnSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit',env:process.env});if(result.status!==0){process.exitCode=result.status||1;break;}}

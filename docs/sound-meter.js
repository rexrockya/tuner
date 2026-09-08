(() => {
  const $=id=>document.getElementById('sound-'+id), db=p=>p>0?10*Math.log10(p):-Infinity,centers=[31.5,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,12500,16000];
  let context,stream,source,processor,wake,starting=false,run=0,last=null,offset=null,recent=[],rows=[],lastRow=-1,settings={},device='',started='',processing='',generation=0,watchdog=null,lastReceived=0,mode='mic',listing=false,view='programme',accumulationPaused=false,trend=[];
  const mobile=()=>navigator.userAgentData?.mobile||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  function sourceUI(){
    const output=$('source').querySelector('[value="output"]'),supported=!!navigator.mediaDevices?.getDisplayMedia;
    output.textContent=(mobile()?'手机输出':'电脑输出 / 标签页声音')+(supported?'':'（浏览器不支持）');
    output.disabled=!supported;
    $('device-label').hidden=mode!=='mic';$('devices').hidden=mode!=='mic';
    $('calibration-panel').hidden=mode!=='mic'||view!=='acoustic';
    $('source-hint').textContent=mode==='output'
      ?'开始后，在共享选择器中选择标签页或屏幕，并勾选共享音频。可选声音取决于系统与浏览器；这里测量 LUFS 与数字电平，不能换算扬声器的 dB SPL。切换音源会清空结果。'
      :'麦克风测量现场声音，校准后可估算 dB SPL。授权后可选输入设备。'+(!supported?'此浏览器不能采集设备输出，手机其他 App 的声音无法直接读取。':'')+' 切换音源会清空结果。';
  }
  const weight=()=>Number($('weight').value), response=()=>$('response').value;
  const fmt=p=>{const value=db(p)+(offset??0);return Number.isFinite(value)?value.toFixed(1):'−∞';};
  function controls(){const active=!!processor;$('start').textContent=starting?'正在连接…':active?'停止测量':'开始测量';$('start').disabled=starting||listing;$('reset').disabled=!last||starting;$('export').disabled=!last;$('calibrate').disabled=mode!=='mic'||!active||!last||last.seconds<5;$('uncalibrate').disabled=offset===null;$('pause').disabled=!active||starting;$('pause').hidden=view!=='programme';$('pause').textContent=accumulationPaused?'继续累计':'暂停累计';$('source').disabled=starting||listing;$('device').disabled=active||starting||listing;$('devices').disabled=active||starting||listing;}
  function render(){
    const k=weight(),r=response(),letter=['A','C','Z'][k];
    $('current-label').textContent='实时 · '+letter+' / '+(r==='fast'?'Fast':'Slow');
    $('unit').textContent=offset===null?(mode==='output'?'dBFS · 输出数字电平':'dBFS · 未校准'):'dB SPL ('+letter+') · 校准估算';
    $('cal-state').textContent=offset===null?(mode==='output'?'输出电平不能换算声压':'校准后显示估算声压级'):'本次校准偏移 '+offset.toFixed(1)+' dB';
    $('spectrum-unit').textContent=offset===null?'Z · dBFS / 频带':'Z · 估算 dB SPL / 频带';
    if(last){$('level').textContent=fmt(last[r][k]);$('leq').textContent=fmt(last.leq[k]);$('max').textContent=fmt(last[r==='fast'?'maxFast':'maxSlow'][k]);$('sel').textContent=fmt(last.sel[k]);$('peak').textContent=fmt(last.peak);const s=Math.floor(last.seconds);$('time').textContent=[Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(v=>String(v).padStart(2,'0')).join(':');}
    else {for(const id of ['level','leq','max','sel','peak'])$(id).textContent='—';$('time').textContent='00:00:00';}
    const programme=view==='programme',p=last?.programme,num=v=>Number.isFinite(v)?v.toFixed(1):'—';
    $('programme-stats').hidden=!programme;$('acoustic-stats').hidden=programme;$('acoustic-options').hidden=programme;$('trend-panel').hidden=!programme;$('maximums').hidden=!programme;
    $('programme-mode').setAttribute('aria-pressed',String(programme));$('acoustic-mode').setAttribute('aria-pressed',String(!programme));
    $('calibration-panel').hidden=mode!=='mic'||programme;
    for(const [id,key] of [['integrated','integrated'],['short','shortTerm'],['lra','lra'],['tp','truePeak']])$(id).textContent=num(p?.[key]);
    $('lra-hint').textContent=p?.integratedSeconds>=60?'LU · 10–95 百分位':'LU · 建议测量至少 60 秒';
    const relative=Number.isFinite(p?.integrated)?p.integrated+23:null;
    $('maximums').textContent='最大 M '+num(p?.maxM)+' · 最大 S '+num(p?.maxS)+' LUFS · 相对 −23 LUFS '+(relative===null?'—':(relative>0?'+':'')+relative.toFixed(1)+' LU');
    $('time-label').textContent=programme?'累计计入时间':'有效测量时间';
    if(programme){
      $('current-label').textContent='瞬时响度 · M / 400 ms';$('level').textContent=num(p?.momentary);$('unit').textContent='LUFS · K 计权';
      $('cal-state').textContent=accumulationPaused?'累计已暂停 · 实时读数继续':p?.channels===2?'立体声 · BS.1770 / R128':'单声道 · BS.1770 / R128';
      const seconds=Math.floor(p?.integratedSeconds||0);$('time').textContent=[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(v=>String(v).padStart(2,'0')).join(':');
    }
    controls();draw();
  }
  function surface(id,defaultHeight){
    const canvas=$(id),g=canvas.getContext('2d');if(!g)return null;
    const w=canvas.clientWidth||700,h=canvas.clientHeight||defaultHeight,dpr=Math.min(window.devicePixelRatio||1,2),cw=Math.round(w*dpr),ch=Math.round(h*dpr);
    if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
    g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);g.font='11px sans-serif';g.textAlign='left';return{g,w,h};
  }
  function draw(){
    if($('page').style.display==='none')return;
    const surfaceData=surface('spectrum',260);if(!surfaceData)return;
    const {g,w,h}=surfaceData,left=38,top=14,bottom=h-32,right=w-12,max=offset===null?0:140,min=max-100;
    g.fillStyle='#8c9b86';g.strokeStyle='#293323';g.lineWidth=1;
    for(let value=min;value<=max;value+=20){const y=bottom-(value-min)/100*(bottom-top);g.fillText(String(value),0,y+4);g.beginPath();g.moveTo(left,y);g.lineTo(right,y);g.stroke();}
    const x=f=>left+Math.log(f/centers[0])/Math.log(centers.at(-1)/centers[0])*(right-left),y=v=>bottom-Math.max(0,Math.min(1,(v+(offset??0)-min)/100))*(bottom-top);
    g.strokeStyle='#bdf45d';g.lineWidth=2;g.lineJoin='round';g.beginPath();let open=false;
    (last?.bands||[]).forEach((v,i)=>{if(v===null||!Number.isFinite(v)){open=false;return;}if(open)g.lineTo(x(centers[i]),y(v));else g.moveTo(x(centers[i]),y(v));open=true;});g.stroke();
    g.fillStyle='#8c9b86';g.textAlign='center';[31.5,125,500,2000,8000,16000].forEach(f=>g.fillText(f>=1000?f/1000+'k':String(f),x(f),h-10));
    if(view==='programme')drawTrend();
  }
  function drawTrend(){
    const data=surface('trend',150);if(!data)return;const {g,w,h}=data,left=38,right=w-12,top=12,bottom=h-24,now=last?.seconds||0,span=120;
    const x=t=>right-(now-t)/span*(right-left),y=v=>bottom-Math.max(0,Math.min(1,(v+60)/60))*(bottom-top);
    g.lineWidth=1;g.textAlign='left';g.fillStyle='#8c9b86';
    for(const v of [-60,-40,-23,0]){g.strokeStyle=v===-23?'#586148':'#293323';g.beginPath();g.moveTo(left,y(v));g.lineTo(right,y(v));g.stroke();g.fillText(String(v),0,y(v)+4);}
    for(const [key,color] of [['momentary','#bdf45d'],['shortTerm','#85c7cc']]){g.strokeStyle=color;g.lineWidth=1.6;g.beginPath();let previous=null;for(const point of trend){const value=point[key];if(!Number.isFinite(value)){previous=null;continue;}if(previous&&point.seconds-previous.seconds<1)g.lineTo(x(point.seconds),y(value));else g.moveTo(x(point.seconds),y(value));previous=point;}g.stroke();}
    g.fillStyle='#8c9b86';g.fillText('−120 s',left,h-5);g.textAlign='right';g.fillText('现在',right,h-5);
  }
  function clear(){last=null;recent=[];rows=[];lastRow=-1;trend=[];accumulationPaused=false;$('band-info').textContent='开始后显示频率分布。低频分辨率有限，空频带不绘制。';render();}
  function receive(data){
    if(data.generation!==generation)return;lastReceived=Date.now();last=data;if(data.programme&&trend.at(-1)?.seconds!==data.programme.seconds){trend.push(data.programme);while(trend.length&&data.seconds-trend[0].seconds>120)trend.shift();}recent.push({seconds:data.seconds,powers:data.powers});while(recent.length&&data.seconds-recent[0].seconds>5)recent.shift();
    if(Math.floor(data.seconds)!==lastRow){lastRow=Math.floor(data.seconds);rows.push(data);}
    const clip=data.clipped?'已检测到 '+data.clipped+' 个接近满刻度的采样，读数可能失真。':'';
    $('warning').textContent=[clip,processing].filter(Boolean).join(' ')||'输入处理中 · 未检测到数字削波；这不排除麦克风自身失真。';
    const peak=data.bands.reduce((a,v,i)=>v!==null&&Number.isFinite(v)&&(a<0||v>data.bands[a])?i:a,-1);
    $('band-info').textContent=peak<0?'未检测到有效频带能量。':'最强频带 '+centers[peak]+' Hz · '+(data.bands[peak]+(offset??0)).toFixed(1)+' '+(offset===null?'dBFS':'dB SPL（估算）')+'。频率分辨率 '+(context.sampleRate/4096).toFixed(1)+' Hz，低频仅作趋势参考。';
    render();
  }
  function stop(message='已停止 · 结果保留'){
    run++;starting=false;listing=false;clearInterval(watchdog);watchdog=null;
    if(processor){processor.port.onmessage=null;processor.disconnect();processor=null;}
    source?.disconnect();source=null;stream?.getTracks().forEach(t=>t.stop());stream=null;
    if(context){const old=context;context=null;old.onstatechange=null;old.close().catch(()=>{});}
    wake?.release().catch(()=>{});wake=null;$('status').textContent=message;controls();
  }
  async function refreshDevices(){
    if(!navigator.mediaDevices?.getUserMedia)return;
    listing=true;controls();const token=++run;let access;
    try{
      access=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      if(token!==run)return;
      const devices=await navigator.mediaDevices.enumerateDevices();
      if(token!==run)return;
      const selected=$('device').value;$('device').replaceChildren(new Option('默认麦克风',''));
      devices.filter(d=>d.kind==='audioinput').forEach((d,i)=>$('device').add(new Option(d.label||'麦克风 '+(i+1),d.deviceId)));
      if([...$('device').options].some(o=>o.value===selected))$('device').value=selected;
      $('status').textContent='麦克风列表已更新';
    }catch(error){if(token===run)$('status').textContent='无法获取输入设备，请允许麦克风权限后重试。';}
    finally{access?.getTracks().forEach(t=>t.stop());if(token===run){listing=false;controls();}}
  }
  async function start(){
    if(processor){stop();return;}
    if(starting||listing)return;
    const devices=navigator.mediaDevices;
    if(mode==='output'&&!devices?.getDisplayMedia){$('status').textContent='当前浏览器不支持采集设备输出，请改用麦克风输入。';return;}
    if(mode==='mic'&&!devices?.getUserMedia){$('status').textContent='此浏览器无法使用麦克风，请在 HTTPS 页面中用 Safari 或 Chrome 打开。';return;}
    starting=true;controls();const token=++run;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;
      context=new Audio();
      if(!context.audioWorklet)throw new Error('当前浏览器不支持连续音频分析，请升级 Safari 或 Chrome。');
      // Invoke screen capture directly in the click gesture, before any await.
      const audio={channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false};
      if($('device').value)audio.deviceId={exact:$('device').value};
      const controller=mode==='output'&&window.CaptureController?new window.CaptureController():null;
      if(controller?.setFocusBehavior)controller.setFocusBehavior('no-focus-change');
      const acquisition=mode==='output'
        ?devices.getDisplayMedia({video:true,audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},systemAudio:'include',selfBrowserSurface:'exclude',...(controller?{controller}:{})})
        :devices.getUserMedia({audio,video:false});
      const resume=context.resume();
      // Attach rejection handlers to both promises immediately; always release a late stream.
      const result=await Promise.allSettled([acquisition,resume]);
      const media=result[0].status==='fulfilled'?result[0].value:null;
      if(token!==run){media?.getTracks().forEach(t=>t.stop());return;}
      stream=media;
      if(result[0].status==='rejected')throw result[0].reason;
      if(result[1].status==='rejected')throw result[1].reason;
      const track=media.getAudioTracks()[0];
      if(!track)throw new Error('没有收到共享音频。请重新选择支持音频的标签页或屏幕，并勾选共享音频；部分系统不支持。');
      settings=track.getSettings();device=track.label||(mode==='output'?'共享音频':'默认麦克风');
      await context.audioWorklet.addModule(new URL('sound-worklet.js?v=20260908-3',document.baseURI));if(token!==run)return;
      if(track.muted||track.readyState!=='live')throw new Error('音源当前不可用，请重新选择后重试。');
      source=context.createMediaStreamSource(media);processor=new AudioWorkletNode(context,'sound-meter',{channelCount:mode==='output'?2:1,channelCountMode:mode==='output'?'clamped-max':'explicit'});
      offset=null;generation=0;clear();started=new Date().toISOString();
      const flags=['autoGainControl','noiseSuppression','echoCancellation'];
      processing=mode==='output'?'正在分析共享音轨 · LUFS / 数字电平；不读取画面、不录制、不上传。'
        :flags.some(k=>settings[k]===true)?'设备仍启用了增益或语音处理，声级仅供参考。':flags.some(k=>settings[k]===undefined)?'浏览器未报告完整增益处理状态，声级仅供参考。':'已请求并确认关闭浏览器增益、降噪与回声处理。';
      processor.port.onmessage=e=>receive(e.data);source.connect(processor);processor.connect(context.destination);
      media.getTracks().forEach(t=>t.onended=()=>stop('音源已断开 · 结果保留'));
      track.onmute=()=>stop('音源被中断 · 结果保留');
      context.onstatechange=()=>{if(context&&context.state!=='running')stop('音频已暂停 · 结果保留');};
      lastReceived=Date.now();watchdog=setInterval(()=>{if(Date.now()-lastReceived>3000)stop('采集已中断 · 结果保留，请重新开始');},1000);
      starting=false;$('status').textContent='测量中 · '+device;$('cal-message').textContent='未校准时仅显示数字电平 dBFS，不代表环境 dB SPL。';render();
      if(navigator.wakeLock)try{const lock=await navigator.wakeLock.request('screen');if(token===run)wake=lock;else await lock.release();}catch{/* foreground measurement still works */}
    }catch(error){if(token!==run)return;stop();$('status').textContent=error.name==='NotAllowedError'?'音源权限被拒绝或共享已取消，请允许权限后重试。':error.name==='NotFoundError'?'没有找到可用音源。':error.name==='NotReadableError'?'音源被占用或不可读取，请重新选择。':error.message||'无法启动音源，请重试。';}
  }
  $('devices').onclick=refreshDevices;
  $('source').onchange=()=>{stop('音源已切换 · 点击开始测量');mode=$('source').value;offset=null;clear();sourceUI();};
  $('device').onchange=()=>{offset=null;clear();};
  $('start').onclick=start;
  $('programme-mode').onclick=()=>{view='programme';render();};$('acoustic-mode').onclick=()=>{view='acoustic';render();};
  $('pause').onclick=()=>{if(!processor)return;accumulationPaused=!accumulationPaused;processor.port.postMessage({type:'pause',value:accumulationPaused});render();};
  $('reset').onclick=()=>{generation++;processor?.port.postMessage({type:'reset',generation});started=new Date().toISOString();clear();};
  $('weight').onchange=render;$('response').onchange=render;
  $('calibrate').onclick=()=>{
    const raw=$('reference').value,reference=Number(raw),k=weight();
    if(!raw||!Number.isFinite(reference)||reference<20||reference>150){$('cal-message').textContent='请输入 20–150 dB 的参考读数。';return;}
    if(mode!=='mic'||!processor||!last||recent.length<2||recent.at(-1).seconds-recent[0].seconds<4.7){$('cal-message').textContent='请先持续采集至少 5 秒稳定声音。';return;}
    const levels=recent.map(x=>db(x.powers[k]));
    if(last.clipped||levels.some(x=>!Number.isFinite(x)||x< -90)||Math.max(...levels)-Math.min(...levels)>3){$('cal-message').textContent='声音不稳定、无有效信号或本次存在削波；请调整声源后清零，重新采集 5 秒。';return;}
    offset=reference-db(recent.reduce((s,x)=>s+x.powers[k],0)/recent.length);
    $('cal-message').textContent='校准完成 · '+['A','C','Z'][k]+' 参考 '+reference.toFixed(1)+' dB。偏移应用到本次声级与声级累计结果，仍为估算；LUFS / dBTP 不受影响。';render();
  };
  $('uncalibrate').onclick=()=>{offset=null;$('cal-message').textContent='已移除校准，读数恢复为 dBFS。';render();};
  $('export').onclick=()=>{
    if(!last)return;
    const records=rows.at(-1)===last?rows:[...rows,last];
    const csv=[['session_start',started],['source_type',mode],['source',device],['calibration_offset_db',offset??'uncalibrated'],['units',offset===null?'dBFS':'estimated dB SPL'],['processing',processing],['loudness_method','ITU-R BS.1770-5 / EBU R128 mono-stereo; M 400 ms, S 3 s, I -70 LUFS and -10 LU gates; LRA Tech3342; TP Annex2 4x'],['method','A/C spectral approximation; sampled Z peak; SEL relative to 1 second; foreground audio samples only'],['seconds','integrated_seconds','paused','channels','M_LUFS','S_LUFS','I_LUFS','LRA_LU','TP_dBTP','max_M_LUFS','max_S_LUFS',...['A','C','Z'].flatMap(k=>[k+'_fast',k+'_slow',k+'_leq',k+'_sel',k+'_max_fast',k+'_max_slow']),'Z_sample_peak','clipped_samples',...centers.map(f=>'Z_band_'+f+'_Hz')],...records.map(d=>[d.seconds.toFixed(3),d.programme?.integratedSeconds??0,d.programme?.paused??false,d.programme?.channels??'',...['momentary','shortTerm','integrated','lra','truePeak','maxM','maxS'].map(k=>Number.isFinite(d.programme?.[k])?d.programme[k].toFixed(3):''),...[0,1,2].flatMap(k=>[d.fast[k],d.slow[k],d.leq[k],d.sel[k],d.maxFast[k],d.maxSlow[k]].map(fmt)),fmt(d.peak),d.clipped,...d.bands.map(v=>v===null?'unresolved':Number.isFinite(v)?(v+(offset??0)).toFixed(1):'-Infinity')])].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='tuner-sound-'+started.replaceAll(':','-')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  window.soundMeter={onPage(page){const show=page==='sound';$('page').style.display=show?'grid':'none';if(!show&&(processor||starting||listing))stop('已离开响度页 · 结果保留');if(show)render();}};
  sourceUI();render();
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&(processor||starting))stop('页面已进入后台 · 结果保留');});
  window.addEventListener('pagehide',()=>stop());window.addEventListener('resize',draw);
})();

const NOTES=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"];
    const ui={main:document.querySelector("main"),status:document.querySelector("#status"),note:document.querySelector("#note"),octave:document.querySelector("#octave"),frequency:document.querySelector("#frequency"),needle:document.querySelector("#needle"),state:document.querySelector("#tune-state"),toggle:document.querySelector("#toggle"),error:document.querySelector("#error")};
    const ACCOUNT_API="https://xianyin-tuner.cobainrexzhang.chatgpt.site",accountDialog=document.querySelector("#account-dialog"),accountOpen=document.querySelector("#account-open"),accountAuth=document.querySelector("#account-auth"),accountUser=document.querySelector("#account-user"),accountForm=document.querySelector("#account-form"),accountMessage=document.querySelector("#account-message"),displayNameField=document.querySelector("#display-name-field");let accountMode="login";
    function setAccountMode(mode){accountMode=mode;const registering=mode==="register";document.querySelectorAll("[data-auth-mode]").forEach(button=>{const active=button.dataset.authMode===mode;button.classList.toggle("active",active);button.setAttribute("aria-selected",String(active))});displayNameField.hidden=!registering;document.querySelector("#account-title").textContent=registering?"创建账号":"登录弦音";document.querySelector("#account-submit").textContent=registering?"创建并登录":"登录";accountForm.elements.password.autocomplete=registering?"new-password":"current-password";accountMessage.textContent="";accountMessage.classList.remove("error")}
    function renderAccount(user){accountAuth.hidden=Boolean(user);accountUser.hidden=!user;accountOpen.classList.toggle("signed-in",Boolean(user));accountOpen.textContent=user?user.username:"登录 / 注册";document.querySelector("#account-title").textContent=user?"账号信息":accountMode==="register"?"创建账号":"登录弦音";window.dispatchEvent(new CustomEvent("tuner:account-change",{detail:{user:user||null}}));if(!user)return;document.querySelector("#account-avatar").textContent=Array.from(user.displayName)[0]?.toUpperCase()||"弦";document.querySelector("#account-display-name").textContent=user.displayName;document.querySelector("#account-username").textContent=`@${user.username}`}
    async function accountRequest(path,options={}){if(!ACCOUNT_API)throw new Error("线上账号服务尚未启用");return fetch(`${ACCOUNT_API}${path}`,{...options,credentials:"include",headers:{"content-type":"application/json",...(options.headers||{})}})}
    window.accountCloud={async getLickProgress(){const response=await accountRequest("/api/progress/licks"),data=await response.json();if(!response.ok)throw new Error(data.error||"读取进度失败");return data.items||[]},async saveLickProgress(item){const response=await accountRequest("/api/progress/licks",{method:"PUT",body:JSON.stringify(item)}),data=await response.json();if(!response.ok)throw new Error(data.error||"保存进度失败");return data.item}};
    async function refreshAccount(){if(!ACCOUNT_API){renderAccount(null);return}try{const response=await accountRequest("/api/auth/me");if(!response.ok){renderAccount(null);return}const data=await response.json();renderAccount(data.user)}catch(error){renderAccount(null)}}
    accountOpen.onclick=()=>{accountDialog.showModal();if(!ACCOUNT_API){accountMessage.textContent="线上账号服务尚未启用";accountMessage.classList.add("error")}};document.querySelector("#account-close").onclick=()=>accountDialog.close();accountDialog.addEventListener("click",event=>{if(event.target===accountDialog)accountDialog.close()});document.querySelectorAll("[data-auth-mode]").forEach(button=>button.onclick=()=>setAccountMode(button.dataset.authMode));
    accountForm.onsubmit=async event=>{event.preventDefault();accountMessage.textContent=accountMode==="register"?"正在创建账号…":"正在登录…";accountMessage.classList.remove("error");const form=new FormData(accountForm),payload={username:form.get("username"),password:form.get("password")};if(accountMode==="register")payload.displayName=form.get("displayName");try{const response=await accountRequest(`/api/auth/${accountMode}`,{method:"POST",body:JSON.stringify(payload)}),data=await response.json();if(!response.ok)throw new Error(data.error||"操作失败");renderAccount(data.user);accountForm.reset()}catch(error){accountMessage.textContent=error.message||"账号服务暂时不可用";accountMessage.classList.add("error")}};
    document.querySelector("#account-logout").onclick=async()=>{try{await accountRequest("/api/auth/logout",{method:"POST",body:"{}"})}catch(error){}renderAccount(null);setAccountMode("login")};setAccountMode("login");refreshAccount();
    let running=false,stop=null,micGeneration=0;
    const tunerPanel=window.tunerUI?.mount(ui,{stopInput:()=>stop?.()});
    function detectPitch(buffer,sampleRate){return window.tunerPitch.detect(buffer,sampleRate)}
    function render(pitch,now=performance.now()){if(tunerPanel){tunerPanel.render(pitch,now);return}if(pitch<0)return;const midi=Math.round(69+12*Math.log2(pitch/440)),note=NOTES[(midi%12+12)%12],cents=1200*Math.log2(pitch/(440*2**((midi-69)/12))),tuned=Math.abs(cents)<5;ui.note.textContent=note;ui.octave.textContent=Math.floor(midi/12)-1;ui.frequency.textContent=`${pitch.toFixed(1)} Hz`;ui.needle.style.left=`${50+Math.max(-50,Math.min(50,cents))}%`;ui.state.textContent=tuned?"音准":cents<0?"偏低":"偏高";ui.main.classList.toggle("tuned",tuned)}
    ui.toggle.addEventListener("click",async()=>{
      if(stop){stop();return}
      tunerPanel?.beforeInput();
      const generation=++micGeneration;let stream,context,frame,lastSample=-Infinity;
      const cleanup=()=>{cancelAnimationFrame(frame);stream?.getTracks().forEach(track=>track.stop());if(context&&context.state!=="closed")Promise.resolve(context.close()).catch(()=>{})};
      stop=()=>{micGeneration++;running=false;cleanup();stop=null;ui.status.textContent="准备就绪";ui.toggle.textContent="开启麦克风";ui.note.textContent="—";ui.octave.textContent="";ui.frequency.textContent="— Hz";ui.needle.style.left="50%";ui.state.textContent="弹奏一个音";ui.main.classList.remove("tuned");tunerPanel?.inputState("idle")};
      ui.status.textContent="等待麦克风授权";ui.toggle.textContent="取消";ui.error.style.display="none";tunerPanel?.inputState("pending");
      try{
        stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
        if(generation!==micGeneration){cleanup();return}
        const Context=window.AudioContext||window.webkitAudioContext;
        context=new Context({latencyHint:"interactive"});
        const analyser=context.createAnalyser();analyser.fftSize=4096;context.createMediaStreamSource(stream).connect(analyser);
        await context.resume?.();
        if(generation!==micGeneration){cleanup();return}
        const samples=new Float32Array(analyser.fftSize);running=true;ui.status.textContent="正在聆听";ui.toggle.textContent="停止";tunerPanel?.inputState("running");
        stream.getTracks().forEach(track=>{track.onended=()=>{if(generation===micGeneration)stop?.()};track.onmute=()=>{if(generation===micGeneration)stop?.()}});
        const update=(now=performance.now())=>{if(generation!==micGeneration)return;if(now-lastSample>=50){lastSample=now;analyser.getFloatTimeDomainData(samples);render(detectPitch(samples,context.sampleRate),now)}frame=requestAnimationFrame(update)};update();
      }catch(error){cleanup();if(generation!==micGeneration)return;stop?.();ui.error.textContent="无法使用麦克风，请检查浏览器权限。";ui.error.style.display="block"}
    });
    const roomParams=new URLSearchParams(location.search),rawRoomMode=roomParams.get("mode"),pageMode=rawRoomMode==="parent"?"host":rawRoomMode==="child"?"member":rawRoomMode,isRoomHost=pageMode==="host",isRoomMember=pageMode==="member";let roomCode=roomParams.get("room")||"";if(isRoomHost&&!/^\d{6}$/.test(roomCode)){roomCode=window.siteStorage.getItem("tuner-room-code-v1")||"";if(!/^\d{6}$/.test(roomCode)){roomCode=String(Math.floor(100000+Math.random()*900000));window.siteStorage.setItem("tuner-room-code-v1",roomCode)}}const roomTopic=/^\d{6}$/.test(roomCode)?`xianyin-${roomCode}-room-metronome-v1`:"";let metroBpm=window.metronome.getBpm(),metroRunning=false;const metroPage=document.querySelector("#metro-page"),metroValue=document.querySelector("#metro-bpm"),metroDot=document.querySelector("#metro-dot"),metroStart=document.querySelector("#metro-start");metroValue.textContent=metroBpm;
    async function pushRoomState(){if(!isRoomHost||!roomTopic)return;const status=document.querySelector("#remote-status");status.textContent="正在同步房间…";try{const r=await fetch("https://ntfy.sh/",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({topic:roomTopic,message:JSON.stringify({bpm:metroBpm,running:metroRunning,timeSignature:window.metronome.getTimeSignature(),at:Date.now()}),title:"metronome"})});if(!r.ok)throw 0;status.textContent=`房间已同步：${metroBpm} BPM · ${metroRunning?"开始":"停止"}`}catch(e){status.textContent="房间同步失败 · 请检查网络"}}
    function setMetro(n,remote=false){window.metronome.setBpm(n)}
    function setMetroRunning(next,countIn=true,remote=false){next?window.metronome.start(countIn):window.metronome.stop()}
    window.addEventListener("tuner:metro-change",event=>{metroBpm=event.detail.bpm;metroRunning=event.detail.running;pushRoomState()});
    document.querySelector("#metro-minus").onclick=()=>setMetro(metroBpm-5);document.querySelector("#metro-plus").onclick=()=>setMetro(metroBpm+5);metroStart.onclick=()=>setMetroRunning(!metroRunning);
    document.querySelectorAll(".tempo-presets button").forEach(button=>button.onclick=()=>setMetro(Number(button.dataset.bpm)));

        const JAM_KEY="tuner-jam-sections-v3";
        const JAM_ROLE={
          harmony:{label:"和弦",short:"CH"},
          bass:{label:"低频",short:"BS"},
          lead:{label:"主旋律",short:"LD"},
          texture:{label:"点缀",short:"FX"}
        };
        const JAM_PACKS={
          pop:{
            label:"流行",name:"Pop Glow",accent:"#bdf45d",
            defaults:{harmony:"dreamKeys",bass:"warmBass",lead:"glassPluck",texture:"airPad"},
            patches:[
              {id:"dreamKeys",label:"Dream Keys"},{id:"glassPluck",label:"Glass Pluck"},
              {id:"warmBass",label:"Warm Bass"},{id:"airPad",label:"Air Pad"}
            ]
          },
          electronic:{
            label:"电音",name:"Neon Pulse",accent:"#63d9ff",
            defaults:{harmony:"airPad",bass:"deepSub",lead:"supersaw",texture:"neonPluck"},
            patches:[
              {id:"airPad",label:"Air Pad"},{id:"deepSub",label:"Deep Sub"},
              {id:"supersaw",label:"Super Saw"},{id:"neonPluck",label:"Neon Pluck"}
            ]
          }
        };
        const JAM_SECTIONS=[
          {id:"intro",name:"Intro",start:0,end:2},
          {id:"verse",name:"Verse",start:2,end:6},
          {id:"pre",name:"Pre",start:6,end:8},
          {id:"chorus-a",name:"Chorus",start:8,end:12},
          {id:"bridge",name:"Bridge",start:12,end:14},
          {id:"chorus-b",name:"Chorus",start:14,end:18},
          {id:"outro",name:"Outro",start:18,end:20}
        ];
        const jamSectionBars=section=>section.end-section.start;
        const jamSeat=(role,required,status="open",musician=null,patch=null)=>({role,required,status,musician,patch,takeSections:null});
        const jamSeed=()=>[
          {
            id:"night-lamp",title:"凌晨四点的路灯",pack:"pop",style:"流行 / City Pop",bpm:104,key:"C major",
            accent:"#bdf45d",stage:"building",branchable:true,parent:null,branchCount:0,
            seats:[
              {...jamSeat("harmony",true,"done","Mori","dreamKeys")},
              {...jamSeat("bass",true,"done","Lin","warmBass")},
              jamSeat("lead",true),jamSeat("texture",false)
            ],producer:null,mix:{harmony:72,bass:76,lead:70,texture:58}
          },
          {
            id:"neon-weightless",title:"霓虹失重",pack:"electronic",style:"电音 / Electro Pop",bpm:124,key:"F minor",
            accent:"#63d9ff",stage:"mixReady",branchable:true,parent:null,branchCount:1,
            seats:[
              {...jamSeat("harmony",true,"done","Aki","airPad")},
              {...jamSeat("bass",true,"done","June","deepSub")},
              {...jamSeat("lead",true,"done","Yao","supersaw")},
              {...jamSeat("texture",false,"done","Nami","neonPluck")}
            ],producer:null,mix:{harmony:64,bass:78,lead:67,texture:52}
          },
          {
            id:"after-rain",title:"雨停之前",pack:"pop",style:"流行 / Synth Pop",bpm:110,key:"E minor",
            accent:"#ff8fa3",stage:"complete",branchable:true,parent:null,branchCount:2,
            seats:[
              {...jamSeat("harmony",true,"done","Hana","dreamKeys")},
              {...jamSeat("bass",true,"done","K","warmBass")},
              {...jamSeat("lead",true,"done","Sora","glassPluck")},
              {...jamSeat("texture",false,"done","Nico","airPad")}
            ],producer:"Aster",mix:{harmony:70,bass:78,lead:74,texture:56}
          }
        ];
        let jamRooms;
        try{const saved=JSON.parse(window.siteStorage.getItem(JAM_KEY));jamRooms=Array.isArray(saved)&&saved.every(room=>room&&typeof room.id==="string"&&Array.isArray(room.seats)&&room.seats.every(seat=>seat&&JAM_ROLE[seat.role])&&Number.isFinite(room.bpm))?saved:jamSeed()}catch(e){jamRooms=jamSeed()}
        let jamFilter="all",jamCurrent=null,jamToastTimer=null,jamCountTimer=null,jamRecordTimer=null;
        let jamRecording=null,jamSelectedNote=null,jamEdit=null;
        const jamHeld=new Map();let jamGeneration=0;
        const jamGrid=document.querySelector("#jam-grid");
        const jamPage=document.querySelector("#jam-page");
        const jamRoomDialog=document.querySelector("#jam-room-dialog");
        const jamRoomContent=document.querySelector("#jam-room-content");
        const jamCreateDialog=document.querySelector("#jam-create-dialog");
        window.jamPage=jamPage;
        const jamEsc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
        const jamRoom=id=>jamRooms.find(room=>room.id===id);
        const jamPack=room=>JAM_PACKS[room.pack]||JAM_PACKS.pop;
        const jamRequired=room=>room.seats.filter(seat=>seat.required);
        const jamAllDone=room=>jamRequired(room).every(seat=>seat.status==="done");
        const jamConfirmedCount=room=>room.draft?JAM_SECTIONS.filter(section=>room.draft.sections?.[section.id]?.confirmed).length:0;
        const jamAllSectionsConfirmed=room=>Boolean(room.draft)&&jamConfirmedCount(room)===JAM_SECTIONS.length;
        const jamProgress=room=>{
          if(room.stage==="complete")return 100;
          if(room.stage==="mixReady")return 82;
          const required=jamRequired(room);
          const done=required.filter(seat=>seat.status==="done").length;
          const draftBoost=room.draft?Math.round(jamConfirmedCount(room)/JAM_SECTIONS.length*8):0;
          const optional=room.seats.filter(seat=>!seat.required&&seat.status==="done").length;
          return Math.min(80,20+Math.round(done/Math.max(1,required.length)*58)+draftBoost+optional*4);
        };
        const jamStage=room=>room.stage==="complete"?"已完成":room.stage==="mixReady"?"待混音":"构筑中";
        const jamSave=()=>{if(!window.siteStorage.setItem(JAM_KEY,JSON.stringify(jamRooms)))jamToast("浏览器无法保存进度，本次仍可继续演奏")};
        const jamToast=message=>{
          let el=document.querySelector("#jam-toast");
          if(!el){el=document.createElement("div");el.id="jam-toast";el.className="jam-toast";document.body.appendChild(el)}
          el.textContent=message;el.classList.add("show");clearTimeout(jamToastTimer);
          jamToastTimer=setTimeout(()=>el.classList.remove("show"),2300);
        };
        const jamBarArt=seed=>Array.from({length:18},(_,i)=>{
          const h=18+((i*19+seed*13)%31);
          return `<span style="--h:${h}px;--d:${(i%7)*-.07}s"></span>`;
        }).join("");
        const jamRoomRoles=room=>room.seats.map(seat=>`<span class="jam-role-dot ${seat.status==="open"?"open":""}" title="${jamEsc(JAM_ROLE[seat.role]?.label)}">${JAM_ROLE[seat.role]?.short||"?"}</span>`).join("");
        const jamRender=()=>{
          const shown=jamRooms.filter(room=>jamFilter==="all"||room.stage===jamFilter);
          jamGrid.innerHTML=shown.length?shown.map((room,index)=>{
            const open=room.seats.find(seat=>seat.status==="open"&&seat.required);
            const action=room.stage==="complete"?"打开成品":room.stage==="mixReady"?"进入后期":open?`演奏${JAM_ROLE[open.role].label}`:"查看房间";
            const pack=jamPack(room);
            return `<article class="jam-room ${jamSound.roomId===room.id?"is-playing":""}" data-room-id="${room.id}" style="--accent:${room.accent||pack.accent}">
              <div class="jam-room-cover" data-open-room="${room.id}">
                <div class="jam-room-top"><span class="jam-state">${jamStage(room)}</span><span class="jam-branch-count">${room.branchCount||0} 个平行版本</span></div>
                <div class="jam-bars">${jamBarArt(index+1)}</div>
              </div>
              <div class="jam-room-body">
                <div class="jam-room-title"><h2>${jamEsc(room.title)}</h2><span class="jam-progress-number">${jamProgress(room)}%</span></div>
                <p class="jam-meta">${jamEsc(pack.label)} · ${room.bpm} BPM · ${jamEsc(room.key)}</p>
                <div class="jam-role-line">${jamRoomRoles(room)}<div class="jam-role-copy"><strong>${room.seats.filter(x=>x.status==="done").length} 个声部</strong><span>系统鼓组已就位</span></div></div>
                <div class="jam-card-actions"><button class="jam-preview" data-preview="${room.id}" title="试听完整编排" aria-label="试听完整编排">${jamSound.roomId===room.id?"■":"▶"}</button><button class="jam-primary" data-open-room="${room.id}">${action}</button></div>
              </div>
            </article>`;
          }).join(""):`<div class="jam-empty"><strong>这一栏暂时是空的</strong>切到“全部”继续试玩。</div>`;
        };
        window.renderJam=jamRender;

        const jamAudio={ready:false,master:null,drumChannel:null,drums:null,kick:null,noise:null,voices:{},live:null};
        const jamSound={roomId:null,mode:null,step:0,steps:0,scheduleId:null,finishing:false};
        const JAM_DRUM_URLS={
          kick:"https://smpldsnds.github.io/drum-machines/808-mini/kick.mp3",
          snare:"https://smpldsnds.github.io/drum-machines/808-mini/snare-2.mp3",
          hat:"https://smpldsnds.github.io/drum-machines/808-mini/hhclosed-1.mp3",
          openHat:"https://smpldsnds.github.io/drum-machines/808-mini/hhopen-1.mp3",
          crash:"https://smpldsnds.github.io/drum-machines/808-mini/crash.mp3"
        };
        const jamDb=value=>value<=0?-60:Tone.gainToDb(value/100);
        const jamAudioReady=async()=>{
          try{if(!window.Tone)await window.siteAssets?.load("tone");if(!window.Tone)throw Error();await Tone.start()}
          catch(e){jamToast("音色载入失败，请重试");return false}
          if(jamAudio.ready)return true;
          const limiter=new Tone.Limiter(-2).toDestination();
          jamAudio.master=new Tone.Compressor(-18,3).connect(limiter);
          jamAudio.drumChannel=new Tone.Channel(-5).connect(jamAudio.master);
          jamAudio.drums=new Tone.Players(JAM_DRUM_URLS).connect(jamAudio.drumChannel);
          jamAudio.kick=new Tone.MembraneSynth({pitchDecay:.025,octaves:5,oscillator:{type:"sine"},envelope:{attack:.001,decay:.25,sustain:0,release:.1}}).connect(jamAudio.drumChannel);
          jamAudio.noise=new Tone.NoiseSynth({noise:{type:"white"},envelope:{attack:.001,decay:.09,sustain:0,release:.04}}).connect(jamAudio.drumChannel);
          jamAudio.ready=true;
          return true;
        };
        const jamDisposeVoice=voice=>{
          if(!voice)return;
          try{voice.instrument.releaseAll?.()}catch(e){}
          try{voice.instrument.dispose()}catch(e){}
          try{voice.effect?.dispose()}catch(e){}
          try{voice.channel.dispose()}catch(e){}
        };
        const jamMakeVoice=(patchId,level=70)=>{
          const channel=new Tone.Channel(jamDb(level)).connect(jamAudio.master);
          let instrument,effect=null;
          if(patchId==="dreamKeys"){
            instrument=new Tone.PolySynth(Tone.FMSynth).set({
              harmonicity:2.4,modulationIndex:5,oscillator:{type:"sine"},modulation:{type:"triangle"},
              envelope:{attack:.012,decay:.7,sustain:.28,release:1.5},
              modulationEnvelope:{attack:.04,decay:.35,sustain:.12,release:.8}
            });
            effect=new Tone.Chorus(2.6,2.2,.22).start();instrument.connect(effect);effect.connect(channel);
          }else if(patchId==="glassPluck"){
            instrument=new Tone.PolySynth(Tone.Synth).set({oscillator:{type:"triangle8"},envelope:{attack:.003,decay:.18,sustain:.04,release:.55}});
            effect=new Tone.FeedbackDelay("8n",.2);instrument.connect(effect);effect.connect(channel);
          }else if(patchId==="warmBass"){
            instrument=new Tone.MonoSynth({
              oscillator:{type:"square"},filter:{Q:2,type:"lowpass",rolloff:-24},
              envelope:{attack:.008,decay:.24,sustain:.45,release:.28},
              filterEnvelope:{attack:.01,decay:.18,sustain:.25,release:.3,baseFrequency:90,octaves:2.7}
            }).connect(channel);
          }else if(patchId==="deepSub"){
            instrument=new Tone.MonoSynth({
              oscillator:{type:"sine"},filter:{type:"lowpass",rolloff:-24,Q:1},
              envelope:{attack:.01,decay:.18,sustain:.7,release:.22},
              filterEnvelope:{attack:.01,decay:.1,sustain:.4,release:.2,baseFrequency:55,octaves:1.8}
            });
            effect=new Tone.Distortion(.08);instrument.connect(effect);effect.connect(channel);
          }else if(patchId==="supersaw"){
            instrument=new Tone.PolySynth(Tone.Synth).set({oscillator:{type:"fatsawtooth",count:3,spread:22},envelope:{attack:.018,decay:.18,sustain:.38,release:.7}});
            effect=new Tone.Chorus(4,2.5,.3).start();instrument.connect(effect);effect.connect(channel);
          }else if(patchId==="neonPluck"){
            instrument=new Tone.PolySynth(Tone.Synth).set({oscillator:{type:"square8"},envelope:{attack:.002,decay:.11,sustain:.02,release:.32}});
            effect=new Tone.FeedbackDelay("16n",.28);instrument.connect(effect);effect.connect(channel);
          }else{
            instrument=new Tone.PolySynth(Tone.AMSynth).set({
              harmonicity:1.5,oscillator:{type:"sine"},modulation:{type:"sine"},
              envelope:{attack:.45,decay:.7,sustain:.55,release:2.4},
              modulationEnvelope:{attack:.8,decay:.5,sustain:.5,release:1.8}
            });
            effect=new Tone.Chorus(1.2,3.2,.35).start();instrument.connect(effect);effect.connect(channel);
          }
          return {id:patchId,instrument,effect,channel,mono:patchId==="warmBass"||patchId==="deepSub"};
        };
        const jamMidiName=midi=>{
          const names=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
          return names[(midi%12+12)%12]+(Math.floor(midi/12)-1);
        };
        const jamTrigger=(voice,note,duration,time,velocity=.7)=>{
          if(!voice)return;
          try{
            const playable=voice.mono&&Array.isArray(note)?note[0]:note;
            const value=Array.isArray(playable)?playable.map(jamMidiName):jamMidiName(playable);
            voice.instrument.triggerAttackRelease(value,duration,time,velocity);
          }catch(e){}
        };
        const jamHit=(name,time)=>{
          try{
            const player=jamAudio.drums?.player(name);
            if(player?.loaded){player.start(time);return}
          }catch(e){}
          if(name==="kick")jamAudio.kick?.triggerAttackRelease("C1","8n",time,.8);
          else jamAudio.noise?.triggerAttackRelease(name==="snare"?"8n":"32n",time,name==="snare"?.45:.18);
        };
        const jamRoot=room=>{
          const roots={C:0,"C#":1,Db:1,D:2,"D#":3,Eb:3,E:4,F:5,"F#":6,Gb:6,G:7,"G#":8,Ab:8,A:9,"A#":10,Bb:10,B:11};
          return roots[room.key.split(" ")[0]]??0;
        };
        const jamMinor=room=>/minor/i.test(room.key);
        const jamScale=room=>jamMinor(room)?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11];
        const jamSnap=(room,midi)=>{
          const allowed=jamScale(room).map(n=>(n+jamRoot(room))%12);
          if(allowed.includes((midi%12+12)%12))return midi;
          for(let d=1;d<7;d++){
            if(allowed.includes(((midi-d)%12+12)%12))return midi-d;
            if(allowed.includes((midi+d)%12))return midi+d;
          }
          return midi;
        };
        const jamChord=(room,bar)=>{
          const scale=jamScale(room);
          const progression=room.pack==="electronic"?[0,5,2,6]:jamMinor(room)?[0,5,3,6]:[0,5,3,4];
          const degree=progression[Math.floor(bar/2)%4];
          let base=60+jamRoot(room)+scale[degree];
          while(base>66)base-=12;
          const third=scale[(degree+2)%7]+(degree+2>=7?12:0);
          const fifth=scale[(degree+4)%7]+(degree+4>=7?12:0);
          return [base,base+(third-scale[degree]),base+(fifth-scale[degree])];
        };
        const jamSectionAt=bar=>JAM_SECTIONS.find(section=>bar>=section.start&&bar<section.end)||JAM_SECTIONS[JAM_SECTIONS.length-1];
        const jamActiveSection=room=>JAM_SECTIONS.find(section=>section.id===room.draft?.activeSection)||JAM_SECTIONS[1];
        const jamActiveTake=room=>room.draft?.sections?.[jamActiveSection(room).id];
        const jamRoleActive=(role,section)=>{
          if(role==="harmony")return true;
          if(role==="bass")return !["Intro","Outro"].includes(section);
          if(role==="lead")return ["Pre","Chorus","Bridge"].includes(section);
          if(role==="texture")return ["Intro","Pre","Bridge","Outro"].includes(section);
          return true;
        };
        const jamMonitorValue=(room,key)=>{
          if(room.draft?.monitorMix&&Number.isFinite(Number(room.draft.monitorMix[key])))return Number(room.draft.monitorMix[key]);
          if(key==="drums")return 72;
          return Number(room.mix?.[key]??70);
        };
        const jamGenerated=(room,role,bar,sub,time,voice)=>{
          const section=jamSectionAt(bar).name;
          if(!jamRoleActive(role,section))return;
          const chord=jamChord(room,bar),beat=60/room.bpm;
          if(role==="harmony"&&(sub===0||sub===8)){
            jamTrigger(voice,chord,beat*1.85,time,section==="Chorus"?.68:.5);
          }else if(role==="bass"){
            const pattern=room.pack==="electronic"?[0,4,8,12]:[0,6,8,14];
            if(pattern.includes(sub))jamTrigger(voice,chord[0]-24,beat*(room.pack==="electronic"?.42:.7),time,.72);
          }else if(role==="lead"){
            const scale=jamScale(room);
            const chorus=[4,2,1,2,4,5,4,2],pre=[1,2,3,4,3,2,1,0],bridge=[5,4,2,1,3,2,0,1];
            const phrase=section==="Chorus"?chorus:section==="Bridge"?bridge:pre;
            if(sub%2===0){
              const i=(sub/2+bar*2)%phrase.length,octave=section==="Chorus"&&i>4?12:0;
              jamTrigger(voice,60+jamRoot(room)+scale[phrase[i]]+octave,.18+beat*.27,time,section==="Chorus"?.67:.46);
            }
          }else if(role==="texture"&&(sub===0||sub===12)){
            jamTrigger(voice,[chord[0]+12,chord[2]+12],beat*2.8,time,.27);
          }
        };
        const jamCustomEvents=(room,events,section,songBar,sub,time,voice)=>{
          const local=(songBar-section.start)*16+sub,beat=60/room.bpm;
          (events||[]).filter(event=>event.s*2===local).forEach(event=>jamTrigger(voice,event.n,event.d*beat/2,time,event.v||.7));
        };
        const jamPlaySeat=(room,seat,songBar,sub,time,voice)=>{
          const section=jamSectionAt(songBar);
          const take=seat.takeSections?.[section.id];
          if(take)jamCustomEvents(room,take.events||take,section,songBar,sub,time,voice);
          else jamGenerated(room,seat.role,songBar,sub,time,voice);
        };
        const jamDrumStep=(room,bar,sub,time)=>{
          const section=jamSectionAt(bar).name;
          if(section==="Intro"&&bar===0){if(sub%4===0)jamHit("hat",time);return}
          const electronic=room.pack==="electronic";
          if(electronic){
            if([0,4,8,12].includes(sub))jamHit("kick",time);
            if([4,12].includes(sub))jamHit("snare",time);
            if(sub%2===0)jamHit(sub===14?"openHat":"hat",time);
          }else{
            if(sub===0||sub===8||(section==="Chorus"&&sub===10))jamHit("kick",time);
            if(sub===4||sub===12)jamHit("snare",time);
            if(sub%2===0)jamHit(sub===14&&section==="Chorus"?"openHat":"hat",time);
          }
          if(sub===0&&["Chorus","Bridge"].includes(section)&&JAM_SECTIONS.some(x=>x.start===bar))jamHit("crash",time);
        };
        const jamEnsureSequenceVoices=room=>{
          Object.values(jamAudio.voices).forEach(jamDisposeVoice);jamAudio.voices={};
          room.seats.filter(seat=>seat.status==="done"||(room.draft&&seat.role===room.draft.role)).forEach(seat=>{
            const patch=seat.status==="done"?(seat.patch||jamPack(room).defaults[seat.role]):room.draft.patch;
            jamAudio.voices[seat.role]=jamMakeVoice(patch,jamMonitorValue(room,seat.role));
          });
          if(jamAudio.drumChannel)jamAudio.drumChannel.volume.value=jamDb(jamMonitorValue(room,"drums"));
        };
        const jamPlaybackUi=(room,songBar,step,total)=>{
          const percent=Math.min(100,step/Math.max(1,total)*100);
          document.querySelectorAll(".jam-room").forEach(card=>card.classList.toggle("is-playing",card.dataset.roomId===room.id&&jamSound.roomId===room.id));
          document.querySelectorAll(".jam-section").forEach(el=>el.classList.remove("jam-section-live"));
          if(jamSound.roomId===room.id){
            const section=jamSectionAt(songBar);
            document.querySelectorAll(`.jam-section[data-section="${section.id}"]`).forEach(el=>el.classList.add("jam-section-live"));
          }
          document.querySelectorAll(".jam-play-progress span").forEach(el=>el.style.setProperty("--play-progress",jamSound.roomId===room.id?`${percent}%`:"0%"));
        };
        const jamStopPreview=(refresh=true)=>{
          jamGeneration++;jamReleaseAll();
          clearInterval(jamCountTimer);jamCountTimer=null;
          if(jamRecordTimer){clearTimeout(jamRecordTimer);jamRecordTimer=null}
          if(jamRecording)jamFinishRecording(true);
          try{
            if(jamSound.scheduleId!==null)Tone.Transport.clear(jamSound.scheduleId);
            Tone.Transport.stop();Tone.Transport.position=0;
          }catch(e){}
          jamSound.roomId=null;jamSound.mode=null;jamSound.step=0;jamSound.steps=0;jamSound.scheduleId=null;jamSound.finishing=false;
          Object.values(jamAudio.voices).forEach(jamDisposeVoice);jamAudio.voices={};
          if(refresh){jamRender();if(jamRoomDialog.open&&jamCurrent)jamRenderRoom(jamRoom(jamCurrent))}
        };
        window.jamStopPreview=jamStopPreview;
        const jamStartSequence=async(room,mode="song")=>{
          if(jamSound.roomId===room.id&&jamSound.mode===mode){jamStopPreview();return}
          jamStopPreview(false);
          const generation=jamGeneration;
          if(!await jamAudioReady()||generation!==jamGeneration)return;
          const active=jamActiveSection(room);
          Tone.Transport.bpm.value=room.bpm;jamEnsureSequenceVoices(room);
          jamSound.roomId=room.id;jamSound.mode=mode;jamSound.step=0;
          jamSound.steps=mode==="section"?jamSectionBars(active)*16:320;jamSound.finishing=false;
          jamSound.scheduleId=Tone.Transport.scheduleRepeat(time=>{
            const step=jamSound.step++;
            if(step>=jamSound.steps){
              if(!jamSound.finishing){jamSound.finishing=true;setTimeout(()=>jamStopPreview(),80)}
              return;
            }
            const localBar=Math.floor(step/16),sub=step%16;
            const songBar=mode==="section"?active.start+localBar:localBar;
            jamDrumStep(room,songBar,sub,time);
            room.seats.forEach(seat=>{
              const voice=jamAudio.voices[seat.role];if(!voice)return;
              if(mode==="section"&&room.draft&&seat.role===room.draft.role){
                const take=room.draft.sections[active.id];
                jamCustomEvents(room,take.events,active,songBar,sub,time,voice);
              }else if(seat.status==="done")jamPlaySeat(room,seat,songBar,sub,time,voice);
            });
            Tone.Draw.schedule(()=>jamPlaybackUi(room,songBar,step,jamSound.steps),time);
          },"16n");
          Tone.Transport.start("+0.05");jamRender();if(jamRoomDialog.open&&jamCurrent)jamRenderRoom(room);
        };

        const jamPatchLabel=(room,id)=>jamPack(room).patches.find(p=>p.id===id)?.label||id;
        const jamKeyboardMap={a:48,w:49,s:50,e:51,d:52,f:53,t:54,g:55,y:56,h:57,u:58,j:59,k:60,o:61,l:62,p:63,";":64,"'":65};
        const jamKeyLabels=Object.fromEntries(Object.entries(jamKeyboardMap).map(([key,note])=>[note,key.toUpperCase()]));
        const jamWhite=[48,50,52,53,55,57,59,60,62,64,65,67,69,71,72];
        const jamBlack=[
          {n:49,p:100/15},{n:51,p:200/15},{n:54,p:400/15},{n:56,p:500/15},{n:58,p:600/15},
          {n:61,p:800/15},{n:63,p:900/15},{n:66,p:1100/15},{n:68,p:1200/15},{n:70,p:1300/15}
        ];
        const jamKeyboardHtml=room=>{
          const lock=room.draft?.scaleLock!==false,allowed=note=>!lock||jamSnap(room,note)===note;
          const key=(note,black=false,pos=0)=>`<button type="button" class="jam-key ${black?"black":""} ${allowed(note)?"":"out"}" data-piano-note="${note}" aria-label="${jamMidiName(note)}" ${black?`style="left:${pos}%"`:""}><span>${jamMidiName(note)}<small>${jamKeyLabels[note]||""}</small></span></button>`;
          return `<div class="jam-keyboard-wrap"><div class="jam-keyboard"><div class="jam-white-keys">${jamWhite.map(n=>key(n)).join("")}</div>${jamBlack.map(x=>key(x.n,true,x.p)).join("")}</div></div>`;
        };
        const jamNoteId=()=>`n${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
        const jamTakeHtml=(room,section,take)=>{
          const events=take.events||[],units=jamSectionBars(section)*8,zoom=room.draft.zoom||1;
          return `<div class="jam-roll-tools">
            <div><strong>钢琴卷帘</strong><span>点击空白处添加 · 拖动音符移动 · 拖右侧改变长度</span></div>
            <div class="jam-zoom"><button type="button" data-action="zoom-out" title="缩小卷帘" aria-label="缩小卷帘">−</button><input id="jam-roll-zoom" type="range" min="1" max="3" step=".25" value="${zoom}" aria-label="卷帘缩放"><button type="button" data-action="zoom-in" title="放大卷帘" aria-label="放大卷帘">＋</button><output id="jam-zoom-value">${Math.round(zoom*100)}%</output><button type="button" class="jam-secondary" data-action="delete-note">删除音符</button></div>
          </div>
          <div class="jam-roll-wrap"><div class="jam-take-strip" data-roll style="width:${zoom*100}%;--roll-beats:${jamSectionBars(section)*4}">
            <div class="jam-take-grid" style="grid-template-columns:repeat(${jamSectionBars(section)*4},1fr)">${Array.from({length:jamSectionBars(section)*4},()=>"<i></i>").join("")}</div>
            <div class="jam-pitch-grid"></div>
            ${events.length?events.map(event=>{
              const top=4+(72-Math.max(48,Math.min(72,event.n)))/24*132;
              return `<span class="jam-take-note ${jamSelectedNote===event.id?"selected":""}" data-note-id="${event.id}" style="left:${event.s/units*100}%;width:${Math.max(1.5,event.d/units*100)}%;top:${top}px" title="${jamMidiName(event.n)}"><i data-resize-note="${event.id}"></i></span>`;
            }).join(""):`<span class="jam-take-empty">点击卷帘添加音符，或先生成本段示范</span>`}
          </div></div>`;
        };
        const jamMonitorHtml=room=>{
          const keys=["drums",...room.seats.map(seat=>seat.role)];
          return `<section class="jam-monitor"><div class="jam-monitor-head"><div><h4>监听调音台</h4><p>只改变你的伴奏监听，不影响房间最终混音。</p></div></div>
            <div class="jam-mixer">${keys.map(key=>{
              const seat=key==="drums"?null:room.seats.find(x=>x.role===key);
              const active=key==="drums"||seat.status==="done"||room.draft.role===key;
              const label=key==="drums"?"系统鼓组":JAM_ROLE[key].label;
              const value=jamMonitorValue(room,key);
              return `<div class="jam-channel ${active?"":"inactive"}"><label>${label}</label><input type="range" min="0" max="100" value="${value}" data-monitor="${key}" ${active?"":"disabled"}><output>${active?value:"未加入"}</output></div>`;
            }).join("")}</div>
          </section>`;
        };
        const jamStudioHtml=room=>{
          const draft=room.draft,section=jamActiveSection(room),take=jamActiveTake(room),role=JAM_ROLE[draft.role],pack=jamPack(room);
          const confirmed=jamConfirmedCount(room),allDone=jamAllSectionsConfirmed(room);
          return `<section class="jam-studio">
            <div class="jam-studio-bar"><div><span class="jam-editing-section">${section.name}</span><h4>${role.label} · ${jamSectionBars(section)} 小节</h4><p>${confirmed} / ${JAM_SECTIONS.length} 个段落已确认；切换上方段落逐段完成。</p></div>
              <select class="jam-patch-select" id="jam-patch" aria-label="选择音色">${pack.patches.map(p=>`<option value="${p.id}" ${p.id===draft.patch?"selected":""}>${p.label}</option>`).join("")}</select>
            </div>
            <div class="jam-studio-controls">
              <label class="jam-scale-lock"><input id="jam-scale-lock" type="checkbox" ${draft.scaleLock!==false?"checked":""}> 调内保护</label>
              <span class="jam-count" id="jam-count">${jamRecording?"录制中":`${jamSectionBars(section)} 小节`}</span>
              <button class="jam-secondary" data-action="demo-take">生成本段示范</button>
              <button class="jam-record ${jamRecording?"recording":""}" data-action="record">${jamRecording?"■ 停止":"● 录制本段"}</button>
            </div>
            ${jamKeyboardHtml(room)}
            ${jamTakeHtml(room,section,take)}
            <div class="jam-take-actions">
              <button class="jam-secondary" data-action="clear-take">清空本段</button>
              <button class="jam-secondary" data-action="play-section">${jamSound.roomId===room.id&&jamSound.mode==="section"?"■ 停止试听":"▶ 带伴奏试听本段"}</button>
              <button class="${take.confirmed?"jam-confirmed-button":""}" data-action="confirm-section">${take.confirmed?"✓ 本段已确认":"确认这个段落"}</button>
            </div>
            ${jamMonitorHtml(room)}
            <div class="jam-submit-bar"><div><strong>${confirmed} / ${JAM_SECTIONS.length} 段完成</strong><span>${allDone?"整条声部已经可以提交。":"确认全部段落后才能锁定声部。"}</span></div><button data-action="submit-take" ${allDone?"":"disabled"}>提交并锁定 ${role.label}</button></div>
            <div class="jam-song-note"><span><span class="jam-pack-tag">${pack.name}</span> · 鼓组 + 7 种浏览器合成音色</span><a href="https://github.com/smpldsnds/drum-machines" target="_blank" rel="noreferrer">808 采样来源</a></div>
          </section>`;
        };
        const jamSeatHtml=room=>room.seats.map(seat=>{
          const role=JAM_ROLE[seat.role],done=seat.status==="done",editing=room.draft?.role===seat.role;
          const subtitle=done?`${jamEsc(seat.musician)} · ${jamEsc(jamPatchLabel(room,seat.patch||jamPack(room).defaults[seat.role]))}`:editing?`${jamConfirmedCount(room)} / ${JAM_SECTIONS.length} 段已确认`:seat.required?"等待一位玩家":"可选声部";
          return `<div class="jam-seat"><span class="jam-seat-icon">${role.short}</span><div><strong>${role.label}${seat.required?"":" · 可选"}</strong><small>${subtitle}</small></div>${done?`<span class="locked">已锁定</span>`:room.stage==="building"?`<button data-action="claim" data-role="${seat.role}" ${editing?"disabled":""}>${editing?"编辑中":"认领"}</button>`:""}</div>`;
        }).join("");
        const jamSeatsBlock=room=>room.draft?`<details class="jam-seats-fold"><summary><span><b>${JAM_ROLE[room.draft.role].short}</b><strong>已认领 ${JAM_ROLE[room.draft.role].label}</strong></span><small>${jamConfirmedCount(room)} / ${JAM_SECTIONS.length} 段已确认 · 展开查看声部</small></summary><div class="jam-seats">${jamSeatHtml(room)}</div></details>`:`<div class="jam-seats">${jamSeatHtml(room)}</div>`;
        const jamForkHtml=room=>room.branchable&&room.seats.some(x=>x.status==="done")?`<div class="jam-callout"><h3>用喜欢的声部开一个平行版本</h3><p>原房间不会被替换。选中的声部会作为新房间的起点，其余位置重新开放。</p><div class="jam-checks">${room.seats.filter(x=>x.status==="done").map((seat,i)=>`<label class="jam-check"><input class="jam-fork-role" type="checkbox" value="${seat.role}" ${i<2?"checked":""}>${JAM_ROLE[seat.role].label}</label>`).join("")}</div><div class="jam-callout-actions"><button class="jam-secondary" data-action="fork">复刻所选声部</button></div></div>`:"";
        const jamMixerHtml=room=>{
          if(!room.producer)return `<div class="jam-callout"><h3>需要最后一位后期制作人</h3><p>调整各声部音量，完成最后整合后房间将锁定。单人原型允许你模拟这个身份。</p><button data-action="be-producer">进入后期台</button></div>`;
          return `<div class="jam-callout"><h3>${room.stage==="complete"?"母带已完成":"后期台"} · ${jamEsc(room.producer)}</h3><p>先试听完整编排，再平衡每个声部。</p><div class="jam-mixer">${room.seats.filter(x=>x.status==="done").map(seat=>`<div class="jam-channel"><label>${JAM_ROLE[seat.role].label}</label><input type="range" min="0" max="100" value="${room.mix?.[seat.role]??70}" data-mix="${seat.role}" ${room.stage==="complete"?"disabled":""}><output>${room.mix?.[seat.role]??70}</output></div>`).join("")}</div>${room.stage==="complete"?"":`<div class="jam-callout-actions"><button data-action="finalize">完成混音并锁定</button></div>`}</div>`;
        };
        const jamRenderRoom=room=>{
          if(!room)return;
          const pack=jamPack(room),parent=room.parent?jamRoom(room.parent):null;
          jamRoomContent.innerHTML=`<div class="jam-dialog-head"><div><span class="lesson-kicker">${jamStage(room)} · ${jamProgress(room)}%</span><h2 id="jam-room-title">${jamEsc(room.title)}</h2></div><button class="jam-close" data-action="close" aria-label="关闭">×</button></div>
            <div class="jam-detail ${jamSound.roomId===room.id?"is-playing":""}" style="--room-accent:${room.accent||pack.accent}">
              <div class="jam-detail-summary">
                <div class="jam-now"><div class="jam-now-top"><div><h3>${room.stage==="complete"?"完整编排":"当前构筑版本"}</h3><p>${jamSound.roomId===room.id?"正在播放":"20 小节 · 带动态段落变化"}</p></div><button data-action="play-song" aria-label="试听完整编排">${jamSound.roomId===room.id&&jamSound.mode==="song"?"■":"▶"}</button></div><div class="jam-mini-wave">${jamBarArt(7)}</div><div class="jam-play-progress"><span style="--play-progress:0%"></span></div></div>
                <div class="jam-blueprint"><div><span>STYLE PACK</span><strong>${pack.label} · ${pack.name}</strong></div><div><span>TEMPO</span><strong>${room.bpm} BPM</strong></div><div><span>KEY</span><strong>${jamEsc(room.key)}</strong></div><div><span>FOUNDATION</span><strong>系统鼓组</strong></div></div>
              </div>
              <div class="jam-structure">${JAM_SECTIONS.map(section=>{
                const active=room.draft?.activeSection===section.id,confirmed=room.draft?.sections?.[section.id]?.confirmed;
                return `<button class="jam-section ${active?"active":""} ${confirmed?"confirmed":""}" data-action="select-section" data-section="${section.id}" ${room.draft?"":"disabled"} aria-pressed="${active}">${section.name}<br>${jamSectionBars(section)} bars</button>`;
              }).join("")}</div>
              ${jamSeatsBlock(room)}
              ${room.stage==="building"&&room.draft?jamStudioHtml(room):""}
              ${room.stage==="mixReady"||room.stage==="complete"?jamMixerHtml(room):""}
              ${jamForkHtml(room)}
              ${parent?`<div class="jam-lineage">复刻自 <strong>${jamEsc(parent.title)}</strong></div>`:""}
            </div>`;
          if(jamSound.roomId===room.id){
            const active=jamSound.mode==="section"?jamActiveSection(room):jamSectionAt(Math.floor(jamSound.step/16));
            jamPlaybackUi(room,active.start,jamSound.step,jamSound.steps||320);
          }
        };
        const jamOpen=id=>{
          const room=jamRoom(id);if(!room)return;
          jamCurrent=id;jamSelectedNote=null;jamRenderRoom(room);jamRoomDialog.showModal();
        };

        const jamBlankSections=()=>Object.fromEntries(JAM_SECTIONS.map(section=>[section.id,{events:[],confirmed:false}]));
        const jamNewDraft=(room,role)=>({
          role,patch:jamPack(room).defaults[role],scaleLock:true,activeSection:"verse",zoom:1,
          sections:jamBlankSections(),
          monitorMix:{drums:72,harmony:room.mix?.harmony??70,bass:room.mix?.bass??76,lead:room.mix?.lead??68,texture:room.mix?.texture??55}
        });
        const jamDemoEvents=(room,role,section)=>{
          const scale=jamScale(room),root=60+jamRoot(room),bars=jamSectionBars(section),out=[];
          if(role==="harmony"){
            for(let bar=0;bar<bars;bar++)jamChord(room,section.start+bar).forEach(n=>out.push({id:jamNoteId(),n,s:bar*8,d:7,v:.62}));
            return out;
          }
          if(role==="bass"){
            for(let i=0;i<bars*2;i++)out.push({id:jamNoteId(),n:root-24+(i%4===3?scale[4]:0),s:i*4,d:3,v:.76});
            return out;
          }
          if(role==="texture"){
            for(let bar=0;bar<bars;bar+=2){
              const chord=jamChord(room,section.start+bar);
              out.push({id:jamNoteId(),n:chord[0]+12,s:bar*8,d:Math.min(12,(bars-bar)*8),v:.4});
            }
            return out;
          }
          const phrases={
            intro:[0,2,4,2,1,0,2,4],verse:[0,1,2,4,2,1,0,1],
            pre:[1,2,3,4,3,2,4,5],"chorus-a":[4,2,1,2,4,5,4,2],
            bridge:[5,4,2,1,3,2,0,1],"chorus-b":[4,5,4,2,6,5,4,2],outro:[4,2,1,0,2,1,0,0]
          };
          const phrase=phrases[section.id]||phrases.verse;
          for(let i=0;i<bars*4;i++)out.push({id:jamNoteId(),n:root+scale[phrase[i%phrase.length]],s:i*2,d:1,v:i%4===0?.78:.62});
          return out;
        };
        const jamLiveVoice=async room=>{
          if(!await jamAudioReady())return null;
          if(!room.draft)return null;
          const patch=room.draft?.patch;
          if(!jamAudio.live||jamAudio.live.id!==patch){
            jamDisposeVoice(jamAudio.live);jamAudio.live=jamMakeVoice(patch,jamMonitorValue(room,room.draft.role));
          }
          return jamAudio.live;
        };
        const jamPress=async(id,rawNote)=>{
          const room=jamRoom(jamCurrent);
          if(!room?.draft||jamHeld.has(id))return;
          const note=room.draft.scaleLock===false?rawNote:jamSnap(room,rawNote);
          const held={note,pending:true,start:performance.now()};jamHeld.set(id,held);
          const voice=await jamLiveVoice(room);
          if(jamHeld.get(id)!==held)return;
          if(!voice){jamHeld.delete(id);return}
          held.pending=false;held.start=performance.now();
          try{voice.instrument.triggerAttack(jamMidiName(note),undefined,.72)}catch(e){}
          jamRoomContent.querySelectorAll(`[data-piano-note="${note}"]`).forEach(el=>el.classList.add("active"));
        };
        const jamRelease=id=>{
          const held=jamHeld.get(id);if(!held)return;
          if(held.pending){jamHeld.delete(id);return}
          const room=jamRoom(jamCurrent);
          try{jamAudio.live?.instrument.triggerRelease(jamMidiName(held.note))}catch(e){}
          jamHeld.delete(id);
          jamRoomContent.querySelectorAll(`[data-piano-note="${held.note}"]`).forEach(el=>el.classList.remove("active"));
          if(jamRecording&&room?.draft){
            const section=jamActiveSection(room),take=jamActiveTake(room),unit=30000/room.bpm,max=jamSectionBars(section)*8;
            const s=Math.max(0,Math.min(max-1,Math.round((held.start-jamRecording.start)/unit)));
            const d=Math.max(1,Math.min(max-s,Math.round((performance.now()-held.start)/unit)));
            if(held.start>=jamRecording.start&&s<max)take.events.push({id:jamNoteId(),n:held.note,s,d,v:.72});
          }
        };
        const jamReleaseAll=()=>[...jamHeld.keys()].forEach(jamRelease);
        window.addEventListener("blur",jamReleaseAll);
        document.addEventListener("visibilitychange",()=>{if(document.hidden)jamReleaseAll()});
        const jamFinishRecording=silent=>{
          if(!jamRecording)return;
          jamReleaseAll();jamRecording=null;clearTimeout(jamRecordTimer);jamRecordTimer=null;
          const room=jamRoom(jamCurrent);if(room){jamSave();jamRenderRoom(room)}
          if(!silent)jamToast("本段已量化到八分音符，请试听后确认");
        };
        const jamStartRecording=room=>{
          jamStopPreview(false);jamReleaseAll();
          const take=jamActiveTake(room);take.events=[];take.confirmed=false;jamSelectedNote=null;
          let count=4;
          const paint=()=>{const el=document.querySelector("#jam-count");if(el)el.textContent=count>0?`预备 ${count}`:"录制中"};
          paint();
          jamCountTimer=setInterval(()=>{
            count--;
            if(count>0){paint();jamHit("hat",Tone.now());return}
            clearInterval(jamCountTimer);jamCountTimer=null;jamRecording={start:performance.now()};paint();jamRenderRoom(room);
            jamRecordTimer=setTimeout(()=>jamFinishRecording(false),60000/room.bpm*jamSectionBars(jamActiveSection(room))*4);
          },60000/room.bpm);
        };
        const jamMarkChanged=room=>{const take=jamActiveTake(room);if(take)take.confirmed=false};
        const jamPositionFromRoll=(room,clientX,clientY,rect)=>{
          const section=jamActiveSection(room),units=jamSectionBars(section)*8;
          const s=Math.max(0,Math.min(units-1,Math.round((clientX-rect.left)/rect.width*units)));
          let n=72-Math.round((clientY-rect.top)/rect.height*24);
          n=Math.max(48,Math.min(72,n));if(room.draft.scaleLock!==false)n=jamSnap(room,n);
          return {s,n,units};
        };
        const jamUpdateNoteElement=(el,event,units)=>{
          if(!el)return;
          const top=4+(72-Math.max(48,Math.min(72,event.n)))/24*132;
          el.style.left=`${event.s/units*100}%`;el.style.width=`${Math.max(1.5,event.d/units*100)}%`;el.style.top=`${top}px`;
        };
        const jamDeleteSelected=room=>{
          if(!jamSelectedNote){jamToast("先选中一个音符");return}
          const take=jamActiveTake(room),before=take.events.length;
          take.events=take.events.filter(event=>event.id!==jamSelectedNote);
          if(take.events.length===before){jamToast("这个音符已经不在当前段落");return}
          jamSelectedNote=null;take.confirmed=false;jamSave();jamRenderRoom(room);
        };

        jamGrid.addEventListener("click",event=>{
          const preview=event.target.closest("[data-preview]"),open=event.target.closest("[data-open-room]");
          if(preview){jamStartSequence(jamRoom(preview.dataset.preview),"song");return}
          if(open)jamOpen(open.dataset.openRoom);
        });
        jamRoomContent.addEventListener("click",event=>{
          const button=event.target.closest("[data-action]");if(!button)return;
          const room=jamRoom(jamCurrent);if(!room)return;
          const action=button.dataset.action;
          if(action==="close"){jamStopPreview();jamRoomDialog.close();return}
          if(action==="play-song"){jamStartSequence(room,"song");return}
          if(action==="select-section"&&room.draft){
            jamStopPreview(false);jamReleaseAll();room.draft.activeSection=button.dataset.section;jamSelectedNote=null;jamSave();jamRenderRoom(room);return;
          }
          if(action==="claim"){
            room.draft=jamNewDraft(room,button.dataset.role);jamSelectedNote=null;jamSave();jamRender();jamRenderRoom(room);return;
          }
          if(action==="demo-take"){
            const section=jamActiveSection(room),take=jamActiveTake(room);
            take.events=jamDemoEvents(room,room.draft.role,section);take.confirmed=false;jamSelectedNote=null;
            jamSave();jamRenderRoom(room);jamToast(`${section.name} 示范已生成`);return;
          }
          if(action==="clear-take"){
            const take=jamActiveTake(room);take.events=[];take.confirmed=false;jamSelectedNote=null;jamSave();jamRenderRoom(room);return;
          }
          if(action==="record"){
            if(jamRecording)jamFinishRecording(false);
            else if(jamCountTimer){clearInterval(jamCountTimer);jamCountTimer=null;jamRenderRoom(room)}
            else {const generation=++jamGeneration;jamAudioReady().then(ok=>{if(ok&&generation===jamGeneration&&jamRoomDialog.open&&jamCurrent===room.id&&room.draft)jamStartRecording(room)})}
            return;
          }
          if(action==="play-section"){jamStartSequence(room,"section");return}
          if(action==="confirm-section"){
            if(jamRecording)jamFinishRecording(true);
            const section=jamActiveSection(room),take=jamActiveTake(room);take.confirmed=true;jamSave();jamRender();jamRenderRoom(room);
            jamToast(take.events.length?`${section.name} 已确认`:`${section.name} 已确认为留白`);return;
          }
          if(action==="delete-note"){jamDeleteSelected(room);return}
          if(action==="zoom-out"||action==="zoom-in"){
            room.draft.zoom=Math.max(1,Math.min(3,(room.draft.zoom||1)+(action==="zoom-in"?.25:-.25)));
            jamSave();jamRenderRoom(room);return;
          }
          if(action==="submit-take"){
            if(!jamAllSectionsConfirmed(room)){jamToast("请先确认全部七个段落");return}
            const seat=room.seats.find(x=>x.role===room.draft.role);
            Object.assign(seat,{status:"done",musician:"YOU · SOLO",patch:room.draft.patch,takeSections:JSON.parse(JSON.stringify(room.draft.sections))});
            delete room.draft;jamSelectedNote=null;if(jamAllDone(room))room.stage="mixReady";
            jamSave();jamRender();jamRenderRoom(room);jamToast("整条声部已提交并锁定");return;
          }
          if(action==="be-producer"){room.producer="YOU · SOLO";jamSave();jamRenderRoom(room);return}
          if(action==="finalize"){room.stage="complete";jamSave();jamRender();jamRenderRoom(room);jamToast("这首歌完成了");return}
          if(action==="fork"){
            const roles=[...jamRoomContent.querySelectorAll(".jam-fork-role:checked")].map(x=>x.value);
            if(!roles.length){jamToast("至少选择一个想保留的声部");return}
            room.branchCount=(room.branchCount||0)+1;
            const fork={
              ...JSON.parse(JSON.stringify(room)),id:`fork-${Date.now()}`,title:`${room.title} · 平行 ${room.branchCount}`,
              stage:"building",parent:room.id,branchCount:0,producer:null,draft:null,
              seats:room.seats.map(seat=>roles.includes(seat.role)?{...seat}:{...seat,status:"open",musician:null,patch:null,takeSections:null})
            };
            if(jamAllDone(fork))fork.stage="mixReady";
            jamRooms.unshift(fork);jamSave();jamRender();jamOpen(fork.id);jamToast("平行房间已创建");return;
          }
        });
        jamRoomContent.addEventListener("input",event=>{
          const room=jamRoom(jamCurrent);if(!room?.draft)return;
          if(event.target.id==="jam-roll-zoom"){
            room.draft.zoom=Number(event.target.value);
            const roll=jamRoomContent.querySelector("[data-roll]"),label=jamRoomContent.querySelector("#jam-zoom-value");
            if(roll)roll.style.width=`${room.draft.zoom*100}%`;if(label)label.value=`${Math.round(room.draft.zoom*100)}%`;
          }else if(event.target.matches("[data-monitor]")){
            const key=event.target.dataset.monitor,value=Number(event.target.value);
            room.draft.monitorMix[key]=value;event.target.nextElementSibling.value=value;
            if(key==="drums"&&jamAudio.drumChannel)jamAudio.drumChannel.volume.rampTo(jamDb(value),.08);
            const sequenceVoice=jamAudio.voices[key];
            if(sequenceVoice)sequenceVoice.channel.volume.rampTo(jamDb(value),.08);
            if(key===room.draft.role&&jamAudio.live)jamAudio.live.channel.volume.rampTo(jamDb(value),.08);
          }
        });
        jamRoomContent.addEventListener("change",event=>{
          const room=jamRoom(jamCurrent);if(!room)return;
          if(event.target.id==="jam-patch"&&room.draft){
            room.draft.patch=event.target.value;jamDisposeVoice(jamAudio.live);jamAudio.live=null;jamSave();
          }else if(event.target.id==="jam-scale-lock"&&room.draft){
            room.draft.scaleLock=event.target.checked;jamSave();jamRenderRoom(room);
          }else if(event.target.id==="jam-roll-zoom"&&room.draft)jamSave();
          else if(event.target.matches("[data-monitor]")&&room.draft)jamSave();
          else if(event.target.matches("[data-mix]")){
            room.mix=room.mix||{};room.mix[event.target.dataset.mix]=Number(event.target.value);
            event.target.nextElementSibling.value=event.target.value;jamSave();
            const voice=jamAudio.voices[event.target.dataset.mix];
            if(voice)voice.channel.volume.rampTo(jamDb(Number(event.target.value)),.08);
          }
        });
        jamRoomContent.addEventListener("pointerdown",event=>{
          const piano=event.target.closest("[data-piano-note]");
          if(piano){event.preventDefault();piano.setPointerCapture?.(event.pointerId);jamPress(`pointer-${event.pointerId}`,Number(piano.dataset.pianoNote));return}
          const roll=event.target.closest("[data-roll]"),room=jamRoom(jamCurrent);
          if(!roll||!room?.draft)return;
          event.preventDefault();
          const noteEl=event.target.closest("[data-note-id]"),section=jamActiveSection(room),take=jamActiveTake(room),units=jamSectionBars(section)*8;
          if(noteEl){
            const note=take.events.find(item=>item.id===noteEl.dataset.noteId);if(!note)return;
            jamSelectedNote=note.id;jamRoomContent.querySelectorAll(".jam-take-note").forEach(el=>el.classList.toggle("selected",el===noteEl));
            noteEl.setPointerCapture?.(event.pointerId);
            jamEdit={roomId:room.id,sectionId:section.id,noteId:note.id,mode:event.target.closest("[data-resize-note]")?"resize":"move",startX:event.clientX,startY:event.clientY,orig:{s:note.s,n:note.n,d:note.d},rect:roll.getBoundingClientRect(),el:noteEl,units};
          }else{
            const pos=jamPositionFromRoll(room,event.clientX,event.clientY,roll.getBoundingClientRect());
            const note={id:jamNoteId(),n:pos.n,s:pos.s,d:Math.min(2,pos.units-pos.s),v:.72};
            take.events.push(note);take.confirmed=false;jamSelectedNote=note.id;jamSave();jamRenderRoom(room);
          }
        });
        document.addEventListener("pointermove",event=>{
          if(!jamEdit)return;
          const room=jamRoom(jamEdit.roomId);if(!room?.draft||room.draft.activeSection!==jamEdit.sectionId)return;
          const take=jamActiveTake(room),note=take.events.find(item=>item.id===jamEdit.noteId);if(!note)return;
          const dx=Math.round((event.clientX-jamEdit.startX)/jamEdit.rect.width*jamEdit.units);
          if(jamEdit.mode==="resize")note.d=Math.max(1,Math.min(jamEdit.units-note.s,jamEdit.orig.d+dx));
          else{
            const dy=Math.round(-(event.clientY-jamEdit.startY)/jamEdit.rect.height*24);
            note.s=Math.max(0,Math.min(jamEdit.units-note.d,jamEdit.orig.s+dx));
            note.n=Math.max(48,Math.min(72,jamEdit.orig.n+dy));
            if(room.draft.scaleLock!==false)note.n=jamSnap(room,note.n);
          }
          take.confirmed=false;jamUpdateNoteElement(jamEdit.el,note,jamEdit.units);
        });
        document.addEventListener("pointerup",event=>{
          jamRelease(`pointer-${event.pointerId}`);
          if(jamEdit){const room=jamRoom(jamEdit.roomId);jamEdit=null;if(room){jamSave();jamRenderRoom(room)}}
        });
        document.addEventListener("pointercancel",event=>{
          jamRelease(`pointer-${event.pointerId}`);jamEdit=null;
        });
        jamRoomContent.addEventListener("dblclick",event=>{
          const note=event.target.closest("[data-note-id]"),room=jamRoom(jamCurrent);
          if(!note||!room?.draft)return;
          jamSelectedNote=note.dataset.noteId;jamDeleteSelected(room);
        });
        document.addEventListener("keydown",event=>{
          if(/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;
          if((event.key==="Delete"||event.key==="Backspace")&&jamRoomDialog.open&&jamSelectedNote){
            event.preventDefault();const room=jamRoom(jamCurrent);if(room?.draft)jamDeleteSelected(room);return;
          }
          if(event.repeat||!jamRoomDialog.open)return;
          const note=jamKeyboardMap[event.key.toLowerCase()];if(note===undefined)return;
          event.preventDefault();jamPress(`key-${event.code}`,note);
        });
        document.addEventListener("keyup",event=>jamRelease(`key-${event.code}`));
        jamRoomDialog.addEventListener("cancel",()=>jamStopPreview());
        jamRoomDialog.addEventListener("close",()=>{jamReleaseAll();jamRecording=null;jamEdit=null});

        document.querySelectorAll("[data-jam-filter]").forEach(button=>button.addEventListener("click",()=>{
          jamFilter=button.dataset.jamFilter;
          document.querySelectorAll("[data-jam-filter]").forEach(x=>x.classList.toggle("active",x===button));jamRender();
        }));
        document.querySelector("#jam-create").addEventListener("click",()=>jamCreateDialog.showModal());
        document.querySelectorAll("[data-close-dialog]").forEach(button=>button.addEventListener("click",()=>document.querySelector(`#${button.dataset.closeDialog}`).close()));
        document.querySelector("#jam-create-form").addEventListener("submit",event=>{
          event.preventDefault();
          const data=new FormData(event.currentTarget),roles=data.getAll("roles");
          if(roles.length<3){jamToast("至少选择三个必需声部");return}
          const pack=JAM_PACKS[data.get("pack")]||JAM_PACKS.pop;
          const room={
            id:`room-${Date.now()}`,title:String(data.get("title")).trim(),pack:data.get("pack"),style:pack.label,
            bpm:Number(data.get("bpm")),key:data.get("key"),accent:pack.accent,stage:"building",
            branchable:data.get("branchable")==="on",parent:null,branchCount:0,
            seats:["harmony","bass","lead","texture"].map(role=>jamSeat(role,roles.includes(role))),
            producer:null,mix:{harmony:70,bass:76,lead:68,texture:55}
          };
          jamRooms.unshift(room);jamSave();jamRender();jamCreateDialog.close();event.currentTarget.reset();jamOpen(room.id);
        });
        document.querySelector("#jam-reset").addEventListener("click",()=>{
          jamStopPreview(false);jamRooms=jamSeed();jamSave();jamFilter="all";
          document.querySelectorAll("[data-jam-filter]").forEach(x=>x.classList.toggle("active",x.dataset.jamFilter==="all"));
          jamRender();jamToast("试玩房间已重置");
        });
        jamRender();


    function navigatePage(page,fromHash=false){
      document.querySelectorAll(".tab").forEach(tab=>{const active=Boolean(tab.closest("nav"))&&(tab.dataset.page===page||tab.dataset.page==="tools"&&["tuner","sound","metro"].includes(page));tab.classList.toggle("active",active);if(active)tab.setAttribute("aria-current","page");else tab.removeAttribute("aria-current")});
      for(const [name,element,display] of [["tuner",ui.main,"grid"],["lesson",document.querySelector("#lesson-page"),"block"],["sheet",document.querySelector("#sheet-page"),"block"],["metro",metroPage,"block"],["jam",jamPage,"block"]])element.style.display=name===page?display:"none";
      document.querySelector("#tools-page").style.display=page==="tools"?"block":"none";
      const toolNames={tuner:"调音器",sound:"响度表",metro:"节拍器"};
      document.querySelector("#tools-back").hidden=!toolNames[page];
      document.querySelector("#tools-current").textContent=toolNames[page]||"";
      document.querySelector("#sound-page").style.display=page==="sound"?"grid":"none";
      if(page==="sound"&&!window.soundMeter){
        document.querySelector("#sound-start").disabled=true;
        const asset=window.siteAssets?.load("sound");
        asset?.then(()=>{if(document.querySelector("#sound-page").style.display!=="none")window.soundMeter.onPage("sound")}).catch(()=>{
          document.querySelector("#sound-status").textContent="响度表载入失败，点击重试";
          const retry=document.querySelector("#sound-start");retry.disabled=false;retry.textContent="重新载入";retry.onclick=()=>navigatePage("sound");
        });
      }
      window.soundMeter?.onPage(page);
      if(page!=="tuner")stop?.();
      tunerPanel?.onPage(page);
      if(page!=="lesson"){window.lessonPlayer?.stop();window.practiceStudio?.stop();}else{
        window.lessonPlayer?.activate?.();
        if(!window.practiceStudio&&window.siteAssets){
          const pending=document.querySelector("#practice-loader");pending.hidden=false;pending.querySelector("button").hidden=true;
          window.siteAssets.load("studio").then(()=>{pending.hidden=true}).catch(()=>{pending.querySelector("span").textContent="创作与伴奏暂时不可用";const retry=pending.querySelector("button");retry.hidden=false;retry.onclick=()=>navigatePage("lesson");});
        }
      }
      if(page!=="sheet"&&page!=="metro"){window.scorePlayer?.pause();window.metronome?.releaseScore()}
      if(page!=="jam")jamStopPreview(false);else window.siteAssets?.warm("tone");
      if(page==="sheet"){
        let directId="";
        if(fromHash&&location.hash.startsWith("#score/")){try{directId=decodeURIComponent(location.hash.slice(7))}catch{}}
        const bound=window.metronome?.getScoreId();
        if(directId)window.scorePlayer?.open(directId,false);
        else if(bound&&!fromHash)window.scorePlayer?.open(bound,false);
        else window.scorePlayer?.showLibrary();
      }
      if(!fromHash){const hash={tools:"#tools",sound:"#sound",tuner:"#tuner",lesson:"#lessons",sheet:"#scores",metro:"#metro",jam:"#jam"}[page];history.replaceState(null,"",location.pathname+location.search+hash)}
    }
    function routeHash(){const hash=location.hash;const page=hash.startsWith("#lick/")||hash==="#lessons"?"lesson":hash==="#scores"||hash.startsWith("#score/")?"sheet":hash==="#jam"?"jam":hash==="#metro"?"metro":hash==="#sound"?"sound":hash==="#tuner"?"tuner":"tools";navigatePage(page,true)}
    document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>navigatePage(tab.dataset.page)));
    document.querySelector("#tools-back-button").onclick=()=>navigatePage("tools");
    document.querySelector(".brand").onclick=event=>{event.preventDefault();navigatePage("tools")};
    window.addEventListener("hashchange",routeHash);
    routeHash();
    document.querySelector("#remote-send").onclick=()=>{const code=document.querySelector("#room-code").value,status=document.querySelector("#remote-status");if(!/^\d{6}$/.test(code)){status.textContent="请输入 6 位房间码";return}location.href=`?mode=member&room=${code}#metro`};
    document.querySelector("#create-room").onclick=()=>{let code=window.siteStorage.getItem("tuner-room-code-v1")||"";if(!/^\d{6}$/.test(code)){code=String(Math.floor(100000+Math.random()*900000));window.siteStorage.setItem("tuner-room-code-v1",code)}location.href=`?mode=host&room=${code}#metro`};document.querySelector("#join-room").onclick=()=>location.href="?mode=member#metro";
    if(isRoomHost||isRoomMember){document.title="房间节拍器｜弦音";document.querySelector(isRoomHost?"#create-room":"#join-room").classList.add("active");document.querySelector('.tab[data-page="metro"]').click();document.querySelector("#metro-room-details").open=true;document.querySelector("#metro-mode-label").textContent=isRoomHost?"房间控制端 · HOST":"房间成员端 · MEMBER";const input=document.querySelector("#room-code"),send=document.querySelector("#remote-send"),status=document.querySelector("#remote-status");input.style.display="block";input.value=roomCode;document.querySelector("#remote-title").textContent=isRoomHost?"房间已创建":"加入房间";if(isRoomHost){input.readOnly=true;send.style.display="none";document.querySelector("#remote-hint").textContent="把这个房间码告诉其他成员；你的拍速和启停会同步到房间";status.textContent="房间已就绪 · 等待成员加入";pushRoomState()}else{document.querySelector(".metro-controls").style.display="none";document.querySelector(".tempo-presets").style.display="none";metroStart.style.display="none";if(!roomTopic){send.style.display="block";document.querySelector("#remote-hint").textContent="输入房主分享的 6 位房间码";status.textContent=""}else{input.readOnly=true;send.style.display="none";document.querySelector("#remote-title").textContent=`房间 ${roomCode}`;document.querySelector("#remote-hint").textContent="拍速和启停由房间控制端同步";status.textContent="正在连接房间…";const stream=new EventSource(`https://ntfy.sh/${roomTopic}/sse?since=10m`);stream.onopen=()=>status.textContent="已加入房间 · 等待控制端操作";stream.onmessage=e=>{try{const envelope=JSON.parse(e.data);if(envelope.event!=="message")return;const data=JSON.parse(envelope.message);setMetro(Number(data.bpm),true);if(data.timeSignature)window.metronome.setTimeSignature(data.timeSignature);if(Boolean(data.running)!==metroRunning)setMetroRunning(Boolean(data.running),false,true);status.textContent=`房间已更新：${data.bpm} BPM · ${data.running?"开始":"停止"}`}catch(err){}};stream.onerror=()=>status.textContent="房间连接中断 · 正在自动重连"}}}

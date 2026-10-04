/* Keep the main site's initial payload small. Fretboard loads the player directly. */
(function () {
  'use strict';
  if(window.floatingBacking)return;
  let context=null,revision=0,request=null,visible=false,notice=null;
  const show=text=>{if(!notice){notice=document.createElement('p');notice.id='backing-loader-status';notice.setAttribute('role','status');Object.assign(notice.style,{position:'fixed',bottom:'20px',right:'20px',zIndex:100,padding:'12px 18px',maxWidth:'calc(100vw - 40px)',background:'#172014',color:'#f2f0e6',border:'1px solid #61794a',borderRadius:'10px'});document.body.append(notice);}notice.textContent=text;notice.hidden=!text;};
  const facade={
    setContext(value){context=value;revision++;visible=false;show('');},
    stop(){revision++;visible=false;show('');},
    close(){this.stop();},resetKey(){this.stop();},
    getState(){return {contextId:context?.id||null,visible,playing:false,loading:!!request,minimized:false};},
    open(value){
      if(value)context=value;visible=true;const token=++revision;
      if(!document.querySelector('link[data-floating-backing]')){const css=document.createElement('link');css.rel='stylesheet';css.href='floating-backing.css?v=20261004-1';css.dataset.floatingBacking='';document.head.append(css);}
      show('正在打开悬浮伴奏…');
      request=window.siteAssets.load('floatingBacking');
      request.then(player=>{request=null;if(token!==revision){if(!player.getState().contextId)player.setContext(context);return;}show('');player.setContext(context);player.open();}).catch(()=>{request=null;if(token===revision)show('播放器未能加载，请再点「悬浮伴奏」重试');});
    }
  };
  window.floatingBacking=facade;
})();

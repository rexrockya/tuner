(function(){
  'use strict';
  const G=window.tunerGenres,S=window.practiceStudio,C=window.tunerCurriculum,page=document.getElementById('lesson-page');
  if(!G||!S||!C||!page||window.genreLessons)return;
  const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const allLessons=C.genres.flatMap(genre=>genre.lessons.map(lesson=>({...lesson,genre:genre.id})));
  function stored(key){try{const value=JSON.parse(window.siteStorage.getItem(key)||'[]');return new Set(Array.isArray(value)?value.filter(id=>allLessons.some(lesson=>lesson.id===id)):[]);}catch{return new Set();}}
  const completed=stored('tuner-genre-completed-v1'),favorites=stored('tuner-genre-favorites-v1');
  const header=document.createElement('section');header.className='genre-selector';header.setAttribute('aria-label','教学音乐风格');
  header.innerHTML='<div class="genre-selector-heading"><h1>风格练习</h1><span id="genre-choice-status" role="status"></span></div><div class="genre-cards" role="group" aria-label="选择音乐风格">'+Object.entries(G.profiles).map(([id,profile])=>'<button type="button" data-genre="'+id+'" style="--genre-color:'+profile.color+'" aria-pressed="false"><strong>'+escape(profile.label)+'</strong><span>'+escape(profile.subtitle.split(' · ')[1])+'</span></button>').join('')+'</div>';
  page.prepend(header);
  const panel=document.createElement('section');panel.id='genre-courses';panel.setAttribute('aria-label','风格课程');panel.hidden=true;page.append(panel);
  const library=document.getElementById('lesson-library-pane');
  const note=document.createElement('p');note.className='genre-library-note';note.textContent='乐句资料库保留 BopLand 的 Jazz / Blues 与 GuitarSet 演奏来源；各风格的原创教学请进入「课程」。';library.prepend(note);
  function render(){
    const selected=S.getGenre(),id=selected||'blues',profile=G.profiles[id],data=C.genres.find(genre=>genre.id===id);
    page.style.setProperty('--genre-accent',profile.color);
    header.querySelectorAll('[data-genre]').forEach(button=>{const active=button.dataset.genre===selected;button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);});
    document.getElementById('genre-choice-status').textContent=selected?profile.label:'历史收藏 · 保留原设置';
    const lessons=data.lessons,done=lessons.filter(lesson=>completed.has(lesson.id)).length;
    panel.innerHTML='<div class="genre-course-intro"><div><h2>'+escape(profile.label)+' 课程</h2><p>'+escape(profile.description)+'</p></div><span>'+done+' / '+lessons.length+' 已练习</span></div><div class="genre-lesson-grid">'+lessons.map((lesson,index)=>{
      const rhythm=lesson.focus==='rhythm',complete=completed.has(lesson.id),favorite=favorites.has(lesson.id);
      return '<article class="genre-lesson"><div class="genre-lesson-meta"><span>'+String(index+1).padStart(2,'0')+' · '+escape(lesson.level)+'</span><span>'+(rhythm?'节奏吉他':'旋律与和声')+'</span></div><h3>'+escape(lesson.title)+'</h3><p>'+escape(lesson.brief)+'</p><div class="genre-lesson-chords"><code>'+escape(lesson.progression)+'</code><span>'+escape(lesson.key)+' · '+lesson.bpm+' BPM · 4/4</span></div><details'+(index===0?' open':'')+'><summary>练习步骤与听辨</summary><ol>'+lesson.steps.map(step=>'<li>'+escape(step)+'</li>').join('')+'</ol><p class="genre-listen-title">听什么</p><ul>'+lesson.listenFor.map(item=>'<li>'+escape(item)+'</li>').join('')+'</ul>'+(lesson.manualTechnique?'<p>'+escape(lesson.manualTechnique)+'</p>':'')+'</details><div class="genre-lesson-actions"><button type="button" data-open-lesson="'+lesson.id+'" data-target="'+(rhythm?'backing':'create')+'">'+(rhythm?'练节奏吉他':'生成练习乐句')+'</button><button type="button" data-open-lesson="'+lesson.id+'" data-target="'+(rhythm?'create':'backing')+'">'+(rhythm?'加练旋律':'练伴奏')+'</button></div><div class="genre-lesson-progress"><button type="button" data-complete-lesson="'+lesson.id+'" aria-pressed="'+complete+'">'+(complete?'✓ 已练习':'标记已练习')+'</button><button type="button" data-favorite-lesson="'+lesson.id+'" aria-pressed="'+favorite+'">'+(favorite?'★ 已收藏':'☆ 收藏课程')+'</button></div></article>';
    }).join('')+'</div><p class="genre-course-note">步骤是你需要完成的演奏任务；生成器提供可变化的原创练习材料。所有风格支持变调、变速、分轨音色与音量、小节循环；原创乐句可看 TAB／五线谱、收藏和导出 MIDI。'+(id==='folk'?'当前示范使用干净电吉他音色。':'')+'</p><details class="genre-sources"><summary>教学参考与音源</summary><p>谱例与生成规则为原创教学材料，不是既有歌曲转录。Synth 音色与电子鼓为程序合成；其他吉他音色沿用真实电吉他采样。</p>'+C.sources.filter(source=>data.sourceIds.includes(source.id)).map(source=>'<a href="'+escape(source.url)+'" target="_blank" rel="noopener">'+escape(source.title)+'</a>').join(' · ')+'<p><a href="assets/audio/blues/credits.html" target="_blank" rel="noopener">采样来源</a> · <a href="assets/audio/electro/README.md" target="_blank" rel="noopener">电子鼓制作说明</a></p></details><p class="genre-storage-state" id="genre-storage-state" role="status"></p>';
    panel.hidden=S.getMode()!=='courses';
  }
  header.addEventListener('click',event=>{const button=event.target.closest('[data-genre]');if(button)S.setGenre(button.dataset.genre);});
  panel.addEventListener('click',event=>{
    const open=event.target.closest('[data-open-lesson]');
    if(open){const lesson=allLessons.find(item=>item.id===open.dataset.openLesson);if(lesson)S.openLesson(lesson,open.dataset.target);return;}
    const complete=event.target.closest('[data-complete-lesson]'),favorite=event.target.closest('[data-favorite-lesson]');
    if(!complete&&!favorite)return;
    const id=complete?complete.dataset.completeLesson:favorite.dataset.favoriteLesson,set=complete?completed:favorites;
    if(set.has(id))set.delete(id);else set.add(id);
    const saved=window.siteStorage.setItem(complete?'tuner-genre-completed-v1':'tuner-genre-favorites-v1',JSON.stringify([...set]));
    render();const selector=complete?'[data-complete-lesson="'+id+'"]':'[data-favorite-lesson="'+id+'"]';panel.querySelector(selector)?.focus();
    if(!saved)document.getElementById('genre-storage-state').textContent='本次已记录；浏览器未能保存到本机。';
  });
  window.addEventListener('tuner:genre-change',render);
  window.addEventListener('tuner:practice-mode',()=>{panel.hidden=S.getMode()!=='courses';});
  render();if(!/^#lick\//.test(window.location.hash))S.setMode('courses');
  window.genreLessons={render,lessons:allLessons};
})();

# 组合练习验收 — 2026-09-08

## 范围

已实现用户四组需求：鼓/风琴/节奏吉他风格与每轮收尾fill；风琴/节奏吉他含None下拉；五轨音色与音量、Lead扩展钢琴/小提琴/三类吉他；整页默认TAB与实音高五线谱切换。保持原站、原库、原时钟及上一版工具。完成文档后沿用授权提交和发布。

## 实现

`practice-arrangement.js`拥有编配，与音色分离。按四轮选型，最后1–2拍fill替换原声部对应片段；固定风格也有轮间填句变化。根音/转位/短和弦受保护，重复同音剪尾，不在和声或歌曲边界外发声。auto鼓按各feel候选池及整体swing，显式风格允许对比。原创四轮计划重复同一句Lead，不生成四套不同旋律。

`practice-timbres.js`仅在Lead钢琴/小提琴时动态导入，保留原score音区与力度映射及小提琴延音准备。调度、Gain、Voice均归practice同一个AudioContext与绝对时钟，加载本身不resume/发声。UI选择音色先pause保留位置，准备好后手动播放。每轨三种patch，Lead五种选择；吉他/鼓/Bass patch是既有录音的播放处理，不是新增录音。新音色映射、播放器与许可入口都保留出处。

`practice-notation.js`按需复用OSMD，实音高音谱号。新增原创建谱的notationDuration保留写作时值，实际duration仍控制演奏门长；旧句根据起音/和弦边界推断网格并显示短音记号。TAB默认，全局切换不改旋律或时钟。手机局部滚动，跟随音符/小节；旧渲染不能覆盖新句或重开已隐藏的谱面。

## 验证

完整`npm test`通过，包含下列新增覆盖和全部既有库/乐谱/工具/音高/响度46标准信号回归。

- 编配：1440种组合，8feel、所有风格、1/7小节与每小节4和弦、转位Bass、None、合法时值、边界、每轮fill、单轨独立、seed。另256 feel/seed验证auto鼓镲片实际节奏网格与显式覆盖；原8feel鼓指纹区分回归保持通过。
- 音色：复用真实钢琴region（例如69/.72对应原Mp A3），相邻音区共享、按需下载、失败重试；小提琴使用原本地编码且只decode两条所需音，高音持续循环采用原处理。真实Transport路径中sample.buffer、每轨滤波/波形/驱动节点、时间、静音及latest选择竞态均验证；非扬声器录音测试。
- 五线谱：真实OSMD渲染，所有原作pitch/onset与小节拍数、休止/附点/连线、64分网格、旧收藏、Swing说明；鼠标/键盘定位，高亮、逐音/小节局部跟随，375/844宽及resize，隐藏/迟到取消。
- 整合UI：各轨风格/音色，None与音量数值；四轮同Lead，谱面整体切换/模块迟到/离开再进入/缓存，音色先暂停保留位置、旧选择不清掉新loading，MIDI program、小提琴及风格收藏恢复。
- 实测修复：dirty和声换风格原会将旧3小节旋律套到新1小节进程，产生越界Lead事件。现在仅保留风格选择，播放仍禁用，提示先生成；回归已通过。
- 全站原有取消、50轮时钟、存储故障、乐谱渲染/音色覆盖等均保持通过。仅docs/测试/文档改动，不构建或部署Worker。
- 首屏HTML+JS/CSS按LF和独立gzip6为 109761 B，低于120000 B，明细见 `ensemble-resource-budget-2026-09-08.json`。新的编配/音色/OSMD均不在初始工具页下载。

## 边界与来源

未在实体手机/耳机/扬声器上自动试听，也未新增浏览器操作或截图QA；真实OSMD渲染与jsdom控件回归不能等同实机听感/触控。钢琴沿用乐谱已有的外部采样服务；小提琴沿用本地soundfont。谱面最小宽度保持可读，通过局部横向滚动适配手机。MIDI只导Lead，音色对应GM program，不嵌入采样或导出全套伴奏。

钢琴来源核对：https://github.com/sfzinstruments/SplendidGrandPiano （AKAI public-domain采样、kinwie映射）。吉他/鼓/Bass及小提琴原出处与许可分别在 `docs/assets/audio/blues/credits.html` 和 `docs/assets/audio/credits.html`；本轮补齐前者的新音色说明。

## 发布记录

目标仍为https://rexrockya.github.io/tuner/，GitHub Pages main/docs。提交、构建及实际HTTP内容校验将在完成后补记。

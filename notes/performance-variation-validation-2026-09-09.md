# 创作演奏变化验收 — 2026-09-09

## 范围

本轮面向「创作」补充 Lead 演奏律动、双音／和声 Voicing、每轮 progression 的乐句与密度变化，以及新的 Lead 音色；同时为创作和伴奏加入可复现的人性化时间、力度、音高、声像与房间处理。保持原和声解析、4 轮伴奏计划、绝对 AudioContext 时钟、下一安全小节线切换、本机收藏和唯一 GitHub Pages 入口。

## 用户可见行为

- 「乐句律动」有跟随整体、Straight、Swing、Shuffle、Pocket、Laid-back 六项。跟随整体保留此前按伴奏 feel 摇摆的行为；其他选项独立控制 Lead，不改鼓、Bass、键盘和节奏吉他事件。
- 「复音织体」有单音旋律、双音点缀、和声 Voicing。双音在适合的起音增加一个和弦音，Voicing增加两个；不是每个短音都强制叠音。附加音使用当前和弦、不同琴弦、合法品位和可控把位跨度。
- 「每轮乐句」有固定重复、每轮随机切换、指定顺序。UI固定规划4轮并循环；指定顺序默认问答、动机发展、留白、留白。随机按seed复现，避免相邻轮及第4／第1轮接缝重复。
- 「每轮密度」可保持所选密度或按seed随机。随机流与乐句写法随机分离；选择固定密度作基准时从该档和相邻档选择，自动基准覆盖稀疏、适中、密集、繁密四档。每轮变化体现为实际起音、休止和时值变化。
- 启用乐句或密度轮间变化后，停止时可从「当前乐句」查看第1–4轮TAB或五线谱，并从该轮点选试听；播放时谱面随当前轮自动切换，轮次选择暂时锁定。
- Lead新增「爵士琴颈 · 圆润」「Blues · 边缘破音」「歌唱延音 · 压缩」；与暖净音、亮净音、厚过载、干净短奏、空间延音、大钢琴和小提琴合计10项。

默认的固定重复、固定密度、跟随整体和单音织体继续使用同一条已写乐句，不因4轮计划产生四份不同旋律。新Lead选项只出现在创作页，伴奏页不虚构Lead声部。

## 数据、谱面与导出

`practice-arrangement.js`以每个起音的主音符加可选`companions`表达复音。这样默认单音对象与旧生成指纹保持一致，同时播放前可把一个起音展开成多个声部。每个附加声部有独立MIDI音高、弦、品、力度和发音元数据；最多两个附加声部。

TAB在同一拍绘制并高亮全部声部。MusicXML先写主音，再为附加声部写带`<chord/>`的音符，不为同一组复音重复推进拍位。直写谱保持原起音网格；Swing、Shuffle、Pocket和Laid-back属于演奏映射，由谱面说明表达。

新收藏为version 3，包含精确4轮`leadCycle`、每轮phrase快照、指定顺序、Lead律动、织体和密度模式。现有存储键、50条上限与本页暂存降级不变。v1旧生成记录及v2单句快照继续读取，缺失新字段时使用repeat、fixed、follow、single，不回写或破坏旧记录。

MIDI仍只导出Lead：

- 固定重复＋固定密度仍是一轮 progression；即使选择双音／Voicing，也不无故复制成4轮。
- 随机／指定乐句或随机密度导出完整4轮，并包含每个复音声部。
- MIDI起止点使用所选Lead律动，并按当前BPM写入可复现的力度、微时差及复音拨弦错开；吉他program随音色映射，但采样滤波、压缩、房间、detune和所有伴奏声部不写入文件。

## 听感处理与来源

伴奏各轨加入按seed复现的轻微起音延后、力度浮动和可用音高detune；六种流派专用的电子、Funk、Shoegaze、Folk与R&B声部也在生成处应用同一套确定性处理，旧编配事件不重复处理。Lead再根据所选律动加入细微jitter，复音声部依次错开，避免所有音头完全重合。音频总线设置克制的左右位置与房间send，房间脉冲响应延长至0.42秒；Bass保持居中且不发送房间。采样播放优先采用asset自身`ampRelease`，避免钢琴尾音被统一乐器release覆盖。

本轮没有新增音频文件。三个新Lead吉他音色使用现有Karoryfer Shinyguitar CC0真实录音，以滤波、EQ、驱动、包络和压缩形成不同颜色，不代表三套新录音。鼓、Bass、吉他仍以既有采样为主；同日交付的Electro鼓、Synth Bass与Synth Keys按所选音色使用采样或合成，大钢琴和小提琴复用乐谱音源及其原许可／加载边界。

因此可以陈述为「真实采样＋程序化人性化与空间处理」，不能声称整套伴奏是真人同期实录，也不能仅凭节点参数证明已达到商业 backing track 的主观质感。

## 自动验证状态

以下状态来自最终功能工作区；发布事实单独记录在下一节：

| 检查 | 当前状态 |
| --- | --- |
| `node --check`：practice-arrangement、practice-audio、practice-notation、practice | 已通过 |
| `tests/practice-performance.cjs`：4轮计划、独立随机流、复音和弦音／弦品、律动映射、humanize、MusicXML、UI、v3收藏、完整4轮及演奏微时差MIDI | 已通过 |
| `tests/music-genres.cjs`交叉回归：6流派4轮Lead持续透传genre，全部流派专用声部具有限定微时值与可定音detune | 已通过；包含于2,520组生成矩阵 |
| 既有practice生成、变化、编配、谱面、控件回归 | 已分别通过 |
| 每种织体25,200组生成抽查：5类和声、12调、全部风格／密度、12个seed，double与voicing至少一个合法复音落点 | 已通过，double 0缺失、voicing 0缺失 |
| 最新`tests/practice-timbres.mjs`新增声像、时间偏移、键盘detune及新patch断言 | 已通过 |
| 最终`npm run test:practice` | 已通过 |
| `npm run test:qa`与120,000 B首屏gzip6预算 | 已通过；116,175 / 120,000 B，20个首屏资源 |
| `npm run test:sound` | 已通过；46 / 46响度标准检查通过 |
| 完整`npm test` | 已通过 |
| `git diff --check`、精确暂存检查 | 已通过；仅暂存本轮源码、测试与文档，排除`node_modules/`及`website/site.tar.gz` |
| 实体设备、耳机／扬声器、蓝牙与盲听A/B | 未执行，保留为人工验收 |

测试验证的是确定性生成、合法音符、数据一致、调度参数和界面状态，不是麦克风录音或声学测量。模拟AudioContext不能证明不同浏览器／设备上空间宽度、压缩和尾音一定相同；非负时间偏移也不等于真实乐手的全部提前／拖后行为。

## 性能与发布状态

新增编配和Lead计划位于教学按需脚本，没有新媒体、后台服务或第三方运行时。合并缓存版本为`20260909-performance-2`；`npm run test:qa`实测首屏为116,175 / 120,000 B gzip6，共20个资源，余量3,825 B。

功能提交`8e5d4e91e9d037614176b0174fd1cce22a99707b`已推送到`main`。GitHub Pages在2026-09-08 19:02:56 UTC（北京时间2026-09-09 03:02:56）将该提交标记为`built`，`error`为`null`。正式站唯一入口及`asset-loader.js`、`music-genres.js`、`practice-arrangement.js`、`practice-audio.js`、`practice-notation.js`、`practice.js`、`practice.css`均返回HTTP 200；逐个按Git blob算法计算远端字节哈希，与该提交完全一致。发布只使用`main/docs`和唯一公开入口 https://rexrockya.github.io/tuner/ ，没有运行根`npm run build`覆盖`docs/`，也没有增加临时预览或API入口。

# 弦音项目交接

## 当前交付：2026-09-08 自动音符密度

本节覆盖旧版“演奏强度”名称与默认值；此前音色和连续播放实现继续保留。

- 原创「音符密度」新增auto并默认选择。固定四档保留easy/standard/advanced/challenge IDs，界面为稀疏·多留白、适中·均衡、密集·流动、繁密·音群。帮助文字只解释用音与留白；不增加额外图表或技法等级。
- `generateAutoDensity`独立分支，按小节规划再取同seed的已有密度材料。问答每两小节一繁一简，种子决定先后；动机保留两音节奏/和弦关系核心，逐渐发展，末句适中收束。其余风格保留各自语汇与展开/呼吸位置。不是每小节独立抽签换难度。
- 自动音符统一到.25拍起音网格，连续重排音域/指法，修正不合法slide；不跨和弦、不叠旋律，末根至少半拍并延续到段尾。arpeggio只用当前和弦音。`densityPlan`记录每bar的style/level/role/实际count，motif另有motifCore；无需在UI绘图。
- 底层generate省略/未知intensity仍走原standard，legacy优先；旧四档完整结果哈希保持不变。UI仅新create草稿默认auto，旧收藏缺失/未知值恢复standard并保留原音符；字段名和控件ID不迁移。
- 新密度沿用现有同seed编辑、资源准备和下一安全小节线提交；准备期间旧乐句/和声继续，伴奏、音色、BPM与播放位置不受密度改变影响。自动旋律写成后仍原样复用于四轮伴奏，不在每Loop偷偷重写。
- 新`practice-auto-density.cjs`覆盖1680确定性边界案例、224首音乐结构检查、1344旧四档完整输出指纹；原固定四档8064案例继续明确只跑原四档。UI/live回归覆盖auto草稿/收藏、同seed、独立伴奏、谱面/MIDI一致与小节线提交；真实OSMD增加auto动机八小节渲染。
- 最终完整npm test通过，独立审查无阻断；没有新增实体手机主观试听。
- 缓存版本`20260908-density-1`更新index内harmony/loader与loader内practice。无新依赖、采样或后台；首屏gzip6为114735/120000B。验收见`notes/density-validation-2026-09-08.md`。
- 发布沿用已授权的main/docs和原GitHub Pages。不要构建website覆盖docs或部署其他站点；精准暂存排除node_modules并保留历史stash。

## 上一版：2026-09-08 音色平衡与厚实电贝斯

- `practice-timbres.js`只对practice小提琴缓存增加asset.level：.08–.6秒跨声道平均RMS目标-24dBFS，whole-buffer峰值限-6dBFS、增益<=8。窗外强峰/短热样本也受限，纯零为1；每次decode只测一次。不改原MP3、score-audio或原有延音交叉淡化。Lead violin乘1.65，不能再次无依据叠加全局增益。
- `practice-audio.js`原吉他ID warm/bright/crunch保留，两轨统一新Studio处理：HP→宽低中频EQ→tanh饱和→LP→每音压缩→voice gain→原bus。三个输出trim分别.58/.58/.44；均加入extra清理。主compressor参数不变，之后新增.84固定输出余量，约-1.51dB，不是硬限幅或所有曲目的无削顶保证。
- 新Bass precision「P 风格 · 厚实指弹」为独立Swagbass录音（Ibanez BTB-400QM、颈拾音器、平绕弦），不要说Fender实采。`assets/audio/modern-bass/`16样本：8根MIDI27/30/33/36/39/42/48/54×2RR、f单力度层、4秒44100mono16bit；同根两RR共同增益、尾.12s渐弱。FLAC总1366183B，WAV回退5646048B；CC0、README、源固定SHA及逐文件hash齐全。
- 新库通过ensureSelection在选中且events含bass时加载，绝不塞进旧preload/初始页面；失败重试共享成功缓存、并发去重。Bass事件增加确定性的variant=(i+chordIndex+chorus)%2，不改变旋律/节拍。音色准备/小节线提交与取消继续沿用上一版；停止选择失败恢复previous，过时失败不得覆盖新选项。
- 原Bass round/bright/muted保留，前两者补低中频与适度电平；P音色选自「音色与音量」里的Bass下拉。默认仍round，旧收藏IDs有效。新采样仅单f力度层，力度仍由演奏包络控制，不能称多力度采样库。
- 新`practice-tone-balance.mjs`与`practice-modern-bass.cjs`加入npm test；涵盖静态校准/缓存/原PCM、16采样哈希/真实RR/根音映射、lazy/回退/并发/失败重试与future候选撤销。三个旧音频mock补createWaveShaper接口，正常音色路径确实使用新增节点。
- 最终完整npm test通过；23个离线case零越界采样、最高-1.151dBFS，小提琴固定句较旧版+13.01dB。
- 离线真实图验证与实机试听分开；native Node WebAudio的未来setTarget数值问题用经逐采样校验的解析包络适配，不能把这称作浏览器实机。数据/方法/最终发布证据见`notes/tone-validation-2026-09-08.md`；首屏gzip6 112853/120000B。
- 功能提交`10ca585`已发布；44个更新前端/采样/许可资源共7190730B在线HTTP200并与Git逐字节一致，见本次online-verification。
- 缓存`20260908-tone-1`更新asset-loader、practice-audio、practice-arrangement、动态practice-timbres；index仅改loader版本。沿用main/docs提交发布授权，不构建website，不另建站；排除node_modules，保留历史stash。

## 上一版：2026-09-08 连续播放与小节线切换

本节覆盖下方旧版“换音色/强度暂停”和“dirty暂停”的记录；已播放版本与待切换版本必须独立。

- `practice-audio.prepareTimbres(selection,events)`只预热完整音色快照及所有新音高；`commitTimbres`同步激活。Transport捕获activeTimbres，不能直接用正在编辑的全局下拉或异步setTimbre影响旧音乐。
- `queueUpdate(song,{timbres,bpm,onCommit,onCancel})`不pause/load/重置generation。下一安全四拍边界取当前时间+140ms及已调度首音之后；双游标先排旧计划到边界前、再排新计划。保留当前轮/小节，新长度取模；非循环最后一小节不延长。BPM也只在边界改变。
- `voiceScope`标记候选声音；撤销只停止候选源并立即补旧首拍，不能全局silence或改变旧hat尾音。越过实际AudioContext边界才提交，先补满调度窗口再调用可能耗时的谱面回调。晚取消应先承认已听到的提交，不能回滚。
- `practice.js`的activeSettings/parsed/phrase负责当前声音与谱面，liveDraft/liveRevision负责最新完整设置。并发修改以最后选择胜出；失败继续旧音乐并有重试。准备/等边界/失败期间可暂停，保存/MIDI禁用避免混合快照。
- 创作/伴奏音色、各轨风格、乐句/强度、生成、和声调性预设、收藏、律动与BPM共用路径；单纯伴奏/音色变化保留最新候选旋律。收藏五声部与BPM一次准备，不能逐轨中途生效。播放高亮/谱式新开使用activeFeel至提交。
- 编辑输入继续旧版本播放，未生成时改风格只记录选择，改音色拒绝并恢复实际选项；生成成功才排队。停止状态generate统一补齐未生效音色。暂停/导航/定位/循环改变取消pending并恢复activeControls；晚加载不会再启动。
- 新`practice-live-clock.cjs`11组实际音频调度测试与`practice-live-controls.cjs`真实UI脚本受控异步测试已纳入npm test；旧强度测试改为停止态编辑，live行为由新测试覆盖。旧practice首个140ms内风琴断言明确选择pad，避免随机反拍风格造成偶发失败。
- 最终完整npm test通过，含真实OSMD与46项响度标准信号。功能提交`f2eec02`已发布并核对5个前端资源逐字节一致，见本次online-verification。
- 资源缓存版本`20260908-live-1`只更新index/asset-loader/practice-audio/practice/practice.css；无新依赖、采样或后台。首屏gzip6 112849/120000 B；验收与发布证据见`notes/live-switch-validation-2026-09-08.md`。
- 继续沿用原GitHub Pages main/docs发布授权，不构建website覆盖docs，不部署其他站点；精准暂存排除node_modules并保留历史stash。

## 上一版：2026-09-08 原创乐句演奏强度

- `harmony.phraseIntensities`四档easy/standard/advanced/challenge，元数据label/description；`generate(...,{intensity})`仅对非standard进入派生函数。standard完整对象/notes与此前相同，legacy优先且完全不变，未知值回standard。
- 非标准档从同seed原风格句派生，独立RNG；easy正拍少音、4–8品、相邻<=7半音/跨弦<=2，picked。easy非尾音最低MIDI58（不可退57，会在部分调连续属七尾根变三音），尾音候选54–72。advanced/challenge增密，保留动机与至少局部呼吸，同弦1–2半音才slide，长音vibrato；全句<=256、最短起音.25拍、保留notationDuration、根音收束和和弦边界。
- `practice-intensity`在乐句风格后，仅create显示。改变强度/风格使用same-seed重写、暂停、保留BPM/音色/伴奏；dirty共同保护，不自动生成。草稿与收藏存item.intensity，去重包含强度；旧收藏回standard不改快照。技法播放仅复用吉他原有处理，非新增采样、推弦或MIDI技法曲线。
- 密集TAB新增tab-scroll/tab-paper，按同弦最短间隔预留28px，局部可滚，当前音变化时只做本视口水平跟随。默认未密集小节不强制放大；隐藏TAB不滚动。强度不改谱面模式或播放时钟。
- 新tests/practice-intensity-generator.cjs与practice-intensity-controls.cjs已入npm test；8064生成组合、各档密度阶梯、收藏/草稿/dirty/音色/BPM与伴奏不变、MIDI/谱面一致、模拟密集TAB滚动通过。practice-notation另增四档7风格数据与真实OSMD挑战8小节渲染。完整npm test通过。
- 验收详见notes/intensity-validation-2026-09-08.md与资源预算；首屏gzip6 112806/120000 B。仅原docs/测试/文档，沿用原站发布授权，仍不得构建website覆盖docs或部署其他公开域名。

## 上一版：2026-09-08 数字和声输入修复

- 用户输入以数字为主，逗号/中文逗号分小节，同小节空格分1/2/4和弦。无显式分隔时仍每空格一小节；竖线/连字符兼容。全串纯数字不再限8位，但合法数字后缀优先：57=G7，5,7=G与Bdim；37=E7，小七显写3m7。数字裸级数保留调内三和弦，b7/#4支持变音级数。
- `harmony.parse(value,key,{legacy:true})`原样保留旧8位连写和数字隐含性质，来源库matches候选继续走legacy，小写b7仍B7；底层chord的来源音名识别不变。不要用新输入语法重解来源或未标版本的旧收藏。
- 新收藏`harmonyVersion:2`与旋律version独立。未标记者用`upgradeInput`比较实际根音/bass/intervals/family/节拍；有变化才转明确Roman与后缀。保留括号升降、隐含minor/dim、slash bass与大小写；绝对音名首字母转大写避免b7歧义。后续换风格、切模式、再次保存都用转换后的文本。
- 解析/输入maxlength/收藏text校验统一512字符，legacy解析仍256；16小节和32和弦数量限制不变。旧16bar/32chord收藏转换后会超过旧256，不能收紧回去。
- practice输入下原生折叠「和声怎么输入」，三组填入示例不自动生成/播放；数字逗号预设。dirty清旧error/aria-invalid后暂停，防止截图中旧后缀错误在新输入下残留。
- 新tests/harmony-input.cjs与practice-input.cjs已加入npm test。完整回归通过，最终边界修复另跑相关输入/界面/全库/shell回归；见notes/harmony-input-validation-2026-09-08.md。只改docs、测试和文档，不构建website、不部署Worker；沿用此前提交发布授权与原GitHub Pages入口。

## 上一版：2026-09-08 伴奏风格、音色与五线谱

- 本轮沿用用户此前明确的测试、文档、提交和发布授权；公开入口仍仅 https://rexrockya.github.io/tuner/ ，不另建后端或公开站。
- `practice-arrangement.js` 独立编配模块必须在 practice-audio 之前加载。导出鼓7类、风琴5类、节奏吉他5类风格；风琴/吉他含none，各轨auto按四轮选择、相邻轮及循环接缝避免重复。每progression最后1–2拍用对应fill替换原轨部分，非堆叠打击。改变一轨不随机重写别轨。auto鼓服从整体律动，显式鼓风格可有意形成对比。
- 原创也使用四轮伴奏计划，Lead原句逐轮原样重复；五线谱/TAB始终显示同一条原句。关循环仍在当前progression末停止；单节仍只循环所选小节。不可改为四套旋律或破坏现有绝对AudioContext时钟。
- `practice-audio.js` 导出 timbres/getTimbre/setTimbre。每轨三种音色，Lead另有piano/violin。UI先pause保留位置，选择音色不自动resume；按播放试听，加载失败按播放或重选重试。异步请求最新选择胜出、迟到请求不发声。混音器标签不折成逐字竖排。
- `practice-timbres.js` 是按需ES模块，只有钢琴/小提琴会载入。共享scoreAudio的钢琴原音区/力度映射及小提琴延音处理，缓冲和声音归practice管理；不得实例化另一个谱面播放器/时钟。钢琴只下载所需音区/力度，小提琴下载已有本地soundfont而只解码所需音；与原乐谱一样钢琴仍有外部采样下载依赖。吉他/Bass/鼓的多种patch使用旧录音的滤波、包络、轻驱动等处理，不声称新增录音。
- `practice-notation.js/.css` 提供整页TAB/实音高五线谱切换，TAB默认。staff模块和OSMD仅选staff后加载。五线谱高音谱号实音、不作吉他低八度；Swing直写加说明。新生成note含notationDuration，duration仍是演奏门长；旧v1生成器完全保留，旧收藏缺谱值时从相邻起音和和弦边界推断。休止/附点/连线、最小64分音符均可表示。
- 谱面不改phrase/音频时钟，保留点击/键盘定位、高亮、小节/逐音局部滚动。setVisible(false)必须取消迟到渲染；顶层返回教学调用practiceStudio.activate恢复已有选中谱面。前后台/退出不能重新绘制隐藏谱。
- 收藏继续v2音符快照，新增drumStyle/keyStyle/rhythmStyle/timbres，旧rhythm:false迁移none。MIDI仍只导Lead；program随钢琴0、小提琴40、轻驱动29/其余吉他26选择变化。编辑和声后风格切换只记选项、保持待生成，禁止旧phrase配新长度和声。
- 新验证：practice-arrangement 1440组合与256节拍网格、practice-timbres真实映射/调度/竞态、practice-notation真实OSMD与手机尺寸/取消、practice-controls整合切换/收藏/MIDI；均入npm test。完整回归已通过；详情 `notes/ensemble-validation-2026-09-08.md`。继续保留120000B首屏gzip6预算和按需加载。


## 上一版：2026-09-08 音乐工具与乐句扩展

用户本轮已明确授权完成设计、更新文档、合并提交并公开发布至原 GitHub Pages；不要再次索要发布确认。此前“仅本地预览/未获授权”记录已被本轮授权覆盖。公开入口仍仅为 https://rexrockya.github.io/tuner/ 。

- 原创乐句：6 种写法（问答、动机、Blues 转句、琶音、切分、留白）加混合模式；8 种独立节奏配器；6 种 Bassline 加按完整乐段随机；独立节奏吉他声部。变化节奏、Bass 和节奏吉他不重写主旋律。新收藏保存音符快照，旧 v1 收藏调用旧生成器复现。MIDI 仍只导出主奏音符，不导出完整采样伴奏。
- 吉他：24 个真实 Shinyguitar 拱面电吉他拾音器采样，6 根音 × 2 力度层 × 2 次独立录音。新增 FLAC 1,470,455 B、WAV 回退 6,352,272 B；保留 CC0 原文、固定源版本、逐文件根音与哈希。主奏与节奏吉他分别混音；高频收敛、克制的滑音/颤音。风琴仍是合成音源，不误称全部声部是真人录音。
- 乐句库：2,525 条 BopLand 加 20 条 GuitarSet 真人木吉他录音/TAB，总计 2,545。GuitarSet 为 10 次演奏各 2 个不重叠 4 小节节选（5 种风格、2 位演奏者），谱面由原始音符/弦/时间标注生成；CC BY 4.0 与作者、修改说明完整。不能说新增 20 种和声或经典电吉他转录。来源索引/媒体按需加载。换另一条乐句恢复其原速；重复选择、收藏重绘不清掉练习速度。
- 响度：默认 LUFS 模式，BS.1770-5 K 计权/声道能量求和；M 400 ms、S 3 s、I 双门限、LRA 与 4 倍过采样 dBTP。`loudness-dsp.js` 内部 10 ms 最大值窗口、100 ms 门限步长；I/LRA 用精确能量顺序统计树避免反复扫描整场历史。仅支持单声道/立体声路径，未获仪表认证。
- “现场声级”保留 A/C/Z、Fast/Slow、Leq/SEL 与校准估算 SPL。其立体声能量平均和 LUFS 求和有意不同；校准不改变 LUFS/dBTP。输出采集无法校准为扬声器 SPL。暂停只暂停节目累计，实时 M/S 与现场声级继续；恢复后分别等完整 400 ms/3 s 再计入 I/LRA。LRA 前 60 秒明确提醒不稳定。
- 频谱改为对数频率 Canvas 曲线；新增最多 120 秒 M/S 轨迹，无独立动画循环，绘图分辨率上限 2×。停止保留最后显示快照，界面每 4096 帧更新（44.1/48k 约 93/85 ms）；不足一次刷新的末尾不计入保存结果。FFT 仍是工程近似，不是场地传递频响。
- 调音器：`tuner-ui.js/.css` 负责空闲音高环、440/441 Hz 偏好与标准音、手动下一级音高时间轴。启动不创建音频/麦克风；标准音与采集互斥。时间轴 640 点环缓冲、12/30 秒窗口、音名网格、失声空隙、暂停画面/清空；检测依然是单音 YIN（约 55–1200 Hz），不支持复音分离或音频编辑。退出/后台停止声音和采集。
- 首屏 12 个 defer 脚本；首次进入教学再顺序载入 practice-audio/practice，首次进入响度再载入 sound-meter，DSP 只进入 AudioWorklet。保留 120,000 B gzip6 预算。`navigatePage` 必须停掉离开的 practiceStudio，覆盖品牌、hash 和标签三种导航。
- 测试新增 `practice-variety`、`lesson-supplemental`、`tuner-ui`、`feature-loading`、`loudness-standard`。完整验收、独立 FFmpeg 数据与实机限制见 `notes/music-tools-validation-2026-09-08.md`。素材复现与验证见 GuitarSet/音源目录的许可及 manifest，不删除出处。
- 仅 `docs/`、测试与文档变化，不构建/覆盖 `docs/`、不改 Worker、不新增公开域名。保留 pull 前备份 stash；精准暂存，不提交 node_modules。最终发布状态以后述验收记录为准。

下面为历史决策与维护约束；与本节冲突的旧数字和界面描述以本节为准。

更新时间：2026-09-08（QA 复核迭代）。需求与边界见 [PRD.md](PRD.md)，测试证据及发布判断见 [QA 与性能报告](notes/qa-performance-2026-09-08.md)。

## 部署事实

- 唯一公开入口：https://rexrockya.github.io/tuner/
- GitHub Pages 发布 `main` 分支的 `docs/`。`docs/` 是现行完整前端，不能用 `website/dist` 覆盖它。
- `website/` 是可选 Worker/账号与房间相关实现。根 `npm run build` 构建它并复制到根 `dist/`，**不是**生成 Pages 的 `docs/`。
- 存在 `.openai/hosting.json` 不代表允许切换公开域名或重新托管。不要向用户交付其他公开入口。

## 2026-09-08 教学与界面迭代

- 教学分为乐句 / 创作 / 伴奏。和声筛选支持数字、罗马数字、和弦名、半减七等别名及跨调。`docs/assets/licks/guitar-index.js` 是带来源说明的 BopLand CC BY-SA 4.0 索引快照；谱图与示范 MP3 仍从源站加载。
- `docs/harmony.js` 负责解析、匹配及有种子的原创规则作曲；数字使用大调级数参照，变音显写。已有素材与原创练习句独立，不宣称算法写出的句子是经典转录。
- `docs/practice-audio.js` 用绝对 AudioContext 时钟播放鼓/Bass/风琴/吉他：调度器每 25 ms 检查未来 140 ms 的事件，热播放计划首音在当前时刻后 25 ms。三者含义不同，也不等于扬声器首音延迟。沿用乐谱的点选、变速、循环交互及调度方式，未更改旧乐谱时钟。关循环在当前和声轮末停止；四轮配器变化在循环中展开。
- `docs/practice.js` 提供原创 TAB、小节选择、音量、MIDI、本机收藏。收藏键 `tuner-original-licks-v1`（最多 50 条）；不云同步。采样、元数据随 Pages 自托管，无新后台。
- `docs/assets/audio/blues/` 优先加载 12 个 FLAC，共 1,031,145 B；保留 12 个 WAV（3,070,296 B）作下载/解码失败回退，解码 PCM 校验一致。根音 manifest、CC0 原文、逐文件来源与处理记录齐全。不要移除许可或改用未明确授权音源。
- 删除音阶训练及其 JS。精简标题、提示、开关文案；状态通过 `.on` / `aria-pressed` 保留。房间节拍器折叠为次级入口，旧全局 `.lesson-kicker` 误写已改为专用 ID。
- 新样式 `docs/practice.css` 最后加载。更新功能时同步更新 `index.html` 中相应脚本查询版本。
- `npm run test:practice` 检查完整库 615 种和声、原创建谱/收藏/MIDI、采样文件、音频取消与 50 轮循环；已加入 `npm test`。最初功能记录见 `notes/validation-2026-09-08.md`；后续完整 QA 以本文件顶部的新报告为准。

## QA 复核后的修正与性能约束

- 报告复核确认存储拒绝或容量已满会中断多个模块初始化，不能只作为“特殊浏览器限制”放行。`docs/storage.js` 现在最先 defer 加载，五个业务模块统一经 `window.siteStorage` 访问存储；不覆盖浏览器原生 localStorage。
- `getItem` 捕获属性 getter 和读取异常，返回缓存/默认值；失败写入优先保留本页内存值，`setItem` 返回是否持久化；失败删除留下 null 标记，防止本页再次读出旧令牌。恢复权限后显式写入/删除可以重试，不自动把未保存内容批量写回。
- 存储失败显示简短状态提示。原创保存区显示“本次暂存”和导出 MIDI 提醒；Flat 临时连接/无法清除令牌的提示保留到下次打开对话框，失败不自动关窗。不能声称未成功的存储删除在刷新后仍有效。
- `docs/app.js` 从 HTML 分离以便缓存；`asset-loader.js` 按需载入同站 Tone / OSMD / fflate，去重并允许超时重试。默认工具页不得下载这些库、完整乐句索引或隐藏 MP3；当前 12 个入口脚本均 defer，不能打乱依赖顺序。
- `docs/tuner-pitch.js` 使用可复用缓冲的 YIN，`app.js` 约 20 Hz 采样分析。标准合成输入覆盖 55–1174.66 Hz，不能据此承诺极弱基音/强泛音或真实设备零误差。
- `practice.js` 只刷新变化的播放位置，输入 BPM 时不覆盖用户编辑；`practice-audio.js` 分开静默预热与用户手势 resume，manifest/响应体 15 秒超时，失败重试复用已成功解码采样，风琴波形复用。
- `score-audio.js` 的 `pianoPresetForScore` 仅裁掉乐谱与 ±12 移调不使用的采样区域，保留原音区、音高、力度层。`scores.js` 按谱绑定缓存范围，旧加载完成不得覆盖新谱，切页后不得发声。不要为了再减包而随意合并力度层或移动根音。
- `docs/performance-check.html` 是不出现在产品导航中的同源被动诊断页；不自动操作、不采表单值、不上传数据。LCP/Event Timing、capture→rAF、按钮 aria-label 切换分开记录，最后两项不是完整绘制或声学首音。
- 初始 HTML + JS/CSS 的 gzip 6 预算上限 120,000 B，上一版基线 105,565 B，见 `notes/qa-performance-data/release-resource-budget.json`。命令 `node tests/qa/resource-budget.cjs` 已纳入 QA，不因修复重新引入首屏大型依赖。

## 2026-09-07 交付

1. 删除独立旧谱 `seitz-student-concerto-1-mvt1` 的目录记录、MusicXML、JSON 和 bundle；保留 3 张用户上传的不同谱页。旧链接进入曲库并显示移除提示。
2. 小提琴保持考级文件夹/日期分组。钢琴采用“古典 7 首 / 拉格泰姆 3 首”；原 genre 元数据不变。收藏在分类中仍可找到，搜索展开匹配的分组。
3. 撤下录入区、弹窗、脚本及样式。没有清空任何浏览器原稿数据库；需要恢复旧草稿时，可从 Git 历史恢复旧工具，仅在原浏览器/原站点来源下读取，禁止误称已经云端保存。
4. 保留手机适宽、双指缩放/拖动、精简横屏控制、当前小节双轴跟随。修复跨小提琴/钢琴换谱时默认音色串用；同曲切换节拍器标签不会重置用户音色。
5. 全站测试入口 `npm test`；修正旧的教学测试断言和仅验证模板骨架的 Worker 测试，使之检查真实产品而非已删除模板。

## 关键代码与不可破坏的约束

- `docs/index.html`：四大标签页、内嵌目录、12 个按序 defer 入口。更新外部脚本/样式时同步更新查询版本，避免旧缓存。本次存储及五个接入模块使用 `20260908-3`，未更改的模块保留各自版本。
- `docs/app.js`：统一导航/深链、麦克风、账号界面、房间与 Jam。麦克风请求和 Jam 异步启动必须保留请求代次、取消、失焦/切页清理，不能在 await 后无条件启动。
- `docs/scores.js`：分类、收藏、搜索、音符调度、OSMD 渲染。视口缩放只修改 SVG 显示尺寸，不在每次手指移动时重新排版，不触碰播放时钟。小节坐标固定 OSMD 单位 ×10，不再乘 Zoom。
- `docs/score-reader.js`、`docs/score-controls.css`：手机触控/控制。不要全页禁用用户缩放；手势仅接管可播放谱面。隐式 pointer capture 转移不是手势结束。
- `docs/metronome.js`、`docs/score-beats.js`：音符与节拍共用 AudioContext；节拍均匀，不追随错误小节长度赶拍。不新建第二个墙钟节拍计时器。
- `docs/score-audio.js`、`docs/assets/audio/`：小提琴循环必须避开弓头起音；不要恢复实验性原始 SF2 循环偏移。
- `notes/transcriptions/violin-upload-2026-09-06-1.json` 是第一张谱的人工校对源。`scripts/build-uploaded-violin.mjs` 生成完整 35 小节可播放版，不要退回开头节选。疑点仍须明示。
- `scripts/build-score-bundles.mjs` 生成懒加载 bundle 和 HTML 内嵌目录。`catalog.json` 是曲库索引。
- `docs/lessons.js` 是独立 PNG/MP3 吉他教学，不要迁移成全谱播放器。

## 校验、迭代与发布步骤

1. `git status --short`，保留不属于本次任务的修改。当前未跟踪的 `node_modules/` 和 `website/site.tar.gz` 不要提交。
2. 仅在转录源/曲库生成逻辑改变时运行 `npm run build:scores`；修改基础功能后运行 `npm test`。实际 OSMD 测试默认使用仓库内 `docs/assets/vendor/opensheetmusicdisplay-2.1.2.min.js`，缺失即失败；可用 `OSMD_TEST_BUNDLE` 显式覆盖，但不能把 SKIP 当通过。文档变化不需重建谱库。
3. `npm run test:qa` 包含 55 个功能场景、首屏资源预算和 28 组音高基准，另有采样加载/回退、停止尾音、19,100 次钢琴映射及加载竞争测试。`tests/qa/storage.cjs` 的 10 个故障场景按 HTML 顺序执行全部真实脚本，移除播放器占位对象，避免仅测 app.js 掩盖依赖模块启动失败。
4. 若 Worker 或相关共享接口变化，运行 `npm --prefix website run lint`、`npm --prefix website test`。前一 QA 轮已通过，本次仅 Pages/测试/文档变化，不重复构建或部署 Worker。不需要重新安装已有依赖。
5. 先审阅 QA/性能报告。启动、保存误报、音频取消、移调映射等阻断项必须修复并回归；若仍不达标，继续“修复 → 验证 → 审阅”循环。全部适用检查通过后，**先补齐 PRD、HANDOFF、QA 报告及未测边界，再提交和推送**。当前任务的用户已明确授权自主发布，不需要再次询问。
6. 检查差异，精准暂存/提交。优先正常推送；若 Git 网络不可用而 `gh api` 可用，可运行 `node scripts/publish-pages.cjs`，它验证远端父提交和完整树，再做非强制更新。远端有新提交时先检查并合并，不强推。
7. 等待 `gh api repos/rexrockya/tuner/pages/builds/latest` 的 commit 对应目标且 status=built、error 为空。对公开站实际 HTML 与本轮变更资源做完整 HTTP GET/内容校验，复核主路径。将发布后的事实补充到 QA 报告；不可在部署前预写“已上线”。

前一版 `0fca5b2` 在本次复核开始时已是 Pages built；本次按新增发布门槛完成补充修复和文档，再发布下一提交。发布后的验证记录以 QA 报告末尾为准，不把早期构建结果当成新版本结果。

## 验证限制和下次优先级

浏览器接口最初超时，之后恢复，已完成真实 Chromium 桌面、375/844 px 操作与正式站性能观察，详见 QA 报告。原交接中“浏览器全流程未测”的陈旧结论已撤销；这仍不等于实体手机或声学测量。存储错误由真实业务脚本 + 受控浏览器 API 故障注入验证，不宣称修改了实体浏览器的隐私策略。

后续优先级：实体 iPhone/Safari 的横竖屏、双指缩放、长段跟随；实际麦克风/蓝牙输出延迟与 Blues 真人听感。拒权、加载取消、账号/Flat/房间协议已模拟回归；真实账号写入、真实 Flat 授权与跨设备多人房间未在本轮完成。原乐句 PNG/MP3、在线公版谱和部分旧音色仍依赖外部网络，大型宽音域钢琴谱仍有首播下载成本。

## 上传工作流与安全

本轮不建立服务器或云盘同步。家人直接将谱图作为任务附件交付，再按日期归档/转录/验证/发布。助手不会凭网页本机草稿自动收到文件或自动后台识谱。

Flat 仅限可选授权来源，不能搜索全社区或假定覆盖中文流行歌。Token 保存在当前浏览器，不写仓库/日志。GitHub 仓库与谱图公开可访问，不上传私人照片和凭据。删除的旧谱及入口可通过 Git 历史恢复，无需删除历史。

## 新增响度表（2026-09-07）
- 顶层「工具 / 教学 / 乐谱 / Jam」；工具内含调音、响度、节拍。「响度」由 docs/sound-meter.js / .css、sound-dsp.js、sound-worklet.js 维护，入口支持 #sound。
- 校准前 dBFS，校准后估算 dB SPL；A/C 与频带是工程近似，禁止改为“专业/准确测量”文案。
- 累计使用音频样本时长，禁止用界面刷新或墙钟累计。后台与输入中断停止，保留结果。
- npm run test:sound 已加入 npm test。验证与实机限制见 notes/sound-meter-validation-2026-09-07.md。

## 工具页与音源差异化
- 顶栏不再单独列出调音、响度、节拍。工具卡片保留 data-page 路由，支持旧 #sound / #metro / #tuner 链接；返回工具入口为 #tools。
- docs/tools.css 提供桌面并排与手机纵向布局。
- 输出采集只使用 getDisplayMedia 选择器，不把 audiooutput 设备当作采集源。共享无音轨时释放全部轨道并提示，不回退到麦克风。
- 手机输出入口按 API 能力禁用；不宣称网页可读取手机其他 App 输出。
- 输出测量禁用 SPL 校准，立体声按声能平均，采样峰值取各通道最大，避免反相抵消。
- tests/sound-sources.cjs 覆盖设备选择、共享授权、无音轨、取消、迟到流释放、手机不支持态。
- 本轮用户已明确授权公开发布；部署事实见最新验收报告。

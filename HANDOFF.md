# 弦音项目交接

## 当前交付：2026-09-08 音乐工具与乐句扩展

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

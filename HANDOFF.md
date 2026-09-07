# 弦音项目交接

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
- `docs/app.js` 从 HTML 分离以便缓存；`asset-loader.js` 按需载入同站 Tone / OSMD / fflate，去重并允许超时重试。默认调音页不得下载这些库、完整乐句索引或隐藏 MP3；13 个入口脚本均 defer，不能打乱依赖顺序。
- `docs/tuner-pitch.js` 使用可复用缓冲的 YIN，`app.js` 约 20 Hz 采样分析。标准合成输入覆盖 55–1174.66 Hz，不能据此承诺极弱基音/强泛音或真实设备零误差。
- `practice.js` 只刷新变化的播放位置，输入 BPM 时不覆盖用户编辑；`practice-audio.js` 分开静默预热与用户手势 resume，manifest/响应体 15 秒超时，失败重试复用已成功解码采样，风琴波形复用。
- `score-audio.js` 的 `pianoPresetForScore` 仅裁掉乐谱与 ±12 移调不使用的采样区域，保留原音区、音高、力度层。`scores.js` 按谱绑定缓存范围，旧加载完成不得覆盖新谱，切页后不得发声。不要为了再减包而随意合并力度层或移动根音。
- `docs/performance-check.html` 是不出现在产品导航中的同源被动诊断页；不自动操作、不采表单值、不上传数据。LCP/Event Timing、capture→rAF、按钮 aria-label 切换分开记录，最后两项不是完整绘制或声学首音。
- 初始 HTML + JS/CSS 的 gzip 6 预算上限 120,000 B，当前 105,565 B，见 `notes/qa-performance-data/release-resource-budget.json`。命令 `node tests/qa/resource-budget.cjs` 已纳入 QA，不因修复重新引入首屏大型依赖。

## 2026-09-07 交付

1. 删除独立旧谱 `seitz-student-concerto-1-mvt1` 的目录记录、MusicXML、JSON 和 bundle；保留 3 张用户上传的不同谱页。旧链接进入曲库并显示移除提示。
2. 小提琴保持考级文件夹/日期分组。钢琴采用“古典 7 首 / 拉格泰姆 3 首”；原 genre 元数据不变。收藏在分类中仍可找到，搜索展开匹配的分组。
3. 撤下录入区、弹窗、脚本及样式。没有清空任何浏览器原稿数据库；需要恢复旧草稿时，可从 Git 历史恢复旧工具，仅在原浏览器/原站点来源下读取，禁止误称已经云端保存。
4. 保留手机适宽、双指缩放/拖动、精简横屏控制、当前小节双轴跟随。修复跨小提琴/钢琴换谱时默认音色串用；同曲切换节拍器标签不会重置用户音色。
5. 全站测试入口 `npm test`；修正旧的教学测试断言和仅验证模板骨架的 Worker 测试，使之检查真实产品而非已删除模板。

## 关键代码与不可破坏的约束

- `docs/index.html`：五大标签页、内嵌目录、13 个按序 defer 入口。更新外部脚本/样式时同步更新查询版本，避免旧缓存。本次存储及五个接入模块使用 `20260908-3`，未更改的模块保留各自版本。
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

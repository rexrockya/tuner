# 2026-09-08 和声教学 / Blues 伴奏 / UI 精简

公开入口仍为 https://rexrockya.github.io/tuner/ 。发布目标经 GitHub API 核验为 main 分支的 /docs。未部署或重写可选 Worker 后台。

## 产品范围

- 乐句输入筛选支持 2-5-1、2516、ii7 V7 Imaj7、实际和弦名，以及跨调匹配。支持连续子进行，忽略相邻重复和弦的延长；需要精确限定调性/拍号时使用更多筛选。
- 2,525 条 BopLand 元数据随站点发布；源站 PNG 和 MP3 仍需联网。索引与许可在 docs/assets/licks。
- 原创练习句是浏览器内规则作曲，标准吉他调弦、可重现 seed、TAB 点选、试听、本机收藏、MIDI 导出。不是运行云端模型，不冒充经典原句。
- 伴奏为最多 16 小节的 4/4 和声练习，每小节可有 1/2/4 个和弦，带 Shuffle、Slow blues（三连音细分）、Straight；标准、Quick change、小调 Blues 与自定和声。12 个自托管 CC0 真实鼓/Bass 采样，加合成风琴。
- 所有新播放共用一个练习音频调度器，与原有模块切换时互斥。关循环在当前轮末停止，单节循环与点选可组合。
- 删除教学英文栏目眉题、音阶训练及对应 JS；开关固定短标签，补 aria-pressed；折叠次级筛选与节拍房间操作，减小冗余大标题与装饰。

## 已完成验证

- npm run build:scores：13 首原有乐谱，35 小节上传小提琴谱完整保留。
- npm test：页面唯一 ID/资源/语法/可访问引用；教学收藏/速度/A-B/完整曲库载入与和声检索；全部乐谱与音频回归。
- 实际 BopLand 数据 615 种和声全部解析通过；大小调、半减七、小大七、slash、等音、数字/罗马数字、连续进行、原调/跨调、不合法输入均有检查。
- 原创 TAB 在 60 个 seed 下的弦/品/MIDI 一致，音域与时值合法；同种子重现；模式切换保留草稿；本机收藏重现；MIDI 起始 tempo/program 先于 note-on。
- 12 个 WAV 文件结构与实际 PCM 数据已检查；作者 SFZ 提供的 Bass 根音已核验。音源来自 CC0 的 Virtuosity Drums 与 Karoryfer Fashionbass，来源锁定 commit、剪裁/增益参数附在发布资产中。
- 模拟 AudioContext：50 轮绝对时钟无漂移，单节循环、点击第 9 小节、seek、变速、后台停顿跳过过时事件、加载期间取消、切页停止、关循环后本轮末停止、风琴音量不被混响绕过。
- 真实 OSMD 库在模拟 DOM 中渲染 375/844 px、35 小节目标、0.5–4 倍缩放、横纵跟随。原有三分钟拍点与 48 轮乐谱循环测试通过。
- npm --prefix website run lint 与 npm --prefix website test：可选 Worker 构建和实际 HTML 响应通过，未影响 Pages 前端。
- 两轮独立只读审查查出的半减分隔符、小七名称、变化级数、slash Bass、shuffle 风琴、静音路由、草稿重写、MIDI 事件排序、收藏文字对比度与 hash 返回问题已修正。

## 验证边界

本轮没有实体手机操作、真实浏览器截图或真人听感验收。JS DOM / 模拟音频时钟不等于实际硬件体验；“真实采样”指音源来源与资产，不表示已由人试听认可其风格。没有新建后台、调用运行时云端模型或写入用户真实云账户。

## 发布核验

正常推送精确暂存的修改至 main；如果 Git 传输失败，复用 scripts/publish-pages.cjs 的非强制 Git Data API 途径。等待 Pages 构建成功，并核验正式网页引用 harmony / practice / practice-audio / practice.css 的 20260908-1 版本、静态乐句索引、音源 manifest 与 WAV。不要以本地通过代替发布成功。node_modules/ 与 website/site.tar.gz 不提交。

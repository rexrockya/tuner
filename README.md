# 弦音 Tuner

一个为 Android 手机设计的开源乐器调音器，同时提供可直接使用的网页版。

## 功能

- 实时麦克风音高检测
- 音名、频率与音分偏差显示
- 吉他、尤克里里、小提琴和十二平均律模式
- A4 基准音可在 430–450 Hz 调整
- 教学包含乐句检索、原创练习句与 Blues 伴奏
- 按级数（2-5-1）或和弦名筛选 2,525 条 BopLand 乐句，支持跨调匹配
- 浏览器内按和声生成原创吉他六线谱与试听，支持本机收藏和 MIDI 导出
- 真实鼓、电贝斯采样与合成风琴伴奏，支持 Shuffle、Slow blues、Straight 与自定和声
- 乐句示范音频、波形与 A/B 循环；伴奏可点选小节、变速和单节循环
- 本地记录课程完成状态
- 原生 Android 应用，支持 Android 8.0 及以上

## Android 构建

```powershell
./gradlew.bat assembleDebug
```

构建产物位于 `app/build/outputs/apk/debug/app-debug.apk`。

## 网站

正式网页：https://rexrockya.github.io/tuner/

`docs/` 是 GitHub Pages 的完整静态前端（调音、教学、分类乐谱、节拍器、Jam）。`website/` 是可选 Worker 实现，不要用其构建结果覆盖 `docs/`。

乐谱维护及前端测试：

```powershell
npm run build:scores
npm test
```

产品范围见 [PRD.md](PRD.md)，维护与发布见 [HANDOFF.md](HANDOFF.md)。目前无网页图片上传/自动识谱服务；家人可直接提交谱图附件进行异步转录。

可选 Worker 本地开发：

```powershell
cd website
npm install
npm run dev
```

## 隐私

麦克风音频仅在设备本地实时分析，不录音、不上传。

# 弦音 Tuner

一个为 Android 手机设计的开源乐器调音器，同时提供可直接使用的网页版。

## 功能

- 实时麦克风音高检测
- 音名、频率与音分偏差显示
- 吉他、尤克里里、小提琴和十二平均律模式
- A4 基准音可在 430–450 Hz 调整
- 首页保留实时调音，底部第二栏提供每日经典乐句教学
- 五线谱、和声级数、逐音分析与移调练习提示
- 复用 SongMarket 的 iTunes Search 试听方案在线播放经典曲目预览
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

# 弦音 Tuner

一个为 Android 手机设计的开源乐器调音器，同时提供可直接使用的网页版。

## 功能

- 实时麦克风音高检测
- 音名、频率与音分偏差显示
- 吉他、尤克里里、小提琴和十二平均律模式
- A4 基准音可在 430–450 Hz 调整
- 原生 Android 应用，支持 Android 8.0 及以上

## Android 构建

```powershell
./gradlew.bat assembleDebug
```

构建产物位于 `app/build/outputs/apk/debug/app-debug.apk`。

## 网站

```powershell
cd website
npm install
npm run dev
```

## 隐私

麦克风音频仅在设备本地实时分析，不录音、不上传。


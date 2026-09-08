> 历史声级实现验证。2026-09-08已新增BS.1770/R128节目响度模式，当前行为与发布结果见 [最新验收](music-tools-validation-2026-09-08.md)。

# 响度表验证记录 · 2026-09-07

## 实现与测量边界
- docs/sound-dsp.js：4096 点矩形窗 FFT/Parseval 能量，A/C 频域近似，Z 原始均方能量；按完整采样块累计 Leq、SEL 和 Fast/Slow 指数响应。
- docs/sound-worklet.js：连续分析每个完整音频块，静音输出，无麦克风监听回放。末尾不足一个块的样本不计入有效时间。
- docs/sound-meter.js：独立采集生命周期，关闭语音处理约束并显示实际设置，5 秒参考校准仅本会话有效，数字削波提示、后台停止、断流检测、CSV 导出。
- A/C、时间响应、频带为工程近似，未做 IEC 61672 仪器符合性验证。频率分辨率在 48 kHz 下约 11.7 Hz，低频频带无法均匀解析。
- 单一校准偏移不能修正手机硬件频响/非线性/自动增益；无参考声源和双通道比较，不宣称传递频响测量。

## 已完成
- npm test：现有页面、教学、乐谱功能及新的 DSP / 模拟 UI 测试通过。
- DSP：44.1/48 kHz、已知幅度正弦、A/C 频率权重、低频衰减、主频带、声能平均、SEL 时长关系、Fast/Slow、静音、削波、清零与连续块计数。
- 模拟 UI：六标签导航、关闭处理约束、校准/移除、CSV、清零旧消息隔离、停止重开、拒权、延迟授权取消、静音中断、后台释放资源。
- website lint 和生产 Worker 构建及页面测试通过；未用 Worker 输出覆盖 docs。

## 未完成的实机验证
- 未进行实体手机内置麦克风测量、Safari/Chrome 真机授权与校准精度验证。
- 原有乐谱真实 OSMD 视口测试因缺少 OSMD_TEST_BUNDLE 明确 SKIP，其余自动测试通过。
- 不把模拟输入测试视为实际声学精度或听力安全验证。

## 参考
- 浏览器麦克风处理状态：https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings
- NIOSH 手机声级计与校准限制：https://www.cdc.gov/niosh/noise/about/app.html
- 内置与外置校准麦克风差异：https://stacks.cdc.gov/view/cdc/203482

## 工具页与输出采集增量验证
- 全套 npm test 通过（原 OSMD 真渲染仍因资源缺失 SKIP）。
- 新增测试：仅四个顶栏入口、三个工具卡片、旧工具路由、顶栏选中态及乐谱节拍联动。
- 新增声源测试：授权后枚举麦克风、精确设备 ID、共享选择器直接在点击回调调用、音轨缺失、拒绝/取消、迟到的共享流释放、音源终止释放音视频全部轨道。
- 输出模式禁用 SPL 校准，CSV 明确 source_type=output 与 dBFS。反相立体声与单声道活跃的双通道声能测试通过。
- 移动端模拟不支持 getDisplayMedia 时，手机输出选项禁用，说明无法读取其他 App 输出，不进行静默回退。
- 没有进行实体手机或真实桌面共享选择器测试。通过模拟不代表各系统实际支持系统音频采集。
- 本次只更新本地预览，没有公开发布。
- API 参考：https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia

# 练习音色离线验证工具

工具只离线生成 PCM / Float32 WAV 和测量结果，不创建实时 AudioContext，不打开音频设备，不播放系统声音，不控制浏览器，不修改网站代码。依赖只安装在临时目录，不加入网页运行时。

## 复现

把 `render-practice.mjs`、`validate-automation.mjs` 和可选 `gain-probe.mjs` 放入独立临时目录，在该目录安装 `node-web-audio-api@2.1.0`（Node >=22）。从工程根目录执行：

```powershell
npm install --prefix "$env:TEMP/tuner-offline-audio-20260908" --no-audit --no-fund node-web-audio-api@2.1.0
node "$env:TEMP/tuner-offline-audio-20260908/validate-automation.mjs"
node "$env:TEMP/tuner-offline-audio-20260908/render-practice.mjs" --label before --ref 4abdac2c73a215f38591d329a266752b8032e997 --cases lead-warm,lead-violin,lead-piano,mix-warm,mix-violin
node "$env:TEMP/tuner-offline-audio-20260908/render-practice.mjs" --label after --ref working --cases all
```

可传 `--root` 指定工程目录，`--workdir` 指定依赖、缓存与快照目录，`--out` 指定WAV和报告目录；默认 workdir 在 os.tmpdir 下，脚本即使放在 tests/qa 中也不向工程写快照。依赖从 workdir/node_modules 加载；`--label` 分隔源代码快照和输出。报告记录 Git 基准、源码 SHA-256、请求音源 SHA-256、真实节点数量、每音符与全段 RMS/采样峰值。钢琴首次运行会读取产品本来使用的公开原始音源，随后使用临时缓存；吉他、小提琴、鼓、Bass 读取工程本地资产。

## 方法和适配边界

- 执行当前或指定 Git 版本的真实 `practice-audio.js`、`practice-timbres.js`、和声/编配和乐谱映射，所有滤波、波形整形、压缩、总线、房间响应及采样选择均来自工程源码。
- 仅把异步模块入口接到真实快照模块，并将实时 resume 换成离线上下文的空操作。使用生产 `Transport.schedule` 扩展前瞻，在开始离线渲染前排完同一乐段。
- node-web-audio-api 2.1.0 和 2.2.0 的本机二进制在未来 `setTargetAtTime` 上有可复现指数爆炸：纯 ConstantSource/Oscillator 加 Gain 即可复现。此结果不是产品削顶。工具按解析指数公式逐采样生成 `setValueCurveAtTime`，旧版与新版使用相同适配。
- `validate-automation.mjs` 将真实 ConstantSource → Gain 的 88200 个 PCM 采样与线性起音加两段未来指数包络公式逐点比较；最大误差 1.49e-8，RMS 误差 1.93e-9。
- 依库官方说明，用 `copyFromChannel` / `copyToChannel` 同步可写 AudioBuffer 视图，保证吉他/小提琴/房间响应修改进入真实原生图。
- 音符使用相同 MIDI57、60、64、67、69、72、76 和 velocity .72，含短音/长音。全轨使用四小节真实编配。`challenge-warm` 使用正常生成的挑战档和默认混音滑块；`stress-*` 使用挑战档、180 BPM、全部五轨滑块 100%、Gospel 风琴和 P 风格 Bass。

这些是离线 PCM 质量与相对响度检查；不是浏览器/手机实听，不代表 ITU LUFS 或 true-peak 测量，也不证明全部可能乐句均无削顶。Float32 WAV 保留超过 ±1 的采样便于定位，不先截幅掩盖问题。

官方运行库说明：https://github.com/ircam-ismm/node-web-audio-api
## 2026-09-08 最终测量

`renders/before/report.json` 保留旧版固定音符和五轨混音基准；`renders/after-2/report.json` 保留加入输出余量前的普通及满音量压力测量；`renders/final/report.json` 是加入压缩器之后 .84 输出余量的最终23例。

最终23例全部无超过 ±1 的采样，最坏为 stress-warm 采样峰值 -1.1508 dBFS；四个180 BPM满音量压力例峰值均低于 -.5 dBFS。固定7音小提琴的 active RMS 从旧版 -40.3707 提高到 -27.3650 dBFS（+13.0057 dB）；新warm吉他 -25.8032，因此两者差距为1.5618 dB。钢琴只受公共输出余量变化，不改其音源。

这些数据保留真实测量范围：23个固定场景通过，不等价于全部可能编配或手机硬件测量。


## 2026-09-09 实录采样对比

使用 `render-natural-comparison.mjs`，依赖与原工具相同，另需 FFmpeg。基线固定为 f8be94b 的四小节七声部事件，旧版与新版使用同一 eventHash；各轨单独渲染、正常混音、长音尾声，以及 180 BPM / 七轨全音量 / 192 个 Lead 复音音符的压力用例分开测量。`--recordings` 明确启用生产新采样模块；不传该选项得到旧兼容路径。

```powershell
$renderRoot = Join-Path $env:TEMP 'tuner-recording-check'
$audioRuntime = Join-Path $env:TEMP 'tuner-offline-audio-20260908'
# 依赖 node-web-audio-api@2.1.0 放在 audioRuntime；每个 case 用独立进程，避免原生离线自动化缓存累计。
node tests/qa/audio/render-natural-comparison.mjs --workdir $audioRuntime --label baseline --ref f8be94b --cases mix-warm --out "$renderRoot/baseline"
node tests/qa/audio/render-natural-comparison.mjs --workdir $audioRuntime --label final-mix --ref working --recordings --cases mix-warm --out "$renderRoot/final-mix"
python tests/qa/audio/compare-natural-results.py --workdir $renderRoot --root .
```

其余 case 名称见渲染器 `all` 列表；使用独立 `final-<case>` 目录可将全部结果合并。最终运行记录保存在 `notes/recordings-pcm-2026-09-09.json`，源码核对在 `notes/recordings-source-verification-2026-09-09.json`。本次 `pressure-violin` 是额外压力测试，其余 19 案有同事件的旧版比较。

与上一节早期工具只测峰值/RMS不同，`compare-natural-results.py` 另外实际调用 FFmpeg 的 EBU R128 过滤器，采用最后一帧 `lavfi.r128.I` 记录 LUFS，最后 summary 记录过采样真峰。两版试听仅各施加一个固定增益匹配至 −24 LUFS，不改变 EQ 或动态。报告邻近的 Float32 原始 WAV 优先于历史绝对路径，方便搬移与复现。基准场景里过低的配器事件力度、原录音幅度与混音补偿分别记录；不得将通过指标写成实体手机实听。

发布之后执行 `python tests/qa/audio/verify-recordings-release.py --ref <feature-commit>`：确认同提交的 Pages 构建完成，再读取生产模块、上述实际渲染所请求的所有实录文件、七库 manifest/许可及每库一个 WAV 回退，逐一与已提交的 Git blob 做 SHA-256 比较。此范围不是全库所有音高的在线解码测试。

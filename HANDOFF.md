# 弦音项目交接

更新时间：2026-09-07。需求与边界见 [PRD.md](PRD.md)。

## 部署事实

- 唯一公开入口：https://rexrockya.github.io/tuner/
- GitHub Pages 发布 `main` 分支的 `docs/`。`docs/` 是现行完整前端，不能用 `website/dist` 覆盖它。
- `website/` 是可选 Worker/账号与房间相关实现。根 `npm run build` 构建它并复制到根 `dist/`，**不是**生成 Pages 的 `docs/`。
- 存在 `.openai/hosting.json` 不代表允许切换公开域名或重新托管。不要向用户交付其他公开入口。

## 本版交付

1. 删除独立旧谱 `seitz-student-concerto-1-mvt1` 的目录记录、MusicXML、JSON 和 bundle；保留 3 张用户上传的不同谱页。旧链接进入曲库并显示移除提示。
2. 小提琴保持考级文件夹/日期分组。钢琴采用“古典 7 首 / 拉格泰姆 3 首”；原 genre 元数据不变。收藏在分类中仍可找到，搜索展开匹配的分组。
3. 撤下录入区、弹窗、脚本及样式。没有清空任何浏览器原稿数据库；需要恢复旧草稿时，可从 Git 历史恢复旧工具，仅在原浏览器/原站点来源下读取，禁止误称已经云端保存。
4. 保留手机适宽、双指缩放/拖动、精简横屏控制、当前小节双轴跟随。修复跨小提琴/钢琴换谱时默认音色串用；同曲切换节拍器标签不会重置用户音色。
5. 全站测试入口 `npm test`；修正旧的教学测试断言和仅验证模板骨架的 Worker 测试，使之检查真实产品而非已删除模板。

## 关键代码与不可破坏的约束

- `docs/index.html`：五大标签页、内嵌目录。更新外部脚本/样式时同步更新查询版本，避免旧缓存。
- `docs/scores.js`：分类、收藏、搜索、音符调度、OSMD 渲染。视口缩放只修改 SVG 显示尺寸，不在每次手指移动时重新排版，不触碰播放时钟。小节坐标固定 OSMD 单位 ×10，不再乘 Zoom。
- `docs/score-reader.js`、`docs/score-controls.css`：手机触控/控制。不要全页禁用用户缩放；手势仅接管可播放谱面。隐式 pointer capture 转移不是手势结束。
- `docs/metronome.js`、`docs/score-beats.js`：音符与节拍共用 AudioContext；节拍均匀，不追随错误小节长度赶拍。不新建第二个墙钟节拍计时器。
- `docs/score-audio.js`、`docs/assets/audio/`：小提琴循环必须避开弓头起音；不要恢复实验性原始 SF2 循环偏移。
- `notes/transcriptions/violin-upload-2026-09-06-1.json` 是第一张谱的人工校对源。`scripts/build-uploaded-violin.mjs` 生成完整 35 小节可播放版，不要退回开头节选。疑点仍须明示。
- `scripts/build-score-bundles.mjs` 生成懒加载 bundle 和 HTML 内嵌目录。`catalog.json` 是曲库索引。
- `docs/lessons.js` 是独立 PNG/MP3 吉他教学，不要迁移成全谱播放器。

## 校验和发布步骤

1. `git status --short`，保留不属于本次任务的修改。当前未跟踪的 `node_modules/` 和 `website/site.tar.gz` 不要提交。
2. `npm run build:scores` 后运行 `npm test`。真实 OSMD 验证可用 `OSMD_TEST_BUNDLE` 指定渲染器路径；本机缓存为 `C:/codex-tmp-seitz/opensheetmusicdisplay.min.js`，不存在时测试会明确 SKIP，不能把 SKIP 当通过。
3. `npm --prefix website run lint`、`npm --prefix website test`（含 Worker 构建和真实页面响应测试）。不需要重新安装已有依赖。
4. 检查差异，精准暂存/提交。优先正常推送；若 Git 网络不可用而 `gh api` 可用，可运行 `node scripts/publish-pages.cjs`，它验证远端父提交和完整树，再做非强制更新，支持本轮文件删除。
5. 等待 Pages 构建成功，并读取唯一公开站点核验最新版本脚本、13 首目录、分类逻辑和已撤下入口。记录在 `notes/validation-2026-09-07.md`。

## 验证限制和下次优先级

本轮浏览器接口两次选择已有标签页均超时；不能声称完成真实浏览器全流程或实体手机测试。自动测试覆盖模拟导航、账号弹窗、Jam 控件、教学、全曲时钟、强弱拍、双音量、点击目标及 375/844 像素渲染尺寸。

下一次优先用实际手机验证横竖屏、双指缩放和长段跟随；用用户听感校验琴音。麦克风拒权/设备兼容、真实账号登录、真实 Flat 授权和远程多人房间未在本轮做在线写入测试。

## 上传工作流与安全

本轮不建立服务器或云盘同步。家人直接将谱图作为任务附件交付，再按日期归档/转录/验证/发布。助手不会凭网页本机草稿自动收到文件或自动后台识谱。

Flat 仅限可选授权来源，不能搜索全社区或假定覆盖中文流行歌。Token 保存在当前浏览器，不写仓库/日志。GitHub 仓库与谱图公开可访问，不上传私人照片和凭据。删除的旧谱及入口可通过 Git 历史恢复，无需删除历史。

# Clawd × T3 Code 非官方适配

[English](README.md)

让原有 [Clawd on Desk](https://github.com/rullerzhou-afk/clawd-on-desk) 桌宠感知 **T3 Code 本机和已有远端连接中的会话**。这是独立维护的非官方预览版，不代表 Clawd 或 T3 官方发布。

## 功能

- 原 Pet 气泡显示运行、等待审批/回答、近期完成等状态，点击跳到对应 T3 会话。
- 使用原有气泡人工审批、回答支持的选项/文本问题；右键会话可发送提示或中断所选运行。
- 按 T3 的明确关系折叠子代理，支持不同提供方及跨环境委派。
- 同时显示提供方图标与 T3 环境图标，标题按实际剩余宽度省略。
- Windows 下补充宠物窗口意外隐藏后的恢复。

不采集 T3 Token、上下文占比或费用。关闭气泡、断线、免打扰不会替你作出决定。密钥、登录和暂不支持的复杂问题继续在 T3 中处理。不需要 ChatGPT 桌面版。

## 已验证范围

Windows x64；Clawd 1.7.0 的固定提交；T3 `0.1.12-nightly.20261121.5038` / orchestration 协议 2。构建验证使用 Node.js 24.19.0、npm 12.2.2、Git 2.55.0。其他 T3 版本可能改变认证、CLI 或协议；目前没有承诺 macOS、Linux 或 Windows ARM64 的发行兼容性。

## 为什么发布补丁包

Clawd 代码采用 AGPL-3.0，但原版宠物动画、图片等素材有单独条款。本仓库发布适配代码及许可明确的 T3/Lucide 图形，**不发布原版素材和重新打包的安装器**。准备程序会在你的电脑上获取固定版本的原项目，再本地应用补丁。原有素材许可会保留；重新分发自行构建的应用/安装器前，仍需确认相应素材授权。

## 开始使用

先安装 Git、Node.js 24 和 T3 Code，启动 T3 并确认它能正常使用。远端需要已经在 T3 中建立 **full-access 环境链接**；不需要在 Clawd 重配 SSH 或部署远端 hooks。

### 交给 AI agent 安装（尚未安装 Clawd）

将下面的提示词发给能执行本地命令的 AI agent，按源码方式安装：

```text
请在这台 Windows x64 电脑上安装并启动 Clawd × T3 Code 适配版：
https://github.com/SinfulShell13/clawd-on-desk-t3

本机尚未安装 Clawd。请按仓库说明准备 Git、Node.js 24 和已启动的 T3 Code，克隆项目后运行 npm run setup，再进入 work/app 运行 npm start。无需先安装 Clawd 原版，请直接执行安装。
```

### 手动安装

在解压或克隆出的补丁包目录运行：

```powershell
npm run check
npm test
npm run setup
cd work/app
npm start
```

准备程序下载固定的上游提交、校验并应用适配补丁、设置新安装默认值，再运行 `npm ci`。它不会自行启动 Clawd、修改 T3 设置、结束任务或清理 hooks；遇到不相关的已有目录会停止。也可以指定新的源码目录：

```powershell
npm run setup -- --app-dir C:\Projects\clawd-t3-local
```

npm 12 下，准备程序通过项目内的 `allowScripts` 仅允许锁定版本的 Electron、esbuild、Koffi 依赖安装脚本，不改全局 npm 配置。安装需要访问 GitHub、npm registry 和 Electron 二进制下载站；依赖下载失败后，可再次运行同一条 setup 命令，已准备好的源码会保留。

默认读取 `%USERPROFILE%\.t3\bin\t3.cmd`，本预览版支持 T3 桌面版生成的官方 CLI launcher。非默认位置可在启动前设置 `T3CODE_HOME` / `T3CODE_CLI_PATH`。不要把账号、令牌或用户数据放进公开仓库。

## 从原版迁入

先从托盘退出原版或其他源码 Clawd。适配版沿用原应用身份和用户数据目录，**两者不能同时运行**。

已有主题、偏好和集成选择会保留。已有用户若要只用 T3，可在设置中启用 T3、关闭不需要的原生集成；不会自动删除旧 hooks。全新配置默认只启用 T3，原生集成未安装且关闭，HUD 固定显示并启用经过时间；用量/额度 HUD 和自动 hook 管理默认关闭。审批仍由人工明确操作。

## 验证和个人构建

在生成的 `work/app` 目录中：

```powershell
node --test test/t3-client.test.js test/t3-runtime.test.js test/t3-state-projection.test.js test/t3-interactions.test.js test/t3-environment-icons.test.js test/t3-migration.test.js
$env:ELECTRON_RUN_AS_NODE = $null
node node_modules/electron/cli.js scripts/manual/t3-hud-smoke.js
node node_modules/electron/cli.js scripts/manual/pet-window-smoke.js
npm run build:t3:win
```

产出的安装器是个人本地构建，仍包含原项目素材，不能据此认为已取得公开再分发授权。安装器保留原安装目录及迁移备份机制；更新采用手动通道，避免官方更新覆盖适配，没有配置发布者或自动更新源。

公开仓库只保存这个补丁包，不上传 `work/`、`dist/`、ASAR、安装器、偏好、日志和凭据。仓库中的 GitHub 工作流只检查补丁包，不构建/发布安装器，也不需要发布密钥。`npm run check` 检查 `SHA256SUMS` 和常见凭据特征；它不能替代素材授权确认，也不能保证识别所有种类的秘密。

## 边界

- 会话状态约 4 秒轮询；可选详情不会阻塞列表。环境图标约 30 秒后台同步。
- 完成行通常保留 10 分钟，沿用原会话超时设置；不会把全部旧历史放进 Pet。
- 没有新增独立 T3 Dashboard。计划进度、压缩/工具细节、末条回复预览暂未移植。
- 显示器恢复覆盖已复现的窗口可见性缺口，尚未保证所有硬件热插拔/GPU 场景。
- 原版全量测试并未在 T3-only 新安装配置下全部认证，部分原版测试刻意假设原生集成默认启用；适配验证使用上面的命令。
- 固定的上游依赖存在已知安全告警。2026-11-24 的 `npm audit` 报告涉及 15 个包（包括 Electron），`npm audit --omit=dev` 为 4 个；本预览尚未完成上游依赖安全升级。可在 `work/app` 中运行这两个命令检查最新情况。Electron 虽列在开发依赖中，其运行时会进入构建后的应用，因此仅运行时依赖审计不能代表完整应用安全评估。

代码保留 [AGPL-3.0-only](LICENSE) 和原作者署名，图形来源见 [NOTICE.md](NOTICE.md)。反馈时提供补丁版本、T3 版本、系统和脱敏复现，不提交令牌或完整用户数据。

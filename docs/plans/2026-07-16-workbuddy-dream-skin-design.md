# WorkBuddy Dream Skin 设计

## 目标

把 Codex Dream Skin 上游画廊的 8 套风格做成 WorkBuddy 原生主题，而不是在界面上覆盖一张带菜单的截图。每套主题由声明式 `theme.json`、纯背景素材和共用的 WorkBuddy 组件映射组成。

## 主题体验

主题目录由 `themes/catalog.json` 统一注册，包含粉系定制、财神打工、红白科幻、清透定制、灵感小宇宙、紫夜限定、初音未来和舞台黑金。切换时同时更新 Hero、整体底色、左侧导航、当前菜单、场景标签、快捷操作、输入区与发送按钮。黑金主题额外覆盖 WorkBuddy 外层网格与列表容器，形成完整深色界面。

背景素材不含菜单、按钮、文字或输入框，原生 WorkBuddy DOM 始终负责内容与交互。装饰层统一使用 `pointer-events: none`，并尊重 `prefers-reduced-motion`。

## 架构与平台

启动器通过 `WORKBUDDY_REMOTE_DEBUGGING_PORT` 启动官方 WorkBuddy，并把调试地址限制在回环网络。Injector 验证 WorkBuddy Renderer 后，读取受控主题配置、固定 CSS 和本地图片，完成首次同步注入，再由低频守护进程维持样式。

Windows 使用桌面 `Choose WorkBuddy Theme` 选择器读取主题目录；macOS 使用 AppleScript 列表提供相同 8 套选择。主题热切换会更新已经存在的 Hero 图片与文案，无需修改或重新打包 `app.asar`。恢复命令先停止守护进程，再清理页面 DOM/CSS 并关闭调试启动状态。

## 安全与验证

主题包只接受固定字段、十六进制颜色和安全图片文件名，不执行主题自带 JavaScript。调试端口只连接 `127.0.0.1`，目标还需通过 URL、标题和 DOM 指纹校验。验证覆盖主题 schema、8 套目录完整性、Windows/macOS 选择器、注入幂等与清理、点击穿透、横向溢出，以及 8 套主题的真实 WorkBuddy 截图。

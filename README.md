# WorkBuddy Dream Skin

<div align="center">
  <h2>加入交流群</h2>
  <p><strong>WorkBuddy 换肤测试群</strong></p>
  <img src="assets/community/workbuddy-skin-wechat-group-2026-07-24.jpg" alt="WorkBuddy 换肤测试微信群二维码" width="420" />
  <p><sub>二维码有效期至 2026 年 7 月 24 日；过期后会更新。</sub></p>
</div>

[![GitHub](https://img.shields.io/badge/GitHub-buzhangsaner%2Fworkbuddy--skin-181717?logo=github)](https://github.com/buzhangsaner/workbuddy-skin/)

## 免责声明

> [!IMPORTANT]
> **本项目为非官方个人主题项目，与腾讯及 WorkBuddy 官方不存在隶属、授权、合作或背书关系。**

- 本仓库仅发布作者原创的主题、配色、CSS、配置、注入工具和安装脚本，不包含、不修改后再分发 WorkBuddy 客户端源码、二进制、`app.asar`、图标、Logo 或其他专有资源。
- `WorkBuddy`、腾讯及相关名称、商标和标识均归各自权利人所有；本项目仅为说明兼容对象而作必要引用，不代表获得商标授权。
- 用户应通过 WorkBuddy 官方渠道获取客户端，并自行遵守 WorkBuddy《用户协议》《许可协议》及适用法律法规；使用本项目产生的兼容性、数据或其他风险由用户自行承担。
- 如权利人认为仓库内容存在不当使用，请通过 GitHub Issue 联系，项目维护者将及时核查、调整或移除。
- 本说明仅用于项目边界说明，不构成法律意见。

为 Windows 与 macOS 版 WorkBuddy 提供 9 套内置视觉方案。每套主题都会同步替换背景、左侧菜单、活动项、场景按钮、快捷按钮、输入框、发送按钮和整体色板；图片素材只作纯背景，不包含伪造菜单或文字。

它通过 WorkBuddy 自带的本机调试接口注入样式，不修改 `app.asar`，随时可以完整恢复原版。

## 一键安装（推荐）

打开 [GitHub Releases](https://github.com/buzhangsaner/workbuddy-skin/releases/latest) 下载对应系统安装包：

- Windows：双击 `WorkBuddy-Dream-Skin-Setup.exe`，安装完成后自动启动。
- macOS：打开 `WorkBuddy-Dream-Skin.dmg`，再双击 `WorkBuddy Dream Skin Installer.app`。

Release 安装包已内置 Node.js，无需配置 PowerShell、Terminal 或自行安装 Node。未签名的 macOS 首次打开如果被系统拦截，请右键安装器选择“打开”；配置 Apple Developer 签名后可消除该提示。

## 内置主题

| 主题 | 风格 |
|---|---|
| 粉系定制 | 樱粉、柔光、玫瑰 |
| 财神打工 | 中国红、鎏金、财神 |
| 红白科幻 | 红白、高对比、科幻 |
| 清透定制 | 鼠尾草绿、米白、纸鹤 |
| 灵感小宇宙 | 青绿、珊瑚橙、创意拼贴 |
| 紫夜限定 | 蓝紫、星空、夜色 |
| 初音未来 | 青蓝、粉色、未来感 |
| 舞台黑金 | 深黑、鎏金、舞台灯光 |
| 人民智造 | 宣纸、朱红、鎏金山河 |

### 人民智造主题

“人民智造”采用宣纸米白、朱红和鎏金配色，以金色晨光、远山、长城与红旗构成主视觉。主题只覆盖背景、颜色、边框、阴影和字体，不新增、不删除、不移动 WorkBuddy 的页面结构与原生控件。

<div align="center">
  <img src="themes/people-intelligence/hero-clean-v1.png" alt="人民智造主题纯背景预览" width="900" />
  <p><sub>图片为无 UI、无按钮、无菜单文字的纯背景素材；实际界面继续使用 WorkBuddy 原生结构。</sub></p>
</div>

启动换肤后，在工作区左上角主题栏点击“人民智造”即可实时切换；选择会自动保存，下次启动继续使用。欢迎页、项目页、空间详情、对话内容和输入区均使用一致的宣纸红金色板。

## Windows 使用

1. 使用 PowerShell 运行 `scripts/install-workbuddy-dream-skin.ps1`。
2. 启动后直接点击左侧菜单右边的主题胶囊，立即切换，无需重启。
3. 点击“自定义”打开内置编辑器，可修改背景图、颜色、主题名称和主标题；编辑时实时预览，点击“保存主题”后永久保留。
4. 主题栏最左侧依次是收起按钮和 GitHub 图标；GitHub 图标可打开项目仓库。
5. 点击最左侧向上箭头可收起主题栏；收起后只在工作区左上角保留 `—⌄` 拉手，点击即可展开。
6. 点击“恢复原主题”可暂时显示 WorkBuddy 原生外观；胶囊栏仍会保留。
7. 双击桌面的 `Restore WorkBuddy` 可彻底停止注入并移除胶囊栏。

主题选择会自动保存；下次从 `WorkBuddy Dream Skin` 启动时继续使用上次主题。桌面的 `Choose WorkBuddy Theme` 保留为备用选择器，可明确覆盖当前选择。

## 皮肤编辑器

推荐直接点击 WorkBuddy 工作区左上角主题栏中的“自定义”：

- 支持 PNG、JPG、WebP，本机自动缩放并压缩，不会上传。
- 颜色、名称和标题修改后立即预览；点击“取消”会恢复进入编辑器前的主题。
- 点击“保存主题”后写入本机存储，关闭或重启 WorkBuddy 后仍会恢复。

桌面版编辑器继续作为主题包制作工具：

双击桌面的 `Dream Skin Editor`，可实时调整颜色、圆角、玻璃透明度和背景图。`Export Theme` 会导出安全的 `theme.json`；请将它与所选背景图放在同一主题目录。

主题只接受固定字段、十六进制颜色和安全图片文件名，不执行自定义 JavaScript。

## 命令行

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\switch-workbuddy-theme.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-workbuddy-dream-skin.ps1 -ThemeId purple-night -RestartExisting
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-workbuddy-dream-skin.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\restore-workbuddy-dream-skin.ps1
```

Windows 版已在 WorkBuddy 5.2.6 验证。Release 安装包已内置 Node.js；只有从源码运行脚本时才要求系统安装 Node.js 22 或更高版本。调试端口只使用 `127.0.0.1:9336`，注入器还会校验 WorkBuddy 的页面标题、文件地址和 DOM 指纹。

## macOS

在 Terminal 中执行：

```bash
chmod +x scripts/*-macos.sh
./scripts/install-workbuddy-dream-skin-macos.sh
```

安装后桌面会出现：

- `Choose WorkBuddy Theme.command`：从 9 套主题中选择并实时应用
- `WorkBuddy Dream Skin.command`：启动换肤并继续使用上次选择
- `Restore WorkBuddy.command`：恢复原版
- `Dream Skin Editor.command`：打开皮肤编辑器

macOS 启动后同样可使用左侧菜单右边的 11 个胶囊按钮即时切换、使用“自定义”内置编辑器、GitHub 图标和收起拉手。默认读取 `/Applications/WorkBuddy.app`，独立安装目录为 `~/Library/Application Support/WorkBuddyDreamSkin/app`；Release DMG 已内置 Node.js。

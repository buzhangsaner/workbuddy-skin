# 主题栏收起与一键发行设计

## 目标

纠正上一版对“隐藏选择框”的误解：恢复欢迎页三个场景按钮，为主题选择栏增加最简收起拉手；同时在 GitHub Release 提供双击可用的 Windows EXE 与 macOS DMG。

## 主题栏交互

采用单按钮方案，不增加下拉菜单。主题栏固定在左侧菜单右边 10px，展开顺序为“收起按钮 → GitHub → 主题按钮”；点击后其他项目和玻璃外框收成工作区左上角一条 `—⌄` 拉手。拉手保持至少 44×20px 的可点击区域，拥有 `aria-expanded`、中文标签和键盘焦点。再次点击恢复完整主题栏。状态写入独立 localStorage，后台热注入和 WorkBuddy 重启后都保持。

欢迎页 `.wb-scene-tabs` 恢复原来的卡片上方分段玻璃栏，不删除或隐藏 WorkBuddy 功能。

## 一键安装架构

Windows Release 使用 Inno Setup 生成 `WorkBuddy-Dream-Skin-Setup.exe`，安装到 `%LOCALAPPDATA%\WorkBuddyDreamSkin\app`，创建启动、恢复和编辑器快捷方式，并可在安装完成后立即启动换肤。

macOS Release 使用原生目录结构构造 `WorkBuddy Dream Skin Installer.app`，其 Resources 内携带完整应用和 Node 运行时；双击后复制到 `~/Library/Application Support/WorkBuddyDreamSkin/app` 并启动换肤。随后使用 `hdiutil` 生成 `WorkBuddy-Dream-Skin.dmg`。

两个包都携带 Node.js 二进制与许可证，用户无需提前安装 Node。启动脚本先寻找 `runtime/node(.exe)`，不存在时才回退系统 Node，兼容源码安装。macOS 没有 Apple Developer 证书时使用 ad-hoc 签名，首次可能需要右键“打开”；流水线为正式签名预留条件入口。

## 发布与验证

GitHub Actions 在 `v*` tag 和手动触发时分别使用 `windows-latest`、`macos-latest` 构建，上传两个 artifact，最后由 release job 创建 GitHub Release。自动测试覆盖收起持久化、场景栏恢复、内置运行时选择、安装包配置和发布权限；Windows 实机继续验证 UI，原生 runner 验证 EXE/DMG 实际生成。

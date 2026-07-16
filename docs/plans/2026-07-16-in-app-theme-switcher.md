# In-App Theme Switcher Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 WorkBuddy 右上角增加 8 套主题与原生主题的即时切换栏。

**Architecture:** Injector 校验并载入主题目录，将主题元数据传给 Renderer；Renderer 负责胶囊栏、即时应用和 localStorage 持久化。现有桌面启动器负责第一次明确选择，后台重注入尊重用户在界面内的最新选择。

**Tech Stack:** Node.js ESM、Chrome DevTools Protocol、原生 DOM/CSS、PowerShell、Bash、Node test runner。

---

### Task 1: 主题目录载荷

**Files:**
- Modify: `scripts/injector.mjs`
- Modify: `src/payload.mjs`
- Test: `test/payload.test.mjs`

1. 写一个失败测试，要求 payload 含 8 套受控主题元数据而不包含目录外路径。
2. 运行目标测试，确认因 catalog 参数缺失而失败。
3. 实现 catalog 校验、图片 URL 构建和安全序列化。
4. 运行目标测试并确认通过。

### Task 2: Renderer 即时切换

**Files:**
- Modify: `assets/renderer-inject.js`
- Test: `test/theme-switcher.test.mjs`

1. 写失败测试，要求创建 9 个按钮、活动态、事件委托和持久化键。
2. 运行测试，确认切换器尚不存在。
3. 实现 `applyTheme`、`applyNative`、localStorage 恢复与热重注入保护。
4. 运行目标测试并确认通过。

### Task 3: 胶囊栏视觉

**Files:**
- Modify: `assets/dream-skin.css`
- Test: `test/theme-switcher.test.mjs`

1. 写失败测试，要求右上角定位、可点击、活动态、focus ring 和窄屏布局。
2. 运行测试，确认 CSS 规则缺失。
3. 实现玻璃胶囊栏、主题色圆点、响应式横向滚动与黑金适配。
4. 运行目标测试并确认通过。

### Task 4: 生命周期与文档

**Files:**
- Modify: `scripts/injector.mjs`
- Modify: `assets/renderer-inject.js`
- Modify: `README.md`
- Modify: `task_plan.md`
- Modify: `progress.md`

1. 写失败测试，覆盖首次启动强制主题、后台守护尊重界面选择、完整 Restore 清理持久化状态。
2. 实现首轮/守护注入模式与清理语义。
3. 更新 Windows/macOS 使用说明。
4. 运行全部自动测试和脚本语法检查。

### Task 5: WorkBuddy 实机验证

**Files:**
- Create: `qa-themes/in-app-switcher.png`

1. 安装更新后的本地副本并重新应用。
2. 实际点击粉系、紫夜、黑金与恢复原主题，检查活动按钮和组件计算样式。
3. 重启 WorkBuddy，确认选择持久化。
4. 执行桌面 Restore 后确认切换栏与主题样式完全移除，再恢复默认粉系。

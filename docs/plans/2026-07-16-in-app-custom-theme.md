# In-App Custom Theme Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 WorkBuddy 右上角加入可换图、调色、改标题、实时预览并永久保存的内置主题编辑器。

**Architecture:** 在现有安全 Renderer 注入脚本中增加固定 `custom` 主题、白名单验证、草稿预览和 localStorage 持久化。编辑器使用独立交互根节点和 CSS 抽屉，不新增 IPC、网络或第三方依赖。

**Tech Stack:** 原生 JavaScript、CSS、FileReader、Canvas、localStorage、Node test runner、CDP 实机验证。

---

### Task 1: 自定义主题契约与红灯测试

**Files:**
- Create: `test/custom-theme-editor.test.mjs`
- Modify: `task_plan.md`

1. 断言 Renderer 包含 `custom` 固定 ID、独立存储键、文本/颜色/Data URL 白名单和图片压缩边界。
2. 断言切换栏包含“自定义”入口，面板具备名称、标题、眉题、四个颜色、图片、取消和保存控件。
3. 断言预览不写永久选择、取消恢复旧主题、保存才写 localStorage。
4. 运行 `node --test test/custom-theme-editor.test.mjs`，确认因功能缺失而失败。

### Task 2: 主题模型与持久化

**Files:**
- Modify: `assets/renderer-inject.js`
- Test: `test/custom-theme-editor.test.mjs`

1. 添加安全默认主题、文本/颜色/Data URL 清洗与自定义主题读取函数。
2. 将验证后的 `custom` 放入 `themeMap`，让重启选择恢复复用现有 `applyTheme`。
3. 保存自定义主题时更新 Map、localStorage、按钮色和当前选择。
4. 运行定向测试，确认模型和持久化断言通过。

### Task 3: 编辑器 DOM 与实时预览

**Files:**
- Modify: `assets/renderer-inject.js`
- Test: `test/custom-theme-editor.test.mjs`

1. 创建独立 `workbuddy-dream-customizer-root`、遮罩和带 dialog 语义的抽屉。
2. 创建文本、颜色、图片、恢复默认、取消、保存控件，全部使用安全 DOM API，不拼接用户 HTML。
3. 输入时创建清洗草稿并调用 `applyTheme(draft, false)`；取消恢复打开前选择和主题快照。
4. 图片读取后使用 Canvas 缩放并输出受限 Data URL；错误显示在面板状态区。
5. 运行定向测试。

### Task 4: 调色台视觉与响应式

**Files:**
- Modify: `assets/dream-skin.css`
- Test: `test/custom-theme-editor.test.mjs`

1. 实现右侧 360px 玻璃抽屉、色卡网格、图片投放区、底部操作栏和打开动画。
2. 为自定义按钮添加调色盘视觉、键盘焦点与活动态。
3. 在 760px 以下切换为底部全宽面板并限制高度。
4. 添加 reduced-motion 与黑金可读性处理。
5. 运行定向测试和全量测试。

### Task 5: 安装与真实应用验证

**Files:**
- Update: `progress.md`
- Update: `task_plan.md`
- Create: `qa-themes/in-app-customizer.png`

1. 安装到 `%LOCALAPPDATA%\\WorkBuddyDreamSkin\\app` 并刷新当前应用。
2. 实机打开编辑器，修改标题和颜色，确认页面即时变化。
3. 选择测试图片，确认压缩后预览；取消确认恢复，保存确认 `custom` 激活。
4. 重启或重新注入，确认自定义主题恢复；再切内置主题确认互不污染。
5. 运行 `npm test && npm run check`、安装副本一致性和 CDP 验证。

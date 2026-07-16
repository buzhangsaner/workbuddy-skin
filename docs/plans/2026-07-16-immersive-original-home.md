# Immersive Original Home Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把 WorkBuddy Chat 欢迎页改成接近原版参考图的整页沉浸式主题舞台，同时保留全部原生交互。

**Architecture:** Renderer 注入纯文本品牌标题区并随主题热更新；CSS 将 Hero 扩展到完整工作区，并重新布局稳定的 WorkBuddy 场景、快捷操作和 Composer class。原生主题与非 Chat 路由不启用沉浸式布局。

**Tech Stack:** Node.js ESM、原生 DOM/CSS、Chrome DevTools Protocol、Node test runner。

---

### Task 1: 沉浸式舞台 DOM

**Files:**
- Modify: `assets/renderer-inject.js`
- Test: `test/immersive-home.test.mjs`

1. 写失败测试，要求创建眉题、标题、说明和状态胶囊。
2. 运行测试，确认舞台 DOM 尚不存在。
3. 使用 `textContent` 从主题安全字段更新舞台文案。
4. 运行目标测试并确认通过。

### Task 2: 全幅 Hero 与原版布局

**Files:**
- Modify: `assets/dream-skin.css`
- Test: `test/immersive-home.test.mjs`

1. 写失败测试，要求 Chat Hero 覆盖工作区高度并取消横幅 mask。
2. 写失败测试，要求映射 `.wb-scene-tabs`、`.quick-actions` 与 `.wb-home-composer`。
3. 实现宽屏标题、卡片阵列、底部 Composer 与玻璃层次。
4. 运行目标测试并确认通过。

### Task 3: 主题差异与响应式

**Files:**
- Modify: `assets/dream-skin.css`
- Test: `test/immersive-home.test.mjs`

1. 写失败测试，覆盖黑金深色玻璃和 980px/760px 回退。
2. 实现主题主体位置、文字对比度与窄屏布局。
3. 运行目标测试和全部自动测试。

### Task 4: 实机视觉 QA

**Files:**
- Create: `qa-themes/immersive-purple.png`
- Create: `qa-themes/immersive-pink.png`
- Modify: `README.md`
- Modify: `progress.md`

1. 安装本地副本并应用紫夜，截取 1920px 实机图。
2. 检查并迭代标题、卡片、Composer 和人物位置。
3. 切换粉系、灵感与黑金，验证主题差异和可读性。
4. 执行恢复与重新启用闭环，运行全部测试与双平台脚本检查。

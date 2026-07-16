# Collapse Handle and One-Click Release Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use test-driven-development and execute this plan task-by-task.

**Goal:** Restore the native scene selector, add a persistent compact collapse handle to the theme toolbar, and publish self-contained Windows EXE and macOS DMG installers.

**Architecture:** The renderer owns one localStorage-backed collapsed flag and toggles a root CSS class; no new menu is introduced. Native packaging reuses the existing safe scripts while bundling a Node runtime, with GitHub Actions building on each target OS and releasing artifacts from version tags.

**Tech Stack:** Vanilla JavaScript/CSS, Node test runner, PowerShell, Bash, Inno Setup, macOS app bundle, hdiutil, GitHub Actions.

---

### Task 1: Specify corrected UI behavior

**Files:**
- Create: `test/switcher-collapse.test.mjs`
- Modify: `test/immersive-home.test.mjs`

1. Require a localStorage key, accessible toggle, persisted state and hot-reinjection-safe root class.
2. Require collapsed CSS to hide all toolbar items except a compact `—⌄` handle.
3. Restore assertions for the visible scene selector position and glass styling.
4. Run targeted tests and confirm failures are caused by missing behavior.

### Task 2: Implement collapse and restore scene selector

**Files:**
- Modify: `assets/renderer-inject.js`
- Modify: `assets/dream-skin.css`

1. Add read/write helpers for the collapsed state.
2. Build one toggle button with accessible expanded/collapsed labels.
3. Toggle the root class without entering the theme-selection handler.
4. Remove the incorrect scene-selector hiding declaration.
5. Run targeted and full tests.

### Task 3: Specify and implement bundled runtime selection

**Files:**
- Modify: `scripts/start-workbuddy-dream-skin.ps1`
- Modify: `scripts/start-workbuddy-dream-skin-macos.sh`
- Modify: `scripts/install-workbuddy-dream-skin.ps1`
- Modify: `scripts/install-workbuddy-dream-skin-macos.sh`
- Create: `test/release-packaging.test.mjs`

1. Write failing tests requiring bundled runtime preference and system fallback.
2. Update scripts to use a resolved Node executable consistently.
3. Verify existing source installation remains compatible.

### Task 4: Build native installer definitions

**Files:**
- Create: `packaging/windows/workbuddy-dream-skin.iss`
- Create: `packaging/macos/build-dmg.sh`
- Create: `packaging/macos/Info.plist`
- Create: `packaging/macos/install.sh`

1. Write failing packaging assertions.
2. Add the Inno Setup definition, shortcuts, launch action and uninstall cleanup.
3. Add macOS app-bundle construction, app installer and DMG creation.
4. Verify shell and PowerShell syntax locally.

### Task 5: Add GitHub Release workflow

**Files:**
- Create: `.github/workflows/release.yml`
- Modify: `README.md`

1. Require `v*` tags, manual dispatch, contents write permission and native build jobs.
2. Copy Node runtime/license into each package.
3. Upload EXE/DMG artifacts and create a GitHub Release.
4. Document one-click installation and unsigned macOS first-open behavior.

### Task 6: Verify, integrate and release

1. Install the UI update into WorkBuddy and test the collapse/expand handle with real mouse events.
2. Run all tests, syntax checks, installed-copy diff and large-file scan.
3. Commit the feature branch, merge into `main`, push, tag a release and monitor GitHub Actions.
4. Verify the GitHub Release contains both expected downloads.

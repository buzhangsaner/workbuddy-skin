# WorkBuddy Skin Manager Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a safe cross-platform Electron skin manager for WorkBuddy and expand the built-in catalog from 9 to 15 original themes.

**Architecture:** Add an isolated Electron shell under `manager/` whose main process exposes a narrow IPC bridge to CommonJS core services. The services reuse the existing CDP injector and declarative theme schema, store user themes outside the installation directory, and accept only script-free `.wbskin` packages containing one JSON manifest and one local raster image.

**Tech Stack:** Electron, electron-builder, Node.js 22, Node built-in test runner, adm-zip, existing WorkBuddy CDP injector, HTML/CSS/vanilla JavaScript.

---

### Task 1: Lock the manager package and delivery contract

**Files:**
- Modify: `package.json`
- Create: `test/manager-packaging.test.mjs`

**Step 1: Write the failing test**

Assert that `package.json` exposes `manager:start`, `manager:dist:win`, and `manager:dist:mac`; that Electron uses `manager/electron/main.cjs`; and that electron-builder packages `manager`, `assets`, `src`, `scripts`, and `themes` while producing Windows NSIS/portable and macOS DMG targets.

**Step 2: Run test to verify it fails**

Run: `node --test test/manager-packaging.test.mjs`
Expected: FAIL because manager scripts and build metadata do not exist.

**Step 3: Write minimal implementation**

Add Electron and electron-builder development dependencies, adm-zip runtime dependency, scripts, and a `build` section with product name `WorkBuddy Skin Manager`. Keep the existing package as ESM and use `.cjs` files for Electron/CommonJS code.

**Step 4: Run test to verify it passes**

Run: `node --test test/manager-packaging.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add package.json test/manager-packaging.test.mjs
git commit -m "build: scaffold workbuddy skin manager"
```

### Task 2: Implement a script-free `.wbskin` package format

**Files:**
- Create: `manager/core/theme-package.cjs`
- Create: `test/manager-theme-package.test.mjs`

**Step 1: Write the failing tests**

Cover valid round-trip export/import and rejection of JavaScript, SVG, HTML, remote URLs, absolute paths, `..` traversal, duplicate normalized paths, symbolic links, more than 8 files, compressed files above 18 MB, uncompressed totals above 24 MB, invalid theme IDs, and missing images.

**Step 2: Run tests to verify they fail**

Run: `node --test test/manager-theme-package.test.mjs`
Expected: FAIL because `manager/core/theme-package.cjs` is missing.

**Step 3: Write minimal implementation**

Implement `inspectPackage`, `importPackage`, and `exportPackage` with `adm-zip`; normalize every entry before extraction; validate through the existing declarative theme schema; extract into a random sibling directory; then atomically rename into the user themes directory. A package contains `package.json`, `theme/theme.json`, and exactly one image under `theme/`.

**Step 4: Run tests to verify they pass**

Run: `node --test test/manager-theme-package.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add manager/core/theme-package.cjs test/manager-theme-package.test.mjs
git commit -m "feat: add safe workbuddy theme packages"
```

### Task 3: Aggregate built-in and user themes

**Files:**
- Create: `manager/core/theme-store.cjs`
- Create: `test/manager-theme-store.test.mjs`

**Step 1: Write the failing tests**

Verify that catalog order is preserved, user themes are stored in `%LOCALAPPDATA%/WorkBuddySkinManager/themes` or `~/Library/Application Support/WorkBuddySkinManager/themes`, built-in themes cannot be deleted, user themes can be deleted, duplicate user IDs do not override built-ins, and preview paths stay inside the theme directory.

**Step 2: Run tests to verify they fail**

Run: `node --test test/manager-theme-store.test.mjs`
Expected: FAIL because the store module is missing.

**Step 3: Write minimal implementation**

Implement `listThemes`, `getTheme`, `deleteUserTheme`, and path helpers. Return UI-safe records containing ID, name, description, source, image path, colors, and active state without exposing arbitrary manifest fields.

**Step 4: Run tests to verify they pass**

Run: `node --test test/manager-theme-store.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add manager/core/theme-store.cjs test/manager-theme-store.test.mjs
git commit -m "feat: add manager theme store"
```

### Task 4: Reuse the WorkBuddy injector for apply, status, and restore

**Files:**
- Create: `manager/core/runtime.cjs`
- Create: `test/manager-runtime.test.mjs`

**Step 1: Write the failing tests**

Use temporary executable fixtures to assert exact argument arrays for injector apply/verify/remove, loopback port validation, built-in and user theme paths, watcher replacement, safe WorkBuddy launch paths on Windows/macOS, and stable error codes for `WORKBUDDY_NOT_FOUND`, `DEBUG_PORT_NOT_READY`, and `INJECTION_FAILED`.

**Step 2: Run tests to verify they fail**

Run: `node --test test/manager-runtime.test.mjs`
Expected: FAIL because the runtime module is missing.

**Step 3: Write minimal implementation**

Implement dependency-injected process execution around `scripts/injector.mjs`; reuse port 9336; use argument arrays rather than shell strings; persist only the last manager-applied theme ID and watcher PID identity under the manager state directory; never record WorkBuddy command-line secrets.

**Step 4: Run tests to verify they pass**

Run: `node --test test/manager-runtime.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add manager/core/runtime.cjs test/manager-runtime.test.mjs
git commit -m "feat: manage workbuddy theme runtime"
```

### Task 5: Add a narrow Electron IPC bridge

**Files:**
- Create: `manager/electron/main.cjs`
- Create: `manager/electron/preload.cjs`
- Create: `manager/core/service.cjs`
- Create: `test/manager-electron-security.test.mjs`

**Step 1: Write the failing tests**

Assert `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, navigation and popup denial, fixed GitHub URL handling, a frozen `workbuddySkinAPI`, no generic `invoke(channel, ...)`, and explicit APIs for status/apply/restore/import/export/design/delete/reveal.

**Step 2: Run tests to verify they fail**

Run: `node --test test/manager-electron-security.test.mjs`
Expected: FAIL because the Electron shell is missing.

**Step 3: Write minimal implementation**

Create the BrowserWindow, local `theme-asset://` protocol with resolved-path containment, explicit IPC handlers, file dialogs, confirm dialogs, and the context bridge. Validate every ID, file path, URL, color, enum, boolean, and numeric input in the service layer.

**Step 4: Run tests to verify they pass**

Run: `node --test test/manager-electron-security.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add manager/electron manager/core/service.cjs test/manager-electron-security.test.mjs
git commit -m "feat: add secure manager electron bridge"
```

### Task 6: Build the production manager interface

**Files:**
- Create: `manager/src/index.html`
- Create: `manager/src/app.js`
- Create: `manager/src/styles.css`
- Create: `test/manager-ui.test.mjs`

**Step 1: Write the failing tests**

Assert semantic header/main/footer structure, status region with `aria-live`, labeled import/design/refresh/restore actions, keyboard-accessible theme cards, active state, busy overlay, safe text rendering without `innerHTML` from theme data, responsive grid, visible focus styles, reduced-motion fallback, and no remote fonts/scripts.

**Step 2: Run tests to verify they fail**

Run: `node --test test/manager-ui.test.mjs`
Expected: FAIL because the UI files are missing.

**Step 3: Write minimal implementation**

Use the approved “desktop theme specimen archive” art direction: warm paper canvas, ink typography, vermilion state accents, numbered asymmetric cards, full-bleed previews, subtle grain, and restrained staggered entrance. Implement all real actions, import/export dialogs, delete confirmation, custom theme drawer, toast errors, auto-restart preference, and responsive layouts down to 760 px.

**Step 4: Run tests to verify they pass**

Run: `node --test test/manager-ui.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add manager/src test/manager-ui.test.mjs
git commit -m "feat: build workbuddy skin manager ui"
```

### Task 7: Generate and register six original themes

**Files:**
- Create: `themes/cyber-neon/theme.json`
- Create: `themes/cyber-neon/hero-clean-v1.png`
- Create: `themes/jade-immortal/theme.json`
- Create: `themes/jade-immortal/hero-clean-v1.png`
- Create: `themes/aurora-wasteland/theme.json`
- Create: `themes/aurora-wasteland/hero-clean-v1.png`
- Create: `themes/mecha-alert/theme.json`
- Create: `themes/mecha-alert/hero-clean-v1.png`
- Create: `themes/ink-mountains/theme.json`
- Create: `themes/ink-mountains/hero-clean-v1.png`
- Create: `themes/sea-salt-glass/theme.json`
- Create: `themes/sea-salt-glass/hero-clean-v1.png`
- Modify: `themes/catalog.json`
- Modify: `assets/dream-skin.css`
- Modify: `README.md`
- Modify: `scripts/switch-workbuddy-theme.ps1`
- Create: `test/expanded-theme-catalog.test.mjs`

**Step 1: Write the failing tests**

Require 15 catalog IDs, unique names, valid local images, six canonical color palettes, manager preview metadata, no theme-specific JavaScript, and CSS coverage for sidebars, welcome cards, project pages, chat pages, and input surfaces.

**Step 2: Run tests to verify they fail**

Run: `node --test test/expanded-theme-catalog.test.mjs test/theme-catalog.test.mjs`
Expected: FAIL because the six themes are absent.

**Step 3: Generate project-bound assets**

Use the built-in image generation tool once per distinct theme. Generate 16:9 pure backgrounds with intentional negative space, no UI, no text, no logos, no trademarks, no recognizable protected characters, and no watermark. Copy each selected image into its versioned theme path and inspect it before registration.

**Step 4: Write minimal theme implementation**

Add six declarative manifests, catalog entries, visual-only CSS palettes, documentation, and desktop picker text. Do not add theme IDs to `assets/renderer-inject.js` and do not introduce layout-changing theme CSS.

**Step 5: Run tests to verify they pass**

Run: `node --test test/expanded-theme-catalog.test.mjs test/theme-catalog.test.mjs`
Expected: PASS.

**Step 6: Commit**

```bash
git add themes assets/dream-skin.css README.md scripts/switch-workbuddy-theme.ps1 test
git commit -m "feat: add six original workbuddy themes"
```

### Task 8: Add custom-theme creation and complete manager workflows

**Files:**
- Create: `manager/core/custom-theme.cjs`
- Modify: `manager/core/service.cjs`
- Modify: `manager/src/app.js`
- Modify: `manager/src/index.html`
- Modify: `manager/src/styles.css`
- Create: `test/manager-custom-theme.test.mjs`

**Step 1: Write the failing tests**

Cover safe image extensions and signatures, 16 MB limit, title/name length, hex colors, fit/position enums, copied image containment, collision-resistant IDs, cancellation cleanup, and user-theme records becoming immediately listable/exportable/deletable.

**Step 2: Run tests to verify they fail**

Run: `node --test test/manager-custom-theme.test.mjs`
Expected: FAIL because the custom-theme service is missing.

**Step 3: Write minimal implementation**

Generate a standard declarative theme directory from validated form data and a copied local image. Keep live preview inside the manager using object-fit/object-position and CSS variables; only persist when the user presses Save.

**Step 4: Run tests to verify they pass**

Run: `node --test test/manager-custom-theme.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add manager test/manager-custom-theme.test.mjs
git commit -m "feat: add manager custom theme designer"
```

### Task 9: Verify packaging, documentation, and the real application

**Files:**
- Modify: `.github/workflows/release.yml`
- Modify: `README.md`
- Modify: `progress.md`
- Modify: `findings.md`
- Modify: `test/release-packaging.test.mjs`

**Step 1: Write the failing release test**

Require manager artifacts in Windows/macOS release jobs and README instructions for the manager, `.wbskin` safety, 15 themes, EXE/DMG names, and source operation.

**Step 2: Run test to verify it fails**

Run: `node --test test/release-packaging.test.mjs`
Expected: FAIL because release metadata still describes only the launcher package.

**Step 3: Implement release and documentation updates**

Add manager build commands and artifact upload paths without removing existing one-click packages. Document the manager as recommended while retaining the lightweight script path.

**Step 4: Run automated verification**

Run: `node --test && node --check scripts/injector.mjs && node --check assets/renderer-inject.js && node --check manager/src/app.js && git diff --check`
Expected: all tests and syntax checks pass.

**Step 5: Run visual and WorkBuddy verification**

Start the manager, capture its rendered window, inspect 1440×900 and 900×700 layouts, apply at least three new themes to real WorkBuddy 5.2.6, verify welcome/project/chat pages, restore native appearance, and confirm no horizontal overflow or unreadable text.

**Step 6: Check release file safety**

Run: `find . -size +100M -type f -print`
Expected: no source asset exceeds 100 MB. Built artifacts remain ignored.

**Step 7: Commit**

```bash
git add .github README.md progress.md findings.md test
git commit -m "docs: ship workbuddy skin manager"
```

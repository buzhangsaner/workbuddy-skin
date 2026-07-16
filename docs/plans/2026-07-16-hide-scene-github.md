# Hide Scene Selector and Add GitHub Link Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use test-driven-development and execute this plan task-by-task in the current session.

**Goal:** Hide the native welcome scene selector and add a safe GitHub icon link to the top-right theme toolbar, then publish the verified project.

**Architecture:** Keep the WorkBuddy scene-selector DOM intact and hide it through the Dream Skin stylesheet. Extend the existing injected toolbar with a fixed repository anchor built entirely through DOM APIs and styled as a compact glass icon button.

**Tech Stack:** Vanilla JavaScript DOM injection, CSS, Node test runner, CDP, Git.

---

### Task 1: Specify the UI behavior

**Files:**
- Modify: `test/theme-switcher.test.mjs`
- Modify: `test/immersive-home.test.mjs`

1. Add a test requiring `.wb-scene-tabs` to be hidden in Dream Skin welcome mode.
2. Add a test requiring the repository URL, safe anchor attributes, accessible label, and inline SVG DOM creation.
3. Run the two test files and confirm they fail because the behavior is absent.

### Task 2: Implement the minimal UI change

**Files:**
- Modify: `assets/renderer-inject.js`
- Modify: `assets/dream-skin.css`

1. Add the fixed repository URL constant and a DOM-built GitHub anchor.
2. Append the link after the native-theme button without changing theme selection handling.
3. Hide the welcome scene-selector container and add responsive, hover, and focus styling for the icon.
4. Run targeted tests until green, then run the full suite and syntax checks.

### Task 3: Install and verify in WorkBuddy

**Files:**
- Modify: `README.md`
- Modify: `task_plan.md`
- Modify: `progress.md`

1. Install the updated source into the local WorkBuddy Dream Skin copy.
2. Inspect the live renderer: scene selector has no layout box, GitHub anchor is visible and correctly configured, and the toolbar remains usable.
3. Capture a screenshot and verify the installed copy matches source.

### Task 4: Publish to GitHub

**Files:**
- Create: `.gitignore`

1. Inspect the remote repository without changing it.
2. Initialize or safely join its history based on the remote state.
3. Run `find . -size +100M -type f` and confirm no oversized files.
4. Commit the verified project and push to `buzhangsaner/workbuddy-skin`.
5. Confirm the pushed branch and commit hash from the remote.

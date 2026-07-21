const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const childProcess = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(childProcess.execFile);

function runtimeError(code, message, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.code = code;
  return error;
}

function validatePort(value) {
  if (!Number.isInteger(value) || value < 1024 || value > 65535) throw runtimeError('INVALID_PORT', 'Invalid debugger port');
  return value;
}

function findWorkBuddyExecutable({ platform = process.platform, env = process.env, exists = fs.existsSync } = {}) {
  const candidates = [];
  if (platform === 'win32') {
    if (env.LOCALAPPDATA) candidates.push(path.join(env.LOCALAPPDATA, 'Programs', 'WorkBuddy', 'WorkBuddy.exe'));
    if (env.ProgramFiles) candidates.push(path.join(env.ProgramFiles, 'WorkBuddy', 'WorkBuddy.exe'));
  } else if (platform === 'darwin') {
    candidates.push('/Applications/WorkBuddy.app/Contents/MacOS/WorkBuddy');
  }
  return candidates.find(candidate => {
    try { return exists(candidate); } catch { return false; }
  }) || null;
}

function parseResult(output) {
  const lines = String(output || '').trim().split(/\r?\n/).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try { return JSON.parse(lines[index]); } catch {}
  }
  return null;
}

function defaultDependencies({ platform, env, workBuddyExecutable, nodeEnvironment }) {
  return {
    async endpointReady(port) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(2500) });
        if (!response.ok) return false;
        const list = await response.json();
        return Array.isArray(list) && list.some(item => item?.type === 'page' && item?.title === 'WorkBuddy');
      } catch { return false; }
    },
    async runFile(file, args, options = {}) {
      const { stdout } = await execFileAsync(file, args, {
        windowsHide: true,
        timeout: 45000,
        maxBuffer: 2 * 1024 * 1024,
        ...options,
        env: { ...process.env, ...nodeEnvironment, ...(options.env || {}) },
      });
      return stdout;
    },
    spawnFile(file, args, options = {}) {
      return childProcess.spawn(file, args, {
        stdio: 'ignore',
        windowsHide: true,
        ...options,
        env: { ...process.env, ...nodeEnvironment, ...(options.env || {}) },
      });
    },
    async launchWorkBuddy({ port }) {
      const executable = workBuddyExecutable || findWorkBuddyExecutable({ platform, env });
      if (!executable) throw runtimeError('WORKBUDDY_NOT_FOUND', '未找到 WorkBuddy 客户端');
      if (platform === 'win32') {
        await execFileAsync('taskkill.exe', ['/IM', 'WorkBuddy.exe', '/T', '/F'], { windowsHide: true }).catch(() => {});
      } else if (platform === 'darwin') {
        await execFileAsync('/usr/bin/pkill', ['-x', 'WorkBuddy']).catch(() => {});
      }
      await new Promise(resolve => setTimeout(resolve, 700));
      const child = childProcess.spawn(executable, ['--remote-debugging-address=127.0.0.1'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
        env: { ...process.env, WORKBUDDY_REMOTE_DEBUGGING_PORT: String(port) },
      });
      child.unref();
    },
    async stopRecordedWatcher(record) {
      if (!record || !Number.isInteger(record.watcherPid) || record.watcherPid < 1) return false;
      try { process.kill(record.watcherPid, 'SIGTERM'); return true; } catch { return false; }
    },
  };
}

function createRuntime(options = {}) {
  const projectRoot = path.resolve(options.projectRoot || path.join(__dirname, '..', '..'));
  const stateRoot = path.resolve(options.stateRoot || path.join(projectRoot, '.manager-state'));
  const statePath = path.join(stateRoot, 'runtime.json');
  const injectorPath = path.join(projectRoot, 'scripts', 'injector.mjs');
  const port = validatePort(options.port ?? 9336);
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const nodeExecutable = options.nodeExecutable || process.execPath;
  const nodeEnvironment = process.versions?.electron ? { ELECTRON_RUN_AS_NODE: '1' } : {};
  const dependencies = {
    ...defaultDependencies({ platform, env, workBuddyExecutable: options.workBuddyExecutable, nodeEnvironment }),
    ...(options.dependencies || {}),
  };

  function readState() {
    try { return JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { return null; }
  }

  async function writeState(state) {
    await fsp.mkdir(stateRoot, { recursive: true });
    const temporary = `${statePath}.${process.pid}.tmp`;
    await fsp.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`);
    await fsp.rename(temporary, statePath);
  }

  async function waitForEndpoint() {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (await dependencies.endpointReady(port)) return true;
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    return false;
  }

  async function stopWatcher() {
    const recorded = readState();
    if (!recorded) return false;
    if (path.resolve(recorded.injectorPath || '') !== path.resolve(injectorPath)) return false;
    return dependencies.stopRecordedWatcher(recorded);
  }

  async function applyTheme(theme, { restart = false } = {}) {
    if (!theme || typeof theme.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(theme.id)) {
      throw runtimeError('INVALID_THEME', '主题 id 不合法');
    }
    const themeDir = path.resolve(theme.dir || '');
    if (!fs.existsSync(path.join(themeDir, 'theme.json'))) throw runtimeError('INVALID_THEME', '主题目录无效');
    let ready = await dependencies.endpointReady(port);
    if (!ready && restart) {
      await dependencies.launchWorkBuddy({ port, platform });
      ready = await waitForEndpoint();
    }
    if (!ready) throw runtimeError('DEBUG_PORT_NOT_READY', 'WorkBuddy 调试端口尚未就绪');
    await stopWatcher();
    const applyArgs = [injectorPath, '--port', String(port), '--theme-dir', themeDir, '--once'];
    let result;
    try {
      result = parseResult(await dependencies.runFile(nodeExecutable, applyArgs, { env: nodeEnvironment }));
    } catch (error) {
      throw runtimeError('INJECTION_FAILED', 'WorkBuddy 主题注入失败', error);
    }
    if (!result?.ok) throw runtimeError('INJECTION_FAILED', 'WorkBuddy 主题注入校验失败');
    const watchArgs = [injectorPath, '--port', String(port), '--theme-dir', themeDir, '--respect-selection'];
    const watcher = dependencies.spawnFile(nodeExecutable, watchArgs, { detached: true, env: nodeEnvironment });
    watcher.unref?.();
    await writeState({ themeId: theme.id, watcherPid: watcher.pid, injectorPath });
    return { ok: true, selection: result.results?.[0]?.selection || theme.id, watcherPid: watcher.pid };
  }

  async function status() {
    const debugReady = await dependencies.endpointReady(port);
    if (!debugReady) return { debugReady: false, selection: readState()?.themeId || null };
    try {
      const output = await dependencies.runFile(nodeExecutable, [injectorPath, '--port', String(port), '--verify'], { env: nodeEnvironment });
      const result = parseResult(output);
      return { debugReady: true, selection: result?.results?.[0]?.selection || readState()?.themeId || null };
    } catch {
      return { debugReady: true, selection: readState()?.themeId || null };
    }
  }

  async function restore() {
    await stopWatcher();
    if (await dependencies.endpointReady(port)) {
      try {
        await dependencies.runFile(nodeExecutable, [injectorPath, '--port', String(port), '--remove', '--once'], { env: nodeEnvironment });
      } catch (error) {
        throw runtimeError('INJECTION_FAILED', 'WorkBuddy 原主题恢复失败', error);
      }
    }
    await fsp.rm(statePath, { force: true }).catch(() => {});
    return { ok: true, restored: true };
  }

  return { projectRoot, stateRoot, injectorPath, port, applyTheme, status, restore };
}

module.exports = { createRuntime, findWorkBuddyExecutable, validatePort };

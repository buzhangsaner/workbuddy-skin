import path from 'node:path';

export function isAllowedDebuggerUrl(value, port) {
  try {
    const url = new URL(value);
    return url.protocol === 'ws:' &&
      (url.hostname === '127.0.0.1' || url.hostname === 'localhost') &&
      Number(url.port) === Number(port) &&
      url.pathname.startsWith('/devtools/');
  } catch {
    return false;
  }
}

export function isCandidateWorkBuddyTarget(target) {
  if (!target || target.type !== 'page' || target.title !== 'WorkBuddy') return false;
  let decoded;
  try {
    const url = new URL(target.url);
    if (url.protocol !== 'file:') return false;
    decoded = decodeURIComponent(url.pathname).replaceAll('\\', '/').toLowerCase();
  } catch {
    return false;
  }
  return decoded.includes('/workbuddy/resources/app.asar/renderer/index.html');
}

function samePath(left, right) {
  return typeof left === 'string' && typeof right === 'string' &&
    path.win32.normalize(left).toLowerCase() === path.win32.normalize(right).toLowerCase();
}

export function isRecordedInjectorIdentity(recorded, actual) {
  return Boolean(recorded && actual) &&
    Number(recorded.pid) === Number(actual.pid) &&
    samePath(recorded.executable, actual.executable) &&
    samePath(recorded.scriptPath, actual.scriptPath) &&
    recorded.startedAt === actual.startedAt;
}

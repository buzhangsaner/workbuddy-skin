const api = window.workbuddySkinAPI;
const byId = id => document.getElementById(id);
const grid = byId('themeGrid');
const toast = byId('toast');
const busyOverlay = byId('busyOverlay');
const designerDialog = byId('designerDialog');
let statusSnapshot = { themes: [], selection: null, workBuddyReady: false };
let toastTimer = null;

function create(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

function showToast(message, tone = 'neutral') {
  clearTimeout(toastTimer);
  toast.textContent = String(message || '操作完成');
  toast.dataset.tone = tone;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
}

function setBusy(active, message = '正在处理…') {
  busyOverlay.hidden = !active;
  byId('busyText').textContent = message;
  document.querySelectorAll('button, input, select').forEach(control => { control.disabled = active; });
}

function errorMessage(error) {
  const code = error?.code || '';
  if (code === 'DEBUG_PORT_NOT_READY' || /调试端口/.test(error?.message || '')) return 'WorkBuddy 需要通过管理器重新启动后才能换肤。';
  if (code === 'WORKBUDDY_NOT_FOUND' || /未找到 WorkBuddy/.test(error?.message || '')) return '没有找到 WorkBuddy，请确认客户端已安装后重试。';
  if (/主题包|不安全|路径|JavaScript/i.test(error?.message || '')) return `主题包被安全检查拒绝：${error.message}`;
  return error?.message || '操作失败，请重试。';
}

function appendTag(container, label) {
  container.append(create('span', 'theme-tag', label));
}

function actionButton(label, className, handler) {
  const button = create('button', className, label);
  button.type = 'button';
  button.addEventListener('click', handler);
  return button;
}

function themeCard(theme, index) {
  const article = create('article', `theme-card${theme.active ? ' is-active' : ''}`);
  article.style.setProperty('--card-index', String(index));

  const media = create('div', 'theme-media');
  const image = create('img', 'theme-preview');
  image.src = theme.previewUrl;
  image.alt = `${theme.name}主题预览`;
  image.loading = 'lazy';
  media.append(image);
  media.append(create('span', 'theme-sequence', String(index + 1).padStart(2, '0')));
  media.append(create('span', `theme-state${theme.active ? ' active' : ''}`, theme.active ? '使用中' : '可选择'));

  const content = create('div', 'theme-content');
  const titleRow = create('div', 'theme-title-row');
  titleRow.append(create('h3', '', theme.name));
  titleRow.append(create('span', 'source-mark', theme.builtin ? '内置' : '自定义'));
  content.append(titleRow);
  content.append(create('p', 'theme-description', theme.description || theme.tagline));
  const tags = create('div', 'theme-tags');
  appendTag(tags, theme.colors?.accent || '#000000');
  appendTag(tags, theme.builtin ? '内置档案' : '个人收藏');
  content.append(tags);

  const actions = create('div', 'card-actions');
  const apply = actionButton(theme.active ? '重新应用' : '使用此主题', 'apply-button', async () => {
    setBusy(true, `正在应用“${theme.name}”…`);
    try {
      await api.applyTheme(theme.id, { restart: byId('restartWorkBuddy').checked });
      showToast(`已应用“${theme.name}”`, 'success');
      await refresh();
    } catch (error) { showToast(errorMessage(error), 'error'); }
    finally { setBusy(false); }
  });
  apply.setAttribute('aria-pressed', theme.active ? 'true' : 'false');
  actions.append(apply);
  actions.append(actionButton('导出', 'small-button', async () => {
    setBusy(true, `正在导出“${theme.name}”…`);
    try {
      const result = await api.exportTheme(theme.id);
      if (!result?.canceled) {
        showToast('主题包已导出', 'success');
        if (result?.path) await api.revealFile(result.path);
      }
    } catch (error) { showToast(errorMessage(error), 'error'); }
    finally { setBusy(false); }
  }));
  if (!theme.builtin) actions.append(actionButton('删除', 'small-button danger', async () => {
    try {
      const result = await api.deleteTheme(theme.id);
      if (!result?.canceled) { showToast('自定义主题已删除'); await refresh(); }
    } catch (error) { showToast(errorMessage(error), 'error'); }
  }));
  content.append(actions);
  article.append(media, content);
  return article;
}

function render(status) {
  statusSnapshot = status;
  grid.replaceChildren(...status.themes.map(themeCard));
  byId('themeCount').textContent = String(status.themes.length).padStart(2, '0');
  byId('workBuddyStatus').textContent = status.workBuddyReady ? 'WorkBuddy 已连接' : 'WorkBuddy 等待连接';
  const active = status.themes.find(theme => theme.active);
  byId('activeThemeStatus').textContent = active ? `当前主题：${active.name}` : '当前主题：原生';
  byId('managerStatus').classList.toggle('is-ready', status.workBuddyReady);
}

async function refresh() {
  const status = await api.status();
  render(status);
  return status;
}

byId('refreshThemes').addEventListener('click', async () => {
  setBusy(true, '正在刷新主题馆…');
  try { await refresh(); showToast('主题状态已刷新'); }
  catch (error) { showToast(errorMessage(error), 'error'); }
  finally { setBusy(false); }
});

byId('restoreTheme').addEventListener('click', async () => {
  setBusy(true, '正在恢复 WorkBuddy 原生外观…');
  try { await api.restore(); await refresh(); showToast('已恢复原生外观', 'success'); }
  catch (error) { showToast(errorMessage(error), 'error'); }
  finally { setBusy(false); }
});

byId('importTheme').addEventListener('click', async () => {
  setBusy(true, '正在检查主题包…');
  try {
    const result = await api.importTheme();
    if (!result?.canceled) { await refresh(); showToast(`已导入“${result.name || result.id}”`, 'success'); }
  } catch (error) { showToast(errorMessage(error), 'error'); }
  finally { setBusy(false); }
});

byId('openGitHub').addEventListener('click', () => api.openGitHub());
byId('designTheme').addEventListener('click', () => designerDialog.showModal());
byId('closeDesigner').addEventListener('click', () => designerDialog.close());
byId('cancelDesigner').addEventListener('click', () => designerDialog.close());

byId('chooseWallpaper').addEventListener('click', async () => {
  try {
    const result = await api.chooseWallpaper();
    if (result?.path) {
      byId('wallpaperPath').value = result.path;
      byId('wallpaperName').textContent = result.name || '已选择背景图';
      const preview = byId('designerPreview');
      if (result.previewUrl) {
        const wallpaper = `url(${JSON.stringify(result.previewUrl)})`;
        preview.style.setProperty('--preview-wallpaper', wallpaper);
        preview.style.backgroundImage = `linear-gradient(90deg, color-mix(in srgb, var(--preview-surface) 92%, transparent), transparent 72%), ${wallpaper}`;
      }
      updateDesignerPreview();
    }
  } catch (error) { showToast(errorMessage(error), 'error'); }
});

function updateDesignerPreview() {
  const preview = byId('designerPreview');
  preview.style.setProperty('--preview-accent', byId('customAccent').value);
  preview.style.setProperty('--preview-surface', byId('customSurface').value);
  preview.style.setProperty('--preview-ink', byId('customInk').value);
  preview.style.backgroundSize = byId('customFit').value;
  preview.style.backgroundPosition = byId('customPosition').value;
  byId('previewTitle').textContent = byId('customName').value || '我的自定义主题';
  byId('previewQuote').textContent = byId('customQuote').value || 'MY WORKBUDDY';
}
document.querySelectorAll('#designerForm input, #designerForm select').forEach(input => input.addEventListener('input', updateDesignerPreview));

byId('designerForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!byId('wallpaperPath').value) { showToast('请先选择一张背景图', 'error'); return; }
  setBusy(true, '正在保存自定义主题…');
  try {
    const result = await api.designTheme({
      imagePath: byId('wallpaperPath').value,
      name: byId('customName').value,
      tagline: byId('customTagline').value,
      quote: byId('customQuote').value,
      accent: byId('customAccent').value,
      secondary: byId('customSecondary').value,
      surface: byId('customSurface').value,
      ink: byId('customInk').value,
      fit: byId('customFit').value,
      position: byId('customPosition').value,
    });
    designerDialog.close();
    await refresh();
    showToast(`“${result.name}”已加入主题馆`, 'success');
  } catch (error) { showToast(errorMessage(error), 'error'); }
  finally { setBusy(false); }
});

refresh().catch(error => showToast(errorMessage(error), 'error'));

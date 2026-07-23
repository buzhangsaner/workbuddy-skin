((cssText, themes, requestedThemeId, forceSelection) => {
  const STATE_KEY = '__WORKBUDDY_DREAM_SKIN_STATE__';
  const STYLE_ID = 'workbuddy-dream-skin-style';
  const CHROME_ID = 'workbuddy-dream-chrome';
  const SWITCHER_ROOT_ID = 'workbuddy-dream-switcher-root';
  const CUSTOMIZER_ROOT_ID = 'workbuddy-dream-customizer-root';
  const STORAGE_KEY = 'workbuddy-dream-skin-selection-v1';
  const CUSTOM_STORAGE_KEY = 'workbuddy-dream-custom-theme-v1';
  const SWITCHER_COLLAPSED_KEY = 'workbuddy-dream-switcher-collapsed-v1';
  const GITHUB_URL = 'https://github.com/buzhangsaner/workbuddy-skin/';
  const VERSION = '0.6.2';
  const NATIVE_ID = 'native';
  const CUSTOM_ID = 'custom';
  const themeMap = new Map(themes.map(theme => [theme.id, theme]));
  const listedThemes = themes.filter(theme => theme.listed !== false);

  const safeText = (value, limit, fallback) => {
    const text = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit);
    return text || fallback;
  };
  const safeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
  const safeCustomImage = (value, fallback) => {
    const image = String(value || '');
    return /^data:image\/(?:png|jpeg|webp);base64,/i.test(image) && image.length <= 4_000_000 ? image : fallback;
  };
  const defaultCustomTheme = () => ({
    id: CUSTOM_ID,
    name: '我的主题',
    tagline: '把喜欢的颜色，变成每天的工作空间',
    quote: 'MY CREATIVE SPACE',
    imageUrl: listedThemes[0]?.imageUrl || '',
    colors: {
      accent: '#7c5cff',
      secondary: '#35bde8',
      surface: '#f7f4ff',
      ink: '#241c3d',
    },
  });
  const sanitizeCustomTheme = value => {
    const fallback = defaultCustomTheme();
    const source = value && typeof value === 'object' ? value : {};
    return {
      id: CUSTOM_ID,
      name: safeText(source.name, 24, fallback.name),
      tagline: safeText(source.tagline, 64, fallback.tagline),
      quote: safeText(source.quote, 32, fallback.quote),
      imageUrl: safeCustomImage(source.imageUrl, fallback.imageUrl),
      colors: {
        accent: safeColor(source.colors?.accent, fallback.colors.accent),
        secondary: safeColor(source.colors?.secondary, fallback.colors.secondary),
        surface: safeColor(source.colors?.surface, fallback.colors.surface),
        ink: safeColor(source.colors?.ink, fallback.colors.ink),
      },
    };
  };
  const readCustomTheme = () => {
    try { return sanitizeCustomTheme(JSON.parse(localStorage.getItem(CUSTOM_STORAGE_KEY) || 'null')); }
    catch { return defaultCustomTheme(); }
  };
  const writeCustomTheme = value => {
    const theme = sanitizeCustomTheme(value);
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(theme));
    return theme;
  };
  let customTheme = readCustomTheme();
  themeMap.set(CUSTOM_ID, customTheme);

  const fingerprint = () => document.title === 'WorkBuddy' &&
    Boolean(document.getElementById('root')) &&
    location.protocol === 'file:' &&
    decodeURIComponent(location.pathname).replaceAll('\\', '/').toLowerCase().includes('/workbuddy/resources/app.asar/renderer/index.html');

  if (!fingerprint()) throw new Error('WorkBuddy renderer fingerprint mismatch');

  const previous = window[STATE_KEY];
  const previousCustomizerSnapshot = previous?.customizerSnapshot;
  previous?.observer?.disconnect();
  if (previous?.timer) clearInterval(previous.timer);
  if (previous?.hashHandler) removeEventListener('hashchange', previous.hashHandler);
  if (previous?.scheduled) clearTimeout(previous.scheduled);
  document.getElementById(CUSTOMIZER_ROOT_ID)?.remove();

  const readSelection = () => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  };
  const writeSelection = value => {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* Storage can be unavailable in hardened renderers. */ }
  };
  const clearSelection = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage can be unavailable in hardened renderers. */ }
  };
  const readSwitcherCollapsed = () => {
    try { return localStorage.getItem(SWITCHER_COLLAPSED_KEY) === 'true'; } catch { return false; }
  };
  const writeSwitcherCollapsed = value => {
    try { localStorage.setItem(SWITCHER_COLLAPSED_KEY, String(value)); } catch { /* Keep the control usable without persistence. */ }
  };
  let switcherCollapsed = readSwitcherCollapsed();
  const isValidSelection = value => value === NATIVE_ID || themeMap.has(value);
  const requested = themeMap.has(requestedThemeId) ? requestedThemeId : listedThemes[0]?.id;
  const stored = readSelection();
  let currentSelection = forceSelection
    ? requested
    : previousCustomizerSnapshot?.open
      ? CUSTOM_ID
      : isValidSelection(stored)
      ? stored
      : isValidSelection(previous?.currentSelection)
        ? previous.currentSelection
        : requested;
  if (!isValidSelection(currentSelection)) throw new Error('No valid Dream Skin theme is available');
  if (!forceSelection && previousCustomizerSnapshot?.open) {
    customTheme = sanitizeCustomTheme(previousCustomizerSnapshot.draft);
    themeMap.set(CUSTOM_ID, customTheme);
  }
  if (forceSelection) writeSelection(currentSelection);

  const routeName = () => {
    if (document.querySelector('.main-content--projects')) return 'projects';
    if (document.querySelector('.main-content--chat, .main-content--welcome')) return 'chat';
    const main = document.querySelector('.main-content');
    const classRoute = [...(main?.classList || [])]
      .find(name => name.startsWith('main-content--'))
      ?.slice('main-content--'.length);
    if (classRoute) return classRoute;
    const route = location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] || 'chat';
    return ['chat', 'projects', 'tasks', 'plugins', 'terminal', 'canvas', 'editor', 'changes', 'settings'].includes(route) ? route : 'other';
  };

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  const clearThemeProperties = root => {
    for (const name of ['--wb-theme-accent', '--wb-theme-secondary', '--wb-theme-surface', '--wb-theme-ink', '--wb-dream-art']) {
      root.style.removeProperty(name);
    }
  };

  const updateButtons = () => {
    const switcher = document.querySelector('.wb-dream-switcher');
    if (!switcher) return;
    for (const button of switcher.querySelectorAll('.wb-dream-theme-chip')) {
      const active = button.dataset.themeId === currentSelection;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-active', active);
    }
  };

  const updateHero = theme => {
    const chrome = document.getElementById(CHROME_ID);
    if (!chrome) return;
    const art = chrome.querySelector('.wb-dream-hero-art');
    if (art && art.src !== theme.imageUrl) art.src = theme.imageUrl;
    if (art) {
      art.style.objectFit = theme.presentation?.fit || '';
      art.style.objectPosition = theme.presentation?.position || '';
    }
    const name = chrome.querySelector('.wb-dream-copy strong');
    const tagline = chrome.querySelector('.wb-dream-copy span');
    const badge = chrome.querySelector('.wb-dream-badge');
    const immersiveEyebrow = chrome.querySelector('.wb-dream-immersive__eyebrow');
    const immersiveTitle = chrome.querySelector('.wb-dream-immersive__title');
    const immersiveDescription = chrome.querySelector('.wb-dream-immersive__description');
    const immersiveStatus = chrome.querySelector('.wb-dream-immersive__status-text');
    if (name) name.textContent = theme.name;
    if (tagline) tagline.textContent = theme.tagline;
    if (badge) badge.textContent = theme.quote;
    if (immersiveEyebrow) immersiveEyebrow.textContent = `${theme.quote} / WORKBUDDY LAB`;
    if (immersiveTitle) immersiveTitle.textContent = theme.tagline;
    if (immersiveDescription) immersiveDescription.textContent = `从一个想法开始，让 ${theme.name} 陪你观察、验证并完成真正可用的答案。`;
    if (immersiveStatus) immersiveStatus.textContent = `${theme.name}已就绪 · 选择一项任务启航`;
  };

  const applyTheme = (theme, persist = true) => {
    if (!themeMap.has(theme?.id)) return false;
    currentSelection = theme.id;
    if (persist) writeSelection(currentSelection);
    const root = document.documentElement;
    root.classList.add('workbuddy-dream-skin');
    root.dataset.wbDreamRoute = routeName();
    root.dataset.wbDreamTheme = theme.id;
    root.style.setProperty('--wb-theme-accent', theme.colors.accent);
    root.style.setProperty('--wb-theme-secondary', theme.colors.secondary);
    root.style.setProperty('--wb-theme-surface', theme.colors.surface);
    root.style.setProperty('--wb-theme-ink', theme.colors.ink);
    root.style.setProperty('--wb-dream-art', `url(${JSON.stringify(theme.imageUrl)})`);
    document.getElementById(CHROME_ID)?.classList.remove('wb-dream-native');
    updateHero(theme);
    updateButtons();
    return true;
  };

  const applyNative = (persist = true) => {
    currentSelection = NATIVE_ID;
    if (persist) writeSelection(currentSelection);
    const root = document.documentElement;
    root.classList.remove('workbuddy-dream-skin');
    delete root.dataset.wbDreamRoute;
    delete root.dataset.wbDreamTheme;
    clearThemeProperties(root);
    document.getElementById(CHROME_ID)?.classList.add('wb-dream-native');
    updateButtons();
    return true;
  };

  const selectTheme = id => id === NATIVE_ID ? applyNative() : applyTheme(themeMap.get(id));

  const ensureStyle = () => {
    const root = document.documentElement;
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || root).appendChild(style);
    }
    if (style.dataset.version !== VERSION || style.textContent !== cssText) {
      style.textContent = cssText;
      style.dataset.version = VERSION;
    }
  };

  const createThemeButton = theme => {
    const button = element('button', 'wb-dream-theme-chip');
    if (theme.id === CUSTOM_ID) button.classList.add('wb-dream-theme-chip--custom');
    button.type = 'button';
    button.dataset.themeId = theme.id;
    button.title = theme.description || theme.name;
    button.style.setProperty('--chip-accent', theme.colors?.accent || '#64748b');
    button.style.setProperty('--chip-secondary', theme.colors?.secondary || '#94a3b8');
    button.append(element('span', 'wb-dream-theme-dot'));
    button.append(element('span', 'wb-dream-theme-label', theme.name));
    return button;
  };

  const createGitHubLink = () => {
    const link = element('a', 'wb-dream-github-link');
    link.href = GITHUB_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = '在 GitHub 查看 WorkBuddy Skin';
    link.setAttribute('aria-label', '在 GitHub 打开 WorkBuddy Skin');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('d', 'M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.38.97.11-.75.41-1.27.74-1.56-2.57-.29-5.27-1.29-5.27-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.75 0c2.19-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.41-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.15v3.26c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z');
    svg.append(path);
    link.append(svg);
    return link;
  };

  const createSwitcherToggle = () => {
    const button = element('button', 'wb-dream-switcher-toggle');
    button.type = 'button';
    button.dataset.switcherAction = 'toggle';
    button.append(element('span', 'wb-dream-switcher-toggle__line'));
    return button;
  };

  const applySwitcherCollapsed = (switcherRoot, collapsed) => {
    switcherRoot.classList.toggle('is-collapsed', collapsed);
    const button = switcherRoot.querySelector('.wb-dream-switcher-toggle');
    if (!button) return;
    button.setAttribute('aria-expanded', String(!collapsed));
    button.setAttribute('aria-label', collapsed ? '展开主题选择栏' : '收起主题选择栏');
    button.title = collapsed ? '展开主题选择栏' : '收起主题选择栏';
  };

  let customizerSession = !forceSelection && previousCustomizerSnapshot?.open ? {
    open: true,
    previousSelection: isValidSelection(previousCustomizerSnapshot.previousSelection) ? previousCustomizerSnapshot.previousSelection : listedThemes[0]?.id,
    saved: sanitizeCustomTheme(previousCustomizerSnapshot.saved),
    draft: sanitizeCustomTheme(previousCustomizerSnapshot.draft),
  } : null;

  const cloneTheme = theme => ({ ...theme, colors: { ...theme.colors } });
  const setCustomizerStatus = (message, error = false) => {
    const status = document.querySelector('.wb-dream-customizer__status');
    if (!status) return;
    if (status.textContent !== message) status.textContent = message;
    status.classList.toggle('is-error', error);
  };
  const updateCustomButton = theme => {
    const button = document.querySelector(`.wb-dream-theme-chip[data-theme-id="${CUSTOM_ID}"]`);
    if (!button) return;
    button.style.setProperty('--chip-accent', theme.colors.accent);
    button.style.setProperty('--chip-secondary', theme.colors.secondary);
    button.title = `${theme.name} · 点击编辑`;
  };
  const fillCustomizerFields = draft => {
    const root = document.getElementById(CUSTOMIZER_ROOT_ID);
    if (!root) return;
    for (const [field, value] of Object.entries({ name: draft.name, tagline: draft.tagline, quote: draft.quote })) {
      const input = root.querySelector(`[data-custom-field="${field}"]`);
      if (input && input.value !== value) input.value = value;
    }
    for (const [field, value] of Object.entries(draft.colors)) {
      const input = root.querySelector(`[data-custom-color="${field}"]`);
      if (input && input.value !== value) input.value = value;
    }
    const swatch = root.querySelector('.wb-dream-customizer__image-preview');
    if (swatch) swatch.style.backgroundImage = `linear-gradient(135deg, color-mix(in srgb, ${draft.colors.surface} 45%, transparent), transparent), url(${JSON.stringify(draft.imageUrl)})`;
  };
  const previewCustomizer = () => {
    if (!customizerSession?.open) return;
    const draft = sanitizeCustomTheme(customizerSession.draft);
    customizerSession.draft = draft;
    themeMap.set(CUSTOM_ID, draft);
    customTheme = draft;
    applyTheme(draft, false);
    updateCustomButton(draft);
    fillCustomizerFields(draft);
  };
  const closeCustomizerPanel = () => {
    const root = document.getElementById(CUSTOMIZER_ROOT_ID);
    root?.classList.remove('is-open');
    root?.setAttribute('aria-hidden', 'true');
  };
  const restoreCustomizerSelection = () => {
    if (!customizerSession) return;
    const { previousSelection, saved } = customizerSession;
    customTheme = sanitizeCustomTheme(saved);
    themeMap.set(CUSTOM_ID, customTheme);
    customizerSession = null;
    closeCustomizerPanel();
    if (previousSelection === NATIVE_ID) applyNative(false);
    else applyTheme(themeMap.get(previousSelection) || listedThemes[0], false);
    updateCustomButton(customTheme);
  };
  const saveCustomizer = () => {
    if (!customizerSession?.open) return;
    try {
      const draft = writeCustomTheme(customizerSession.draft);
      customTheme = draft;
      themeMap.set(CUSTOM_ID, draft);
      writeSelection(CUSTOM_ID);
      customizerSession = null;
      closeCustomizerPanel();
      applyTheme(draft, false);
      updateCustomButton(draft);
    } catch {
      setCustomizerStatus('保存失败：背景图可能过大，请换一张图片', true);
    }
  };
  const resetCustomizer = () => {
    if (!customizerSession?.open) return;
    customizerSession.draft = defaultCustomTheme();
    previewCustomizer();
    setCustomizerStatus('已恢复默认草稿，保存后才会生效');
  };
  const compressImageFile = file => new Promise((resolve, reject) => {
    if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) return reject(new Error('图片格式仅支持 PNG、JPG、WebP'));
    if (file.size > 16 * 1024 * 1024) return reject(new Error('图片过大，请选择 16MB 以内的图片'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('图片格式无法识别'));
      image.onload = () => {
        const scale = Math.min(1, 1920 / image.naturalWidth, 1200 / image.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        context.fillStyle = customizerSession?.draft.colors.surface || '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', .88);
        if (dataUrl.length > 4_000_000) return reject(new Error('图片过大，请选择细节更少的图片'));
        resolve(dataUrl);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

  const customizerTextField = (labelText, field, className, maxLength) => {
    const label = element('label', 'wb-dream-customizer__field');
    label.append(element('span', 'wb-dream-customizer__label', labelText));
    const input = element('input', className);
    input.type = 'text';
    input.maxLength = maxLength;
    input.dataset.customField = field;
    label.append(input);
    return label;
  };
  const ensureCustomizer = () => {
    let root = document.getElementById(CUSTOMIZER_ROOT_ID);
    if (root) return root;
    root = element('div');
    root.id = CUSTOMIZER_ROOT_ID;
    root.setAttribute('aria-hidden', 'true');
    const backdrop = element('button', 'wb-dream-customizer__backdrop');
    backdrop.type = 'button';
    backdrop.dataset.customAction = 'cancel';
    backdrop.setAttribute('aria-label', '关闭自定义主题编辑器');
    const panel = element('section', 'wb-dream-customizer');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'wb-dream-customizer-title');
    const header = element('header', 'wb-dream-customizer__header');
    const heading = element('div');
    const eyebrow = element('span', 'wb-dream-customizer__eyebrow', 'THEME ATELIER');
    const title = element('h2', 'wb-dream-customizer__heading', '自定义主题');
    title.id = 'wb-dream-customizer-title';
    heading.append(eyebrow, title);
    const close = element('button', 'wb-dream-customizer__close', '×');
    close.type = 'button';
    close.dataset.customAction = 'cancel';
    close.setAttribute('aria-label', '取消编辑');
    header.append(heading, close);
    const body = element('div', 'wb-dream-customizer__body');
    const intro = element('p', 'wb-dream-customizer__intro', '修改内容会立刻预览；只有点击保存才会永久生效。');
    body.append(intro);
    body.append(customizerTextField('主题名称', 'name', 'wb-dream-customizer__name-input', 24));
    body.append(customizerTextField('主标题', 'tagline', 'wb-dream-customizer__title-input', 64));
    body.append(customizerTextField('英文眉题', 'quote', 'wb-dream-customizer__quote-input', 32));
    body.append(element('div', 'wb-dream-customizer__section-title', '主题色板'));
    const colors = element('div', 'wb-dream-customizer__colors');
    for (const [field, labelText] of [['accent', '主色'], ['secondary', '辅助色'], ['surface', '背景色'], ['ink', '文字色']]) {
      const label = element('label', 'wb-dream-customizer__color');
      const input = element('input', 'wb-dream-customizer__color-input');
      input.type = 'color';
      input.dataset.customColor = field;
      label.append(element('span', null, labelText), input);
      colors.append(label);
    }
    body.append(colors);
    body.append(element('div', 'wb-dream-customizer__section-title', '背景图片'));
    const imageLabel = element('label', 'wb-dream-customizer__image-drop');
    const imagePreview = element('span', 'wb-dream-customizer__image-preview');
    const imageCopy = element('span', 'wb-dream-customizer__image-copy', '选择 PNG / JPG / WebP');
    const imageInput = element('input', 'wb-dream-customizer__image-input');
    imageInput.type = 'file';
    imageInput.accept = 'image/png,image/jpeg,image/webp';
    imageLabel.append(imagePreview, imageCopy, imageInput);
    body.append(imageLabel);
    body.append(element('p', 'wb-dream-customizer__status', '图片只保存在本机，不会上传。'));
    const footer = element('footer', 'wb-dream-customizer__footer');
    const reset = element('button', 'wb-dream-customizer__reset', '恢复默认');
    reset.type = 'button';
    reset.dataset.customAction = 'reset';
    const cancel = element('button', 'wb-dream-customizer__cancel', '取消');
    cancel.type = 'button';
    cancel.dataset.customAction = 'cancel';
    const save = element('button', 'wb-dream-customizer__save', '保存主题');
    save.type = 'button';
    save.dataset.customAction = 'save';
    footer.append(reset, cancel, save);
    panel.append(header, body, footer);
    root.append(backdrop, panel);
    root.oninput = event => {
      if (!customizerSession?.open) return;
      const field = event.target.dataset.customField;
      const color = event.target.dataset.customColor;
      if (field) customizerSession.draft[field] = event.target.value;
      if (color) customizerSession.draft.colors[color] = event.target.value;
      if (field || color) previewCustomizer();
    };
    root.onchange = async event => {
      if (!event.target.classList.contains('wb-dream-customizer__image-input') || !customizerSession?.open) return;
      try {
        setCustomizerStatus('正在优化背景图片…');
        customizerSession.draft.imageUrl = await compressImageFile(event.target.files?.[0]);
        previewCustomizer();
        setCustomizerStatus('背景已载入，点击保存后永久生效');
      } catch (error) { setCustomizerStatus(error.message, true); }
      finally { event.target.value = ''; }
    };
    root.onclick = event => {
      const action = event.target.closest('[data-custom-action]')?.dataset.customAction;
      if (action === 'cancel') restoreCustomizerSelection();
      if (action === 'reset') resetCustomizer();
      if (action === 'save') saveCustomizer();
    };
    root.onkeydown = event => { if (event.key === 'Escape') restoreCustomizerSelection(); };
    document.body.appendChild(root);
    return root;
  };
  const openCustomizer = () => {
    const saved = readCustomTheme();
    customizerSession = {
      open: true,
      previousSelection: currentSelection,
      saved: cloneTheme(saved),
      draft: cloneTheme(saved),
    };
    const root = ensureCustomizer();
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    fillCustomizerFields(customizerSession.draft);
    previewCustomizer();
    setCustomizerStatus('实时预览中 · 保存后重启仍保留');
    requestAnimationFrame(() => root.querySelector('.wb-dream-customizer__name-input')?.focus());
  };
  const resumeCustomizer = () => {
    if (!customizerSession?.open) return;
    const root = ensureCustomizer();
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    fillCustomizerFields(customizerSession.draft);
    previewCustomizer();
    setCustomizerStatus('实时预览中 · 保存后重启仍保留');
  };

  const createImmersiveStory = () => {
    const immersive = element('section', 'wb-dream-immersive');
    immersive.setAttribute('aria-hidden', 'true');
    immersive.append(element('div', 'wb-dream-immersive__eyebrow'));
    immersive.append(element('h2', 'wb-dream-immersive__title'));
    immersive.append(element('p', 'wb-dream-immersive__description'));
    const immersiveStatus = element('div', 'wb-dream-immersive__status');
    immersiveStatus.append(element('i', 'wb-dream-immersive__status-dot'));
    immersiveStatus.append(element('span', 'wb-dream-immersive__status-text'));
    immersive.append(immersiveStatus);
    return immersive;
  };

  const ensureChrome = () => {
    let chrome = document.getElementById(CHROME_ID);
    if (!chrome) {
      chrome = element('div');
      chrome.id = CHROME_ID;
      const stars = element('div', 'wb-dream-stars');
      const orbOne = element('div', 'wb-dream-orb wb-dream-orb--one');
      const orbTwo = element('div', 'wb-dream-orb wb-dream-orb--two');
      stars.setAttribute('aria-hidden', 'true');
      orbOne.setAttribute('aria-hidden', 'true');
      orbTwo.setAttribute('aria-hidden', 'true');
      chrome.append(stars, orbOne, orbTwo);
      const hero = element('div', 'wb-dream-hero');
      hero.setAttribute('aria-hidden', 'true');
      const art = element('img', 'wb-dream-hero-art');
      art.alt = '';
      hero.append(art);
      const copy = element('div', 'wb-dream-copy');
      copy.append(element('strong'));
      copy.append(element('span'));
      hero.append(copy);
      hero.append(element('div', 'wb-dream-badge'));
      chrome.append(hero);
      chrome.append(createImmersiveStory());
      document.body.appendChild(chrome);
    }
    if (!chrome.querySelector('.wb-dream-immersive')) chrome.append(createImmersiveStory());
    chrome.removeAttribute('aria-hidden');
    return chrome;
  };

  const ensureSwitcher = () => {
    document.querySelector(`#${CHROME_ID} .wb-dream-switcher`)?.remove();
    let switcherRoot = document.getElementById(SWITCHER_ROOT_ID);
    if (!switcherRoot) {
      switcherRoot = element('div');
      switcherRoot.id = SWITCHER_ROOT_ID;
      document.body.appendChild(switcherRoot);
    }
    let switcher = switcherRoot.querySelector('.wb-dream-switcher');
    const signature = `${listedThemes.map(theme => theme.id).join('|')}|${CUSTOM_ID}|${NATIVE_ID}|${GITHUB_URL}|collapse-v1|workspace-left-v1`;
    if (!switcher) {
      switcher = element('nav', 'wb-dream-switcher');
      switcher.setAttribute('aria-label', '实时切换 WorkBuddy 主题');
      switcherRoot.append(switcher);
    }
    if (switcher.dataset.signature !== signature) {
      switcher.replaceChildren(
        createSwitcherToggle(),
        createGitHubLink(),
        ...listedThemes.map(createThemeButton),
        createThemeButton({ id: CUSTOM_ID, name: '自定义', description: '打开内置主题编辑器', colors: customTheme.colors }),
        createThemeButton({ id: NATIVE_ID, name: '恢复原主题', description: '停用 Dream Skin，显示 WorkBuddy 原生外观' }),
      );
      switcher.dataset.signature = signature;
    }
    switcher.onclick = event => {
      const toggle = event.target.closest('[data-switcher-action="toggle"]');
      if (toggle && switcher.contains(toggle)) {
        switcherCollapsed = !switcherCollapsed;
        writeSwitcherCollapsed(switcherCollapsed);
        applySwitcherCollapsed(switcherRoot, switcherCollapsed);
        return;
      }
      const button = event.target.closest('.wb-dream-theme-chip');
      if (!button || !switcher.contains(button)) return;
      if (button.dataset.themeId === CUSTOM_ID) openCustomizer();
      else {
        if (customizerSession?.open) restoreCustomizerSelection();
        selectTheme(button.dataset.themeId);
      }
    };
    applySwitcherCollapsed(switcherRoot, switcherCollapsed);
    updateCustomButton(customTheme);
    return switcherRoot;
  };

  const ensure = () => {
    if (!fingerprint() || window.__WORKBUDDY_DREAM_SKIN_DISABLED__) return false;
    ensureStyle();
    ensureChrome();
    ensureCustomizer();
    ensureSwitcher();
    if (currentSelection === NATIVE_ID) applyNative(false);
    else applyTheme(themeMap.get(currentSelection), false);
    if (customizerSession?.open) resumeCustomizer();
    return true;
  };

  let scheduled = null;
  const schedule = () => {
    if (scheduled) clearTimeout(scheduled);
    scheduled = setTimeout(() => {
      scheduled = null;
      ensure();
    }, 180);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  const hashHandler = schedule;
  addEventListener('hashchange', hashHandler);
  const timer = setInterval(ensure, 5000);

  const cleanup = () => {
    window.__WORKBUDDY_DREAM_SKIN_DISABLED__ = true;
    observer.disconnect();
    clearInterval(timer);
    removeEventListener('hashchange', hashHandler);
    if (scheduled) clearTimeout(scheduled);
    const root = document.documentElement;
    root?.classList.remove('workbuddy-dream-skin');
    if (root) delete root.dataset.wbDreamRoute;
    if (root) delete root.dataset.wbDreamTheme;
    if (root) clearThemeProperties(root);
    clearSelection();
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(CHROME_ID)?.remove();
    document.getElementById(SWITCHER_ROOT_ID)?.remove();
    document.getElementById(CUSTOMIZER_ROOT_ID)?.remove();
    delete window[STATE_KEY];
    return true;
  };

  window.__WORKBUDDY_DREAM_SKIN_DISABLED__ = false;
  window[STATE_KEY] = {
    version: VERSION,
    ensure,
    cleanup,
    selectTheme,
    get currentSelection() { return currentSelection; },
    observer,
    timer,
    hashHandler,
    get customizerSnapshot() {
      return customizerSession?.open ? {
        open: true,
        previousSelection: customizerSession.previousSelection,
        saved: cloneTheme(customizerSession.saved),
        draft: cloneTheme(customizerSession.draft),
      } : null;
    },
    get scheduled() { return scheduled; },
  };
  ensure();
  return { installed: true, version: VERSION, route: routeName(), selection: currentSelection };
})(__CSS__, __THEMES__, __REQUESTED_THEME_ID__, __FORCE_SELECTION__)

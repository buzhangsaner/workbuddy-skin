function safeJson(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
}

export function buildRendererExpression({
  css,
  integrationSource,
  theme,
  imageDataUrl,
  themes,
  requestedThemeId,
  forceSelection,
}) {
  if (typeof integrationSource !== 'string') throw new Error('integrationSource must be a string');
  let expression = integrationSource.replace('__CSS__', safeJson(css));
  if (expression.includes('__THEMES__')) {
    expression = expression
      .replace('__THEMES__', safeJson(themes))
      .replace('__REQUESTED_THEME_ID__', safeJson(requestedThemeId))
      .replace('__FORCE_SELECTION__', safeJson(Boolean(forceSelection)));
  } else {
    expression = expression
      .replace('__THEME__', safeJson(theme))
      .replace('__IMAGE__', safeJson(imageDataUrl));
  }
  return expression;
}

import { dom } from './state.js';
import { getPrefs, setPrefs } from './storage.js';

/* ── Theme ──────────────────────────────────────────────────────────────
   'system' follows the OS and changes with it; 'light' and 'dark' pin it.
   The choice lives in imago.preferences.theme. js/theme-boot.js applies it
   before first paint; this module applies it again on boot, on a change in
   Settings and when the system flips while the choice is System.
   ---------------------------------------------------------------------- */

var THEMES = ['system', 'light', 'dark'];
var THEME_COLOR = { light: '#f6f5f1', dark: '#161614' };   // --bg, for the browser chrome

// The colours a Full HTML page is told to build from (see buildHtmlPrompt).
// Imago restates them for the current theme when it shows the page, so a
// page written in light mode still sits right in a dark app.
var HTML_PALETTE = {
  light: { bg: '#ffffff', card: '#faf9f6', line: '#e7e5df', ink: '#1b1b19', muted: '#66655f' },
  dark:  { bg: '#1e1e1b', card: '#242420', line: '#34332f', ink: '#f1efe9', muted: '#a8a69d' }
};

var DARK_QUERY = '(prefers-color-scheme: dark)';

function themePref() {
  var t = getPrefs().theme;
  return THEMES.indexOf(t) !== -1 ? t : 'system';
}

function systemDark() {
  try { return !!(window.matchMedia && window.matchMedia(DARK_QUERY).matches); }
  catch (e) { return false; }
}

function resolvedTheme() {
  var pref = themePref();
  return pref === 'dark' || (pref === 'system' && systemDark()) ? 'dark' : 'light';
}

// Returns true when what is on screen changed.
function applyTheme() {
  var theme = resolvedTheme();
  var root = document.documentElement;
  var changed = root.getAttribute('data-theme') !== theme;
  root.setAttribute('data-theme', theme);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
  if (dom.themeSelect) dom.themeSelect.value = themePref();
  return changed;
}

function setTheme(pref) {
  var prefs = getPrefs();
  if (pref === 'light' || pref === 'dark') prefs.theme = pref;
  else delete prefs.theme;   // System is the absence of a choice
  setPrefs(prefs);
  return applyTheme();
}

// onChange runs when the system flip actually changed the screen.
function watchSystemTheme(onChange) {
  if (!window.matchMedia) return;
  var mq = window.matchMedia(DARK_QUERY);
  var handler = function () { if (applyTheme() && onChange) onChange(); };
  if (mq.addEventListener) mq.addEventListener('change', handler);
  else if (mq.addListener) mq.addListener(handler);
}

function htmlPalette() { return HTML_PALETTE[resolvedTheme()]; }

export { THEMES, HTML_PALETTE, themePref, systemDark, resolvedTheme, applyTheme, setTheme, watchSystemTheme, htmlPalette };

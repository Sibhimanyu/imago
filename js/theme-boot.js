/* Runs as a classic script in <head>, before the first paint, so a reader
   on a dark system (or who chose Dark) never sees a white flash while the
   modules load. It only sets the attribute; js/theme.js owns the setting
   from then on and must resolve it the same way. */
(function () {
  var pref = 'system';
  try {
    var prefs = JSON.parse(window.localStorage.getItem('imago.preferences') || '{}');
    if (prefs && (prefs.theme === 'light' || prefs.theme === 'dark')) pref = prefs.theme;
  } catch (e) { /* storage blocked or corrupt: follow the system */ }
  var dark = pref === 'dark' ||
    (pref === 'system' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
})();

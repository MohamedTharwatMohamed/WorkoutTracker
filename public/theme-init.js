/* global localStorage, window, matchMedia, document */
// Applies the saved theme before first paint. Keep in sync with src/theme.ts.
(function () {
  var choice = null;
  try { choice = localStorage.getItem('theme'); } catch { /* private mode */ }
  var light = choice === 'light' || (choice !== 'dark' && window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
})();

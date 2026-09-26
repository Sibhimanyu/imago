/* The gallery's live panel: fetch the page's endpoint in the reader's browser
   and draw it with Imago's own renderer, exactly as the landing specimen in
   js/main.js (drawSpecimen) does: normalizeSpec(buildFallbackSpec(data, url)),
   a title, then renderSpecBody(spec, data, null). No model, no key.

   gallery/build.mjs bundles this with esbuild into dist/assets/render.js. The
   app's modules import each other in a cycle that reaches main.js (which boots
   the whole app on load), so the build swaps the modules the renderer does not
   need (main, request, storage, ui, ...) for inert stubs. See build.mjs. */
import { buildFallbackSpec, normalizeSpec } from '../js/spec.js';
import { layoutTimelines, renderSpecBody } from '../js/render.js';

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; }
}

function draw(panel, data, url) {
  var out = panel.querySelector('[data-live-out]');
  var spec = normalizeSpec(buildFallbackSpec(data, url));
  var title = document.createElement('h3');
  title.className = 'stage-title';
  title.textContent = spec.title || hostOf(url);
  out.textContent = '';
  out.appendChild(title);
  out.appendChild(renderSpecBody(spec, data, null));
  panel.classList.add('is-live');
  var relayout = function () { layoutTimelines(out); };
  if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(relayout);
  window.addEventListener('resize', relayout);
}

function status(panel, text) {
  var node = panel.querySelector('[data-live-status]');
  if (node) node.textContent = text;
}

function start(panel) {
  var url = panel.getAttribute('data-endpoint');
  if (!url) return;
  panel.setAttribute('aria-busy', 'true');
  status(panel, 'Fetching ' + hostOf(url) + ' from your browser…');
  window.fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(function (data) {
      draw(panel, data, url);
      status(panel, 'Fetched live just now and drawn by Imago’s renderer, with no model.');
    })
    .catch(function () {
      panel.classList.add('is-failed');
      status(panel, 'Could not reach ' + hostOf(url) + ' just now, so this is a saved screenshot. Open it in Imago to try again.');
    })
    .then(function () { panel.setAttribute('aria-busy', 'false'); });
}

var panels = document.querySelectorAll('[data-live]');
for (var i = 0; i < panels.length; i += 1) start(panels[i]);

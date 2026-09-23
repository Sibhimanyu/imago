import { COMPONENT_TYPES, IMAGO_UI_SPEC_JSON_SCHEMA, MAX_ACTIONS, MAX_COMPONENTS, MAX_HTML_BYTES, SAMPLE_CHAR_LIMIT, getProvider, ollamaFetch } from './config.js';
import { dom, state } from './state.js';
import { el, isPlainObject } from './util.js';
import { endpointTitle } from './spec.js';
import { updateMeta } from './chat.js';
import { enterStage, resetInterfaceOut } from './panes.js';
import { renderHistory, renderSavedList } from './endpoints.js';
import { generateInterfaceNow } from './request.js';

/* ── Model providers: UI spec generation ────────────────────────────────────────── */

function compactSample(data) {
  // Trim big arrays before serialising so the prompt stays small.
  function trim(value, depth) {
    if (depth > 6) return null;
    if (Array.isArray(value)) {
      return value.slice(0, 3).map(function (item) { return trim(item, depth + 1); });
    }
    if (isPlainObject(value)) {
      var out = {};
      var keys = Object.keys(value);
      for (var i = 0; i < keys.length; i += 1) {
        out[keys[i]] = trim(value[keys[i]], depth + 1);
      }
      return out;
    }
    if (typeof value === 'string' && value.length > 160) return value.slice(0, 160) + '…';
    return value;
  }
  var text = JSON.stringify(trim(data, 0), null, 1) || '';
  if (text.length > SAMPLE_CHAR_LIMIT) text = text.slice(0, SAMPLE_CHAR_LIMIT) + '\n…truncated…';
  return text;
}

function buildImagoPrompt(options) {
  var schemaJson = JSON.stringify(options.schema, null, 1) || '';
  if (schemaJson.length > SAMPLE_CHAR_LIMIT) {
    schemaJson = schemaJson.slice(0, SAMPLE_CHAR_LIMIT) + '\n…truncated…';
  }
  return [
    'You are Imago. You turn a JSON response into a plan for an interface a',
    'person would actually want to read. Return ONLY a JSON object matching',
    'the UI spec schema. No HTML, CSS, JavaScript, Markdown or commentary.',
    '',
    'Allowed component types:',
    COMPONENT_TYPES.join(', ') + '.',
    '',
    'Rules that matter most:',
    '1. Every path must exist in the schema, written as exact dot notation',
    '   (e.g. "results.sunrise"). Never invent a field.',
    '2. title, text, metric, gauge, link and image may only point at a single',
    '   value. Never point one at an object or an array — use keyValue, table,',
    '   badges, list, chart or timeline for those.',
    '3. Never leave path empty on a value component. An empty path means the',
    '   whole response body and renders as meaningless field counts.',
    '4. Do not show the same field twice, and do not add a container card for',
    '   an object whose fields you already list individually.',
    '5. Use "section" components to group the page into two or three labelled',
    '   areas when the data has distinct parts.',
    '6. Use "keyValue" (optionally with items: [{label, path}]) for a cluster',
    '   of related small fields instead of one card per field.',
    '7. Use "timeline" with items: [{label, path}] when three or more fields',
    '   are timestamps of the same day or sequence.',
    '8. Use "gauge" for a 0-100 value such as a percentage, with max set.',
    '9. Use "chart" for numeric series, "statBars" for named numeric scores,',
    '   "table" for arrays of objects, "badges" for short arrays of strings.',
    '10. Mark the one or two fields a reader came for with emphasis: "hero".',
    '    Mark background detail with emphasis: "quiet". Everything else',
    '    defaults to normal.',
    '11. Set "unit" when a number has one (%, °C, km, ms). Do not restate the',
    '    unit inside the label.',
    '12. Order components by importance. The first components are the answer.',
    '13. Timestamps, durations and byte counts are formatted for you — pass',
    '    the raw field and let the renderer handle it.',
    '',
    'The plan is the whole page, not a panel. Choose layout deliberately:',
    '"profile" for one entity with an image, "dashboard" for measurements,',
    '"table" or "list" for collections, "article" for long text, "timeline"',
    'when the story is a sequence of moments, "raw" only when nothing else fits.',
    '',
    'actions are what the reader can do next (up to ' + MAX_ACTIONS + '):',
    '- { type: "follow", path, label } for every field whose value is a URL to',
    '  a related resource or the next/previous page. path must point at the',
    '  URL string itself. Label it by what it leads to ("Species", "Next page").',
    'Only follow actions: watching, refetching and the raw response are',
    'already in the toolbar. No links worth following means an empty list.',
    '',
    'title should name the thing the response is about, in human words.',
    'subtitle is one short line of context, not the URL.',
    'Keep the plan under ' + MAX_COMPONENTS + ' components.',
    '',
    'API URL:',
    options.url,
    '',
    'Schema:',
    schemaJson,
    '',
    'Sample:',
    options.sample
  ].join('\n');
}

function parseModelJson(text) {
  if (!text) throw new Error('The model returned an empty response.');
  var trimmed = String(text).trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    // Last resort: grab the outermost brace pair.
    var start = trimmed.indexOf('{');
    var end = trimmed.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('The model did not return valid JSON.');
  }
}

function llmRequest(provider, model, apiKey, body) {
  var send = provider.id === 'ollama' ? ollamaFetch : fetch;
  return send(provider.endpoint(model), {
    method: 'POST',
    headers: provider.headers(apiKey),
    body: JSON.stringify(body)
  }).then(function (response) {
    return response.text().then(function (text) {
      var payload = null;
      try { payload = JSON.parse(text); } catch (e) { /* non-JSON error body */ }
      if (!response.ok) {
        // Gemini and Groq both nest the human-readable reason under `error`.
        // Gemini and Groq nest the reason under error.message; Ollama's
        // native API returns error as a bare string.
        var message = 'HTTP ' + response.status;
        if (payload && payload.error && payload.error.message) message = payload.error.message;
        else if (payload && typeof payload.error === 'string' && payload.error) message = payload.error;
        var error = new Error(message);
        error.status = response.status;
        throw error;
      }
      return payload;
    });
  });
}

// One place that turns a provider failure into words, shared by the
// generation paths and the connection-tests card so all three agree.
function providerErrorText(provider, err) {
  var message = err && err.message ? err.message : String(err);
  var title = provider.label + ' request failed';
  // Gemini answers a bad key with 400, not 401, so status alone would report
  // the vaguer "request failed" for the single most common mistake.
  var saysBadKey = /api[ _-]?key not valid|invalid api key|api key is invalid/i.test(message);
  if ((err && err.status === 401) || saysBadKey) title = provider.label + ' rejected the API key';
  else if (err && err.status === 403) title = provider.label + ' access forbidden';
  else if (err && err.status === 429) title = provider.label + ' rate limit reached';
  else if (err && err.status === 404) {
    title = 'Model not found';
    message += ' — try setting the model to ' + provider.modelHint + ' in Settings.';
  }
  return { title: title, message: message };
}

function generateSpec(options) {
  var prompt = buildImagoPrompt(options);
  var provider = getProvider(options.provider);
  var model = options.model;
  var apiKey = options.apiKey;

  function ask(bodyFn) {
    return llmRequest(provider, model, apiKey, bodyFn(model, prompt, IMAGO_UI_SPEC_JSON_SCHEMA))
      .then(function (payload) {
        // A spec cut off mid-string parses as garbage, and "the model
        // returned an unusable spec" sends the reader after the wrong
        // problem. Truncation has its own cure, so name it.
        if (provider.truncated && provider.truncated(payload)) {
          var err = new Error('The reply was cut off before the plan was complete. ' +
                              'This model wrote more than the request allows — try a smaller ' +
                              'response body, or a model that answers more concisely.');
          err.truncated = true;
          throw err;
        }
        return parseModelJson(provider.extract(payload));
      });
  }

  // Primary: ask the provider to pin the response to the UI spec schema.
  return ask(provider.body).catch(function (err) {
    // Auth and rate-limit failures will not be fixed by retrying, so surface
    // them rather than burning a second call.
    if (err && (err.status === 401 || err.status === 403 || err.status === 429)) throw err;
    // A second identical call would be cut off at the same place.
    if (err && err.truncated) throw err;
    // Otherwise the model family may reject the schema parameter, or return
    // prose despite it. Retry in plain JSON mode with the contract inlined.
    return ask(provider.plainBody);
  });
}

/* ── Full-HTML builder ───────────────────────────────────────────────────
   The alternative to the JSON plan: the model writes the entire page and
   Imago shows it verbatim. Verbatim does not mean trusted. The doc renders
   in an opaque-origin sandboxed frame with scripts, forms and navigation
   stripped (applyHtml), and the page CSP is inherited by srcdoc frames, so
   inline scripts would not run even if the model wrote some. The model
   controls markup and styling only — never behaviour, never the app.
   ---------------------------------------------------------------------- */

function buildHtmlPrompt(options) {
  var schemaJson = JSON.stringify(options.schema, null, 1) || '';
  if (schemaJson.length > SAMPLE_CHAR_LIMIT) {
    schemaJson = schemaJson.slice(0, SAMPLE_CHAR_LIMIT) + '\n…truncated…';
  }
  return [
    'You are Imago, a product designer who codes. Turn this JSON API response',
    'into ONE complete, self-contained HTML page that looks like a real,',
    'designed app screen, not a document. Return ONLY the HTML: no Markdown',
    'fences, no commentary.',
    '',
    'Design brief (these are yours to decide):',
    '- Read the data first and pick the interface it deserves: a product',
    '  grid, a profile card, a dashboard of stat tiles, a feed, a timeline,',
    '  a comparison table, a detail page with a hero. Mix them if the data has',
    '  several parts.',
    '- Commit to a visual direction: a colour palette, a type scale, how',
    '  corners, borders, shadows and backgrounds feel. Use CSS grid and flexbox,',
    '  gradients, badges, pills, avatars, progress bars and meters wherever',
    '  they fit the data.',
    '- Give the most important values visual weight (big numbers, prominent',
    '  titles, images) and push secondary fields back (muted, small, grouped).',
    '  Format values as people expect them: dates, prices, counts, booleans as',
    '  status chips, and never raw key: value lists unless the data really is one.',
    '- Do not produce a long vertical column of headings and paragraphs. If',
    '  the result would read like a Markdown file, redesign it.',
    '',
    'Hard rules:',
    '1. A single document. All styling inline in one <style> block; no',
    '   external stylesheets, fonts or scripts. Do not include <script> —',
    '   scripts are disabled where this page runs, so anything behavioural',
    '   must be plain HTML and CSS.',
    '2. Write the real values from the sample into the markup. This page is',
    '   a snapshot of this exact response, not a template — no {{placeholders}}.',
    '3. Show images only with https URLs already present in the data. Never',
    '   invent image URLs.',
    '4. Every link uses target="_blank" rel="noopener". No <form> elements.',
    '5. Fonts come from local stacks only (system-ui, Georgia, ui-monospace…),',
    '   since web fonts cannot load. Use the full width sensibly and keep it',
    '   usable from 360px up to wide screens. One <h1> naming the thing the',
    '   response is about.',
    '',
    'API URL:',
    options.url,
    '',
    'Schema:',
    schemaJson,
    '',
    'Sample (this exact data is what the page must show):',
    options.sample
  ].join('\n');
}

function generateHtml(options) {
  var prompt = buildHtmlPrompt(options);
  var provider = getProvider(options.provider);
  return llmRequest(provider, options.model, options.apiKey,
      provider.htmlBody(options.model, prompt))
    .then(function (payload) { return normalizeHtmlDoc(provider.extract(payload)); })
    .then(function (doc) {
      if (!doc) throw new Error('The model did not return a usable HTML document.');
      return doc;
    });
}

// Fences off, then a shape check: it must read as markup and fit the frame.
// Deliberately permissive about tags — the sandbox, not this regex, is the
// trust boundary — but strict about emptiness and size.
function normalizeHtmlDoc(text) {
  if (!text) return null;
  var doc = String(text).trim()
    .replace(/^```(?:html)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  if (!doc || doc.length > MAX_HTML_BYTES) return null;
  if (!/<\s*(html|body|main|section|article|div|table|h1)\b/i.test(doc)) return null;
  return doc;
}

function applyHtml(html, source) {
  state.html = html;
  state.htmlSource = source;
  state.htmlBytes = state.byteSize;
  state.htmlUrl = state.url;
  state.spec = null;
  state.specSource = '';
  state.pendingGenerate = false;

  dom.interfaceHead.hidden = true;
  dom.cacheBadge.hidden = false;
  dom.cacheBadge.setAttribute('data-kind', source);
  dom.cacheBadge.textContent = source === 'generated' ? 'Generated'
    : source === 'cache' ? 'From schema cache' : source === 'shared' ? 'Shared layout' : 'Basic layout';

  resetInterfaceOut(false);

  var head = el('header', 'stage-head');
  var headTop = el('div', 'stage-head-top');
  headTop.appendChild(el('h1', 'stage-title', endpointTitle(state.url) || 'Response'));
  headTop.appendChild(dom.cacheBadge);
  head.appendChild(headTop);
  head.appendChild(el('p', 'stage-sub',
    'A full page written by the model. Sandboxed: scripts disabled, links open in new tabs.'));

  // Generated HTML is a snapshot of one response. Fresh data does not
  // re-render into it, so say so and offer the way out.
  var stale = el('div', 'html-stale');
  stale.hidden = true;
  stale.appendChild(el('span', null, 'The data changed since this page was generated.'));
  var regen = el('button', 'btn btn-ghost btn-xs', 'Regenerate');
  regen.type = 'button';
  regen.addEventListener('click', function () { generateInterfaceNow(); });
  stale.appendChild(regen);
  head.appendChild(stale);
  dom.interfaceOut.appendChild(head);

  var frame = document.createElement('iframe');
  frame.className = 'html-frame';
  frame.title = 'Generated interface (sandboxed)';
  // Opaque origin, scripts/forms/navigation stripped. allow-popups so the
  // model's target=_blank links open; each carries rel=noopener, and a
  // sandboxed opener is capability-less anyway. Never add allow-scripts
  // with allow-same-origin — the frame could drop its own sandbox.
  frame.setAttribute('sandbox', 'allow-popups');
  frame.srcdoc = html;
  dom.interfaceOut.appendChild(frame);

  dom.stageSource.textContent = dom.cacheBadge.textContent;
  dom.stageSource.setAttribute('data-kind', source);
  if (state.stagePref) enterStage();

  updateMeta();
  renderHistory();
  renderSavedList();
}

export { compactSample, buildImagoPrompt, parseModelJson, llmRequest, providerErrorText, generateSpec, buildHtmlPrompt, generateHtml, normalizeHtmlDoc, applyHtml };

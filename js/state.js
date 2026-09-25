/* ── State ─────────────────────────────────────────────────────────────── */

var state = {
  url: '',
  builder: 'spec',   // 'spec' | 'html' — structured plan vs full-page HTML
  html: null,
  htmlSource: '',    // 'generated' | 'cache'
  htmlSig: '',       // dataSig of the response the current page was written from
  htmlUrl: '',       // and the endpoint it came from
  headers: {},
  headersText: '',
  data: null,
  dataUrl: '',
  dataSig: '',           // dataSignature(data), taken once per fetch
  rawText: '',
  byteSize: 0,
  status: 0,
  schema: null,
  schemaHash: '',
  spec: null,
  specSource: '',        // 'generated' | 'cache' | 'fallback'
  diff: null,
  changedCount: 0,
  lastCheckedAt: 0,
  activeRequestId: null,
  refreshIntervalMs: 0,
  nextRefreshAt: 0,
  tickHandle: null,
  inFlight: false,
  requestSeq: 0,         // bumps per request; a reply for an older one is ignored
  dirtySinceSend: true,
  tab: 'interface',
  view: 'landing',
  pane: 'playground',
  pendingGenerate: false,
  stage: false,          // the generated page owns the screen
  stagePref: true,       // false once the reader pressed Back to the controls
  stack: [],             // urls behind the current page, for Back
  historyDepth: 0,       // history entries this app pushed; popstate owns the pop
  navRestorePoint: null, // what was on screen before an in-flight navigation
  generating: false,     // a model call is in flight
  genSeq: 0,             // bumps per model call; a reply for an older one is dropped
  rawPaneDirty: true,    // body changed since the Raw pane was last built
  schemaPaneDirty: true,
  detailsOpen: Object.create(null),   // endpoint hash → Details left open
  sharedSpec: null,      // { url, spec } from a share link, used once
  unseenChanges: 0,      // changes Watch found while the tab was hidden
  editing: false,        // the page's edit bars are showing
  noKeyLine: false,      // the page is the basic layout because there is no key
};

var dom = {};

export { state, dom };

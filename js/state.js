/* ── State ─────────────────────────────────────────────────────────────── */

var state = {
  url: '',
  builder: 'spec',   // 'spec' | 'html' — structured plan vs full-page HTML
  html: null,
  htmlSource: '',    // 'generated' | 'cache'
  htmlBytes: -1,     // byteSize of the data the current page was built from
  htmlUrl: '',
  headers: {},
  headersText: '',
  data: null,
  dataUrl: '',
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

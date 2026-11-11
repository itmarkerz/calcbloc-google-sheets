// In-memory stand-ins for the Apps Script services the add-on uses, for tests and the local demo.
// They follow the documented behaviour that matters here: CacheService limits (100 KB values, 250-character keys,
// 6-hour maximum), PropertiesService stores, UrlFetchApp.fetch/fetchAll with muteHttpExceptions, urlFetchWhitelist,
// and enough of SpreadsheetApp/HtmlService to record what the menu, sidebar and table insert do.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function createCache(clock) {
  const store = new Map();
  const now = () => clock.now();
  const check = (key, value) => {
    if (typeof key !== "string" || key.length > 250) throw new Error(`Cache key too long (${String(key).length} > 250)`);
    if (value !== undefined && value.length > 100 * 1024) throw new Error("Argument too large: value");
  };
  const get = (key) => {
    check(key);
    const e = store.get(key);
    if (!e) return null;
    if (e.expires <= now()) {
      store.delete(key);
      return null;
    }
    return e.value;
  };
  return {
    stats: { gets: 0, puts: 0 },
    store,
    get(key) {
      this.stats.gets++;
      return get(key);
    },
    getAll(keys) {
      this.stats.gets++;
      const out = {};
      for (const k of keys) {
        const v = get(k);
        if (v !== null) out[k] = v;
      }
      return out;
    },
    put(key, value, ttl = 600) {
      check(key, value);
      this.stats.puts++;
      store.set(key, { value: String(value), expires: now() + Math.min(ttl, 21600) * 1000 });
    },
    putAll(values, ttl) {
      for (const [k, v] of Object.entries(values)) this.put(k, v, ttl);
    },
    remove(key) {
      store.delete(key);
    },
    removeAll(keys) {
      keys.forEach((k) => store.delete(k));
    },
  };
}

export function createProperties() {
  const m = new Map();
  return {
    map: m,
    getProperty: (k) => (m.has(k) ? m.get(k) : null),
    setProperty(k, v) {
      m.set(k, String(v));
      return this;
    },
    deleteProperty(k) {
      m.delete(k);
      return this;
    },
    getProperties: () => Object.fromEntries(m),
    getKeys: () => [...m.keys()],
  };
}

function headerValue(headers, name) {
  const k = Object.keys(headers ?? {}).find((h) => h.toLowerCase() === name.toLowerCase());
  return k ? headers[k] : undefined;
}

/** handler(url, { headers }) -> { status, body, headers } (synchronous, like UrlFetchApp). */
export function createUrlFetch(handler, { whitelist } = {}) {
  const calls = [];
  const one = (url, opts = {}) => {
    if (whitelist && !whitelist.some((p) => url.startsWith(p))) throw new Error(`URL not allowed by urlFetchWhitelist: ${url}`);
    calls.push({ url, headers: { ...(opts.headers ?? {}) } });
    const r = handler(url, { headers: opts.headers ?? {} });
    if (r.status >= 400 && !opts.muteHttpExceptions) throw new Error(`Request failed for ${url} returned code ${r.status}`);
    return {
      getResponseCode: () => r.status,
      getContentText: () => r.body,
      getAllHeaders: () => ({ ...(r.headers ?? {}) }),
      getHeaders: () => ({ ...(r.headers ?? {}) }),
    };
  };
  return {
    calls,
    fetch: one,
    fetchAll: (reqs) => reqs.map((r) => one(r.url, r)),
    apiKeysSent: () => calls.map((c) => headerValue(c.headers, "X-API-Key") ?? null),
  };
}

function createRange(sheet, row, col, nr = 1, nc = 1) {
  const r = {
    setValues(values) {
      if (values.length !== nr || values.some((x) => x.length !== nc)) throw new Error(`setValues: expected ${nr}x${nc}, got ${values.length}x${values[0]?.length}`);
      values.forEach((line, i) => line.forEach((v, j) => sheet.cells.set(`${row + i},${col + j}`, v)));
      return r;
    },
    setNumberFormats(f) {
      if (f.length !== nr || f.some((x) => x.length !== nc)) throw new Error("setNumberFormats: wrong size");
      f.forEach((line, i) => line.forEach((v, j) => sheet.formats.set(`${row + i},${col + j}`, v)));
      return r;
    },
    setFontWeight(w) {
      sheet.styles.push({ row, col, nr, nc, fontWeight: w });
      return r;
    },
    setFontSize(s) {
      sheet.styles.push({ row, col, nr, nc, fontSize: s });
      return r;
    },
    setBackground(b) {
      sheet.styles.push({ row, col, nr, nc, background: b });
      return r;
    },
    getValues() {
      return Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => sheet.cells.get(`${row + i},${col + j}`) ?? ""));
    },
  };
  return r;
}

function createSheet(name) {
  const sheet = {
    name,
    cells: new Map(),
    formats: new Map(),
    styles: [],
    frozenRows: 0,
    getName: () => sheet.name,
    getRange: (row, col, nr, nc) => createRange(sheet, row, col, nr, nc),
    setFrozenRows(n) {
      sheet.frozenRows = n;
      return sheet;
    },
    setColumnWidths: () => sheet,
    setColumnWidth: () => sheet,
    /** Rows as arrays, trimmed of trailing empty cells (for assertions and the demo). */
    dump() {
      let maxR = 0;
      let maxC = 0;
      for (const k of sheet.cells.keys()) {
        const [r, c] = k.split(",").map(Number);
        maxR = Math.max(maxR, r);
        maxC = Math.max(maxC, c);
      }
      return createRange(sheet, 1, 1, maxR, maxC).getValues();
    },
  };
  return sheet;
}

export function createSpreadsheetApp() {
  const sheets = [createSheet("Sheet1")];
  let active = sheets[0];
  const menus = [];
  const sidebars = [];
  const ss = {
    sheets,
    insertSheet(name) {
      if (sheets.some((s) => s.name === name)) throw new Error(`A sheet with the name "${name}" already exists.`);
      const s = createSheet(name);
      sheets.push(s);
      return s;
    },
    getSheetByName: (n) => sheets.find((s) => s.name === n) ?? null,
    setActiveSheet(s) {
      active = s;
      return s;
    },
    getActiveSheet: () => active,
  };
  return {
    menus,
    sidebars,
    spreadsheet: ss,
    getActiveSpreadsheet: () => ss,
    getUi: () => ({
      createAddonMenu() {
        const menu = { items: [], addItem(caption, fn) { menu.items.push({ caption, fn }); return menu; }, addSeparator() { menu.items.push("---"); return menu; }, addToUi() { menus.push(menu); } };
        return menu;
      },
      createMenu(title) {
        const menu = { title, items: [], addItem(caption, fn) { menu.items.push({ caption, fn }); return menu; }, addSeparator() { return menu; }, addToUi() { menus.push(menu); } };
        return menu;
      },
      showSidebar(html) {
        sidebars.push(html);
      },
    }),
  };
}

export function createHtmlService(dir) {
  return {
    createTemplateFromFile(name) {
      const src = readFileSync(join(dir, `${name}.html`), "utf8");
      const t = {
        evaluate() {
          const content = src.replace(/<\?=\s*(\w+)\s*\?>/g, (_, v) => String(t[v] ?? ""));
          const out = { title: "", content, setTitle(s) { out.title = s; return out; }, getContent: () => content };
          return out;
        },
      };
      return t;
    },
  };
}

/**
 * Builds the full set of globals. ownerProps/userProps model the custom-function rule that getUserProperties()
 * returns the spreadsheet owner's properties: set mode = "custom-function" to read the owner's store.
 */
export function createGas({ handler, whitelist, htmlDir, clock = { now: () => Date.now() } } = {}) {
  const scriptCache = createCache(clock);
  const documentCache = createCache(clock);
  const userProps = createProperties();
  const ownerProps = createProperties();
  const documentProps = createProperties();
  const scriptProps = createProperties();
  const env = { mode: "full" };
  const fetch = createUrlFetch(handler, { whitelist });
  const spreadsheetApp = createSpreadsheetApp();
  const globals = {
    CacheService: { getScriptCache: () => scriptCache, getDocumentCache: () => documentCache, getUserCache: () => createCache(clock) },
    PropertiesService: {
      getUserProperties: () => (env.mode === "custom-function" ? ownerProps : userProps),
      getDocumentProperties: () => documentProps,
      getScriptProperties: () => scriptProps,
    },
    UrlFetchApp: fetch,
    SpreadsheetApp: spreadsheetApp,
    HtmlService: htmlDir ? createHtmlService(htmlDir) : undefined,
  };
  return { globals, env, scriptCache, documentCache, userProps, ownerProps, documentProps, fetch, spreadsheetApp, clock };
}

export function installGlobals(globals, target = globalThis) {
  for (const [k, v] of Object.entries(globals)) target[k] = v;
}

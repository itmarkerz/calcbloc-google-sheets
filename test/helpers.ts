import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createFakeApi } from "../harness/fake-api.mjs";
import { createGas, installGlobals } from "../harness/gas-mocks.mjs";

export const TEST_KEY = "cb_" + "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6";
export const WHITELIST = ["https://calcbloc.com/api/"];
export const HTML_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "apps-script");

/**
 * Fresh mocks for each test: a fake API answering from fixtures, Apps Script services, and a controllable clock.
 * No API key is saved unless `key` is given (the add-on works without one); `anonymousPerDay` lowers the fake
 * API's no-key daily allowance.
 */
export function setup(opts: { limits?: boolean; key?: string; anonymousPerDay?: number } = {}) {
  const clock = { t: Date.UTC(2026, 10, 11, 12), now() { return this.t; } };
  const api = createFakeApi({ keys: [TEST_KEY], limits: opts.limits ?? false, clock, anonymousPerDay: opts.anonymousPerDay });
  const gas = createGas({ handler: api.handler, whitelist: WHITELIST, htmlDir: HTML_DIR, clock });
  installGlobals(gas.globals);
  if (opts.key) gas.userProps.setProperty("calcbloc.apiKey", opts.key);
  return { api, gas, clock };
}

/** Number of HTTP requests made to a given endpoint ("countries", "tax-tables", "net-salary", ...). */
export const requests = (api: ReturnType<typeof createFakeApi>, endpoint?: string) => (endpoint ? api.stats.byPath[endpoint] ?? 0 : api.stats.requests);

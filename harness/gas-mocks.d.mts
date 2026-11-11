// Loose types for the JavaScript mocks, for type-checking the tests.
export type Any = any;
export function createCache(clock: { now(): number }): Any;
export function createProperties(): Any;
export function createUrlFetch(handler: Any, opts?: { whitelist?: string[] }): Any;
export function createSpreadsheetApp(): Any;
export function createHtmlService(dir: string): Any;
export function createGas(opts?: { handler?: Any; whitelist?: string[]; htmlDir?: string; clock?: { now(): number } }): Any;
export function installGlobals(globals: Record<string, unknown>, target?: Any): void;

export const DIST: string;
export function loadBundle(globals: Record<string, unknown>): Record<string, any>;
export function manifest(): { runtimeVersion: string; oauthScopes: string[]; urlFetchWhitelist: string[]; timeZone: string };

export type Any = any;
export function createFakeApi(opts?: { keys?: string[]; limits?: boolean; clock?: { now(): number }; anonymousPerDay?: number }): { handler: Any; stats: { requests: number; noKey: number; byPath: Record<string, number> }; usage: Map<string, Any> };
export function liveHandler(url: string, opts: { headers: Record<string, string> }): { status: number; headers: Record<string, string>; body: string };

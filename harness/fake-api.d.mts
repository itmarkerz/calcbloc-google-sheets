export type Any = any;
export function createFakeApi(opts?: { keys?: string[]; limits?: boolean; clock?: { now(): number } }): { handler: Any; stats: { requests: number; byPath: Record<string, number> }; usage: Map<string, Any> };
export function liveHandler(url: string, opts: { headers: Record<string, string> }): { status: number; headers: Record<string, string>; body: string };

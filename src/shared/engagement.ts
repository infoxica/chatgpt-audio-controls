// Aggregate, device-local state. No chat/source URLs, audio, account IDs or history.
export const ENGAGEMENT_KEY = 'cgpt-ra-engagement-v1';
export const DAY = 86_400_000;
export type RequestKind = 'review' | 'donation';
type RequestState = { status: 'new' | 'shown' | 'later' | 'done'; displays: number; shownAt: number; afterTime: number; afterUses: number };
export type EngagementState = { version: 1; uses: number; enabled: boolean; lastShown: number; review: RequestState; donation: RequestState };
export type EngagementAction = { type: 'read' } | { type: 'qualify'; session: number } | { type: 'claim' } |
  { type: 'enable'; enabled: boolean } | { type: 'opened'; kind: RequestKind } |
  { type: 'respond'; kind: RequestKind; response: 'later' | 'dismiss'; display: number };
export type EngagementResult = { state: EngagementState; prompt?: { kind: RequestKind; reminder: boolean; display: number } };
const freshRequest = (): RequestState => ({ status: 'new', displays: 0, shownAt: 0, afterTime: 0, afterUses: 0 });
export const defaultEngagement = (): EngagementState => ({ version: 1, uses: 0, enabled: true, lastShown: 0, review: freshRequest(), donation: freshRequest() });
const integer = (n: unknown): n is number => Number.isSafeInteger(n) && Number(n) >= 0;
export function validateEngagement(value: unknown): EngagementState {
  if (value === undefined || value === null) return defaultEngagement();
  const s = value as EngagementState;
  if (s.version !== 1 || !integer(s.uses) || typeof s.enabled !== 'boolean' || !integer(s.lastShown) || !['review', 'donation'].every(k => {
    const r = s[k as RequestKind];
    return r && ['new', 'shown', 'later', 'done'].includes(r.status) && integer(r.displays) && r.displays <= 2 && integer(r.shownAt) && integer(r.afterTime) && integer(r.afterUses);
  })) throw new Error('Invalid engagement state'); // Fail closed; do not reset dismissals.
  return structuredClone(s);
}
export function isEngagementAction(value: unknown): value is EngagementAction {
  if (!value || typeof value !== 'object') return false;
  const a = value as EngagementAction;
  switch (a.type) {
    case 'read': case 'claim': return true;
    case 'qualify': return integer(a.session) && a.session > 0;
    case 'enable': return typeof a.enabled === 'boolean';
    case 'opened': return a.kind === 'review' || a.kind === 'donation';
    case 'respond': return (a.kind === 'review' || a.kind === 'donation') && ['later', 'dismiss'].includes(a.response) && integer(a.display);
    default: return false;
  }
}
export function eligibleRequest(s: EngagementState, now: number): RequestKind | undefined {
  if (!s.enabled || (s.lastShown > 0 && now - s.lastShown < DAY)) return;
  for (const kind of ['donation', 'review'] as const) if (s[kind].status === 'new' && s.uses >= (kind === 'donation' ? 10 : 4)) return kind;
  for (const kind of ['review', 'donation'] as const) {
    const r = s[kind];
    if (r.status === 'later' && r.displays === 1 && now >= r.afterTime && s.uses >= r.afterUses) return kind;
  }
}
export function reduceEngagement(value: unknown, action: EngagementAction, now = Date.now()): EngagementResult {
  const state = validateEngagement(value);
  if (action.type === 'qualify') state.uses = Math.min(Number.MAX_SAFE_INTEGER, state.uses + 1);
  if (action.type === 'enable') {
    state.enabled = action.enabled;
    if (!state.enabled) for (const kind of ['review', 'donation'] as const) {
      if (state[kind].status === 'shown' || state[kind].status === 'later') state[kind].status = 'done';
    }
  }
  if (action.type === 'opened') state[action.kind].status = 'done';
  if (action.type === 'respond') {
    const r = state[action.kind];
    if (r.status === 'shown' && r.shownAt === action.display) {
      r.status = action.response === 'later' && r.displays === 1 ? 'later' : 'done';
      r.afterTime = now + 14 * DAY; r.afterUses = state.uses + 10;
    }
  }
  if (action.type === 'claim') {
    const kind = eligibleRequest(state, now);
    if (kind) {
      const r = state[kind]; r.displays++; r.status = 'shown'; r.shownAt = state.lastShown = now;
      return { state, prompt: { kind, reminder: r.displays === 2, display: now } };
    }
  }
  return { state };
}
// One queue covers reads, count increments, claims, toggles and responses.
export class EngagementStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private read: () => Promise<unknown>, private write: (s: EngagementState) => Promise<void>, private firstUse: (scope: string, session: number) => Promise<boolean>) {}
  request(action: EngagementAction, scope = '', now = Date.now()): Promise<EngagementResult> {
    const job = this.queue.then(async () => {
      const current = await this.read();
      validateEngagement(current);
      if (action.type === 'qualify' && !await this.firstUse(scope, action.session)) return { state: validateEngagement(current) };
      const next = reduceEngagement(current, action, now);
      if (action.type !== 'read') await this.write(next.state); // Claim must persist BEFORE displaying.
      return next;
    });
    this.queue = job.catch(() => {});
    return job;
  }
}

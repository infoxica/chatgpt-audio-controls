import { expect, test } from 'bun:test';
import { DAY, defaultEngagement, eligibleRequest, EngagementStore, isEngagementAction, reduceEngagement, validateEngagement } from '../src/shared/engagement';
import { ListeningUse, type ListeningActivity } from '../src/content/listening-use';
import { donationCatalogs, donationCopy } from '../src/shared/i18n/donations';
import { LOCALES } from '../src/shared/i18n/core';
import { REVIEW_URLS, reviewStores, sponsorURL, SPONSOR_AMOUNTS } from '../src/shared/support';
import { promptPosition } from '../src/content/support-prompts';

const day = 100 * DAY;
test('thresholds, priority, cooldown and consumed displays', () => {
  const state = defaultEngagement(); state.uses = 3;
  expect(eligibleRequest(state, day)).toBeUndefined();
  state.uses = 4; expect(eligibleRequest(state, day)).toBe('review');
  state.uses = 9; expect(eligibleRequest(state, day)).toBe('review');
  state.uses = 10; expect(eligibleRequest(state, day)).toBe('donation');
  const first = reduceEngagement(state, { type: 'claim' }, day);
  expect(first.prompt).toEqual({ kind: 'donation', reminder: false, display: day });
  expect(eligibleRequest(first.state, day + DAY - 1)).toBeUndefined();
  expect(eligibleRequest(first.state, day + DAY)).toBe('review');
  first.state.review.status = 'done';
  expect(eligibleRequest(first.state, day + DAY * 100)).toBeUndefined();
});
test('one reminder requires both 14 days and ten more uses; stale responses cannot reopen', () => {
  let state = defaultEngagement(); state.uses = 4;
  state = reduceEngagement(state, { type: 'claim' }, day).state;
  state = reduceEngagement(state, { type: 'respond', kind: 'review', response: 'later', display: day }, day).state;
  state.donation.status = 'done'; state.uses = 13;
  expect(eligibleRequest(state, day + 14 * DAY)).toBeUndefined();
  state.uses = 14; expect(eligibleRequest(state, day + 14 * DAY - 1)).toBeUndefined();
  const reminder = reduceEngagement(state, { type: 'claim' }, day + 14 * DAY);
  expect(reminder.prompt?.reminder).toBe(true);
  expect(reduceEngagement(reminder.state, { type: 'respond', kind: 'review', response: 'later', display: day }, day + 14 * DAY).state.review.status).toBe('shown');
  state = reduceEngagement(reminder.state, { type: 'respond', kind: 'review', response: 'later', display: day + 14 * DAY }, day + 14 * DAY).state;
  expect(state.review.status).toBe('done');
});
test('disable cancels requests and re-enabling or opened links never imply reviews/payments', () => {
  const state = defaultEngagement(); state.uses = 30; state.review.status = 'later';
  const off = reduceEngagement(state, { type: 'enable', enabled: false }, day).state;
  expect(eligibleRequest(off, day)).toBeUndefined();
  expect(off.review.status).toBe('done');
  expect(eligibleRequest(reduceEngagement(off, { type: 'enable', enabled: true }).state, day)).toBe('donation');
  off.donation.status = 'shown';
  const canceled = reduceEngagement(off, { type: 'enable', enabled: false }).state;
  expect(eligibleRequest(reduceEngagement(canceled, { type: 'enable', enabled: true }).state, day)).toBeUndefined();
  expect(reduceEngagement(state, { type: 'opened', kind: 'review' }).state.review.status).toBe('done');
  expect(Object.keys(state)).toEqual(['version', 'uses', 'enabled', 'lastShown', 'review', 'donation']);
});
test('serialized claims, duplicate session events, and failing writes', async () => {
  let value = defaultEngagement(); value.uses = 3;
  const seen = new Map<string, number>();
  const store = new EngagementStore(async () => value, async next => { await Promise.resolve(); value = next; }, async (scope, session) => {
    if ((seen.get(scope) || 0) >= session) return false; seen.set(scope, session); return true;
  });
  await Promise.all([store.request({ type: 'qualify', session: 1 }, 'tab1'), store.request({ type: 'qualify', session: 1 }, 'tab1')]);
  expect(value.uses).toBe(4);
  const claims = await Promise.all([store.request({ type: 'claim' }, 'tab1', day), store.request({ type: 'claim' }, 'tab2', day)]);
  expect(claims.filter(r => r.prompt)).toHaveLength(1);
  await store.request({ type: 'qualify', session: 1 }, 'tab2'); expect(value.uses).toBe(5);
  const failure = new EngagementStore(async () => ({ ...defaultEngagement(), uses: 10 }), async () => { throw Error('Disk full'); }, async () => true);
  await expect(failure.request({ type: 'claim' })).rejects.toThrow('Disk full');
  expect(() => validateEngagement({ version: 2 })).toThrow();
});
test('bridge validates actions and bounds', () => {
  for (const value of [null, {}, { type: 'qualify', session: -1 }, { type: 'qualify', session: Infinity }, { type: 'enable', enabled: 'yes' }, { type: 'opened', kind: 'paid' }, { type: 'respond', kind: 'review', display: 1, response: 'retry' }]) expect(isEngagementAction(value)).toBe(false);
  expect(isEngagementAction({ type: 'qualify', session: 1 })).toBe(true);
});
function listener(duration = 100, rate = 1) {
  const tracker = new ListeningUse(); let position = 0, now = 0;
  const sample = (event: ListeningActivity['event'], dt = 0, delta = dt * rate, advancing = true) => {
    now += dt * 1000; position += delta;
    return tracker.observe({ event, session: 1, position, now, duration, rate, advancing });
  };
  sample('start'); return sample;
}
test('20 seconds actual listening at every rate; once per session', () => {
  for (const rate of [.5, 1, 2, 3]) {
    const sample = listener(200, rate);
    for (let i = 0; i < 79; i++) expect(sample('progress', .25)).toBe(false);
    expect(sample('progress', .25)).toBe(true);
    expect(sample('progress', 1)).toBe(false);
  }
});
test('buffering, pauses, seeking and recovery do not inflate listening time', () => {
  const sample = listener();
  for (let i = 0; i < 10; i++) sample('progress', 1);
  sample('pause', 0, 0, false); sample('boundary', 50, 0, false);
  sample('seek', 0, 50, false); sample('boundary', 0, 0, true);
  for (let i = 0; i < 9; i++) expect(sample('progress', 1)).toBe(false);
  expect(sample('progress', 1)).toBe(true);
});
test('natural short completion qualifies; skipped, stalled and truncated clips do not', () => {
  const sample = listener(5, 2);
  for (let i = 0; i < 9; i++) expect(sample('progress', .25)).toBe(false);
  expect(sample('ended', .25, .5, false)).toBe(true);
  const skip = listener(5); skip('progress', 1); skip('seek', 0, 3); skip('boundary');
  expect(skip('ended', 1, 1, false)).toBe(false);
  const stall = listener(5); stall('progress', 1); stall('boundary', 0, 0, false); stall('boundary', 60, 0, true);
  expect(stall('ended', 1, 1, false)).toBe(false);
});
test('new logical session can qualify; owned-media boundaries do not reset progress', () => {
  const tracker = new ListeningUse();
  for (const session of [1, 2]) {
    tracker.observe({ event: 'start', session, now: 0, position: 0, duration: 100, rate: 1, advancing: true });
    for (let second = 1; second <= 20; second++) expect(tracker.observe({ event: 'progress', session, now: second * 1000, position: second, duration: 100, rate: 1, advancing: true })).toBe(second === 20);
  }
});
test('all 33 locales have complete donations, with English fallback and aliases', () => {
  expect(Object.keys(donationCatalogs).sort()).toEqual(Object.keys(LOCALES).sort());
  for (const [code, values] of Object.entries(donationCatalogs)) {
    expect(values).toHaveLength(10); for (const v of values) expect(v.trim().length).toBeGreaterThan(0);
    expect(Object.keys(donationCopy(code))).toHaveLength(10);
  }
  expect(donationCopy('pt_BR')).toEqual(donationCopy('pt-BR'));
  expect(donationCopy('no')).toEqual(donationCopy('nb'));
  expect(donationCopy('unsupported')).toEqual(donationCopy('en'));
});
test('only one-time USD amounts and fixed support destinations', () => {
  for (const amount of SPONSOR_AMOUNTS) {
    const url = new URL(sponsorURL(amount));
    expect(url.origin).toBe('https://github.com'); expect(url.pathname).toBe('/sponsors/infoxica/sponsorships');
    expect(url.searchParams.get('frequency')).toBe('one-time'); expect(url.searchParams.get('amount')).toBe(String(amount));
  }
  expect(reviewStores('Chrome/140 Edg/140')).toEqual(['edge']);
  expect(reviewStores('Chrome/140')).toEqual(['chrome']); expect(reviewStores('Firefox/140')).toEqual(['chrome', 'edge']);
  expect(REVIEW_URLS.chrome).toContain('/reviews');
});
test('cards avoid composer and controls, and defer if viewport cannot fit', () => {
  const composer = { x: 10, y: 600, width: 370, height: 180 }, player = { x: 10, y: 550, width: 370, height: 48 };
  const pos = promptPosition({ x: 0, y: 0, width: 390, height: 800 }, { width: 366, height: 400 }, player, [composer, player]);
  expect(pos).toEqual({ x: 12, y: 138 });
  expect(promptPosition({ x: 0, y: 0, width: 320, height: 300 }, { width: 296, height: 400 }, player, [composer])).toBeUndefined();
});

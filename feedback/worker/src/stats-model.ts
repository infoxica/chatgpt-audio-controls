import type { Audience, Rating, SourceData } from './store-sources';

const DAY = 86400000;
export const stores = ['chrome', 'edge'] as const;
type Store = typeof stores[number];
type Observation<T> = T & { updatedAt: string };
type StoreSnapshot = {
  audience: Observation<Audience> | null;
  ratings: Observation<Rating> | null;
  lastAttempt: string;
  usersOk: boolean;
  ratingsOk: boolean;
};
export type Snapshot = { version: 1; updatedAt: string | null } & Record<Store,StoreSnapshot>;

function mergeStore(prior: StoreSnapshot | undefined, incoming: SourceData, date: string): StoreSnapshot {
  if (prior && prior.lastAttempt >= date) return prior;
  const {ratings, audience} = incoming;
  const usersOk = !!audience && !(audience.metricDate && prior?.audience?.metricDate && audience.metricDate < prior.audience.metricDate);
  return {
    audience: usersOk ? {...audience, updatedAt:date} : prior?.audience ?? null,
    ratings: ratings ? {...ratings, updatedAt:date} : prior?.ratings ?? null,
    ratingsOk: !!ratings, usersOk, lastAttempt:date,
  };
}

export function mergeSnapshot(previous: Snapshot | null, chrome: SourceData, edge: SourceData, date: string): Snapshot {
  const next = {version:1 as const, updatedAt:previous?.updatedAt ?? null,
    chrome:mergeStore(previous?.chrome, chrome, date), edge:mergeStore(previous?.edge, edge, date)};
  if (stores.some(s => next[s].lastAttempt === date && (next[s].usersOk || next[s].ratingsOk)) &&
      (!next.updatedAt || next.updatedAt < date)) next.updatedAt = date;
  return next;
}

function describe(record: StoreSnapshot, now: number) {
  const {audience, ratings, lastAttempt} = record;
  const old = (date: string) => now - Date.parse(date) > 2 * DAY;
  const usersStale = !!audience && (!record.usersOk || old(audience.updatedAt) ||
    (!!audience.metricDate && Math.floor(now / DAY) - Date.parse(audience.metricDate) / DAY > 7));
  const ratingsStale = !!ratings && (!record.ratingsOk || old(ratings.updatedAt));
  const status = !audience && !ratings ? 'unavailable' : usersStale || ratingsStale ? 'stale' : !audience || !ratings ? 'partial' : 'ok';
  return {users:audience?.users ?? null, rating:ratings?.rating ?? null, ratingCount:ratings?.ratingCount ?? null,
    updatedAt:[audience?.updatedAt,ratings?.updatedAt].filter(Boolean).sort().pop() ?? null,
    usersUpdatedAt:audience?.updatedAt ?? null, ratingsUpdatedAt:ratings?.updatedAt ?? null, metricDate:audience?.metricDate ?? null,
    lastAttempt, usersStale, ratingsStale, status};
}
export function aggregateRatings(data: Record<Store, {rating: number | null; ratingCount: number | null}>, mode: string, eligible: readonly Store[] = stores) {
  let contributors = eligible.filter(s => data[s].rating !== null && (data[s].ratingCount ?? 0) > 0);
  const ratingMode = mode === 'max' ? 'max' : 'weighted';
  if (ratingMode === 'max') contributors = contributors.sort((a,b)=>data[b].rating! - data[a].rating!).slice(0,1);
  const count = contributors.reduce((n,s)=>n+data[s].ratingCount!,0);
  const rating = count ? contributors.reduce((n,s)=>n+data[s].rating!*data[s].ratingCount!,0)/count : null;
  return {rating, ratingCount:count || (eligible.every(s=>data[s].ratingCount==null) ? null : 0), ratingMode, contributors};
}

export function summarize(snapshot: Snapshot, mode: string, now: number) {
  const data = {chrome:describe(snapshot.chrome, now), edge:describe(snapshot.edge, now)};
  const users = data.chrome.users !== null && data.edge.users !== null ? data.chrome.users + data.edge.users : null;
  return {...data, combined:{users, ...aggregateRatings(data,mode), isApproximate:true, isComplete:users!==null},
    updatedAt:snapshot.updatedAt, stale:stores.some(s=>data[s].usersStale || data[s].ratingsStale)};
}
export type StatsResponse = ReturnType<typeof summarize>;

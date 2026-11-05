export type Rating = { rating: number | null; ratingCount: number };
export type Audience = { users: number; metricDate?: string };
export type SourceData = { audience?: Audience; ratings?: Rating };
export type StatsSecrets = {
  STATS_CLIENT_ID?: string; STATS_CLIENT_SECRET?: string;
  STATS_REFRESH_TOKEN?: string; STATS_PUBLISHER_ID?: string;
};
type SourceEnv = StatsSecrets & {
  CHROME_ITEM_ID: string; EDGE_ITEM_ID: string; EDGE_STATS_ENABLED: string;
};

function count(value: unknown): number {
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0) throw Error('invalid_count');
  return n;
}

export function readRating(value: unknown, total: unknown): Rating {
  const ratingCount = count(total);
  if (ratingCount === 0 && (value == null || value === 0)) return { rating: null, ratingCount };
  if (!ratingCount || typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 5) throw Error('invalid_rating');
  return { rating: value, ratingCount };
}

class UpstreamError extends Error {}
async function request(url: string | URL, init: RequestInit = {}) {
  for (let attempt = 0; ; attempt++) {
    let delay = 250;
    try {
      // workerd supports follow/manual, not redirect:error. Reject 3xx below so
      // OAuth bodies and Authorization headers never follow an upstream redirect.
      const res = await fetch(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        if (!res.headers.get('content-type')?.includes('application/json')) throw new UpstreamError('invalid_type');
        return await res.json() as Record<string, unknown>;
      }
      const retry = res.headers.get('retry-after');
      if (retry) delay = /^\d+$/.test(retry) ? Number(retry) * 1000 : Math.max(0, Date.parse(retry) - Date.now());
      await res.body?.cancel();
      if (attempt || (res.status !== 429 && res.status < 500) || !Number.isFinite(delay) || delay > 2000)
        throw new UpstreamError('http_' + res.status);
    } catch (error) {
      if (attempt || error instanceof UpstreamError || error instanceof SyntaxError) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

async function observe<T>(operation: string, run: () => Promise<T>): Promise<T | undefined> {
  try { return await run(); }
  catch (error) {
    console.warn(JSON.stringify({ event: 'stats_source_failed', operation,
      category: error instanceof UpstreamError ? error.message :
        error instanceof Error && error.name === 'TimeoutError' ? 'timeout' :
        error instanceof TypeError ? 'network_or_runtime' :
        error instanceof SyntaxError ? 'invalid_json' : 'unavailable_or_invalid' }));
  }
}

export async function collectChrome(env: SourceEnv, now: number): Promise<SourceData> {
  const token = await observe('chrome.oauth', async () => {
    if (!env.STATS_CLIENT_ID || !env.STATS_CLIENT_SECRET || !env.STATS_REFRESH_TOKEN || !env.STATS_PUBLISHER_ID) throw new UpstreamError('unconfigured');
    const result = await request('https://oauth2.googleapis.com/token', {
      method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', client_id: env.STATS_CLIENT_ID,
        client_secret: env.STATS_CLIENT_SECRET, refresh_token: env.STATS_REFRESH_TOKEN })
    });
    if (typeof result.access_token !== 'string' || !result.access_token) throw new UpstreamError('missing_token');
    return result.access_token;
  });
  if (!token) return {};
  const name = 'publishers/' + encodeURIComponent(env.STATS_PUBLISHER_ID!) + '/items/' + encodeURIComponent(env.CHROME_ITEM_ID);
  const base = 'https://chromewebstore.googleapis.com/v2/' + name;
  const headers = { Authorization: 'Bearer ' + token };
  const [ratings, audience] = await Promise.all([
    observe('chrome.ratings', async () => {
      const summary = await request(base + '/ratingSummary', {headers});
      if (summary.name !== name + '/ratingSummary') throw Error('wrong_item');
      return readRating(summary.rating, summary.ratingCount);
    }),
    observe('chrome.users', async () => {
      const url = new URL(base + ':queryMetrics');
      url.searchParams.set('metrics', 'users-7d');
      const bounds = [14, 1].map(days => new Date(now - days * 86400000).toISOString().slice(0, 10));
      for (const [i, key] of ['firstDate', 'lastDate'].entries()) {
        const [year, month, day] = bounds[i].split('-');
        for (const [part, value] of Object.entries({year,month,day})) url.searchParams.set('timeSpec.' + key + '.' + part, String(Number(value)));
      }
      let latest: Audience | undefined;
      const tokens = new Set<string>();
      const rejected = new Set<string>();
      do {
        const page = await request(url, {headers});
        if (!Array.isArray(page.metricRows)) throw new UpstreamError('missing_rows');
        if (!page.metricRows.length) rejected.add('empty_rows');
        for (const row of page.metricRows) {
          const {year, month, day} = row?.date ?? {};
          const date = [year, String(month).padStart(2,'0'), String(day).padStart(2,'0')].join('-');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < bounds[0] || date > bounds[1] ||
              !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) {
            rejected.add('invalid_or_out_of_range_date'); continue;
          }
          if (row.dimensionValues?.length) { rejected.add('dimensioned_row'); continue; }
          if (!Array.isArray(row.metricValues)) { rejected.add('missing_values'); continue; }
          const metric = row.metricValues.find((m: {metric?: string} | null) => m?.metric === 'users-7d');
          if (!metric) rejected.add('missing_users_7d');
          if (metric && (!latest || date > latest.metricDate!)) {
            try { latest = {users:count(metric.value), metricDate:date}; }
            catch { rejected.add('invalid_count'); }
          }
        }
        if (!page.nextPageToken) break;
        if (typeof page.nextPageToken !== 'string' || tokens.has(page.nextPageToken) || tokens.size >= 14) throw new UpstreamError('invalid_pagination');
        tokens.add(page.nextPageToken);
        url.searchParams.set('pageToken', page.nextPageToken);
      } while (true);
      if (!latest) throw new UpstreamError('no_valid_users:' + [...rejected].sort().join(','));
      return latest;
    })
  ]);
  return {ratings, audience};
}

export function readEdge(data: Record<string, unknown>, id: string): SourceData {
  if (data.crxId !== id) throw Error('wrong_item');
  const result: SourceData = {};
  try { result.audience = {users:count(data.activeInstallCount)}; } catch { /* Retain previous audience. */ }
  try { result.ratings = readRating(data.averageRating, data.ratingCount); } catch { /* Retain previous ratings. */ }
  return result;
}

export async function collectEdge(env: SourceEnv): Promise<SourceData> {
  if (env.EDGE_STATS_ENABLED !== 'true') return {};
  return await observe('edge.details', async () => {
    const url = 'https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/' + encodeURIComponent(env.EDGE_ITEM_ID) + '?hl=en-US&gl=US';
    const result = readEdge(await request(url), env.EDGE_ITEM_ID);
    if (!result.ratings || !result.audience) console.warn(JSON.stringify({event:'stats_source_failed', operation:'edge.details', category:'invalid_fields'}));
    return result;
  }) ?? {};
}

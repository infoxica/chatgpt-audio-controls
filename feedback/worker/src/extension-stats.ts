import { collectChrome, collectEdge, type StatsSecrets } from './store-sources';
import config from '../../../config/release.json';

import {stores, mergeSnapshot, summarize, type Snapshot} from './stats-model';

export const STATS_KEY = 'extension:stats:v1';

export async function refreshStats(env: Env & StatsSecrets, time: number) {
  const date = new Date(time).toISOString();
  const previous = await env.STATS_KV.get<Snapshot>(STATS_KEY,'json');
  if (previous && stores.every(s=>previous[s].lastAttempt >= date)) return;
  const [chrome,edge] = await Promise.all([collectChrome(env,time),collectEdge(env)]);
  await env.STATS_KV.put(STATS_KEY,JSON.stringify(mergeSnapshot(previous,chrome,edge,date)));
}

export async function serveStats(request: Request, env: Env) {
  const origin = request.headers.get('Origin');
  const headers = new Headers({'Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if (origin && [new URL(config.siteUrl).origin,'https://infoxica.github.io'].includes(origin))
    headers.set('Access-Control-Allow-Origin',origin);
  if (request.method === 'OPTIONS') {
    headers.set('Access-Control-Allow-Methods','GET, OPTIONS');
    return new Response(null,{status:204,headers});
  }
  if (request.method !== 'GET') {
    headers.set('Allow','GET, OPTIONS');
    return Response.json({error:'method_not_allowed'},{status:405,headers});
  }
  try {
    const snapshot = await env.STATS_KV.get<Snapshot>(STATS_KEY,'json');
    if (snapshot?.version === 1 && snapshot.updatedAt) {
      const data = summarize(snapshot,env.RATING_MODE,Date.now());
      headers.set('Cache-Control','public, max-age=300');
      return Response.json(data,{headers});
    }
  } catch { console.warn('stats_snapshot_unavailable'); }
  headers.set('Retry-After','300');
  return Response.json({error:'stats_unavailable'},{status:503,headers});
}

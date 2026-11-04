import {afterEach, expect, test, spyOn} from 'bun:test';
import {collectChrome, collectEdge, readEdge, readRating} from '../feedback/worker/src/store-sources';
import {mergeSnapshot, summarize} from '../feedback/worker/src/stats-model';
import {refreshStats, serveStats, STATS_KEY} from '../feedback/worker/src/extension-stats';
import {renderStats} from '../site/store-stats';
import labels from '../site/stats-copy.json';

const at = '2026-11-04T03:00:00.000Z';
const now = Date.parse(at);
const day = 86_400_000;
const env = {STATS_CLIENT_ID:'test', STATS_CLIENT_SECRET:'test', STATS_REFRESH_TOKEN:'test',
  STATS_PUBLISHER_ID:'p', CHROME_ITEM_ID:'c', EDGE_ITEM_ID:'e', EDGE_STATS_ENABLED:'true', RATING_MODE:'weighted'};
const chrome = {audience:{users:1124,metricDate:'2026-11-03'}, ratings:{rating:4.95,ratingCount:10}};
const edge = {audience:{users:103}, ratings:{rating:4,ratingCount:2}};
const json = value => Response.json(value);
const row = (day,value) => ({date:{year:2026,month:11,day},metricValues:[{metric:'users-7d',value,uniqueUserCount:'7'}]});
let upstream;
afterEach(()=>upstream?.mockRestore());

test('Google queries 14 complete UTC dates and picks newest valid aggregate across pages',async()=>{
  const urls = [];
  upstream = spyOn(globalThis,'fetch').mockImplementation(async(input,init)=>{
    const u = new URL(input); urls.push(u);
    expect(init.signal).toBeDefined();
    if(u.hostname==='oauth2.googleapis.com') return json({access_token:'mock'});
    expect(init.headers.Authorization).toBe('Bearer mock');
    if(u.pathname.endsWith('/ratingSummary')) return json({name:'publishers/p/items/c/ratingSummary',rating:4.95,ratingCount:'10',nonEmptyReviewCount:'3'});
    expect(u.searchParams.get('metrics')).toBe('users-7d');
    expect(u.searchParams.has('dimensions')).toBe(false);
    expect(u.searchParams.get('timeSpec.firstDate.day')).toBe('21');
    expect(u.searchParams.get('timeSpec.lastDate.day')).toBe('3');
    return u.searchParams.has('pageToken') ? json({metricRows:[row(3,'1124'),row(1,'99')]}) :
      json({metricRows:[row(2,'invalid'),row(4,'9999'),row(1,'1120')],nextPageToken:'next'});
  });
  expect(await collectChrome(env,now)).toEqual(chrome);
  expect(urls).toHaveLength(4);
  expect(()=>readRating(4,'9007199254740992')).toThrow();
  expect(()=>readRating(4,null)).toThrow();
});

test('Edge identity, partial fields, real zero-rating shape and bounded retry',async()=>{
  const data={crxId:'e',activeInstallCount:103,averageRating:0,ratingCount:0};
  expect(()=>readEdge(data,'other')).toThrow();
  expect(readEdge({...data,ratingCount:undefined},'e')).toEqual({audience:{users:103}});
  let calls=0;
  upstream=spyOn(globalThis,'fetch').mockImplementation(async()=>++calls===1 ?
    new Response(null,{status:429,headers:{'Retry-After':'0'}}) : json(data));
  expect(await collectEdge(env)).toEqual({audience:{users:103},ratings:{rating:null,ratingCount:0}});
  expect(calls).toBe(2);
  upstream.mockImplementation(async()=>new Response(null,{status:403}));
  expect(await collectEdge(env)).toEqual({});
  expect(upstream).toHaveBeenCalledTimes(3);
  await collectEdge({...env,EDGE_STATS_ENABLED:'false'});
  expect(upstream).toHaveBeenCalledTimes(3);
  upstream.mockImplementation(async()=>{throw new DOMException('timeout','TimeoutError')});
  expect(await collectEdge(env)).toEqual({});
  expect(upstream).toHaveBeenCalledTimes(5);
});

test('independent observation dates, aggregation modes, retained failures and read-time age',()=>{
  const first=mergeSnapshot(null,chrome,edge,at);
  const weighted=summarize(first,'weighted',now);
  expect(weighted.combined).toMatchObject({users:1227,rating:(49.5+8)/12,ratingCount:12,isComplete:true,isApproximate:true});
  expect(summarize(first,'max',now).combined).toMatchObject({contributors:['chrome'],rating:4.95,ratingCount:10});
  const partial=summarize(mergeSnapshot(null,chrome,{},at),'weighted',now);
  expect(partial.combined).toMatchObject({users:null,isComplete:false,contributors:['chrome']});
  const newTime=new Date(now+day).toISOString();
  const next=mergeSnapshot(first,{ratings:chrome.ratings},{},newTime);
  const status=summarize(next,'weighted',now+day);
  expect(status.chrome).toMatchObject({usersUpdatedAt:at,ratingsUpdatedAt:newTime,usersStale:true,ratingsStale:false});
  expect(status.edge.status).toBe('stale');
  expect(mergeSnapshot(next,{},{},new Date(now+2*day).toISOString()).updatedAt).toBe(newTime);
  expect(mergeSnapshot(next,chrome,edge,at)).toEqual(next);
  expect(summarize(first,'weighted',now+3*day).stale).toBe(true);
  expect(summarize(mergeSnapshot(null,{audience:{users:1,metricDate:'2026-10-23'}},edge,at),'weighted',now).chrome.usersStale).toBe(true);
  expect(renderStats(weighted,labels.en,'en',now).summary).toContain('≈1,250');
  expect(renderStats(partial,labels.en,'en',now).summary).not.toContain('Edge');
  expect(renderStats(weighted,labels.en,'en',now+8*day).summary).toBe('');
});

test('scheduled merge owns external I/O; public reads, preflights and errors only access KV',async()=>{
  let raw=null;
  const kv={get:async key=>{expect(key).toBe(STATS_KEY);return JSON.parse(raw)},put:async(key,value,...options)=>{
    expect(key).toBe(STATS_KEY); expect(options).toHaveLength(0); raw=value;
  }};
  const bindings={...env,STATS_KV:kv};
  upstream=spyOn(globalThis,'fetch').mockImplementation(async()=>new Response(null,{status:403}));
  const get=(origin='https://infoxica.github.io',method='GET')=>serveStats(new Request('https://worker.test/api/extension-stats',{method,headers:{origin}}),bindings);
  expect((await get()).status).toBe(503);
  await refreshStats(bindings,now);
  expect((await get()).headers.get('retry-after')).toBe('300');
  raw=JSON.stringify(mergeSnapshot(null,chrome,edge,at));
  await refreshStats(bindings,now+day);
  const calls=upstream.mock.calls.length;
  const saved=JSON.parse(raw); expect(saved.updatedAt).toBe(at);
  const response=await get();
  expect(response.status).toBe(200);
  expect(response.headers.get('access-control-allow-origin')).toBe('https://infoxica.github.io');
  expect(response.headers.get('cache-control')).toContain('max-age=300');
  expect(await response.json()).toMatchObject({combined:{users:1227,isComplete:true},stale:true});
  expect((await get('https://infoxica.github.io.evil.test')).headers.has('access-control-allow-origin')).toBe(false);
  expect((await get('https://worker.test','OPTIONS')).status).toBe(204);
  expect((await get(undefined,'POST')).status).toBe(405);
  kv.get=async()=>{throw Error('KV outage')};
  expect((await get()).headers.get('cache-control')).toBe('no-store');
  expect(upstream.mock.calls.length).toBe(calls);
});

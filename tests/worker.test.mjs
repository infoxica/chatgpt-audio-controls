import { beforeAll, afterAll, expect, test } from 'bun:test';
import { Miniflare } from 'miniflare';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
let mf, db;
let origin;
const answer = () => ({ id: randomUUID(), source:'installed',reason:'bug',comment:'',locale:'ja',version:'1.3.0',browser:'Edge',os:'Windows',token:'valid' });
const submit = (input, headers={}) => mf.dispatchFetch(origin+'/api/feedback',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...headers},body:JSON.stringify(input)});
// Starting local workerd/D1 can exceed Bun's 5s hook default on a cold or busy
// Windows host. Request assertions retain their normal timeout.
beforeAll(async()=>{
  const built=await Bun.build({entrypoints:['feedback/worker/src/index.ts'],target:'browser',format:'esm'});
  if(!built.success)throw Error('Worker build failed');
  const config=JSON.parse(await fs.readFile('feedback/worker/wrangler.jsonc','utf8'));
  const directory='build/worker-static-fixture';
  await fs.mkdir(directory+'/api/feedback',{recursive:true});
  await fs.writeFile(directory+'/index.html','<!doctype html><title>Public website</title>');
  await fs.writeFile(directory+'/index.md','# Public website');
  await fs.writeFile(directory+'/feedback.html','This must never replace the private form');
  await fs.writeFile(directory+'/api/feedback/index.html','This must never replace the API');
  mf=new Miniflare({modules:true,script:await built.outputs[0].text(),compatibilityDate:'2026-07-30',
    assets:{directory,binding:'ASSETS',routerConfig:{has_user_worker:true,static_routing:{user_worker:config.assets.run_worker_first}},assetConfig:{html_handling:config.assets.html_handling,not_found_handling:config.assets.not_found_handling}},
    d1Databases:['DB'],bindings:{ENVIRONMENT:'local',TURNSTILE_SITE_KEY:'1x00000000000000000000AA',TURNSTILE_SECRET_KEY:'test-secret'},outboundService:async request=>Response.json({success:(await request.formData()).get('response')==='valid'})});
  origin=(await mf.ready).origin;
  db=await mf.getD1Database('DB');
  await db.exec((await fs.readFile('feedback/worker/migrations/0001_feedback.sql','utf8')).replace(/\n/g,' '));
}, 30000);
afterAll(async()=>{await mf?.dispose();}, 10000);
test('real D1 persistence and concurrent retry yield one row',async()=>{
  const input=answer();input.comment='=IMPORTXML("x") <script>alert(1)</script>';
  const results=await Promise.all(Array.from({length:5},()=>submit(input)));
  for(const response of results)expect(await response.json()).toEqual({saved:true,id:input.id});
  expect((await db.prepare('SELECT count(*) AS n FROM feedback WHERE id=?').bind(input.id).first()).n).toBe(1);
  expect((await db.prepare('SELECT comment FROM feedback WHERE id=?').bind(input.id).first()).comment).toBe(input.comment);
  expect((await submit({...input,comment:'changed'})).status).toBe(409);
  expect((await submit({...input,token:''})).status).toBe(200); // Lost reply, consumed challenge token.
});
test('validation, challenge and origin failures do not write',async()=>{
  for(const patch of [{comment:'x'.repeat(1001)},{source:'bad'},{reason:'unneeded'},{locale:'constructor'},{os:'fingerprint'},{token:'bad'},{website:'spam'}]){
    const input={...answer(),...patch};expect((await submit(input)).status).toBeGreaterThanOrEqual(400);
    expect(await db.prepare('SELECT id FROM feedback WHERE id=?').bind(input.id).first()).toBe(null);
  }
  expect((await submit(answer(),{Origin:'https://evil.test'})).status).toBe(403);
  expect((await submit({...answer(),comment:'x'.repeat(20000)})).status).toBe(413);
});
test('opening localized form and health creates no feedback',async()=>{
  const before=(await db.prepare('SELECT count(*) AS n FROM feedback').first()).n;
  const response=await mf.dispatchFetch(origin+'/feedback?lang=ja&source=installed&version=1.3.0');
  expect(response.status).toBe(200);expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
  expect(await response.text()).toContain('送');
  expect((await db.prepare('SELECT count(*) AS n FROM feedback').first()).n).toBe(before);
});
test('static assets cannot shadow private feedback, API routes or unknown pages',async()=>{
  expect(await (await mf.dispatchFetch(origin+'/')).text()).toContain('Public website');
  const form=await mf.dispatchFetch(origin+'/feedback');
  expect(form.headers.get('cache-control')).toBe('no-store');
  expect(form.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
  expect(await form.text()).not.toContain('This must never');
  expect((await mf.dispatchFetch(origin+'/api/feedback')).status).toBe(405);
  for(const path of ['/api/missing','/missing-page/','/health/missing']) expect((await mf.dispatchFetch(origin+path)).status).toBe(404);
});
test('database outage cannot acknowledge success',async()=>{
  await db.exec('DROP TABLE feedback');const response=await submit(answer());expect(response.status).toBe(503);expect((await response.json()).saved).toBe(false);
});

test('Worker negotiates Markdown, HEAD and canonical discovery headers on public pages',async()=>{
  const fetchPage=(accept,method='GET')=>mf.dispatchFetch(origin+'/',{method,headers:{Accept:accept}});
  const md=await fetchPage('text/markdown');
  expect(md.headers.get('content-type')).toContain('text/markdown');
  expect(md.headers.get('vary')).toContain('Accept');
  expect(md.headers.get('link')).toContain('rel="canonical"');
  expect(await md.text()).toBe('# Public website');
  expect(await (await fetchPage('text/markdown','HEAD')).text()).toBe('');
  expect(await (await fetchPage('text/html, text/markdown;q=0.3')).text()).toContain('<title>');
  expect((await mf.dispatchFetch(origin+'/api/extension-stats')).status).toBe(503);
});

test('statistics requests work in workerd and never follow upstream credential redirects',async()=>{
  const entry='build/worker-stats-fixture.ts';
  await fs.writeFile(entry,`import {collectChrome} from '../feedback/worker/src/store-sources';
    export default {async fetch(request,env){return Response.json(await collectChrome(env,Date.parse('2026-11-04T03:00:00Z')))}};`);
  const built=await Bun.build({entrypoints:[entry],target:'browser',format:'esm'});
  expect(built.success).toBe(true);
  let redirectRatings=false;
  const requests=[];
  const runtime=new Miniflare({modules:true,script:await built.outputs[0].text(),compatibilityDate:'2026-07-30',
    bindings:{STATS_CLIENT_ID:'fake-client',STATS_CLIENT_SECRET:'fake-secret',STATS_REFRESH_TOKEN:'fake-refresh',STATS_PUBLISHER_ID:'p',CHROME_ITEM_ID:'c'},
    outboundService:async request=>{
      requests.push(request.url);
      if(new URL(request.url).hostname==='oauth2.googleapis.com') {
        expect(request.method).toBe('POST');
        expect((await request.formData()).get('refresh_token')).toBe('fake-refresh');
        return Response.json({access_token:'fake-access'});
      }
      expect(request.headers.get('authorization')).toBe('Bearer fake-access');
      if(request.url.endsWith('/ratingSummary')) return redirectRatings ?
        new Response(null,{status:302,headers:{Location:'https://untrusted.invalid/'}}) :
        Response.json({name:'publishers/p/items/c/ratingSummary',rating:4.5,ratingCount:'10'});
      return Response.json({metricRows:[{date:{year:2026,month:11,day:3},metricValues:[{metric:'users-7d',value:'100'}]}]});
    }});
  try {
    const collect=async()=>await (await runtime.dispatchFetch('https://test.invalid/')).json();
    expect(await collect()).toEqual({ratings:{rating:4.5,ratingCount:10},audience:{users:100,metricDate:'2026-11-03'}});
    redirectRatings=true;
    expect(await collect()).toEqual({audience:{users:100,metricDate:'2026-11-03'}});
    expect(requests).toHaveLength(6);
    expect(requests.every(url=>!url.includes('untrusted.invalid'))).toBe(true);
  } finally {await runtime.dispose()}
},30000);

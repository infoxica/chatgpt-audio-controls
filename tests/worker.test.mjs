import { beforeAll, afterAll, expect, test } from 'bun:test';
import { Miniflare } from 'miniflare';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
let mf, db;
let origin;
const answer = () => ({ id: randomUUID(), source:'installed',reason:'bug',comment:'',locale:'ja',version:'1.3.0',browser:'Edge',os:'Windows',token:'valid' });
const submit = (input, headers={}) => mf.dispatchFetch(origin+'/api/feedback',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...headers},body:JSON.stringify(input)});
beforeAll(async()=>{
  const built=await Bun.build({entrypoints:['feedback/worker/src/index.ts'],target:'browser',format:'esm'});
  if(!built.success)throw Error('Worker build failed');
  mf=new Miniflare({modules:true,script:await built.outputs[0].text(),compatibilityDate:'2026-07-30',d1Databases:['DB'],bindings:{ENVIRONMENT:'local',TURNSTILE_SITE_KEY:'1x00000000000000000000AA',TURNSTILE_SECRET_KEY:'test-secret'},outboundService:async request=>Response.json({success:(await request.formData()).get('response')==='valid'})});
  origin=(await mf.ready).origin;
  db=await mf.getD1Database('DB');
  await db.exec((await fs.readFile('feedback/worker/migrations/0001_feedback.sql','utf8')).replace(/\n/g,' '));
});
afterAll(async()=>{await mf?.dispose();});
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
test('database outage cannot acknowledge success',async()=>{
  await db.exec('DROP TABLE feedback');const response=await submit(answer());expect(response.status).toBe(503);expect((await response.json()).saved).toBe(false);
});

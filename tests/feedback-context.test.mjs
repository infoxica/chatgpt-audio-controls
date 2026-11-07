import { beforeAll, afterAll, expect, test } from 'bun:test';
import { Miniflare } from 'miniflare';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { canonicalFeedbackPayload, parseFeedbackContext } from '../feedback/worker/src/context';
import { feedbackContextCopy } from '../scripts/feedback-context-copy';
import { releaseLocales } from '../src/shared/i18n/release-copy';
let mf, db, origin, original;
const answer = () => ({ id:randomUUID(),source:'installed',reason:'bug',comment:'Synthetic optional context test.',locale:'en',version:'1.0.0',browser:'Chrome',os:'Windows',token:'valid' });
const submit = input => mf.dispatchFetch(origin+'/api/feedback',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(input)});
const sha = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');
beforeAll(async()=>{
  const built=await Bun.build({entrypoints:['feedback/worker/src/index.ts'],target:'browser',format:'esm'});
  if(!built.success)throw Error('Worker build failed');
  mf=new Miniflare({modules:true,script:await built.outputs[0].text(),compatibilityDate:'2026-07-30',d1Databases:['DB'],bindings:{ENVIRONMENT:'local',TURNSTILE_SITE_KEY:'test',TURNSTILE_SECRET_KEY:'test'},outboundService:async request=>Response.json({success:(await request.formData()).get('response')==='valid'})});
  origin=(await mf.ready).origin;db=await mf.getD1Database('DB');
  await db.exec((await fs.readFile('feedback/worker/migrations/0001_feedback.sql','utf8')).replace(/\n/g,' '));
  original=answer();expect((await submit(original)).status).toBe(200);
  // Apply only to this in-memory fixture: old rows and v1 writes remain intact.
  await db.exec((await fs.readFile('feedback/worker/migrations/0002_optional_feedback_context.sql','utf8')).replace(/\n/g,' '));
},30000);
afterAll(async()=>{await mf?.dispose();},10000);
test('additive migration preserves the exact v1 hash and nullable context',async()=>{
  const existing=await db.prepare('SELECT payload_hash,form_version,feature,symptom,context_schema_version FROM feedback WHERE id=?').bind(original.id).first();
  const expected=await sha(JSON.stringify([original.source,original.reason,original.comment,original.locale,original.version,original.browser,original.os,1]));
  expect(existing).toEqual({payload_hash:expected,form_version:1,feature:null,symptom:null,context_schema_version:null});
  expect((await submit({...original,token:''})).status).toBe(200);
  const next=answer();expect((await submit(next)).status).toBe(200);
});
test('v2 optional fields persist and concurrent retries create one row',async()=>{
  const input={...answer(),form_version:2,feature:'seek',symptom:'incorrect',context_schema_version:2};
  for(const response of await Promise.all(Array.from({length:4},()=>submit(input))))expect(response.status).toBe(200);
  const saved=await db.prepare('SELECT form_version,feature,symptom,context_schema_version FROM feedback WHERE id=?').bind(input.id).first();
  expect(saved).toEqual({form_version:2,feature:'seek',symptom:'incorrect',context_schema_version:2});
  expect((await db.prepare('SELECT count(*) n FROM feedback WHERE id=?').bind(input.id).first()).n).toBe(1);
  expect((await submit({...input,token:''})).status).toBe(200);
  expect((await submit({...input,feature:'speed'})).status).toBe(409);
  expect((await submit({...input,symptom:'intermittent'})).status).toBe(409);
});
test('v2 can omit both fields and nulls have stable canonical representation',async()=>{
  const input={...answer(),form_version:2};expect((await submit(input)).status).toBe(200);
  expect((await submit({...input,feature:null,symptom:null,context_schema_version:2})).status).toBe(200);
  const context=parseFeedbackContext(input);expect(context).toEqual({formVersion:2,feature:null,symptom:null,contextSchemaVersion:2});
  expect(canonicalFeedbackPayload(['installed','bug','','en','1.0.0','Chrome','Windows'],context)).toBe('["installed","bug","","en","1.0.0","Chrome","Windows",2,null,null,2]');
});
test('invalid context, diagnostics and consent do not write',async()=>{
  for(const patch of [{feature:'seek'},{form_version:3},{form_version:2,feature:'bad'},{form_version:2,feature:'x'.repeat(2000)},{form_version:2,symptom:'missing'},{form_version:2,feature:'seek',symptom:'bad'},{form_version:2,feature:'seek',reason:'suggestion'},{form_version:2,context_schema_version:3},{form_version:2,diagnostics:{}},{form_version:2,consent:{attached:true}}]){
    const input={...answer(),...patch};expect((await submit(input)).status).toBe(400);expect(await db.prepare('SELECT id FROM feedback WHERE id=?').bind(input.id).first()).toBeNull();
  }
});
test('all supported locales have complete optional labels',()=>{
  expect(Object.keys(feedbackContextCopy).sort()).toEqual(Object.keys(releaseLocales).sort());
  for(const copy of Object.values(feedbackContextCopy)){
    expect(copy.featurePrompt.length).toBeGreaterThan(0);expect(copy.symptomPrompt.length).toBeGreaterThan(0);
    expect(Object.keys(copy.features)).toHaveLength(9);expect(Object.keys(copy.symptoms)).toHaveLength(6);
    for(const label of [...Object.values(copy.features),...Object.values(copy.symptoms)])expect(label.trim().length).toBeGreaterThan(0);
  }
});

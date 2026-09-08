import { test, expect } from 'bun:test';
import vm from 'node:vm';
import fs from 'node:fs';
import { createHmac } from 'node:crypto';
import { releaseLocales } from '../src/shared/i18n/release-copy.ts';

function server() {
  const rows = [['Received UTC','Reason','Comment','Language','Extension version','Browser','OS','Survey version','Request ID']];
  const props = { SIGNING_SECRET: 'test-secret', SPREADSHEET_ID: 'test-sheet' };
  let locked=false, busy=false, failFlush=false;
  const lock = { tryLock:()=>{if(busy)return false;locked=true;return true;},releaseLock:()=>{locked=false;} };
  const context = vm.createContext({
    SURVEY_COPY:releaseLocales,
    Utilities:{computeHmacSha256Signature:(value,key)=>createHmac('sha256',key).update(value).digest(),base64EncodeWebSafe:bytes=>Buffer.from(bytes).toString('base64url'),formatDate:(_,__,format)=>format==='yyyy-MM-dd'?'2026-09-08':'2026-09-08-10'},
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key],setProperties:values=>Object.assign(props,values)})},
    LockService:{getScriptLock:()=>lock},
    SpreadsheetApp:{openById:()=>({getSheetByName:()=>({getLastRow:()=>rows.length,getRange:(r,c)=>({getValues:()=>[rows[r-1]],createTextFinder:id=>({matchEntireCell(){return this;},useRegularExpression(){return this;},findNext:()=>rows.slice(1).some(row=>row[8]===id)?{}:null}),setNumberFormat(){return this;},setValues(values){if(!locked)throw Error('Write was not serialized');rows[r-1]=values[0].map(value=>value.startsWith("'")?value.slice(1):value);return this;}})})}),flush:()=>{if(failFlush){failFlush=false;throw Error('Lost reply after write');}}},
  });
  vm.runInContext(fs.readFileSync('feedback/Code.gs','utf8'),context);
  const input = {id:'12345678-1234-1234-1234-123456789abc',expires:Date.now()+3600000,reason:'other',comment:'',locale:'ja',version:'1.2.0',browser:'Edge',os:'macOS',website:''};
  input.token=context.sign_(input.id,input.expires);
  return {context,rows,props,input,setBusy:value=>{busy=value;},loseReply:()=>{failFlush=true;},isLocked:()=>locked};
}
test('blank optional notes and duplicate retries produce one confirmed response',()=>{
  const s=server(); expect(s.rows.length).toBe(1);
  expect(s.context.submitFeedback(s.input).saved).toBe(true);
  expect(s.context.submitFeedback(s.input).saved).toBe(true);
  expect(s.rows.length).toBe(2); expect(s.rows[1][2]).toBe(''); expect(s.rows[1][3]).toBe('ja'); expect(s.isLocked()).toBe(false);
});
test('lost reply can be retried safely and comments remain literal text',()=>{
  const s=server(); s.input.comment='=IMPORTXML("https://example.invalid", "//x")'; s.loseReply();
  expect(()=>s.context.submitFeedback(s.input)).toThrow('Lost reply');
  expect(s.context.submitFeedback(s.input).saved).toBe(true); expect(s.rows.length).toBe(2);
  expect(s.rows[1][2]).toBe(s.input.comment); expect(s.context.literal_(s.input.comment)).toStartWith("'=");
});
test('invalid, oversized, expired and throttled submissions cannot append rows',()=>{
  const s=server();
  for(const patch of [{reason:'invalid'},{locale:'constructor'},{comment:'x'.repeat(1001)},{expires:1},{token:'forged'},{website:'spam'}]) expect(()=>s.context.submitFeedback({...s.input,...patch})).toThrow();
  s.setBusy(true);expect(()=>s.context.submitFeedback(s.input)).toThrow('Busy');s.setBusy(false);
  s.props.HOURLY_LIMIT=JSON.stringify({period:'2026-09-08-10',count:100});expect(()=>s.context.submitFeedback(s.input)).toThrow('Busy');
  expect(s.rows.length).toBe(1); expect(s.isLocked()).toBe(false);
});

test('setup rejects non-owners before accessing resources and reuses existing data',()=>{
  let active='', created=0, locked=false;
  const props={}, sheets=new Map(), formulas=[];
  function makeSheet(name) {
    const rows=[], cells={};
    const sheet={rows,cells,setName(next){sheets.delete(name);name=next;sheets.set(next,sheet);},setFrozenRows(count){cells.frozenRows=count;},getRange(row){return {
      getValues:()=>[rows[0]||Array(9).fill('')],
      setValues(values){if(!locked)throw Error('Unserialized setup');rows[0]=Array.from(values[0]);return this;},
      setFontWeight(){return this;},setValue(value){cells[row]=value;return this;},setFormula(value){cells[row]=value;formulas.push(value);return this;}
    };}};
    sheets.set(name,sheet);return sheet;
  }
  const book={getId:()=> 'private-test-id',getSheets:()=>Array.from(sheets.values()),getSheetByName:name=>sheets.get(name),insertSheet:makeSheet};
  const context=vm.createContext({
    Session:{getActiveUser:()=>({getEmail:()=>active}),getEffectiveUser:()=>({getEmail:()=> 'owner'})},
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key],setProperty:(key,value)=>{props[key]=value;}})},
    LockService:{getScriptLock:()=>({waitLock:()=>{locked=true;},releaseLock:()=>{locked=false;}})},
    Utilities:{getUuid:()=> 'random-test-value'},
    SpreadsheetApp:{create:()=>{created++;makeSheet('Sheet1');return book;},openById:()=>book,flush:()=>{}}
  });
  vm.runInContext(fs.readFileSync('feedback/Code.gs','utf8'),context);
  for(const identity of ['', 'another-user']) {
    active=identity;expect(()=>context.initializeFeedback()).toThrow('Owner authorization');
    expect(created).toBe(0);expect(Object.keys(props)).toHaveLength(0);
  }
  active='owner';expect(context.initializeFeedback().configured).toBe(true);
  const responses=sheets.get('Responses');responses.rows.push(['existing response']);
  const summary=sheets.get('Summary');summary.cells.A1='stale';summary.cells.A4='broken formula';delete summary.cells.D4;
  props.SIGNING_SECRET='preserve-existing-secret';
  expect(context.initializeFeedback().configured).toBe(true);
  expect(created).toBe(1);expect(formulas).toHaveLength(10);
  expect(summary.cells.A1).toBe('Voluntary feedback — respondents only');
  expect(summary.cells.A4).toContain('select B, count(I)');expect(summary.cells.D4).toContain('select D, count(I)');
  expect(summary.cells.frozenRows).toBe(2);
  expect(responses.rows[1]).toEqual(['existing response']);
  expect(props.SIGNING_SECRET).toBe('preserve-existing-secret');expect(locked).toBe(false);
  responses.rows[0][0]='Unexpected header';
  expect(()=>context.initializeFeedback()).toThrow('Unexpected headers');
  expect(responses.rows[0][0]).toBe('Unexpected header');expect(locked).toBe(false);
});

import { expect, test } from 'bun:test';
import { analyticsLocation } from '../site/analytics';
import { SUPPORTED_LANGUAGES } from '../src/shared/constants';
import { resolveLanguage, LOCALES } from '../src/shared/i18n/core';
import { feedbackURL } from '../src/shared/feedback';
import { polishCopy } from '../src/shared/i18n/polish';
import polish from '../src/shared/i18n/polish.json';
import { releaseLocales } from '../src/shared/i18n/release-copy';

test('language order is stable, Auto first, Norwegian aliases resolve to Bokmål', () => {
  expect(SUPPORTED_LANGUAGES[0].code).toBe('auto');
  const names=SUPPORTED_LANGUAGES.slice(1).map(l=>l.label);
  expect(names).toEqual([...names].sort((a,b)=>a.localeCompare(b,'en')));
  for(const code of ['no','no-NO','nb','nb-NO']) expect(resolveLanguage(code)).toBe('nb');
  expect(Object.keys(polish).sort()).toEqual(Object.keys(LOCALES).sort());
  for(const code of Object.keys(LOCALES)) expect(polishCopy(code).editHint).toContain('{action}');
});
test('feedback intents are limited to installed bug/suggestion links', () => {
  for(const intent of ['bug','suggestion'] as const){
    const url=new URL(feedbackURL('pl','installed',undefined,'dark',intent));
    expect(url.searchParams.get('intent')).toBe(intent);
    expect(url.searchParams.get('lang')).toBe('pl'); expect(url.searchParams.get('theme')).toBe('dark');
  }
  expect(new URL(feedbackURL('en','uninstall',undefined,'system','bug')).searchParams.has('intent')).toBe(false);
});
test('website attribution forwards only approved campaign values', () => {
  const url=new URL(analyticsLocation('https://example.com/pl/?utm_source=extension&utm_medium=referral&utm_campaign=v1.4.0&utm_content=sidebar&email=private@example.com&chat=secret#private'));
  expect([...url.searchParams.keys()]).toEqual(['utm_source','utm_medium','utm_campaign','utm_content']);
  expect(url.hash).toBe('');
  expect(analyticsLocation('https://example.com/?utm_source=private@example.com&utm_content=secret')).toBe('https://example.com/');
});
test('new translations preserve format placeholders across every interface',()=>{
  function walk(en: any, translated: any) { for(const key of Object.keys(en)) {
    if(typeof en[key]==='object') walk(en[key],translated[key]);
    else expect((translated[key].match(/\{[^{}]+\}/g)||[]).sort()).toEqual((en[key].match(/\{[^{}]+\}/g)||[]).sort());
  }}
  for(const code of ['pl','hu','sv','cs','uk','ca','el','ro','nb'] as const){walk(LOCALES.en,LOCALES[code]);walk(releaseLocales.en,releaseLocales[code]);}
});

import { test, expect } from 'bun:test';
import fs from 'node:fs';
import { LOCALES, resolveLanguage, detectBrowserLanguage, getTranslations, languageDirection } from '../src/shared/i18n/core.ts';
import { directionForLocale } from '../src/shared/i18n/direction';
import { releaseEnglish, releaseLocales } from '../src/shared/i18n/release-copy.ts';
import { featureCopy, commandLabels } from '../src/shared/i18n/features';
import polish from '../src/shared/i18n/polish.json';
import coffee from '../src/shared/i18n/coffee.json';
import supportAnalytics from '../site/support-analytics-copy.json';
import { supportCatalogs } from '../src/shared/i18n/support';
import { COMMANDS } from '../src/shared/shortcuts';
import { manifestLocale } from '../src/shared/locale-registry';
const leaves = value=>Object.values(value).flatMap(item=>typeof item==='object'?leaves(item):[item]);
const flatten = (value, prefix='') => Object.fromEntries(Object.entries(value).flatMap(([key,item])=>typeof item==='object' && item!==null ? Object.entries(flatten(item,`${prefix}${key}.`)) : [[prefix+key,item]]));
const placeholders = value => (value.match(/\{[^{}]+\}/g)||[]).sort();
const targets = ['en','pt_BR','ja','es','de','vi','fr','hi','zh_CN','zh_TW','ru','pl','tr','ko','fa','ar','it','sv','ro'];

test('all 67 website, feedback-source and support catalogs preserve keys and placeholders',()=>{
  const codes=Object.keys(LOCALES).sort();
  expect(Object.keys(coffee).sort()).toEqual(codes);
  expect(Object.keys(supportAnalytics).sort()).toEqual(codes);
  for (const value of Object.values(supportAnalytics)) expect(value).toContain('PayPal');
  for(const value of Object.values(coffee)) expect(value.trim().length).toBeGreaterThan(0);
  for(const name of ['copy','guide-copy','demo-copy','navigation-copy','image-viewer-copy']){
    const catalog=JSON.parse(fs.readFileSync(`site/${name}.json`,'utf8')), english=flatten({copy:catalog.en});
    expect(Object.keys(catalog).sort()).toEqual(codes);
    for(const [code,values] of Object.entries(catalog)){
      const translated=flatten({copy:values});expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
      for(const [key,text] of Object.entries(english)){
        if(text.trim()) expect(translated[key].trim().length,`${name} ${code} ${key}`).toBeGreaterThan(0);
        else expect(translated[key]).toBe(text);
        expect(placeholders(translated[key]),`${name} ${code} ${key}`).toEqual(placeholders(text));
      }
    }
  }
});

function withBrowser(chromeValue, navigatorValue, check) {
  const originals = new Map(['chrome','navigator'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  try {
    Object.defineProperty(globalThis,'chrome',{configurable:true,value:chromeValue});
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:navigatorValue});
    check();
  } finally {
    for(const [key,descriptor] of originals) if(descriptor) Object.defineProperty(globalThis,key,descriptor); else delete globalThis[key];
  }
}
test('all 67 locale bundles include UI and new flows, with supported manifest catalogs',()=>{
  expect(Object.keys(LOCALES)).toHaveLength(67);
  for(const [code,locale] of Object.entries(LOCALES)){
    expect(leaves(locale).length).toBe(leaves(LOCALES.en).length);
    expect(leaves(locale).every(value=>typeof value==='string'&&value.trim())).toBe(true);
    expect(Object.keys(releaseLocales[code])).toEqual(Object.keys(releaseEnglish));
    expect(resolveLanguage(code)).toBe(code);
    if (!manifestLocale(code)) continue;
    const catalog=JSON.parse(fs.readFileSync(`public/_locales/${manifestLocale(code)}/messages.json`,'utf8'));
    expect(catalog.extensionDescription.message.length).toBeLessThanOrEqual(132);
    expect(catalog.visibilityCommand.message).toBe(releaseLocales[code].visibilityShortcut);
    for(const command of COMMANDS) expect(catalog[command==='toggle-floating-ui'?'visibilityCommand':'command_'+command.replaceAll('-','_')]?.message.trim().length).toBeGreaterThan(0);
    expect(resolveLanguage(code)).toBe(code);
  }
  expect(Object.hasOwn(LOCALES,resolveLanguage('constructor'))).toBe(true);
});

test('every UI catalog has the exact English key paths and format placeholders',()=>{
  const bundle=code=>flatten({ui:LOCALES[code],release:releaseLocales[code],features:featureCopy(code),polish:polish[code],support:supportCatalogs[code]});
  const english=bundle('en');
  for(const code of Object.keys(LOCALES)) {
    const translated=bundle(code);
    expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
    for(const [key,value] of Object.entries(translated)) {
      expect(typeof value,`${code}: ${key}`).toBe('string');
      expect(value.trim().length,`${code}: ${key}`).toBeGreaterThan(0);
      expect(placeholders(value),`${code}: ${key}`).toEqual(placeholders(english[key]));
    }
    if(code!=='en') for(const key of ['gestureReleaseLabel','seekPosition']) expect(polish[code][key]).not.toBe(polish.en[key]);
  }
});

test('all requested Chrome locale codes resolve in browser and manual settings',()=>{
  for(const code of targets) {
    const canonical=code.replace('_','-');
    withBrowser({i18n:{getUILanguage:()=>code}},{languages:['en-US'],language:'en-US'},()=>{
      expect(detectBrowserLanguage()).toBe(canonical);
      expect(resolveLanguage('auto')).toBe(canonical);
      expect(getTranslations()).toBe(LOCALES[canonical]);
      expect(resolveLanguage('en')).toBe('en'); // Manual preference wins over browser.
    });
    withBrowser({i18n:{getUILanguage:()=> 'en-US'}},undefined,()=>{
      expect(resolveLanguage(code)).toBe(canonical);
      expect(resolveLanguage(` ${code.toUpperCase()} `)).toBe(canonical);
    });
  }
});

test('regional/script aliases and userscript detection preserve the right catalog',()=>{
  const variants={'pt':'pt-BR','pt-BR':'pt-BR','pt_PT':'pt-PT','ja-JP':'ja','es-MX':'es-419','de-AT':'de','vi-VN':'vi','fr-CA':'fr-CA','hi-IN':'hi','zh_HK':'zh-HK','zh-MO':'zh-TW','zh-Hant-CN':'zh-TW','zh-Hans-HK':'zh-CN','zh-SG':'zh-CN','ru-RU':'ru','pl-PL':'pl','tr-TR':'tr','ko-KR':'ko','fa_IR':'fa','ar-SA':'ar','it-IT':'it','sv-SE':'sv','ro-RO':'ro','no_NO':'nb','tl-PH':'fil','hi-Latn-IN':'hi-Latn','zh-Hant-HK':'zh-HK','ur-PK':'ur'};
  for(const [tag,expected] of Object.entries(variants)) withBrowser(undefined,{languages:[tag],language:'en-US'},()=>{
    expect(detectBrowserLanguage()).toBe(expected);
    expect(resolveLanguage(tag)).toBe(expected);
  });
  withBrowser({i18n:{getUILanguage:()=> 'ja'}},{languages:['de']},()=>expect(detectBrowserLanguage()).toBe('ja'));
  withBrowser({i18n:{getUILanguage:()=> {throw new Error('Unavailable');}}},{languages:['zz','fr-CA'],language:'en'},()=>expect(detectBrowserLanguage()).toBe('fr-CA'));
  withBrowser({}, {language:'ro-RO'},()=>expect(detectBrowserLanguage()).toBe('ro'));
  withBrowser(undefined,{languages:['zz','english','constructor','__proto__']},()=>{
    expect(detectBrowserLanguage()).toBe('en');
    expect(getTranslations('unsupported')).toBe(LOCALES.en);
  });
  withBrowser(undefined,undefined,()=>expect(detectBrowserLanguage()).toBe('en'));
});

test('Arabic and Persian variants are RTL without reversing other locales',()=>{
  for(const tag of ['ar','ar-SA','AR_EG','fa','fa-IR','FA_IR','ur','ur-PK','he']) {
    expect(directionForLocale(tag)).toBe('rtl'); expect(languageDirection(tag)).toBe('rtl');
  }
  for(const tag of targets.filter(code=>!['ar','fa'].includes(code))) expect(languageDirection(tag)).toBe('ltr');
});

test('Chrome/Edge manifest catalogs expose translated names and commands with English fallback',()=>{
  const manifest=JSON.parse(fs.readFileSync('public/manifest.json','utf8'));
  expect(manifest.default_locale).toBe('en');
  const english=JSON.parse(fs.readFileSync('public/_locales/en/messages.json','utf8'));
  const references=[...JSON.stringify(manifest).matchAll(/__MSG_(\w+)__/g)].map(match=>match[1]);
  for(const code of Object.keys(LOCALES)) {
    if (!manifestLocale(code)) continue;
    const catalog=JSON.parse(fs.readFileSync(`public/_locales/${manifestLocale(code)}/messages.json`,'utf8'));
    expect(Object.keys(catalog).sort()).toEqual(Object.keys(english).sort());
    for(const key of references) expect(catalog[key]?.message.trim().length,`${code}: ${key}`).toBeGreaterThan(0);
    const labels=commandLabels(code);
    for(const command of COMMANDS) expect(catalog[command==='toggle-floating-ui'?'visibilityCommand':'command_'+command.replaceAll('-','_')].message).toBe(labels[command]);
  }
});

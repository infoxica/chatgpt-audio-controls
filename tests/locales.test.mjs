import { test, expect } from 'bun:test';
import fs from 'node:fs';
import { LOCALES, resolveLanguage } from '../src/shared/i18n/core.ts';
import { releaseEnglish, releaseLocales } from '../src/shared/i18n/release-copy.ts';
const leaves = value=>Object.values(value).flatMap(item=>typeof item==='object'?leaves(item):[item]);
test('all 17 locale bundles include UI, new flows and valid manifest catalogs',()=>{
  expect(Object.keys(LOCALES)).toHaveLength(17);
  for(const [code,locale] of Object.entries(LOCALES)){
    expect(leaves(locale).length).toBe(leaves(LOCALES.en).length);
    expect(leaves(locale).every(value=>typeof value==='string'&&value.trim())).toBe(true);
    expect(Object.keys(releaseLocales[code])).toEqual(Object.keys(releaseEnglish));
    const catalog=JSON.parse(fs.readFileSync(`public/_locales/${code.replace('-','_')}/messages.json`,'utf8'));
    expect(catalog.extensionDescription.message.length).toBeLessThanOrEqual(132);
    expect(catalog.visibilityCommand.message).toBe(releaseLocales[code].visibilityShortcut);
    expect(resolveLanguage(code)).toBe(code);
  }
  expect(Object.hasOwn(LOCALES,resolveLanguage('constructor'))).toBe(true);
});

import { supportCatalogs } from '../src/shared/i18n/support';
import { expect, test } from 'bun:test';
import { PRESETS, migrateLayout, defaultLayout, defaultProfile, isLayout, layoutProfile } from '../src/shared/layout';
import splitLabels from '../src/shared/i18n/split-layout.json';
import { dockGeometry, intersects, magneticOffset, fits } from '../src/content/layout-geometry';
import { featureCatalogs, featureCopy } from '../src/shared/i18n/features';
import { LOCALES, languageDirection, resolveLanguage } from '../src/shared/i18n/core';
import { COMMANDS, isPlayerCommand } from '../src/shared/shortcuts';
import { acceptanceComplete } from '../scripts/release-acceptance';

test('MacBook CSS viewports retain split placement with full-size compact buttons', () => {
  for (const width of [1440, 1512, 1728, 1920]) for (const seekFirst of [true, false]) {
    const v = { x: 12, y: 12, width: width - 24, height: 858 };
    const c = { x: (width - 760) / 2, y: 780, width: 760, height: 80 };
    const g = dockGeometry({ preset: 'original', seekFirst }, v, true, c)!;
    expect(g.circle.x).toBe(c.x + c.width + 6);
    expect(g.controls.height).toBe(48);
    expect(g.controls.width).toBeGreaterThanOrEqual(224);
    expect(g.seek.width).toBeGreaterThanOrEqual(220);
    for (const r of [g.seek, g.controls, g.circle]) {
      expect(fits(r, v)).toBe(true);
      expect(intersects(r, c)).toBe(false);
    }
  }
});

test('compact vertical and corner controls preserve a constrained preset', () => {
  for (const preset of ['left', 'right'] as const) for (const seekFirst of [true, false]) {
    const v = { x: 12, y: 12, width: 1488, height: 580 };
    const g = dockGeometry({ preset, seekFirst }, v, true)!;
    expect(g.compactControls).toBe(true);
    expect(g.controls.height).toBe(224);
    expect(g.controls.width).toBe(48);
    for (const r of [g.seek, g.controls, g.circle]) expect(fits(r, v)).toBe(true);
  }
  for (const preset of ['bottom-left', 'bottom-right'] as const) {
    const v = { x: 12, y: 12, width: 1488, height: 858 };
    const c = { x: 376, y: 780, width: 760, height: 100 };
    const g = dockGeometry({ preset, seekFirst: true }, v, true, c)!;
    expect(g.compactControls).toBe(true);
    expect(g.controls.height).toBe(48);
    expect(intersects(g.controls, c)).toBe(false);
  }
});

test('all desktop presets and pill orders have correct non-overlapping geometry', () => {
  const viewport = { x: 12, y: 80, width: 1400, height: 850 };
  const composer = { x: 400, y: 800, width: 760, height: 80 };
  let count = 0;
  for (const preset of PRESETS) for (const seekFirst of [true, false]) {
    count++;
    const g = dockGeometry({ preset, seekFirst }, viewport, true, composer)!;
    expect(g).not.toBeNull();
    const parts = [g.seek, g.controls, g.circle];
    for (const r of parts) expect(fits(r, viewport)).toBe(true);
    expect(intersects(g.seek, g.controls)).toBe(false);
    expect(intersects(g.circle, g.controls)).toBe(false);
    expect(intersects(g.circle, g.seek)).toBe(false);
    if (preset === 'left' || preset === 'right') {
      expect(g.verticalSeek && g.verticalControls).toBe(true);
      expect(g.circle.y).toBeGreaterThan((seekFirst ? g.seek : g.controls).y);
      expect(g.circle.y + g.circle.height).toBeLessThan((seekFirst ? g.controls : g.seek).y);
    } else if (preset.startsWith('top')) {
      expect(seekFirst ? g.verticalControls : g.verticalSeek).toBe(true);
      expect(g.circle.y).toBeLessThan((seekFirst ? g.controls : g.seek).y);
    } else if (preset.startsWith('bottom')) {
      expect(seekFirst ? g.verticalSeek : g.verticalControls).toBe(true);
      expect(g.circle.y).toBeGreaterThan((seekFirst ? g.seek : g.controls).y);
    }
  }
  expect(count).toBe(PRESETS.length * 2);
});
test('mobile docks are flush, horizontal, reversible and direction-aware', () => {
  for (const width of [320, 360, 390, 768]) for (const seekFirst of [true, false]) for (const rtl of [true, false]) {
    const composer = { x: 24, y: 620, width: width - 48, height: 100 };
    const g = dockGeometry({ preset: 'composer', seekFirst }, { x: 12, y: 12, width: width - 24, height: 750 }, true, composer, rtl)!;
    expect(g.verticalControls || g.verticalSeek).toBe(false);
    expect(g.surface!.y + g.surface!.height).toBe(composer.y);
    expect(g.surface!.width).toBe(composer.width);
    expect(g.circle.x).toBe(rtl ? composer.x + 2 : composer.x + composer.width - 46);
    expect(g.surface!.height).toBe(width < 768 ? 100 : 52);
    expect(intersects(g.circle, g.seek)).toBe(false);
    expect(intersects(g.circle, g.controls)).toBe(false);
    expect(intersects(g.seek, g.controls)).toBe(false);
  }
  expect(dockGeometry(defaultProfile(true), { x: 0, y: 0, width: 320, height: 100 }, true)).toBeNull();
});
test('magnet has one 24px hit boundary and never pulls beyond 12px', () => {
  const target = { x: 100, y: 100, width: 44, height: 44 };
  expect(magneticOffset(75, 122, target)).toBeNull();
  expect(magneticOffset(76, 122, target)).toEqual({ x: 0, y: 0 });
  for (let x = 76; x <= 168; x++) {
    const pull = magneticOffset(x, 122, target)!;
    expect(Math.hypot(pull.x, pull.y)).toBeLessThanOrEqual(12);
  }
});
test('versioned layout migration and validation keep mobile composer-only', () => {
  expect(isLayout(defaultLayout())).toBe(true);
  for (const input of [null, {}, { ...defaultLayout(), version: 1 }, { ...defaultLayout(), narrow: { preset: 'split-bottom', seekFirst: true } }, { ...defaultLayout(), desktop: { preset: 'constructor', seekFirst: true } }]) expect(isLayout(input)).toBe(false);
  expect(migrateLayout({ version: 1, desktop: { mode: 'docked', anchor: 'top-right', arrangement: 'corner', seekFirst: false }, narrow: { seekFirst: false } })).toEqual({ version: 2, desktop: { preset: 'top-right', seekFirst: false }, narrow: { preset: 'composer', seekFirst: false } });
  expect(migrateLayout({ version: 1, desktop: { mode: 'docked', anchor: 'top', arrangement: 'row', seekFirst: true } }).desktop.preset).toBe('original');
  expect(layoutProfile(767)).toBe('narrow'); expect(layoutProfile(768)).toBe('desktop');
});

test('fresh defaults dock while saved split choices survive migration', () => {
  expect(defaultLayout().desktop.preset).toBe('composer');
  expect(defaultLayout().narrow.preset).toBe('composer');
  expect(migrateLayout(null)).toEqual(defaultLayout());
  for (const preset of ['original', 'split-bottom'] as const) {
    const saved = { ...defaultLayout(), desktop: { preset, seekFirst: false } };
    expect(migrateLayout(saved)).toEqual(saved);
  }
  expect(migrateLayout({version:1,desktop:{mode:'automatic',seekFirst:true}}).desktop.preset).toBe('original');
});

test('split bottom follows the composer base without changing top alignment or physical sides', () => {
  const v = {x:12,y:12,width:1980,height:960};
  for (const height of [80,350,690]) for (const seekFirst of [true,false]) for (const rtl of [true,false]) {
    const c = {x:600,y:780-height,width:760,height};
    const bottom = dockGeometry({preset:'split-bottom',seekFirst},v,true,c,rtl)!;
    const top = dockGeometry({preset:'original',seekFirst},v,true,c,rtl)!;
    expect(bottom.seek.y+bottom.seek.height).toBe(c.y+c.height);
    expect(bottom.controls.y+bottom.controls.height).toBe(c.y+c.height);
    expect(bottom.circle.y).toBe(bottom.seek.y+2);
    expect(top.seek.y).toBe(c.y);expect(top.controls.y).toBe(c.y);
    for (const part of ['seek','controls','circle'] as const) {
      expect(bottom[part].x).toBe(top[part].x);
      expect(fits(bottom[part],v)).toBe(true);
      expect(intersects(bottom[part],c)).toBe(false);
    }
  }
});
test('feature catalogs cover every language and direction is locale-specific', () => {
  expect(Object.keys(splitLabels).sort()).toEqual(Object.keys(LOCALES).sort());
  expect(Object.keys(featureCatalogs).sort()).toEqual(Object.keys(LOCALES).sort());
  for (const values of Object.values(featureCatalogs)) { expect(values.length).toBe(33); expect(values.every(v => v.trim())).toBe(true); }
  for (const code of Object.keys(LOCALES)) {
    expect(Object.keys(featureCopy(code).presets).sort()).toEqual([...PRESETS].sort());
    expect(Object.values(featureCopy(code).presets).every(label => !!label?.trim())).toBe(true);
  }
  for (const code of ['ar', 'fa', 'he']) expect(languageDirection(code)).toBe('rtl');
  for (const code of ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'tr']) expect(languageDirection(code)).toBe('ltr');
  expect(resolveLanguage('he')).toBe('he');
});
test('all commands are allowlisted; mobile acceptance cannot inherit desktop success', () => {
  expect(COMMANDS.length).toBe(15); expect(isPlayerCommand('constructor')).toBe(false);
  const state = { version: '1.4.0', feedbackDeployment: true, chromeLive: true, edgeLive: true, websiteDeployment: true, userscriptLive: true, nativeMac: true };
  expect(acceptanceComplete(state, '1.4.0')).toBe(false);
  expect(acceptanceComplete({ ...state, edgeAndroidLive: true }, '1.4.0')).toBe(true);
});

test('original split puts circle next to composer and expands seek into free space', () => {
  const v = {x:12,y:12,width:2000,height:1000}, c = {x:640,y:850,width:760,height:80};
  for(const seekFirst of [true,false]) {
    const g=dockGeometry({preset:'original',seekFirst},v,true,c)!;
    expect(g.circle.x).toBe(c.x+c.width+6);
    expect((seekFirst ? g.controls : g.seek).x).toBe(g.circle.x+50);
    expect(g.seek.width).toBeGreaterThan(244);
  }
});

test('support copy covers all supported locales', () => {
  expect(Object.keys(supportCatalogs).sort()).toEqual(Object.keys(LOCALES).sort());
  for(const fields of Object.values(supportCatalogs)) { expect(fields.length).toBe(4); expect(fields.every(s=>s.trim())).toBe(true); }
});

test('bottom L horizontal seek fills only the span beside the composer', () => {
  const v = {x:12,y:12,width:1576,height:776}, composer = {x:420,y:680,width:760,height:100};
  for (const preset of ['bottom-left', 'bottom-right'] as const) {
    const g = dockGeometry({preset,seekFirst:false},v,true,composer)!;
    expect(g.seek.width).toBe(348);
    expect(intersects(g.seek,composer)).toBe(false);
    expect(intersects(g.controls,composer)).toBe(false);
    expect(preset === 'bottom-left' ? composer.x-g.seek.x-g.seek.width : g.seek.x-composer.x-composer.width).toBe(6);
  }
  expect(dockGeometry({preset:'bottom-right',seekFirst:false},v,true,{...composer,width:1000})).toBeNull();
});

test('top L presets clear native actions and dock tabs clear composer curves', () => {
  const v={x:12,y:12,width:1576,height:776}, c={x:420,y:680,width:760,height:100};
  const action={x:1450,y:8,width:120,height:44};
  for (const seekFirst of [true,false]) {
    const g=dockGeometry({preset:'top-right',seekFirst},v,true,c,false,false,{actions:[action]})!;
    expect(Math.min(g.seek.y,g.controls.y,g.circle.y)).toBe(60);
  }
  for (const rtl of [true,false]) {
    const g=dockGeometry({preset:'composer',seekFirst:true},v,false,c,rtl,false,{cornerLeft:28,cornerRight:32})!;
    expect(g.circleVisual!.y+g.circleVisual!.height).toBe(c.y);
    expect(rtl ? g.circleVisual!.x-c.x : c.x+c.width-g.circleVisual!.x-g.circleVisual!.width).toBe((rtl?28:32)+6);
    expect(g.circle.height).toBe(44);
  }
});

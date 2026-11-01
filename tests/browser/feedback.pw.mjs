import { test, expect } from '@playwright/test';
import { Miniflare } from 'miniflare';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
let mf, db, origin;
test.beforeAll(async () => {
  execFileSync('bun', ['build', 'feedback/worker/src/index.ts', '--target=browser', '--outfile=build/test-feedback.mjs']);
  mf = new Miniflare({ modules: true, scriptPath: 'build/test-feedback.mjs', compatibilityDate: '2026-07-30',
    d1Databases: ['DB'], bindings: { ENVIRONMENT: 'local', TURNSTILE_SITE_KEY: 'test', TURNSTILE_SECRET_KEY: 'test' },
    outboundService: async request => Response.json({ success: (await request.formData()).get('response') === 'valid' }) });
  origin = (await mf.ready).origin;
  db = await mf.getD1Database('DB');
  await db.exec((await fs.readFile('feedback/worker/migrations/0001_feedback.sql', 'utf8')).replace(/\n/g, ' '));
});
test.afterAll(async () => { await mf?.dispose(); });
async function open(page, source = 'installed', firstToken = 'valid') {
  await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({ contentType: 'application/javascript', body:
    `window.turnstile={remove:()=>{},render:(selector,options)=>{window.testChallenge=options;options.callback(${JSON.stringify(firstToken)});return 1;},reset:()=>window.testChallenge.callback('valid')};window.feedbackChallengeReady();` }));
  await page.goto(`${origin}/feedback?source=${source}&lang=en&version=1.3.0&browser=Edge&os=Windows`);
}
const count = async () => (await db.prepare('SELECT COUNT(*) AS n FROM feedback').first()).n;

test('all added locales switch direction and fit narrow feedback screens',async({page})=>{
  await open(page);
  for(const language of ['bn','mr','te','ta','ar','fa','he','pl','hu','sv','cs','uk','ca','el','ro','nb']) {
    await page.locator('#language').selectOption(language);
    await expect(page.locator('html')).toHaveAttribute('dir',['ar','fa','he'].includes(language)?'rtl':'ltr');
    for(const width of [320,390,768]) {await page.setViewportSize({width,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth ? [] : [...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1||r.left < -1;}).map(e=>({tag:e.tagName,name:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))),`${language} ${width}`).toEqual([]);}
  }
});

test('theme follows system changes, remembers overrides and preserves answers', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' }); await open(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(page.locator('#theme')).toHaveValue('system');
  await expect(page.getByRole('combobox', { name: 'Appearance', exact: true })).toHaveAttribute('title', 'Appearance: System');
  await expect(page.locator('.system-icon')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('combobox', { name: 'Language', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('combobox', { name: 'Appearance', exact: true })).toBeFocused();
  await expect(page.locator('#privacy')).toContainText('Your feedback is optional');
  await expect(page.locator('#privacy')).not.toContainText('Cloudflare');
  await page.locator('input[value=bug]').check(); await page.locator('summary').first().click(); await page.locator('#note').fill('Keep this answer.');
  await page.emulateMedia({colorScheme:'light'}); await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.locator('#theme').selectOption('dark');
  await expect(page.locator('.moon-icon')).toBeVisible();
  await expect(page.locator('.system-icon')).toBeHidden();
  await expect(page.locator('#note')).toHaveValue('Keep this answer.'); await expect(page.locator('input[value=bug]')).toBeChecked();
  await page.screenshot({path:'build/browser-results/feedback-dark.png',fullPage:true});
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.locator('#theme').selectOption('light'); await expect(page.locator('.sun-icon')).toBeVisible();
  await page.locator('#theme').selectOption('system'); await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.setViewportSize({width:390,height:844}); await page.screenshot({path:'build/browser-results/feedback-light-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#language').selectOption('de');
  await expect(page.locator('html')).toHaveAttribute('lang','de');
  await expect(page.locator('#language')).toHaveAttribute('title', /Deutsch/);
  await expect(page.locator('#theme')).toHaveAccessibleName(/.+/);
});
test('both modes, no default choice, 33 languages and Skip create no record', async ({ page }) => {
  const before = await count();
  for (const [mode, total] of [['installed', 3], ['uninstall', 8]]) {
    await open(page, mode); await expect(page.locator('input[name=reason]')).toHaveCount(total);
    await expect(page.locator('input:checked')).toHaveCount(0);
    await expect(page.locator('#language option')).toHaveCount(33);
    await page.getByRole('button', { name: 'Send feedback', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Choose one reason');
    await page.getByRole('button', { name: 'Skip feedback', exact: true }).click();
    await expect(page.locator('#done')).toBeVisible();
  }
  expect(await count()).toBe(before);
});
test('challenge rejection preserves answers and resets the token for retry', async ({ page }) => {
  const before = await count(); await open(page, 'installed', 'expired');
  await page.locator('input[value=bug]').check(); await page.locator('summary').first().click();
  await page.locator('#note').fill('A deliberate browser test.');
  await expect(page.locator('#note')).toHaveAttribute('maxlength', '1000');
  await page.locator('#send').click(); await expect(page.getByRole('alert')).toContainText('wasn’t confirmed');
  await expect(page.locator('#note')).toHaveValue('A deliberate browser test.');
  await expect(page.locator('input[value=bug]')).toBeChecked(); expect(await count()).toBe(before);
  await page.locator('#send').click(); await expect(page.locator('#done')).toBeVisible();
  expect(await count()).toBe(before + 1);
});
test('lost response retry persists exactly once and failures never show success', async ({ page }) => {
  const before = await count(); await open(page);
  let requests = 0;
  await page.route('**/api/feedback', async route => {
    requests++;
    if (requests === 1) { await route.fetch(); await route.abort('failed'); }
    else await route.continue();
  });
  await page.locator('input[value=suggestion]').check();
  await page.locator('#send').click(); await expect(page.getByRole('alert')).toContainText('wasn’t confirmed');
  await expect(page.locator('#done')).toBeHidden(); expect(await count()).toBe(before + 1);
  await page.locator('#send').click(); await expect(page.locator('#done')).toBeVisible();
  expect(requests).toBe(2); expect(await count()).toBe(before + 1);
});

test('feedback intent validates and preselects without submitting',async({page})=>{
  await open(page);const initial=await count();
  for(const intent of ['bug','suggestion','invalid']) {
    await page.goto(`${origin}/feedback?source=installed&lang=pl&theme=dark&intent=${intent}`);
    const selected=page.locator('input[name="reason"]:checked');
    if(intent==='invalid')await expect(selected).toHaveCount(0);
    else await expect(selected).toHaveValue(intent);
    expect(await count()).toBe(initial);
  }
});

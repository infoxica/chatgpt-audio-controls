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
    `window.turnstile={render:(selector,options)=>{window.testChallenge=options;options.callback(${JSON.stringify(firstToken)});return 1;},reset:()=>window.testChallenge.callback('valid')};window.feedbackChallengeReady();` }));
  await page.goto(`${origin}/feedback?source=${source}&lang=en&version=1.3.0&browser=Edge&os=Windows`);
}
const count = async () => (await db.prepare('SELECT COUNT(*) AS n FROM feedback').first()).n;
test('both modes, no default choice, 17 languages and Skip create no record', async ({ page }) => {
  const before = await count();
  for (const [mode, total] of [['installed', 3], ['uninstall', 8]]) {
    await open(page, mode); await expect(page.locator('input[name=reason]')).toHaveCount(total);
    await expect(page.locator('input:checked')).toHaveCount(0);
    await expect(page.locator('#language option')).toHaveCount(17);
    await page.getByRole('button', { name: 'Send feedback', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Choose one reason');
    await page.getByRole('button', { name: 'Skip feedback', exact: true }).click();
    await expect(page.locator('#done')).toBeVisible();
  }
  expect(await count()).toBe(before);
});
test('challenge rejection preserves answers and resets the token for retry', async ({ page }) => {
  const before = await count(); await open(page, 'installed', 'expired');
  await page.locator('input[value=bug]').check(); await page.locator('summary').click();
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

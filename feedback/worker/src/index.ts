import releaseLocales from './locales.generated.json';
import { renderForm } from './page';

const uninstallReasons = ['broken', 'intrusive', 'slow', 'difficult', 'missing', 'language', 'unneeded', 'other'];
const browsers = ['Chrome', 'Chromium', 'Edge', 'Firefox', 'Safari', 'Other'];
const systems = ['Windows', 'macOS', 'Linux', 'ChromeOS', 'Android', 'Other'];
const json = (body: object, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

async function readInput(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('invalid');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) { await reader.cancel(); throw new Error('large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid');
  return value as Record<string, unknown>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      try { await env.DB.prepare('SELECT 1 FROM feedback LIMIT 1').first(); return json({ ok: true }); }
      catch { return json({ ok: false }, 503); }
    }
    if (request.method === 'GET' && url.pathname === '/feedback') {
      if (!env.TURNSTILE_SITE_KEY || (env.ENVIRONMENT !== 'local' && env.TURNSTILE_SITE_KEY.startsWith('1x000'))) return new Response('Feedback is temporarily unavailable.', { status: 503 });
      const nonce = crypto.randomUUID().replaceAll('-', '');
      return new Response(renderForm(url, env.TURNSTILE_SITE_KEY, nonce), { headers: {
        'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}' https://challenges.cloudflare.com; style-src 'nonce-${nonce}'; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
      } });
    }
    if (url.pathname !== '/api/feedback') return new Response('Not found', { status: 404 });
    if (request.method !== 'POST') return json({ saved: false, error: 'method' }, 405);
    if (request.headers.get('origin') !== url.origin) return json({ saved: false, error: 'origin' }, 403);
    let input: Record<string, unknown>;
    try { input = await readInput(request); } catch (error) { return json({ saved: false, error: 'invalid' }, error instanceof Error && error.message === 'large' ? 413 : 400); }
    const { id, source, reason, comment, locale, version, browser, os, token } = input;
    const reasons = source === 'uninstall' ? uninstallReasons : source === 'installed' ? ['bug', 'suggestion', 'other'] : [];
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      || typeof reason !== 'string' || !reasons.includes(reason)
      || typeof comment !== 'string' || comment.length > 1000
      || typeof locale !== 'string' || !Object.hasOwn(releaseLocales, locale)
      || typeof version !== 'string' || !/^(?:unknown|\d{1,5}\.\d{1,5}\.\d{1,5})$/.test(version)
      || typeof browser !== 'string' || !browsers.includes(browser)
      || typeof os !== 'string' || !systems.includes(os)
      || typeof token !== 'string' || token.length > 2048 || input.website) return json({ saved: false, error: 'invalid' }, 400);
    const payload = JSON.stringify([source, reason, comment, locale, version, browser, os, 1]);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload))), b => b.toString(16).padStart(2, '0')).join('');
    try {
      const existing = await env.DB.prepare('SELECT payload_hash FROM feedback WHERE id = ?').bind(id).first<{ payload_hash: string }>();
      if (existing) return existing.payload_hash === hash ? json({ saved: true, id }) : json({ saved: false, error: 'conflict' }, 409);
      if (!env.TURNSTILE_SECRET_KEY || (env.ENVIRONMENT !== 'local' && env.TURNSTILE_SECRET_KEY.startsWith('1x000'))) return json({ saved: false, error: 'unavailable' }, 503);
      const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token }), signal: AbortSignal.timeout(10000),
      });
      if (!verification.ok) return json({ saved: false, error: 'challenge' }, 503);
      const challenge = await verification.json<{ success: boolean; hostname?: string; action?: string }>();
      if (!challenge.success || (env.ENVIRONMENT !== 'local' && (challenge.hostname !== url.hostname || challenge.action !== 'feedback'))) return json({ saved: false, error: 'challenge' }, 403);
      // A unique primary key closes the race between simultaneous submissions.
      await env.DB.prepare('INSERT INTO feedback (id, source, reason, comment, locale, extension_version, browser, os, form_version, payload_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT(id) DO NOTHING')
        .bind(id, source, reason, comment, locale, version, browser, os, hash).run();
      const saved = await env.DB.prepare('SELECT payload_hash FROM feedback WHERE id = ?').bind(id).first<{ payload_hash: string }>();
      if (saved?.payload_hash !== hash) return json({ saved: false, error: 'conflict' }, 409);
      console.log(JSON.stringify({ event: 'feedback_saved', source }));
      return json({ saved: true, id });
    } catch {
      console.error(JSON.stringify({ event: 'feedback_failed' }));
      return json({ saved: false, error: 'unavailable' }, 503);
    }
  },
} satisfies ExportedHandler<Env>;

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Wrangler uses the owner's authenticated Cloudflare session. No public admin endpoint.
const [environment, action] = process.argv.slice(2);
if (!['staging', 'production'].includes(environment) || !['summary', 'export'].includes(action)) {
  throw new Error('Usage: bun scripts/feedback-admin.ts staging|production summary|export');
}
const database = environment === 'production' ? 'chatgpt-audio-feedback' : 'chatgpt-audio-feedback-staging';
const args = ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', database,
  '--config', 'feedback/worker/wrangler.jsonc', '--env', environment, '--remote', '--json'];
args.push(...(action === 'summary' ? ['--command', readFileSync('feedback/worker/queries/summary.sql', 'utf8')] :
  ['--command', 'SELECT id, received_at, source, reason, comment, locale, extension_version, browser, os, form_version FROM feedback ORDER BY received_at']));
const result = execFileSync('node', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const parsed = JSON.parse(result);
if (action === 'summary') console.log(JSON.stringify(parsed.map((r: { results: unknown }) => r.results), null, 2));
else {
  // JSON preserves formula-like comments literally and avoids spreadsheet execution.
  const file = `build/feedback-exports/${environment}-${new Date().toISOString().replaceAll(':', '-')}.json`;
  mkdirSync('build/feedback-exports', { recursive: true });
  writeFileSync(file, JSON.stringify(parsed[0].results, null, 2), { flag: 'wx' });
  console.log(`Private export saved to ${file}. Do not commit or publish it.`);
}

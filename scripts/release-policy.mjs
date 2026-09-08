import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';

export function versionIncreased(previous, current) {
  const parse = value => /^\d+\.\d+\.\d+$/.test(value) ? value.split('.').map(Number) : null;
  const before = parse(previous), after = parse(current);
  if (!before || !after) throw new Error('Expected three-part numeric extension versions');
  for (let i = 0; i < 3; i++) {
    if (after[i] !== before[i]) return after[i] > before[i];
  }
  return false;
}

export function shouldPublish({ event, ref, previous, current, manual }) {
  if (ref !== 'refs/heads/master') return false;
  if (event === 'workflow_dispatch') return manual === 'yes';
  return event === 'push' && versionIncreased(previous, current);
}

if (import.meta.main) {
  const current = JSON.parse(readFileSync('public/manifest.json', 'utf8')).version;
  let previous = current;
  if (process.env.GITHUB_EVENT_NAME === 'push' && process.env.GITHUB_REF === 'refs/heads/master') {
    const before = process.env.BEFORE_SHA;
    if (!before || !/^[a-f0-9]{40}$/.test(before) || /^0+$/.test(before)) throw new Error('Missing valid previous master SHA');
    previous = JSON.parse(execFileSync('git', ['show', `${before}:public/manifest.json`], { encoding: 'utf8' })).version;
  }
  const publish = shouldPublish({ event: process.env.GITHUB_EVENT_NAME, ref: process.env.GITHUB_REF, previous, current, manual: process.env.MANUAL_PUBLISH });
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `publish=${publish}\nversion=${current}\n`);
  console.log(`Store publication: ${publish}; version ${previous} -> ${current}`);
}

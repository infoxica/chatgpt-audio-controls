import { expect, test } from 'bun:test';
import { shouldPublish, versionIncreased } from '../scripts/release-policy.mjs';

test('only increasing master versions publish automatically', () => {
  const base = { event: 'push', ref: 'refs/heads/master', previous: '1.1.0', current: '1.2.0' };
  expect(shouldPublish(base)).toBe(true);
  expect(shouldPublish({ ...base, current: '1.1.0' })).toBe(false);
  expect(shouldPublish({ ...base, current: '1.0.9' })).toBe(false);
  expect(shouldPublish({ ...base, ref: 'refs/heads/develop' })).toBe(false);
  expect(shouldPublish({ ...base, ref: 'refs/tags/v1.2.0' })).toBe(false);
  expect(shouldPublish({ ...base, event: 'pull_request' })).toBe(false);
  expect(shouldPublish({ ...base, event: 'workflow_dispatch', manual: 'yes', current: '1.1.0' })).toBe(true);
  expect(shouldPublish({ ...base, event: 'workflow_dispatch', manual: 'no' })).toBe(false);
  expect(versionIncreased('1.9.0', '1.10.0')).toBe(true);
  expect(() => versionIncreased('bad', '1.2.0')).toThrow();
});

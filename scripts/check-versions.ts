import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXTENSION_VERSION } from '../src/shared/constants';

export function validateReadmeVersion(readme: string, version: string): void {
  const badge = `[![Source version](https://img.shields.io/badge/source-v${version}-3968c8.svg?style=for-the-badge)](CHANGELOG.md)`;
  if (!readme.includes(badge)) {
    throw new Error(`README.md source-version badge must show v${version} and link to CHANGELOG.md.`);
  }
  const heading = readme.match(/^## v(\d+\.\d+\.\d+)\b/m)?.[1];
  if (heading !== version) {
    throw new Error(`README.md current version heading must be v${version}; found ${heading || 'none'}.`);
  }
}

export function checkVersions(expectedVersion?: string): string {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
  const packageVersion = JSON.parse(read('package.json')).version as string;
  const version = expectedVersion || packageVersion;
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Expected a three-part numeric version.');
  const sources = [
    ['package.json', packageVersion],
    ['public/manifest.json', JSON.parse(read('public/manifest.json')).version],
    ['UI version', EXTENSION_VERSION],
    ['userscript metadata', read('userscript/chatgpt-audio-controls.user.js').match(/@version\s+(\S+)/)?.[1]],
  ];
  const mismatches = sources.filter(([, value]) => value !== version);
  if (mismatches.length) throw new Error(`Version mismatch for ${version}: ${mismatches.map(([name, value]) => `${name}=${value || 'missing'}`).join(', ')}`);
  validateReadmeVersion(read('README.md'), version);
  if (!read('CHANGELOG.md').includes(`## [${version}]`)) throw new Error(`CHANGELOG.md is missing a ${version} entry.`);
  return version;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Versions match across README, package, manifest, UI, userscript and changelog: ${checkVersions()}`);
}

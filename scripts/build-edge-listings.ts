import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { releaseLocales } from '../src/shared/i18n/release-copy';

// These are Partner Center input files, not an API payload or extension assets.
const source = readFileSync('docs/STORE-LISTINGS.md', 'utf8');
const sections = new Map([...source.matchAll(/^## ([\w-]+)\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)].map(match => [match[1], match[2]]));
const output = 'build/edge-store-listings';
for (const locale of Object.keys(releaseLocales)) {
  const section = sections.get(locale);
  const description = section?.split(/### Description\r?\n/)[1]?.trim();
  if (!description || description.length < 250 || description.length > 10000) throw new Error(`Missing or invalid Edge description: ${locale}`);
  const directory = `${output}/${locale}`;
  mkdirSync(directory, { recursive: true });
  writeFileSync(`${directory}/description.txt`, description + '\n');
  copyFileSync('public/icons/icon-128.png', `${directory}/logo.png`);
}
writeFileSync(`${output}/README.txt`, `Edge store listing inputs — ${Object.keys(releaseLocales).length} locales

In Partner Center, open this extension's draft > Store listings.
For every included language, paste its description.txt and upload its logo.png, then Save draft.
Add missing languages explicitly if Partner Center did not detect them.
Verify every included language is Complete before retrying publication.

The Edge Update REST API cannot update descriptions or listing images.
These files are manual inputs, not an automatic import archive.
After completing the listings, use the CI & Release workflow on master:
publish_to_stores=yes, store=edge. Do not resubmit Chrome for an Edge listing failure.
Publication still requires Microsoft certification.

https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/api/using-addons-api#using-the-api-endpoints
`);
console.log(`Prepared ${Object.keys(releaseLocales).length} localized Edge descriptions and logos in ${output}.`);

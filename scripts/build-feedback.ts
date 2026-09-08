import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { releaseLocales } from '../src/shared/i18n/release-copy';
import { SUPPORTED_LANGUAGES } from '../src/shared/constants';
mkdirSync('build/feedback', { recursive: true });
for (const file of ['Code.gs', 'Index.html', 'appsscript.json']) copyFileSync(`feedback/${file}`, `build/feedback/${file}`);
const names = Object.fromEntries(SUPPORTED_LANGUAGES.filter(item => item.code !== 'auto').map(item => [item.code, item.nativeName]));
writeFileSync('build/feedback/Translations.gs', `// Generated from shared release copy.\nconst SURVEY_COPY = ${JSON.stringify(releaseLocales)};\nconst LANGUAGE_NAMES = ${JSON.stringify(names)};\n`);
console.log('Built Apps Script survey in build/feedback.');

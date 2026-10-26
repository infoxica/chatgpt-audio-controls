import { writeFileSync } from 'node:fs';
import { releaseLocales } from '../src/shared/i18n/release-copy';
import { SUPPORTED_LANGUAGES } from '../src/shared/constants';
writeFileSync('feedback/worker/src/locales.generated.json', JSON.stringify(releaseLocales));
writeFileSync('feedback/worker/src/names.generated.json', JSON.stringify(Object.fromEntries(SUPPORTED_LANGUAGES.filter(x => x.code !== 'auto').map(x => [x.code, x.nativeName]))));

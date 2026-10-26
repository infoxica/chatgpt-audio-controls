import { validFeedbackURL } from '../src/shared/feedback';
import { checkVersions } from './check-versions';
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { acceptanceComplete } from './release-acceptance';

const root = resolve(__dirname, "..");
const services = JSON.parse(readFileSync(resolve(root, 'config/release.json'), 'utf8'));
const acceptance = JSON.parse(readFileSync(resolve(root, 'config/acceptance.json'), 'utf8'));
const releaseTag = process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME;
checkVersions();

if (!releaseTag) {
  console.log("Source versions match. No release tag supplied; publication acceptance check skipped.");
  process.exit(0);
}

if (!/^v\d+\.\d+\.\d+$/.test(releaseTag)) {
  throw new Error(`Release tag must use the vX.Y.Z format: ${releaseTag}`);
}

const expectedVersion = releaseTag.slice(1);
checkVersions(expectedVersion);
if (!validFeedbackURL(services.feedbackUrl || '')) throw new Error('A verified production feedback URL is required.');
if (!/^G-[A-Z0-9]+$/.test(services.websiteGa4Id || '')) throw new Error('Configure the real website GA4 measurement ID.');
if (!acceptanceComplete(acceptance, expectedVersion)) throw new Error('Required release acceptance checks remain open. See docs/RELEASE-1.3.0-STATUS.md.');
console.log(`Release metadata is consistent for ${releaseTag}.`);

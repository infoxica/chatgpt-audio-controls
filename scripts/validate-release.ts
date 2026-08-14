import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface PackageMetadata {
  version: string;
}

interface ManifestMetadata {
  version: string;
}

const root = resolve(__dirname, "..");
const packageJson = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
) as PackageMetadata;
const manifest = JSON.parse(
  readFileSync(resolve(root, "public/manifest.json"), "utf8"),
) as ManifestMetadata;
const userscript = readFileSync(
  resolve(root, "userscript/chatgpt-audio-controls.user.js"),
  "utf8",
);
const changelog = readFileSync(resolve(root, "CHANGELOG.md"), "utf8");
const releaseTag = process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME;

if (!releaseTag) {
  console.log("No release tag supplied; release version check skipped.");
  process.exit(0);
}

if (!/^v\d+\.\d+\.\d+$/.test(releaseTag)) {
  throw new Error(`Release tag must use the vX.Y.Z format: ${releaseTag}`);
}

const expectedVersion = releaseTag.slice(1);
const userScriptVersion = userscript.match(/@version\s+([^\s]+)/)?.[1];

const mismatches = [
  ["package.json", packageJson.version],
  ["public/manifest.json", manifest.version],
  ["userscript metadata", userScriptVersion],
].filter(([, version]) => version !== expectedVersion);

if (mismatches.length > 0) {
  const details = mismatches
    .map(([source, version]) => `${source}=${version || "missing"}`)
    .join(", ");
  throw new Error(`Release version mismatch for ${releaseTag}: ${details}`);
}

if (!changelog.includes(`## [${expectedVersion}]`)) {
  throw new Error(`CHANGELOG.md is missing a ${expectedVersion} release entry.`);
}

console.log(`Release metadata is consistent for ${releaseTag}.`);

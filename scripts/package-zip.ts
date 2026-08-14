import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const distDir = resolve(__dirname, "../dist");
const zipDir = resolve(__dirname, "../dist-zip");
const packageJson = JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf8")) as {
  version: string;
};

if (!existsSync(zipDir)) {
  mkdirSync(zipDir, { recursive: true });
}

const zipPath = resolve(zipDir, `chatgpt-audio-controls-v${packageJson.version}.zip`);

if (process.platform === "win32") {
  execSync(
    `powershell -Command "if (Test-Path '${zipPath}') { Remove-Item '${zipPath}' }; Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}'"`,
    { stdio: "inherit" }
  );
} else {
  execSync(`cd "${distDir}" && zip -r "${zipPath}" ./*`, { stdio: "inherit" });
}

console.log(`Extension package zip created at: ${zipPath}`);

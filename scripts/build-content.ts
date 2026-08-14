import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

declare const Bun: any;

async function buildContentScript() {
  const outDir = resolve(__dirname, "../dist/content");
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  // Compile TypeScript content script with Bun
  const result = await Bun.build({
    entrypoints: [resolve(__dirname, "../src/content/content.ts")],
    outdir: outDir,
    target: "browser",
    naming: "content.js",
    minify: false,
  });

  if (!result.success) {
    console.error("Content script build failed:", result.logs);
    process.exit(1);
  }

  const bridgeResult = await Bun.build({
    entrypoints: [resolve(__dirname, "../src/content/settings-bridge.ts")],
    outdir: outDir,
    target: "browser",
    naming: "settings-bridge.js",
    minify: false,
  });

  if (!bridgeResult.success) {
    console.error("Settings bridge build failed:", bridgeResult.logs);
    process.exit(1);
  }

  // Copy player.css
  copyFileSync(
    resolve(__dirname, "../src/content/player.css"),
    resolve(outDir, "player.css")
  );

  console.log("Content script and styles compiled successfully to dist/content/");
}

buildContentScript().catch(console.error);

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const userscriptPath = resolve(__dirname, "../userscript/chatgpt-audio-controls.user.js");
const rootScriptPath = resolve(__dirname, "../script.js");

if (existsSync(userscriptPath)) {
  copyFileSync(userscriptPath, rootScriptPath);
  console.log("Synchronized userscript to root script.js successfully.");
}

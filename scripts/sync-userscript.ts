import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

const userscriptPath = resolve(__dirname, "../userscript/chatgpt-audio-controls.user.js");

if (!existsSync(userscriptPath)) {
  throw new Error("Userscript is missing: userscript/chatgpt-audio-controls.user.js");
}

const size = statSync(userscriptPath).size;
console.log(`Userscript ready at: userscript/chatgpt-audio-controls.user.js (${size} bytes)`);

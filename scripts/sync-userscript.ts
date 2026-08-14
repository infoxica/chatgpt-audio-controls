import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

const userscriptPath = resolve(__dirname, "../userscript/chatgpt-audio-controls.user.js");

if (existsSync(userscriptPath)) {
  const size = statSync(userscriptPath).size;
  console.log(`Userscript ready at: userscript/chatgpt-audio-controls.user.js (${size} bytes)`);
}

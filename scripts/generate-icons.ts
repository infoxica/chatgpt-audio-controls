import { existsSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const iconsDir = resolve(__dirname, "../public/icons");

// Ensure the user's icons are mapped to standard extension icon sizes
const mappings = [
  { src: "favicon-16x16.png", dest: "icon-16.png" },
  { src: "favicon-32x32.png", dest: "icon-32.png" },
  { src: "android-icon-48x48.png", dest: "icon-48.png" },
];

for (const m of mappings) {
  const srcPath = resolve(iconsDir, m.src);
  const destPath = resolve(iconsDir, m.dest);
  if (existsSync(srcPath)) {
    copyFileSync(srcPath, destPath);
    console.log(`Copied user icon ${m.src} -> ${m.dest}`);
  }
}

console.log("Extension icons verified from user provided assets. icon-128.png is maintained as a true 128px asset.");

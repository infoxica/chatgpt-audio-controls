import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const iconsDir = resolve(__dirname, "../public/icons");

// Ensure the user's icons are mapped to standard extension icon sizes
const mappings = [
  { src: "favicon-16x16.png", dest: "icon-16.png", size: 16 },
  { src: "favicon-32x32.png", dest: "icon-32.png", size: 32 },
  { src: "android-icon-48x48.png", dest: "icon-48.png", size: 48 },
];

function getPngDimensions(filePath: string): { width: number; height: number } {
  const file = readFileSync(filePath);
  const signature = "89504e470d0a1a0a";
  if (file.length < 24 || file.subarray(0, 8).toString("hex") !== signature) {
    throw new Error(`Expected a PNG file: ${filePath}`);
  }

  return {
    width: file.readUInt32BE(16),
    height: file.readUInt32BE(20),
  };
}

function verifyIcon(filePath: string, expectedSize: number): void {
  if (!existsSync(filePath)) {
    throw new Error(`Required icon is missing: ${filePath}`);
  }

  const { width, height } = getPngDimensions(filePath);
  if (width !== expectedSize || height !== expectedSize) {
    throw new Error(`Expected ${expectedSize}x${expectedSize} icon at ${filePath}, got ${width}x${height}.`);
  }
}

for (const m of mappings) {
  const srcPath = resolve(iconsDir, m.src);
  const destPath = resolve(iconsDir, m.dest);
  verifyIcon(srcPath, m.size);
  copyFileSync(srcPath, destPath);
  verifyIcon(destPath, m.size);
  console.log(`Copied user icon ${m.src} -> ${m.dest}`);
}

verifyIcon(resolve(iconsDir, "icon-128.png"), 128);
console.log("Extension icons verified from user provided assets.");

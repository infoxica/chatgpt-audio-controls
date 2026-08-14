import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function createCRC32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  const crcTarget = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(crcTarget), 8 + len);
  return chunk;
}

function encodeRGBAtoPNG(width: number, height: number, rgba: Uint8Array): Buffer {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  const ihdr = writeChunk("IHDR", ihdrData);

  // Scanlines with filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const rawOffset = y * (stride + 1);
    raw[rawOffset] = 0; // Filter: None
    const rgbaOffset = y * stride;
    Buffer.from(rgba.buffer, rgba.byteOffset + rgbaOffset, stride).copy(raw, rawOffset + 1);
  }

  const idat = writeChunk("IDAT", deflateSync(raw));
  const iend = writeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([header, ihdr, idat, iend]);
}

function renderChatGPTPlayIconRGBA(size: number): Uint8Array {
  const pixels = new Uint8Array(size * size * 4);

  const setPixel = (x: number, y: number, r: number, g: number, b: number, a: number) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (Math.floor(y) * size + Math.floor(x)) * 4;
    const srcA = a / 255;
    const dstA = pixels[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA > 0) {
      pixels[idx] = Math.round((r * srcA + pixels[idx] * dstA * (1 - srcA)) / outA);
      pixels[idx + 1] = Math.round((g * srcA + pixels[idx + 1] * dstA * (1 - srcA)) / outA);
      pixels[idx + 2] = Math.round((b * srcA + pixels[idx + 2] * dstA * (1 - srcA)) / outA);
      pixels[idx + 3] = Math.round(outA * 255);
    }
  };

  const scale = size / 128;
  const radius = 28 * scale;
  const cx = size / 2;
  const cy = size / 2;

  // Background box with ChatGPT dark theme
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.max(radius - x, 0, x - (size - 1 - radius));
      const dy = Math.max(radius - y, 0, y - (size - 1 - radius));
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Deep obsidian background
        setPixel(x, y, 28, 28, 30, 255);

        // Border highlight
        if (x === 0 || y === 0 || x === size - 1 || y === size - 1 || dist >= radius - 1.2) {
          setPixel(x, y, 255, 255, 255, 28);
        }
      }
    }
  }

  // Draw 6-Petal Rosette lines
  const numPetals = 6;
  for (let i = 0; i < numPetals; i++) {
    const angle = (i * Math.PI * 2) / numPetals;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Draw spiral loop arc
    for (let t = 0; t <= 1; t += 0.01) {
      // Local coordinate along a petal
      const lx = (18 * (1 - t) + 12 * Math.cos(t * Math.PI * 1.2)) * scale;
      const ly = (-34 * (1 - t) + 16 * Math.sin(t * Math.PI * 1.2)) * scale;

      const px = cx + (lx * cos - ly * sin);
      const py = cy + (lx * sin + ly * cos);

      const strokeW = Math.max(1, 2.5 * scale);
      for (let sx = -strokeW; sx <= strokeW; sx += 0.5) {
        for (let sy = -strokeW; sy <= strokeW; sy += 0.5) {
          if (sx * sx + sy * sy <= strokeW * strokeW) {
            setPixel(px + sx, py + sy, 240, 240, 240, 240);
          }
        }
      }
    }
  }

  // Center Circle
  const centerRadius = 16 * scale;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      if (d <= centerRadius) {
        // Emerald center
        setPixel(x, y, 16, 163, 127, 255);

        // Center circle border
        if (d >= centerRadius - (1.5 * scale)) {
          setPixel(x, y, 255, 255, 255, 255);
        }
      }
    }
  }

  // Center Play Triangle
  const triScale = 6 * scale;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tx = (x - cx) / triScale;
      const ty = (y - cy) / triScale;

      // Triangle formula: pointing right
      if (tx >= -0.6 && tx <= 1.2 && Math.abs(ty) <= (1.2 - tx) * 0.7) {
        setPixel(x, y, 255, 255, 255, 255);
      }
    }
  }

  return pixels;
}

const targetDir = resolve(__dirname, "../public/icons");
if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true });
}

const sizes = [16, 32, 48, 128];
for (const size of sizes) {
  const rgba = renderChatGPTPlayIconRGBA(size);
  const pngBuf = encodeRGBAtoPNG(size, size, rgba);
  const outPath = resolve(targetDir, `icon-${size}.png`);
  writeFileSync(outPath, pngBuf);
  console.log(`Generated icon: ${outPath} (${size}x${size}, ${pngBuf.length} bytes)`);
}

console.log("All extension icons updated successfully.");

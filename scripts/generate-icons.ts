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

function renderIconRGBA(size: number): Uint8Array {
  const pixels = new Uint8Array(size * size * 4);

  const setPixel = (x: number, y: number, r: number, g: number, b: number, a: number) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (Math.floor(y) * size + Math.floor(x)) * 4;
    // Alpha blending
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
  const radius = 26 * scale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Rounded box check
      const dx = Math.max(radius - x, 0, x - (size - 1 - radius));
      const dy = Math.max(radius - y, 0, y - (size - 1 - radius));
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Dark metallic gradient background
        const t = (x + y) / (size * 2);
        const r = Math.round(20 + t * 5);
        const g = Math.round(24 + t * 10);
        const b = Math.round(30 + t * 15);
        setPixel(x, y, r, g, b, 255);

        // Border highlight
        if (x === 0 || y === 0 || x === size - 1 || y === size - 1 || dist >= radius - 1.5) {
          setPixel(x, y, 255, 255, 255, 30);
        }
      }
    }
  }

  // Draw Speaker and Waves
  const cx = size * 0.44;
  const cy = size * 0.46;

  // Speaker shape
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x - cx) / scale;
      const ny = (y - cy) / scale;

      // Speaker body
      const inCone = nx >= -20 && nx <= 0 && Math.abs(ny) <= (nx >= -10 ? (nx + 10) * 1.5 + 8 : 8);
      if (inCone) {
        setPixel(x, y, 16, 163, 127, 255); // OpenAI Emerald
      }

      // Sound waves arcs
      const waveDist = Math.sqrt(nx * nx + ny * ny);
      const angle = Math.atan2(ny, nx);

      if (angle >= -Math.PI / 3 && angle <= Math.PI / 3 && nx > 4) {
        // Wave 1
        if (Math.abs(waveDist - 12) < 2) {
          setPixel(x, y, 20, 184, 166, 240);
        }
        // Wave 2
        if (Math.abs(waveDist - 22) < 2.5) {
          setPixel(x, y, 56, 189, 248, 220); // Sky accent
        }
        // Wave 3
        if (Math.abs(waveDist - 32) < 3) {
          setPixel(x, y, 16, 163, 127, 200);
        }
      }
    }
  }

  // Lower-right Play Badge
  const bx = size * 0.72;
  const by = size * 0.72;
  const br = 16 * scale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.sqrt((x - bx) * (x - bx) + (y - by) * (y - by));
      if (d <= br) {
        // Emerald circle
        setPixel(x, y, 16, 163, 127, 255);
        // Play triangle inside
        const tx = (x - bx) / scale;
        const ty = (y - by) / scale;
        if (tx >= -4 && tx <= 6 && Math.abs(ty) <= (6 - tx) * 0.8) {
          setPixel(x, y, 255, 255, 255, 255);
        }
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
  const rgba = renderIconRGBA(size);
  const pngBuf = encodeRGBAtoPNG(size, size, rgba);
  const outPath = resolve(targetDir, `icon-${size}.png`);
  writeFileSync(outPath, pngBuf);
  console.log(`Generated icon: ${outPath} (${size}x${size}, ${pngBuf.length} bytes)`);
}

console.log("All extension icons generated successfully.");

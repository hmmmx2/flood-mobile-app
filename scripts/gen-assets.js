/**
 * Generates the four PNG assets required by Expo for a successful build.
 *
 * Required files (referenced in app.config.js):
 *   assets/images/icon.png          – 1024×1024  App icon (App Store / Play Store)
 *   assets/images/adaptive-icon.png – 1024×1024  Android adaptive icon foreground
 *   assets/images/splash-icon.png   –  480×480   Splash screen logo
 *   assets/images/favicon.png       –   48×48    Web favicon
 *
 * Runs with Node.js built-ins only (no extra packages needed).
 * Usage: node scripts/gen-assets.js
 */

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── Palette ───────────────────────────────────────────────────────────────────
const BRAND   = [230, 81,  0];   // #E65100  orange
const WHITE   = [255, 255, 255];
const DARK    = [ 22,  33,  62]; // #16213E  dark navy

// ── CRC-32 table (used by PNG chunk checksums) ─────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
  return ((crc ^ 0xFFFFFFFF) >>> 0);
}

function chunk(type, data) {
  const typeB = Buffer.from(type, 'ascii');
  const len   = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeB, data]);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, typeB, data, crcB]);
}

/**
 * Draws a simple FloodWatch "FW" logo onto a pixel buffer.
 * @param {Uint8Array} pixels  – RGBA flat array (width * height * 4)
 * @param {number} W           – canvas width
 * @param {number} H           – canvas height
 */
function drawLogo(pixels, W, H) {
  const cx = W / 2, cy = H / 2;
  const r  = W * 0.38;

  // Background circle (white with slight shadow illusion)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) {
        const i = (y * W + x) * 4;
        pixels[i] = 255; pixels[i+1] = 255; pixels[i+2] = 255; pixels[i+3] = 255;
      }
    }
  }

  // Wave arc (brand orange stroke, simulated by a thick arc band)
  const waveR = r * 0.62, strokeW = W * 0.055;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx); // -π..π
      // Draw lower half-arc (flood water wave metaphor)
      if (dist >= waveR - strokeW && dist <= waveR + strokeW && angle > 0.1 && angle < Math.PI - 0.1) {
        const i = (y * W + x) * 4;
        pixels[i] = BRAND[0]; pixels[i+1] = BRAND[1]; pixels[i+2] = BRAND[2]; pixels[i+3] = 255;
      }
    }
  }

  // Teardrop / droplet shape (flood-watch symbol) — filled brand orange
  const dropCY = cy - r * 0.15, dropR = r * 0.22;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - dropCY;
      // Upper circle of droplet
      if (dx * dx + dy * dy <= dropR * dropR) {
        const i = (y * W + x) * 4;
        pixels[i] = BRAND[0]; pixels[i+1] = BRAND[1]; pixels[i+2] = BRAND[2]; pixels[i+3] = 255;
      }
      // Lower triangle of droplet
      const tip = dropCY + dropR * 2.0;
      if (y >= dropCY && y <= tip) {
        const halfW = dropR * (1 - (y - dropCY) / (tip - dropCY));
        if (Math.abs(x - cx) <= halfW) {
          const i = (y * W + x) * 4;
          pixels[i] = BRAND[0]; pixels[i+1] = BRAND[1]; pixels[i+2] = BRAND[2]; pixels[i+3] = 255;
        }
      }
    }
  }
}

/**
 * Creates a PNG buffer from an RGBA pixel array.
 */
function makePNG(width, height, fillRGBA, logoFn) {
  // Build RGBA pixel buffer
  const pixels = new Uint8Array(width * height * 4);

  // Fill background
  for (let i = 0; i < width * height; i++) {
    pixels[i*4]   = fillRGBA[0];
    pixels[i*4+1] = fillRGBA[1];
    pixels[i*4+2] = fillRGBA[2];
    pixels[i*4+3] = fillRGBA[3] ?? 255;
  }

  if (logoFn) logoFn(pixels, width, height);

  // Convert RGBA to raw PNG scanlines (filter byte 0 = None per row)
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = y * (width * 4 + 1) + 1 + x * 4;
      raw[dst]   = pixels[src];
      raw[dst+1] = pixels[src+1];
      raw[dst+2] = pixels[src+2];
      raw[dst+3] = pixels[src+3];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });

  // IHDR: width, height, 8-bit, RGBA (colour type 6), no interlace
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 6; // colour type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Generate all assets ───────────────────────────────────────────────────────
const OUT = path.join(__dirname, '..', 'assets', 'images');
fs.mkdirSync(OUT, { recursive: true });

const assets = [
  { file: 'icon.png',          w: 1024, h: 1024, bg: [...BRAND, 255], logo: true },
  { file: 'adaptive-icon.png', w: 1024, h: 1024, bg: [...BRAND, 255], logo: true },
  { file: 'splash-icon.png',   w:  480, h:  480, bg: [...BRAND, 255], logo: true },
  { file: 'favicon.png',       w:   48, h:   48, bg: [...BRAND, 255], logo: false },
];

for (const { file, w, h, bg, logo } of assets) {
  const buf = makePNG(w, h, bg, logo ? drawLogo : null);
  const dest = path.join(OUT, file);
  fs.writeFileSync(dest, buf);
  console.log(`✓  ${file}  (${w}×${h})  ${(buf.length / 1024).toFixed(1)} KB  →  ${dest}`);
}

console.log('\nAll assets generated. You can replace these with real branding before UAT.\n');

/**
 * 生成 PWA 应用图标 —— 零依赖（node:zlib 手写 PNG 编码 + 有向距离场绘图）
 *
 * 用法： node scripts/gen_icons.mjs
 * 输出： public/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon-180,favicon-32}.png
 *
 * 说明：
 *  - 禁止引入 npm 依赖（项目硬约束），故不用 sharp / canvas，自行实现 PNG(zlib+CRC32) 编码。
 *  - maskable 图标必须背景满幅（无圆角、无透明），图形收缩到中心 80% 安全区内。
 *  - apple-touch-icon 必须是全幅方形（iOS 自行加圆角，透明区域会被填黑）。
 */
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'icons');

/* ============================ PNG 编码 ============================ */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** rgba: Buffer，长度 w*h*4（逐行 RGBA，非预乘） */
function encodePng(w, h, rgba) {
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0; // filter type 0 (None)
    rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ============================ SDF 图元 ============================ */
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** 圆角矩形（hw/hh 为半宽半高，r 为圆角半径），返回有向距离，负值在形内 */
function sdRoundBox(px, py, cx, cy, hw, hh, r = 0) {
  const dx = Math.abs(px - cx) - (hw - r);
  const dy = Math.abs(py - cy) - (hh - r);
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
}

/** 圆环（半径 r，线宽 t） */
function sdRing(px, py, cx, cy, r, t) {
  return Math.abs(Math.hypot(px - cx, py - cy) - r) - t / 2;
}

/**
 * 麦克风图形（单位坐标系 0..1）
 * 组成：拾音头胶囊 + U 形托架 + 支杆 + 底座
 */
function sdMic(px, py) {
  let d = sdRoundBox(px, py, 0.5, 0.37, 0.088, 0.155, 0.088); // 拾音头
  d = Math.min(d, Math.max(sdRing(px, py, 0.5, 0.525, 0.168, 0.058), 0.525 - py)); // U 形托架（只取下半）
  d = Math.min(d, sdRoundBox(px, py, 0.5, 0.755, 0.030, 0.075)); // 支杆
  d = Math.min(d, sdRoundBox(px, py, 0.5, 0.850, 0.118, 0.024, 0.024)); // 底座
  return d;
}

/** 图形视觉重心在 y=0.5445，上移补偿使其在画布中居中 */
const GLYPH_SHIFT_Y = 0.5445 - 0.5;

/* ============================ 绘制 ============================ */
const GRAD_TOP = [0x6e, 0xa8, 0xff]; // 左上高光蓝（品牌色 --brand 提亮）
const GRAD_BOT = [0x1d, 0x4e, 0xd8]; // 右下品牌蓝 --brand-2
const WHITE = [0xff, 0xff, 0xff];

/**
 * @param {number} size    画布边长
 * @param {object} opt     { rounded:boolean, glyph:number }
 */
function paint(size, { rounded, glyph: glyphScale }) {
  const buf = Buffer.alloc(size * size * 4);
  const aa = 1.5 / size;
  const corner = rounded ? 0.5 * 0.22 : 0;
  const inverse = (p) => (p - 0.5) / glyphScale + 0.5;

  for (let y = 0; y < size; y++) {
    const py = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) / size;

      // 背景外形（maskable 时为满幅正方形，恒在形内）
      const sdBg = sdRoundBox(px, py, 0.5, 0.5, 0.5, 0.5, corner);
      const aBg = clamp01(0.5 - sdBg / aa);

      // 对角渐变 + 左上角柔和高光
      const t = clamp01((px + py) / 2);
      const hl = Math.pow(clamp01(1 - Math.hypot(px - 0.3, py - 0.24) / 0.62), 2) * 0.18;
      let r = GRAD_TOP[0] * (1 - t) + GRAD_BOT[0] * t;
      let g = GRAD_TOP[1] * (1 - t) + GRAD_BOT[1] * t;
      let b = GRAD_TOP[2] * (1 - t) + GRAD_BOT[2] * t;
      r += (255 - r) * hl;
      g += (255 - g) * hl;
      b += (255 - b) * hl;

      // 麦克风图形叠色
      const sd = sdMic(inverse(px), inverse(py) + GLYPH_SHIFT_Y) * glyphScale;
      const aGlyph = clamp01(0.5 - sd / (aa * 1.6));
      r += (255 - r) * aGlyph;
      g += (255 - g) * aGlyph;
      b += (255 - b) * aGlyph;

      const i = (y * size + x) * 4;
      buf[i] = Math.round(r);
      buf[i + 1] = Math.round(g);
      buf[i + 2] = Math.round(b);
      buf[i + 3] = Math.round(255 * aBg);
    }
  }
  return encodePng(size, size, buf);
}

/* ============================ 输出 ============================ */
const TARGETS = [
  { file: 'icon-192.png', size: 192, rounded: true, glyph: 0.72 },
  { file: 'icon-512.png', size: 512, rounded: true, glyph: 0.72 },
  { file: 'icon-maskable-512.png', size: 512, rounded: false, glyph: 0.6 },
  { file: 'apple-touch-icon-180.png', size: 180, rounded: false, glyph: 0.72 },
  { file: 'favicon-32.png', size: 32, rounded: true, glyph: 0.76 },
];

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const t of TARGETS) {
  const png = paint(t.size, t);
  fs.writeFileSync(path.join(OUT_DIR, t.file), png);
  console.log(`✓ ${t.file}  ${t.size}×${t.size}  ${(png.length / 1024).toFixed(1)} KB`);
}
console.log(`\n图标已生成到 ${OUT_DIR}`);

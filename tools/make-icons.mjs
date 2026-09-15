/* ============================================================
 * 生成 PWA 图标：node tools/make-icons.mjs
 * ------------------------------------------------------------
 * 不装任何图形库——自己写了个最小 PNG 编码器（zlib 是 Node 内置的），
 * 4x 超采样做抗锯齿。星形用的是页面标记那套语言，保持视觉一致。
 * ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const OUT = 'assets/icons';

const BG = [191, 74, 48];     // #bf4a30 朱红
const FG = [255, 253, 248];   // #fffdf8 米白

/* ---------- 最小 PNG 编码器 ---------- */

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;                       // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // 8 bit
  ihdr[9] = 6;   // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------- 几何 ---------- */

// 五角星顶点，从正上方开始外/内交替（标准五角星内径比 0.382，这里用 0.42 略饱满）
function starPoints(cx, cy, R, ratio = 0.42) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? R : R * ratio;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function inPolygon(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inRoundRect(x0, y0, x1, y1, r, px, py) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  const qx = px < x0 + r ? x0 + r : px > x1 - r ? x1 - r : px;
  const qy = py < y0 + r ? y0 + r : py > y1 - r ? y1 - r : py;
  return (px - qx) ** 2 + (py - qy) ** 2 <= r * r;
}

/* ---------- 渲染 ---------- */

/**
 * @param {number} size    边长
 * @param {number} radius  圆角半径占边长的比例；0 = 满幅（给 maskable / iOS 用）
 * @param {number} scale   星形外接圆半径占边长的比例
 */
function renderIcon(size, radius, scale) {
  const SS = 4;                       // 超采样倍数
  const N = size * SS;
  const acc = new Float64Array(size * size * 4);

  // 星形整体比外接框中心略偏上，往下挪一点让它视觉居中
  const R = size * scale;
  const cx = size / 2;
  const cy = size / 2 + 0.0955 * R;
  const star = starPoints(cx, cy, R);
  const r = radius * size;

  for (let py = 0; py < N; py++) {
    const y = (py + 0.5) / SS;
    for (let px = 0; px < N; px++) {
      const x = (px + 0.5) / SS;
      let cr = 0, cg = 0, cb = 0, ca = 0;
      if (radius > 0 ? inRoundRect(0, 0, size, size, r, x, y) : true) {
        cr = BG[0]; cg = BG[1]; cb = BG[2]; ca = 255;
      }
      if (inPolygon(star, x, y)) {
        cr = FG[0]; cg = FG[1]; cb = FG[2]; ca = 255;
      }
      const i = ((py / SS | 0) * size + (px / SS | 0)) * 4;
      acc[i] += cr; acc[i + 1] += cg; acc[i + 2] += cb; acc[i + 3] += ca;
    }
  }

  const n = SS * SS;
  const out = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const a = acc[i * 4 + 3] / n;
    out[i * 4 + 3] = Math.round(a);
    if (a > 0) {
      // 累加的是预乘值，输出 PNG 要还原成直通 alpha
      const k = 255 / a;
      out[i * 4] = Math.min(255, Math.round((acc[i * 4] / n) * k));
      out[i * 4 + 1] = Math.min(255, Math.round((acc[i * 4 + 1] / n) * k));
      out[i * 4 + 2] = Math.min(255, Math.round((acc[i * 4 + 2] / n) * k));
    }
  }
  return encodePng(size, out);
}

function faviconSvg(size = 64) {
  const R = size * 0.38;
  const cy = size / 2 + 0.0955 * R;
  const d = starPoints(size / 2, cy, R)
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('') + 'Z';
  const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">`
    + `<rect width="${size}" height="${size}" rx="${(size * 0.22).toFixed(1)}" fill="${hex(BG)}"/>`
    + `<path d="${d}" fill="${hex(FG)}"/></svg>\n`;
}

/* ---------- 输出 ---------- */

fs.mkdirSync(OUT, { recursive: true });

const jobs = [
  ['icon-192.png', 192, 0.22, 0.38],
  ['icon-512.png', 512, 0.22, 0.38],
  ['maskable-512.png', 512, 0, 0.30],   // 满幅 + 收进安全区，交给系统裁
  ['apple-touch-icon.png', 180, 0, 0.36] // iOS 自己会切圆角，不要留透明边
];

for (const [name, size, radius, scale] of jobs) {
  const buf = renderIcon(size, radius, scale);
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`${name.padEnd(24)} ${size}x${size}  ${(buf.length / 1024).toFixed(1)} KB`);
}

fs.writeFileSync(path.join(OUT, 'favicon.svg'), faviconSvg());
console.log('favicon.svg'.padEnd(24) + 'vector');

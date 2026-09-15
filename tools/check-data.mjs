/* 数据自检：node tools/check-data.mjs
 *
 * 站点范围是「广州市区」，所以这里不卡半径，只做两件事：
 *   - 坐标落在广州行政边界之外 = 错误（几乎一定是 lat/lng 写反或打错）
 *   - 离花城广场太远 = 警告（不是错，但值得回头确认一眼）
 * 往 data/places.js 里加完地点后跑一下，比在浏览器里肉眼找错快。
 */
import fs from 'node:fs';
import vm from 'node:vm';

const CENTER = { lat: 23.1176, lng: 113.3232 };   // 花城广场，只用于报距离
// 广州市的大致行政范围（含从化、增城、南沙）
const BOUNDS = { latMin: 22.50, latMax: 24.00, lngMin: 112.90, lngMax: 114.10 };
const FAR_KM = 40;                                 // 超过这个距离基本是填错了

const CATS = ['看', '吃', '喝', '逛', '公园', '交通'];
const DAYS = ['Day1', 'Day2', 'Day3', 'Day4'];
const SIZE_MIN = 16, SIZE_MAX = 72;

// 形状清单直接从 assets/app.js 的 SHAPES 里读，避免两边各写一份然后走偏
const SHAPES = (() => {
  const src = fs.readFileSync('assets/app.js', 'utf8');
  const block = src.match(/var\s+SHAPES\s*=\s*\{([\s\S]*?)\n\s{2}\};/);
  if (!block) return null;
  return [...block[1].matchAll(/^\s{4}([A-Za-z]\w*):\s*\{/gm)].map((m) => m[1]);
})();

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('data/places.js', 'utf8'), ctx);

const places = ctx.window.PLACES || [];
const daySeed = ctx.window.PLACE_DAY_SEED || {};

const errors = [];
const warnings = [];
const seen = new Map();
let localPhotos = 0;      // 指向仓库内文件的图片张数

function distKm(a, b) {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

places.forEach((p, i) => {
  const at = `#${i} ${p.id || '(无 id)'}`;
  if (!p.id) errors.push(`${at}: 缺 id`);
  else if (seen.has(p.id)) errors.push(`${at}: id 重复（与 ${seen.get(p.id)} 冲突）`);
  else seen.set(p.id, p.name);

  if (!p.name) errors.push(`${at}: 缺 name`);
  if (!CATS.includes(p.cat)) errors.push(`${at}: cat "${p.cat}" 不在 ${CATS.join('/')} 里`);
  if (!Array.isArray(p.tags)) errors.push(`${at}: tags 必须是数组`);

  if (typeof p.lat !== 'number' || typeof p.lng !== 'number') {
    errors.push(`${at}: lat/lng 必须是数字`);
  } else if (p.lat < BOUNDS.latMin || p.lat > BOUNDS.latMax
          || p.lng < BOUNDS.lngMin || p.lng > BOUNDS.lngMax) {
    errors.push(`${at}: 坐标 ${p.lat},${p.lng} 落在广州行政范围之外，检查是否写反了 lat/lng`);
  } else {
    const d = distKm(CENTER, p);
    if (d > FAR_KM) warnings.push(`${at}: 距花城广场 ${d.toFixed(1)} km，远得不太寻常，确认一下坐标`);
  }

  if (p.v !== 0 && p.v !== 1) warnings.push(`${at}: v 建议为 0 或 1，当前 ${p.v}`);
  if (p.stay != null && (typeof p.stay !== 'number' || p.stay < 0)) errors.push(`${at}: stay 非法`);
  if (p.price != null && (typeof p.price !== 'number' || p.price < 0)) errors.push(`${at}: price 非法`);

  // style 是可选的，但写错了会静默退回默认值，所以要拦一下
  if (p.style != null) {
    if (typeof p.style !== 'object' || Array.isArray(p.style)) {
      errors.push(`${at}: style 必须是对象，例如 { shape: 'pin', color: '#e0664a', size: 44 }`);
    } else {
      const s = p.style;
      for (const k of Object.keys(s)) {
        if (!['shape', 'color', 'size'].includes(k)) {
          warnings.push(`${at}: style.${k} 不是已知的外观字段，会被忽略`);
        }
      }
      if (s.shape != null && !(SHAPES || []).includes(s.shape)) {
        errors.push(`${at}: style.shape "${s.shape}" 不合法（可选：${(SHAPES || ['?']).join(' / ')}）`);
      }
      if (s.color != null && !/^#[0-9a-f]{6}$/i.test(s.color)) {
        errors.push(`${at}: style.color "${s.color}" 不是 #rrggbb 格式`);
      }
      if (s.size != null && (typeof s.size !== 'number' || s.size < SIZE_MIN || s.size > SIZE_MAX)) {
        errors.push(`${at}: style.size 必须是 ${SIZE_MIN}–${SIZE_MAX} 的数字，当前 ${s.size}`);
      }
    }
  }
});

if (!SHAPES) warnings.push('没能从 assets/app.js 解析出 SHAPES，style.shape 的校验已跳过');

// 图片：指向不存在的文件是最容易漏的一种坏法——页面不会报错，只是图空白
const IMG_EXT = /\.(jpe?g|png|webp|gif|avif|svg)$/i;
places.forEach((p, i) => {
  if (p.photos == null) return;
  const at = `#${i} ${p.id || '(无 id)'}`;
  if (!Array.isArray(p.photos)) {
    errors.push(`${at}: photos 必须是字符串数组`);
    return;
  }
  p.photos.forEach((src, k) => {
    if (typeof src !== 'string' || !src.trim()) {
      errors.push(`${at}: photos[${k}] 必须是非空字符串`);
      return;
    }
    if (/^data:/i.test(src)) {
      localPhotos++;
      warnings.push(`${at}: photos[${k}] 是编辑时从本机选的图（base64），导出会很大，且换设备就没了`);
    } else if (!/^https?:\/\//i.test(src)) {
      if (!IMG_EXT.test(src)) errors.push(`${at}: photos[${k}] 路径不像图片：${src}`);
      else if (!fs.existsSync(src)) errors.push(`${at}: photos[${k}] 指向的文件不存在：${src}`);
      else localPhotos++;
    }
  });
});

Object.keys(daySeed).forEach((id) => {
  if (!seen.has(id)) errors.push(`PLACE_DAY_SEED 引用了不存在的 id: ${id}`);
  else if (!DAYS.includes(daySeed[id])) errors.push(`PLACE_DAY_SEED["${id}"] 的 "${daySeed[id]}" 不是合法行程名`);
});

const by = (fn) => places.reduce((m, p) => (m[fn(p)] = (m[fn(p)] || 0) + 1, m), {});
const dist = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${k || '(未分组)'} ${v}`).join(' · ');

const lats = places.map((p) => p.lat), lngs = places.map((p) => p.lng);
const spanKm = places.length > 1
  ? distKm({ lat: Math.min(...lats), lng: Math.min(...lngs) },
           { lat: Math.max(...lats), lng: Math.max(...lngs) })
  : 0;

console.log(`地点总数 ${places.length}`);
console.log(`分类分布 ${dist(by((p) => p.cat))}`);
console.log(`分组分布 ${dist(by((p) => (daySeed[p.id] || '')))}`);
console.log(`待校准坐标 ${places.filter((p) => p.v !== 1).length} / ${places.length}`);
const styled = places.filter((p) => p.style && Object.keys(p.style).length);
console.log(`自定义外观 ${styled.length} / ${places.length}`
  + (styled.length ? `（${styled.map((p) => p.name).join('、')}）` : '')
  + (SHAPES ? `   可选形状：${SHAPES.join(' / ')}` : ''));
const withPhotos = places.filter((p) => Array.isArray(p.photos) && p.photos.length);
const totalPhotos = withPhotos.reduce((n, p) => n + p.photos.length, 0);
console.log(`带图片的地点 ${withPhotos.length} / ${places.length}，共 ${totalPhotos} 张`
  + `（仓库内文件 ${localPhotos} 张）`);
console.log(`分布跨度 lat ${Math.min(...lats).toFixed(4)}–${Math.max(...lats).toFixed(4)}`
  + `, lng ${Math.min(...lngs).toFixed(4)}–${Math.max(...lngs).toFixed(4)}`
  + `（对角约 ${spanKm.toFixed(1)} km）`);
const farthest = places.slice().sort((a, b) => distKm(CENTER, b) - distKm(CENTER, a))[0];
if (farthest) console.log(`离花城广场最远 ${farthest.name} ${distKm(CENTER, farthest).toFixed(1)} km`);

if (warnings.length) console.log('\n警告:\n' + warnings.map((w) => '  ! ' + w).join('\n'));
if (errors.length) {
  console.log('\n错误:\n' + errors.map((e) => '  x ' + e).join('\n'));
  process.exit(1);
}
console.log('\n校验通过。');

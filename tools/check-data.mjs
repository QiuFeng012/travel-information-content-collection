/* 数据自检：node tools/check-data.mjs
 * 校验 data/places.js 的字段、坐标范围、分组是否合法。
 * 往 data/places.js 里加完地点后跑一下，比在浏览器里肉眼找错快。
 */
import fs from 'node:fs';
import vm from 'node:vm';

const CENTER = { lat: 23.1176, lng: 113.3232 };   // 花城广场
const RADIUS_KM = 3;
const CATS = ['看', '吃', '喝', '逛', '公园', '交通'];
const DAYS = ['Day1', 'Day2', 'Day3', 'Day4'];

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('data/places.js', 'utf8'), ctx);

const places = ctx.window.PLACES || [];
const daySeed = ctx.window.PLACE_DAY_SEED || {};

const errors = [];
const warnings = [];
const seen = new Map();

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
  } else {
    const d = distKm(CENTER, p);
    if (d > RADIUS_KM) warnings.push(`${at}: 距花城广场 ${d.toFixed(2)} km，已超出 ${RADIUS_KM} km 范围`);
    if (p.lat < 22 || p.lat > 24 || p.lng < 112 || p.lng > 115) {
      errors.push(`${at}: 坐标 ${p.lat},${p.lng} 明显不在广州，检查是否写反了 lat/lng`);
    }
  }

  if (p.v !== 0 && p.v !== 1) warnings.push(`${at}: v 建议为 0 或 1，当前 ${p.v}`);
  if (p.stay != null && (typeof p.stay !== 'number' || p.stay < 0)) errors.push(`${at}: stay 非法`);
  if (p.price != null && (typeof p.price !== 'number' || p.price < 0)) errors.push(`${at}: price 非法`);
});

Object.keys(daySeed).forEach((id) => {
  if (!seen.has(id)) errors.push(`PLACE_DAY_SEED 引用了不存在的 id: ${id}`);
  else if (!DAYS.includes(daySeed[id])) errors.push(`PLACE_DAY_SEED["${id}"] 的 "${daySeed[id]}" 不是合法行程名`);
});

const by = (fn) => places.reduce((m, p) => (m[fn(p)] = (m[fn(p)] || 0) + 1, m), {});
const dist = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${k || '(未分组)'} ${v}`).join(' · ');

console.log(`地点总数 ${places.length}`);
console.log(`分类分布 ${dist(by((p) => p.cat))}`);
console.log(`分组分布 ${dist(by((p) => (daySeed[p.id] || '')))}`);
console.log(`待校准坐标 ${places.filter((p) => p.v !== 1).length} / ${places.length}`);
console.log(`经纬度跨度 lat ${Math.min(...places.map(p => p.lat)).toFixed(4)}–${Math.max(...places.map(p => p.lat)).toFixed(4)}`
  + `, lng ${Math.min(...places.map(p => p.lng)).toFixed(4)}–${Math.max(...places.map(p => p.lng)).toFixed(4)}`);

if (warnings.length) console.log('\n警告:\n' + warnings.map((w) => '  ! ' + w).join('\n'));
if (errors.length) {
  console.log('\n错误:\n' + errors.map((e) => '  x ' + e).join('\n'));
  process.exit(1);
}
console.log('\n校验通过。');

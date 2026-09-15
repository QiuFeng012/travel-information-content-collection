/* PWA 完整性自检：node tools/check-pwa.mjs
 *
 * 这些东西坏掉时页面照样能打开，只有"加到主屏幕"或离线时才出问题，
 * 特别容易漏。所以单独一个脚本盯着：
 *   - manifest 是否是合法 JSON、必填字段在不在
 *   - manifest 声明的图标是否真的存在，PNG 尺寸是否和声明的一致
 *   - sw.js 预缓存清单里的每个路径是否真的存在（缺一个 addAll 就整体失败）
 *   - index.html 里引用的每个本地资源是否真的存在
 *   - 页面是否挂了 manifest、apple-touch-icon 和 SW 注册
 */
import fs from 'node:fs';
import path from 'node:path';

const read = (p) => fs.readFileSync(p, 'utf8');
const errors = [];
const notes = [];

/* ---------- manifest ---------- */

let manifest = null;
try {
  manifest = JSON.parse(read('manifest.webmanifest'));
  notes.push(`manifest 合法：${manifest.name}`);
} catch (e) {
  errors.push('manifest.webmanifest 不是合法 JSON：' + e.message);
}

if (manifest) {
  for (const k of ['name', 'short_name', 'start_url', 'display', 'icons']) {
    if (!manifest[k]) errors.push(`manifest 缺字段 ${k}`);
  }
  if (manifest.display !== 'standalone' && manifest.display !== 'fullscreen') {
    notes.push(`display = ${manifest.display}，加到主屏幕后仍会带浏览器地址栏`);
  }
  if (!manifest.icons || !manifest.icons.length) errors.push('manifest 没声明图标');
  for (const icon of manifest.icons || []) {
    if (!fs.existsSync(icon.src)) { errors.push(`图标文件不存在：${icon.src}`); continue; }
    const buf = fs.readFileSync(icon.src);
    if (buf.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
      errors.push(`不是合法 PNG：${icon.src}`);
      continue;
    }
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    const declared = String(icon.sizes || '');
    if (declared && !declared.split(/\s+/).includes(`${w}x${h}`)) {
      errors.push(`${icon.src} 实际 ${w}x${h}，manifest 声明的是 ${declared}`);
    }
  }
  const hasMaskable = (manifest.icons || []).some((i) => String(i.purpose || '').includes('maskable'));
  if (!hasMaskable) notes.push('没有 maskable 图标，安卓主屏幕上会被裁成圆形截图');
}

/* ---------- service worker 预缓存清单 ---------- */

if (!fs.existsSync('sw.js')) {
  errors.push('缺少 sw.js');
} else {
  const sw = read('sw.js');
  const block = sw.match(/var\s+PRECACHE\s*=\s*\[([\s\S]*?)\]/);
  if (!block) {
    errors.push('sw.js 里找不到 PRECACHE 数组');
  } else {
    const list = [...block[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] || m[2]);
    if (!list.length) errors.push('PRECACHE 是空的');
    let missing = 0;
    for (const entry of list) {
      const file = entry === './' ? 'index.html' : entry.replace(/^\.\//, '').split('?')[0];
      if (!fs.existsSync(file)) { errors.push(`PRECACHE 里的文件不存在：${entry}`); missing++; }
    }
    if (!missing) notes.push(`sw.js 预缓存 ${list.length} 项，全部存在`);
    if (!/VERSION\s*=\s*['"]/.test(sw)) notes.push('sw.js 没有 VERSION 常量，改版后缓存可能刷不掉');
  }
}

/* ---------- index.html 里引用的本地资源 ---------- */

if (!fs.existsSync('index.html')) {
  errors.push('缺少 index.html');
} else {
  const html = read('index.html');
  const refs = [...html.matchAll(/(?:href|src)\s*=\s*"([^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => !/^(https?:)?\/\//.test(u) && !u.startsWith('data:') && !u.startsWith('#'));
  for (const ref of new Set(refs)) {
    const file = ref.split('?')[0];
    if (!fs.existsSync(file)) errors.push(`index.html 引用了不存在的文件：${ref}`);
  }
  notes.push(`index.html 引用本地资源 ${new Set(refs).size} 个，均存在`);

  if (!/rel="manifest"/.test(html)) errors.push('index.html 没有引 manifest');
  if (!/apple-touch-icon/.test(html)) errors.push('index.html 没有 apple-touch-icon（iOS 加到主屏幕会是白图标）');
  if (!/viewport-fit=cover/.test(html)) notes.push('viewport 没写 viewport-fit=cover，刘海屏两侧会留白');
  if (!/theme-color/.test(html)) notes.push('没有 theme-color，安卓状态栏不会跟随配色');
}

/* ---------- 页面里有没有真的注册 SW ---------- */

if (fs.existsSync('assets/app.js')) {
  const app = read('assets/app.js');
  if (!/serviceWorker\s*\.\s*register/.test(app)) {
    errors.push('assets/app.js 里没有注册 service worker，离线缓存不会生效');
  } else {
    if (!/https\?:/.test(app)) notes.push('SW 注册没有做协议判断，file:// 下会报错');
    notes.push('已注册 service worker');
  }
}

/* ---------- 汇报 ---------- */

notes.forEach((n) => console.log('  · ' + n));
if (errors.length) {
  console.log('\n错误：\n' + errors.map((e) => '  x ' + e).join('\n'));
  process.exit(1);
}
console.log('\nPWA 校验通过。');

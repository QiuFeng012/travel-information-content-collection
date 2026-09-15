/* ============================================================
 * Service Worker —— 让站点在车上、地铁里没信号时也能打开
 * ------------------------------------------------------------
 * 策略：
 *   同源资源（HTML/CSS/JS/数据/图标）→ cache-first + 后台更新，
 *     打开永远是秒开，联网时下次进来自动拿到新版本。
 *   跨域资源（Leaflet CDN、高德瓦片）→ network-first，失败回缓存，
 *     所以"逛过的区域"离线还能看到底图。
 *   导航请求 → network-first，保证联网时不会卡在旧版本。
 *
 * 改了需要立即生效的资源，记得把 VERSION 加一。
 * ============================================================ */

var VERSION = 'v4';
var SHELL = 'gzmap-shell-' + VERSION;
var RUNTIME = 'gzmap-runtime-' + VERSION;

// 预缓存清单：必须是真实存在的相对路径，缺一个 addAll 就会整体失败
var PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/style.css',
  'assets/app.js',
  'data/places.js',
  'assets/icons/favicon.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/apple-touch-icon.png'
];

var MAX_RUNTIME_ENTRIES = 400;   // 瓦片会越攒越多，给个上限

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL)
      .then(function (c) { return c.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL && k !== RUNTIME) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isCacheable(res) {
  // 跨域不透明响应 status 是 0，只能靠 type 判断
  return res && (res.ok || res.type === 'opaque');
}

function trimCache(name, max) {
  caches.open(name).then(function (c) {
    c.keys().then(function (keys) {
      if (keys.length <= max) return;
      // 缓存键的顺序大致就是插入顺序，从最旧的开始删
      for (var i = 0; i < keys.length - max; i++) c.delete(keys[i]);
    });
  });
}

function cacheFirst(req) {
  return caches.match(req).then(function (hit) {
    if (hit) {
      // 后台悄悄更新，用户这次仍然拿缓存（快）
      fetch(req).then(function (res) {
        if (isCacheable(res)) caches.open(SHELL).then(function (c) { c.put(req, res); });
      }).catch(function () {});
      return hit;
    }
    return fetch(req).then(function (res) {
      if (isCacheable(res)) {
        var copy = res.clone();
        caches.open(SHELL).then(function (c) { c.put(req, copy); });
      }
      return res;
    });
  });
}

function networkFirst(req) {
  return fetch(req).then(function (res) {
    if (isCacheable(res)) {
      var copy = res.clone();
      caches.open(RUNTIME).then(function (c) {
        c.put(req, copy).then(function () { trimCache(RUNTIME, MAX_RUNTIME_ENTRIES); });
      });
    }
    return res;
  }).catch(function () {
    return caches.match(req);
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (req.mode === 'navigate') { e.respondWith(networkFirst(req)); return; }
  if (url.origin === self.location.origin) { e.respondWith(cacheFirst(req)); return; }
  e.respondWith(networkFirst(req));
});

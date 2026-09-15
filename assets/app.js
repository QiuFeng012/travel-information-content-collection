/* ============================================================
 * 珠江新城 · 地点信息图
 * 纯静态，无构建。数据来自 data/places.js，本地改动存 localStorage。
 * ============================================================ */

(function () {
  'use strict';

  /* ---------------- 常量 ---------------- */

  var STORE_KEY = 'zjxnt-map-v1';

  var DAYS = ['Day1', 'Day2', 'Day3', 'Day4'];

  var CATS = [
    { key: '看', glyph: '景' },
    { key: '吃', glyph: '食' },
    { key: '喝', glyph: '饮' },
    { key: '逛', glyph: '购' },
    { key: '公园', glyph: '园' },
    { key: '交通', glyph: '铁' }
  ];
  var CAT_KEYS = CATS.map(function (c) { return c.key; });
  var GLYPH = {};
  CATS.forEach(function (c) { GLYPH[c.key] = c.glyph; });

  var DAY_VAR = { Day1: '--day1', Day2: '--day2', Day3: '--day3', Day4: '--day4' };

  // 星形标记的边长（px）。嫌小/嫌挤就改这里，CSS 会跟着 JS 走。
  var MK = { day: 36, free: 30, list: 32 };

  var BASEMAPS = {
    gaode: {
      url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
      subdomains: '1234', maxZoom: 19, crs: 'gcj', note: '高德矢量 · GCJ-02 · © 高德地图'
    },
    'gaode-sat': {
      url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
      subdomains: '1234', maxZoom: 19, crs: 'gcj', note: '高德卫星 · GCJ-02 · © 高德地图'
    },
    osm: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      subdomains: 'abc', maxZoom: 19, crs: 'wgs', note: 'OSM · WGS-84 · © OpenStreetMap contributors'
    }
  };

  /* ---------------- 坐标系：WGS-84 ⇄ GCJ-02 ----------------
   * 数据一律存 WGS-84；用高德底图时转成 GCJ-02 显示。
   * 不转的话会整体偏 300–500 米 —— 在珠江新城就是标错一栋楼。
   */

  var PI = Math.PI, AXIS = 6378245.0, EE = 0.00669342162296594323;

  function outOfChina(lat, lng) {
    return !(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55);
  }
  function tLat(x, y) {
    var r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
    r += (20 * Math.sin(y * PI) + 40 * Math.sin(y / 3 * PI)) * 2 / 3;
    r += (160 * Math.sin(y / 12 * PI) + 320 * Math.sin(y * PI / 30)) * 2 / 3;
    return r;
  }
  function tLng(x, y) {
    var r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
    r += (20 * Math.sin(x * PI) + 40 * Math.sin(x / 3 * PI)) * 2 / 3;
    r += (150 * Math.sin(x / 12 * PI) + 300 * Math.sin(x / 30 * PI)) * 2 / 3;
    return r;
  }
  function wgs84ToGcj02(lat, lng) {
    if (outOfChina(lat, lng)) return [lat, lng];
    var dLat = tLat(lng - 105, lat - 35);
    var dLng = tLng(lng - 105, lat - 35);
    var radLat = lat / 180 * PI;
    var magic = Math.sin(radLat);
    magic = 1 - EE * magic * magic;
    var sq = Math.sqrt(magic);
    dLat = (dLat * 180) / ((AXIS * (1 - EE)) / (magic * sq) * PI);
    dLng = (dLng * 180) / (AXIS / sq * Math.cos(radLat) * PI);
    return [lat + dLat, lng + dLng];
  }
  function gcj02ToWgs84(lat, lng) {
    if (outOfChina(lat, lng)) return [lat, lng];
    var g = wgs84ToGcj02(lat, lng);
    return [lat - (g[0] - lat), lng - (g[1] - lng)];
  }

  /* ---------------- 状态 ---------------- */

  var state = {
    places: [],
    deleted: [],
    q: '',
    cats: [],
    day: 'all',        // all | none | Day1..Day4
    coord: 'all',      // all | todo
    basemap: 'gaode',
    edit: false,
    selectedId: null,
    drawerMode: 'view',
    picking: null
  };

  var map = null, tile = null, markerLayer = null, lineLayer = null;
  var markers = {};
  var menuEl = null;

  /* ---------------- 工具 ---------------- */

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function dayColor(day) { return cssVar(DAY_VAR[day]) || '#6b675e'; }

  function uid(name) {
    var base = 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    return base;
  }

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('on'); }, 2000);
  }

  function fmtStay(m) {
    m = Number(m) || 0;
    if (!m) return '—';
    if (m < 60) return m + ' 分';
    var h = Math.floor(m / 60), r = m % 60;
    return r ? h + ' 小时 ' + r + ' 分' : h + ' 小时';
  }

  function fmtPrice(v) {
    v = Number(v) || 0;
    return v > 0 ? '¥' + v : '免费';
  }

  // 星形标记的唯一出口——地图、列表、图例都走这里，形状不会跑偏
  function star(tier, size, color, label, extraClass) {
    var text = String(label == null ? '' : label);
    var style = 'width:' + size + 'px;height:' + size + 'px' + (color ? ';--c:' + color : '');
    // 某天超过 9 站时是两位数，得缩一档才塞得进星星肚子
    var lstyle = text.length > 1 ? ' style="font-size:' + Math.round(size * 0.28) + 'px"' : '';
    return '<span class="star ' + tier + (extraClass ? ' ' + extraClass : '') + '" style="' + style + '">'
      + '<i class="star-fill"></i><b class="star-label"' + lstyle + '>' + esc(text) + '</b></span>';
  }

  function isGcj() { return BASEMAPS[state.basemap].crs === 'gcj'; }

  function toDisplay(lat, lng) { return isGcj() ? wgs84ToGcj02(lat, lng) : [lat, lng]; }
  function toData(lat, lng) { return isGcj() ? gcj02ToWgs84(lat, lng) : [lat, lng]; }

  /* ---------------- 载入 / 保存 ---------------- */

  function seedPlaces() {
    var daySeed = window.PLACE_DAY_SEED || {};
    return (window.PLACES || []).map(function (p) {
      var c = JSON.parse(JSON.stringify(p));
      c.day = daySeed[c.id] || '';
      if (c.v == null) c.v = 0;
      return c;
    });
  }

  function load() {
    var seed = seedPlaces();
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { saved = null; }

    if (saved && Array.isArray(saved.places)) {
      var have = {}, del = {};
      saved.places.forEach(function (p) { have[p.id] = 1; });
      (saved.deleted || []).forEach(function (id) { del[id] = 1; });
      // 种子文件里新增的点自动补进来（用户删掉的不补）
      var extra = seed.filter(function (p) { return !have[p.id] && !del[p.id]; });
      state.places = saved.places.concat(extra);
      state.deleted = saved.deleted || [];
      state.basemap = saved.basemap || 'gaode';
    } else {
      state.places = seed;
      state.deleted = [];
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        rev: window.PLACE_SEED_REV || 1,
        basemap: state.basemap,
        deleted: state.deleted,
        places: state.places
      }));
    } catch (e) {
      toast('本地存储写入失败（可能是隐私模式）');
    }
  }

  /* ---------------- 筛选 ---------------- */

  // 防止「筛选项被筛空了但筛选还开着」——那时列表全空又没有入口退出去
  function normalizeFilters() {
    if (state.day !== 'all' && state.day !== 'none'
      && !state.places.some(function (p) { return p.day === state.day; })) {
      state.day = 'all';
    }
    if (state.day === 'none' && !state.places.some(function (p) { return !p.day; })) {
      state.day = 'all';
    }
    if (state.coord === 'todo' && !state.places.some(function (p) { return p.v !== 1; })) {
      state.coord = 'all';
    }
    state.cats = state.cats.filter(function (c) {
      return state.places.some(function (p) { return p.cat === c; });
    });
  }

  function visible() {
    var q = state.q.trim().toLowerCase();
    return state.places.filter(function (p) {
      if (state.cats.length && state.cats.indexOf(p.cat) < 0) return false;
      if (state.day === 'none' && p.day) return false;
      if (state.day !== 'all' && state.day !== 'none' && p.day !== state.day) return false;
      if (state.coord === 'todo' && p.v === 1) return false;
      if (q) {
        var hay = [p.name, p.en, p.cat, p.note, p.hours, p.best, (p.tags || []).join(' ')]
          .join(' ').toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function countBy(fn) {
    var n = 0;
    state.places.forEach(function (p) { if (fn(p)) n++; });
    return n;
  }

  /* ---------------- 顶栏筛选条 ---------------- */

  function renderStrip() {
    var html = '';

    html += '<div class="chipgroup"><span class="lbl">行程</span>';
    html += chip('day', 'all', '全部', countBy(function () { return true; }), null);
    var un = countBy(function (p) { return !p.day; });
    if (un) html += chip('day', 'none', '未分组', un, null);
    DAYS.forEach(function (d) {
      var n = countBy(function (p) { return p.day === d; });
      if (n) html += chip('day', d, d, n, d);
    });
    html += '</div>';

    html += '<div class="chipgroup"><span class="lbl">类型</span>';
    CATS.forEach(function (c) {
      var n = countBy(function (p) { return p.cat === c.key; });
      if (!n) return;
      var on = state.cats.indexOf(c.key) >= 0;
      html += '<button class="chip" data-kind="cat" data-val="' + c.key + '" aria-pressed="' + on + '">'
        + esc(c.glyph) + ' ' + esc(c.key) + ' <span class="n">' + n + '</span></button>';
    });
    html += '</div>';

    var todo = countBy(function (p) { return p.v !== 1; });
    if (todo) {
      html += '<div class="chipgroup"><span class="lbl">坐标</span>'
        + '<button class="chip" data-kind="coord" data-val="todo" aria-pressed="'
        + (state.coord === 'todo') + '">≈ 待校准 <span class="n">' + todo + '</span></button></div>';
    }

    $('strip').innerHTML = html;
  }

  function chip(kind, val, label, n, dayKey) {
    var on = kind === 'day' ? state.day === val : false;
    var dot = dayKey
      ? '<span class="dot" style="background:' + dayColor(dayKey) + '"></span>'
      : '';
    return '<button class="chip" data-kind="' + kind + '" data-val="' + val + '" aria-pressed="' + on + '">'
      + dot + esc(label) + ' <span class="n">' + n + '</span></button>';
  }

  /* ---------------- 列表 ---------------- */

  function titleFor() {
    if (state.day === 'none') return '未分组';
    if (state.day !== 'all') return state.day;
    if (state.cats.length) return state.cats.join(' / ');
    return '全部地点';
  }

  function orderIndex(p) {
    // 在所属行程里的序号（1 起）；未分组返回 0
    if (!p.day) return 0;
    var same = state.places.filter(function (x) { return x.day === p.day; });
    return same.indexOf(p) + 1;
  }

  function renderList() {
    var list = visible();
    $('listTitle').textContent = titleFor();
    $('listCount').textContent = list.length + ' / ' + state.places.length;

    var html = '';
    if (state.edit) {
      html += '<button class="place" id="btnAdd">'
        + star('t-free', MK.list, null, '+', 'pin')
        + '<span><span class="pname">新增地点</span>'
        + '<div class="pdesc">以当前地图中心为坐标，随后可在地图上点选或拖动校准</div></span>'
        + '</button>';
    }

    if (!list.length) {
      html += '<div class="empty">没有符合条件的地点。<br>试试放宽筛选，或在编辑模式里新增一个。</div>';
    }

    list.forEach(function (p) {
      var idx = orderIndex(p);
      var label = idx ? String(idx) : (GLYPH[p.cat] || '·');
      var meta = p.cat + ' · ' + fmtStay(p.stay) + ' · ' + fmtPrice(p.price);
      var tags = (p.tags || []).slice(0, 4).map(function (t) {
        return '<span class="tag">' + esc(t) + '</span>';
      }).join('');

      html += '<button class="place" data-id="' + esc(p.id) + '" aria-current="' + (state.selectedId === p.id) + '">'
        + star(p.day ? 't-day' : 't-free', MK.list, p.day ? dayColor(p.day) : null, label, 'pin')
        + '<span>'
        + '<span class="ptop"><span class="pname">' + esc(p.name)
        + (p.v === 1 ? '' : '<span style="color:var(--muted);font-weight:400"> ≈</span>') + '</span>'
        + '<span class="pmeta">' + esc(meta) + '</span></span>'
        + (p.note ? '<span class="pdesc">' + esc(p.note) + '</span>' : '')
        + (tags ? '<span class="ptags">' + tags + '</span>' : '')
        + '</span></button>';
    });

    $('list').innerHTML = html;
  }

  /* ---------------- 地图 ---------------- */

  function toLatLng(p) {
    var d = toDisplay(Number(p.lat), Number(p.lng));
    return [d[0], d[1]];
  }

  function iconFor(p) {
    var idx = orderIndex(p);
    var label = idx ? String(idx) : (GLYPH[p.cat] || '·');
    var tier = p.day ? 't-day' : 't-free';
    var size = p.day ? MK.day : MK.free;
    var cls = 'mk' + (state.selectedId === p.id ? ' sel' : '');
    return L.divIcon({
      className: '',
      html: star(tier, size, p.day ? dayColor(p.day) : null, label, cls),
      iconSize: [size, size],
      // 星形重心比外接框中心略低一点，锚点往下挪一丁点，视觉上才落在坐标上
      iconAnchor: [size / 2, size * 0.46],
      popupAnchor: [0, -size * 0.42]
    });
  }

  function popupFor(p) {
    return '<div class="pop-name">' + esc(p.name) + '</div>'
      + '<div class="pop-meta">' + esc(p.cat) + ' · ' + esc(fmtStay(p.stay)) + ' · ' + esc(fmtPrice(p.price)) + '</div>'
      + (p.note ? '<div class="pop-note">' + esc(p.note.slice(0, 72)) + (p.note.length > 72 ? '…' : '') + '</div>' : '')
      + '<div class="pop-acts">'
      + '<button class="btn" data-pop="detail" data-id="' + esc(p.id) + '">详情</button>'
      + '<a class="btn" href="' + amapUrl(p) + '" target="_blank" rel="noopener">高德打开</a>'
      + '</div>';
  }

  function amapUrl(p) {
    var g = wgs84ToGcj02(Number(p.lat), Number(p.lng)); // 高德要 GCJ-02
    return 'https://uri.amap.com/marker?position=' + g[1].toFixed(6) + ',' + g[0].toFixed(6)
      + '&name=' + encodeURIComponent(p.name) + '&src=zjxnt-map&coordinate=gaode&callnative=1';
  }

  function initMap() {
    if (typeof L === 'undefined') {
      $('map').innerHTML = '<div class="empty" style="padding-top:120px">'
        + '地图库没加载出来。<br>检查网络后刷新，或改用本地部署方式（见 README）。</div>';
      return;
    }
    var c = toDisplay(23.1176, 113.3232);
    map = L.map('map', {
      center: c, zoom: 15, minZoom: 12, maxZoom: 19,
      zoomControl: true, attributionControl: false
    });
    markerLayer = L.layerGroup().addTo(map);
    lineLayer = L.layerGroup().addTo(map);
    applyBasemap();

    map.on('click', function (e) {
      // 只有在编辑面板打开时才允许点图取点，免得浏览状态下手滑改掉坐标
      if (!state.edit || state.drawerMode !== 'edit') return;
      var latlng = e.latlng;
      var p = state.places.filter(function (x) { return x.id === state.picking; })[0]
        || state.places.filter(function (x) { return x.id === state.selectedId; })[0];
      if (!p) { toast('先在编辑面板里选一个地点'); return; }
      var w = toData(latlng.lat, latlng.lng);
      p.lat = +w[0].toFixed(6);
      p.lng = +w[1].toFixed(6);
      p.v = 1;
      state.picking = p.id;
      persist(); renderAll();
      toast('坐标已更新：' + p.lat + ', ' + p.lng);
    });
  }

  // 恢复种子数据后，旧 marker 的闭包仍指向被丢弃的对象，必须整体重建
  function resetMarkers() {
    Object.keys(markers).forEach(function (id) { markerLayer.removeLayer(markers[id]); });
    markers = {};
  }

  function applyBasemap() {
    if (!map) return;
    if (tile) map.removeLayer(tile);
    var b = BASEMAPS[state.basemap];
    tile = L.tileLayer(b.url, { subdomains: b.subdomains, maxZoom: b.maxZoom }).addTo(map);
    tile.setZIndex(0);
    $('baseNote').textContent = b.note;
  }

  function renderMap() {
    if (!map) return;
    var list = visible();
    var ids = {};
    list.forEach(function (p) { ids[p.id] = 1; });

    // 移除不可见的
    Object.keys(markers).forEach(function (id) {
      if (!ids[id]) { markerLayer.removeLayer(markers[id]); delete markers[id]; }
    });

    list.forEach(function (p) {
      var ll = toLatLng(p);
      var m = markers[p.id];
      if (!m) {
        m = L.marker(ll, { icon: iconFor(p), draggable: state.edit, riseOnHover: true });
        m.on('click', function () { select(p.id); });
        m.on('dragend', function () {
          var q = m.getLatLng();
          var w = toData(q.lat, q.lng);
          p.lat = +w[0].toFixed(6);
          p.lng = +w[1].toFixed(6);
          p.v = 1;
          persist(); renderAll();
          toast('坐标已校准：' + p.lat + ', ' + p.lng);
        });
        m.bindPopup(popupFor(p), { closeButton: true, maxWidth: 280 });
        markers[p.id] = m;
        markerLayer.addLayer(m);
      } else {
        m.setLatLng(ll);
        m.setIcon(iconFor(p));
        m.setPopupContent(popupFor(p));
        if (state.edit) m.dragging.enable(); else m.dragging.disable();
      }
      // 星比原来大，密集区会叠在一起——选中的那颗必须压在最上面
      m.setZIndexOffset(state.selectedId === p.id ? 1000 : 0);
    });

    // 行程连线
    lineLayer.clearLayers();
    DAYS.forEach(function (d) {
      var pts = list.filter(function (p) { return p.day === d; });
      if (pts.length < 2) return;
      L.polyline(pts.map(toLatLng), {
        color: dayColor(d), weight: 2.5, opacity: .8, dashArray: '1 7', lineCap: 'round'
      }).addTo(lineLayer);
    });

    // 取点提示
    var hint = document.querySelector('.picking');
    if (state.edit && state.selectedId && state.drawerMode === 'edit') {
      if (!hint) {
        hint = document.createElement('div');
        hint.className = 'picking';
        $('paneMap').appendChild(hint);
      }
      hint.textContent = '在地图上点一下，把坐标给「' + (cur().name || '') + '」';
    } else if (hint) {
      hint.remove();
    }
  }

  function renderLegend() {
    var list = visible();
    var rows = DAYS.map(function (d) {
      var n = list.filter(function (p) { return p.day === d; }).length;
      if (!n) return '';
      return '<div class="row"><span class="sw" style="color:' + dayColor(d) + '"></span>'
        + esc(d) + '<span class="n">' + n + '</span></div>';
    }).join('');
    var un = list.filter(function (p) { return !p.day; }).length;
    if (un) {
      rows += '<div class="row"><span class="sw hollow"></span>未分组<span class="n">' + un + '</span></div>';
    }
    var todo = list.filter(function (p) { return p.v !== 1; }).length;
    if (todo) {
      rows += '<div class="row" style="color:var(--muted)">≈ ' + todo + ' 个坐标待校准</div>';
    }
    $('legend').innerHTML = rows || '<div class="row">当前筛选无结果</div>';
  }

  /* ---------------- 抽屉 ---------------- */

  function cur() { return state.places.filter(function (p) { return p.id === state.selectedId; })[0]; }

  function openDrawer(id, mode) {
    state.selectedId = id;
    state.drawerMode = mode || 'view';
    var d = $('drawer');
    d.hidden = false;
    requestAnimationFrame(function () { d.classList.add('open'); });
    d.setAttribute('aria-hidden', 'false');
    renderDrawer();
  }

  function closeDrawer() {
    var d = $('drawer');
    d.classList.remove('open');
    d.setAttribute('aria-hidden', 'true');
    state.selectedId = null;
    state.picking = null;
    setTimeout(function () { if (!d.classList.contains('open')) d.hidden = true; }, 220);
    renderAll();
  }

  function select(id) {
    openDrawer(id, state.edit ? 'edit' : 'view');
    renderAll();
  }

  function renderDrawer() {
    var d = $('drawer');
    var p = cur();
    if (!p) { return; }

    var head = '<div class="drawer-head"><div style="flex:1;min-width:0">'
      + '<h3>' + esc(p.name) + '</h3>'
      + (p.en ? '<div class="en">' + esc(p.en) + '</div>' : '')
      + '</div><button class="icon-btn" id="btnClose" title="关闭">✕</button></div>';

    var body, foot;

    if (state.drawerMode === 'edit') {
      body = '<div class="drawer-body"><div class="form">'
        + fld('名称', '<input type="text" data-f="name" value="' + esc(p.name) + '">')
        + fld('英文名 / 别名', '<input type="text" data-f="en" value="' + esc(p.en) + '">')
        + '<div class="row3">'
        + fld('分类', selectHtml('cat', CAT_KEYS, p.cat))
        + fld('停留（分钟）', '<input type="number" data-f="stay" min="0" step="15" value="' + (+p.stay || 0) + '">')
        + fld('人均（元）', '<input type="number" data-f="price" min="0" step="10" value="' + (+p.price || 0) + '">')
        + '</div>'
        + fld('标签（逗号分隔）', '<input type="text" data-f="tags" value="' + esc((p.tags || []).join(', ')) + '">')
        + '<div class="row3">'
        + fld('行程', selectHtml('day', [''].concat(DAYS), p.day || '', '未分组'))
        + fld('纬度 WGS-84', '<input type="number" data-f="lat" step="0.000001" value="' + (+p.lat).toFixed(6) + '">')
        + fld('经度 WGS-84', '<input type="number" data-f="lng" step="0.000001" value="' + (+p.lng).toFixed(6) + '">')
        + '</div>'
        + '<div class="hint">要校准坐标：点下面的按钮，然后在地图上点一下；或者直接拖动地图上的点。</div>'
        + '<div class="row2">'
        + fld('营业时间', '<input type="text" data-f="hours" value="' + esc(p.hours) + '">')
        + fld('最佳时段', '<input type="text" data-f="best" value="' + esc(p.best) + '">')
        + '</div>'
        + fld('备注（规划时真正要看的东西）', '<textarea data-f="note">' + esc(p.note) + '</textarea>')
        + fld('参考链接', '<input type="text" data-f="link" value="' + esc(p.link) + '">')
        + '<label class="check"><input type="checkbox" data-f="booking"' + (p.booking ? ' checked' : '') + '> 需要提前预约 / 订票</label>'
        + fld('坐标状态', '<input type="text" value="' + (p.v === 1 ? '已校准' : '近似值（±100–300 米）') + '" disabled>')
        + '</div></div>';

      foot = '<div class="drawer-foot">'
        + '<button class="btn primary" id="btnPick">在地图上点选坐标</button>'
        + '<button class="btn" id="btnDone">完成</button>'
        + '<button class="btn" id="btnDelete" style="margin-left:auto;color:var(--accent)">删除</button>'
        + '</div>';
    } else {
      var tags = (p.tags || []).map(function (t) {
        return '<span class="tag">' + esc(t) + '</span>';
      }).join(' ') || '—';

      body = '<div class="drawer-body">'
        + '<dl class="kv" style="border-top:0">'
        + kv('分类', esc(p.cat) + (p.booking ? ' · 需预约' : ''))
        + kv('行程', p.day
          ? '<span style="color:' + dayColor(p.day) + ';font-weight:600">' + esc(p.day) + '</span> · 第 ' + orderIndex(p) + ' 站'
          : '未分组')
        + kv('建议停留', esc(fmtStay(p.stay)))
        + kv('人均', esc(fmtPrice(p.price)))
        + kv('营业时间', esc(p.hours || '—'))
        + kv('最佳时段', esc(p.best || '—'))
        + '</dl>'
        + '<div class="ptags" style="margin-top:12px">' + tags + '</div>'
        + (p.note ? '<div class="notebox">' + esc(p.note) + '</div>' : '')
        + '<dl class="kv" style="margin-top:14px">'
        + kv('坐标', (+p.lat).toFixed(5) + ', ' + (+p.lng).toFixed(5)
          + (p.v === 1 ? ' <span class="tag">已校准</span>' : ' <span class="tag" style="color:var(--accent)">≈ 待校准</span>'))
        + (p.link ? kv('链接', '<a href="' + esc(p.link) + '" target="_blank" rel="noopener">' + esc(p.link) + '</a>') : '')
        + '</dl></div>';

      foot = '<div class="drawer-foot">'
        + '<a class="btn primary" href="' + amapUrl(p) + '" target="_blank" rel="noopener">在高德打开</a>'
        + '<button class="btn" id="btnEditThis">编辑 / 校准</button>'
        + '<button class="btn" id="btnPrev" style="margin-left:auto" title="上一个">←</button>'
        + '<button class="btn" id="btnNext" title="下一个">→</button>'
        + '</div>';
    }

    d.innerHTML = head + body + foot;
  }

  function kv(k, v) { return '<dt>' + esc(k) + '</dt><dd>' + v + '</dd>'; }

  function fld(label, inner) {
    return '<label><span class="k">' + esc(label) + '</span>' + inner + '</label>';
  }

  function selectHtml(field, options, value, placeholder) {
    var h = '<select data-f="' + field + '">';
    options.forEach(function (o) {
      var label = o === '' ? (placeholder || '（空）') : o;
      h += '<option value="' + esc(o) + '"' + (String(value) === String(o) ? ' selected' : '') + '>'
        + esc(label) + '</option>';
    });
    return h + '</select>';
  }

  function readForm() {
    var p = cur();
    if (!p) return;
    var d = $('drawer');
    d.querySelectorAll('[data-f]').forEach(function (el) {
      var f = el.getAttribute('data-f');
      if (f === 'booking') p.booking = el.checked;
      else if (f === 'stay' || f === 'price') p[f] = Number(el.value) || 0;
      else if (f === 'lat' || f === 'lng') p[f] = Number(el.value) || 0;
      else if (f === 'tags') {
        p.tags = el.value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
      } else p[f] = el.value;
    });
    persist();
  }

  function liveForm() {
    var d = $('drawer');
    d.addEventListener('input', function () { readForm(); renderList(); });
    d.addEventListener('change', function () { readForm(); renderAll(); });
  }

  /* ---------------- 渲染总入口 ---------------- */

  function renderAll() {
    normalizeFilters();
    renderStrip();
    renderList();
    renderMap();
    renderLegend();
    if (state.selectedId) renderDrawer();
  }

  /* ---------------- 新增 / 删除 ---------------- */

  function addPlace() {
    var c = map ? toData(map.getCenter().lat, map.getCenter().lng) : [23.1176, 113.3232];
    var p = {
      id: uid(), name: '新地点', en: '', cat: '看', tags: [], day: '',
      lat: +c[0].toFixed(6), lng: +c[1].toFixed(6), v: 0,
      stay: 60, price: 0, hours: '', best: '', booking: false, note: '', link: ''
    };
    state.places.unshift(p);
    persist();
    openDrawer(p.id, 'edit');
    state.picking = p.id;
    renderAll();
    toast('已新增，改完记得点「完成」');
  }

  function deletePlace(id) {
    var p = state.places.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    if (!confirm('删除「' + p.name + '」？可以从导出文件或种子数据里恢复。')) return;
    state.places = state.places.filter(function (x) { return x.id !== id; });
    if (state.deleted.indexOf(id) < 0) state.deleted.push(id);
    persist();
    closeDrawer();
    toast('已删除');
  }

  /* ---------------- 导出 ---------------- */

  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  function exportPlacesJS() {
    var body = state.places.map(function (p) {
      var o = {};
      ['id', 'name', 'en', 'cat', 'tags', 'lat', 'lng', 'v', 'stay', 'price', 'hours', 'best', 'booking', 'note', 'link']
        .forEach(function (k) { o[k] = p[k]; });
      return '  ' + JSON.stringify(o, null, 2).split('\n').join('\n  ');
    }).join(',\n');

    var days = {};
    state.places.forEach(function (p) { if (p.day) days[p.id] = p.day; });

    var out = '/* 由「珠江新城 · 地点信息图」导出 — 覆盖 data/places.js 即可固化。\n'
      + ' * 坐标 = WGS-84。v: 1 已校准 / 0 近似值。 */\n\n'
      + 'window.PLACE_SEED_REV = ' + ((window.PLACE_SEED_REV || 1) + 1) + ';\n\n'
      + 'window.PLACES = [\n' + body + '\n];\n\n'
      + 'window.PLACE_DAY_SEED = ' + JSON.stringify(days, null, 2) + ';\n';

    download('places.js', out, 'application/javascript;charset=utf-8');
    toast('已下载 places.js，覆盖 data/places.js 即可固化');
  }

  function itineraryMarkdown() {
    var lines = ['# 珠江新城行程', ''];
    var rest = state.places.filter(function (p) { return !p.day; });

    DAYS.forEach(function (d) {
      var pts = state.places.filter(function (p) { return p.day === d; });
      if (!pts.length) return;
      lines.push('## ' + d);
      var total = 0;
      pts.forEach(function (p, i) {
        total += Number(p.stay) || 0;
        lines.push((i + 1) + '. **' + p.name + '** — ' + p.cat + ' · 停留 ' + fmtStay(p.stay)
          + ' · ' + fmtPrice(p.price));
        if (p.hours) lines.push('   - ' + p.hours + (p.best ? '（最佳：' + p.best + '）' : ''));
        if (p.booking) lines.push('   - ⚠ 需提前预约 / 订票');
        if (p.note) lines.push('   - ' + p.note);
      });
      lines.push('');
      lines.push('_合计停留约 ' + fmtStay(total) + '_');
      lines.push('');
    });

    if (rest.length) {
      lines.push('## 未分组');
      rest.forEach(function (p) { lines.push('- ' + p.name + '（' + p.cat + '）'); });
      lines.push('');
    }
    return lines.join('\n');
  }

  function toggleMenu() {
    if (menuEl) { menuEl.remove(); menuEl = null; return; }
    var btn = $('btnExport');
    var r = btn.getBoundingClientRect();
    menuEl = document.createElement('div');
    menuEl.className = 'legend';
    menuEl.style.cssText = 'position:fixed;left:auto;right:' + (window.innerWidth - r.right) + 'px;top:'
      + (r.bottom + 6) + 'px;bottom:auto;z-index:1300;min-width:230px;padding:6px';
    menuEl.innerHTML =
      '<button class="place" style="grid-template-columns:1fr;border-top:0;padding:8px 10px" data-exp="js">'
      + '<span class="pname" style="font-size:13px">下载 places.js</span>'
      + '<span class="pdesc">固化到种子数据，可提交 / 部署</span></button>'
      + '<button class="place" style="grid-template-columns:1fr;padding:8px 10px" data-exp="md">'
      + '<span class="pname" style="font-size:13px">复制行程 Markdown</span>'
      + '<span class="pdesc">按 Day 分组，含停留时长合计</span></button>'
      + '<button class="place" style="grid-template-columns:1fr;padding:8px 10px" data-exp="json">'
      + '<span class="pname" style="font-size:13px">复制原始 JSON</span>'
      + '<span class="pdesc">喂给别的工具或脚本用</span></button>'
      + '<button class="place" style="grid-template-columns:1fr;padding:8px 10px" data-exp="reset">'
      + '<span class="pname" style="font-size:13px;color:var(--accent)">恢复种子数据</span>'
      + '<span class="pdesc">丢弃本机所有改动</span></button>';
    document.body.appendChild(menuEl);
  }

  function handleExport(kind) {
    if (menuEl) { menuEl.remove(); menuEl = null; }
    if (kind === 'js') exportPlacesJS();
    if (kind === 'json') {
      navigator.clipboard.writeText(JSON.stringify(state.places, null, 2))
        .then(function () { toast('JSON 已复制'); }, function () { toast('复制失败，请检查浏览器权限'); });
    }
    if (kind === 'md') {
      navigator.clipboard.writeText(itineraryMarkdown())
        .then(function () { toast('行程 Markdown 已复制'); }, function () { toast('复制失败，请检查浏览器权限'); });
    }
    if (kind === 'reset') {
      if (!confirm('恢复种子数据？本机的新增、修改、删除都会丢失。')) return;
      localStorage.removeItem(STORE_KEY);
      load();
      state.selectedId = null;
      state.day = 'all'; state.cats = []; state.coord = 'all'; state.q = '';
      $('q').value = '';
      closeDrawer();
      resetMarkers();
      renderAll();
      toast('已恢复种子数据');
    }
  }

  /* ---------------- 事件 ---------------- */

  function bind() {
    $('q').addEventListener('input', function (e) {
      state.q = e.target.value;
      renderList(); renderMap(); renderLegend();
    });

    $('basemap').addEventListener('change', function (e) {
      var c = map ? map.getCenter() : null;
      var w = c ? toData(c.lat, c.lng) : null;
      state.basemap = e.target.value;
      applyBasemap();
      if (w) { var d = toDisplay(w[0], w[1]); map.setView(d, map.getZoom()); }
      persist(); renderAll();
    });

    $('btnEdit').addEventListener('click', function () {
      state.edit = !state.edit;
      $('btnEdit').setAttribute('aria-pressed', String(state.edit));
      if (!state.edit) state.picking = null;
      renderAll();
      toast(state.edit ? '编辑模式：可新增、拖动、点选坐标' : '已退出编辑模式');
    });

    $('btnView').addEventListener('click', function () {
      var v = document.body.getAttribute('data-view') === 'map' ? 'list' : 'map';
      document.body.setAttribute('data-view', v);
      this.textContent = v === 'map' ? '列表' : '地图';
      if (v === 'map' && map) setTimeout(function () { map.invalidateSize(); }, 60);
    });

    $('btnExport').addEventListener('click', function (e) {
      e.stopPropagation();
      toggleMenu();
    });

    document.addEventListener('click', function (e) {
      if (menuEl && !menuEl.contains(e.target) && e.target.id !== 'btnExport') {
        menuEl.remove(); menuEl = null;
      }
      var exp = e.target.closest ? e.target.closest('[data-exp]') : null;
      if (exp) handleExport(exp.getAttribute('data-exp'));

      var pop = e.target.closest ? e.target.closest('[data-pop]') : null;
      if (pop && pop.getAttribute('data-pop') === 'detail') {
        openDrawer(pop.getAttribute('data-id'), state.edit ? 'edit' : 'view');
        renderAll();
      }
    });

    $('strip').addEventListener('click', function (e) {
      var c = e.target.closest('[data-kind]');
      if (!c) return;
      var kind = c.getAttribute('data-kind'), val = c.getAttribute('data-val');
      if (kind === 'day') state.day = val;
      if (kind === 'coord') state.coord = state.coord === 'todo' ? 'all' : 'todo';
      if (kind === 'cat') {
        var i = state.cats.indexOf(val);
        if (i < 0) state.cats.push(val); else state.cats.splice(i, 1);
      }
      renderAll();
    });

    $('list').addEventListener('click', function (e) {
      if (e.target.closest('#btnAdd')) { addPlace(); return; }
      var el = e.target.closest('.place[data-id]');
      if (!el) return;
      select(el.getAttribute('data-id'));
      if (window.innerWidth <= 860 && map) {
        document.body.setAttribute('data-view', 'map');
        $('btnView').textContent = '列表';
        setTimeout(function () { map.invalidateSize(); }, 60);
      }
    });

    $('drawer').addEventListener('click', function (e) {
      var id = e.target.id;
      if (id === 'btnClose') closeDrawer();
      if (id === 'btnEditThis') { state.drawerMode = 'edit'; renderDrawer(); renderMap(); }
      if (id === 'btnDone') { readForm(); state.drawerMode = 'view'; state.picking = null; renderAll(); toast('已保存'); }
      if (id === 'btnPick') { state.picking = state.selectedId; renderMap(); toast('现在在地图上点一下'); }
      if (id === 'btnDelete') deletePlace(state.selectedId);
      if (id === 'btnPrev' || id === 'btnNext') {
        var list = visible();
        var i = list.findIndex(function (p) { return p.id === state.selectedId; });
        if (i < 0) return;
        var n = id === 'btnNext' ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
        openDrawer(list[n].id, 'view');
        renderAll();
      }
    });
    liveForm();

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'e' || e.key === 'E') $('btnEdit').click();
      if (e.key === '/') { e.preventDefault(); $('q').focus(); }
    });

    window.addEventListener('resize', function () { if (map) map.invalidateSize(); });
  }

  /* ---------------- 启动 ---------------- */

  load();
  $('basemap').value = state.basemap;
  bind();
  initMap();
  renderAll();

  if (!state.places.length) {
    toast('没有地点数据，检查 data/places.js 是否加载');
  }
})();

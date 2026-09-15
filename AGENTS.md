# AGENTS.md

本文件是本仓库的工作约定，对人类协作者和 AI 代理同样生效。

## 注意事项

1. **每次改动完成后，都必须创建一次对应的 git commit**，以便后续追踪和回滚。
2. **每次改动后，都必须编写或更新相关测试**，并在交付给用户之前，确保所有测试和验证全部通过。

## 本仓库怎么跑验证

第 2 条要求的「测试」，在本仓库目前由下面几个命令承担。改动数据或代码后，交付前至少跑完这几步：

```bash
node --check assets/app.js      # 逻辑语法
node --check data/places.js     # 数据语法
node --check sw.js              # service worker 语法
node tools/check-data.mjs       # 数据结构自检：id 重复、分类拼写、坐标越界、分组引用
node tools/check-pwa.mjs        # PWA 自检：manifest、图标尺寸、预缓存清单、SW 注册
```

- 改了 `data/places.js` 就必须跑 `check-data.mjs`，它是目前唯一会自动校验数据正确性的东西。
- 改了图标、`manifest.webmanifest`、`sw.js`、或 `index.html` 的 head 部分，就必须跑 `check-pwa.mjs`。这类东西坏掉时页面照样能打开，只有「加到主屏幕」或离线时才出问题，最容易漏。
- **改了预缓存清单后记得把 `sw.js` 里的 `VERSION` 加一**，否则老用户永远拿不到新版本。

## 浏览器验证

改了 UI 或交互时必须真实渲染一次再交付。纯静态站点，`file://` 直接打开就能验证大部分情况：

```bash
msedge --headless=new --window-size=1500,940 --virtual-time-budget=9000 \
       --screenshot=out.png "file:///<仓库路径>/index.html"
```

三个已经踩过的坑，别重复踩：

1. **Service Worker 在 `file://` 下不会注册**，要验证 SW / 离线能力必须起 http：
   `node tools/serve.mjs 8099` 然后访问 `http://127.0.0.1:8099/`。
2. **Edge/Chrome 在 Windows 上有约 500px 的最小窗口宽度**。`--window-size=390,844` 不会给你
   390px 的视口：页面按 504px 布局，截图却裁成 390px，看起来就像右侧溢出，实际并没有。
   要真正的窄视口，把页面放进一个固定宽度的 `<iframe>` 里再截图。判断有没有溢出的可靠方法是
   读 `document.documentElement.scrollWidth` 和 `clientWidth`，不是靠肉眼看截图。
3. **别靠肉眼看截图判断地图的缩放级别和居中**——同一个结论我误判过两次。要量就直接量：
   - 缩放级别：高德瓦片 URL 里带 `z=`，读 `img.leaflet-tile` 的 src 就知道了。
   - 有没有居中：比较 `.leaflet-marker-icon` 的像素包围盒中心和 `#map` 的包围盒中心。
   - 注意 `L.map` 默认 `zoomSnap: 1`，会把 `fitBounds` 算出的 13.97 `floor` 成 13，
     白白多出一圈留白；要贴合就得设 `zoomSnap: 0`。

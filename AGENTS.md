# AGENTS.md

本文件是本仓库的工作约定，对人类协作者和 AI 代理同样生效。

## 注意事项

1. **每次改动完成后，都必须创建一次对应的 git commit**，以便后续追踪和回滚。
2. **每次改动后，都必须编写或更新相关测试**，并在交付给用户之前，确保所有测试和验证全部通过。

## 本仓库怎么跑验证

第 2 条要求的「测试」，在本仓库目前由下面几个命令承担。改动数据或代码后，交付前至少跑完这几步：

```bash
node --check assets/app.js     # 逻辑语法
node --check data/places.js    # 数据语法
node tools/check-data.mjs      # 数据结构自检：id 重复、分类拼写、坐标越界、分组引用
```

改了数据文件就必须跑 `check-data.mjs`；它是目前唯一会自动校验数据正确性的东西。

改了 UI 或交互（地图、抽屉、编辑表单）时，除了上面的命令，还要用无头浏览器实际渲染一次再交付。本站是纯静态站点，`file://` 直接打开就能验证，不需要起服务器：

```bash
msedge --headless=new --window-size=1500,940 --virtual-time-budget=9000 \
       --screenshot=out.png "file:///<仓库路径>/index.html"
```

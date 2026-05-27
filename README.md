# 通往斯德哥尔摩之路

一个适合 GitHub 团队协作、并可直接部署到 GitHub Pages 的纯前端期末项目骨架。

技术栈只使用 HTML5、CSS3、ES6 JavaScript 和 D3.js v7。当前主页已经重构为全屏逐页式叙事：只有在右侧星轨式翻页区域滚轮或在键盘上翻页时才会切换页面，首页先用轮播建立氛围，再进入项目总览和 5 个成员故事章节。成员页面结构全部在 `modules/` 内维护。

## 项目结构

```text
project-root/
├── index.html             # 仅负责首页、项目总览、收束页与翻页壳
├── style.css              # 全局样式与翻页控件
├── main.js                # 负责加载各模块的独立页面
├── data/
│   ├── memberA_data.json
│   ├── memberB_data.json
│   ├── memberC_data.json
│   ├── memberD_data.json
│   └── memberE_data.json
└── modules/
    ├── memberA/
    │   ├── chart.js
    │   ├── page.html
    │   └── style.css
    ├── memberB/
    │   ├── chart.js
    │   ├── page.html
    │   └── style.css
    ├── memberC/
    │   ├── chart.js
    │   ├── page.html
    │   └── style.css
    ├── memberD/
    │   ├── chart.js
    │   ├── page.html
    │   └── style.css
    └── memberE/
        ├── chart.js
        ├── page.html
        └── style.css
```

## 主页结构

- 首页：照片轮播 + 项目氛围引导
- 项目总览：说明分工、节奏和协作方式
- 成员 A-E：各自独立的全屏故事页
- 收束页：项目总结与答辩出口

主页右侧的“星轨翻页”区域是唯一默认接收滚轮事件的区域，页面本体不会出现一点一点往下滑的感觉。

## 运行方式

这个项目是静态站点，建议通过本地 HTTP 服务打开，避免浏览器直接打开本地文件时出现 `fetch` 限制。

### 方式 1：Node（推荐）

```bash
npx --yes http-server -p 8000 -c-1
```

然后访问 `http://localhost:8000/`。

### 方式 2：Python

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000/`。

如果你的 Python 本地服务对 `.js` 返回了 `text/plain`，请改用上面的 Node 方式或 VS Code Live Server；页面在 GitHub Pages 上不会有这个问题。

## 首页轮播资源

首页当前使用 `images/179463-landscape-gallery.jpg`、`images/179489-landscape-gallery.webp`、`images/179492-landscape-gallery.jpg` 作为轮播示例图。你可以直接替换这三张图片，或在 [index.html](index.html) 中改成你自己的图片路径。

## 部署到 GitHub Pages

1. 将仓库推送到 GitHub。
2. 进入仓库的 Settings > Pages。
3. 选择 `Deploy from a branch`。
4. 分支选择 `main`，目录选择 `/root`。
5. 保存后等待 Pages 构建完成。

因为所有资源都使用相对路径，所以不需要额外打包工具，可以直接部署。

## 协作规范

1. `index.html` 只保留首页、项目总览和收束页，成员故事页结构由各自 `page.html` 决定。
2. 每位成员只修改自己的 `modules/memberX/` 目录（包括 `page.html`、`chart.js`、`style.css`）。
3. 成员页面的根节点必须保留 `.page` 与 `data-module`，并提供 `.chart-container` 或 `[data-chart-target]` 作为图表挂载点。
4. `main.js` 只负责加载模块页面与翻页控制，不干预成员页面内部布局。
5. 如果需要新增成员模块，复制 `modules/` 内的 `page.html` 模板并在 `main.js` 的 `moduleSpecs` 中注册。

## 当前示例图表

为了让项目先跑起来并便于判断视觉方向，仓库里已经放入了 5 个可运行的示例图表：

- 宏观时间序列图
- 学术轨迹图
- 关系网络图
- 流向带状图
- 形态变换散点图

这些图表都基于本地 JSON 数据，可以直接替换成团队自己的真实数据。

## 开发建议

1. 先由每位成员在自己的模块里替换示例数据和图形逻辑。
2. 保持图表类接口一致，至少提供 `loadData()` 和 `resize()`。
3. 如果某个模块需要更多联动状态，可以继续扩展 `d3.dispatch` 的事件类型。
4. 提交前先用浏览器检查滚动联动和响应式布局在桌面端、平板端和移动端的表现。
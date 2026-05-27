# 通往斯德哥尔摩之路

一个适合 GitHub 团队协作、并可直接部署到 GitHub Pages 的纯前端期末项目骨架。

技术栈只使用 HTML5、CSS3、ES6 JavaScript 和 D3.js v7。当前主页已经重构为全屏逐页式叙事：只有在专门的翻页区域滚轮或在键盘上翻页时才会切换页面，首页先用轮播建立氛围，再进入项目总览和 5 个成员故事章节。

## 项目结构

```text
project-root/
├── index.html
├── style.css
├── main.js
├── data/
│   ├── memberA_data.json
│   ├── memberB_data.json
│   ├── memberC_data.json
│   ├── memberD_data.json
│   └── memberE_data.json
└── modules/
    ├── memberA/
    │   ├── chart.js
    │   └── style.css
    ├── memberB/
    │   ├── chart.js
    │   └── style.css
    ├── memberC/
    │   ├── chart.js
    │   └── style.css
    ├── memberD/
    │   ├── chart.js
    │   └── style.css
    └── memberE/
        ├── chart.js
        └── style.css
```

## 主页结构

- 首页：照片轮播 + 项目氛围引导
- 项目总览：说明分工、节奏和协作方式
- 成员 A-E：各自独立的全屏故事页
- 收束页：项目总结与答辩出口

主页右侧的“滑动翻页”区域是唯一默认接收滚轮事件的区域，页面本体不会再出现那种一点一点往下滑的感觉。

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

首页默认使用 `images/hero-1.svg`、`images/hero-2.svg`、`images/hero-3.svg` 作为占位轮播图。你后续可以直接把这几个文件替换成同名照片，或者把页面里的路径改成你自己的图片名。

## 部署到 GitHub Pages

1. 将仓库推送到 GitHub。
2. 进入仓库的 Settings > Pages。
3. 选择 `Deploy from a branch`。
4. 分支选择 `main`，目录选择 `/root`。
5. 保存后等待 Pages 构建完成。

因为所有资源都使用相对路径，所以不需要额外打包工具，可以直接部署。

## 协作规范

1. `main.js` 只负责全局编排、滚动联动和模块初始化。
2. 每位成员只修改自己的 `modules/memberX/` 目录和对应的数据文件。
3. 公共布局只放在 `index.html` 和 `style.css`。
4. 图表之间通过 `d3.dispatch` 的全局事件总线联动，避免直接互相依赖。
5. 如果需要新增图表，先在 `modules/` 下复制一个标准模板，再在 `main.js` 注册。

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
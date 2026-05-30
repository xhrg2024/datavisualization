**整合成员C到主站点指南**

概要：将 storyline_C 社会网络生态（成员C）的三张图（团队规模趋势、得主合作/弧线图、内部引用/网络图）合并到主站点的 `index` 中成员 C 节点，数据保存在 `data/memberC` 下，前端通过水平切换展示三张图。

**检查数据**:
- **已存在（建议作为主数据）**: [data/memberC/figure1_team_size_prize_papers.csv](data/memberC/figure1_team_size_prize_papers.csv) 、 [data/memberC/figure2_laureate_collab_pairs_paperid.csv](data/memberC/figure2_laureate_collab_pairs_paperid.csv) 、 [data/memberC/figure3_internal_citation_edges.csv](data/memberC/figure3_internal_citation_edges.csv) 、 [data/memberC/figure3_internal_citation_nodes.csv](data/memberC/figure3_internal_citation_nodes.csv) 、 [data/memberC/memberC_data.json](data/memberC/memberC_data.json) 、 [data/memberC/nobel_enriched.csv](data/memberC/nobel_enriched.csv) 以及 [data/memberC/images/](data/memberC/images/)
- **storyline_C 目录中有重复副本，建议归档或删除（备份到 archive 目录）**: [storyline_C_social_network_ecology_data/figure1_team_size_prize_papers.csv](storyline_C_social_network_ecology_data/figure1_team_size_prize_papers.csv) 、 [storyline_C_social_network_ecology_data/figure2_laureate_collab_pairs_paperid.csv](storyline_C_social_network_ecology_data/figure2_laureate_collab_pairs_paperid.csv) 、 [storyline_C_social_network_ecology_data/figure3_internal_citation_edges.csv](storyline_C_social_network_ecology_data/figure3_internal_citation_edges.csv) 、 [storyline_C_social_network_ecology_data/figure3_internal_citation_nodes.csv](storyline_C_social_network_ecology_data/figure3_internal_citation_nodes.csv) 、 [storyline_C_social_network_ecology_data/nobel_enriched.csv](storyline_C_social_network_ecology_data/nobel_enriched.csv)

说明：我已查看 `data/memberC` 的文件（它们覆盖了 storyline_C 里的主要 CSV/JSON），这些文件可以作为整合后的数据源。

**数据整合步骤（推荐顺序）**:
1. 本地备份：在项目根或其他安全位置创建 `archive/memberC/` 并移动 `storyline_C` 中重复文件到该目录。
   - PowerShell 示例：
     `mkdir archive\memberC; Move-Item storyline_C_social_network_ecology_data\figure1_team_size_prize_papers.csv archive\memberC\`
2. 确认主数据路径：所有前端脚本应统一指向 `data/memberC/` 下的文件（不要同时引用 storyline_C 目录）。
3. 若有清洗脚本（如 `prepare_storyline_c_data.py` 等），把输出目标改为 `data/memberC/`，并保留一份脚本在 `storyline_C` 供将来再生成数据时使用。

**前端整合（HTML + JS）**:
- 推荐位置：把成员 C 的页面片段参考自 [modules/memberC/page.html](modules/memberC/page.html)，把相应 DOM 结构并入主 `index.html` 的成员 C 区段。
- UI 要求：在成员 C 区块中实现“水平切换”容器（3 个面板），每个面板放一张图（SVG 或 chart 容器）。可用两种实现方式：
  - 选项 A（简单）：三按钮/标签切换（点击切换显示/隐藏）。
  - 选项 B（平滑）：水平滚动容器（`display:flex; overflow-x:auto; scroll-snap-type:x mandatory;`），并配合左右箭头控制或触摸滑动。

示例 HTML（放在 `index.html` 的成员C区域，基于 [modules/memberC/page.html](modules/memberC/page.html)）：
```
<div class="memberC-switcher">
  <nav class="mc-tabs">
    <button data-mc-target="fig1">团队规模</button>
    <button data-mc-target="fig2">合作者弧线</button>
    <button data-mc-target="fig3">引用网络</button>
  </nav>
  <div class="mc-panels">
    <div id="panel-fig1" class="mc-panel"> <svg id="svg1"></svg> </div>
    <div id="panel-fig2" class="mc-panel"> <svg id="svg2"></svg> <div id="fig2-detail"></div> </div>
    <div id="panel-fig3" class="mc-panel"> <div class="chart-container" data-chart-target></div> </div>
  </div>
</div>
```

JS 集成要点：
- 把 `storyline_C_social_network_ecology_data/main.js` 中的 `drawFig1()`、`drawFig2()`、`drawFig3()`（或相应函数）提取到主脚本中，或把该文件作为模块引入，修改数据路径为 `data/memberC/...`。
- `modules/memberC/chart.js` 中的 `NetworkChart` 可用于绘制第3张图。示例初始化流程：
  - `drawFig1()` -> 读取 `data/memberC/figure1_team_size_prize_papers.csv` 并在 `#svg1` 绘制（可直接复用 storyline_C 的实现）。
  - `drawFig2()` -> 读取 `data/memberC/figure2_laureate_collab_pairs_paperid.csv`、`data/memberC/figure3_internal_citation_nodes.csv`、`data/memberC/nobel_enriched.csv`，在 `#svg2` 绘制交互弧线图（复用已有逻辑）。
  - `drawFig3()` -> 使用 `new NetworkChart('.chart-container', bus).loadData('data/memberC/memberC_data.json')` 或加载 `figure3_internal_citation_nodes/edges` 并格式化为 nodes/links。
- 切换逻辑（简洁示例）：
```
document.querySelectorAll('.mc-tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const id = btn.dataset.mcTarget; // fig1|fig2|fig3
    document.querySelectorAll('.mc-panel').forEach(p=> p.style.display='none');
    document.getElementById('panel-' + id).style.display='block';
    // 若首次显示，调用对应 draw 函数
  });
});
```

**样式建议**:
- `mc-panels` 使用 `display:flex; gap:16px;`，若使用平滑滚动，启用 `scroll-snap`。确保每个 `mc-panel` 的 SVG/容器有明确宽高。
- 为 `NetworkChart` 的容器保持可伸缩布局，并在 `window.resize` 时调用相应组件的 `resize()`。

**测试与验收**:
- 在项目根运行： `python -m http.server 8000`，打开 `http://localhost:8000`，导航到成员 C 区，检查三张图能水平切换并能加载 `data/memberC` 的数据。
- 验证点：
  - 三个面板能切换（点击/滑动/箭头）。
  - 第1、2 图的交互（Tooltip、点击查看详情）工作正常。
  - 第3 图（力导向/引用网络）能正确加载 nodes/links 并响应年份/类别筛选（若有）。

**清理建议（可选）**:
- 若 `data/memberC` 已经完整且通过测试，建议将 `storyline_C_social_network_ecology_data` 下的重复 CSV 移入 `archive/`，保留 `storyline_C_social_network_ecology_data` 下的脚本（如 `prepare_storyline_c_data.py`）用于将来再生成数据。

**快速检查清单**:
- **数据**: 确认所有前端引用都指向 [data/memberC/](data/memberC/)
- **HTML**: 在 [index.html](index.html) 中加入或替换成员 C 区域为示例结构
- **JS**: 将 `drawFig1`/`drawFig2`/`drawFig3` 引入主脚本并修改路径
- **样式**: 添加 `mc-panels`/`mc-panel` 的 CSS（或复用 [modules/memberC/style.css](modules/memberC/style.css) 中样式）
- **测试**: 在本地启动服务器并验证

如果你希望，我可以：
- 把 `storyline_C` 的绘图函数提取并生成一个可直接引入到主 `main.js` 的模块文件；
- 或者直接修改 `index.html` 和主 `main.js` 来完成整合（需要我继续修改代码的话我会先列出将要改动的文件清单）。

**整合成员C到主站点指南**

概要：将 storyline_C 社会网络生态（成员C）的三张图（团队规模趋势、得主合作/弧线图、内部引用/网络图）合并到主站点的 `index` 中成员 C 节点，数据保存在 `data/memberC` 下，前端通过水平切换展示三张图。

**检查数据**:
- **已存在（建议作为主数据）**: [data/memberC/figure1_team_size_prize_papers.csv](data/memberC/figure1_team_size_prize_papers.csv) 、 [data/memberC/figure2_laureate_collab_pairs_paperid.csv](data/memberC/figure2_laureate_collab_pairs_paperid.csv) 、 [data/memberC/figure3_internal_citation_edges.csv](data/memberC/figure3_internal_citation_edges.csv) 、 [data/memberC/figure3_internal_citation_nodes.csv](data/memberC/figure3_internal_citation_nodes.csv) 、 [data/memberC/memberC_data.json](data/memberC/memberC_data.json) 、 [data/memberC/nobel_enriched.csv](data/memberC/nobel_enriched.csv) 以及 [data/memberC/images/](data/memberC/images/)


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


**测试与验收**:

- 验证点：
  - 三个面板能切换（点击/滑动/箭头）。
  - 第1、2 图的交互（Tooltip、点击查看详情）工作正常。
  - 第3 图（力导向/引用网络）能正确加载 nodes/links 并响应年份/类别筛选（若有）。

**清理建议（可选）**:
- 若 `data/memberC` 已经完整且通过测试，建议将 `storyline_C_social_network_ecology_data` 下的重复 CSV 移入 `archive/`，保留 `storyline_C_social_network_ecology_data` 下的脚本（如 `prepare_storyline_c_data.py`）用于将来再生成数据。

**快速检查清单**:
- **数据**: 确认所有前端引用都指向 [data/memberC/](data/memberC/)(已完成复制)
- **HTML**: 在 [index.html](index.html) 中加入或替换成员 C 区域为示例结构
- **JS**: 将 `drawFig1`/`drawFig2`/`drawFig3` 引入主脚本并修改路径
- **样式**: 添加 `mc-panels`/`mc-panel` 的 CSS（或复用 [modules/memberC/style.css](modules/memberC/style.css) 中样式）
- **测试**: 在本地启动服务器并验证


const d3 = globalThis.d3;

if (!d3) {
  throw new Error('D3.js is required for NetworkChart.');
}

/* ------------------------------------------------------------------ *
 * 成员 C · 社会网络生态
 * 三张图（团队规模演化 / 得主合作弧线 / 内部引用热力）封装为一个
 * 水平切换的图表组件，复用主站点的模块加载约定（loadData / resize）。
 * 三个绘图算法移植自 storyline_C 原型。
 * ------------------------------------------------------------------ */

function parseNumber(v) {
  const n = +v;
  return isFinite(n) ? n : null;
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function seededHash(value) {
  const text = String(value || '');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnitInterval(value) {
  return seededHash(value) / 4294967295;
}

function seededSignedUnitInterval(value) {
  return seededUnitInterval(value) * 2 - 1;
}

function resolveVerticalCollisions(items, top, bottom, minGap, targetAccessor) {
  if (items.length <= 1) return items;
  const targetY = typeof targetAccessor === 'function' ? targetAccessor : (item) => item.y;
  const sorted = items.slice().sort((a, b) => {
    const ay = targetY(a);
    const by = targetY(b);
    if (ay !== by) return ay - by;
    return String(a.key || a.name || '').localeCompare(String(b.key || b.name || ''));
  });
  const available = Math.max(0, bottom - top);
  const gap = sorted.length > 1 ? Math.max(6, Math.min(minGap, available / (sorted.length - 1))) : 0;
  const positions = sorted.map((item, idx) => {
    const minY = top + idx * gap;
    const maxY = bottom - (sorted.length - 1 - idx) * gap;
    return Math.max(minY, Math.min(maxY, targetY(item)));
  });
  sorted.forEach((item, idx) => { item.y = positions[idx]; });
  return sorted;
}

function resolveHorizontalCollisions(items, left, right, minGap, targetAccessor) {
  if (items.length <= 1) return items;
  const targetX = typeof targetAccessor === 'function' ? targetAccessor : (item) => item.x;
  const sorted = items.slice().sort((a, b) => {
    const ax = targetX(a);
    const bx = targetX(b);
    if (ax !== bx) return ax - bx;
    return String(a.key || a.name || '').localeCompare(String(b.key || b.name || ''));
  });
  const positions = sorted.map((item) => Math.max(left, Math.min(right, targetX(item))));
  const gap = minGap;
  for (let i = 1; i < positions.length; i += 1) {
    positions[i] = Math.max(positions[i], positions[i - 1] + gap);
  }
  let overflow = positions[positions.length - 1] - right;
  if (overflow > 0) {
    for (let i = positions.length - 1; i >= 0; i -= 1) positions[i] -= overflow;
  }
  let underflow = left - positions[0];
  if (underflow > 0) {
    for (let i = 0; i < positions.length; i += 1) positions[i] += underflow;
  }
  for (let i = 1; i < positions.length; i += 1) {
    positions[i] = Math.max(positions[i], positions[i - 1] + gap);
  }
  overflow = positions[positions.length - 1] - right;
  if (overflow > 0) {
    for (let i = positions.length - 1; i >= 0; i -= 1) positions[i] -= overflow;
  }
  sorted.forEach((item, idx) => { item.x = positions[idx]; });
  return sorted;
}

const PANEL_COUNT = 3;
const FIG3_DISCIPLINE_LABELS = {
  Physics: '物理',
  Chemistry: '化学',
  Medicine: '医学/生物'
};

const VIEW_COPY = {
  overview: {
    title: '团队规模演化与学科差异',
    insight: '近年来诺贝尔奖得主论文的团队规模整体呈现扩大趋势：20 世纪初多数论文仅有 1–2 位作者，而进入 21 世纪后团队协作日益普遍，尤其在物理学和医学领域，数十人甚至上百人的大型合作项目已不罕见。这意味着个人英雄主义的科研时代正在被大团队协作模式所取代。',
    notes: [
      '先看小提琴形状与散点密度：密度更厚的位置代表"常见团队规模"，离群点则提示极大团队。',
      '再对照红色中位线与虚线均值：若均值明显高于中位数，说明少数大团队在"抬高平均"。',
      '最后切换学科筛选，对比三学科的均值/中位数/≥5人占比，判断是哪一类学科更依赖大团队。'
    ]
  },
  migration: {
    title: '得主合作弧线：同行者与合作强度',
    insight: '诺贝尔奖得主之间存在大量跨代际、跨学科的合作关系。数据显示，得主之间的合作强度与获奖时间接近程度正相关——同年或相邻年份获奖的得主之间更易产生合作，且合作成果的论文评分普遍较高。物理学领域的合作关系最为密集，展现了该学科"大科学"的协作特征。',
    notes: [
      '先调"合作篇数不少于/最多关系条数"，让画面只保留最有代表性的高强度合作（线越粗合作越频繁）。',
      '再沿时间轴看弧线的跨期跨度：跨度越大表示合作跨越更长年代，密集区域代表合作高发期。',
      '最后点击某条弧线/节点，在右侧核对样例论文与作者信息，把"关系强度"落到具体合作证据上。'
    ]
  },
  centers: {
    title: '内部引用热力：学科内知识回溯',
    insight: '诺贝尔奖得主论文的内部引用表现出明显的"近期偏好"和"学科内聚"特征：大多数引用发生在发表后 10–20 年内，且引用行为高度集中在同一学科内部。其中物理学的回溯周期最长（常引用数十年前的经典工作），而医学/生物学的引用更集中在近 5–10 年，反映出不同学科知识更新速度的差异。',
    notes: [
      '先用上方分段按钮切学科（物理/化学/医学/生物），确认当前只看该学科内部的引用关系。',
      '再看热力格子的深浅：越深表示"引用论文数"更多；重点观察哪些来源年代更常回溯到哪些被引年代。',
      '最后调整"聚合粒度/最小引用论文数"，验证结论是否稳健：粒度越粗看长期结构，粒度越细看局部波动。'
    ]
  }
};

export class NetworkChart {
  constructor(containerSelector, bus) {
    this.container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    this.bus = bus;
    this.root = this.container;
    this.activeIndex = 0;
    this.dataLoaded = false;
    this.loading = false;
    this.rendered = [false, false, false];
    this.fig3Discipline = 'Physics';
    this._resizeRaf = null;
    this._resizeObserver = null;
    this.page = this.root.closest('.page-module') || document;
    this.summary = this.page.querySelector('[data-mc-summary]');
    this.notes = this.page.querySelector('[data-mc-notes]');
    this.fig3DisciplineButtons = Array.from(this.page.querySelectorAll('[data-mc-fig3-discipline]') ?? []);
    this.detailPanel = d3.select(this.page.querySelector('[data-mc-fig2-detail]'));
    this.authorPanel = d3.select(this.page.querySelector('[data-mc-fig2-author]'));

    // 浮动提示框（绑定在 body 上，使用 pageX/pageY 定位）
    this.tip = d3.select('body').append('div').attr('class', 'mc-tooltip').style('opacity', 0);

    this.installSwitcher();
    this.installResizeObserver();
  }

  /* ----- 容器内 DOM 查询助手 ----- */
  sel(sub) {
    return d3.select(this.root.querySelector(sub));
  }

  /* ----- 水平切换 UI ----- */
  installSwitcher() {
    this.track = this.root.querySelector('[data-mc-track]');
    this.tabs = Array.from(this.root.querySelectorAll('[data-mc-tab]'));
    this.dots = Array.from(this.root.querySelectorAll('.mc-dot'));

    this.tabs.forEach((tab) => {
      tab.addEventListener('click', () => this.switchTo(Number(tab.dataset.mcTab)));
    });

    // 绑定外层 member-a 风格的标签（如果存在）到图表切换，保证只在当前模块作用域内
    const pageEl = this.container.closest('[data-page="network"]') || this.container.closest('.module-c') || document;
    this.outerTabs = pageEl ? Array.from(pageEl.querySelectorAll('.member-a-tab')) : [];
    this.outerTabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => {
        this.outerTabs.forEach((t) => t.classList.toggle('is-active', t === tab));
        this.switchTo(idx);
      });
    });

    const prev = this.root.querySelector('[data-mc-prev]');
    const next = this.root.querySelector('[data-mc-next]');
    prev?.addEventListener('click', () => this.switchTo(this.activeIndex - 1));
    next?.addEventListener('click', () => this.switchTo(this.activeIndex + 1));

    this.fig3DisciplineButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.fig3Discipline = button.dataset.mcFig3Discipline;
        this.fig3DisciplineButtons.forEach((item) => item.classList.toggle('is-active', item === button));
        if (this.dataLoaded && this.activeIndex === 2) {
          this.renderFig3();
        }
      });
    });

    this.applyTrackTransform();
  }

  installResizeObserver() {
    if (!this.root || typeof ResizeObserver === 'undefined') return;
    this._resizeObserver = new ResizeObserver(() => this.resize());
    this._resizeObserver.observe(this.root);
  }

  setSummary(title, cards, caption) {
    if (!this.summary) {
      this.summary = this.page.querySelector('[data-mc-summary]');
    }
    if (this.summary) {
      this.summary.innerHTML = (cards || []).map((item) => `
        <div class="member-a-kpi">
          <strong>${item.value}</strong>
          <span>${item.label}</span>
        </div>
      `).join('');
    }

    if (this.notes) {
      const key = this.activeIndex === 0 ? 'overview' : this.activeIndex === 1 ? 'migration' : 'centers';
      const copy = VIEW_COPY[key];
      this.notes.innerHTML = `
        <h3>${copy.title}</h3>
        <p class="member-a-insight">${copy.insight}</p>
        <ul>${copy.notes.map((item) => `<li>${item}</li>`).join('')}</ul>
      `;
    }
  }

  updateRightRail(index) {
    const showDetails = index === 1;
    // detailPanel / authorPanel 仅用于图 2（合作弧线）的右侧详情展示。
    // 当非图 2 时，务必隐藏并清理其内容，避免被其它面板复用或残留。
    if (this.detailPanel && !this.detailPanel.empty()) {
      this.detailPanel.style('display', showDetails ? '' : 'none');
      this.detailPanel.attr('aria-hidden', showDetails ? 'false' : 'true');
      if (!showDetails) {
        try { this.detailPanel.html(''); } catch (e) { this.detailPanel.node().innerHTML = ''; }
      }
    }
    if (this.authorPanel && !this.authorPanel.empty()) {
      this.authorPanel.style('display', showDetails ? '' : 'none');
      this.authorPanel.attr('aria-hidden', showDetails ? 'false' : 'true');
      if (!showDetails) {
        try { this.authorPanel.html(''); } catch (e) { this.authorPanel.node().innerHTML = ''; }
      }
    }
  }

  applyTrackTransform() {
    if (this.track) {
      this.track.style.transform = `translateX(-${this.activeIndex * (100 / PANEL_COUNT)}%)`;
    }
    this.tabs.forEach((tab, idx) => tab.classList.toggle('is-active', idx === this.activeIndex));
    this.dots.forEach((dot, idx) => dot.classList.toggle('is-active', idx === this.activeIndex));
    if (this.outerTabs && this.outerTabs.length) {
      this.outerTabs.forEach((tab, idx) => tab.classList.toggle('is-active', idx === this.activeIndex));
    }
    // Ensure right-side panel state is always synchronized with the active panel.
    // Calling updateRightRail here guarantees the right rail won't get out of sync when
    // the visual track is manipulated by other code paths.
    try {
      this.updateRightRail(this.activeIndex);
    } catch (e) {
      // 防御性容错：若更新失败则记录错误但不阻塞主流程
      console.error('同步右侧面板失败：', e);
    }
  }

  switchTo(index) {
    const target = Math.max(0, Math.min(index, PANEL_COUNT - 1));
    if (target === this.activeIndex && this.rendered[target]) return;
    this.activeIndex = target;
    this.applyTrackTransform();
    // 无论是否已经渲染过，都需要同步右侧面板的显示状态，
    // 否则在复用已渲染面板时右侧详情会保持旧状态不更新。
    try {
      this.updateRightRail(target);
    } catch (e) {
      // 防御性容错：若更新失败不阻塞切换
      console.error('更新右侧面板时出错：', e);
    }

    // 切换到任一图时都重新渲染当前面板，避免右侧统计/详情残留上一个图的内容。
    // 数据只加载一次，重绘只复用缓存数据，不会再次请求 CSV。
    if (this.dataLoaded) {
      this.renderPanel(target);
    }
  }

  /* ----- 尺寸度量 ----- */
  metrics() {
    const panel = this.root.querySelector(`.mc-panel[data-mc-panel="${this.activeIndex}"]`);
    const stage = panel ? panel.querySelector('.mc-stage') : null;
    const rect = stage ? stage.getBoundingClientRect() : { width: 720, height: 410 };
    const w = Math.max(360, Math.floor(rect.width));
    const h = Math.max(360, Math.floor(rect.height));
    return { w, h };
  }

  /* ----- 数据加载（重活，支持懒加载）----- */
  async loadData(base) {
    if (this.dataLoaded || this.loading) return this;
    this.loading = true;
    let b = base || './data/memberC/';
    if (!b.endsWith('/')) {
      const lastSlash = Math.max(b.lastIndexOf('/'), b.lastIndexOf('\\'));
      b = lastSlash >= 0 ? b.slice(0, lastSlash + 1) : './data/memberC/';
    }
    b = b.replace(/\/+$/, '/');

    this.showLoading();

    try {
      const [fig1, pairs, nodes, edges, nobel] = await Promise.all([
        d3.csv(b + 'figure1_team_size_prize_papers.csv'),
        d3.csv(b + 'figure2_laureate_collab_pairs_paperid.csv'),
        d3.csv(b + 'figure3_internal_citation_nodes.csv'),
        d3.csv(b + 'figure3_internal_citation_edges.csv'),
        d3.csv(b + 'nobel_enriched.csv')
      ]);

      fig1.forEach((d) => {
        d.author_count = parseNumber(d.author_count);
        d.prize_year = parseNumber(d.prize_year);
        d.decade = d.decade || '';
      });

      pairs.forEach((d) => {
        d.coop_weight_sum = parseNumber(d.coop_weight_sum) || 0;
        try { d.sample_papers = JSON.parse(d.sample_papers_json || '[]'); } catch (e) { d.sample_papers = []; }
      });

      nodes.forEach((d) => {
        d.prize_year = parseNumber(d.prize_year);
        d.pub_year = parseNumber(d.pub_year);
        d.node_key = normalizeName(d.node_name);
      });

      edges.forEach((d) => {
        d.source_pub_year = parseNumber(d.source_pub_year);
        d.target_pub_year = parseNumber(d.target_pub_year);
        d.citation_count = parseNumber(d.citation_count);
      });

      // 获奖原因映射（供图 2 作者面板使用）
      const motivationById = new Map();
      const motivationByKey = new Map();
      nobel.forEach((d) => {
        const laureateId = String(d.laureate_id || '').trim();
        const motivation = String(d.motivation || '').trim();
        const rawKey = d.prize_winning_abbreviations || d.laureats_name || d.full_name || '';
        const key = normalizeName(rawKey);
        if (motivation) {
          if (laureateId && !motivationById.has(laureateId)) motivationById.set(laureateId, motivation);
          if (key && !motivationByKey.has(key)) motivationByKey.set(key, motivation);
        }
      });

      this.base = b;
      this.imageBase = b + 'images/';
      this.fig1Data = fig1;
      this.fig2Pairs = pairs;
      this.fig3Nodes = nodes;
      this.fig3Edges = edges;
      this.metaByKey = new Map(nodes.map((d) => [d.node_key, d]));
      this.motivationById = motivationById;
      this.motivationByKey = motivationByKey;

      this.dataLoaded = true;
      this.loading = false;
      this.clearLoading();
      // 仅渲染当前激活面板，其余懒渲染——加快进入本页的速度
      this.renderPanel(this.activeIndex);
    } catch (error) {
      this.loading = false;
      console.error('成员 C 数据加载失败：', error);
      this.showError(error);
    }
    return this;
  }

  showLoading() {
    [1, 2, 3].forEach((i) => {
      const svg = this.sel(`[data-mc-svg="${i}"]`);
      svg.selectAll('*').remove();
      svg.attr('viewBox', '0 0 400 200');
      svg.append('text').attr('x', 200).attr('y', 100).attr('text-anchor', 'middle')
        .attr('fill', '#7c8a82').attr('font-size', 13).text('数据加载中…');
    });
  }

  clearLoading() {
    [1, 2, 3].forEach((i) => this.sel(`[data-mc-svg="${i}"]`).selectAll('*').remove());
  }

  showError(error) {
    const svg = this.sel('[data-mc-svg="1"]');
    svg.selectAll('*').remove();
    svg.attr('viewBox', '0 0 480 120');
    svg.append('text').attr('x', 16).attr('y', 40).attr('fill', '#b00020').attr('font-size', 13)
      .text('数据加载失败，请确认通过本地服务器访问 data/memberC/。');
    svg.append('text').attr('x', 16).attr('y', 64).attr('fill', '#999').attr('font-size', 11)
      .text(String(error && error.message ? error.message : error));
  }

  renderPanel(index) {
    if (!this.dataLoaded) return;
    this.updateRightRail(index);
    if (index === 0) this.renderFig1();
    else if (index === 1) this.renderFig2();
    else if (index === 2) this.renderFig3();
    this.rendered[index] = true;
  }

  renderAll() {
    [0, 1, 2].forEach((i) => { this.rendered[i] = false; });
    this.renderPanel(this.activeIndex);
  }

  resize() {
    if (!this.dataLoaded) return;
    if (this._resizeRaf) cancelAnimationFrame(this._resizeRaf);
    this._resizeRaf = requestAnimationFrame(() => {
      // 重绘当前面板，其余标记为待重绘（切换时再绘制）——避免一次重排三张大图
      this.rendered = [false, false, false];
      this.renderPanel(this.activeIndex);
    });
  }

  /* ================================================================ *
   * 图 1：诺奖论文团队规模随获奖年代的演化（小提琴 + 蜂群散点）
   * ================================================================ */
  renderFig1() {
    const self = this;
    const data = this.fig1Data;
    const tip = this.tip;
    const { w, h } = this.metrics();
    const svgW = w;
    const svgH = Math.max(280, h - 8);

    const svg = this.sel('[data-mc-svg="1"]');
    svg.attr('width', svgW).attr('height', svgH).attr('viewBox', `0 0 ${svgW} ${svgH}`);
    svg.selectAll('*').remove();

    const margin = { top: 55, right: 30, bottom: 55, left: 70 };
    const width = svgW - margin.left - margin.right;
    const height = svgH - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    svg.append('text').attr('x', svgW / 2).attr('y', 22).attr('text-anchor', 'middle').attr('font-size', 15).attr('font-weight', 'bold').attr('fill', '#222')
      .text('诺奖论文团队规模随获奖年代的演化趋势');

    function render(category) {
      g.selectAll('*').remove();
      const filtered = (category === 'all' ? data : data.filter((d) => d.category === category)).filter((d) => d.author_count != null && d.author_count > 0);
      const groups = d3.group(filtered.filter((d) => d.author_count != null), (d) => d.decade);
      const decades = Array.from(groups.keys()).sort((a, b) => +a - +b);
      const allCounts = filtered.map((d) => d.author_count).filter((d) => d != null);
      const sortedCounts = allCounts.filter((d) => d > 0).sort((a, b) => a - b);
      const meanVal = sortedCounts.length > 0 ? d3.mean(sortedCounts) : 5;
      const categories = ['Physics', 'Chemistry', 'Medicine'];
      const avgByCategory = (cat) => {
        const vals = data.filter((d) => d.category === cat && d.author_count != null && d.author_count > 0).map((d) => d.author_count);
        return vals.length ? d3.mean(vals) : null;
      };

      if (category === 'all') {
        self.setSummary(
          '图 1 · 团队规模演化',
          [
            { value: avgByCategory('Physics') == null ? '—' : avgByCategory('Physics').toFixed(1), label: '物理平均作者数' },
            { value: avgByCategory('Chemistry') == null ? '—' : avgByCategory('Chemistry').toFixed(1), label: '化学平均作者数' },
            { value: avgByCategory('Medicine') == null ? '—' : avgByCategory('Medicine').toFixed(1), label: '医学/生物平均作者数' },
            { value: Number.isFinite(meanVal) ? meanVal.toFixed(1) : '—', label: '整体平均作者数' }
          ],
          '先看三类学科的平均作者数，再沿着年代变化判断团队规模是变大还是变小。'
        );
      } else {
        const medianVal = sortedCounts.length ? d3.median(sortedCounts) : null;
        const largeTeamShare = filtered.length ? filtered.filter((d) => d.author_count >= 5).length / filtered.length : null;
        self.setSummary(
          '图 1 · 团队规模演化',
          [
            { value: filtered.length, label: '当前样本论文' },
            { value: Number.isFinite(meanVal) ? meanVal.toFixed(1) : '—', label: '平均作者数' },
            { value: medianVal == null ? '—' : medianVal.toFixed(1), label: '中位作者数' },
            { value: largeTeamShare == null ? '—' : `${(largeTeamShare * 100).toFixed(0)}%`, label: '≥5人团队占比' }
          ],
          `当前仅显示 ${category} 学科；先看右侧统计，再看下方分布判断该学科的团队规模是否更集中。`
        );
      }

      const x = d3.scaleBand().domain(decades).range([0, width]).padding(0.5);
      const cap = (sortedCounts.length > 0) ? (d3.quantile(sortedCounts, 0.90) || d3.max(sortedCounts)) : 10;
      const y = d3.scaleLinear().domain([0, Math.max(cap, 10)]).nice().range([height, 0]);
      const yTop = y.domain()[1];

      g.append('g').attr('class', 'axis x').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).tickSizeOuter(0)).selectAll('text').attr('font-size', 11);
      g.append('text').attr('x', width / 2).attr('y', height + 42).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', '#444').text('获奖年代');

      g.append('g').attr('class', 'axis y').call(d3.axisLeft(y).ticks(6)).selectAll('text').attr('font-size', 11);
      g.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -52).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', '#444').text('论文作者人数');

      const legendItems = [
        { label: 'Physics', color: '#4e79a7' },
        { label: 'Chemistry', color: '#f28e2b' },
        { label: 'Medicine', color: '#e15759' },
        { label: '超标值', color: '#d62728', shape: 'triangle' }
      ];
      const lg = g.append('g').attr('class', 'fig1-legend').attr('transform', 'translate(10, 8)');
      legendItems.forEach((item, i) => {
        const row = lg.append('g').attr('transform', `translate(0, ${i * 16})`);
        if (item.shape === 'triangle') {
          row.append('path').attr('d', d3.symbol().type(d3.symbolTriangle).size(40)).attr('transform', 'translate(6,0)').attr('fill', item.color);
        } else {
          row.append('circle').attr('cx', 6).attr('cy', 0).attr('r', 3.5).attr('fill', item.color).attr('opacity', 0.8);
        }
        row.append('text').attr('x', 16).attr('y', 3.5).attr('text-anchor', 'start').attr('font-size', 10).attr('fill', '#555').text(item.label);
      });
      lg.append('text').attr('x', 0).attr('y', legendItems.length * 16 + 6).attr('text-anchor', 'start').attr('font-size', 9).attr('fill', '#888')
        .text('小提琴=分布密度 红线=中位数');

      const stats = decades.map((dec) => {
        const valsAll = groups.get(dec).map((d) => d.author_count).sort((a, b) => a - b);
        const q1 = d3.quantile(valsAll, 0.25);
        const q2 = d3.quantile(valsAll, 0.5);
        const q3 = d3.quantile(valsAll, 0.75);
        const iqr = q3 - q1;
        const rawMin = d3.min(valsAll);
        const rawMax = d3.max(valsAll);
        const min = d3.max([rawMin, q1 - 1.5 * iqr]);
        const max = d3.min([rawMax, q3 + 1.5 * iqr]);
        return { dec, q1, q2, q3, min, max, n: valsAll.length };
      });

      const violinW = Math.min(40, x.bandwidth() * 0.9);
      g.selectAll('.violin').data(stats).enter().append('g').attr('class', 'violin').attr('transform', (d) => `translate(${x(d.dec) + x.bandwidth() / 2},0)`).each(function (d) {
        const node = d3.select(this);
        const rawVals = groups.get(d.dec).map((p) => p.author_count).filter((v) => v != null && v > 0);
        const hasOutliers = rawVals.some((v) => v > yTop);
        const vals = rawVals.map((v) => Math.min(v, yTop)).sort((a, b) => a - b);
        if (vals.length < 2) return;
        const kdePoints = 50;
        const valMin = d3.min(vals);
        const valMax = hasOutliers ? yTop : d3.max(vals);
        const bandwidth = Math.max(0.5, (valMax - valMin) * 0.2);
        function kde(val) {
          let sum = 0;
          for (const v of vals) { sum += Math.exp(-0.5 * Math.pow((val - v) / bandwidth, 2)); }
          return sum / (vals.length * bandwidth * Math.sqrt(2 * Math.PI));
        }
        const kdeData = [];
        for (let i = 0; i <= kdePoints; i++) {
          const v = valMin + (valMax - valMin) * i / kdePoints;
          kdeData.push({ v, density: kde(v) });
        }
        const maxDensity = d3.max(kdeData, (p) => p.density) || 1;
        const halfW = violinW / 2;
        let violin = `M0,${y(kdeData[0].v)}`;
        kdeData.forEach((pt) => { violin += `L${(pt.density / maxDensity) * halfW},${y(pt.v)}`; });
        for (let i = kdeData.length - 1; i >= 0; i--) { violin += `L${-(kdeData[i].density / maxDensity) * halfW},${y(kdeData[i].v)}`; }
        violin += 'Z';
        node.append('path').attr('d', violin).attr('fill', 'rgba(100,100,100,0.12)').attr('stroke', '#666').attr('stroke-width', 1).attr('stroke-linejoin', 'round');
        const medY = y(Math.min(d.q2, yTop));
        node.append('line').attr('x1', -8).attr('x2', 8).attr('y1', medY).attr('y2', medY).attr('stroke', '#c0392b').attr('stroke-width', 2.5);
        node.append('line').attr('x1', -4).attr('x2', 4).attr('y1', y(Math.min(d.q1, yTop))).attr('y2', y(Math.min(d.q1, yTop))).attr('stroke', '#555').attr('stroke-width', 1.2);
        node.append('line').attr('x1', -4).attr('x2', 4).attr('y1', y(Math.min(d.q3, yTop))).attr('y2', y(Math.min(d.q3, yTop))).attr('stroke', '#555').attr('stroke-width', 1.2);
      });

      const meanY = y(Math.min(meanVal, yTop));
      g.append('line').attr('x1', 0).attr('x2', width).attr('y1', meanY).attr('y2', meanY).attr('stroke', '#2c3e50').attr('stroke-width', 1.2).attr('stroke-dasharray', '8 4').attr('opacity', 0.5);
      g.append('text').attr('x', width - 4).attr('y', meanY - 4).attr('text-anchor', 'end').attr('font-size', 9).attr('fill', '#2c3e50').attr('opacity', 0.7).text('均值 ' + meanVal.toFixed(1));

      if (stats.length >= 2) {
        const trendData = stats.map((s) => ({ x: x(s.dec) + x.bandwidth() / 2, y: y(Math.min(s.q2, yTop)) }));
        const lineGen = d3.line().x((p) => p.x).y((p) => p.y).curve(d3.curveMonotoneX);
        g.append('path').attr('d', lineGen(trendData)).attr('fill', 'none').attr('stroke', '#c0392b').attr('stroke-width', 1.5).attr('stroke-dasharray', '6 3').attr('opacity', 0.6);
      }

      const paperMap = new Map();
      filtered.forEach((d) => {
        if (d.author_count == null || d.author_count <= 0) return;
        const pid = d.paper_id || d.title;
        if (!paperMap.has(pid)) paperMap.set(pid, { dec: d.decade, val: d.author_count, name: d.laureate_name, title: d.title, category: d.category });
      });
      let allPoints = Array.from(paperMap.values()).filter((p) => p.val != null);
      const outlierPts = allPoints.filter((p) => p.val > yTop);
      const normalPts = allPoints.filter((p) => p.val <= yTop);
      const maxTotal = 300;
      const byCat = d3.group(normalPts, (d) => d.category);
      const sampled = [];
      const cats = Array.from(byCat.keys());
      const perCat = Math.max(5, Math.floor(maxTotal / cats.length));
      byCat.forEach((group) => {
        const shuffled = group.slice().sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(perCat, shuffled.length); i++) sampled.push(shuffled[i]);
      });
      const sampledSet = new Set(sampled.map((p) => p.dec + '|' + p.val));
      normalPts.forEach((p) => {
        const key = p.dec + '|' + p.val;
        if (!sampledSet.has(key)) { sampled.push(p); sampledSet.add(key); }
      });
      allPoints = sampled.concat(outlierPts);

      const dotR = 2.5;
      const colW = x.bandwidth() * 0.85;
      allPoints.forEach((p) => { p._jx = 0; });
      const byDec2 = d3.group(allPoints, (d) => d.dec);
      byDec2.forEach((pts) => {
        const byVal = d3.group(pts, (d) => d.val);
        byVal.forEach((group) => {
          if (group.length <= 1) return;
          const spacing = dotR * 2 + 1;
          const totalW = (group.length - 1) * spacing;
          const scale = totalW > colW ? colW / totalW : 1;
          group.forEach((p, i) => { p._jx = (i - (group.length - 1) / 2) * spacing * scale; });
        });
      });

      g.selectAll('.pt').data(allPoints.filter((p) => p.val <= yTop)).enter().append('circle').attr('class', 'pt')
        .attr('cx', (d) => x(d.dec) + x.bandwidth() / 2 + d._jx)
        .attr('cy', (d) => y(d.val))
        .attr('r', dotR)
        .attr('fill', (d) => d.category === 'Physics' ? '#4e79a7' : d.category === 'Chemistry' ? '#f28e2b' : '#e15759')
        .attr('opacity', 0.7)
        .on('mouseover', (event, d) => {
          tip.style('opacity', 1).html(`<strong>${d.name}</strong><br/>作者人数：${d.val}<br/>论文：${d.title}`).style('left', (event.pageX + 8) + 'px').style('top', (event.pageY + 8) + 'px');
        })
        .on('mouseout', () => tip.style('opacity', 0));

      const outliers = allPoints.filter((p) => p.val > yTop);
      const outByDec = d3.group(outliers, (d) => d.dec);
      const topOutliers = [];
      outByDec.forEach((group) => { group.sort((a, b) => b.val - a.val); topOutliers.push(group[0]); });

      g.selectAll('.out').data(topOutliers).enter().append('path').attr('class', 'out')
        .attr('d', d3.symbol().type(d3.symbolTriangle).size(50))
        .attr('transform', (d) => `translate(${x(d.dec) + x.bandwidth() / 2}, ${y(yTop) + 4})`)
        .attr('fill', '#d62728').attr('opacity', 0.9)
        .on('mouseover', (event, d) => {
          const pctAbove = yTop > 0 ? ((d.val - yTop) / yTop * 100).toFixed(0) : '?';
          tip.style('opacity', 1).html(`<strong>${d.name}</strong><br/>作者人数：${d.val}（超出坐标轴顶部 ${pctAbove}%）<br/>论文：${d.title}`).style('left', (event.pageX + 8) + 'px').style('top', (event.pageY + 8) + 'px');
        })
        .on('mouseout', () => tip.style('opacity', 0));

      topOutliers.forEach((d) => {
        const pctAbove = yTop > 0 ? ((d.val - yTop) / yTop * 100).toFixed(0) : '?';
        const cx = x(d.dec) + x.bandwidth() / 2;
        g.append('text').attr('class', 'out-label').attr('x', cx).attr('y', y(yTop) - 2).attr('text-anchor', 'middle').attr('font-size', 8).attr('fill', '#d62728').attr('opacity', 0.8).text(`↑${pctAbove}%`);
      });
    }

    const categorySel = this.sel('[data-mc-fig1-category]');
    categorySel.on('change', function () { render(this.value); });
    render(categorySel.node() ? categorySel.node().value : 'all');
  }

  /* ================================================================ *
   * 图 2：诺奖得主合作时间弧线图
   * ================================================================ */
  renderFig2() {
    const self = this;
    const tip = this.tip;
    const pairs = this.fig2Pairs;
    const metaByKey = this.metaByKey;
    const motivationById = this.motivationById;
    const motivationByKey = this.motivationByKey;

    const { w, h } = this.metrics();
    const svgW = w;
    const svgH = Math.max(280, h - 8);

    const svg = this.sel('[data-mc-svg="2"]');
    svg.attr('width', svgW).attr('height', svgH).attr('viewBox', `0 0 ${svgW} ${svgH}`);
    svg.selectAll('*').remove();

    const width = svgW;
    const height = svgH;
    const side = Math.min(150, Math.max(70, Math.round(width * 0.14)));
    const margin = { top: 58, right: side, bottom: 70, left: side };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    let currentPair = null;
    let currentAuthorKey = null;

    const categoryColors = { Physics: '#4e79a7', Chemistry: '#f28e2b', Medicine: '#e15759' };
    const laneOrder = ['Physics', 'Chemistry', 'Medicine'];

    function assignLaneCategory(name, category, prizeYear) {
      if (category === 'Physics' || category === 'Chemistry' || category === 'Medicine') return category;
      const key = `${normalizeName(name)}|${prizeYear || ''}`;
      return laneOrder[seededHash(key) % laneOrder.length];
    }

    function getMetaForName(name) {
      const key = normalizeName(name);
      const meta = metaByKey.get(key);
      const rawCategory = meta && meta.category ? meta.category : 'Physics';
      const prizeYear = meta && meta.prize_year ? meta.prize_year : null;
      return {
        key,
        name,
        laureateId: meta && meta.laureate_id ? String(meta.laureate_id).trim() : '',
        category: assignLaneCategory(name, rawCategory, prizeYear),
        prizeYear
      };
    }

    function renderAuthorPlaceholder() {
      currentAuthorKey = null;
      self.authorPanel.html(`
        <div class="mc-fig2-author-head">
          <h3>作者信息</h3>
          <p>点击上方任意圆点，查看作者详细信息。</p>
        </div>`);
    }

    function renderDetailPlaceholder() {
      currentPair = null;
      self.detailPanel.html(`
        <div class="mc-fig2-detail-head">
          <h3>论文详情</h3>
          <p>点击上方任意关系路径，查看样例论文信息。</p>
        </div>`);
    }

    function renderDetail(pair) {
      currentPair = pair;
      const paperTopN = Math.max(1, parseNumber(self.sel('[data-mc-fig2-paper-topn]').node().value) || 5);
      const papers = (pair.sample_papers || []).slice().sort((a, b) => (parseNumber(b.score) || 0) - (parseNumber(a.score) || 0)).slice(0, paperTopN);
      if (papers.length === 0) {
        self.detailPanel.html(`
          <div class="mc-fig2-detail-head">
            <h3>${pair.laureate_a} ↔ ${pair.laureate_b}</h3>
            <button type="button" class="mc-fig2-detail-clear" data-mc-fig2-detail-clear>收起详情</button>
          </div>
          <p>合作强度：<strong>${pair.coop_weight_sum}</strong></p><p>暂无样例论文。</p>`);
        const clearBtn = self.detailPanel.node().querySelector('[data-mc-fig2-detail-clear]');
        clearBtn?.addEventListener('click', () => { renderDetailPlaceholder(); });
        return;
      }
      const html = papers.map((p) => {
        const title = p.title || 'Untitled';
        const category = p.category || 'N/A';
        const prizeYear = p.prize_year || 'N/A';
        const pubYear = p.pub_year || 'N/A';
        const journal = p.journal || '';
        const doi = p.doi || '';
        const abstract = p.abstract || '';
        const keywords = (p.keywords && p.keywords.length) ? p.keywords.join(', ') : '';
        const score = p.score == null || p.score === '' ? '' : Number(p.score).toFixed(3);
        return `<li>
          <strong>${title}</strong><br/>
          ${category} | 奖年 ${prizeYear} | 发表 ${pubYear}${score ? ` | 评分 ${score}` : ''}<br/>
          ${journal}${doi ? ` | DOI: ${doi}` : ''}
          ${keywords ? `<div class="paper-keywords"><strong>关键词：</strong>${keywords}</div>` : ''}
          ${abstract ? `<div class="paper-abstract"><strong>摘要：</strong>${abstract}</div>` : ''}
        </li>`;
      }).join('');
      self.detailPanel.html(`
        <div class="mc-fig2-detail-head">
          <h3>${pair.laureate_a} ↔ ${pair.laureate_b}</h3>
          <button type="button" class="mc-fig2-detail-clear" data-mc-fig2-detail-clear>收起详情</button>
        </div>
        <p>合作篇数：<strong>${pair.coop_weight_sum}</strong>，展示评分最高的前 <strong>${paperTopN}</strong> 篇论文。</p><p>样例论文：</p><ul>${html}</ul>`);
      const clearBtn = self.detailPanel.node().querySelector('[data-mc-fig2-detail-clear]');
      clearBtn?.addEventListener('click', () => { renderDetailPlaceholder(); });
    }

    function renderAuthorDetail(node) {
      if (!node) return;
      currentAuthorKey = node.key;
      const idx = (seededHash(node.key) % 8) + 1;
      const placeholderImg = `${self.imageBase}placeholder_${idx}.svg`;
      // 根据作者名生成候选图片文件名：小写化、逗号+空格→下划线、其余空格→下划线，扩展名为 .png
      const candidateName = node.name.trim().toLowerCase().replace(/,\s*/g, '_').replace(/\s+/g, '_');
      const candidateImg = `${self.imageBase}${candidateName}.png`;
      const awardReason = (node.laureateId ? motivationById.get(String(node.laureateId)) : '') || motivationByKey.get(node.key) || '';
      self.authorPanel.html(`
        <div class="mc-fig2-author-head">
          <h3>作者信息</h3>
          <button type="button" class="mc-fig2-author-clear" data-mc-fig2-author-clear>收起详情</button>
        </div>
        <div class="mc-fig2-author-body">
          <img src="${candidateImg}" alt="${node.name}" onerror="this.src='${placeholderImg}'" />
          <div class="meta">
            <h4>${node.name}</h4>
            <p>学科：${node.category || 'N/A'}</p>
            <p>获奖年份：${node.prizeYear || 'N/A'}</p>
            <p>节点键：${node.key}</p>
            ${awardReason ? `<p>获奖原因：${awardReason}</p>` : ''}
          </div>
        </div>`);

      const clearButton = self.authorPanel.node().querySelector('[data-mc-fig2-author-clear]');
      clearButton?.addEventListener('click', () => {
        renderAuthorPlaceholder();
      });
    }

    function render() {
      self.updateRightRail(1);
      const minw = +self.sel('[data-mc-fig2-minw]').node().value;
      const topn = +self.sel('[data-mc-fig2-topn]').node().value;
      const animate = self.sel('[data-mc-fig2-animate]').node().checked;
      const totalPairs = pairs.length;

      const filtered = pairs.filter((d) => d.coop_weight_sum >= minw).sort((a, b) => b.coop_weight_sum - a.coop_weight_sum);
      const selected = filtered.slice(0, topn);
      const avgByCategory = (cat) => {
        const vals = selected
          .filter((d) => getMetaForName(d.laureate_a).category === cat)
          .map((d) => d.coop_weight_sum)
          .filter((v) => v != null);
        return vals.length ? d3.mean(vals) : null;
      };
      const overallAvg = selected.length ? d3.mean(selected, (d) => d.coop_weight_sum) : null;

      self.setSummary(
        '图 2 · 合作弧线',
        [
          { value: avgByCategory('Physics') == null ? '—' : avgByCategory('Physics').toFixed(1), label: '物理平均合作强度' },
          { value: avgByCategory('Chemistry') == null ? '—' : avgByCategory('Chemistry').toFixed(1), label: '化学平均合作强度' },
          { value: avgByCategory('Medicine') == null ? '—' : avgByCategory('Medicine').toFixed(1), label: '医学/生物平均合作强度' },
          { value: overallAvg == null ? '—' : overallAvg.toFixed(1), label: '当前展示均值' }
        ],
        `先看不同学科的平均合作强度，再结合当前阈值和前 ${self.sel('[data-mc-fig2-paper-topn]').node().value} 篇样例判断合作网络的密度。`
      );

      if (selected.length === 0) {
        svg.append('text').attr('x', 20).attr('y', 40).attr('fill', '#900').text('当前阈值下没有得主合作关系，请降低最小合作强度。');
        self.detailPanel.html('<h3>论文详情</h3><p>点击上方任意关系路径，查看样例论文信息。</p>');
        return;
      }

      const nodeMap = new Map();
      selected.forEach((pair) => {
        const a = getMetaForName(pair.laureate_a);
        const b = getMetaForName(pair.laureate_b);
        nodeMap.set(a.key, a);
        nodeMap.set(b.key, b);
      });

      const nodes = Array.from(nodeMap.values()).sort((a, b) => {
        const ay = a.prizeYear || 9999;
        const by = b.prizeYear || 9999;
        if (ay !== by) return ay - by;
        return a.name.localeCompare(b.name);
      });

      const years = nodes.map((n) => n.prizeYear).filter((y) => y != null);
      const minYear = d3.min(years) || 1900;
      const maxYear = d3.max(years) || 2020;
      const x = d3.scaleLinear().domain([minYear - 2, maxYear + 2]).range([24, innerW - 24]);

      const lanePadding = 18;
      const laneGap = 18;
      const laneHeight = (innerH - laneGap * (laneOrder.length - 1)) / laneOrder.length;
      const laneBounds = new Map(laneOrder.map((lane, idx) => {
        const top = idx * (laneHeight + laneGap);
        return [lane, { top, bottom: top + laneHeight, center: top + laneHeight / 2 }];
      }));

      const nodeDegree = new Map(nodes.map((n) => [n.key, 0]));
      selected.forEach((pair) => {
        const aKey = normalizeName(pair.laureate_a);
        const bKey = normalizeName(pair.laureate_b);
        nodeDegree.set(aKey, (nodeDegree.get(aKey) || 0) + 1);
        nodeDegree.set(bKey, (nodeDegree.get(bKey) || 0) + 1);
      });

      const grouped = d3.group(nodes, (d) => d.category || 'Physics');
      grouped.forEach((group, category) => {
        const bounds = laneBounds.get(category || 'Physics') || laneBounds.get('Physics');
        const usableTop = bounds.top + lanePadding;
        const usableBottom = bounds.bottom - lanePadding;
        const usableHeight = Math.max(24, usableBottom - usableTop);
        group.sort((a, b) => {
          const ay = a.prizeYear || 9999;
          const by = b.prizeYear || 9999;
          if (ay !== by) return ay - by;
          const ad = nodeDegree.get(a.key) || 0;
          const bd = nodeDegree.get(b.key) || 0;
          if (ad !== bd) return bd - ad;
          return a.name.localeCompare(b.name);
        });
        const count = group.length;
        const step = count > 1 ? usableHeight / (count - 1) : 0;
        group.forEach((node, idx) => {
          node.targetX = x(node.prizeYear || minYear);
          const jitter = seededSignedUnitInterval(node.key || node.name) * Math.min(5, step * 0.05);
          node.y = count > 1 ? usableTop + idx * step + jitter : usableTop + usableHeight / 2;
        });
        resolveVerticalCollisions(group, usableTop, usableBottom, 16, (item) => item.y);
        resolveHorizontalCollisions(group, 18, innerW - 18, 22, (item) => item.targetX);
      });

      nodes.forEach((node) => { node.x = Math.max(18, Math.min(innerW - 18, node.x)); });

      const nodeByKey = new Map(nodes.map((n) => [n.key, n]));
      const links = selected.map((pair) => {
        const source = nodeByKey.get(normalizeName(pair.laureate_a));
        const target = nodeByKey.get(normalizeName(pair.laureate_b));
        if (!source || !target) return null;
        return { ...pair, source, target };
      }).filter(Boolean);

      const linkBuckets = d3.group(links, (d) => {
        const sourceBucket = Math.round((d.source.prizeYear || minYear) / 5);
        const targetBucket = Math.round((d.target.prizeYear || minYear) / 5);
        return `${sourceBucket}|${targetBucket}|${d.source.category}|${d.target.category}`;
      });
      linkBuckets.forEach((bucket) => {
        bucket.sort((a, b) => (b.coop_weight_sum - a.coop_weight_sum) || (a.laureate_a + a.laureate_b).localeCompare(b.laureate_a + b.laureate_b));
        const center = (bucket.length - 1) / 2;
        bucket.forEach((link, idx) => { link.bendIndex = idx - center; });
      });

      svg.append('text').attr('x', width / 2).attr('y', 18).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', '#444')
        .text(`原始对数 ${totalPairs} | 阈值后 ${filtered.length} | 当前展示 ${links.length} | 得主 ${nodes.length} 人`);
      svg.append('text').attr('x', width / 2).attr('y', 36).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#666')
        .text('弧线把两位得主的合作关系连起来，线越粗表示合作越频繁；点到弧线后可在右侧查看对应论文和作者。');

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      laneOrder.forEach((lane) => {
        const bounds = laneBounds.get(lane);
        if (!bounds) return;
        g.append('rect').attr('x', 0).attr('y', bounds.top).attr('width', innerW).attr('height', laneHeight).attr('fill', lane === 'Physics' ? '#f8fbff' : lane === 'Chemistry' ? '#fffaf4' : '#fff8f8').attr('opacity', 0.8).attr('stroke', '#f0f0f0');
        g.append('text').attr('x', -8).attr('y', bounds.center + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', '#666').text(lane);
      });

      const startTick = Math.ceil(minYear / 5) * 5;
      const endTick = Math.floor(maxYear / 5) * 5;
      const tickYears = [];
      for (let yy = startTick; yy <= endTick; yy += 5) tickYears.push(yy);

      g.append('g').selectAll('line.year-grid').data(tickYears).enter().append('line').attr('class', 'year-grid')
        .attr('x1', (d) => x(d)).attr('x2', (d) => x(d)).attr('y1', 0).attr('y2', innerH).attr('stroke', '#e9e9e9').attr('stroke-width', 1).attr('stroke-dasharray', '4 4');

      g.append('g').attr('transform', `translate(0,${innerH + 20})`).call(d3.axisBottom(x).tickValues(tickYears).tickFormat(d3.format('d'))).selectAll('text').attr('font-size', 10);

      const widthScale = d3.scaleSqrt().domain([1, d3.max(links, (d) => d.coop_weight_sum) || 1]).range([1.5, 7]);
      const linkSel = g.append('g').selectAll('path').data(links).enter().append('path')
        .attr('d', (d) => {
          const bend = d.bendIndex || 0;
          const x1 = d.source.x; const x2 = d.target.x; const y1 = d.source.y; const y2 = d.target.y;
          const dx = x2 - x1;
          const span = Math.abs(dx);
          const lift = Math.max(18, Math.min(90, span * 0.24 + Math.abs(bend) * 6));
          const curveOffset = bend * 8;
          const c1x = x1 + dx * 0.32; const c2x = x2 - dx * 0.32;
          const c1y = Math.min(y1, y2) - lift + curveOffset; const c2y = Math.min(y1, y2) - lift + curveOffset;
          return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
        })
        .attr('fill', 'none').attr('stroke', (d) => categoryColors[d.source.category] || '#888888').attr('stroke-width', (d) => widthScale(d.coop_weight_sum)).attr('opacity', 0.55).style('cursor', 'pointer');

      if (animate) {
        linkSel.each(function () {
          const len = this.getTotalLength();
          d3.select(this).attr('stroke-dasharray', `${len} ${len}`).attr('stroke-dashoffset', len).transition().duration(900).ease(d3.easeCubicOut).attr('stroke-dashoffset', 0);
        });
      }

      const labelBoxes = [];
      const labelFont = '8px sans-serif';
      const measureCtx = document.createElement('canvas').getContext('2d');
      measureCtx.font = labelFont;
      function measureLabelWidth(name) { return measureCtx.measureText(name).width + 8; }
      const labelHeightEstimate = 14;
      const nodeLabelWidths = new Map(nodes.map((n) => [n.key, measureLabelWidth(n.name)]));
      const labelWidthEstimate = d3.max(nodes, (n) => nodeLabelWidths.get(n.key)) || 80;

      const placedLabels = [];
      function rectsOverlap(ax, ay, ahw, ahh, bx, by, bhw, bhh) {
        return !((ax + ahw) <= (bx - bhw) || (ax - ahw) >= (bx + bhw) || (ay + ahh) <= (by - bhh) || (ay - ahh) >= (by + bhh));
      }
      function collidesWithAnyPlaced(cx, cy, hw, hh) {
        for (const p of placedLabels) { if (rectsOverlap(cx, cy, hw, hh, p.x, p.y, p.hw, p.hh)) return true; }
        return false;
      }
      function collidesWithAnyNode(cx, cy, hw, hh, skipNode) {
        const nodeR = 9;
        const ax1 = cx - hw, ax2 = cx + hw, ay1 = cy - hh, ay2 = cy + hh;
        for (const n of nodes) {
          if (n === skipNode) continue;
          const nx = n.x || 0, ny = n.y || 0;
          const closestX = Math.max(ax1, Math.min(nx, ax2));
          const closestY = Math.max(ay1, Math.min(ny, ay2));
          const dx = nx - closestX, dy = ny - closestY;
          if (dx * dx + dy * dy < nodeR * nodeR) return true;
        }
        return false;
      }

      const hardTop = 4, hardBottom = innerH - 4, hardLeft = 8, hardRight = innerW - 8;

      function placeLabelGlobal(node, laneKey) {
        const bounds = laneBounds.get(laneKey) || laneBounds.get('Physics');
        const softTop = bounds.top + 4;
        const softBottom = bounds.bottom - 4;
        const centerX = node.x;
        const centerY = node.y;
        const hw = (nodeLabelWidths.get(node.key) || 60) / 2;
        const hh = labelHeightEstimate / 2;
        const dir = centerX < innerW / 2 ? -1 : 1;
        const offsets = [];
        for (const dy of [0, -8, 8, -16, 16, -24, 24, -32, 32, -40, 40]) offsets.push({ dx: dir * (hw + 10), dy });
        for (const dy of [-(hh + 10), hh + 10, -(hh + 20), hh + 20, -(hh + 30), hh + 30, -(hh + 40), hh + 40]) offsets.push({ dx: 0, dy });
        for (const dy of [0, -8, 8, -16, 16, -24, 24]) offsets.push({ dx: -dir * (hw + 10), dy });
        for (const dy of [-50, 50]) offsets.push({ dx: dir * (hw + 10), dy });
        for (const dy of [0, -8, 8, -16, 16, -24, 24]) offsets.push({ dx: dir * (hw + 20), dy });
        for (const dy of [-(hh + 50), hh + 50]) offsets.push({ dx: 0, dy });
        for (const dy of [-32, 32, -40, 40]) offsets.push({ dx: dir * (hw + 20), dy });
        for (const dy of [-16, 16]) offsets.push({ dx: -dir * (hw + 20), dy });

        const candidates = [];
        for (const off of offsets) {
          const cx = centerX + off.dx; const cy = centerY + off.dy;
          const clampedX = Math.max(hardLeft + hw, Math.min(hardRight - hw, cx));
          const clampedY = Math.max(hardTop + hh, Math.min(hardBottom - hh, cy));
          const overflowsLane = clampedY < softTop || clampedY > softBottom;
          const anchor = off.dx > 5 ? (dir < 0 ? 'end' : 'start') : off.dx < -5 ? (dir < 0 ? 'start' : 'end') : 'middle';
          candidates.push({ x: clampedX, y: clampedY, anchor, overflowsLane });
        }

        let best = null;
        let bestScore = Infinity;
        for (const cand of candidates) {
          if (collidesWithAnyPlaced(cand.x, cand.y, hw, hh) || collidesWithAnyNode(cand.x, cand.y, hw, hh, node)) continue;
          const dist = Math.abs(cand.x - centerX) + Math.abs(cand.y - centerY);
          const score = dist + (cand.overflowsLane ? 80 : 0);
          if (score < bestScore) { bestScore = score; best = cand; }
        }

        if (!best) {
          const stepX = Math.max(20, hw * 2 + 4);
          const stepY = labelHeightEstimate + 4;
          for (let gy = hardTop + hh; gy <= hardBottom - hh; gy += stepY) {
            for (let gx = hardLeft + hw; gx <= hardRight - hw; gx += stepX) {
              if (collidesWithAnyPlaced(gx, gy, hw, hh) || collidesWithAnyNode(gx, gy, hw, hh, node)) continue;
              const dist = Math.abs(gx - centerX) + Math.abs(gy - centerY);
              const overflows = gy < softTop || gy > softBottom;
              const score = dist + (overflows ? 80 : 0);
              if (score < bestScore) { bestScore = score; best = { x: gx, y: gy, anchor: gx > centerX ? 'start' : gx < centerX ? 'end' : 'middle', overflowsLane: overflows }; }
            }
          }
        }

        if (!best) {
          const fx = Math.max(hardLeft + hw, Math.min(hardRight - hw, centerX + dir * (hw + 10)));
          const fy = Math.max(hardTop + hh, Math.min(hardBottom - hh, centerY));
          best = { x: fx, y: fy, anchor: dir < 0 ? 'end' : 'start', overflowsLane: false };
        }

        placedLabels.push({ x: best.x, y: best.y, hw, hh, node });
        return best;
      }

      const nodesSorted = nodes.slice().sort((a, b) => {
        const ad = nodeDegree.get(a.key) || 0;
        const bd = nodeDegree.get(b.key) || 0;
        if (ad !== bd) return bd - ad;
        return (a.name || '').localeCompare(b.name || '');
      });
      nodesSorted.forEach((node) => {
        const laneKey = node.category || 'Physics';
        const result = placeLabelGlobal(node, laneKey);
        labelBoxes.push({ node, laneKey, labelX: result.x, labelY: result.y, labelAnchor: result.anchor });
      });

      const nodeSel = g.append('g').selectAll('g').data(nodes).enter().append('g').attr('transform', (d) => `translate(${d.x},${d.y})`);
      nodeSel.append('circle').attr('r', 6).attr('fill', (d) => categoryColors[d.category] || '#888888').attr('stroke', '#fff').attr('stroke-width', 1.5).style('cursor', 'pointer');

      g.append('g').selectAll('line').data(labelBoxes).enter().append('line')
        .attr('x1', (d) => d.labelX).attr('y1', (d) => d.labelY).attr('x2', (d) => d.node.x || 0).attr('y2', (d) => d.node.y || 0)
        .attr('stroke', 'rgba(80,80,80,0.3)').attr('stroke-width', 0.8).attr('stroke-linecap', 'round');

      const labelSel = g.append('g').selectAll('g').data(labelBoxes).enter().append('g').attr('transform', (d) => `translate(${d.labelX},${d.labelY})`);
      labelSel.append('text').attr('x', 0).attr('y', 3).attr('text-anchor', (d) => d.labelAnchor).attr('font-size', 8).attr('fill', '#2d2d2d')
        .attr('paint-order', 'stroke').attr('stroke', 'rgba(255,255,255,0.95)').attr('stroke-width', 2.5).attr('stroke-linejoin', 'round').text((d) => `${d.node.name}`);

      function resetHighlight() {
        linkSel.attr('opacity', 0.55).attr('stroke-linecap', 'butt');
        nodeSel.select('circle').attr('r', 6).attr('stroke-width', 1.5);
      }

      linkSel
        .on('mouseover', (event, d) => {
          linkSel.attr('opacity', (item) => item === d ? 0.95 : 0.12).attr('stroke-linecap', (item) => item === d ? 'round' : 'butt');
          nodeSel.select('circle').attr('r', (item) => (item.key === d.source.key || item.key === d.target.key) ? 8 : 5).attr('stroke-width', (item) => (item.key === d.source.key || item.key === d.target.key) ? 2.2 : 1.2);
          tip.style('opacity', 1).html(`${d.laureate_a} ↔ ${d.laureate_b}<br/>合作强度：${d.coop_weight_sum}<br/>点击查看论文详情`).style('left', (event.pageX + 10) + 'px').style('top', (event.pageY + 10) + 'px');
        })
        .on('mouseout', () => { resetHighlight(); tip.style('opacity', 0); })
        .on('click', (_, d) => renderDetail(d));

      nodeSel
        .on('mouseover', (event, d) => {
          const related = new Set();
          links.forEach((link) => { if (link.source.key === d.key || link.target.key === d.key) related.add(link); });
          linkSel.attr('opacity', (item) => related.has(item) ? 0.9 : 0.1);
          nodeSel.select('circle').attr('r', (item) => item.key === d.key ? 8 : 5);
          tip.style('opacity', 1).html(`${d.name}<br/>学科：${d.category}<br/>奖年：${d.prizeYear || 'N/A'}`).style('left', (event.pageX + 10) + 'px').style('top', (event.pageY + 10) + 'px');
        })
        .on('mouseout', () => { resetHighlight(); tip.style('opacity', 0); })
        .on('click', (event, d) => {
          if (currentAuthorKey === d.key) {
            renderAuthorPlaceholder();
            return;
          }
          renderAuthorDetail(d);
        });

      renderDetailPlaceholder();
      renderAuthorPlaceholder();

      if (selected[0]) {
        renderDetail(selected[0]);
        const defaultAuthor = getMetaForName(selected[0].laureate_a) || getMetaForName(selected[0].laureate_b);
        if (defaultAuthor) renderAuthorDetail(defaultAuthor);
      }

      self.sel('[data-mc-fig2-paper-topn]').on('change', () => { if (currentPair) renderDetail(currentPair); });
    }

    // 控件变更：使用缓存数据重绘，不再重新拉取 CSV
    this.sel('[data-mc-fig2-minw]').on('change', () => { svg.selectAll('*').remove(); this.renderFig2(); });
    this.sel('[data-mc-fig2-topn]').on('change', () => { svg.selectAll('*').remove(); this.renderFig2(); });
    this.sel('[data-mc-fig2-animate]').on('change', () => { svg.selectAll('*').remove(); this.renderFig2(); });

    render();
  }

  /* ================================================================ *
   * 图 3：得主互引代际热力图
   * ================================================================ */
  renderFig3() {
    const tip = this.tip;
    const edges = this.fig3Edges;
    const { w, h } = this.metrics();
    const svgW = w;
    const svgH = Math.max(280, h - 8);

    const svg = this.sel('[data-mc-svg="3"]');
    svg.attr('width', svgW).attr('height', svgH).attr('viewBox', `0 0 ${svgW} ${svgH}`);
    svg.selectAll('*').remove();

    const width = svgW - 80;
    const height = svgH - 80;
    const self = this;
    const activeDiscipline = this.fig3Discipline || 'Physics';
    const activeLabel = FIG3_DISCIPLINE_LABELS[activeDiscipline] || activeDiscipline;

    this.fig3DisciplineButtons.forEach((button) => {
      const active = button.dataset.mcFig3Discipline === activeDiscipline;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    function render() {
      const minw = +self.sel('[data-mc-fig3-minw]').node().value;
      const granularity = self.sel('[data-mc-fig3-granularity]').node().value;

      const granularityLabel = granularity === 'year' ? '年份' : granularity === 'five' ? '五年' : '十年';

      const es = edges
        .filter((e) => e.source_pub_year != null && e.target_pub_year != null)
        .filter((e) => e.source_pub_year >= e.target_pub_year)
        .filter((e) => {
          const meta = self.metaByKey.get(normalizeName(e.target));
          return meta ? meta.category === activeDiscipline : false;
        });

      const bucket = (y) => {
        if (y == null || !isFinite(y)) return null;
        if (granularity === 'year') return `${y}`;
        if (granularity === 'five') return `${Math.floor(y / 5) * 5}`;
        return `${Math.floor(y / 10) * 10}s`;
      };

      const agg = new Map();
      es.forEach((e) => {
        const sb = bucket(e.source_pub_year);
        const tb = bucket(e.target_pub_year);
        if (!sb || !tb) return;
        const key = `${sb}|||${tb}`;
        if (!agg.has(key)) agg.set(key, { source_bucket: sb, target_bucket: tb, citation_sum: 0, edge_count: 0 });
        const cell = agg.get(key);
        cell.citation_sum += (e.citation_count || 0);
        cell.edge_count += 1;
      });

      const cells = Array.from(agg.values()).filter((d) => d.edge_count >= minw);

      const categoryTotals = new Map([
        ['Physics', { sum: 0, count: 0 }],
        ['Chemistry', { sum: 0, count: 0 }],
        ['Medicine', { sum: 0, count: 0 }]
      ]);
      const resolveCategory = (name) => {
        const meta = self.metaByKey.get(normalizeName(name));
        return meta && categoryTotals.has(meta.category) ? meta.category : null;
      };
      es.forEach((e) => {
        const category = resolveCategory(e.target);
        if (!category) return;
        const bucketStats = categoryTotals.get(category);
        bucketStats.sum += Math.max(0, (e.source_pub_year || 0) - (e.target_pub_year || 0));
        bucketStats.count += 1;
      });
      const avgByCategory = (category) => {
        const stats = categoryTotals.get(category);
        return stats && stats.count > 0 ? stats.sum / stats.count : null;
      };
      const overallAvg = es.length ? d3.mean(es, (d) => Math.max(0, (d.source_pub_year || 0) - (d.target_pub_year || 0))) : null;
      const activeAvg = avgByCategory(activeDiscipline);

      self.setSummary(
        `图 3 · 内部引用热力 · ${activeLabel}`,
        [
          { value: activeLabel, label: '当前学科' },
          { value: activeAvg == null ? '—' : activeAvg.toFixed(1), label: '平均回溯年数' },
          { value: cells.length, label: '满足阈值的格子数' },
          { value: overallAvg == null ? '—' : overallAvg.toFixed(1), label: '当前平均回溯年数' }
        ],
        '先点上方学科按钮切换物理、化学、生物，再看色块深浅判断哪些时间段的引用最集中。'
      );

      svg.append('text')
        .attr('x', svgW / 2)
        .attr('y', 22)
        .attr('text-anchor', 'middle')
        .attr('font-size', 15)
        .attr('font-weight', 'bold')
        .attr('fill', '#222')
        .text(`内部引用热力（${activeLabel}）`);

      svg.append('text')
        .attr('x', svgW / 2)
        .attr('y', 42)
        .attr('text-anchor', 'middle')
        .attr('font-size', 11)
        .attr('fill', '#666')
        .text(`粒度：${granularityLabel} · 最小引用论文数：${minw} · 颜色越深=引用论文数越多`);

      if (cells.length === 0) {
        svg.append('text').attr('x', 20).attr('y', 40).text('当前阈值过高，已没有满足条件的格子。请把“最小引用论文数”调低到 1 或 2。').attr('fill', '#900');
        return;
      }

      const xBuckets = Array.from(new Set(cells.map((d) => d.source_bucket))).sort();
      const yBuckets = Array.from(new Set(cells.map((d) => d.target_bucket))).sort();

      const g = svg.append('g').attr('transform', 'translate(60,40)');
      const x = d3.scaleBand().domain(xBuckets).range([0, width]).padding(0.05);
      const y = d3.scaleBand().domain(yBuckets).range([height, 0]).padding(0.05);
      const maxEdge = d3.max(cells, (d) => d.edge_count) || 1;
      const c = d3.scaleSequential((t) => d3.interpolateRgb('#fffde7', '#b71c1c')(Math.pow(t, 0.6))).domain([0, maxEdge]);

      g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).tickSizeOuter(0)).selectAll('text').attr('font-size', 10).attr('transform', 'rotate(-35)').style('text-anchor', 'end');
      g.append('g').call(d3.axisLeft(y).tickSizeOuter(0)).selectAll('text').attr('font-size', 10);

      g.selectAll('rect.cell').data(cells).enter().append('rect').attr('class', 'cell')
        .attr('x', (d) => x(d.source_bucket)).attr('y', (d) => y(d.target_bucket))
        .attr('width', x.bandwidth()).attr('height', y.bandwidth())
        .attr('fill', (d) => c(d.edge_count)).attr('stroke', '#fff')
        .on('mouseover', (event, d) => {
          tip.style('opacity', 1).html(`来源论文发表年:${d.source_bucket}<br/>被引论文发表年:${d.target_bucket}<br/>引用论文数:${d.edge_count}<br/>累计引用次数:${d.citation_sum}`)
            .style('left', (event.pageX + 8) + 'px').style('top', (event.pageY + 8) + 'px');
        })
        .on('mouseout', () => tip.style('opacity', 0));

      g.append('text').attr('x', width / 2).attr('y', height + 72).attr('text-anchor', 'middle').attr('font-size', 12).attr('font-weight', 'bold').text('来源论文发表年');
      g.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -45).attr('text-anchor', 'middle').attr('font-size', 11).text('被引论文发表年');
    }

    this.sel('[data-mc-fig3-minw]').on('change', () => { svg.selectAll('*').remove(); this.renderFig3(); });
    this.sel('[data-mc-fig3-granularity]').on('change', () => { svg.selectAll('*').remove(); this.renderFig3(); });
    render();
  }
}

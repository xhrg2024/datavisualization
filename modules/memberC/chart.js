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
    this._resizeRaf = null;

    // 浮动提示框（绑定在 body 上，使用 pageX/pageY 定位）
    this.tip = d3.select('body').append('div').attr('class', 'mc-tooltip').style('opacity', 0);

    this.installSwitcher();
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

    const prev = this.root.querySelector('[data-mc-prev]');
    const next = this.root.querySelector('[data-mc-next]');
    prev?.addEventListener('click', () => this.switchTo(this.activeIndex - 1));
    next?.addEventListener('click', () => this.switchTo(this.activeIndex + 1));

    this.applyTrackTransform();
  }

  applyTrackTransform() {
    if (this.track) {
      this.track.style.transform = `translateX(-${this.activeIndex * (100 / PANEL_COUNT)}%)`;
    }
    this.tabs.forEach((tab, idx) => tab.classList.toggle('is-active', idx === this.activeIndex));
    this.dots.forEach((dot, idx) => dot.classList.toggle('is-active', idx === this.activeIndex));
  }

  switchTo(index) {
    const target = Math.max(0, Math.min(index, PANEL_COUNT - 1));
    if (target === this.activeIndex && this.rendered[target]) return;
    this.activeIndex = target;
    this.applyTrackTransform();
    // 首次切换到某图时按需绘制（懒渲染，保证切换顺畅）
    if (this.dataLoaded && !this.rendered[target]) {
      this.renderPanel(target);
    }
  }

  /* ----- 尺寸度量 ----- */
  metrics() {
    const vp = this.root.querySelector('.mc-viewport');
    const rect = vp ? vp.getBoundingClientRect() : { width: 720, height: 560 };
    const w = Math.max(360, Math.floor(rect.width) - 28);
    const h = Math.max(360, Math.floor(rect.height) - 16);
    return { w, h };
  }

  /* ----- 数据加载（重活，支持懒加载）----- */
  async loadData(base) {
    if (this.dataLoaded || this.loading) return this;
    this.loading = true;
    const b = base && base.endsWith('/') ? base : `${base || './data/memberC/'}/`.replace(/\/+$/, '/');

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
    const svgH = Math.max(320, h - 150);

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

      const x = d3.scaleBand().domain(decades).range([0, width]).padding(0.5);
      const sortedCounts = allCounts.filter((d) => d > 0).sort((a, b) => a - b);
      const meanVal = sortedCounts.length > 0 ? d3.mean(sortedCounts) : 5;
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
    const svgH = Math.max(440, h - 60);

    const svg = this.sel('[data-mc-svg="2"]');
    svg.attr('width', svgW).attr('height', svgH).attr('viewBox', `0 0 ${svgW} ${svgH}`);
    svg.selectAll('*').remove();

    const width = svgW;
    const height = svgH;
    const side = Math.min(170, Math.max(64, Math.round(width * 0.16)));
    const margin = { top: 60, right: side, bottom: 80, left: side };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const detailPanel = this.sel('[data-mc-fig2-detail]');
    const authorPanel = this.sel('[data-mc-fig2-author]');
    let currentPair = null;

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

    function renderDetail(pair) {
      currentPair = pair;
      const paperTopN = Math.max(1, parseNumber(self.sel('[data-mc-fig2-paper-topn]').node().value) || 5);
      const papers = (pair.sample_papers || []).slice().sort((a, b) => (parseNumber(b.score) || 0) - (parseNumber(a.score) || 0)).slice(0, paperTopN);
      if (papers.length === 0) {
        detailPanel.html(`<h3>${pair.laureate_a} ↔ ${pair.laureate_b}</h3><p>合作强度：<strong>${pair.coop_weight_sum}</strong></p><p>暂无样例论文。</p>`);
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
      detailPanel.html(`<h3>${pair.laureate_a} ↔ ${pair.laureate_b}</h3><p>合作篇数：<strong>${pair.coop_weight_sum}</strong>，展示评分最高的前 <strong>${paperTopN}</strong> 篇论文。</p><p>样例论文：</p><ul>${html}</ul>`);
    }

    function renderAuthorDetail(node) {
      if (!node) return;
      const idx = (seededHash(node.key) % 8) + 1;
      const img = `${self.imageBase}placeholder_${idx}.svg`;
      const awardReason = (node.laureateId ? motivationById.get(String(node.laureateId)) : '') || motivationByKey.get(node.key) || '';
      authorPanel.html(`
        <img src="${img}" alt="${node.name}" />
        <div class="meta">
          <h4>${node.name}</h4>
          <p>学科：${node.category || 'N/A'}</p>
          <p>获奖年份：${node.prizeYear || 'N/A'}</p>
          <p>节点键：${node.key}</p>
          ${awardReason ? `<p>获奖原因：${awardReason}</p>` : ''}
        </div>`);
    }

    function render() {
      const minw = +self.sel('[data-mc-fig2-minw]').node().value;
      const topn = +self.sel('[data-mc-fig2-topn]').node().value;
      const animate = self.sel('[data-mc-fig2-animate]').node().checked;
      const totalPairs = pairs.length;

      const filtered = pairs.filter((d) => d.coop_weight_sum >= minw).sort((a, b) => b.coop_weight_sum - a.coop_weight_sum);
      const selected = filtered.slice(0, topn);

      if (selected.length === 0) {
        svg.append('text').attr('x', 20).attr('y', 40).attr('fill', '#900').text('当前阈值下没有得主合作关系，请降低最小合作强度。');
        detailPanel.html('<h3>论文详情</h3><p>点击上方任意关系路径，查看样例论文信息。</p>');
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
        .text(`当前仅渲染前 ${topn} 条最强关系；要看全部 ${filtered.length} 条，请把“最多关系条数”调大。`);

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
        .on('click', (event, d) => renderAuthorDetail(d));

      detailPanel.html('<h3>论文详情</h3><p>点击上方任意关系路径，查看评分最高的样例论文。</p>');

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
    const svgH = Math.max(340, h - 150);

    const svg = this.sel('[data-mc-svg="3"]');
    svg.attr('width', svgW).attr('height', svgH).attr('viewBox', `0 0 ${svgW} ${svgH}`);
    svg.selectAll('*').remove();

    const width = svgW - 80;
    const height = svgH - 80;
    const self = this;

    function render() {
      const minw = +self.sel('[data-mc-fig3-minw]').node().value;
      const granularity = self.sel('[data-mc-fig3-granularity]').node().value;

      const es = edges.filter((e) => e.source_pub_year != null && e.target_pub_year != null).filter((e) => e.source_pub_year >= e.target_pub_year);

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

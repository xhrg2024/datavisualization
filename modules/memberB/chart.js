const d3 = globalThis.d3;

if (!d3) {
  throw new Error('D3.js is required for TrajectoryChart.');
}

const CATEGORY_COLORS = {
  Physics: '#1d3f36',
  Chemistry: '#d25d3d',
  Medicine: '#d8a83e'
};

const CATEGORY_LABELS = {
  Physics: '物理',
  Chemistry: '化学',
  Medicine: '医学'
};

const PALETTE = {
  ink: '#14251f',
  muted: '#65736d',
  grid: 'rgba(19, 33, 29, 0.12)',
  blue: '#1d3f36',
  rust: '#d25d3d',
  gold: '#d8a83e',
  amber: '#ffb35c',
  paper: 'rgba(255, 250, 240, 0.9)'
};

const VIEW_COPY = {
  trajectory: {
    title: '学术生命周期对齐',
    notes: [
      '以每位得主的首篇论文年份为原点（T+0），横轴表示学术年龄，追踪学术产出随时间的变化轨迹。',
      '主图橙色面积图展示平均年发表量，虚线标注平均获奖学术年龄T+28，说明诺奖级成果需近三十年积累。',
      '下图展示引用影响力趋势：红色线表示平均引用数，金色虚线表示FWCI（领域加权引用影响力）。',
      'FWCI反映论文引用相对于同领域同年代论文的平均水平，FWCI>1表示高于平均，<1表示低于平均。',
      '三学科FWCI差异显著：物理学家最高（11.5），医学家次之（9.5），化学家最低（6.7）。',
      '这种差异反映了不同学科的引用文化：物理理论工作引用集中，化学实验工作引用分散。'
    ]
  },
  comparison: {
    title: '获奖前后产出对比',
    notes: [
      '堆叠条形图直观展示每位得主获奖前（蓝色）与获奖后（金色）的论文产出对比。',
      '三学科差异显著：化学家获奖前产出最高（平均167篇），医学居中（92篇），物理最少（68篇）。',
      '普遍规律：多数得主在获奖前已积累大部分成果，获奖后产出明显下降，降幅约31-43%。',
      '化学家获奖后下降幅度最大（43%），可能与转向行政职务或大型项目协调有关。',
      '医学家获奖后下降幅度最小（32%），反映医学研究的持续性特点。',
      '这一现象揭示：诺贝尔奖更多是对过往卓越成就的肯定，而非对未来产出的激励。'
    ]
  },
  heatmap: {
    title: '黄金创作期分布',
    notes: [
      '三个热力图分别展示物理、化学、医学三学科的创新高峰时空分布，横轴为年代，纵轴为学术年龄。',
      '颜色深浅表示该时空点的得主数量，越深代表该年代该年龄段处于高峰期的得主越多。',
      '峰值标注显示各学科产出最集中的年代和年龄段，揭示创新高峰的时空规律。',
      '化学家高峰最早：多在T+20至T+30年间达到产出峰值，与实验化学的积累特性相关。',
      '医学家高峰居中：通常在T+25至T+35年间，反映临床医学需要长期实践积累。',
      '物理学家高峰最晚：常在T+30至T+40年间，说明理论物理突破需要更长时间的深度思考。'
    ]
  },
  evolution: {
    title: '得主画像演变',
    notes: [
      '上图展示1901-2024年间各年代得主平均获奖年龄的演变趋势，可见明显的时代变迁。',
      '下图展示各年代得主平均论文产出的变化情况，反映科研产出模式的历史演变。',
      '关键发现：20世纪早期获奖年龄较早（T+22左右），21世纪明显推迟（T+32左右）。',
      '论文产出在近几十年大幅增长：化学家平均261篇最多，物理学家111篇最少。',
      '不同学科用不同颜色区分，鼠标悬停可查看具体年代、学科的平均值和得主数量。',
      '这种演变趋势反映了科研环境的变化：从个人天才时代走向大型团队协作时代。'
    ]
  },
  rhythm: {
    title: '产出节奏分型',
    notes: [
      '上图展示三学科得主产出集中度（Top3年份产出占总产出比例）的分布情况。',
      '每条横线代表一个学科，圆点代表个体得主，竖线表示该学科的平均集中度。',
      '集中度反映产出节奏：高集中度表示少数年份爆发式高产，低集中度表示持续稳定产出。',
      '下图展示典型高集中度与低集中度得主的产出轨迹面积图对比，直观呈现节奏差异。',
      '学科差异：物理学家更倾向高集中度（突破型），化学家分布较均匀（积累型）。',
      '这种差异揭示了科学创新的多样性：有的学者靠关键突破成名，有的靠持续积累立足。'
    ]
  },
  cohort: {
    title: '世代对比分析',
    notes: [
      '上图展示不同出生年代、不同学科得主的平均获奖学术年龄热力图，色块颜色深浅表示数值大小。',
      '下图展示不同出生年代、不同学科得主的平均学术生涯长度热力图，揭示世代间的显著差异。',
      '横向对比：同一世代不同学科的获奖年龄存在明显差异，化学家平均T+30年，医学家T+29年，物理学家T+26年。',
      '纵向对比：早期世代获奖年龄较早，现代世代明显推迟，整体平均学术年龄为T+28。',
      '关键发现：化学家获奖年龄最晚，反映实验化学需要长期积累；物理学家最早，体现理论突破的时效性。',
      '这种演变揭示了科研制度的历史变迁：从个人天才时代到大型团队协作时代的转变。'
    ]
  },
  radar: {
    title: '个人差异雷达',
    notes: [
      '左图雷达图对比高产组（Top 25%，蓝色实线）与低产组（Bottom 25%，金色虚线）的五维特征。',
      '五个维度：获奖学术年龄、生涯长度、总引用、获奖前产出、获奖生理年龄，全面刻画学者特征。',
      '右图散点图展示所有得主的论文产出与引用影响力关系，虚线将散点分为四个象限。',
      '高产组特征：学术生涯更长（平均55年）、获奖前产出更多（平均451篇）、总引用更高（平均5.7万次）。',
      '低产组特征：获奖年龄更早（平均T+19年）、学术生涯较短（平均26年），代表早期突破型成功路径。',
      '这一对比揭示科学创新的多样性：没有唯一的成功模式，广度与深度都能通向诺贝尔奖。'
    ]
  }
};

export class TrajectoryChart {
  constructor(containerSelector, bus) {
    this.container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    this.bus = bus;
    this.data = null;
    this.view = 'trajectory';

    const page = this.container.closest('[data-module="trajectory"]');
    this.panel = page?.querySelector('[data-notes]');
    this.kpis = page?.querySelector('[data-kpis]');
    this.tabs = Array.from(page?.querySelectorAll('[data-view]') ?? []);

    this.svg = d3.select(this.container).append('svg').attr('class', 'member-b-svg');
    this.tooltip = d3.select(this.container)
      .append('div')
      .attr('class', 'member-b-tooltip')
      .style('opacity', 0);

    this.showTip = (event, html) => {
      const bounds = this.container.getBoundingClientRect();
      this.tooltip
        .html(html)
        .style('left', (event.clientX - bounds.left + 14) + 'px')
        .style('top', (event.clientY - bounds.top + 14) + 'px')
        .style('opacity', 1);
    };
    this.hideTip = () => this.tooltip.style('opacity', 0);

    this.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        this.view = tab.dataset.view;
        this.tabs.forEach((item) => item.classList.toggle('is-active', item === tab));
        this.update();
      });
    });

    // 监听容器尺寸变化，自动重绘
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => {
        if (this.data) this.update();
      });
      this._ro.observe(this.container);
    }
  }

  async loadData(url) {
    const memberData = await fetch(url).then((response) => response.json());
    this.data = memberData;
    this.render();
    return this;
  }

  render() { this.update(); }
  resize() { this.update(); }

  update() {
    if (!this.data || !this.container) return;

    const bounds = this.container.getBoundingClientRect();
    this.width = Math.max(620, bounds.width);
    const heights = {
      trajectory: 1050, comparison: 1300, heatmap: 890,
      evolution: 650, rhythm: 590, cohort: 730, radar: 600
    };
    this.height = heights[this.view] || 820;
    this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`).style('height', `${this.height}px`);
    // Ensure the white background tightly wraps the SVG
    const visual = this.container.closest('.member-b-visual');
    if (visual) visual.style.setProperty('min-height', `${this.height + 16}px`, 'important');
    this.svg.selectAll('*').remove();

    this.renderPanel();
    if (this.view === 'trajectory') this.drawTrajectory();
    if (this.view === 'comparison') this.drawComparison();
    if (this.view === 'heatmap') this.drawHeatmap();
    if (this.view === 'evolution') this.drawEvolution();
    if (this.view === 'rhythm') this.drawRhythm();
    if (this.view === 'cohort') this.drawCohort();
    if (this.view === 'radar') this.drawRadar();
  }

  renderPanel() {
    const copy = VIEW_COPY[this.view];
    const kpis = this.getKpis();
    if (this.kpis) {
      this.kpis.innerHTML = kpis.map((item) => `
        <div class="member-b-kpi">
          <strong>${item.value}</strong>
          <span>${item.label}</span>
        </div>
      `).join('');
    }
    if (this.panel) {
      this.panel.innerHTML = `
        <h3>${copy.title}</h3>
        <ul>${copy.notes.map((item) => `<li>${item}</li>`).join('')}</ul>
      `;
    }
  }

  getKpis() {
    const summary = this.data.summary;
    const fmt = (v, d = 1) => (v == null || isNaN(v)) ? '—' : Number(v).toFixed(d);
    if (this.view === 'trajectory') {
      return [
        { value: summary.total_laureates, label: '得主总数' },
        { value: fmt(summary.avg_career_length, 1) + '年', label: '平均学术生涯' },
        { value: Math.round(summary.avg_papers || 0), label: '平均论文数' },
        { value: 'T+' + Math.round(summary.avg_prize_age), label: '平均获奖年龄' }
      ];
    }
    if (this.view === 'comparison') {
      const catData = summary.by_category;
      return [
        { value: summary.total_laureates, label: '得主总数' },
        { value: Math.round(catData.Physics.avg_papers), label: '物理平均论文' },
        { value: Math.round(catData.Chemistry.avg_papers), label: '化学平均论文' },
        { value: Math.round(catData.Medicine.avg_papers), label: '医学平均论文' }
      ];
    }
    if (this.view === 'heatmap') {
      const peakAge = summary.avg_peak_age || summary.avg_prize_age;
      return [
        { value: summary.total_laureates, label: '得主总数' },
        { value: 'T+' + Math.round(peakAge), label: '平均高峰年龄' },
        { value: Math.round(summary.avg_prize_age), label: '平均获奖年龄' },
        { value: fmt(summary.avg_career_length, 1) + '年', label: '平均学术生涯' }
      ];
    }
    if (this.view === 'evolution') {
      const catData = summary.by_category;
      return [
        { value: summary.total_laureates, label: '得主总数' },
        { value: Math.round(catData.Chemistry.avg_papers), label: '化学平均论文' },
        { value: Math.round(catData.Medicine.avg_papers), label: '医学平均论文' },
        { value: Math.round(catData.Physics.avg_papers), label: '物理平均论文' }
      ];
    }
    if (this.view === 'rhythm') {
      const catData = summary.by_category;
      return [
        { value: summary.total_laureates, label: '得主总数' },
        { value: fmt(catData.Physics.avg_career_length, 1) + '年', label: '物理平均生涯' },
        { value: fmt(catData.Chemistry.avg_career_length, 1) + '年', label: '化学平均生涯' },
        { value: fmt(catData.Medicine.avg_career_length, 1) + '年', label: '医学平均生涯' }
      ];
    }
    if (this.view === 'cohort') {
      return [
        { value: summary.total_laureates, label: '得主总数' },
        { value: 'T+' + Math.round(summary.avg_prize_age), label: '平均获奖年龄' },
        { value: fmt(summary.avg_career_length, 1) + '年', label: '平均学术生涯' },
        { value: Math.round(summary.avg_papers), label: '平均论文数' }
      ];
    }
    if (this.view === 'radar') {
      return [
        { value: summary.total_laureates, label: '得主总数' },
        { value: Math.round(summary.avg_papers), label: '平均论文数' },
        { value: 'T+' + Math.round(summary.avg_prize_age), label: '平均获奖年龄' },
        { value: fmt(summary.avg_career_length, 1) + '年', label: '平均学术生涯' }
      ];
    }
    return [];
  }

  /* ---- helpers ---- */

  chartTitle(title, x = 22, y = 30) {
    this.svg.append('text').attr('class', 'member-b-title').attr('x', x).attr('y', y).text(title);
  }

  interactionHint(text = '将鼠标移到图形上可动态查看详细数据') {
    this.svg.append('text')
      .attr('class', 'member-b-hint')
      .attr('x', this.width - 24)
      .attr('y', 30)
      .attr('text-anchor', 'end')
      .text(text);
  }

  sectionTitle(group, title, x, y) {
    group.append('text').attr('class', 'member-b-section-title').attr('x', x).attr('y', y).text(title);
  }

  axisBottom(group, scale, ticks = 6) {
    group.attr('class', 'member-b-axis').call(d3.axisBottom(scale).ticks(ticks).tickSizeOuter(0));
  }

  axisLeft(group, scale, ticks = 5) {
    group.attr('class', 'member-b-axis').call(d3.axisLeft(scale).ticks(ticks).tickSizeOuter(0));
  }

  drawLegend(items, x, y, columns = 3) {
    const legend = this.svg.append('g').attr('class', 'member-b-legend').attr('transform', `translate(${x},${y})`);
    items.forEach((item, index) => {
      const row = legend.append('g').attr('transform', `translate(${(index % columns) * 86},${Math.floor(index / columns) * 18})`);
      row.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', item.color);
      row.append('text').attr('x', 16).attr('y', 9).text(item.label);
    });
  }

  aggregateTrajectories(laureates) {
    const yearBuckets = {};
    laureates.forEach((l) => {
      if (!l.aligned_trajectory) return;
      l.aligned_trajectory.forEach((t) => {
        const year = Math.min(60, Math.max(0, t.relative_year));
        if (!yearBuckets[year]) {
          yearBuckets[year] = { papers: 0, count: 0, citations: 0, fwci: 0 };
        }
        yearBuckets[year].papers += t.papers;
        yearBuckets[year].count += 1;
        if (t.citations != null) yearBuckets[year].citations += t.citations;
        if (t.avg_fwci != null) yearBuckets[year].fwci += t.avg_fwci;
      });
    });
    return Object.entries(yearBuckets)
      .map(([year, data]) => ({
        relativeYear: parseInt(year),
        avgPapers: data.papers / data.count,
        avgCitations: data.citations / data.count,
        avgFwci: data.fwci / data.count,
        count: data.count
      }))
      .sort((a, b) => a.relativeYear - b.relativeYear);
  }

  aggregateTrajectoriesByCategory(laureates) {
    const result = {};
    const categories = Object.keys(CATEGORY_COLORS);
    categories.forEach((cat) => {
      const yearBuckets = {};
      const group = laureates.filter((l) => l.category === cat);
      group.forEach((l) => {
        if (!l.aligned_trajectory) return;
        l.aligned_trajectory.forEach((t) => {
          const year = Math.min(60, Math.max(0, t.relative_year));
          if (!yearBuckets[year]) {
            yearBuckets[year] = { papers: 0, count: 0 };
          }
          yearBuckets[year].papers += t.papers;
          yearBuckets[year].count += 1;
        });
      });
      result[cat] = Object.entries(yearBuckets)
        .map(([year, data]) => ({
          relativeYear: parseInt(year),
          avgPapers: data.papers / data.count,
          count: data.count
        }))
        .sort((a, b) => a.relativeYear - b.relativeYear);
    });
    return result;
  }

  /* ---- View 1: Trajectory ---- */

  drawTrajectory() {
    this.chartTitle('学术生命周期对齐 — 以首篇论文为原点');
    this.interactionHint();

    const laureates = this.data.laureates;
    const trajectoryData = this.aggregateTrajectories(laureates);
    const catTrajectories = this.aggregateTrajectoriesByCategory(laureates);

    // ---- Main chart: area chart ----
    const m = { top: 78, right: 54, bottom: 54, left: 58 };
    const chartH = 340;
    const innerWidth = this.width - m.left - m.right;
    const g = this.svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    const xDomain = [0, d3.max(trajectoryData, (d) => d.relativeYear) || 60];
    const yMax = d3.max(trajectoryData, (d) => d.avgPapers) || 10;
    const x = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, yMax * 1.12]).nice().range([chartH, 0]);

    // defs: gradient for area
    const defs = this.svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'member-b-area-grad').attr('x1', '0%').attr('x2', '0%').attr('y1', '0%').attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', PALETTE.amber).attr('stop-opacity', 0.72);
    grad.append('stop').attr('offset', '100%').attr('stop-color', PALETTE.amber).attr('stop-opacity', 0.06);

    // grid
    g.append('g').attr('class', 'member-b-grid').call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(''));
    this.axisLeft(g.append('g'), y, 5);
    g.append('g')
      .attr('class', 'member-b-axis')
      .attr('transform', `translate(0,${chartH})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat((d) => 'T+' + d).tickSizeOuter(0));

    // Y-axis label
    g.append('text')
      .attr('class', 'member-b-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartH / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .text('平均年发表量');

    // area
    const area = d3.area()
      .x((d) => x(d.relativeYear))
      .y0(chartH)
      .y1((d) => y(d.avgPapers))
      .curve(d3.curveMonotoneX);
    const line = d3.line()
      .x((d) => x(d.relativeYear))
      .y((d) => y(d.avgPapers))
      .curve(d3.curveMonotoneX);

    g.append('path').datum(trajectoryData).attr('class', 'member-b-area').attr('d', area);
    g.append('path').datum(trajectoryData).attr('class', 'member-b-line').attr('d', line);

    // average prize age vertical line
    const avgPrizeAge = this.data.summary.avg_prize_age;
    g.append('line')
      .attr('class', 'member-b-ref-line')
      .attr('x1', x(avgPrizeAge)).attr('x2', x(avgPrizeAge))
      .attr('y1', 0).attr('y2', chartH)
      .attr('stroke', PALETTE.blue).attr('stroke-dasharray', '6,4').attr('opacity', 0.55);
    g.append('text')
      .attr('class', 'member-b-ref-label')
      .attr('x', x(avgPrizeAge) + 6).attr('y', 12)
      .attr('fill', PALETTE.blue)
      .text('平均获奖 T+' + Math.round(avgPrizeAge));

    // peak year vertical line
    const peakEntry = trajectoryData.reduce((max, d) => d.avgPapers > (max.avgPapers || 0) ? d : max, {});
    if (peakEntry.relativeYear !== undefined) {
      g.append('line')
        .attr('class', 'member-b-ref-line')
        .attr('x1', x(peakEntry.relativeYear)).attr('x2', x(peakEntry.relativeYear))
        .attr('y1', 0).attr('y2', chartH)
        .attr('stroke', PALETTE.rust).attr('stroke-dasharray', '6,4').attr('opacity', 0.55);
      g.append('text')
        .attr('class', 'member-b-ref-label')
        .attr('x', x(peakEntry.relativeYear) + 6).attr('y', 28)
        .attr('fill', PALETTE.rust)
        .text('黄金期 T+' + peakEntry.relativeYear);

      // peak value annotation — placed to the right of the dot
      g.append('circle')
        .attr('cx', x(peakEntry.relativeYear))
        .attr('cy', y(peakEntry.avgPapers))
        .attr('r', 5)
        .attr('fill', PALETTE.rust)
        .attr('stroke', '#fffaf0')
        .attr('stroke-width', 2);
      g.append('text')
        .attr('class', 'member-b-value-annotation')
        .attr('x', x(peakEntry.relativeYear) + 10)
        .attr('y', y(peakEntry.avgPapers) + 4)
        .attr('text-anchor', 'start')
        .attr('fill', PALETTE.rust)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text(peakEntry.avgPapers.toFixed(1) + ' 篇');
    }

    // median career length reference line
    const medianCareer = this.data.summary.avg_career_length;
    if (medianCareer) {
      g.append('line')
        .attr('class', 'member-b-ref-line')
        .attr('x1', x(medianCareer)).attr('x2', x(medianCareer))
        .attr('y1', 0).attr('y2', chartH)
        .attr('stroke', PALETTE.muted).attr('stroke-dasharray', '3,6').attr('opacity', 0.45);
      g.append('text')
        .attr('class', 'member-b-ref-label')
        .attr('x', x(medianCareer) + 6).attr('y', 44)
        .attr('fill', PALETTE.muted)
        .text('平均生涯 ' + Math.round(medianCareer) + '年');
    }

    // interaction layer: crosshair + tooltip
    const bisect = d3.bisector((d) => d.relativeYear).left;
    g.append('rect')
      .attr('class', 'member-b-interaction-layer')
      .attr('x', 0).attr('y', 0)
      .attr('width', innerWidth).attr('height', chartH)
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const year = Math.max(xDomain[0], Math.min(xDomain[1], x.invert(mx)));
        const idx = Math.min(trajectoryData.length - 1, Math.max(0, bisect(trajectoryData, year)));
        const a = trajectoryData[idx - 1] || trajectoryData[idx];
        const b = trajectoryData[idx];
        const d = Math.abs((a?.relativeYear ?? year) - year) < Math.abs((b?.relativeYear ?? year) - year) ? a : b;
        if (!d) return;

        g.selectAll('.member-b-crosshair').remove();

        g.append('line').attr('class', 'member-b-crosshair')
          .attr('x1', x(d.relativeYear)).attr('x2', x(d.relativeYear))
          .attr('y1', 0).attr('y2', chartH)
          .attr('stroke', PALETTE.ink).attr('stroke-dasharray', '3,3').attr('opacity', 0.28);
        g.append('line').attr('class', 'member-b-crosshair')
          .attr('x1', 0).attr('x2', innerWidth)
          .attr('y1', y(d.avgPapers)).attr('y2', y(d.avgPapers))
          .attr('stroke', PALETTE.ink).attr('stroke-dasharray', '3,3').attr('opacity', 0.28);
        g.append('circle').attr('class', 'member-b-crosshair')
          .attr('cx', x(d.relativeYear)).attr('cy', y(d.avgPapers))
          .attr('r', 5).attr('fill', PALETTE.amber).attr('stroke', '#fffaf0').attr('stroke-width', 2);

        this.showTip(event,
          '<strong>学术年龄 T+' + d.relativeYear + '</strong>' +
          '<br>平均年发表量：' + d.avgPapers.toFixed(1) +
          '<br>平均引用：' + (d.avgCitations || 0).toFixed(0) +
          '<br>样本数：' + d.count
        );
      })
      .on('mouseleave', () => {
        g.selectAll('.member-b-crosshair').remove();
        this.hideTip();
      });

    // legend
    this.drawLegend([
      { color: PALETTE.amber, label: '平均年发表量' },
      { color: PALETTE.blue, label: '平均获奖年龄' },
      { color: PALETTE.rust, label: '黄金创作期' },
      { color: PALETTE.muted, label: '平均生涯长度' }
    ], 22, 56, 4);

    // ---- Sub-chart A: 引用影响力趋势 ----
    const subAY = m.top + chartH + 100;
    const subAG = this.svg.append('g').attr('transform', `translate(${m.left},${subAY})`);
    this.sectionTitle(subAG, '引用影响力趋势', 0, -10);

    const subAH = 180;
    const subAX = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
    const citMax = d3.max(trajectoryData, (d) => d.avgCitations) || 100;
    const subAY1 = d3.scaleLinear().domain([0, citMax * 1.1]).nice().range([subAH, 0]);
    const fwciMax = d3.max(trajectoryData, (d) => d.avgFwci) || 5;
    const subAY2 = d3.scaleLinear().domain([0, fwciMax * 1.1]).nice().range([subAH, 0]);

    // grid
    subAG.append('g').attr('class', 'member-b-grid').call(d3.axisLeft(subAY1).ticks(4).tickSize(-innerWidth).tickFormat(''));
    this.axisLeft(subAG.append('g'), subAY1, 4);
    subAG.append('g')
      .attr('class', 'member-b-axis')
      .attr('transform', `translate(0,${subAH})`)
      .call(d3.axisBottom(subAX).ticks(10).tickFormat((d) => 'T+' + d).tickSizeOuter(0));

    // right Y axis for fwci
    subAG.append('g')
      .attr('class', 'member-b-axis')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(d3.axisRight(subAY2).ticks(4).tickSizeOuter(0));

    // Y-axis labels
    subAG.append('text')
      .attr('class', 'member-b-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -subAH / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .text('平均引用数');
    subAG.append('text')
      .attr('class', 'member-b-axis-label')
      .attr('transform', 'rotate(90)')
      .attr('x', subAH / 2)
      .attr('y', -innerWidth - 32)
      .attr('text-anchor', 'middle')
      .text('FWCI');

    // citations line
    const citLine = d3.line()
      .x((d) => subAX(d.relativeYear))
      .y((d) => subAY1(d.avgCitations || 0))
      .curve(d3.curveMonotoneX);
    subAG.append('path')
      .datum(trajectoryData)
      .attr('class', 'member-b-cit-line')
      .attr('d', citLine)
      .attr('fill', 'none')
      .attr('stroke', PALETTE.rust)
      .attr('stroke-width', 2.5)
      .attr('opacity', 0.85);

    // fwci line
    const fwciLine = d3.line()
      .x((d) => subAX(d.relativeYear))
      .y((d) => subAY2(d.avgFwci || 0))
      .curve(d3.curveMonotoneX);
    subAG.append('path')
      .datum(trajectoryData)
      .attr('class', 'member-b-fwci-line')
      .attr('d', fwciLine)
      .attr('fill', 'none')
      .attr('stroke', PALETTE.gold)
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', '6,3')
      .attr('opacity', 0.85);

    // prize age reference on sub-chart
    subAG.append('line')
      .attr('x1', subAX(avgPrizeAge)).attr('x2', subAX(avgPrizeAge))
      .attr('y1', 0).attr('y2', subAH)
      .attr('stroke', PALETTE.blue).attr('stroke-dasharray', '4,4').attr('opacity', 0.35);

    // peak citation annotation
    const peakCit = trajectoryData.reduce((max, d) => (d.avgCitations || 0) > (max.avgCitations || 0) ? d : max, {});
    if (peakCit.relativeYear !== undefined && peakCit.avgCitations > 0) {
      subAG.append('circle')
        .attr('cx', subAX(peakCit.relativeYear))
        .attr('cy', subAY1(peakCit.avgCitations))
        .attr('r', 4)
        .attr('fill', PALETTE.rust)
        .attr('stroke', '#fffaf0')
        .attr('stroke-width', 1.5);
      subAG.append('text')
        .attr('x', subAX(peakCit.relativeYear))
        .attr('y', subAY1(peakCit.avgCitations) - 8)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', PALETTE.rust)
        .text(Math.round(peakCit.avgCitations));
    }

    // peak fwci annotation
    const peakFwci = trajectoryData.reduce((max, d) => (d.avgFwci || 0) > (max.avgFwci || 0) ? d : max, {});
    if (peakFwci.relativeYear !== undefined && peakFwci.avgFwci > 0) {
      subAG.append('circle')
        .attr('cx', subAX(peakFwci.relativeYear))
        .attr('cy', subAY2(peakFwci.avgFwci))
        .attr('r', 4)
        .attr('fill', PALETTE.gold)
        .attr('stroke', '#fffaf0')
        .attr('stroke-width', 1.5);
      subAG.append('text')
        .attr('x', subAX(peakFwci.relativeYear))
        .attr('y', subAY2(peakFwci.avgFwci) - 8)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', PALETTE.gold)
        .text(peakFwci.avgFwci.toFixed(1));
    }

    // interaction layer for sub-chart A
    const bisectA = d3.bisector((d) => d.relativeYear).left;
    subAG.append('rect')
      .attr('class', 'member-b-interaction-layer')
      .attr('x', 0).attr('y', 0)
      .attr('width', innerWidth).attr('height', subAH)
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const year = Math.max(xDomain[0], Math.min(xDomain[1], subAX.invert(mx)));
        const idx = Math.min(trajectoryData.length - 1, Math.max(0, bisectA(trajectoryData, year)));
        const a = trajectoryData[idx - 1] || trajectoryData[idx];
        const b = trajectoryData[idx];
        const d = Math.abs((a?.relativeYear ?? year) - year) < Math.abs((b?.relativeYear ?? year) - year) ? a : b;
        if (!d) return;

        subAG.selectAll('.member-b-crosshair').remove();
        subAG.append('line').attr('class', 'member-b-crosshair')
          .attr('x1', subAX(d.relativeYear)).attr('x2', subAX(d.relativeYear))
          .attr('y1', 0).attr('y2', subAH)
          .attr('stroke', PALETTE.ink).attr('stroke-dasharray', '3,3').attr('opacity', 0.2);

        this.showTip(event,
          '<strong>T+' + d.relativeYear + '</strong>' +
          '<br>平均引用：' + (d.avgCitations || 0).toFixed(0) +
          '<br>FWCI：' + (d.avgFwci || 0).toFixed(2)
        );
      })
      .on('mouseleave', () => {
        subAG.selectAll('.member-b-crosshair').remove();
        this.hideTip();
      });

    // sub-chart A legend
    this.drawLegend([
      { color: PALETTE.rust, label: '平均引用数' },
      { color: PALETTE.gold, label: 'FWCI' }
    ], m.left + 180, subAY - 10, 2);

    // ---- Sub-chart B: 三学科生命周期对比 ----
    const subBY = subAY + subAH + 100;
    const subBG = this.svg.append('g').attr('transform', `translate(${m.left},${subBY})`);
    this.sectionTitle(subBG, '三学科生命周期对比', 0, -10);

    const subBH = 180;
    const subBX = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
    const catKeys = Object.keys(CATEGORY_COLORS);
    const catMaxPapers = d3.max(catKeys, (cat) =>
      d3.max(catTrajectories[cat] || [], (d) => d.avgPapers)
    ) || 10;
    const subBYScale = d3.scaleLinear().domain([0, catMaxPapers * 1.12]).nice().range([subBH, 0]);

    // grid
    subBG.append('g').attr('class', 'member-b-grid').call(d3.axisLeft(subBYScale).ticks(4).tickSize(-innerWidth).tickFormat(''));
    this.axisLeft(subBG.append('g'), subBYScale, 4);
    subBG.append('g')
      .attr('class', 'member-b-axis')
      .attr('transform', `translate(0,${subBH})`)
      .call(d3.axisBottom(subBX).ticks(10).tickFormat((d) => 'T+' + d).tickSizeOuter(0));

    // Y-axis label
    subBG.append('text')
      .attr('class', 'member-b-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -subBH / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .text('平均年发表量');

    // three overlapping area charts
    const catColors = { Physics: PALETTE.blue, Chemistry: PALETTE.rust, Medicine: PALETTE.gold };
    catKeys.forEach((cat) => {
      const catData = catTrajectories[cat] || [];
      if (catData.length === 0) return;

      const catArea = d3.area()
        .x((d) => subBX(d.relativeYear))
        .y0(subBH)
        .y1((d) => subBYScale(d.avgPapers))
        .curve(d3.curveMonotoneX);
      const catLine = d3.line()
        .x((d) => subBX(d.relativeYear))
        .y((d) => subBYScale(d.avgPapers))
        .curve(d3.curveMonotoneX);

      subBG.append('path')
        .datum(catData)
        .attr('class', 'member-b-cat-area')
        .attr('d', catArea)
        .attr('fill', catColors[cat])
        .attr('opacity', 0.22);
      subBG.append('path')
        .datum(catData)
        .attr('class', 'member-b-cat-line')
        .attr('d', catLine)
        .attr('fill', 'none')
        .attr('stroke', catColors[cat])
        .attr('stroke-width', 2)
        .attr('opacity', 0.8);

      // peak annotation per category
      const catPeak = catData.reduce((max, d) => d.avgPapers > (max.avgPapers || 0) ? d : max, {});
      if (catPeak.relativeYear !== undefined) {
        subBG.append('circle')
          .attr('cx', subBX(catPeak.relativeYear))
          .attr('cy', subBYScale(catPeak.avgPapers))
          .attr('r', 3.5)
          .attr('fill', catColors[cat])
          .attr('stroke', '#fffaf0')
          .attr('stroke-width', 1.5);
      }
    });

    // prize age reference on sub-chart B
    subBG.append('line')
      .attr('x1', subBX(avgPrizeAge)).attr('x2', subBX(avgPrizeAge))
      .attr('y1', 0).attr('y2', subBH)
      .attr('stroke', PALETTE.muted).attr('stroke-dasharray', '4,4').attr('opacity', 0.35);

    // interaction layer for sub-chart B
    const bisectB = d3.bisector((d) => d.relativeYear).left;
    subBG.append('rect')
      .attr('class', 'member-b-interaction-layer')
      .attr('x', 0).attr('y', 0)
      .attr('width', innerWidth).attr('height', subBH)
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const year = Math.max(xDomain[0], Math.min(xDomain[1], subBX.invert(mx)));
        subBG.selectAll('.member-b-crosshair').remove();
        subBG.append('line').attr('class', 'member-b-crosshair')
          .attr('x1', subBX(year)).attr('x2', subBX(year))
          .attr('y1', 0).attr('y2', subBH)
          .attr('stroke', PALETTE.ink).attr('stroke-dasharray', '3,3').attr('opacity', 0.2);

        let html = '<strong>T+' + Math.round(year) + '</strong>';
        catKeys.forEach((cat) => {
          const catData = catTrajectories[cat] || [];
          const idx = Math.min(catData.length - 1, Math.max(0, bisectB(catData, year)));
          const a = catData[idx - 1] || catData[idx];
          const b = catData[idx];
          const d = Math.abs((a?.relativeYear ?? year) - year) < Math.abs((b?.relativeYear ?? year) - year) ? a : b;
          if (d) {
            html += '<br>' + CATEGORY_LABELS[cat] + '：' + d.avgPapers.toFixed(1) + ' 篇';
          }
        });
        this.showTip(event, html);
      })
      .on('mouseleave', () => {
        subBG.selectAll('.member-b-crosshair').remove();
        this.hideTip();
      });

    // sub-chart B legend
    this.drawLegend([
      { color: PALETTE.blue, label: '物理' },
      { color: PALETTE.rust, label: '化学' },
      { color: PALETTE.gold, label: '医学' }
    ], m.left + 180, subBY - 10, 3);
  }

  /* ---- View 2: Comparison ---- */

  drawComparison() {
    this.chartTitle('获奖前后产出对比 — 按学科分组');
    this.interactionHint();

    const categories = Object.keys(CATEGORY_COLORS);
    const laureates = this.data.laureates;

    // aggregate by category
    const catStats = categories.map((cat) => {
      const group = laureates.filter((l) => l.category === cat);
      const avgBefore = d3.mean(group, (d) => d.papers_before_prize) || 0;
      const avgAfter = d3.mean(group, (d) => d.papers_after_prize) || 0;
      const avgTotal = d3.mean(group, (d) => d.total_papers) || 0;
      return { category: cat, avgBefore, avgAfter, avgTotal, count: group.length };
    });

    const m = { top: 78, right: 54, bottom: 54, left: 68 };
    const chartH = 300;
    const innerWidth = this.width - m.left - m.right;
    const g = this.svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    const x = d3.scaleBand().domain(categories).range([0, innerWidth]).padding(0.32);
    const yMax = d3.max(catStats, (d) => d.avgTotal) || 100;
    const y = d3.scaleLinear().domain([0, yMax * 1.15]).nice().range([chartH, 0]);

    // grid
    g.append('g').attr('class', 'member-b-grid').call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(''));
    this.axisLeft(g.append('g'), y, 5);
    g.append('g')
      .attr('class', 'member-b-axis')
      .attr('transform', `translate(0,${chartH})`)
      .call(d3.axisBottom(x).tickFormat((d) => CATEGORY_LABELS[d] || d).tickSizeOuter(0));

    // Y-axis label
    g.append('text')
      .attr('class', 'member-b-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartH / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .text('平均论文数');

    // stacked bars: before (bottom) + after (top)
    const this_chart = this;
    g.selectAll('g.bar-group').data(catStats).join('g')
      .attr('class', 'bar-group')
      .each(function (d) {
        const group = d3.select(this);
        // before
        group.append('rect')
          .attr('class', 'member-b-bar member-b-bar--before')
          .attr('x', x(d.category))
          .attr('width', x.bandwidth())
          .attr('rx', 6)
          .attr('y', y(d.avgBefore))
          .attr('height', chartH - y(d.avgBefore))
          .attr('fill', PALETTE.blue)
          .attr('opacity', 0.78)
          .on('mousemove', (event) => {
            this_chart.showTip(event,
              '<strong>' + (CATEGORY_LABELS[d.category] || d.category) + '</strong>' +
              '<br>获奖前平均：' + d.avgBefore.toFixed(1) + ' 篇' +
              '<br>获奖后平均：' + d.avgAfter.toFixed(1) + ' 篇' +
              '<br>总平均：' + d.avgTotal.toFixed(1) + ' 篇' +
              '<br>人数：' + d.count
            );
          })
          .on('mouseleave', () => this_chart.hideTip());
        // after
        group.append('rect')
          .attr('class', 'member-b-bar member-b-bar--after')
          .attr('x', x(d.category))
          .attr('width', x.bandwidth())
          .attr('rx', 6)
          .attr('y', y(d.avgBefore + d.avgAfter))
          .attr('height', chartH - y(d.avgAfter))
          .attr('fill', PALETTE.gold)
          .attr('opacity', 0.78)
          .on('mousemove', (event) => {
            this_chart.showTip(event,
              '<strong>' + (CATEGORY_LABELS[d.category] || d.category) + '</strong>' +
              '<br>获奖前平均：' + d.avgBefore.toFixed(1) + ' 篇' +
              '<br>获奖后平均：' + d.avgAfter.toFixed(1) + ' 篇' +
              '<br>总平均：' + d.avgTotal.toFixed(1) + ' 篇' +
              '<br>人数：' + d.count
            );
          })
          .on('mouseleave', () => this_chart.hideTip());
        // value labels
        group.append('text')
          .attr('class', 'member-b-small')
          .attr('x', x(d.category) + x.bandwidth() / 2)
          .attr('y', y(d.avgBefore) - 8)
          .attr('text-anchor', 'middle')
          .text(d.avgBefore.toFixed(0));
        group.append('text')
          .attr('class', 'member-b-small')
          .attr('x', x(d.category) + x.bandwidth() / 2)
          .attr('y', y(d.avgBefore + d.avgAfter) - 8)
          .attr('text-anchor', 'middle')
          .text(d.avgAfter.toFixed(0));
        // count label inside bar top
        group.append('text')
          .attr('class', 'member-b-small')
          .attr('x', x(d.category) + x.bandwidth() / 2)
          .attr('y', y(d.avgBefore) + 14)
          .attr('text-anchor', 'middle')
          .attr('fill', 'rgba(255,255,255,0.85)')
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .text('n=' + d.count);
      });

    // legend
    this.drawLegend([
      { color: PALETTE.blue, label: '获奖前' },
      { color: PALETTE.gold, label: '获奖后' }
    ], 22, 56, 3);

    // ---- Top-10 horizontal bars ----
    const topLaureates = laureates
      .map((l) => ({ name: l.name, category: l.category, before: l.papers_before_prize, after: l.papers_after_prize, total: l.total_papers }))
      .sort((a, b) => d3.descending(a.total, b.total))
      .slice(0, 10);

    const bottomY = m.top + chartH + 100;
    const bottom = this.svg.append('g').attr('transform', `translate(${m.left},${bottomY})`);
    this.sectionTitle(bottom, '论文产出最多的十位得主', 0, -16);

    const bx = d3.scaleLinear().domain([0, d3.max(topLaureates, (d) => d.total) || 100]).range([0, innerWidth - 210]);
    const by = d3.scaleBand().domain(topLaureates.map((d) => d.name)).range([0, 200]).padding(0.22);

    bottom.append('g').attr('class', 'member-b-grid')
      .attr('transform', 'translate(195,0)')
      .call(d3.axisLeft(d3.scaleLinear().domain([0, d3.max(topLaureates, (d) => d.total) || 100]).range([200, 0])).ticks(4).tickSize(-(innerWidth - 210)).tickFormat(''));

    bottom.selectAll('text.bar-name').data(topLaureates).join('text')
      .attr('class', 'member-b-label')
      .attr('x', 0)
      .attr('y', (d) => by(d.name) + by.bandwidth() / 2 + 4)
      .text((d) => d.name.length > 18 ? d.name.slice(0, 17) + '...' : d.name);

    // category color dots
    bottom.selectAll('circle.cat-dot').data(topLaureates).join('circle')
      .attr('class', 'cat-dot')
      .attr('cx', -12)
      .attr('cy', (d) => by(d.name) + by.bandwidth() / 2)
      .attr('r', 4)
      .attr('fill', (d) => CATEGORY_COLORS[d.category] || PALETTE.muted);

    bottom.selectAll('rect.bar-before-h').data(topLaureates).join('rect')
      .attr('x', 195)
      .attr('y', (d) => by(d.name))
      .attr('width', (d) => bx(d.before))
      .attr('height', by.bandwidth())
      .attr('rx', 5)
      .attr('fill', PALETTE.blue)
      .attr('opacity', 0.72)
      .on('mousemove', (event, d) => this.showTip(event,
        '<strong>' + d.name + '</strong><br>获奖前：' + d.before + ' 篇<br>获奖后：' + d.after + ' 篇<br>总计：' + d.total + ' 篇'
      ))
      .on('mouseleave', this.hideTip);

    bottom.selectAll('rect.bar-after-h').data(topLaureates).join('rect')
      .attr('x', (d) => 195 + bx(d.before))
      .attr('y', (d) => by(d.name))
      .attr('width', (d) => bx(d.after))
      .attr('height', by.bandwidth())
      .attr('rx', 5)
      .attr('fill', PALETTE.gold)
      .attr('opacity', 0.72)
      .on('mousemove', (event, d) => this.showTip(event,
        '<strong>' + d.name + '</strong><br>获奖前：' + d.before + ' 篇<br>获奖后：' + d.after + ' 篇<br>总计：' + d.total + ' 篇'
      ))
      .on('mouseleave', this.hideTip);

    bottom.selectAll('text.bar-total').data(topLaureates).join('text')
      .attr('class', 'member-b-small')
      .attr('x', (d) => 203 + bx(d.total))
      .attr('y', (d) => by(d.name) + by.bandwidth() / 2 + 4)
      .text((d) => d.total);

    // ---- Sub-chart A: 获奖年龄分布 ----
    const subAY = bottomY + 200 + 100;
    const subAG = this.svg.append('g').attr('transform', `translate(${m.left},${subAY})`);
    this.sectionTitle(subAG, '获奖年龄分布（学术年龄）', 0, -10);

    const subAH = 160;
    const prizeAges = laureates.map((l) => l.prize_age).filter((v) => v != null);
    const ageMin = d3.min(prizeAges) || 5;
    const ageMax = d3.max(prizeAges) || 60;
    const ageBins = d3.bin().domain([ageMin, ageMax]).thresholds(20)(prizeAges);
    const binMax = d3.max(ageBins, (d) => d.length) || 1;

    const subAX = d3.scaleLinear().domain([ageMin, ageMax]).range([0, innerWidth]);
    const subAYScale = d3.scaleLinear().domain([0, binMax * 1.15]).nice().range([subAH, 0]);

    // grid
    subAG.append('g').attr('class', 'member-b-grid').call(d3.axisLeft(subAYScale).ticks(4).tickSize(-innerWidth).tickFormat(''));
    this.axisLeft(subAG.append('g'), subAYScale, 4);
    subAG.append('g')
      .attr('class', 'member-b-axis')
      .attr('transform', `translate(0,${subAH})`)
      .call(d3.axisBottom(subAX).ticks(8).tickFormat((d) => 'T+' + d).tickSizeOuter(0));

    // Y-axis label
    subAG.append('text')
      .attr('class', 'member-b-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -subAH / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .text('得主人数');

    // histogram bars
    subAG.selectAll('rect.hist-bar').data(ageBins).join('rect')
      .attr('class', 'hist-bar')
      .attr('x', (d) => subAX(d.x0))
      .attr('y', (d) => subAYScale(d.length))
      .attr('width', (d) => Math.max(1, subAX(d.x1) - subAX(d.x0) - 1))
      .attr('height', (d) => subAH - subAYScale(d.length))
      .attr('rx', 3)
      .attr('fill', PALETTE.amber)
      .attr('opacity', 0.72)
      .on('mousemove', (event, d) => this.showTip(event,
        '<strong>学术年龄 ' + Math.round(d.x0) + '-' + Math.round(d.x1) + '</strong><br>得主人数：' + d.length
      ))
      .on('mouseleave', this.hideTip);

    // mean line
    const meanAge = d3.mean(prizeAges) || 0;
    const medianAge = d3.median(prizeAges) || 0;
    subAG.append('line')
      .attr('x1', subAX(meanAge)).attr('x2', subAX(meanAge))
      .attr('y1', 0).attr('y2', subAH)
      .attr('stroke', PALETTE.rust).attr('stroke-dasharray', '6,4').attr('opacity', 0.7);
    subAG.append('text')
      .attr('x', subAX(meanAge) + 4).attr('y', 14)
      .attr('font-size', '10px').attr('fill', PALETTE.rust)
      .text('均值 T+' + Math.round(meanAge));

    // median line
    subAG.append('line')
      .attr('x1', subAX(medianAge)).attr('x2', subAX(medianAge))
      .attr('y1', 0).attr('y2', subAH)
      .attr('stroke', PALETTE.blue).attr('stroke-dasharray', '4,6').attr('opacity', 0.7);
    subAG.append('text')
      .attr('x', subAX(medianAge) + 4).attr('y', 28)
      .attr('font-size', '10px').attr('fill', PALETTE.blue)
      .text('中位数 T+' + Math.round(medianAge));

    // sub-chart A legend
    this.drawLegend([
      { color: PALETTE.amber, label: '年龄分布' },
      { color: PALETTE.rust, label: '均值' },
      { color: PALETTE.blue, label: '中位数' }
    ], m.left + 180, subAY - 10, 3);

    // ---- Sub-chart B: 生理年龄 vs 学术年龄 ----
    const subBY = subAY + subAH + 100;
    const subBG = this.svg.append('g').attr('transform', `translate(${m.left},${subBY})`);
    this.sectionTitle(subBG, '生理年龄 vs 学术年龄', 0, -10);

    const subBH = 180;
    const scatterData = laureates
      .filter((l) => l.biological_age_at_prize != null && l.prize_age != null)
      .map((l) => ({
        name: l.name,
        category: l.category,
        bioAge: l.biological_age_at_prize,
        acadAge: l.prize_age
      }));

    const acadMin = d3.min(scatterData, (d) => d.acadAge) || 5;
    const acadMax = d3.max(scatterData, (d) => d.acadAge) || 60;
    const bioMin = d3.min(scatterData, (d) => d.bioAge) || 30;
    const bioMax = d3.max(scatterData, (d) => d.bioAge) || 100;

    const scX = d3.scaleLinear().domain([acadMin - 2, acadMax + 2]).range([0, innerWidth]);
    const scY = d3.scaleLinear().domain([bioMin - 5, bioMax + 5]).nice().range([subBH, 0]);

    // grid
    subBG.append('g').attr('class', 'member-b-grid').call(d3.axisLeft(scY).ticks(5).tickSize(-innerWidth).tickFormat(''));
    this.axisLeft(subBG.append('g'), scY, 5);
    subBG.append('g')
      .attr('class', 'member-b-axis')
      .attr('transform', `translate(0,${subBH})`)
      .call(d3.axisBottom(scX).ticks(8).tickFormat((d) => 'T+' + d).tickSizeOuter(0));

    // axis labels
    subBG.append('text')
      .attr('class', 'member-b-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -subBH / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .text('生理年龄');
    subBG.append('text')
      .attr('class', 'member-b-axis-label')
      .attr('x', innerWidth / 2)
      .attr('y', subBH + 40)
      .attr('text-anchor', 'middle')
      .text('学术年龄');

    // diagonal reference line y=x
    const refMin = Math.max(acadMin - 2, bioMin - 5);
    const refMax = Math.min(acadMax + 2, bioMax + 5);
    subBG.append('line')
      .attr('x1', scX(refMin)).attr('x2', scX(refMax))
      .attr('y1', scY(refMin)).attr('y2', scY(refMax))
      .attr('stroke', PALETTE.muted)
      .attr('stroke-dasharray', '8,4')
      .attr('opacity', 0.4);
    subBG.append('text')
      .attr('x', scX(refMax) - 30).attr('y', scY(refMax) - 6)
      .attr('font-size', '10px').attr('fill', PALETTE.muted)
      .text('y = x');

    // scatter dots
    subBG.selectAll('circle.scatter-dot').data(scatterData).join('circle')
      .attr('class', 'scatter-dot')
      .attr('cx', (d) => scX(d.acadAge))
      .attr('cy', (d) => scY(d.bioAge))
      .attr('r', 3.5)
      .attr('fill', (d) => CATEGORY_COLORS[d.category] || PALETTE.muted)
      .attr('opacity', 0.6)
      .on('mousemove', (event, d) => this.showTip(event,
        '<strong>' + d.name + '</strong>' +
        '<br>学科：' + (CATEGORY_LABELS[d.category] || d.category) +
        '<br>生理年龄：' + d.bioAge +
        '<br>学术年龄：T+' + d.acadAge
      ))
      .on('mouseleave', this.hideTip);

    // mean crosshair lines
    const meanBio = d3.mean(scatterData, (d) => d.bioAge) || 0;
    subBG.append('line')
      .attr('x1', 0).attr('x2', innerWidth)
      .attr('y1', scY(meanBio)).attr('y2', scY(meanBio))
      .attr('stroke', PALETTE.rust).attr('stroke-dasharray', '3,5').attr('opacity', 0.35);
    subBG.append('text')
      .attr('x', innerWidth - 4).attr('y', scY(meanBio) - 4)
      .attr('text-anchor', 'end')
      .attr('font-size', '10px').attr('fill', PALETTE.rust)
      .text('平均生理年龄 ' + Math.round(meanBio));

    // sub-chart B legend
    this.drawLegend([
      { color: CATEGORY_COLORS.Physics, label: '物理' },
      { color: CATEGORY_COLORS.Chemistry, label: '化学' },
      { color: CATEGORY_COLORS.Medicine, label: '医学' },
      { color: PALETTE.muted, label: 'y=x 参考线' }
    ], m.left + 180, subBY - 10, 4);
  }

  /* ---- View 3: Heatmap ---- */

  drawHeatmap() {
    this.chartTitle('黄金创作期分布 — 各年份高峰得主人数');
    this.interactionHint();

    const laureates = this.data.laureates;
    const yearCounts = {};
    laureates.forEach((l) => {
      if (!l.peak_years) return;
      l.peak_years.forEach((year) => {
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      });
    });

    const heatmapData = Object.entries(yearCounts)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .filter((d) => d.year >= 1890 && d.year <= 2025)
      .sort((a, b) => a.year - b.year);

    const m = { top: 78, right: 54, bottom: 54, left: 58 };
    const chartH = 300;
    const innerWidth = this.width - m.left - m.right;
    const g = this.svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    const x = d3.scaleLinear().domain(d3.extent(heatmapData, (d) => d.year)).range([0, innerWidth]);
    const maxCount = d3.max(heatmapData, (d) => d.count) || 1;
    const y = d3.scaleLinear().domain([0, maxCount * 1.15]).nice().range([chartH, 0]);
    const color = d3.scaleSequential().domain([0, maxCount]).interpolator(d3.interpolateRgb('#fffaf0', '#d25d3d'));

    // grid
    g.append('g').attr('class', 'member-b-grid').call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(''));
    this.axisLeft(g.append('g'), y, 5);
    g.append('g')
      .attr('class', 'member-b-axis')
      .attr('transform', `translate(0,${chartH})`)
      .call(d3.axisBottom(x).ticks(12).tickFormat(d3.format('d')).tickSizeOuter(0));

    // Y-axis label
    g.append('text')
      .attr('class', 'member-b-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartH / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .text('高峰期得主人数');

    // heatmap bars
    const barWidth = Math.max(2, innerWidth / heatmapData.length - 1);
    g.selectAll('rect.heat-bar').data(heatmapData).join('rect')
      .attr('class', 'heat-bar')
      .attr('x', (d) => x(d.year) - barWidth / 2)
      .attr('y', 0)
      .attr('width', barWidth)
      .attr('height', chartH)
      .attr('fill', (d) => color(d.count))
      .attr('opacity', 0.82)
      .on('mousemove', (event, d) => this.showTip(event,
        '<strong>' + d.year + ' 年</strong><br>处于高峰期的得主：' + d.count + ' 人'
      ))
      .on('mouseleave', this.hideTip);

    // overlay line for trend
    const line = d3.line()
      .x((d) => x(d.year))
      .y((d) => y(d.count))
      .curve(d3.curveMonotoneX);
    g.append('path')
      .datum(heatmapData)
      .attr('class', 'member-b-heat-line')
      .attr('d', line);

    // peak annotation on heatmap
    const heatPeak = heatmapData.reduce((max, d) => d.count > (max.count || 0) ? d : max, {});
    if (heatPeak.year) {
      g.append('circle')
        .attr('cx', x(heatPeak.year))
        .attr('cy', y(heatPeak.count))
        .attr('r', 5)
        .attr('fill', PALETTE.rust)
        .attr('stroke', '#fffaf0')
        .attr('stroke-width', 2);
      g.append('text')
        .attr('x', x(heatPeak.year))
        .attr('y', y(heatPeak.count) - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', PALETTE.rust)
        .text(heatPeak.year + '年 (' + heatPeak.count + '人)');
    }

    // interaction layer
    const bisect = d3.bisector((d) => d.year).left;
    g.append('rect')
      .attr('class', 'member-b-interaction-layer')
      .attr('x', 0).attr('y', 0)
      .attr('width', innerWidth).attr('height', chartH)
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const year = Math.round(x.invert(mx));
        const idx = Math.min(heatmapData.length - 1, Math.max(0, bisect(heatmapData, year)));
        const a = heatmapData[idx - 1] || heatmapData[idx];
        const b = heatmapData[idx];
        const d = Math.abs((a?.year ?? year) - year) < Math.abs((b?.year ?? year) - year) ? a : b;
        if (!d) return;

        g.selectAll('.member-b-crosshair').remove();
        g.append('line').attr('class', 'member-b-crosshair')
          .attr('x1', x(d.year)).attr('x2', x(d.year))
          .attr('y1', 0).attr('y2', chartH)
          .attr('stroke', PALETTE.ink).attr('stroke-dasharray', '3,3').attr('opacity', 0.28);
        g.append('circle').attr('class', 'member-b-crosshair')
          .attr('cx', x(d.year)).attr('cy', y(d.count))
          .attr('r', 5).attr('fill', PALETTE.rust).attr('stroke', '#fffaf0').attr('stroke-width', 2);

        this.showTip(event,
          '<strong>' + d.year + ' 年</strong><br>处于高峰期的得主：' + d.count + ' 人'
        );
      })
      .on('mouseleave', () => {
        g.selectAll('.member-b-crosshair').remove();
        this.hideTip();
      });

    // ---- bottom: decade summary ----
    const bottomY = m.top + chartH + 100;
    const bottom = this.svg.append('g').attr('transform', `translate(${m.left},${bottomY})`);
    this.sectionTitle(bottom, '各年代高峰得主人数汇总', 0, -16);

    const decades = d3.range(1890, 2030, 10).map((decade) => {
      const decadeData = heatmapData.filter((d) => d.year >= decade && d.year < decade + 10);
      const total = d3.sum(decadeData, (d) => d.count);
      const peak = d3.max(decadeData, (d) => d.count) || 0;
      return { decade, label: decade + 's', total, peak, count: decadeData.length };
    }).filter((d) => d.count > 0);

    const dx = d3.scaleBand().domain(decades.map((d) => d.label)).range([0, innerWidth]).padding(0.22);
    const dy = d3.scaleLinear().domain([0, d3.max(decades, (d) => d.total) || 1]).nice().range([110, 0]);

    bottom.append('g').attr('class', 'member-b-grid').call(d3.axisLeft(dy).ticks(3).tickSize(-innerWidth).tickFormat(''));
    bottom.selectAll('rect.decade-bar').data(decades).join('rect')
      .attr('x', (d) => dx(d.label))
      .attr('y', (d) => dy(d.total))
      .attr('width', dx.bandwidth())
      .attr('height', (d) => 110 - dy(d.total))
      .attr('rx', 6)
      .attr('fill', (d) => color(d.peak))
      .attr('opacity', 0.82)
      .on('mousemove', (event, d) => this.showTip(event,
        '<strong>' + d.label + '</strong><br>高峰人次合计：' + d.total + '<br>单年最高：' + d.peak + ' 人'
      ))
      .on('mouseleave', this.hideTip);

    bottom.selectAll('text.decade-value').data(decades).join('text')
      .attr('class', 'member-b-small')
      .attr('x', (d) => dx(d.label) + dx.bandwidth() / 2)
      .attr('y', (d) => dy(d.total) - 6)
      .attr('text-anchor', 'middle')
      .text((d) => d.total);

    bottom.append('g').attr('class', 'member-b-axis').attr('transform', 'translate(0,110)')
      .call(d3.axisBottom(dx).tickSizeOuter(0));

    // ---- Sub-chart: 学科高峰期分布 (faceted small multiples) ----
    const subY = bottomY + 110 + 100;
    const subG = this.svg.append('g').attr('transform', `translate(${m.left},${subY})`);
    this.sectionTitle(subG, '学科高峰期分布', 0, -10);

    const catKeys = Object.keys(CATEGORY_COLORS);
    const facetH = 140;
    const facetGap = 30;
    const facetWidth = (innerWidth - (catKeys.length - 1) * facetGap) / catKeys.length;

    catKeys.forEach((cat, i) => {
      const catLaureates = laureates.filter((l) => l.category === cat);
      const peakYearCounts = {};
      catLaureates.forEach((l) => {
        if (!l.peak_years) return;
        l.peak_years.forEach((year) => {
          const decade = Math.floor(year / 10) * 10;
          peakYearCounts[decade] = (peakYearCounts[decade] || 0) + 1;
        });
      });

      const decadeEntries = Object.entries(peakYearCounts)
        .map(([decade, count]) => ({ decade: parseInt(decade), count }))
        .filter((d) => d.decade >= 1890 && d.decade <= 2020)
        .sort((a, b) => a.decade - b.decade);

      if (decadeEntries.length === 0) return;

      const fx = i * (facetWidth + facetGap);
      const fg = subG.append('g').attr('transform', `translate(${fx},0)`);

      // facet background
      fg.append('rect')
        .attr('x', -4).attr('y', -4)
        .attr('width', facetWidth + 8).attr('height', facetH + 30)
        .attr('rx', 6).attr('ry', 6)
        .attr('fill', 'none')
        .attr('stroke', PALETTE.grid)
        .attr('stroke-width', 1);

      // facet title
      fg.append('text')
        .attr('x', facetWidth / 2).attr('y', 12)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px').attr('font-weight', '600')
        .attr('fill', CATEGORY_COLORS[cat])
        .text(CATEGORY_LABELS[cat] || cat);

      // facet count
      fg.append('text')
        .attr('x', facetWidth / 2).attr('y', 26)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', PALETTE.muted)
        .text('n=' + catLaureates.length);

      const fbx = d3.scaleBand()
        .domain(decadeEntries.map((d) => d.decade))
        .range([0, facetWidth])
        .padding(0.2);
      const fby = d3.scaleLinear()
        .domain([0, d3.max(decadeEntries, (d) => d.count) * 1.15 || 1])
        .nice()
        .range([facetH, 0]);

      // facet grid
      fg.append('g').attr('class', 'member-b-grid')
        .call(d3.axisLeft(fby).ticks(3).tickSize(-facetWidth).tickFormat(''));

      // facet bars
      fg.selectAll('rect.facet-bar').data(decadeEntries).join('rect')
        .attr('class', 'facet-bar')
        .attr('x', (d) => fbx(d.decade))
        .attr('y', (d) => fby(d.count))
        .attr('width', fbx.bandwidth())
        .attr('height', (d) => facetH - fby(d.count))
        .attr('rx', 3)
        .attr('fill', CATEGORY_COLORS[cat])
        .attr('opacity', 0.72)
        .on('mousemove', (event, d) => this.showTip(event,
          '<strong>' + CATEGORY_LABELS[cat] + ' - ' + d.decade + 's</strong><br>高峰人次：' + d.count
        ))
        .on('mouseleave', this.hideTip);

      // facet value labels
      fg.selectAll('text.facet-val').data(decadeEntries).join('text')
        .attr('class', 'facet-val')
        .attr('x', (d) => fbx(d.decade) + fbx.bandwidth() / 2)
        .attr('y', (d) => fby(d.count) - 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('fill', PALETTE.ink)
        .text((d) => d.count);

      // facet X axis
      fg.append('g')
        .attr('class', 'member-b-axis')
        .attr('transform', `translate(0,${facetH})`)
        .call(d3.axisBottom(fbx).tickFormat((d) => d + 's').tickSizeOuter(0))
        .selectAll('text')
        .attr('font-size', '9px');

      // peak annotation per facet
      const facetPeak = decadeEntries.reduce((max, d) => d.count > (max.count || 0) ? d : max, {});
      if (facetPeak.decade !== undefined) {
        fg.append('circle')
          .attr('cx', fbx(facetPeak.decade) + fbx.bandwidth() / 2)
          .attr('cy', fby(facetPeak.count))
          .attr('r', 4)
          .attr('fill', CATEGORY_COLORS[cat])
          .attr('stroke', '#fffaf0')
          .attr('stroke-width', 1.5);
      }
    });

    // sub-chart legend
    this.drawLegend([
      { color: CATEGORY_COLORS.Physics, label: '物理' },
      { color: CATEGORY_COLORS.Chemistry, label: '化学' },
      { color: CATEGORY_COLORS.Medicine, label: '医学' }
    ], m.left + 180, subY - 10, 3);
  }

  drawEvolution() {
    this.interactionHint();
    const m = { top: 78, right: 54, bottom: 54, left: 68 };
    const innerW = this.width - m.left - m.right;
    const chartH = 200;
    const laureates = this.data.laureates;

    // Group by decade of prize_year
    const decades = {};
    laureates.forEach(l => {
      const dec = Math.floor(l.prize_year / 10) * 10;
      if (!decades[dec]) decades[dec] = [];
      decades[dec].push(l);
    });

    const decadeKeys = Object.keys(decades).map(Number).sort((a, b) => a - b);
    const x = d3.scalePoint().domain(decadeKeys).range([0, innerW]).padding(0.1);

    // Calculate per-decade per-category stats
    const stats = {};
    const categories = ['Physics', 'Chemistry', 'Medicine'];
    categories.forEach(cat => {
      stats[cat] = decadeKeys.map(dec => {
        const group = decades[dec].filter(l => l.category === cat);
        return {
          decade: dec,
          avgAge: group.length ? d3.mean(group, d => d.prize_age) : null,
          avgPapers: group.length ? d3.mean(group, d => d.total_papers) : null,
          avgCareer: group.length ? d3.mean(group, d => d.career_length) : null,
          count: group.length
        };
      });
    });

    // Also overall stats
    const overall = decadeKeys.map(dec => {
      const group = decades[dec];
      return {
        decade: dec,
        avgAge: d3.mean(group, d => d.prize_age),
        avgPapers: d3.mean(group, d => d.total_papers),
        avgCareer: d3.mean(group, d => d.career_length),
        count: group.length
      };
    });

    const g = this.svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    // Title
    this.sectionTitle(g, '各年代得主平均获奖年龄', 0, -20);

    // Chart 1: Average prize age by decade
    const y1 = d3.scaleLinear()
      .domain([d3.min(overall, d => d.avgAge) * 0.9, d3.max(overall, d => d.avgAge) * 1.1])
      .nice().range([chartH, 0]);

    g.append('g').attr('class', 'member-b-grid').call(d3.axisLeft(y1).ticks(5).tickSize(-innerW).tickFormat(''));
    this.axisLeft(g.append('g'), y1, 5);
    g.append('g').attr('transform', `translate(0,${chartH})`).call(d3.axisBottom(x).tickFormat(d => d + 's'));

    // Overall trend line
    const line1 = d3.line().defined(d => d.avgAge != null).x(d => x(d.decade)).y(d => y1(d.avgAge)).curve(d3.curveMonotoneX);
    g.append('path').datum(overall).attr('d', line1).attr('fill', 'none').attr('stroke', PALETTE.ink).attr('stroke-width', 3).attr('opacity', 0.5);

    // Per-category lines
    categories.forEach(cat => {
      const line = d3.line().defined(d => d.avgAge != null).x(d => x(d.decade)).y(d => y1(d.avgAge)).curve(d3.curveMonotoneX);
      g.append('path').datum(stats[cat]).attr('d', line).attr('fill', 'none').attr('stroke', CATEGORY_COLORS[cat]).attr('stroke-width', 2.5);
      // Dots - 只绘制有数据的数据点
      g.selectAll(`.dot-${cat}`).data(stats[cat].filter(d => d.avgAge != null)).join('circle')
        .attr('cx', d => x(d.decade)).attr('cy', d => y1(d.avgAge)).attr('r', 4)
        .attr('fill', CATEGORY_COLORS[cat]).attr('stroke', '#fffaf0').attr('stroke-width', 1.5)
        .on('mousemove', (event, d) => this.showTip(event,
          `<strong>${d.decade}s · ${CATEGORY_LABELS[cat]}</strong><br>平均获奖年龄：${d.avgAge?.toFixed(1)}<br>得主数：${d.count}`
        ))
        .on('mouseleave', this.hideTip);
    });

    // Y-axis label
    g.append('text').attr('class', 'member-b-axis-label').attr('transform', 'rotate(-90)')
      .attr('x', -chartH / 2).attr('y', -42).attr('text-anchor', 'middle').text('平均获奖年龄（学术年龄）');

    // Legend
    this.drawLegend([
      ...categories.map(c => ({ color: CATEGORY_COLORS[c], label: CATEGORY_LABELS[c] })),
      { color: PALETTE.ink, label: '整体均值' }
    ], m.left + 180, m.top - 10, 4);

    // Chart 2: Average papers by decade
    const chart2Y = m.top + chartH + 100;
    const g2 = this.svg.append('g').attr('transform', `translate(${m.left},${chart2Y})`);
    this.sectionTitle(g2, '各年代得主平均论文产出', 0, -20);

    const y2 = d3.scaleLinear().domain([0, d3.max(overall, d => d.avgPapers) * 1.1 || 300]).nice().range([chartH, 0]);
    g2.append('g').attr('class', 'member-b-grid').call(d3.axisLeft(y2).ticks(5).tickSize(-innerW).tickFormat(''));
    this.axisLeft(g2.append('g'), y2, 5);
    g2.append('g').attr('transform', `translate(0,${chartH})`).call(d3.axisBottom(x).tickFormat(d => d + 's'));

    // Overall trend line
    const line2Overall = d3.line().defined(d => d.avgPapers != null).x(d => x(d.decade)).y(d => y2(d.avgPapers)).curve(d3.curveMonotoneX);
    g2.append('path').datum(overall).attr('d', line2Overall).attr('fill', 'none').attr('stroke', PALETTE.ink).attr('stroke-width', 3).attr('opacity', 0.5);

    categories.forEach(cat => {
      const line = d3.line().defined(d => d.avgPapers != null).x(d => x(d.decade)).y(d => y2(d.avgPapers)).curve(d3.curveMonotoneX);
      g2.append('path').datum(stats[cat]).attr('d', line).attr('fill', 'none').attr('stroke', CATEGORY_COLORS[cat]).attr('stroke-width', 2.5);
      // Dots - 只绘制有数据的数据点
      g2.selectAll(`.dot2-${cat}`).data(stats[cat].filter(d => d.avgPapers != null)).join('circle')
        .attr('cx', d => x(d.decade)).attr('cy', d => y2(d.avgPapers)).attr('r', 4)
        .attr('fill', CATEGORY_COLORS[cat]).attr('stroke', '#fffaf0').attr('stroke-width', 1.5)
        .on('mousemove', (event, d) => this.showTip(event,
          `<strong>${d.decade}s · ${CATEGORY_LABELS[cat]}</strong><br>平均论文数：${d.avgPapers?.toFixed(1)}<br>得主数：${d.count}`
        ))
        .on('mouseleave', this.hideTip);
    });

    g2.append('text').attr('class', 'member-b-axis-label').attr('transform', 'rotate(-90)')
      .attr('x', -chartH / 2).attr('y', -42).attr('text-anchor', 'middle').text('平均论文总数');
  }

  drawRhythm() {
    this.interactionHint();
    const m = { top: 78, right: 54, bottom: 54, left: 68 };
    const innerW = this.width - m.left - m.right;
    const laureates = this.data.laureates;
    const categories = ['Physics', 'Chemistry', 'Medicine'];

    // Calculate concentration
    const enriched = laureates.map(l => {
      const total = l.total_papers || 1;
      const peakSum = (l.peak_output || []).slice(0, 3).reduce((a, b) => a + b, 0);
      return { ...l, concentration: peakSum / total };
    }).filter(l => l.concentration >= 0 && l.concentration <= 1);

    const g = this.svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    this.sectionTitle(g, '产出集中度分布（Top3年份占比）', 0, -20);

    // Jitter strip plot: one row per category
    const rowH = 50;
    const stripH = 20;
    const x = d3.scaleLinear().domain([0, 1]).range([0, innerW]);

    // X axis at bottom of strips
    const totalStripH = categories.length * rowH;
    g.append('g').attr('transform', `translate(0,${totalStripH})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('.0%')));

    categories.forEach((cat, i) => {
      const rowY = i * rowH + rowH / 2;
      const catData = enriched.filter(l => l.category === cat);

      // Category label
      g.append('text')
        .attr('x', -8).attr('y', rowY + 4)
        .attr('text-anchor', 'end').attr('font-size', '12px').attr('font-weight', '600')
        .attr('fill', CATEGORY_COLORS[cat])
        .text(CATEGORY_LABELS[cat]);

      // Subtle background band
      g.append('rect')
        .attr('x', 0).attr('y', rowY - stripH / 2)
        .attr('width', innerW).attr('height', stripH)
        .attr('fill', CATEGORY_COLORS[cat]).attr('opacity', 0.06).attr('rx', 4);

      // Jitter dots
      const jitter = () => (Math.random() - 0.5) * (stripH - 6);
      g.selectAll(`.dot-${cat}`).data(catData).join('circle')
        .attr('cx', d => x(d.concentration))
        .attr('cy', () => rowY + jitter())
        .attr('r', 3)
        .attr('fill', CATEGORY_COLORS[cat])
        .attr('opacity', 0.55)
        .on('mousemove', (event, d) => this.showTip(event,
          `<strong>${d.name}</strong> (${CATEGORY_LABELS[cat]})<br>集中度：${(d.concentration * 100).toFixed(1)}%<br>总论文：${d.total_papers}`
        ))
        .on('mouseleave', this.hideTip);

      // Mean line
      const mean = d3.mean(catData, d => d.concentration);
      if (mean != null) {
        g.append('line')
          .attr('x1', x(mean)).attr('x2', x(mean))
          .attr('y1', rowY - stripH / 2).attr('y2', rowY + stripH / 2)
          .attr('stroke', CATEGORY_COLORS[cat]).attr('stroke-width', 2).attr('opacity', 0.8);
        g.append('text')
          .attr('x', x(mean) + 4).attr('y', rowY - stripH / 2 - 2)
          .attr('font-size', '9px').attr('fill', CATEGORY_COLORS[cat])
          .text('均值 ' + (mean * 100).toFixed(0) + '%');
      }
    });

    // X-axis label
    g.append('text')
      .attr('x', innerW / 2).attr('y', totalStripH + 40)
      .attr('text-anchor', 'middle').attr('font-size', '11px').attr('fill', PALETTE.muted)
      .text('Top3年份产出占总产出比例');

    // Bottom: sparkline area charts for examples
    const bottomY = m.top + totalStripH + 80;
    const g2 = this.svg.append('g').attr('transform', `translate(${m.left},${bottomY})`);
    this.sectionTitle(g2, '典型产出节奏示例', 0, -20);

    // Pick top and bottom 1 per category (exclude outliers with too few papers or trajectory points)
    const examples = [];
    categories.forEach(cat => {
      const catL = enriched.filter(l =>
        l.category === cat &&
        (l.peak_output || []).length > 0 &&
        (l.aligned_trajectory || []).length >= 10 &&
        (l.total_papers || 0) >= 20
      );
      catL.sort((a, b) => b.concentration - a.concentration);
      if (catL[0]) examples.push(catL[0]);
      if (catL[catL.length - 1] && catL[catL.length - 1] !== catL[0]) examples.push(catL[catL.length - 1]);
    });

    const cols = Math.min(examples.length, 3);
    const spW = innerW / cols;
    const spH = 100;

    examples.forEach((ex, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const sg = g2.append('g').attr('transform', `translate(${col * spW},${row * (spH + 35)})`);

      const traj = ex.aligned_trajectory || [];
      const years = traj.map(t => t.relative_year);
      const papers = traj.map(t => t.papers);
      const maxP = d3.max(papers) || 1;

      const sx = d3.scaleLinear().domain([d3.min(years) || 0, d3.max(years) || 60]).range([0, spW - 50]);
      const sy = d3.scaleLinear().domain([0, maxP]).range([spH - 18, 0]);

      // Area
      const area = d3.area()
        .x((d, j) => sx(d.relative_year))
        .y0(spH - 18)
        .y1(d => sy(d.papers))
        .curve(d3.curveMonotoneX);
      sg.append('path').datum(traj).attr('d', area)
        .attr('fill', CATEGORY_COLORS[ex.category]).attr('opacity', 0.3);
      sg.append('path').datum(traj)
        .attr('d', d3.line().x((d, j) => sx(d.relative_year)).y(d => sy(d.papers)).curve(d3.curveMonotoneX))
        .attr('fill', 'none').attr('stroke', CATEGORY_COLORS[ex.category]).attr('stroke-width', 1.5)
        .on('mousemove', (event) => this.showTip(event,
          `<strong>${ex.name}</strong> (${CATEGORY_LABELS[ex.category]})<br>集中度：${(ex.concentration * 100).toFixed(0)}%<br>总论文：${ex.total_papers}<br>获奖年龄：${ex.prize_age?.toFixed(1)}`
        ))
        .on('mouseleave', this.hideTip);

      // Baseline
      sg.append('line').attr('x1', 0).attr('x2', spW - 50).attr('y1', spH - 18).attr('y2', spH - 18)
        .attr('stroke', PALETTE.grid);

      // Label
      const lastName = ex.name.split(' ').slice(-1)[0];
      const conc = (ex.concentration * 100).toFixed(0);
      sg.append('text')
        .attr('x', (spW - 50) / 2).attr('y', spH - 4)
        .attr('text-anchor', 'middle').attr('font-size', '9px').attr('fill', PALETTE.muted)
        .text(lastName + ' · ' + CATEGORY_LABELS[ex.category] + ' · 集中度' + conc + '%');
    });
  }

  drawCohort() {
    this.interactionHint();
    const m = { top: 78, right: 30, bottom: 54, left: 50 };
    const innerW = this.width - m.left - m.right;
    const laureates = this.data.laureates;
    const categories = ['Physics', 'Chemistry', 'Medicine'];

    // Group by birth decade
    const cohorts = {};
    laureates.forEach(l => {
      if (!l.birth_year) return;
      const dec = Math.floor(l.birth_year / 10) * 10;
      if (!cohorts[dec]) cohorts[dec] = [];
      cohorts[dec].push(l);
    });

    const cohortKeys = Object.keys(cohorts).map(Number).sort((a, b) => a - b);

    // Build matrix: decade × category → avg prize_age
    const matrix = cohortKeys.map(dec => {
      const group = cohorts[dec];
      const row = { decade: dec };
      categories.forEach(cat => {
        const sub = group.filter(l => l.category === cat);
        row[cat] = sub.length ? d3.mean(sub, d => d.prize_age) : null;
      });
      return row;
    });

    const g = this.svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    this.sectionTitle(g, '各世代平均获奖年龄（学术年龄）', 0, -20);

    // Layout: category labels on left, decade labels on top
    const cellW = Math.min(110, (innerW - 80) / cohortKeys.length);
    const cellH = 80;
    const labelW = 70;
    const headerH = 30;
    const gridW = cohortKeys.length * cellW;
    const gridH = categories.length * cellH;

    // Color scale for prize_age
    const allAges = matrix.flatMap(r => categories.map(c => r[c])).filter(v => v != null);
    const ageMin = d3.min(allAges);
    const ageMax = d3.max(allAges);
    const colorScale = d3.scaleSequential()
      .domain([ageMin, ageMax])
      .interpolator(t => d3.interpolateRgb(PALETTE.blue, PALETTE.rust)(t));

    // Decade headers
    cohortKeys.forEach((dec, i) => {
      g.append('text')
        .attr('x', labelW + i * cellW + cellW / 2).attr('y', headerH - 6)
        .attr('text-anchor', 'middle').attr('font-size', '10px').attr('fill', PALETTE.muted)
        .text(dec + 's');
    });

    // Category row labels and cells
    categories.forEach((cat, ci) => {
      const rowY = headerH + ci * cellH;
      g.append('text')
        .attr('x', labelW - 8).attr('y', rowY + cellH / 2 + 4)
        .attr('text-anchor', 'end').attr('font-size', '12px').attr('font-weight', '600')
        .attr('fill', CATEGORY_COLORS[cat])
        .text(CATEGORY_LABELS[cat]);

      cohortKeys.forEach((dec, di) => {
        const val = matrix.find(r => r.decade === dec)?.[cat];
        const cx = labelW + di * cellW;
        const cy = rowY;

        if (val != null) {
          g.append('rect')
            .attr('x', cx + 2).attr('y', cy + 2)
            .attr('width', cellW - 4).attr('height', cellH - 4)
            .attr('fill', colorScale(val)).attr('rx', 4).attr('opacity', 0.85)
            .on('mousemove', (event) => this.showTip(event,
              `<strong>${dec}s · ${CATEGORY_LABELS[cat]}</strong><br>平均获奖年龄：${val.toFixed(1)}<br>得主数：${cohorts[dec].filter(l => l.category === cat).length}`
            ))
            .on('mouseleave', this.hideTip);

          // Value text
          g.append('text')
            .attr('x', cx + cellW / 2).attr('y', cy + cellH / 2 + 4)
            .attr('text-anchor', 'middle').attr('font-size', '10px').attr('font-weight', '600')
            .attr('fill', val > (ageMin + ageMax) / 2 ? '#fffaf0' : PALETTE.ink)
            .text(val.toFixed(0));
        } else {
          g.append('rect')
            .attr('x', cx + 2).attr('y', cy + 2)
            .attr('width', cellW - 4).attr('height', cellH - 4)
            .attr('fill', PALETTE.grid).attr('rx', 4);
          g.append('text')
            .attr('x', cx + cellW / 2).attr('y', cy + cellH / 2 + 4)
            .attr('text-anchor', 'middle').attr('font-size', '10px').attr('fill', PALETTE.muted)
            .text('—');
        }
      });
    });

    // Color legend bar
    const barX = labelW;
    const barY = headerH + gridH + 15;
    const barW = gridW;
    const barH = 12;
    const barGrad = g.append('defs').append('linearGradient').attr('id', 'ageGrad');
    barGrad.append('stop').attr('offset', '0%').attr('stop-color', colorScale(ageMin));
    barGrad.append('stop').attr('offset', '100%').attr('stop-color', colorScale(ageMax));
    g.append('rect').attr('x', barX).attr('y', barY).attr('width', barW).attr('height', barH).attr('fill', 'url(#ageGrad)').attr('rx', 6);
    g.append('text').attr('x', barX).attr('y', barY + barH + 14).attr('font-size', '9px').attr('fill', PALETTE.muted).text(ageMin.toFixed(0) + '岁');
    g.append('text').attr('x', barX + barW).attr('y', barY + barH + 14).attr('text-anchor', 'end').attr('font-size', '9px').attr('fill', PALETTE.muted).text(ageMax.toFixed(0) + '岁');

    // Bottom: career length heatmap
    const careerMatrix = cohortKeys.map(dec => {
      const group = cohorts[dec];
      const row = { decade: dec };
      categories.forEach(cat => {
        const sub = group.filter(l => l.category === cat);
        row[cat] = sub.length ? d3.mean(sub, d => d.career_length) : null;
      });
      return row;
    });

    const bottomY = m.top + headerH + gridH + 120;
    const g2 = this.svg.append('g').attr('transform', `translate(${m.left},${bottomY})`);
    this.sectionTitle(g2, '各世代平均学术生涯长度', 0, -20);

    const allCareers = careerMatrix.flatMap(r => categories.map(c => r[c])).filter(v => v != null);
    const careerMin = d3.min(allCareers);
    const careerMax = d3.max(allCareers);
    const careerColor = d3.scaleSequential()
      .domain([careerMin, careerMax])
      .interpolator(t => d3.interpolateRgb('#e8ddd0', PALETTE.blue)(t));

    // Decade headers
    cohortKeys.forEach((dec, i) => {
      g2.append('text')
        .attr('x', labelW + i * cellW + cellW / 2).attr('y', headerH - 6)
        .attr('text-anchor', 'middle').attr('font-size', '10px').attr('fill', PALETTE.muted)
        .text(dec + 's');
    });

    categories.forEach((cat, ci) => {
      const rowY = headerH + ci * cellH;
      g2.append('text')
        .attr('x', labelW - 8).attr('y', rowY + cellH / 2 + 4)
        .attr('text-anchor', 'end').attr('font-size', '12px').attr('font-weight', '600')
        .attr('fill', CATEGORY_COLORS[cat])
        .text(CATEGORY_LABELS[cat]);

      cohortKeys.forEach((dec, di) => {
        const val = careerMatrix.find(r => r.decade === dec)?.[cat];
        const cx = labelW + di * cellW;
        const cy = rowY;

        if (val != null) {
          g2.append('rect')
            .attr('x', cx + 2).attr('y', cy + 2)
            .attr('width', cellW - 4).attr('height', cellH - 4)
            .attr('fill', careerColor(val)).attr('rx', 4).attr('opacity', 0.85)
            .on('mousemove', (event) => this.showTip(event,
              `<strong>${dec}s · ${CATEGORY_LABELS[cat]}</strong><br>平均生涯：${val.toFixed(1)}年`
            ))
            .on('mouseleave', this.hideTip);

          g2.append('text')
            .attr('x', cx + cellW / 2).attr('y', cy + cellH / 2 + 4)
            .attr('text-anchor', 'middle').attr('font-size', '10px').attr('font-weight', '600')
            .attr('fill', val > (careerMin + careerMax) / 2 ? '#fffaf0' : PALETTE.ink)
            .text(val.toFixed(0) + '年');
        } else {
          g2.append('rect')
            .attr('x', cx + 2).attr('y', cy + 2)
            .attr('width', cellW - 4).attr('height', cellH - 4)
            .attr('fill', PALETTE.grid).attr('rx', 4);
          g2.append('text')
            .attr('x', cx + cellW / 2).attr('y', cy + cellH / 2 + 4)
            .attr('text-anchor', 'middle').attr('font-size', '10px').attr('fill', PALETTE.muted)
            .text('—');
        }
      });
    });

    // Career color legend
    const cBarY = headerH + gridH + 15;
    const cBarGrad = g2.append('defs').append('linearGradient').attr('id', 'careerGrad');
    cBarGrad.append('stop').attr('offset', '0%').attr('stop-color', careerColor(careerMin));
    cBarGrad.append('stop').attr('offset', '100%').attr('stop-color', careerColor(careerMax));
    g2.append('rect').attr('x', labelW).attr('y', cBarY).attr('width', gridW).attr('height', barH).attr('fill', 'url(#careerGrad)').attr('rx', 6);
    g2.append('text').attr('x', labelW).attr('y', cBarY + barH + 14).attr('font-size', '9px').attr('fill', PALETTE.muted).text(careerMin.toFixed(0) + '年');
    g2.append('text').attr('x', labelW + gridW).attr('y', cBarY + barH + 14).attr('text-anchor', 'end').attr('font-size', '9px').attr('fill', PALETTE.muted).text(careerMax.toFixed(0) + '年');
  }

  drawRadar() {
    this.interactionHint();
    const m = { top: 78, right: 54, bottom: 54, left: 58 };
    const innerW = this.width - m.left - m.right;
    const laureates = this.data.laureates;

    // Split into high/low productivity groups
    const sorted = [...laureates].sort((a, b) => (b.total_papers || 0) - (a.total_papers || 0));
    const q1 = Math.floor(sorted.length * 0.25);
    const high = sorted.slice(0, q1);
    const low = sorted.slice(-q1);

    // Dimensions for radar
    const dims = [
      { key: 'prize_age', label: '获奖年龄', reverse: true },
      { key: 'career_length', label: '生涯长度', reverse: false },
      { key: 'total_citations', label: '总引用', reverse: false },
      { key: 'papers_before_prize', label: '获奖前产出', reverse: false },
      { key: 'biological_age_at_prize', label: '获奖生理年龄', reverse: true }
    ];

    // Normalize each dimension to 0-1
    const allVals = {};
    dims.forEach(dim => {
      const vals = laureates.map(l => l[dim.key]).filter(v => v != null);
      const min = d3.min(vals);
      const max = d3.max(vals);
      const range = max - min || 1;
      allVals[dim.key] = { min, max, range };
    });

    const normalize = (val, dim) => {
      if (val == null) return 0.5;
      let norm = (val - allVals[dim.key].min) / allVals[dim.key].range;
      if (dim.reverse) norm = 1 - norm;
      return norm;
    };

    // Calculate group means
    const highMeans = dims.map(dim => normalize(d3.mean(high, d => d[dim.key]) || 0, dim));
    const lowMeans = dims.map(dim => normalize(d3.mean(low, d => d[dim.key]) || 0, dim));

    // Radar chart
    const radarCx = innerW * 0.3;
    const radarCy = 240;
    const radarR = 160;
    const angleSlice = (2 * Math.PI) / dims.length;

    const g = this.svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    this.sectionTitle(g, '高产 vs 低产得主多维对比', 0, -20);

    // Grid circles
    [0.2, 0.4, 0.6, 0.8, 1.0].forEach(r => {
      g.append('circle')
        .attr('cx', radarCx).attr('cy', radarCy).attr('r', radarR * r)
        .attr('fill', 'none').attr('stroke', PALETTE.grid).attr('stroke-width', 1);
    });

    // Axis lines and labels
    dims.forEach((dim, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const lx = radarCx + Math.cos(angle) * (radarR + 20);
      const ly = radarCy + Math.sin(angle) * (radarR + 20);
      g.append('line')
        .attr('x1', radarCx).attr('y1', radarCy)
        .attr('x2', radarCx + Math.cos(angle) * radarR)
        .attr('y2', radarCy + Math.sin(angle) * radarR)
        .attr('stroke', PALETTE.grid);
      g.append('text')
        .attr('x', lx).attr('y', ly + 4)
        .attr('text-anchor', 'middle').attr('font-size', '11px').attr('fill', PALETTE.ink)
        .text(dim.label);
    });

    // Radar area helper
    const radarLine = (means, color) => {
      const points = means.map((v, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        return [radarCx + Math.cos(angle) * radarR * v, radarCy + Math.sin(angle) * radarR * v];
      });
      points.push(points[0]); // close
      return d3.line()(points);
    };

    // Low group (draw first, behind) — dashed
    g.append('path').attr('d', radarLine(lowMeans, PALETTE.gold))
      .attr('fill', PALETTE.gold).attr('fill-opacity', 0.1).attr('stroke', PALETTE.gold).attr('stroke-width', 2).attr('stroke-dasharray', '6,4');
    lowMeans.forEach((v, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      g.append('circle')
        .attr('cx', radarCx + Math.cos(angle) * radarR * v)
        .attr('cy', radarCy + Math.sin(angle) * radarR * v)
        .attr('r', 4).attr('fill', PALETTE.gold).attr('stroke', '#fffaf0').attr('stroke-width', 1.5);
    });

    // High group — solid
    g.append('path').attr('d', radarLine(highMeans, PALETTE.blue))
      .attr('fill', PALETTE.blue).attr('fill-opacity', 0.1).attr('stroke', PALETTE.blue).attr('stroke-width', 2.5);
    highMeans.forEach((v, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      g.append('circle')
        .attr('cx', radarCx + Math.cos(angle) * radarR * v)
        .attr('cy', radarCy + Math.sin(angle) * radarR * v)
        .attr('r', 4).attr('fill', PALETTE.blue);
    });

    // Legend below radar
    this.drawLegend([
      { color: PALETTE.blue, label: '高产组（Top 25%）' },
      { color: PALETTE.gold, label: '低产组（Bottom 25%）' }
    ], m.left, m.top + radarCy + radarR + 65, 1);

    // Right side: scatter plot of total_papers vs total_citations
    const scatterX = m.left + innerW * 0.55;
    const scatterW = innerW * 0.45;
    const scatterH = 340;
    const scatterY = m.top + 30;

    const g2 = this.svg.append('g').attr('transform', `translate(${scatterX},${scatterY})`);
    this.sectionTitle(g2, '论文产出 vs 引用影响力', 0, -20);

    const sx = d3.scaleLog().domain([1, d3.max(laureates, d => d.total_papers) || 1000]).range([0, scatterW - 60]);
    const sy = d3.scaleLog().domain([1, d3.max(laureates, d => d.total_citations) || 100000]).range([scatterH, 0]);

    const fmtBig = d => d >= 10000 ? (d / 1000).toFixed(0) + 'k' : d >= 1000 ? (d / 1000).toFixed(1) + 'k' : d;
    g2.append('g').attr('class', 'member-b-grid').call(d3.axisLeft(sy).tickValues([1, 10, 100, 1000, 10000]).tickFormat('').tickSize(-(scatterW - 60)));
    this.axisLeft(g2.append('g'), sy, 4);
    g2.append('g').attr('transform', `translate(0,${scatterH})`).call(d3.axisBottom(sx).tickValues([1, 10, 100, 1000]).tickFormat(fmtBig));

    // Quadrant lines (median)
    const medPapers = d3.median(laureates, d => d.total_papers);
    const medCitations = d3.median(laureates, d => d.total_citations);
    g2.append('line').attr('x1', sx(medPapers)).attr('x2', sx(medPapers)).attr('y1', 0).attr('y2', scatterH)
      .attr('stroke', PALETTE.muted).attr('stroke-dasharray', '3,4').attr('opacity', 0.4);
    g2.append('line').attr('x1', 0).attr('x2', scatterW - 60).attr('y1', sy(medCitations)).attr('y2', sy(medCitations))
      .attr('stroke', PALETTE.muted).attr('stroke-dasharray', '3,4').attr('opacity', 0.4);

    // Scatter dots
    g2.selectAll('circle').data(laureates).join('circle')
      .attr('cx', d => sx(d.total_papers || 1))
      .attr('cy', d => sy(d.total_citations || 1))
      .attr('r', 3)
      .attr('fill', d => CATEGORY_COLORS[d.category] || PALETTE.muted)
      .attr('opacity', 0.5)
      .on('mousemove', (event, d) => this.showTip(event,
        `<strong>${d.name}</strong><br>学科：${CATEGORY_LABELS[d.category] || d.category}<br>论文：${d.total_papers}<br>引用：${d.total_citations?.toLocaleString()}`
      ))
      .on('mouseleave', this.hideTip);

    g2.append('text').attr('class', 'member-b-axis-label').attr('transform', 'rotate(-90)')
      .attr('x', -scatterH / 2).attr('y', -42).attr('text-anchor', 'middle').text('总引用数');
    g2.append('text').attr('x', (scatterW - 60) / 2).attr('y', scatterH + 40)
      .attr('text-anchor', 'middle').attr('font-size', '11px').attr('fill', PALETTE.muted).text('总论文数');
  }
}

const d3 = globalThis.d3;

if (!d3) {
  throw new Error('D3.js is required for MorphingChart.');
}

export class MorphingChart {
  constructor(containerSelector, bus) {
    this.container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    this.bus = bus;
    this.impactByDiscipline = new Map();
    this.discipline = 'Medicine';
    this.filters = {
      minFwci: 100,
      minCitations: 0
    };
    this.margin = { top: 40, right: 36, bottom: 58, left: 70 };

    this.page = this.container?.closest('[data-module="morphing"]');
    this.kpis = this.page?.querySelector('[data-kpis]');
    this.reading = this.page?.querySelector('[data-e-reading]');

    this.disciplineButtons = Array.from(this.page?.querySelectorAll('[data-e-discipline]') ?? []);
    this.minFwciInput = this.page?.querySelector('[data-e-min-fwci]');
    this.minFwciRange = this.page?.querySelector('[data-e-min-fwci-range]');
    this.minCitationsInput = this.page?.querySelector('[data-e-min-citations]');

    this.svg = d3.select(this.container).append('svg').attr('class', 'member-a-svg');
    this.plot = this.svg.append('g');
    this.axisX = this.plot.append('g').attr('class', 'member-a-axis');
    this.axisY = this.plot.append('g').attr('class', 'member-a-axis');
    this.grid = this.plot.append('g').attr('class', 'member-a-grid');
    this.points = this.plot.append('g');
    this.annotations = this.plot.append('g');

    this.tooltip = d3.select(this.container)
      .append('div')
      .attr('class', 'member-a-tooltip')
      .style('opacity', 0);

    this.installControls();
  }

  async loadData(url) {
    const data = await fetch(url).then((response) => response.json());
    if (!data?.disciplines) {
      throw new Error('Member E impact data missing disciplines.');
    }

    this.impactByDiscipline = new Map(Object.entries(data.disciplines));
    this.render();
    return this;
  }

  render() {
    this.renderImpact();
  }

  resize() {
    this.renderImpact();
  }

  installControls() {
    this.disciplineButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (button.disabled) return;
        this.discipline = button.dataset.eDiscipline;
        this.disciplineButtons.forEach((item) => item.classList.toggle('is-active', item === button));
        this.renderImpact();
      });
    });

    const syncFwci = (value) => {
      const numeric = Math.max(0, Number(value) || 0);
      this.filters.minFwci = numeric;
      if (this.minFwciInput) this.minFwciInput.value = String(numeric);
      if (this.minFwciRange) this.minFwciRange.value = String(numeric);
      this.renderImpact();
    };

    this.minFwciRange?.addEventListener('input', (event) => {
      syncFwci(event.target.value);
    });

    this.minFwciInput?.addEventListener('input', (event) => {
      syncFwci(event.target.value);
    });

    this.minCitationsInput?.addEventListener('input', (event) => {
      this.filters.minCitations = Math.max(0, Number(event.target.value) || 0);
      this.renderImpact();
    });

  }

  renderImpact() {
    if (!this.container) return;

    const meta = DISCIPLINE_META[this.discipline] ?? DISCIPLINE_META.Medicine;
    const period = PERIODS.all;
    const dataset = this.impactByDiscipline.get(this.discipline);

    if (!dataset?.papers?.length) {
      this.setPanel(
        [
          { value: '—', label: '可视论文' },
          { value: '—', label: '平均 FWCI' },
          { value: '—', label: '平均引用' },
          { value: '—', label: '引用量前10%的论文占比' }
        ],
        '如何阅读',
        [
          '进入本章节后，系统会加载抽样后的论文影响力记录。',
          '通过筛选器收紧阈值，观察长尾区域的结构变化。'
        ]
      );
      this.renderPlaceholder(`正在准备${meta.label}论文影响力…`);
      return;
    }

    const filtered = dataset.papers.filter((item) => {
      const year = item.year ?? null;
      if (year === null || year < period.start || year > period.end) return false;
      const fwci = Number(item.fwci ?? 0);
      const citations = Number(item.citations ?? 0);
      return fwci >= this.filters.minFwci && citations >= this.filters.minCitations;
    });

    if (!filtered.length) {
      this.setPanel(
        [
          { value: '0', label: '可视论文' },
          { value: '—', label: '平均 FWCI' },
          { value: '—', label: '平均引用' },
          { value: '0%', label: '全论文库中引用量TOP10%的论文' }
        ],
        '暂无结果',
        ['当前筛选条件下没有可显示的论文记录。']
      );
      this.renderPlaceholder('暂无数据', '请降低阈值或切换学科。');
      return;
    }

    this.prepareSvg();
    const bounds = this.container.getBoundingClientRect();
    const width = Math.max(640, bounds.width || 640);
    const height = Math.max(560, bounds.height || 560);
    const innerWidth = width - this.margin.left - this.margin.right;
    const innerHeight = height - this.margin.top - this.margin.bottom;
    this.svg.attr('viewBox', `0 0 ${width} ${height}`);
    this.plot.attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    const minYear = d3.min(filtered, (item) => item.year) ?? period.start;
    const maxYear = d3.max(filtered, (item) => item.year) ?? period.end;
    const maxCitations = d3.max(filtered, (item) => Math.max(1, item.citations ?? 0)) ?? 1;
    const maxFwci = d3.max(filtered, (item) => item.fwci ?? 0) ?? 1;

    const x = d3.scaleLinear()
      .domain([minYear, maxYear])
      .nice()
      .range([0, innerWidth]);
    const y = d3.scaleLog()
      .domain([1, maxCitations * 1.05])
      .range([innerHeight, 0]);
    const r = d3.scaleSqrt()
      .domain([0, Math.max(1, maxFwci)])
      .range([4, 18]);
    const color = d3.scaleLinear()
      .domain([0, 1])
      .range(['#f3ede1', meta.color]);

    this.grid
      .call(d3.axisLeft(y).ticks(6, '~s').tickSize(-innerWidth).tickFormat(''));

    this.axisX
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0));

    this.axisY
      .call(d3.axisLeft(y).ticks(6, '~s').tickSizeOuter(0));

    const points = this.points
      .selectAll('circle')
      .data(filtered, (item) => item.id)
      .join('circle')
      .attr('cx', (item) => x(item.year))
      .attr('cy', (item) => y(Math.max(1, item.citations ?? 0)))
      .attr('r', (item) => r(item.fwci ?? 0))
      .attr('fill', (item) => {
        const percentile = Number(item.percentile ?? 0);
        return Number.isFinite(percentile) ? color(Math.min(1, Math.max(0, percentile))) : '#cfe6e3';
      })
      .attr('fill-opacity', 0.75)
      .attr('stroke', (item) => item.isPrize ? meta.color : '#fffaf0')
      .attr('stroke-width', (item) => item.isPrize ? 1.6 : 0.9)
      .on('mousemove', (event, item) => {
        points.attr('fill-opacity', (point) => (point === item ? 0.96 : 0.2));
        this.showTip(event, `
          <strong>${escapeHtml(item.title || '未标注标题')}</strong>
          发表年份：${escapeHtml(item.year ?? '—')}<br>
          引用数：${NUMBER(item.citations ?? 0)}<br>
          FWCI：${TWO_DECIMALS(item.fwci ?? 0)}<br>
          引用百分位：${PERCENT(item.percentile ?? 0)}<br>
          得主：${escapeHtml(item.laureateName || item.laureateId || '—')}
        `);
      })
      .on('mouseleave', () => {
        points.attr('fill-opacity', 0.75);
        this.hideTip();
      });

    this.annotations.selectAll('*').remove();
    this.annotations.append('text')
      .attr('class', 'member-a-hint')
      .attr('x', 0)
      .attr('y', -12)
      .text('半径=FWCI；描边高亮诺奖代表作。');

    this.annotations.append('text')
      .attr('class', 'member-a-hint')
      .attr('x', innerWidth - 6)
      .attr('y', innerHeight - 8)
      .attr('text-anchor', 'end')
      .text(`${meta.label} · 影响力散点`);

    const avgFwci = d3.mean(filtered, (item) => item.fwci ?? 0) ?? 0;
    const avgCitations = d3.mean(filtered, (item) => item.citations ?? 0) ?? 0;
    const top10Share = (d3.mean(filtered, (item) => item.isTop10 ? 1 : 0) ?? 0);
    const strongest = d3.greatest(filtered, (item) => (item.fwci ?? 0) * Math.log1p(item.citations ?? 0));

    this.setPanel(
      [
        { value: NUMBER(filtered.length), label: '可视论文' },
        { value: TWO_DECIMALS(avgFwci), label: '平均 FWCI' },
        { value: NUMBER(Math.round(avgCitations)), label: '平均引用' },
        { value: '有 ' + PERCENT(top10Share), label: '的论文是全论文库中引用量TOP10%的论文' }
      ],
      `长尾影响力 · ${meta.label}`,
      [
        `${meta.label}论文的引用分布极不均衡：少数代表性的获奖作（如 <em>${escapeHtml(strongest?.title ?? '未标注')}</em>）的 FWCI 和引用数远超其他的获奖论文，而绝大多数论文位于长尾之中——Top 10% 论文占据了总引用的大部分份额，反映了诺贝尔奖级别的科研产出中"赢者通吃"的学术影响力格局。`,
        '先看年份轴上气泡的疏密变化，再观察高 FWCI 是否集中在少数年份。',
        '颜色越深表示引用百分位越高，提示其在学科内的相对位置。',
        '用筛选器收紧 FWCI 和引用数阈值，可以观察长尾区域论文的分布结构变化。'
      ]
    );
  }

  prepareSvg() {
    this.svg.selectAll('*').remove();
    this.plot = this.svg.append('g');
    this.axisX = this.plot.append('g').attr('class', 'member-a-axis');
    this.axisY = this.plot.append('g').attr('class', 'member-a-axis');
    this.grid = this.plot.append('g').attr('class', 'member-a-grid');
    this.points = this.plot.append('g');
    this.annotations = this.plot.append('g');
    this.tooltip.style('opacity', 0);
  }

  setPanel(kpis, title, paragraphs) {
    if (this.kpis) {
      this.kpis.innerHTML = kpis.map((item) => `
        <div class="member-a-kpi">
          <strong>${escapeHtml(item.value)}</strong>
          <span>${escapeHtml(item.label)}</span>
        </div>
      `).join('');
    }

    if (this.reading) {
      const insight = paragraphs.length > 0 ? paragraphs[0] : '';
      const notes = paragraphs.length > 1 ? paragraphs.slice(1) : [];
      this.reading.innerHTML = `
        <h3>${escapeHtml(title)}</h3>
        <h4 class="member-a-insight-title">读图结论</h4>
        ${insight ? `<p class="member-a-insight">${insight}</p>` : ''}
        ${notes.length > 0 ? `<ul>${notes.map((item) => `<li>${item}</li>`).join('')}</ul>` : ''}
      `;
    }
  }

  renderPlaceholder(message, secondary = '正在加载长尾影响力数据。') {
    this.prepareSvg();
    const bounds = this.container.getBoundingClientRect();
    const width = Math.max(640, bounds.width || 640);
    const height = Math.max(560, bounds.height || 560);
    this.svg.attr('viewBox', `0 0 ${width} ${height}`);
    this.svg.append('line')
      .attr('x1', 42)
      .attr('x2', width - 42)
      .attr('y1', height / 2)
      .attr('y2', height / 2)
      .attr('stroke', 'rgba(19, 33, 29, 0.12)');
    this.svg.append('circle')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', 7)
      .attr('fill', '#1d3f36');
    this.svg.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2 - 26)
      .attr('text-anchor', 'middle')
      .attr('font-size', 18)
      .text(message);
    this.svg.append('text')
      .attr('class', 'member-a-hint')
      .attr('x', width / 2)
      .attr('y', height / 2 + 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .text(secondary);
  }

  showTip(event, html) {
    const bounds = this.container.getBoundingClientRect();
    const tooltipWidth = 220;
    const left = Math.min(event.clientX - bounds.left + 14, bounds.width - tooltipWidth - 10);
    const top = Math.min(Math.max(8, event.clientY - bounds.top + 14), bounds.height - 140);
    this.tooltip
      .html(html)
      .style('left', `${Math.max(8, left)}px`)
      .style('top', `${top}px`)
      .style('opacity', 1);
  }

  hideTip() {
    this.tooltip.style('opacity', 0);
  }
}

const DISCIPLINES = ['Physics', 'Chemistry', 'Medicine'];

const DISCIPLINE_META = {
  Physics: { label: '物理', color: '#1d3f36' },
  Chemistry: { label: '化学', color: '#3f8f75' },
  Medicine: { label: '医学', color: '#d25d3d' }
};

const PERIODS = {
  all: { label: '1900 年以来', start: 1900, end: 2019 },
  early: { label: '1900–1949', start: 1900, end: 1949 },
  middle: { label: '1950–1989', start: 1950, end: 1989 },
  recent: { label: '1990–2019', start: 1990, end: 2019 }
};

const NUMBER = d3.format(',');
const PERCENT = d3.format('.1%');
const TWO_DECIMALS = d3.format('.2f');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
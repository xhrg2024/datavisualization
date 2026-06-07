const d3 = globalThis.d3;

if (!d3) {
  throw new Error('D3.js is required for AlluvialChart.');
}

const DISCIPLINES = ['Physics', 'Chemistry', 'Medicine'];

const DISCIPLINE_META = {
  Physics: {
    label: '物理',
    color: '#4f7890'
  },
  Chemistry: {
    label: '化学',
    color: '#b56c43'
  },
  Medicine: {
    label: '医学',
    color: '#66875e'
  }
};

const PERIODS = {
  all: { label: '1900 年以来', start: 1900, end: 2019 },
  early: { label: '1900–1949', start: 1900, end: 1949 },
  middle: { label: '1950–1989', start: 1950, end: 1989 },
  recent: { label: '1990–2019', start: 1990, end: 2019 }
};

const TOPIC_COLORS = [
  '#355e5a',
  '#5f8577',
  '#91aa8e',
  '#c9b66f',
  '#b77852',
  '#8a6976',
  '#6c7f9b',
  '#b2a79d'
];

const CHART_HEIGHT = 560;
const EVOLUTION_TOPIC_LIMIT = 6;
const BRIDGE_TOPIC_LIMIT = 12;

const NUMBER = d3.format(',');
const PERCENT = d3.format('.1%');
const ONE_DECIMAL = d3.format('.1f');
const FOUR_DECIMALS = d3.format('.4f');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fitLabel(value, length = 38) {
  const text = String(value ?? '');
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function increment(map, key, amount = 1) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + amount);
}

function hydrateAggregate(discipline, aggregate) {
  return {
    ...aggregate,
    discipline,
    topicCounts: new Map(aggregate.topicCounts ?? []),
    primaryByDecade: new Map(
      Object.entries(aggregate.primaryByDecade ?? {})
        .map(([decade, counts]) => [Number(decade), new Map(counts)])
    ),
    laureates: aggregate.laureates ?? [],
    ready: true
  };
}

export class AlluvialChart {
  constructor(containerSelector, bus) {
    this.container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    this.bus = bus;
    this.page = this.container?.closest('[data-module="alluvial"]');
    this.view = 'evolution';
    this.discipline = 'Medicine';
    this.period = 'all';
    this.baseCounts = new Map();
    this.aggregates = new Map();

    this.kpis = this.page?.querySelector('[data-d-kpis]');
    this.insight = this.page?.querySelector('[data-d-insight]');
    this.reading = this.page?.querySelector('[data-d-reading]');
    this.status = this.page?.querySelector('[data-d-status]');
    this.statusText = this.page?.querySelector('[data-d-status-text]');
    this.statusProgress = this.page?.querySelector('[data-d-status-progress]');
    this.kicker = this.page?.querySelector('[data-d-kicker]');
    this.question = this.page?.querySelector('[data-d-question]');
    this.chartTitle = this.page?.querySelector('[data-d-chart-title]');
    this.caption = this.page?.querySelector('[data-d-caption]');
    this.takeaway = this.page?.querySelector('[data-d-takeaway]');
    this.periodPanel = this.page?.querySelector('[data-d-period-panel]');
    this.disciplinePanel = this.page?.querySelector('[data-d-discipline-panel]');
    this.periodSelect = this.page?.querySelector('[data-d-period]');
    this.tabs = Array.from(this.page?.querySelectorAll('[data-d-view]') ?? []);
    this.disciplineButtons = Array.from(this.page?.querySelectorAll('[data-d-discipline]') ?? []);

    this.svg = d3.select(this.container).append('svg').attr('class', 'member-d-svg');
    this.tooltip = d3.select(this.container)
      .append('div')
      .attr('class', 'member-d-tooltip')
      .style('opacity', 0);

    this.installControls();
    this.installActivationObserver();
    this.renderPlaceholder('进入本章节后读取真实论文记录。');
  }

  installControls() {
    this.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        this.view = tab.dataset.dView;
        this.tabs.forEach((item) => {
          const active = item === tab;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-selected', String(active));
        });
        this.syncControls();
        this.render();
        this.activateIfNeeded();
      });
    });

    this.disciplineButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.discipline = button.dataset.dDiscipline;
        this.disciplineButtons.forEach((item) => item.classList.toggle('is-active', item === button));
        this.render();
        this.activateIfNeeded();
      });
    });

    this.periodSelect?.addEventListener('change', () => {
      this.period = this.periodSelect.value;
      this.render();
    });

    this.syncControls();
  }

  installActivationObserver() {
    if (!this.page) return;
    this.observer = new MutationObserver(() => this.activateIfNeeded());
    this.observer.observe(this.page, { attributes: true, attributeFilter: ['class'] });
  }

  syncControls() {
    if (this.periodPanel) this.periodPanel.hidden = this.view !== 'evolution';
    if (this.disciplinePanel) this.disciplinePanel.hidden = this.view === 'bridges';
  }

  async loadData(dataPath = './data/memberD/memberD_processed.json') {
    try {
      const data = await d3.json(dataPath);
      if (!data?.disciplines) throw new Error('Processed Member D data is missing disciplines.');
      this.baseCounts = new Map(Object.entries(data.baseCounts ?? {}));
      this.aggregates = new Map(DISCIPLINES.map((discipline) => [
        discipline,
        hydrateAggregate(discipline, data.disciplines[discipline] ?? {})
      ]));
      this.setStatus('ready', '已载入轻量化论文主题聚合数据。');
    } catch (error) {
      console.error('Member D processed data load failed:', error);
      this.setStatus('error', '轻量化论文主题数据读取失败。');
      this.renderPlaceholder('D 模块数据读取失败。', '请确认 data/memberD/memberD_processed.json 已随仓库提交。');
    }

    this.render();
    return this;
  }

  render() {
    if (this.view === 'evolution') this.renderEvolution();
    if (this.view === 'bridges') this.renderBridges();
    if (this.view === 'breadth') this.renderBreadth();
  }

  resize() {
    this.activateIfNeeded();
    this.render();
  }

  activateIfNeeded() {
    if (!this.page?.classList.contains('is-active')) return;
    this.render();
  }

  setStatus(state, text, progress = '') {
    this.status?.classList.toggle('is-loading', state === 'loading');
    this.status?.classList.toggle('is-error', state === 'error');
    if (this.statusText) this.statusText.textContent = text;
    if (this.statusProgress) this.statusProgress.textContent = progress;
  }

  prepareSvg(height = CHART_HEIGHT) {
    const bounds = this.container.getBoundingClientRect();
    this.width = Math.max(640, bounds.width || 640);
    this.height = height;
    this.svg
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .style('height', `${this.height}px`);
    this.svg.selectAll('*').remove();
    this.tooltip.style('opacity', 0);
  }

  setFigure(kicker, question, title, caption) {
    if (this.kicker) this.kicker.textContent = kicker;
    if (this.question) this.question.textContent = question;
    if (this.chartTitle) this.chartTitle.textContent = title;
    if (this.caption) this.caption.textContent = caption;
  }

  setTakeaway(text) {
    if (this.takeaway) {
      this.takeaway.innerHTML = `<p>${escapeHtml(text)}</p>`;
    }
  }

  setInsight(title, paragraphs) {
    if (this.insight) {
      this.insight.innerHTML = `
        <h4>${escapeHtml(title)}</h4>
        ${paragraphs.map((p) => `<p>${p}</p>`).join('')}
      `;
    }
  }

  setPanel(kpis, title, paragraphs) {
    if (this.kpis) {
      this.kpis.innerHTML = kpis.map((item) => `
        <div class="member-d-kpi">
          <strong>${escapeHtml(item.value)}</strong>
          <span>${escapeHtml(item.label)}</span>
        </div>
      `).join('');
    }

    if (this.reading) {
      this.reading.innerHTML = `
        <h4>${escapeHtml(title)}</h4>
        ${paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('')}
      `;
    }
  }

  renderPlaceholder(message, secondary = 'CSV 采用边读取边聚合，不会把整份明细长期留在内存中。') {
    this.prepareSvg();
    this.svg.append('line')
      .attr('x1', 42)
      .attr('x2', this.width - 42)
      .attr('y1', this.height / 2)
      .attr('y2', this.height / 2)
      .attr('stroke', 'rgba(29, 44, 42, 0.12)');
    this.svg.append('circle')
      .attr('cx', this.width / 2)
      .attr('cy', this.height / 2)
      .attr('r', 7)
      .attr('fill', '#66875e');
    this.svg.append('text')
      .attr('x', this.width / 2)
      .attr('y', this.height / 2 - 26)
      .attr('text-anchor', 'middle')
      .attr('font-family', '"Songti SC", "STSong", "SimSun", serif')
      .attr('font-size', 18)
      .text(message);
    this.svg.append('text')
      .attr('class', 'muted')
      .attr('x', this.width / 2)
      .attr('y', this.height / 2 + 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .text(secondary);
  }

  showTip(event, html) {
    const bounds = this.container.getBoundingClientRect();
    const tooltipWidth = 290;
    const left = Math.min(event.clientX - bounds.left + 14, bounds.width - tooltipWidth - 10);
    const top = Math.min(Math.max(8, event.clientY - bounds.top + 14), bounds.height - 130);
    this.tooltip
      .html(html)
      .style('left', `${Math.max(8, left)}px`)
      .style('top', `${top}px`)
      .style('opacity', 1);
  }

  hideTip() {
    this.tooltip.style('opacity', 0);
  }

  renderEvolution() {
    const aggregate = this.aggregates.get(this.discipline);
    const meta = DISCIPLINE_META[this.discipline];
    const period = PERIODS[this.period];

    this.setFigure(
      `主题河流 · ${this.discipline.toUpperCase()}`,
      '01 回答：微观主题如何随年代更替？',
      '微观主题如何随时代更替？',
      `面积比较${meta.label}奖得主论文中，${period.label}出现频率最高的 ${EVOLUTION_TOPIC_LIMIT} 个 OpenAlex 主主题。`
    );

    if (!aggregate) {
      this.setPanel(
        [
          { value: '—', label: '带主题论文' },
          { value: '—', label: 'OpenAlex 主主题数' },
          { value: this.baseCounts.get(this.discipline) ?? '—', label: `${meta.label}奖得主记录数` },
          { value: '—', label: '论文时间跨度' }
        ],
        '如何阅读',
        [
          '进入本章节后，图表才会读取所选学科的论文记录。',
          '河流越宽，表示这一微观主题在该年代越常见；右侧标签帮助定位延续至今的研究前沿。'
        ]
      );
      this.setTakeaway(`正在读取${meta.label}论文主题，完成后将显示${period.label}的头部主题结构。`);
      this.renderPlaceholder(`正在准备${meta.label}论文主题…`);
      return;
    }

    const decades = d3.range(period.start, period.end + 1, 10);
    const topicTotals = new Map();
    decades.forEach((decade) => {
      aggregate.primaryByDecade.get(decade)?.forEach((count, topic) => increment(topicTotals, topic, count));
    });

    const topics = Array.from(topicTotals.entries())
      .sort((a, b) => d3.descending(a[1], b[1]))
      .slice(0, EVOLUTION_TOPIC_LIMIT)
      .map(([topic]) => topic);
    if (!topics.length) {
      this.setPanel(
        [
          { value: '0', label: '带主题论文' },
          { value: '0', label: 'OpenAlex 主主题数' },
          { value: this.baseCounts.get(this.discipline) ?? '—', label: `${meta.label}奖得主记录数` },
          { value: '—', label: '论文时间跨度' }
        ],
        '暂无数据',
        ['当前学科和观察窗口没有可展示的 OpenAlex 主主题记录。']
      );
      this.setTakeaway(`${period.label}暂无可展示的 OpenAlex 主主题记录。`);
      this.renderPlaceholder('暂无数据', '当前学科和观察窗口没有可展示的主题记录。');
      return;
    }
    const keys = [...topics];
    const rows = decades.map((decade) => {
      const counts = aggregate.primaryByDecade.get(decade) ?? new Map();
      const row = { decade };
      topics.forEach((topic) => {
        row[topic] = counts.get(topic) ?? 0;
      });
      return row;
    });
    const stack = d3.stack().keys(keys).offset(d3.stackOffsetExpand)(rows);

    this.prepareSvg();
    const margin = { top: 48, right: 188, bottom: 62, left: 60 };
    const innerWidth = this.width - margin.left - margin.right;
    const innerHeight = this.height - margin.top - margin.bottom;
    const group = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear().domain(d3.extent(decades)).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);
    const color = d3.scaleOrdinal().domain(keys).range(TOPIC_COLORS);

    group.append('g')
      .attr('class', 'member-d-grid')
      .call(d3.axisLeft(y).ticks(4).tickSize(-innerWidth).tickFormat(''));

    group.append('g')
      .attr('class', 'member-d-axis')
      .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('.0%')).tickSizeOuter(0));

    group.append('g')
      .attr('class', 'member-d-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x)
        .tickValues(decades.filter((_, index) => index % (this.width < 860 ? 2 : 1) === 0))
        .tickFormat((decade) => `${decade}s`)
        .tickSizeOuter(0));

    const area = d3.area()
      .x((row) => x(row.data.decade))
      .y0((row) => y(row[0]))
      .y1((row) => y(row[1]))
      .curve(d3.curveCatmullRom.alpha(0.55));

    const paths = group.append('g')
      .selectAll('path')
      .data(stack)
      .join('path')
      .attr('d', area)
      .attr('fill', (series) => color(series.key))
      .attr('stroke', '#fbfaf6')
      .attr('stroke-width', 1)
      .attr('opacity', 0.9)
      .on('mousemove', (event, series) => {
        paths.attr('opacity', (item) => item === series ? 1 : 0.22);
        const [pointerX] = d3.pointer(event, group.node());
        const decade = d3.least(decades, (value) => Math.abs(x(value) - pointerX));
        const row = series.find((item) => item.data.decade === decade);
        const share = row ? row[1] - row[0] : 0;
        this.showTip(event, `
          <strong>${escapeHtml(series.key)}</strong>
          ${decade}s 主主题占比：${PERCENT(share)}
        `);
      })
      .on('mouseleave', () => {
        paths.attr('opacity', 0.9);
        this.hideTip();
      });

    const lastIndex = decades.length - 1;
    const labelRows = stack
      .map((series) => {
        const last = series[lastIndex];
        return { series, targetY: y((last[0] + last[1]) / 2), y: y((last[0] + last[1]) / 2) };
      })
      .sort((a, b) => d3.ascending(a.y, b.y));
    const labelGap = 16;
    labelRows.forEach((row, index) => {
      row.y = Math.max(row.y, index ? labelRows[index - 1].y + labelGap : 8);
    });
    const overflow = labelRows.at(-1)?.y - (innerHeight - 8);
    if (overflow > 0) {
      labelRows.forEach((row) => { row.y -= overflow; });
    }
    for (let index = labelRows.length - 2; index >= 0; index -= 1) {
      labelRows[index].y = Math.min(labelRows[index].y, labelRows[index + 1].y - labelGap);
    }

    group.append('g')
      .selectAll('g')
      .data(labelRows)
      .join('g')
      .attr('transform', (row) => `translate(${innerWidth + 12},${row.y})`)
      .call((labels) => {
        labels
          .on('mousemove', (event, row) => {
            this.showTip(event, `<strong>${escapeHtml(row.series.key)}</strong>完整 OpenAlex 主主题名称`);
          })
          .on('mouseleave', () => this.hideTip());
        labels.append('line')
          .attr('x1', -9)
          .attr('x2', -2)
          .attr('y1', (row) => row.targetY - row.y)
          .attr('stroke', (row) => color(row.series.key))
          .attr('stroke-width', 3);
        labels.append('text')
          .attr('dy', '0.32em')
          .attr('font-size', 10)
          .attr('font-weight', 700)
          .text((row) => fitLabel(row.series.key, 25));
        labels.append('title').text((row) => row.series.key);
      });

    group.append('text')
      .attr('class', 'muted')
      .attr('x', 0)
      .attr('y', -18)
      .attr('font-size', 10)
      .attr('font-weight', 700)
      .attr('letter-spacing', '0.08em')
      .text('主主题记录占比');

    const topTopic = topics[0] ?? '未标注';
    const secondTopic = topics[1];
    this.setTakeaway(
      `${period.label}，${meta.label}奖相关论文中，${fitLabel(topTopic, 48)}${secondTopic ? `、${fitLabel(secondTopic, 48)}` : ''} 等主题占比较高。`
    );
    const topicShare = (() => {
      const totalLast = decades.reduce((sum, decade) => {
        const counts = aggregate.primaryByDecade.get(decade) ?? new Map();
        return sum + (counts.get(topTopic) ?? 0);
      }, 0);
      const grandTotal = Array.from(topicTotals.values()).reduce((a, b) => a + b, 0);
      return grandTotal > 0 ? PERCENT(totalLast / grandTotal) : '—';
    })();
    this.setInsight('读图结论', [
      `${meta.label}奖得主论文中，<em>${escapeHtml(topTopic)}</em> 在 ${period.label} 持续占据最高份额（累计占比约 ${topicShare}），表明该方向是该学科长期关注的核心议题。`,
      `${secondTopic ? `排名第二的 ${escapeHtml(secondTopic)} 与之构成双核心格局，` : ''}多数 Top 主题在不同年代间比例此消彼长，反映研究前沿随技术与认知进步在逐步迁移。`
    ]);
    this.setPanel(
      [
        { value: NUMBER(aggregate.topicRows), label: '带主题论文' },
        { value: NUMBER(aggregate.primaryTopicCount), label: 'OpenAlex 主主题数' },
        { value: this.baseCounts.get(this.discipline) ?? '—', label: `${meta.label}奖得主记录数` },
        { value: `${aggregate.minYear}–${aggregate.maxYear}`, label: '论文时间跨度' }
      ],
      '图表解读',
      [
        `${period.label}出现频率最高的主主题是 <em>${escapeHtml(topTopic)}</em>。`,
        `当前仅比较 Top ${EVOLUTION_TOPIC_LIMIT} 主题的百分比构成，避免长尾主题与论文数量增长掩盖主要结构。`,
        '移动到河流或右侧标签，可查看完整主题名与对应年代占比。'
      ]
    );
  }

  renderBridges() {
    this.setFigure(
      '加权冲积 · ALL DISCIPLINES',
      '02 回答：传统学科边界在哪里变得模糊？',
      '传统学科边界在哪里变得模糊？',
      '连线表示一个 OpenAlex 微观主题在物理、化学与医学得主论文中的出现次数；跨越多类的主题优先展示。'
    );

    const loaded = DISCIPLINES.map((discipline) => this.aggregates.get(discipline));
    if (loaded.some((aggregate) => !aggregate)) {
      const ready = loaded.filter(Boolean).length;
      this.setPanel(
        [
          { value: `${ready} / 3`, label: '已读取学科' },
          { value: '—', label: '跨界微观主题' },
          { value: '—', label: '展示流向' },
          { value: '—', label: '主题标注次数' }
        ],
        '为什么需要等待',
        [
          '这一视图需要同时读取物理、化学与医学论文表，再比较相同 OpenAlex 主题在不同传统学科中的出现频率。',
          '文件只在首次打开该视图时读取，之后切换视图会直接使用内存中的聚合结果。'
        ]
      );
      this.setTakeaway('正在汇合三个学科的主题记录；同一主题接收多个学科流入时，即呈现跨学科属性。');
      this.renderPlaceholder('正在汇合三个学科的主题流向…');
      return;
    }

    const matrix = new Map();
    DISCIPLINES.forEach((discipline) => {
      this.aggregates.get(discipline).topicCounts.forEach((count, topic) => {
        if (!matrix.has(topic)) matrix.set(topic, { topic, counts: new Map(), total: 0 });
        const item = matrix.get(topic);
        item.counts.set(discipline, count);
        item.total += count;
      });
    });

    const ranked = Array.from(matrix.values())
      .map((item) => ({
        ...item,
        categories: item.counts.size,
        score: item.total * (1 + (item.counts.size - 1) * 0.8)
      }))
      .sort((a, b) => d3.descending(a.score, b.score));
    const crossTopics = ranked.filter((item) => item.categories >= 2);
    const topics = crossTopics
      .slice(0, BRIDGE_TOPIC_LIMIT)
      .sort((a, b) => d3.descending(a.total, b.total));
    const flows = topics.flatMap((topic) => DISCIPLINES
      .map((discipline) => ({
        discipline,
        topic: topic.topic,
        count: topic.counts.get(discipline) ?? 0
      }))
      .filter((flow) => flow.count > 0));
    if (!flows.length) {
      this.setPanel(
        [
          { value: '0', label: '跨学科 OpenAlex 主题' },
          { value: '0', label: '展示流向' },
          { value: '0', label: '关联论文 / 标注数' },
          { value: '3', label: '传统诺奖学科' }
        ],
        '暂无数据',
        ['当前数据中没有可展示的跨学科主题流向。']
      );
      this.setTakeaway('暂无跨学科主题流向。');
      this.renderPlaceholder('暂无数据', '当前数据中没有可展示的跨学科主题流向。');
      return;
    }

    this.prepareSvg();
    const margin = { top: 52, right: 278, bottom: 32, left: 142 };
    const innerWidth = this.width - margin.left - margin.right;
    const innerHeight = this.height - margin.top - margin.bottom;
    const group = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const leftX = 0;
    const rightX = Math.max(270, innerWidth);
    const nodeWidth = 12;
    const categoryGap = 22;
    const topicGap = 8;

    const leftNodes = DISCIPLINES.map((discipline) => ({
      id: discipline,
      label: DISCIPLINE_META[discipline].label,
      total: d3.sum(flows.filter((flow) => flow.discipline === discipline), (flow) => flow.count)
    }));
    const rightNodes = topics.map((topic) => ({
      id: topic.topic,
      label: topic.topic,
      total: d3.sum(flows.filter((flow) => flow.topic === topic.topic), (flow) => flow.count)
    }));
    const totalFlow = d3.sum(flows, (flow) => flow.count);
    const scale = Math.min(
      (innerHeight - categoryGap * (leftNodes.length - 1)) / d3.sum(leftNodes, (node) => node.total),
      (innerHeight - topicGap * (rightNodes.length - 1)) / d3.sum(rightNodes, (node) => node.total)
    );

    function positionNodes(nodes, gap) {
      let cursor = 0;
      nodes.forEach((node) => {
        node.y = cursor;
        node.height = Math.max(1, node.total * scale);
        node.offset = 0;
        cursor += node.height + gap;
      });
    }

    positionNodes(leftNodes, categoryGap);
    positionNodes(rightNodes, topicGap);
    const leftById = new Map(leftNodes.map((node) => [node.id, node]));
    const rightById = new Map(rightNodes.map((node) => [node.id, node]));

    flows.sort((a, b) => {
      const categoryOrder = DISCIPLINES.indexOf(a.discipline) - DISCIPLINES.indexOf(b.discipline);
      return categoryOrder || topics.findIndex((topic) => topic.topic === a.topic) - topics.findIndex((topic) => topic.topic === b.topic);
    });
    flows.forEach((flow) => {
      const source = leftById.get(flow.discipline);
      const target = rightById.get(flow.topic);
      flow.width = Math.max(1, flow.count * scale);
      flow.sourceY = source.y + source.offset + flow.width / 2;
      flow.targetY = target.y + target.offset + flow.width / 2;
      source.offset += flow.width;
      target.offset += flow.width;
    });

    group.append('text')
      .attr('class', 'muted')
      .attr('x', leftX)
      .attr('y', -24)
      .attr('font-size', 10)
      .attr('font-weight', 800)
      .attr('letter-spacing', '0.08em')
      .text('传统诺奖类别');
    group.append('text')
      .attr('class', 'muted')
      .attr('x', rightX)
      .attr('y', -24)
      .attr('font-size', 10)
      .attr('font-weight', 800)
      .attr('letter-spacing', '0.08em')
      .text('OPENALEX 微观主题');

    const links = group.append('g')
      .attr('fill', 'none')
      .selectAll('path')
      .data(flows)
      .join('path')
      .attr('d', (flow) => {
        const bend = (rightX - leftX) * 0.46;
        return `M${leftX + nodeWidth},${flow.sourceY} C${leftX + bend},${flow.sourceY} ${rightX - bend},${flow.targetY} ${rightX},${flow.targetY}`;
      })
      .attr('stroke', (flow) => DISCIPLINE_META[flow.discipline].color)
      .attr('stroke-width', (flow) => flow.width)
      .attr('stroke-opacity', 0.34)
      .on('mousemove', (event, flow) => {
        links.attr('stroke-opacity', (item) => item === flow ? 0.86 : 0.08);
        this.showTip(event, `
          <strong>${escapeHtml(flow.topic)}</strong>
          来源学科：${escapeHtml(DISCIPLINE_META[flow.discipline].label)}<br>
          关联论文数：${NUMBER(flow.count)}
        `);
      })
      .on('mouseleave', () => {
        links.attr('stroke-opacity', 0.34);
        this.hideTip();
      });

    group.append('g')
      .selectAll('rect')
      .data(leftNodes)
      .join('rect')
      .attr('x', leftX)
      .attr('y', (node) => node.y)
      .attr('width', nodeWidth)
      .attr('height', (node) => node.height)
      .attr('fill', (node) => DISCIPLINE_META[node.id].color);

    group.append('g')
      .selectAll('text')
      .data(leftNodes)
      .join('text')
      .attr('x', leftX - 12)
      .attr('y', (node) => node.y + node.height / 2)
      .attr('dy', '0.34em')
      .attr('text-anchor', 'end')
      .attr('font-size', 12)
      .attr('font-weight', 800)
      .text((node) => `${node.label}  ${NUMBER(node.total)}`);

    const topicNodes = group.append('g')
      .selectAll('rect')
      .data(rightNodes)
      .join('rect')
      .attr('x', rightX)
      .attr('y', (node) => node.y)
      .attr('width', nodeWidth)
      .attr('height', (node) => node.height)
      .attr('fill', '#355e5a')
      .on('mousemove', (event, node) => {
        this.showTip(event, `
          <strong>${escapeHtml(node.label)}</strong>
          跨学科主题<br>
          关联论文数：${NUMBER(node.total)}
        `);
      })
      .on('mouseleave', () => this.hideTip());

    const topicLabels = group.append('g')
      .selectAll('text')
      .data(rightNodes)
      .join('text')
      .attr('x', rightX + nodeWidth + 9)
      .attr('y', (node) => node.y + node.height / 2)
      .attr('dy', '0.34em')
      .attr('font-size', 10)
      .attr('font-weight', 700)
      .text((node) => `${fitLabel(node.label, 33)}  ${NUMBER(node.total)}`)
      .on('mousemove', (event, node) => {
        this.showTip(event, `
          <strong>${escapeHtml(node.label)}</strong>
          跨学科主题<br>
          关联论文数：${NUMBER(node.total)}
        `);
      })
      .on('mouseleave', () => this.hideTip());
    topicLabels.append('title').text((node) => node.label);

    const strongest = topics[0];
    this.setTakeaway('同一个微观主题如果同时接收多个传统学科的流入，就说明它具有跨学科属性。');
    const threeWayTopics = topics.filter((t) => t.counts.size === 3);
    this.setInsight('读图结论', [
      `在 ${crossTopics.length} 个跨学科主题中，<em>${escapeHtml(strongest?.topic ?? '未标注')}</em> 的综合权重最高，说明它在物理、化学与医学之间的交叉最为显著。`,
      threeWayTopics.length > 0
        ? `共有 ${threeWayTopics.length} 个主题同时被三个传统学科共享，表明诺奖研究的学科边界在微观层面已相当模糊。`
        : `尽管多数跨界主题仅跨越两个学科，但线宽分布表明学科间的知识渗透已是普遍现象。`
    ]);
    this.setPanel(
      [
        { value: NUMBER(crossTopics.length), label: '跨学科 OpenAlex 主题' },
        { value: NUMBER(flows.length), label: '展示流向' },
        { value: NUMBER(totalFlow), label: '关联论文 / 标注数' },
        { value: '3', label: '传统诺奖学科' }
      ],
      '图表解读',
      [
        `权重最高的跨界主题是 <em>${escapeHtml(strongest?.topic ?? '未标注')}</em>。`,
        '同一主题接收多个传统学科流入时，说明它具有跨学科属性；线越宽，关联论文越多。',
        `图中仅保留综合权重最高的 ${BRIDGE_TOPIC_LIMIT} 个主题，并按总权重从高到低排列。`
      ]
    );
  }

  renderBreadth() {
    const aggregate = this.aggregates.get(this.discipline);
    const meta = DISCIPLINE_META[this.discipline];

    this.setFigure(
      `主题扩散 · ${this.discipline.toUpperCase()}`,
      '03 回答：哪些得主深耕单点，哪些得主跨域扩散？',
      '谁在单点深耕，谁在跨域架桥？',
      '每个圆点是一位诺奖得主；纵轴 0–0.4 区间已压缩，气泡大小表示累计主题标注数。'
    );

    if (!aggregate) {
      this.setPanel(
        [
          { value: '—', label: '可比较得主' },
          { value: '—', label: '平均扩散指数' },
          { value: '—', label: '单人 OpenAlex 主题最多值' },
          { value: '—', label: '增强论文记录数' }
        ],
        '如何阅读',
        [
          '横轴是被当前论文表收录的产出数量，纵轴是主题扩散指数。',
          '靠右上方的得主既有较多论文，也跨越较广的主题边界。'
        ]
      );
      this.setTakeaway(`正在准备${meta.label}奖得主的主题扩散画像。`);
      this.renderPlaceholder(`正在准备${meta.label}得主主题画像…`);
      return;
    }

    const laureates = aggregate.laureates.filter((laureate) => laureate.papers >= 10 && laureate.topicCount >= 2);
    if (!laureates.length) {
      this.setPanel(
        [
          { value: '0', label: '可比较得主' },
          { value: '—', label: '平均扩散指数' },
          { value: '0', label: '单人 OpenAlex 主题最多值' },
          { value: NUMBER(aggregate.enrichedRows), label: '增强论文记录数' }
        ],
        '暂无数据',
        ['当前学科没有满足筛选条件的得主记录。']
      );
      this.setTakeaway('暂无满足筛选条件的得主主题画像。');
      this.renderPlaceholder('暂无数据', '当前学科没有满足筛选条件的得主记录。');
      return;
    }

    this.prepareSvg();
    const margin = { top: 46, right: 46, bottom: 68, left: 78 };
    const innerWidth = this.width - margin.left - margin.right;
    const innerHeight = this.height - margin.top - margin.bottom;
    const group = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLog()
      .domain([Math.max(8, d3.min(laureates, (item) => item.papers) ?? 8), d3.max(laureates, (item) => item.papers) ?? 10])
      .nice()
      .range([0, innerWidth]);
    const compressedFloor = innerHeight * 0.86;
    const y = d3.scaleLinear()
      .domain([0, 0.4, 1])
      .range([innerHeight, compressedFloor, 0]);
    const yTicks = [0, 0.4, 0.6, 0.8, 1];
    const radius = d3.scaleSqrt()
      .domain([0, d3.max(laureates, (item) => item.topicAnnotations) ?? 1])
      .range([4, 22]);
    const color = d3.scaleLinear()
      .domain([0, 1])
      .range(['#d4ded5', meta.color]);
    const average = d3.mean(laureates, (item) => item.diversity) ?? 0;

    group.append('g')
      .attr('class', 'member-d-grid')
      .call(d3.axisLeft(y).tickValues(yTicks).tickSize(-innerWidth).tickFormat(''));

    group.append('g')
      .attr('class', 'member-d-axis')
      .call(d3.axisLeft(y).tickValues(yTicks).tickFormat((value) => ONE_DECIMAL(value)).tickSizeOuter(0));

    const breakY = compressedFloor + (innerHeight - compressedFloor) * 0.48;
    group.append('g')
      .attr('stroke', '#52615d')
      .attr('stroke-width', 1.4)
      .attr('stroke-linecap', 'round')
      .selectAll('line')
      .data([-4, 3])
      .join('line')
      .attr('x1', -5)
      .attr('x2', 5)
      .attr('y1', (offset) => breakY + offset + 4)
      .attr('y2', (offset) => breakY + offset - 4);

    group.append('text')
      .attr('class', 'muted')
      .attr('x', 12)
      .attr('y', breakY + 4)
      .attr('font-size', 10)
      .attr('font-weight', 700)
      .text('0–0.4 区间已压缩');

    group.append('g')
      .attr('class', 'member-d-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(6, '~s').tickSizeOuter(0));

    group.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', y(average))
      .attr('y2', y(average))
      .attr('stroke', meta.color)
      .attr('stroke-dasharray', '4 5')
      .attr('stroke-opacity', 0.7);

    group.append('text')
      .attr('x', innerWidth)
      .attr('y', y(average) - 7)
      .attr('text-anchor', 'end')
      .attr('font-size', 10)
      .attr('font-weight', 700)
      .attr('fill', meta.color)
      .text(`平均 ${FOUR_DECIMALS(average)}`);

    const points = group.append('g')
      .selectAll('circle')
      .data(laureates)
      .join('circle')
      .attr('cx', (item) => x(item.papers))
      .attr('cy', (item) => y(item.diversity))
      .attr('r', (item) => radius(item.topicAnnotations))
      .attr('fill', (item) => color(item.top10Rate))
      .attr('fill-opacity', 0.7)
      .attr('stroke', '#fbfaf6')
      .attr('stroke-width', 1.2)
      .on('mousemove', (event, item) => {
        points.attr('fill-opacity', (point) => point === item ? 0.96 : 0.18);
        this.showTip(event, `
          <strong>${escapeHtml(item.name)}</strong>
          论文数：${NUMBER(item.papers)}<br>
          OpenAlex 主题数：${NUMBER(item.topicCount)}<br>
          主题扩散指数：${ONE_DECIMAL(item.diversity)}<br>
          Top 主题：${escapeHtml(item.topTopic)}
        `);
      })
      .on('mouseleave', () => {
        points.attr('fill-opacity', 0.7);
        this.hideTip();
      });

    const labels = laureates
      .slice()
      .sort((a, b) => d3.descending(a.diversity * Math.log1p(a.papers), b.diversity * Math.log1p(b.papers)))
      .slice(0, 5);
    const labelRows = labels
      .map((item) => ({
        item,
        x: Math.min(innerWidth - 92, x(item.papers) + radius(item.topicAnnotations) + 6),
        targetY: y(item.diversity),
        y: y(item.diversity)
      }))
      .sort((a, b) => d3.ascending(a.y, b.y));
    const labelGap = 14;
    labelRows.forEach((row, index) => {
      row.y = Math.max(row.y, index ? labelRows[index - 1].y + labelGap : 10);
    });
    const overflow = labelRows.at(-1)?.y - (innerHeight - 10);
    if (overflow > 0) labelRows.forEach((row) => { row.y -= overflow; });

    group.append('g')
      .selectAll('line')
      .data(labelRows)
      .join('line')
      .attr('x1', (row) => x(row.item.papers) + radius(row.item.topicAnnotations) + 2)
      .attr('x2', (row) => row.x - 2)
      .attr('y1', (row) => row.targetY)
      .attr('y2', (row) => row.y)
      .attr('stroke', 'rgba(29, 44, 42, 0.36)')
      .attr('stroke-width', 0.8);

    group.append('g')
      .selectAll('text')
      .data(labelRows)
      .join('text')
      .attr('x', (row) => row.x)
      .attr('y', (row) => row.y)
      .attr('dy', '0.34em')
      .attr('font-size', 10)
      .attr('font-weight', 700)
      .text((row) => fitLabel(row.item.name, 20));

    group.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 48)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('font-weight', 700)
      .text('论文数量 / 主题记录数量（对数轴）');

    const yAxisTitleChars = Array.from('主题扩散指数');
    const yAxisTitle = group.append('text')
      .attr('x', -58)
      .attr('y', innerHeight / 2 - (yAxisTitleChars.length - 1) * 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('font-weight', 700)
      .attr('aria-label', '主题扩散指数');
    yAxisTitle.selectAll('tspan')
      .data(yAxisTitleChars)
      .join('tspan')
      .attr('x', -58)
      .attr('dy', (_, index) => index === 0 ? 0 : '1.35em')
      .text((char) => char);

    group.append('text')
      .attr('class', 'muted')
      .attr('x', 0)
      .attr('y', -16)
      .attr('font-size', 10)
      .text('气泡越大表示累计主题标注越多；颜色越深表示 Top 10% 论文占比越高。');

    group.append('text')
      .attr('class', 'muted')
      .attr('x', 8)
      .attr('y', 18)
      .attr('font-size', 10)
      .attr('font-weight', 700)
      .text('少量论文但主题分散');

    group.append('text')
      .attr('class', 'muted')
      .attr('x', innerWidth - 8)
      .attr('y', 18)
      .attr('text-anchor', 'end')
      .attr('font-size', 10)
      .attr('font-weight', 700)
      .text('高产且跨域');

    group.append('text')
      .attr('class', 'muted')
      .attr('x', innerWidth - 8)
      .attr('y', innerHeight - 12)
      .attr('text-anchor', 'end')
      .attr('font-size', 10)
      .attr('font-weight', 700)
      .text('高产但主题集中');

    const broadest = d3.greatest(laureates, (item) => item.diversity);
    const mostTopics = d3.greatest(laureates, (item) => item.topicCount);
    this.setTakeaway(`散点图描述研究主题的集中或扩散程度：靠右上方的${meta.label}奖得主拥有较多论文，也跨越较广的主题边界。`);
    const highOutput = laureates.filter((l) => l.diversity < average);
    const broadOutput = laureates.filter((l) => l.diversity >= average);
    this.setInsight('读图结论', [
      `在可比较的 ${laureates.length} 位得主中，扩散指数最高的是 <em>${escapeHtml(broadest?.name ?? '未标注')}</em>（${ONE_DECIMAL(broadest?.diversity ?? 0)}），说明其研究主题覆盖范围最广。`,
      `约 ${PERCENT(broadOutput.length / laureates.length)} 的得主（${broadOutput.length} 位）扩散指数高于平均值（${FOUR_DECIMALS(average)}），表明多数诺奖得主倾向于在相对多元的主题方向上深耕，而非单一跨域。`
    ]);
    this.setPanel(
      [
        { value: NUMBER(laureates.length), label: '可比较得主' },
        { value: FOUR_DECIMALS(average), label: '平均扩散指数' },
        { value: NUMBER(mostTopics?.topicCount ?? 0), label: '单人 OpenAlex 主题最多值' },
        { value: NUMBER(aggregate.enrichedRows), label: '增强论文记录数' }
      ],
      '图表解读',
      [
        `在当前口径下，扩散指数最高的是 <em>${escapeHtml(broadest?.name ?? '未标注')}</em>。`,
        '横轴比较论文数量，纵轴比较主题扩散指数；0–0.4 区间已压缩，气泡越大，累计 OpenAlex 主题标注越多。',
        '指数不是学术优劣评分，只描述研究主题的集中或分散程度。'
      ]
    );
  }
}

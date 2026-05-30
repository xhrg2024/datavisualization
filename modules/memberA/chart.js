const d3 = globalThis.d3;

if (!d3) {
  throw new Error('D3.js is required for MacroChart.');
}

const CATEGORY_COLORS = {
  Physics: '#1d3f36',
  Chemistry: '#3f8f75',
  'Physiology or Medicine': '#d25d3d',
  Literature: '#f2a65e',
  Peace: '#d8a83e',
  'Economic Sciences': '#5f8ea0'
};

const CATEGORY_LABELS = {
  Physics: '物理',
  Chemistry: '化学',
  'Physiology or Medicine': '医学',
  Literature: '文学',
  Peace: '和平',
  'Economic Sciences': '经济'
};

const COUNTRY_ZH = {
  "United Kingdom": "英国",
  "Germany": "德国",
  "Poland": "波兰",
  "Russia": "俄罗斯",
  "Austria": "奥地利",
  "Ireland": "爱尔兰",
  "Hungary": "匈牙利",
  "Czech Republic": "捷克",
  "Ukraine": "乌克兰",
  "India": "印度",
  "Finland": "芬兰",
  "USA": "美国",
  "France": "法国",
  "Canada": "加拿大",
  "Australia": "澳大利亚",
  "Japan": "日本",
  "China": "中国",
  "Scotland": "苏格兰",
  "the Netherlands": "荷兰",
  "Italy": "意大利",
  "Sweden": "瑞典",
  "Switzerland": "瑞士",
  "Denmark": "丹麦",
  "Norway": "挪威",
  "Spain": "西班牙",
  "Turkey": "土耳其",
  "Pakistan": "巴基斯坦",
  "Bangladesh": "孟加拉国",
  "Latvia": "拉脱维亚",
  "Lithuania": "立陶宛",
  "Belarus": "白俄罗斯",
  "Azerbaijan": "阿塞拜疆",
  "Croatia": "克罗地亚",
  "Slovenia": "斯洛文尼亚",
  "Slovakia": "斯洛伐克",
  "Bosnia and Herzegovina": "波黑"
};

const COUNTRY_CENTERS = {
  Algeria: [2.6, 28.0],
  Argentina: [-64.0, -34.0],
  Australia: [151.2, -33.9],
  Austria: [14.5, 47.6],
  Azerbaijan: [47.6, 40.1],
  Barbados: [-59.5, 13.2],
  Belarus: [28.0, 53.7],
  Belgium: [4.7, 50.6],
  'Bosnia and Herzegovina': [17.8, 44.2],
  Brazil: [-53.0, -10.0],
  Canada: [-106.0, 57.0],
  China: [104.0, 35.0],
  Croatia: [16.4, 45.1],
  'Czech Republic': [15.5, 49.8],
  Denmark: [12.6, 55.7],
  Egypt: [30.8, 26.8],
  'Faroe Islands (Denmark)': [-6.9, 62.0],
  Finland: [26.0, 64.5],
  France: [2.2, 46.2],
  Germany: [10.4, 51.2],
  Hungary: [19.5, 47.2],
  India: [77.2, 28.6],
  Indonesia: [113.9, -2.2],
  Ireland: [-8.0, 53.4],
  Israel: [34.9, 31.5],
  Italy: [12.6, 42.8],
  Jamaica: [-77.3, 18.1],
  Japan: [139.7, 35.7],
  Jordan: [36.2, 31.2],
  Latvia: [24.6, 56.9],
  Lebanon: [35.9, 33.9],
  Lithuania: [23.9, 55.2],
  Luxembourg: [6.1, 49.8],
  Mexico: [-102.5, 23.6],
  Morocco: [-7.1, 31.8],
  'New Zealand': [174.8, -41.3],
  'Northern Ireland': [-6.8, 54.7],
  Norway: [8.5, 61.5],
  Pakistan: [69.3, 30.4],
  Poland: [19.1, 52.1],
  Portugal: [-8.2, 39.6],
  Romania: [24.9, 45.9],
  Russia: [96.0, 61.5],
  'Saint Lucia': [-60.98, 13.9],
  Scotland: [-4.2, 56.5],
  Slovakia: [19.7, 48.7],
  Slovenia: [14.9, 46.1],
  'South Africa': [28.0, -26.2],
  'South Korea': [127.8, 36.4],
  Spain: [-3.7, 40.3],
  Sweden: [16.0, 62.0],
  Switzerland: [8.2, 46.8],
  Tunisia: [9.4, 34.0],
  Turkey: [35.2, 39.0],
  USA: [-98.6, 39.8],
  Ukraine: [31.2, 49.0],
  'United Kingdom': [-2.8, 54.2],
  Venezuela: [-66.6, 7.0],
  'the Netherlands': [5.3, 52.2]
};

const HISTORIC_EN = {
  '大英帝国/联合王国版图': 'British Empire / UK',
  '德意志帝国': 'German Empire',
  '俄罗斯帝国': 'Russian Empire',
  '奥匈帝国': 'Austro-Hungarian Empire',
  '苏联': 'Soviet Union',
  '英属印度': 'British India',
  '奥斯曼帝国': 'Ottoman Empire'
};

const HISTORIC_COLORS = {
  '大英帝国/联合王国版图': '#1d3f36',
  '德意志帝国': '#3f8f75',
  '俄罗斯帝国': CATEGORY_COLORS.Peace,
  '苏联': CATEGORY_COLORS.Peace,
  '奥匈帝国': '#c87357',
  '英属印度': CATEGORY_COLORS.Literature,
  '奥斯曼帝国': '#5f8ea0'
};

const PALETTE = {
  ink: '#14251f',
  muted: '#65736d',
  grid: 'rgba(19, 33, 29, 0.12)',
  blue: '#1d3f36',
  green: '#3f8f75',
  gold: '#d8a83e',
  rust: '#d25d3d',
  violet: '#f2a65e',
  sage: '#e8ad4f',
  steel: '#5f8ea0',
  mint: '#bfe1c8',
  paper: 'rgba(255, 250, 240, 0.9)',
  war: 'rgba(216, 168, 62, 0.16)'
};

const MAP_IMAGE_POINTS = {
  Australia: [0.825, 0.707],
  India: [0.680, 0.500],
  Japan: [0.824, 0.397],
  'New Zealand': [0.911, 0.782],
  'South Africa': [0.515, 0.682]
};


const SIMPLE_WORLD_LAND = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'North America' }, geometry: { type: 'Polygon', coordinates: [[[-168, 16], [-140, 58], [-104, 72], [-62, 54], [-52, 26], [-84, 10], [-118, 18], [-168, 16]]] } },
    { type: 'Feature', properties: { name: 'South America' }, geometry: { type: 'Polygon', coordinates: [[[-82, 12], [-50, 8], [-35, -18], [-52, -56], [-74, -48], [-80, -14], [-82, 12]]] } },
    { type: 'Feature', properties: { name: 'Europe' }, geometry: { type: 'Polygon', coordinates: [[[-12, 35], [10, 58], [42, 62], [52, 45], [28, 35], [4, 36], [-12, 35]]] } },
    { type: 'Feature', properties: { name: 'Africa' }, geometry: { type: 'Polygon', coordinates: [[[-18, 34], [34, 32], [52, 5], [36, -34], [12, -36], [-12, -8], [-18, 34]]] } },
    { type: 'Feature', properties: { name: 'Asia' }, geometry: { type: 'Polygon', coordinates: [[[34, 6], [52, 54], [104, 70], [152, 52], [146, 12], [106, -8], [76, 8], [52, 0], [34, 6]]] } },
    { type: 'Feature', properties: { name: 'Australia' }, geometry: { type: 'Polygon', coordinates: [[[112, -12], [154, -18], [150, -38], [118, -40], [112, -12]]] } },
    { type: 'Feature', properties: { name: 'Greenland' }, geometry: { type: 'Polygon', coordinates: [[[-54, 60], [-22, 72], [-34, 82], [-66, 76], [-54, 60]]] } }
  ]
};

const VIEW_COPY = {
  overview: {
    title: '百年获奖节奏与学科版图',
    notes: [
      '先沿着深蓝折线看年度总量的峰谷，再对照堆叠柱判断是哪类奖项贡献了变化。',
      '浅金色竖带是世界大战时期；如果折线突然下探，可优先检查这些历史断点。',
      '下方类别总量图用于比较百年结构：物理、医学、化学是主要科学奖项的长期主体。'
    ]
  },
  migration: {
    title: '从出生地出发的学术迁徙',
    notes: [
      '先看地图上的粗弧线：线越粗，出生国到学术机构国的迁移人数越多。',
      '再看三层路径图，从左到右追踪出生国、机构国、去世国，识别人才是否最终留在迁入地。',
      '底部跨洲条形图用来确认宏观方向，欧洲到北美是最突出的流动。'
    ]
  },
  centers: {
    title: '学术中心的时代转移',
    notes: [
      '上方按历史时期比较学术机构国，条形越长，说明该时期越多获奖者在这里完成关键研究。',
      '国家名称完整显示，方便直接读出美国、英国、德国、法国等中心的相对位置变化。',
      '下方气泡连接出生洲与机构国，帮助判断科学中心吸纳了哪些地区的人才。'
    ]
  },
  identity: {
    title: '历史国名里的现代国家',
    notes: [
      '左侧是获奖者出生时可能对应的历史政体，右侧是今天可识别的现代国家。',
      '连线越粗，说明这个历史政体在现代国家中的映射人数越多。',
      '下方排行帮助判断哪些帝国或联盟解体后，给诺奖得主身份留下了更明显的历史痕迹。'
    ]
  },
  periods: {
    title: '奖项河流中的时代断点',
    notes: [
      '先比较各色河流在不同时期的厚度，厚度越大代表该时期对应奖项记录越多。',
      '横轴每组标签左侧是时代名称，右侧是年份范围，可用来定位战争、冷战和全球化阶段。',
      '下方时间线单独标出停发年份，用来解释河流图中的断裂和低谷。'
    ]
  }
};

export class MacroChart {
  constructor(containerSelector, bus) {
    this.container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    this.bus = bus;
    this.memberData = null;
    this.overviewRows = [];
    this.view = 'overview';

    const page = this.container.closest('[data-module="macro"]');
    this.overviewFile = page?.dataset.overviewFile;
    this.panel = page?.querySelector('[data-notes]');
    this.kpis = page?.querySelector('[data-kpis]');
    this.tabs = Array.from(page?.querySelectorAll('[data-view]') ?? []);

    this.svg = d3.select(this.container).append('svg').attr('class', 'member-a-svg');
    this.tooltip = d3.select(this.container)
      .append('div')
      .attr('class', 'member-a-tooltip')
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
  }

  async loadData(url) {
    const [memberData, overviewRows] = await Promise.all([
      fetch(url).then((response) => response.json()),
      this.overviewFile ? d3.csv(this.overviewFile, d3.autoType) : Promise.resolve([])
    ]);
    this.memberData = memberData;
    this.overviewRows = overviewRows.filter((item) => item.award_year >= 1901 && item.award_year <= 2025);
    this.render();
    return this;
  }

  render() { this.update(); }
  resize() { this.update(); }

  update() {
    if (!this.memberData || !this.container) return;

    const bounds = this.container.getBoundingClientRect();
    this.width = Math.max(620, bounds.width);
    this.height = this.view === 'overview' ? 820 : this.view === 'migration' ? 1440 : this.view === 'centers' ? 1020 : this.view === 'identity' ? 920 : 900;
    this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`).style('height', `${this.height}px`);
    this.svg.selectAll('*').remove();

    this.renderPanel();
    if (this.view === 'overview') this.drawOverview();
    if (this.view === 'migration') this.drawMigration();
    if (this.view === 'centers') this.drawCenters();
    if (this.view === 'identity') this.drawIdentity();
    if (this.view === 'periods') this.drawPeriods();
  }

  renderPanel() {
    const copy = VIEW_COPY[this.view];
    const kpis = this.getKpis();
    if (this.kpis) {
      this.kpis.innerHTML = kpis.map((item) => `
        <div class="member-a-kpi">
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
    if (this.view === 'overview') {
      return [
        { value: this.overviewRows.length, label: '1901-2025 获奖记录' },
        { value: d3.rollups(this.overviewRows, (v) => v.length, (d) => d.award_year).length, label: '覆盖年份' },
        { value: d3.group(this.overviewRows, (d) => d.category).size, label: '奖项类别' },
        { value: d3.max(this.overviewRows, (d) => d.award_year), label: '最新年份' }
      ];
    }
    if (this.view === 'migration') {
      const paths = this.memberData.migration.paths;
      const cross = paths.filter((d) => d.birthCountry !== d.affiliationCountry).length;
      return [
        { value: paths.length, label: '带机构坐标记录' },
        { value: cross, label: '出生国与机构国不同' },
        { value: this.memberData.migration.topBirthToAffiliation[0]?.count ?? 0, label: '最大单向流动人数' },
        { value: d3.group(paths, (d) => d.birthContinent).size, label: '出生洲别' }
      ];
    }
    if (this.view === 'centers') {
      const paths = this.memberData.migration.paths.filter((d) => d.affiliationCountry);
      const centers = d3.rollups(paths, (v) => v.length, (d) => d.affiliationCountry)
        .sort((a, b) => d3.descending(a[1], b[1]));
      const usa = centers.find(([country]) => country === 'USA')?.[1] ?? 0;
      return [
        { value: centers.length, label: '机构所在国' },
        { value: centers[0]?.[0] ?? '—', label: '最大机构中心' },
        { value: centers[0]?.[1] ?? 0, label: '中心记录数' },
        { value: usa, label: '美国机构记录' }
      ];
    }
    if (this.view === 'identity') {
      return [
        { value: this.memberData.identity.records.length, label: '历史政体匹配人物' },
        { value: d3.group(this.memberData.identity.summary, (d) => d.historic).size, label: '历史政体标签' },
        { value: d3.group(this.memberData.identity.summary, (d) => d.modern).size, label: '现代出生国' },
        { value: d3.max(this.memberData.identity.summary, (d) => d.count), label: '最大映射人数' }
      ];
    }
    return [
      { value: this.memberData.periods.definitions.length, label: '地缘历史阶段' },
      { value: this.memberData.periods.stoppedYears.length, label: '标注停发年份' },
      { value: '6', label: '奖项类别' },
      { value: d3.sum(this.memberData.periods.categoryCounts, (d) => d.count), label: '统计记录' }
    ];
  }

  chartTitle(title, subtitle, x = 22, y = 30) {
    this.svg.append('text').attr('class', 'member-a-title').attr('x', x).attr('y', y).text(title);
  }

  sectionTitle(group, title, x, y) {
    group.append('text').attr('class', 'member-a-section-title').attr('x', x).attr('y', y).text(title);
  }

  interactionHint(text = '将鼠标移到图形上可动态查看详细数据') {
    this.svg.append('text')
      .attr('class', 'member-a-hint')
      .attr('x', this.width - 24)
      .attr('y', 30)
      .attr('text-anchor', 'end')
      .text(text);
  }

  fitText(value, maxLength = 16) {
    const text = String(value ?? '');
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
  }

  bilingualCountry(value, maxEnglish = 14) {
    return { english: this.fitText(value, maxEnglish), chinese: COUNTRY_ZH[value] || value };
  }

  bilingualHistoric(value, maxEnglish = 18, maxChinese = 12) {
    return {
      english: maxEnglish === Infinity ? (HISTORIC_EN[value] || value) : this.fitText(HISTORIC_EN[value] || value, maxEnglish),
      chinese: maxChinese === Infinity ? value : this.fitText(value, maxChinese)
    };
  }

  historicColor(name) {
    return HISTORIC_COLORS[name] || PALETTE.sage;
  }

  axisBottom(group, scale, ticks = 6) {
    group.attr('class', 'member-a-axis').call(d3.axisBottom(scale).ticks(ticks).tickSizeOuter(0));
  }

  axisLeft(group, scale, ticks = 5) {
    group.attr('class', 'member-a-axis').call(d3.axisLeft(scale).ticks(ticks).tickSizeOuter(0));
  }

  drawOverview() {
    this.chartTitle('年度起伏中的学科结构');
    this.interactionHint();
    const categories = Object.keys(CATEGORY_COLORS);
    const stoppedYears = new Set([1940, 1941, 1942]);
    const yearlyCount = new Map(d3.rollups(this.overviewRows, (values) => values.length, (d) => d.award_year));
    const yearly = d3.range(1901, 2026).map((year) => ({ year, laureates: stoppedYears.has(year) ? 0 : (yearlyCount.get(year) ?? 0) }));
    const byYearCategory = d3.rollups(this.overviewRows, (v) => v.length, (d) => d.award_year, (d) => d.category);
    const categoryMap = new Map(byYearCategory);
    const stackedRows = d3.range(1901, 2026).map((year) => {
      const row = { year };
      for (const category of categories) row[category] = 0;
      if (!stoppedYears.has(year)) {
        for (const [category, count] of categoryMap.get(year) ?? []) row[category] = count;
      }
      return row;
    });

    const m = { top: 78, right: 54, bottom: 46, left: 52 };
    const chartH = 390;
    const innerWidth = this.width - m.left - m.right;
    const g = this.svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    const x = d3.scaleLinear().domain([1901, 2025]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, d3.max(yearly, (d) => d.laureates) + 2]).nice().range([chartH, 0]);
    const stack = d3.stack().keys(categories)(stackedRows);
    const barWidth = Math.max(2, innerWidth / 126);

    g.append('g').attr('class', 'member-a-grid').call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(''));
    this.axisLeft(g.append('g'), y, 5);
    g.append('g')
      .attr('class', 'member-a-axis')
      .attr('transform', `translate(0,${chartH})`)
      .call(d3.axisBottom(x).tickValues(d3.range(1910, 2030, 10)).tickFormat(d3.format('d')).tickSizeOuter(0));

    g.selectAll('.war-band')
      .data([{ start: 1914, end: 1918, label: '一战' }, { start: 1939, end: 1945, label: '二战' }])
      .join('rect')
      .attr('x', (d) => x(d.start))
      .attr('y', 0)
      .attr('width', (d) => Math.max(2, x(d.end) - x(d.start)))
      .attr('height', chartH)
      .attr('fill', PALETTE.war);

    g.append('g').selectAll('g')
      .data(stack)
      .join('g')
      .attr('fill', (d) => CATEGORY_COLORS[d.key])
      .attr('opacity', 0.58)
      .selectAll('rect')
      .data((d) => d)
      .join('rect')
      .attr('x', (d) => x(d.data.year) - barWidth / 2)
      .attr('y', (d) => y(d[1]))
      .attr('height', (d) => y(d[0]) - y(d[1]))
      .attr('width', barWidth)
      .on('mousemove', (event, d) => this.showTip(event, '<strong>' + d.data.year + '</strong><br>该类别获奖者：' + (d[1] - d[0])))
      .on('mouseleave', this.hideTip);

    const line = d3.line().x((d) => x(d.year)).y((d) => y(d.laureates)).curve(d3.curveMonotoneX);
    const area = d3.area().x((d) => x(d.year)).y0(chartH).y1((d) => y(d.laureates)).curve(d3.curveMonotoneX);
    g.append('path').datum(yearly).attr('class', 'member-a-area').attr('d', area);
    g.append('path').datum(yearly).attr('class', 'member-a-line').attr('d', line);
    const bisectYear = d3.bisector((d) => d.year).left;
    g.append('rect')
      .attr('class', 'member-a-interaction-layer')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', chartH)
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const year = Math.max(1901, Math.min(2025, Math.round(x.invert(mx) + 0.4)));
        const index = Math.min(yearly.length - 1, Math.max(0, bisectYear(yearly, year)));
        const a = yearly[index - 1] || yearly[index];
        const b = yearly[index];
        const d = Math.abs((a?.year ?? year) - year) < Math.abs((b?.year ?? year) - year) ? a : b;
        this.showTip(event, '<strong>' + d.year + '</strong><br>获奖者：' + d.laureates);
      })
      .on('mouseleave', this.hideTip);
    this.drawLegend(categories, 22, 56, 6);

    const totals = categories.map((category) => ({ category, count: this.overviewRows.filter((d) => d.category === category).length }));
    const bottomY = 540;
    const small = this.svg.append('g').attr('transform', `translate(${m.left},${bottomY})`);
    this.sectionTitle(small, '六类奖项的百年重量', 0, -16);
    const sx = d3.scaleBand().domain(categories).range([0, innerWidth]).padding(0.28);
    const sy = d3.scaleLinear().domain([0, d3.max(totals, (d) => d.count)]).nice().range([110, 0]);
    small.append('g').attr('class', 'member-a-grid').call(d3.axisLeft(sy).ticks(3).tickSize(-innerWidth).tickFormat(''));
    small.selectAll('rect').data(totals).join('rect')
      .attr('x', (d) => sx(d.category))
      .attr('y', (d) => sy(d.count))
      .attr('width', sx.bandwidth())
      .attr('height', (d) => 110 - sy(d.count))
      .attr('rx', 6)
      .attr('fill', (d) => CATEGORY_COLORS[d.category])
      .on('mousemove', (event, d) => this.showTip(event, '<strong>' + (CATEGORY_LABELS[d.category] ?? d.category) + '</strong><br>总获奖记录：' + d.count))
      .on('mouseleave', this.hideTip);
    small.selectAll('text.value').data(totals).join('text')
      .attr('class', 'member-a-small')
      .attr('x', (d) => sx(d.category) + sx.bandwidth() / 2)
      .attr('y', (d) => sy(d.count) - 6)
      .attr('text-anchor', 'middle')
      .text((d) => d.count);
    small.append('g').attr('class', 'member-a-axis').attr('transform', 'translate(0,110)')
      .call(d3.axisBottom(sx).tickFormat((d) => CATEGORY_LABELS[d]));
  }

  drawMigration() {
    this.chartTitle('出生地、机构国与去世地的空间流动');
    this.interactionHint();
    const m = { top: 82, right: 34, bottom: 24, left: 34 };
    const innerWidth = this.width - m.left - m.right;
    const mapHeight = 700;
    const g = this.svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');
    const mapClipId = 'member-a-map-clip-' + Math.round(this.width);
    this.svg.append('defs')
      .append('clipPath')
      .attr('id', mapClipId)
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', mapHeight)
      .attr('rx', 18)
      .attr('ry', 18);

    g.append('image')
      .attr('class', 'member-a-map-image')
      .attr('href', './data/memberA/map.png')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', mapHeight)
      .attr('preserveAspectRatio', 'xMidYMid slice')
      .attr('clip-path', 'url(#' + mapClipId + ')');
    g.append('rect')
      .attr('class', 'member-a-map-frame')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', mapHeight)
      .attr('rx', 18)
      .attr('ry', 18);

    const mapImage = { width: 1898, height: 1300 };
    const imageRatio = mapImage.width / mapImage.height;
    const frameRatio = innerWidth / mapHeight;
    const rendered = frameRatio > imageRatio
      ? { width: innerWidth, height: innerWidth / imageRatio, x: 0, y: (mapHeight - innerWidth / imageRatio) / 2 }
      : { width: mapHeight * imageRatio, height: mapHeight, x: (innerWidth - mapHeight * imageRatio) / 2, y: 0 };
    const projection = ([lon, lat]) => {
      const numericLon = +lon;
      const numericLat = Math.max(-84, Math.min(84, +lat));
      if (!Number.isFinite(numericLon) || !Number.isFinite(numericLat)) return null;
      const radians = numericLat * Math.PI / 180;
      const x = rendered.x + rendered.width * ((numericLon + 180) / 360) - rendered.width * 0.052;
      const y = rendered.y + rendered.height * (0.5 - Math.log(Math.tan(Math.PI / 4 + radians / 2)) / (2 * Math.PI));
      return [x, y];
    };
    const imagePoint = (country) => {
      const point = MAP_IMAGE_POINTS[country];
      return point ? [rendered.x + rendered.width * point[0], rendered.y + rendered.height * point[1]] : null;
    };
    const countryPoint = (country, lon, lat) => {
      const anchored = imagePoint(country);
      if (anchored) return anchored;
      const fallback = COUNTRY_CENTERS[country];
      const numericLon = Number.isFinite(+lon) ? +lon : fallback?.[0];
      const numericLat = Number.isFinite(+lat) ? +lat : fallback?.[1];
      if (!Number.isFinite(numericLon) || !Number.isFinite(numericLat)) return null;
      return projection([numericLon, numericLat]);
    };

    const continentHints = [
      { name: 'North America', lon: -100, lat: 46 },
      { name: 'Europe', lon: 16, lat: 51 },
      { name: 'Asia', lon: 92, lat: 34 },
      { name: 'Oceania', lon: 134, lat: -25 },
      { name: 'Africa', lon: 20, lat: 4 }
    ];
    g.selectAll('text.continent').data(continentHints).join('text')
      .attr('class', 'member-a-stage-label')
      .attr('x', (d) => projection([d.lon, d.lat])?.[0] ?? 0)
      .attr('y', (d) => projection([d.lon, d.lat])?.[1] ?? 0)
      .attr('text-anchor', 'middle')
      .attr('opacity', 0.64)
      .text((d) => d.name);

    const countryPositionMap = new Map();
    const addCountryPosition = (country, lon, lat) => {
      if (!country || !Number.isFinite(+lon) || !Number.isFinite(+lat)) return;
      if (!countryPositionMap.has(country)) countryPositionMap.set(country, { lon: 0, lat: 0, count: 0 });
      const item = countryPositionMap.get(country);
      item.lon += +lon;
      item.lat += +lat;
      item.count += 1;
    };
    for (const d of this.memberData.migration.paths) {
      addCountryPosition(d.birthCountry, d.birthLon, d.birthLat);
      addCountryPosition(d.affiliationCountry, d.affiliationLon, d.affiliationLat);
      addCountryPosition(d.deathCountry, d.deathLon, d.deathLat);
    }
    for (const item of countryPositionMap.values()) {
      item.lon /= item.count;
      item.lat /= item.count;
    }
    const countryPosition = (country, fallbackLon, fallbackLat) => {
      const center = COUNTRY_CENTERS[country];
      if (center) return { lon: center[0], lat: center[1] };
      return countryPositionMap.get(country) || { lon: fallbackLon, lat: fallbackLat };
    };

    const routeMap = new Map();
    for (const d of this.memberData.migration.paths) {
      if (!d.birthLon || !d.birthLat || !d.affiliationLon || !d.affiliationLat || d.birthCountry === d.affiliationCountry) continue;
      const key = d.birthCountry + '|' + d.affiliationCountry;
      const birthPosition = countryPosition(d.birthCountry, d.birthLon, d.birthLat);
      const affiliationPosition = countryPosition(d.affiliationCountry, d.affiliationLon, d.affiliationLat);
      if (!routeMap.has(key)) {
        routeMap.set(key, {
          from: d.birthCountry,
          to: d.affiliationCountry,
          birthLon: birthPosition.lon,
          birthLat: birthPosition.lat,
          affiliationLon: affiliationPosition.lon,
          affiliationLat: affiliationPosition.lat,
          count: 0,
          birthContinent: d.birthContinent,
          affiliationContinent: d.affiliationContinent
        });
      }
      routeMap.get(key).count += 1;
    }
    const routes = [...routeMap.values()].sort((a, b) => d3.descending(a.count, b.count)).slice(0, 34);
    const widthScale = d3.scaleSqrt().domain(d3.extent(routes, (d) => d.count)).range([1.4, 10]);
    const color = (d) => d.affiliationCountry === 'USA' ? PALETTE.blue : d.birthContinent !== d.affiliationContinent ? PALETTE.rust : PALETTE.green;
    const arc = (d) => {
      const a = countryPoint(d.from, d.birthLon, d.birthLat);
      const b = countryPoint(d.to, d.affiliationLon, d.affiliationLat);
      if (!a || !b) return '';
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const dr = Math.sqrt(dx * dx + dy * dy) * 1.45;
      return 'M' + a[0] + ',' + a[1] + 'A' + dr + ',' + dr + ' 0 0,1 ' + b[0] + ',' + b[1];
    };

    g.selectAll('path.route').data(routes).join('path')
      .attr('class', 'member-a-flow')
      .attr('d', arc)
      .attr('stroke', color)
      .attr('stroke-width', (d) => widthScale(d.count))
      .attr('opacity', 0.68)
      .on('mousemove', (event, d) => this.showTip(event, '<strong>' + d.from + ' → ' + d.to + '</strong><br>人数：' + d.count))
      .on('mouseleave', this.hideTip);

    const endpoints = [];
    for (const d of routes.slice(0, 28)) {
      endpoints.push({ country: d.from, lon: d.birthLon, lat: d.birthLat, type: 'birth' });
      endpoints.push({ country: d.to, lon: d.affiliationLon, lat: d.affiliationLat, type: 'affiliation' });
    }
    g.selectAll('circle.endpoint').data(endpoints).join('circle')
      .attr('class', (d) => 'member-a-node member-a-node--' + d.type)
      .attr('cx', (d) => countryPoint(d.country, d.lon, d.lat)?.[0] ?? -20)
      .attr('cy', (d) => countryPoint(d.country, d.lon, d.lat)?.[1] ?? -20)
      .attr('r', (d) => d.type === 'affiliation' ? 4.5 : 3.5)
      .attr('opacity', 0.84)
      .on('mousemove', (event, d) => this.showTip(event, '<strong>' + d.country + '</strong><br>' + (d.type === 'birth' ? '出生地节点' : '机构地节点')))
      .on('mouseleave', this.hideTip);

    const routeListY = m.top + mapHeight + 70;
    this.drawThreeStageMigration(routeListY, innerWidth, m.left);

    const legend = g.append('g').attr('transform', 'translate(' + (innerWidth - 245) + ',14)');
    [
      { label: '流向美国', color: PALETTE.blue },
      { label: '跨洲流动', color: PALETTE.rust },
      { label: '其他跨国流动', color: PALETTE.green }
    ].forEach((item, i) => {
      const row = legend.append('g').attr('transform', 'translate(0,' + (i * 20) + ')');
      row.append('line').attr('x1', 0).attr('x2', 22).attr('y1', 0).attr('y2', 0).attr('stroke', item.color).attr('stroke-width', 4).attr('stroke-linecap', 'round');
      row.append('text').attr('class', 'member-a-small').attr('x', 30).attr('y', 4).text(item.label);
    });

    const cross = d3.rollups(
      this.memberData.migration.paths.filter((d) => d.birthContinent && d.affiliationContinent && d.birthContinent !== d.affiliationContinent),
      (v) => v.length,
      (d) => d.birthContinent + ' → ' + d.affiliationContinent
    ).map(([route, value]) => ({ route, value })).sort((a, b) => d3.descending(a.value, b.value)).slice(0, 8);
    const lowerY = routeListY + 292;
    const leftW = innerWidth * 0.48;
    const lower = this.svg.append('g').attr('transform', 'translate(' + m.left + ',' + lowerY + ')');
    this.sectionTitle(lower, '跨洲迁移的主方向', 0, -18);
    const cx = d3.scaleLinear().domain([0, d3.max(cross, (d) => d.value)]).range([0, leftW - 205]);
    const cy = d3.scaleBand().domain(cross.map((d) => d.route)).range([0, 180]).padding(0.28);
    lower.selectAll('text.route').data(cross).join('text')
      .attr('class', 'member-a-label member-a-route-label')
      .attr('x', 0)
      .attr('y', (d) => cy(d.route) + cy.bandwidth() / 2 + 4)
      .text((d) => d.route);
    lower.selectAll('rect.cross').data(cross).join('rect')
      .attr('x', 205)
      .attr('y', (d) => cy(d.route))
      .attr('width', (d) => cx(d.value))
      .attr('height', cy.bandwidth())
      .attr('rx', 6)
      .attr('fill', PALETTE.steel)
      .on('mousemove', (event, d) => this.showTip(event, '<strong>' + d.route + '</strong><br>人数：' + d.value))
      .on('mouseleave', this.hideTip);
    lower.selectAll('text.cross-value').data(cross).join('text')
      .attr('class', 'member-a-small')
      .attr('x', (d) => 213 + cx(d.value))
      .attr('y', (d) => cy(d.route) + cy.bandwidth() / 2 + 4)
      .text((d) => d.value);

    const classifyPath = (d) => {
      if (d.birthCountry !== d.affiliationCountry && d.affiliationCountry !== d.deathCountry && d.birthCountry !== d.deathCountry) {
        return '三地不同';
      }
      if (d.birthCountry !== d.affiliationCountry && d.affiliationCountry === d.deathCountry) {
        return '迁入机构国并终老';
      }
      if (d.birthCountry === d.deathCountry && d.birthCountry !== d.affiliationCountry) {
        return '海外任职后回到出生国';
      }
      return '路径部分重合';
    };
    const pathCandidates = this.memberData.migration.paths
      .filter((d) => d.birthCountry !== d.affiliationCountry && d.deathCountry)
      .map((d) => ({ ...d, pathType: classifyPath(d) }))
      .sort((a, b) => d3.ascending(a.name, b.name));
    const preferredTypes = ['三地不同', '迁入机构国并终老', '海外任职后回到出生国', '路径部分重合'];
    const sample = preferredTypes
      .map((type) => pathCandidates.find((d) => d.pathType === type))
      .filter(Boolean)
      .concat(pathCandidates)
      .filter((d, index, array) => array.findIndex((item) => item.name === d.name) === index)
      .slice(0, 3);
    const cards = this.svg.append('g').attr('transform', 'translate(' + (m.left + leftW + 34) + ',' + lowerY + ')');
    this.sectionTitle(cards, '三种典型人生路径', 0, -18);
    cards.selectAll('rect.path-card').data(sample).join('rect')
      .attr('class', 'member-a-card')
      .attr('x', 0)
      .attr('y', (_, i) => i * 43)
      .attr('rx', 8)
      .attr('width', innerWidth - leftW - 36)
      .attr('height', 36);
    cards.selectAll('text.path-card-main').data(sample).join('text')
      .attr('class', 'member-a-small path-card-main')
      .attr('x', 10)
      .attr('y', (_, i) => i * 43 + 14)
      .text((d) => d.name + ': ' + d.birthCountry + ' → ' + d.affiliationCountry + ' → ' + d.deathCountry);
    cards.selectAll('text.path-card-note').data(sample).join('text')
      .attr('class', 'member-a-small member-a-path-note')
      .attr('x', 10)
      .attr('y', (_, i) => i * 43 + 29)
      .text((d, i) => (i + 1) + '. ' + d.pathType);
  }

  drawCenters() {
    this.chartTitle('机构国变成科学中心的过程');
    this.interactionHint();
    const paths = this.memberData.migration.paths.filter((d) => d.affiliationCountry && d.period);
    const periods = this.memberData.periods.definitions;
    const topCenters = d3.rollups(paths, (v) => v.length, (d) => d.affiliationCountry)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => d3.descending(a.count, b.count))
      .slice(0, 9);
    const centerNames = topCenters.map((d) => d.country);
    const countByPeriodCenter = d3.rollups(
      paths.filter((d) => centerNames.includes(d.affiliationCountry)),
      (v) => v.length,
      (d) => d.period,
      (d) => d.affiliationCountry
    );
    const matrixLookup = new Map();
    for (const [period, countries] of countByPeriodCenter) {
      for (const [country, count] of countries) matrixLookup.set(period + '|' + country, count);
    }
    const cells = periods.flatMap((period) => centerNames.map((country) => ({
      period: period.id,
      label: period.label,
      range: period.range,
      country,
      count: matrixLookup.get(period.id + '|' + country) ?? 0
    })));

    const m = { top: 86, right: 36, bottom: 42, left: 178 };
    const innerWidth = this.width - m.left - m.right;
    const heatH = 430;
    const g = this.svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');
    this.sectionTitle(g, '机构国在历史时期中的位置', -m.left + 4, -18);
    const x = d3.scaleBand().domain(periods.map((d) => d.id)).range([0, innerWidth]).padding(0.08);
    const y = d3.scaleBand().domain(centerNames).range([0, heatH]).padding(0.12);
    const maxCount = d3.max(cells, (d) => d.count) || 1;
    const cellColor = d3.scaleSequential().domain([0, maxCount]).interpolator(d3.interpolateRgb('#fffaf0', '#e7bf98'));

    g.selectAll('rect.center-cell').data(cells).join('rect')
      .attr('class', 'center-cell')
      .attr('x', (d) => x(d.period))
      .attr('y', (d) => y(d.country))
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('rx', 7)
      .attr('fill', (d) => d.count ? cellColor(d.count) : 'rgba(255,250,240,0.72)')
      .on('mousemove', (event, d) => this.showTip(event, '<strong>' + d.country + '</strong><br>' + d.label + '（' + d.range + '）<br>机构记录：' + d.count))
      .on('mouseleave', this.hideTip);
    g.selectAll('text.center-count').data(cells.filter((d) => d.count > 0)).join('text')
      .attr('class', 'member-a-small member-a-center-count')
      .attr('x', (d) => x(d.period) + x.bandwidth() / 2)
      .attr('y', (d) => y(d.country) + y.bandwidth() / 2 + 4)
      .attr('text-anchor', 'middle')
      .text((d) => d.count);
    g.append('g').attr('class', 'member-a-axis')
      .call(d3.axisLeft(y).tickSize(0));
    const periodLabels = g.append('g').attr('transform', 'translate(0,' + (heatH + 14) + ')');
    const labelGroups = periodLabels.selectAll('g.period-label').data(periods).join('g')
      .attr('transform', (d) => 'translate(' + (x(d.id) + x.bandwidth() / 2) + ',0)');
    labelGroups.append('text')
      .attr('class', 'member-a-label')
      .attr('text-anchor', 'middle')
      .attr('y', 0)
      .text((d) => d.range);
    labelGroups.append('text')
      .attr('class', 'member-a-small member-a-cn-label')
      .attr('text-anchor', 'middle')
      .attr('y', 16)
      .text((d) => this.fitText(d.label, 8));

    const lowerY = 610;
    const lower = this.svg.append('g').attr('transform', 'translate(' + m.left + ',' + lowerY + ')');
    this.sectionTitle(lower, '出生洲流入主要机构国', -m.left + 4, -24);
    const bubbleCenters = centerNames.slice(0, 7);
    const continents = Array.from(new Set(paths.map((d) => d.birthContinent).filter(Boolean)))
      .sort((a, b) => d3.ascending(a, b));
    const flowCells = d3.rollups(
      paths.filter((d) => bubbleCenters.includes(d.affiliationCountry) && d.birthContinent),
      (v) => v.length,
      (d) => d.birthContinent,
      (d) => d.affiliationCountry
    ).flatMap(([continent, countries]) => countries.map(([country, count]) => ({ continent, country, count })));
    const flowLookup = new Map(flowCells.map((d) => [d.continent + '|' + d.country, d.count]));
    const bubbleData = continents.flatMap((continent) => bubbleCenters.map((country) => ({
      continent,
      country,
      count: flowLookup.get(continent + '|' + country) ?? 0
    })));
    const bx = d3.scaleBand().domain(bubbleCenters).range([0, innerWidth]).padding(0.25);
    const by = d3.scaleBand().domain(continents).range([0, 230]).padding(0.3);
    const br = d3.scaleSqrt().domain([0, d3.max(bubbleData, (d) => d.count) || 1]).range([0, 24]);
    lower.append('g').attr('class', 'member-a-axis').call(d3.axisLeft(by).tickSize(0));
    lower.append('g').attr('class', 'member-a-grid').selectAll('line')
      .data(continents).join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => by(d) + by.bandwidth() / 2)
      .attr('y2', (d) => by(d) + by.bandwidth() / 2);
    lower.selectAll('circle.center-bubble').data(bubbleData.filter((d) => d.count > 0)).join('circle')
      .attr('class', 'member-a-center-bubble')
      .attr('cx', (d) => bx(d.country) + bx.bandwidth() / 2)
      .attr('cy', (d) => by(d.continent) + by.bandwidth() / 2)
      .attr('r', (d) => br(d.count))
      .attr('fill', (d) => d.country === 'USA' ? PALETTE.rust : PALETTE.green)
      .on('mousemove', (event, d) => this.showTip(event, '<strong>' + d.continent + ' → ' + d.country + '</strong><br>人数：' + d.count))
      .on('mouseleave', this.hideTip);
    const xLabels = lower.append('g').attr('transform', 'translate(0,250)');
    xLabels.selectAll('text.center-name').data(bubbleCenters).join('text')
      .attr('class', 'member-a-label')
      .attr('x', (d) => bx(d) + bx.bandwidth() / 2)
      .attr('y', 0)
      .attr('text-anchor', 'end')
      .attr('transform', (d) => 'rotate(-28,' + (bx(d) + bx.bandwidth() / 2) + ',0)')
      .text((d) => d);
  }

  drawIdentity() {
    this.chartTitle('历史国名与现代出生国的对应');
    this.interactionHint();
    const summary = this.memberData.identity.summary.filter((d) => d.count >= 2).slice(0, 24);
    const historic = Array.from(new Set(summary.map((d) => d.historic)));
    const modern = Array.from(new Set(summary.map((d) => d.modern)));
    const m = { top: 78, right: 170, bottom: 28, left: 230 };
    const innerWidth = this.width - m.left - m.right;
    const flowHeight = 500;
    const g = this.svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');
    const yLeft = d3.scalePoint().domain(historic).range([28, flowHeight - 28]).padding(0.5);
    const yRight = d3.scalePoint().domain(modern).range([28, flowHeight - 28]).padding(0.5);
    const width = d3.scaleSqrt().domain([1, d3.max(summary, (d) => d.count)]).range([2, 12]);

    g.append('text').attr('class', 'member-a-stage-label').attr('x', -4).attr('y', 4).attr('text-anchor', 'end').text('历史国名');
    g.append('text').attr('class', 'member-a-stage-label').attr('x', innerWidth + 4).attr('y', 4).text('现代出生国');
    g.selectAll('path.identity-flow').data(summary).join('path')
      .attr('class', 'member-a-flow')
      .attr('stroke', (d) => this.historicColor(d.historic))
      .attr('stroke-width', (d) => width(d.count))
      .attr('d', (d) => 'M0,' + yLeft(d.historic) + ' C' + (innerWidth * 0.42) + ',' + yLeft(d.historic) + ' ' + (innerWidth * 0.58) + ',' + yRight(d.modern) + ' ' + innerWidth + ',' + yRight(d.modern))
      .on('mousemove', (event, d) => this.showTip(event, '<strong>' + d.historic + ' → ' + d.modern + '</strong><br>人数：' + d.count))
      .on('mouseleave', this.hideTip);
    g.selectAll('circle.left').data(historic).join('circle').attr('class', 'member-a-node member-a-node--historic').attr('cx', 0).attr('cy', (d) => yLeft(d)).attr('r', 8).attr('fill', PALETTE.mint).on('mousemove', (event, d) => this.showTip(event, '<strong>' + d + '</strong><br>历史政体')).on('mouseleave', this.hideTip);
    g.selectAll('circle.right').data(modern).join('circle').attr('class', 'member-a-node member-a-node--affiliation').attr('cx', innerWidth).attr('cy', (d) => yRight(d)).attr('r', 8).on('mousemove', (event, d) => this.showTip(event, '<strong>' + d + '</strong><br>现代出生国')).on('mouseleave', this.hideTip);
    const leftLabels = g.selectAll('g.left-label').data(historic).join('g')
      .attr('class', 'left-label')
      .attr('transform', (d) => 'translate(-14,' + (yLeft(d) - 7) + ')');
    leftLabels.append('text').attr('class', 'member-a-label').attr('x', 0).attr('y', 0).attr('text-anchor', 'end').text((d) => this.bilingualHistoric(d, Infinity, Infinity).english);
    leftLabels.append('text').attr('class', 'member-a-small member-a-cn-label').attr('x', 0).attr('y', 15).attr('text-anchor', 'end').text((d) => this.bilingualHistoric(d, Infinity, Infinity).chinese);
    const rightLabels = g.selectAll('g.right-label').data(modern).join('g')
      .attr('transform', (d) => 'translate(' + (innerWidth + 12) + ',' + (yRight(d) - 7) + ')');
    rightLabels.append('text').attr('class', 'member-a-label').attr('x', 0).attr('y', 0).text((d) => this.bilingualCountry(d, 16).english);
    rightLabels.append('text').attr('class', 'member-a-small member-a-cn-label').attr('x', 0).attr('y', 15).text((d) => this.bilingualCountry(d, 16).chinese);

    const totals = d3.rollups(this.memberData.identity.records, (v) => v.length, (d) => d.historicName)
      .map(([historicName, count]) => ({ historicName, count }))
      .sort((a, b) => d3.descending(a.count, b.count));
    const lower = this.svg.append('g').attr('transform', 'translate(' + m.left + ',635)');
    this.sectionTitle(lower, '历史政体留下的身份痕迹', 0, -18);
    const bx = d3.scaleLinear().domain([0, d3.max(totals, (d) => d.count)]).range([0, innerWidth - 210]);
    const by = d3.scaleBand().domain(totals.map((d) => d.historicName)).range([0, 205]).padding(0.34);
    const histLabels = lower.selectAll('g.hist-label').data(totals).join('g')
      .attr('class', 'hist-label')
      .attr('transform', (d) => 'translate(0,' + (by(d.historicName) + by.bandwidth() / 2 - 6) + ')');
    histLabels.append('text').attr('class', 'member-a-label').attr('x', 0).attr('y', 0).text((d) => HISTORIC_EN[d.historicName] || d.historicName);
    histLabels.append('text').attr('class', 'member-a-small member-a-cn-label').attr('x', 0).attr('y', 14).text((d) => d.historicName);
    lower.selectAll('rect.hist').data(totals).join('rect').attr('class', 'hist').attr('x', 190).attr('y', (d) => by(d.historicName)).attr('width', (d) => bx(d.count)).attr('height', by.bandwidth()).attr('rx', 6).attr('fill', (d) => this.historicColor(d.historicName)).on('mousemove', (event, d) => this.showTip(event, '<strong>' + (HISTORIC_EN[d.historicName] || d.historicName) + '</strong><br>' + d.historicName + '<br>匹配人数：' + d.count)).on('mouseleave', this.hideTip);
    lower.selectAll('text.hist-value').data(totals).join('text').attr('class', 'member-a-small').attr('x', (d) => 198 + bx(d.count)).attr('y', (d) => by(d.historicName) + by.bandwidth() / 2 + 4).text((d) => d.count);
  }

  drawPeriods() {
    this.chartTitle('地缘时期里的奖项演进');
    this.interactionHint();
    const categories = Object.keys(CATEGORY_COLORS);
    const defs = this.memberData.periods.definitions;
    const maxPeriodEnd = d3.max(defs, (d) => d.end) || 2025;
    const rows = defs.map((def) => {
      const row = { period: def.id, label: def.label, range: def.range, start: def.start, end: def.end, mid: (def.start + def.end) / 2 };
      for (const category of categories) {
        row[category] = this.memberData.periods.categoryCounts.find((d) => d.period === def.id && d.category === category)?.count ?? 0;
      }
      return row;
    });
    const periodXStart = d3.min(rows, (d) => d.mid) || 1901;
    const periodXEnd = d3.max(rows, (d) => d.mid) || maxPeriodEnd;
    const m = { top: 86, right: 58, bottom: 120, left: 58 };
    const innerWidth = this.width - m.left - m.right;
    const chartH = 420;
    const g = this.svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');
    const x = d3.scaleLinear().domain([periodXStart, periodXEnd]).range([0, innerWidth]);
    const stack = d3.stack().keys(categories).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut)(rows);
    const y = d3.scaleLinear().domain([
      d3.min(stack, (layer) => d3.min(layer, (d) => d[0])),
      d3.max(stack, (layer) => d3.max(layer, (d) => d[1]))
    ]).range([chartH, 0]);
    const area = d3.area()
      .x((d) => x(d.data.mid))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveCatmullRom.alpha(0.45));

    g.append('g').attr('class', 'member-a-grid').call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(''));
    g.selectAll('path.stream').data(stack).join('path')
      .attr('class', 'member-a-stream')
      .attr('fill', (d) => CATEGORY_COLORS[d.key])
      .attr('stroke', 'rgba(255,250,240,0.58)')
      .attr('stroke-width', 0.8)
      .attr('opacity', 0.86)
      .attr('d', area)
      .on('mousemove', (event, d) => this.showTip(event, '<strong>' + (CATEGORY_LABELS[d.key] ?? d.key) + '</strong><br>地缘时期中的奖项变化'))
      .on('mouseleave', this.hideTip);
    g.append('g').attr('class', 'member-a-axis').attr('transform', 'translate(0,' + chartH + ')')
      .call(d3.axisBottom(x).tickValues(d3.range(Math.ceil(periodXStart / 10) * 10, Math.floor(periodXEnd / 10) * 10 + 1, 10)).tickFormat(d3.format('d')).tickSizeOuter(0));

    defs.forEach((def) => {
      const startX = x(Math.max(periodXStart, def.start));
      const endX = x(Math.min(periodXEnd, def.end));
      const px = x((def.start + def.end) / 2);
      if (px == null) return;
      g.append('line').attr('class', 'member-a-period-span').attr('x1', startX).attr('x2', endX).attr('y1', chartH + 30).attr('y2', chartH + 30);
      g.append('text').attr('class', 'member-a-small member-a-year-label').attr('x', px).attr('y', chartH + 48).attr('text-anchor', 'middle').text(def.range);
      g.append('text').attr('class', 'member-a-small member-a-period-name').attr('x', px).attr('y', chartH + 64).attr('text-anchor', 'middle').text(this.fitText(def.label, 10));
    });
    this.drawLegend(categories, 22, 56, 6);

    const timeline = this.svg.append('g').attr('transform', 'translate(' + m.left + ',650)');
    this.sectionTitle(timeline, '停发年份与历史阶段', 0, -30);
    const tx = d3.scaleLinear().domain([1901, 2025]).range([0, innerWidth]);
    timeline.append('line').attr('class', 'member-a-section-rule').attr('x1', 0).attr('x2', innerWidth).attr('y1', 34).attr('y2', 34);
    for (const def of defs) {
      timeline.append('rect').attr('x', tx(def.start)).attr('y', 20).attr('width', Math.max(2, tx(def.end) - tx(def.start))).attr('height', 28).attr('fill', def.id.includes('ww') ? PALETTE.war : 'rgba(63,143,117,0.08)');
    }
    timeline.selectAll('circle.stop').data(this.memberData.periods.stoppedYears).join('circle')
      .attr('class', 'member-a-dot')
      .attr('cx', (d) => tx(d.year))
      .attr('cy', 34)
      .attr('r', 5)
      .on('mousemove', (event, d) => this.showTip(event, '<strong>' + d.year + '</strong><br>' + d.note))
      .on('mouseleave', this.hideTip);
    const stopLabelPositions = {
      1914: { dx: -14, y: 4, angle: -32 },
      1918: { dx: 16, y: 78, angle: -32 },
      1939: { dx: -26, y: 2, angle: -32 },
      1940: { dx: -8, y: 82, angle: -32 },
      1941: { dx: 12, y: 4, angle: -32 },
      1942: { dx: 32, y: 82, angle: -32 }
    };
    timeline.selectAll('text.stop').data(this.memberData.periods.stoppedYears).join('text')
      .attr('class', 'member-a-small')
      .attr('x', (d) => tx(d.year) + (stopLabelPositions[d.year]?.dx ?? 0))
      .attr('y', (d) => stopLabelPositions[d.year]?.y ?? 4)
      .attr('text-anchor', 'middle')
      .attr('transform', (d) => {
        const pos = stopLabelPositions[d.year] || { dx: 0, y: 4, angle: -32 };
        return 'rotate(' + pos.angle + ',' + (tx(d.year) + pos.dx) + ',' + pos.y + ')';
      })
      .text((d) => d.year);
  }

  drawThreeStageMigration(y, innerWidth, left) {
    const records = this.memberData.migration.paths
      .filter((d) => d.birthCountry && d.affiliationCountry && d.deathCountry)
      .filter((d) => d.birthCountry !== d.affiliationCountry || d.affiliationCountry !== d.deathCountry);
    const topRecords = records.slice(0, 80);
    const stageKeys = ['birthCountry', 'affiliationCountry', 'deathCountry'];
    const stageTitles = ['出生国', '学术机构国', '去世国'];
    const stageColors = ['#e2bf63', '#a8ccb9', '#dba37f'];
    const topCountries = stageKeys.map((key) => d3.rollups(topRecords, (v) => v.length, (d) => d[key])
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => d3.descending(a.count, b.count))
      .slice(0, 8));
    const selected = topCountries.map((items) => new Set(items.map((d) => d.country)));
    const stageGap = Math.max(70, innerWidth * 0.082);
    const nodeW = Math.min(260, (innerWidth - stageGap * 2) / 3);
    const xPositions = [0, nodeW + stageGap, (nodeW + stageGap) * 2];
    const chartH = 230;
    const g = this.svg.append('g').attr('transform', 'translate(' + left + ',' + y + ')');
    g.append('rect')
      .attr('class', 'member-a-callout')
      .attr('x', -12)
      .attr('y', -28)
      .attr('rx', 12)
      .attr('width', innerWidth + 24)
      .attr('height', chartH + 52);
    this.sectionTitle(g, '三层迁移路径', 0, -6);

    const yScales = topCountries.map((items) => d3.scalePoint()
      .domain(items.map((d) => d.country))
      .range([32, chartH - 12])
      .padding(0.45));

    const drawFlow = (fromKey, toKey, fromStage, toStage, colorValue) => {
      const flows = d3.rollups(
        topRecords.filter((d) => selected[fromStage].has(d[fromKey]) && selected[toStage].has(d[toKey])),
        (v) => v.length,
        (d) => d[fromKey],
        (d) => d[toKey]
      ).flatMap(([from, tos]) => tos.map(([to, count]) => ({ from, to, count })))
        .sort((a, b) => d3.descending(a.count, b.count))
        .slice(0, 18);
      const sw = d3.scaleSqrt().domain([1, d3.max(flows, (d) => d.count) || 1]).range([1.5, 8]);
      g.append('g').selectAll('path.stage-flow').data(flows).join('path')
        .attr('class', 'member-a-stage-flow')
        .attr('d', (d) => {
          const x1 = xPositions[fromStage] + nodeW;
          const x2 = xPositions[toStage];
          const y1 = yScales[fromStage](d.from);
          const y2 = yScales[toStage](d.to);
          const bend = Math.max(28, Math.min(70, (x2 - x1) * 0.42));
          return 'M' + x1 + ',' + y1 + ' C' + (x1 + bend) + ',' + y1 + ' ' + (x2 - bend) + ',' + y2 + ' ' + x2 + ',' + y2;
        })
        .attr('stroke', colorValue)
        .attr('stroke-width', (d) => sw(d.count))
        .on('mousemove', (event, d) => this.showTip(event, '<strong>' + d.from + ' → ' + d.to + '</strong><br>人数：' + d.count))
        .on('mouseleave', this.hideTip);
    };
    drawFlow('birthCountry', 'affiliationCountry', 0, 1, PALETTE.green);
    drawFlow('affiliationCountry', 'deathCountry', 1, 2, PALETTE.steel);

    topCountries.forEach((items, stage) => {
      const x0 = xPositions[stage];
      g.append('text').attr('class', 'member-a-stage-label').attr('x', x0).attr('y', 18).text(stageTitles[stage]);
      const maxCount = d3.max(items, (d) => d.count) || 1;
      const nodeScale = d3.scaleLinear().domain([0, maxCount]).range([42, nodeW]);
      const nodes = g.append('g').selectAll('g.stage-node').data(items).join('g')
        .attr('class', 'member-a-stage-node')
        .attr('transform', (d) => 'translate(' + x0 + ',' + (yScales[stage](d.country) - 11) + ')')
        .on('mousemove', (event, d) => this.showTip(event, '<strong>' + d.country + '</strong><br>' + stageTitles[stage] + '：' + d.count))
        .on('mouseleave', this.hideTip);
      nodes.append('rect')
        .attr('class', 'member-a-stage-node-bar')
        .attr('width', nodeW)
        .attr('height', 22)
        .attr('rx', 7)
        .attr('fill', stageColors[stage])
        .attr('opacity', 0.9);
      nodes.append('text')
        .attr('class', 'member-a-small member-a-stage-node-text')
        .attr('x', 8)
        .attr('y', 15)
        .text((d) => d.country);
      nodes.append('text')
        .attr('class', 'member-a-small')
        .attr('class', 'member-a-small member-a-stage-count')
        .attr('x', nodeW - 10)
        .attr('y', 15)
        .attr('text-anchor', 'end')
        .text((d) => d.count);
    });
  }

  drawLegend(items, x, y, columns = 3) {
    const legend = this.svg.append('g').attr('class', 'member-a-legend').attr('transform', `translate(${x},${y})`);
    items.forEach((item, index) => {
      const row = legend.append('g').attr('transform', `translate(${(index % columns) * 86},${Math.floor(index / columns) * 18})`);
      row.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', CATEGORY_COLORS[item]);
      row.append('text').attr('x', 16).attr('y', 9).text(CATEGORY_LABELS[item] ?? item);
    });
  }
}

const d3 = globalThis.d3;

if (!d3) {
  throw new Error('D3.js is required for AlluvialChart.');
}

export class AlluvialChart {
  constructor(containerSelector, bus) {
    this.container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    this.bus = bus;
    this.data = [];
    this.state = { year: 1998, category: 'Europe' };
    this.margin = { top: 26, right: 24, bottom: 24, left: 24 };

    this.svg = d3.select(this.container).append('svg').attr('class', 'alluvial-chart__svg');
    this.root = this.svg.append('g').attr('class', 'alluvial-chart__root');
    this.linksLayer = this.root.append('g').attr('class', 'alluvial-chart__links');
    this.nodesLayer = this.root.append('g').attr('class', 'alluvial-chart__nodes');
    this.labelsLayer = this.root.append('g').attr('class', 'alluvial-chart__labels');

    this.bus.on('yearChange.memberD', (payload) => {
      this.state.year = payload.year;
      this.update();
    });

    this.bus.on('categoryChange.memberD', (payload) => {
      this.state.category = payload.category;
      this.update();
    });
  }

  async loadData(url) {
    this.data = await fetch(url).then((response) => response.json());
    this.render();
    return this;
  }

  render() {
    this.update();
  }

  resize() {
    this.update();
  }

  update() {
    if (!this.data.length || !this.container) {
      return;
    }

    const bounds = this.container.getBoundingClientRect();
    const width = Math.max(340, bounds.width);
    const height = Math.max(420, bounds.height || 420);
    const innerWidth = width - this.margin.left - this.margin.right;
    const innerHeight = height - this.margin.top - this.margin.bottom;
    const leftX = 130;
    const rightX = innerWidth - 130;

    this.svg.attr('viewBox', `0 0 ${width} ${height}`);
    this.root.attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    const sources = Array.from(new Set(this.data.map((item) => item.source)));
    const targets = Array.from(new Set(this.data.map((item) => item.target)));
    const sourceTotals = d3.rollup(this.data, (items) => d3.sum(items, (item) => item.value), (item) => item.source);
    const targetTotals = d3.rollup(this.data, (items) => d3.sum(items, (item) => item.value), (item) => item.target);
    const sourceScale = d3.scaleBand().domain(sources).range([0, innerHeight]).paddingInner(0.26).paddingOuter(0.12);
    const targetScale = d3.scaleBand().domain(targets).range([0, innerHeight]).paddingInner(0.26).paddingOuter(0.12);
    const valueScale = d3.scaleLinear().domain([0, d3.max(this.data, (item) => item.value)]).range([10, 56]);

    const sourceOffsets = new Map(sources.map((source) => [source, 0]));
    const targetOffsets = new Map(targets.map((target) => [target, 0]));

    const links = this.data.map((item) => {
      const height = valueScale(item.value);
      const sourceStart = sourceOffsets.get(item.source);
      const targetStart = targetOffsets.get(item.target);
      sourceOffsets.set(item.source, sourceStart + height + 4);
      targetOffsets.set(item.target, targetStart + height + 4);

      return {
        ...item,
        height,
        sourceY: sourceScale(item.source) + sourceStart + height / 2,
        targetY: targetScale(item.target) + targetStart + height / 2
      };
    });

    const nodeData = [
      ...sources.map((item) => ({ type: 'source', id: item, y: sourceScale(item), total: sourceTotals.get(item) ?? 0 })),
      ...targets.map((item) => ({ type: 'target', id: item, y: targetScale(item), total: targetTotals.get(item) ?? 0 }))
    ];

    const linkSelection = this.linksLayer.selectAll('path').data(links, (item) => `${item.source}-${item.target}-${item.value}`);
    linkSelection.join(
      (enter) => enter.append('path').attr('class', 'alluvial-chart__link'),
      (update) => update,
      (exit) => exit.remove()
    )
      .transition()
      .duration(650)
      .attr('d', (item) => {
        const curve = Math.max(120, Math.abs(rightX - leftX) * 0.42);
        return `M${leftX},${item.sourceY}
          C${leftX + curve},${item.sourceY}
           ${rightX - curve},${item.targetY}
           ${rightX},${item.targetY}`;
      })
      .attr('stroke-width', (item) => item.height)
      .attr('opacity', (item) => {
        const currentDecade = Math.floor(this.state.year / 10) * 10;
        const decadeMatch = item.decade === currentDecade;
        const categoryMatch = this.state.category === 'all' || item.category === this.state.category;
        return categoryMatch && decadeMatch ? 0.96 : categoryMatch ? 0.42 : 0.1;
      });

    const nodeSelection = this.nodesLayer.selectAll('g').data(nodeData, (item) => `${item.type}-${item.id}`);
    const nodeEnter = nodeSelection.join((enter) => {
      const group = enter.append('g').attr('class', 'alluvial-chart__node');
      group.append('rect').attr('class', 'alluvial-chart__node-box');
      group.append('text').attr('class', 'alluvial-chart__node-label');
      return group;
    });

    nodeEnter
      .transition()
      .duration(650)
      .attr('transform', (item) => `translate(${item.type === 'source' ? leftX - 70 : rightX + 12},${item.y})`);

    nodeEnter.select('.alluvial-chart__node-box')
      .transition()
      .duration(650)
      .attr('width', 58)
      .attr('height', (item) => Math.max(26, item.total * 3.1))
      .attr('y', (item) => -Math.max(26, item.total * 3.1) / 2);

    nodeEnter.select('.alluvial-chart__node-label')
      .transition()
      .duration(650)
      .attr('x', (item) => (item.type === 'source' ? 0 : 68))
      .attr('y', 4)
      .attr('text-anchor', (item) => (item.type === 'source' ? 'end' : 'start'))
      .text((item) => item.id);

    const labelSelection = this.labelsLayer.selectAll('text').data(links.filter((item) => item.category === this.state.category || this.state.category === 'all'), (item) => `${item.source}-${item.target}-${item.decade}`);
    labelSelection.join(
      (enter) => enter.append('text').attr('class', 'alluvial-chart__flow-label'),
      (update) => update,
      (exit) => exit.remove()
    )
      .transition()
      .duration(650)
      .attr('x', (item) => (leftX + rightX) / 2)
      .attr('y', (item) => (item.sourceY + item.targetY) / 2 - 8)
      .text((item) => `${item.decade} · ${item.category}`);
  }
}
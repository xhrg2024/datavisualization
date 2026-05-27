const d3 = globalThis.d3;

if (!d3) {
  throw new Error('D3.js is required for NetworkChart.');
}

export class NetworkChart {
  constructor(containerSelector, bus) {
    this.container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    this.bus = bus;
    this.data = { nodes: [], links: [] };
    this.state = { year: 1968, category: 'academy' };
    this.margin = { top: 24, right: 24, bottom: 24, left: 24 };

    this.svg = d3.select(this.container).append('svg').attr('class', 'network-chart__svg');
    this.root = this.svg.append('g').attr('class', 'network-chart__root');
    this.linkLayer = this.root.append('g').attr('class', 'network-chart__links');
    this.nodeLayer = this.root.append('g').attr('class', 'network-chart__nodes');
    this.labelLayer = this.root.append('g').attr('class', 'network-chart__labels');

    this.simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id((item) => item.id).distance((item) => item.distance || 130))
      .force('charge', d3.forceManyBody().strength(-180))
      .force('collide', d3.forceCollide().radius((item) => item.radius + 6))
      .force('center', d3.forceCenter())
      .force('x', d3.forceX().strength(0.03))
      .force('y', d3.forceY().strength(0.03));

    this.bus.on('yearChange.memberC', (payload) => {
      this.state.year = payload.year;
      this.updateState();
    });

    this.bus.on('categoryChange.memberC', (payload) => {
      this.state.category = payload.category;
      this.updateState();
    });
  }

  async loadData(url) {
    const raw = await fetch(url).then((response) => response.json());
    this.data = {
      nodes: raw.nodes.map((item) => ({ ...item, radius: item.radius ?? 16 })),
      links: raw.links.map((item) => ({ ...item }))
    };
    this.render();
    return this;
  }

  render() {
    if (!this.data.nodes.length || !this.container) {
      return;
    }

    const bounds = this.container.getBoundingClientRect();
    const width = Math.max(340, bounds.width);
    const height = Math.max(420, bounds.height || 420);

    this.svg.attr('viewBox', `0 0 ${width} ${height}`);
    this.root.attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    const innerWidth = width - this.margin.left - this.margin.right;
    const innerHeight = height - this.margin.top - this.margin.bottom;

    this.simulation
      .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
      .force('x', d3.forceX(innerWidth / 2).strength(0.05))
      .force('y', d3.forceY(innerHeight / 2).strength(0.05))
      .nodes(this.data.nodes)
      .on('tick', () => this.ticked());

    this.simulation.force('link').links(this.data.links);
    this.linkSelection = this.linkLayer.selectAll('path').data(this.data.links, (item) => `${item.source.id ?? item.source}-${item.target.id ?? item.target}`);
    this.nodeSelection = this.nodeLayer.selectAll('circle').data(this.data.nodes, (item) => item.id);
    this.labelSelection = this.labelLayer.selectAll('text').data(this.data.nodes, (item) => item.id);

    this.linkSelection.join(
      (enter) => enter.append('path').attr('class', 'network-chart__link'),
      (update) => update,
      (exit) => exit.remove()
    );

    this.nodeSelection.join(
      (enter) => enter.append('circle').attr('class', 'network-chart__node').attr('r', (item) => item.radius),
      (update) => update,
      (exit) => exit.remove()
    );

    this.labelSelection.join(
      (enter) => enter.append('text').attr('class', 'network-chart__label'),
      (update) => update,
      (exit) => exit.remove()
    )
      .text((item) => item.label ?? item.id);

    this.updateState();
    this.simulation.alpha(1).restart();
  }

  resize() {
    this.render();
  }

  ticked() {
    this.linkSelection.attr('d', (item) => {
      const source = item.source;
      const target = item.target;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const curvature = Math.min(0.35, item.curvature ?? 0.22);
      const offsetX = (dy / distance) * distance * curvature;
      const offsetY = (-dx / distance) * distance * curvature;

      return `M${source.x},${source.y} C${source.x + offsetX},${source.y + offsetY} ${target.x + offsetX},${target.y + offsetY} ${target.x},${target.y}`;
    });

    this.nodeSelection.attr('cx', (item) => item.x).attr('cy', (item) => item.y);
    this.labelSelection.attr('x', (item) => item.x + item.radius + 6).attr('y', (item) => item.y + 4);
  }

  updateState() {
    const activeNodes = new Set(
      this.data.nodes
        .filter((item) => this.state.category === 'all' || item.group === this.state.category)
        .filter((item) => this.state.year >= item.startYear && this.state.year <= item.endYear)
        .map((item) => item.id)
    );

    this.nodeSelection
      .classed('is-active', (item) => activeNodes.has(item.id))
      .classed('is-muted', (item) => !activeNodes.has(item.id));

    this.labelSelection
      .classed('is-active', (item) => activeNodes.has(item.id))
      .classed('is-muted', (item) => !activeNodes.has(item.id));

    this.linkSelection
      .classed('is-active', (item) => activeNodes.has(item.source.id ?? item.source) || activeNodes.has(item.target.id ?? item.target))
      .classed('is-muted', (item) => !(activeNodes.has(item.source.id ?? item.source) || activeNodes.has(item.target.id ?? item.target)));
  }
}
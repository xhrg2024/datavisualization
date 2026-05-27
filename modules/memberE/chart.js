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
    this.data = [];
    this.state = { year: 2024, category: 'physics' };
    this.margin = { top: 36, right: 24, bottom: 50, left: 56 };

    this.svg = d3.select(this.container).append('svg').attr('class', 'morphing-chart__svg');
    this.defs = this.svg.append('defs');
    const gradient = this.defs.append('linearGradient').attr('id', 'morphing-gradient').attr('x1', '0%').attr('x2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#66d1c1').attr('stop-opacity', 0.92);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#66d9ff').attr('stop-opacity', 0.18);

    this.plot = this.svg.append('g').attr('class', 'morphing-chart__plot');
    this.axisX = this.plot.append('g').attr('class', 'morphing-chart__axis morphing-chart__axis--x');
    this.axisY = this.plot.append('g').attr('class', 'morphing-chart__axis morphing-chart__axis--y');
    this.points = this.plot.append('g').attr('class', 'morphing-chart__points');
    this.focus = this.plot.append('g').attr('class', 'morphing-chart__focus');

    this.bus.on('yearChange.memberE', (payload) => {
      this.state.year = payload.year;
      this.update();
    });

    this.bus.on('categoryChange.memberE', (payload) => {
      this.state.category = payload.category;
      this.update();
    });
  }

  async loadData(url) {
    this.data = await fetch(url).then((response) => response.json());
    this.data.sort((left, right) => d3.ascending(left.year, right.year));
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
    const width = Math.max(320, bounds.width);
    const height = Math.max(420, bounds.height || 420);
    const innerWidth = width - this.margin.left - this.margin.right;
    const innerHeight = height - this.margin.top - this.margin.bottom;
    const clusterMode = this.state.category !== 'all';

    this.svg.attr('viewBox', `0 0 ${width} ${height}`);
    this.plot.attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    const xTimeline = d3.scaleLinear()
      .domain(d3.extent(this.data, (item) => item.year))
      .range([0, innerWidth]);

    const yTimeline = d3.scaleLinear()
      .domain([0, d3.max(this.data, (item) => item.score) + 8])
      .nice()
      .range([innerHeight, 0]);

    const fieldCenters = Array.from(new Set(this.data.map((item) => item.field)));
    const clusterX = d3.scalePoint().domain(fieldCenters).range([60, innerWidth - 60]).padding(0.6);

    const x = clusterMode ? (item) => clusterX(item.field) : (item) => xTimeline(item.year);
    const y = clusterMode ? (item) => yTimeline(item.year) : (item) => yTimeline(item.score);

    this.axisX
      .attr('transform', `translate(0,${innerHeight})`)
      .transition()
      .duration(550)
      .call(d3.axisBottom(clusterMode ? clusterX : xTimeline).ticks(6).tickSizeOuter(0));

    this.axisY
      .transition()
      .duration(550)
      .call(d3.axisLeft(clusterMode ? yTimeline : yTimeline).ticks(6).tickSizeOuter(0));

    const circleSelection = this.points.selectAll('circle').data(this.data, (item) => item.id);
    circleSelection.join(
      (enter) => enter.append('circle').attr('class', 'morphing-chart__point').attr('r', 7),
      (update) => update,
      (exit) => exit.remove()
    )
      .transition()
      .duration(750)
      .attr('cx', (item) => x(item))
      .attr('cy', (item) => y(item))
      .attr('r', (item) => (item.field === this.state.category ? 11 : 7))
      .attr('opacity', (item) => (this.state.category === 'all' || item.field === this.state.category ? 1 : 0.25))
      .attr('fill', (item) => (item.field === this.state.category ? 'url(#morphing-gradient)' : '#edf4ff'));

    const labelSelection = this.points.selectAll('text').data(this.data.filter((item) => item.field === this.state.category || this.state.category === 'all'), (item) => item.id);
    labelSelection.join(
      (enter) => enter.append('text').attr('class', 'morphing-chart__label'),
      (update) => update,
      (exit) => exit.remove()
    )
      .transition()
      .duration(750)
      .attr('x', (item) => x(item) + 12)
      .attr('y', (item) => y(item) - 10)
      .text((item) => item.label);

    const selectedPoint = this.data.reduce((closest, item) => {
      if (!closest) {
        return item;
      }

      return Math.abs(item.year - this.state.year) < Math.abs(closest.year - this.state.year) ? item : closest;
    }, null);

    const focusSelection = this.focus.selectAll('g').data(selectedPoint ? [selectedPoint] : []);
    const focusEnter = focusSelection.join((enter) => {
      const group = enter.append('g').attr('class', 'morphing-chart__focus-group');
      group.append('line').attr('class', 'morphing-chart__focus-line');
      group.append('circle').attr('class', 'morphing-chart__focus-dot').attr('r', 12);
      group.append('text').attr('class', 'morphing-chart__focus-label');
      return group;
    });

    focusEnter
      .transition()
      .duration(750)
      .attr('transform', (item) => `translate(${x(item)},${y(item)})`);

    focusEnter.select('.morphing-chart__focus-line')
      .transition()
      .duration(750)
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', -70)
      .attr('y2', 70);

    focusEnter.select('.morphing-chart__focus-label')
      .transition()
      .duration(750)
      .attr('x', 16)
      .attr('y', -16)
      .text((item) => `${item.year} · ${item.field}`);
  }
}
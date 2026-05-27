const d3 = globalThis.d3;

if (!d3) {
  throw new Error('D3.js is required for TrajectoryChart.');
}

export class TrajectoryChart {
  constructor(containerSelector, bus) {
    this.container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    this.bus = bus;
    this.data = [];
    this.state = { year: 1948, category: 'physics' };
    this.margin = { top: 48, right: 28, bottom: 54, left: 64 };

    this.svg = d3.select(this.container).append('svg').attr('class', 'trajectory-chart__svg');
    this.defs = this.svg.append('defs');
    const gradient = this.defs.append('linearGradient').attr('id', 'trajectory-gradient').attr('x1', '0%').attr('x2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#ffb35c').attr('stop-opacity', 0.9);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#ffd166').attr('stop-opacity', 0.16);

    this.plot = this.svg.append('g').attr('class', 'trajectory-chart__plot');
    this.gridX = this.plot.append('g').attr('class', 'trajectory-chart__grid trajectory-chart__grid--x');
    this.gridY = this.plot.append('g').attr('class', 'trajectory-chart__grid trajectory-chart__grid--y');
    this.axisX = this.plot.append('g').attr('class', 'trajectory-chart__axis trajectory-chart__axis--x');
    this.axisY = this.plot.append('g').attr('class', 'trajectory-chart__axis trajectory-chart__axis--y');
    this.linePath = this.plot.append('path').attr('class', 'trajectory-chart__line');
    this.points = this.plot.append('g').attr('class', 'trajectory-chart__points');
    this.focus = this.plot.append('g').attr('class', 'trajectory-chart__focus');

    this.bus.on('yearChange.memberB', (payload) => {
      this.state.year = payload.year;
      this.update();
    });

    this.bus.on('categoryChange.memberB', (payload) => {
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

    this.svg.attr('viewBox', `0 0 ${width} ${height}`);
    this.plot.attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    const x = d3.scaleLinear()
      .domain(d3.extent(this.data, (item) => item.year))
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([d3.min(this.data, (item) => item.age) - 4, d3.max(this.data, (item) => item.age) + 4])
      .nice()
      .range([innerHeight, 0]);

    const line = d3.line()
      .x((item) => x(item.year))
      .y((item) => y(item.age))
      .curve(d3.curveMonotoneX);

    this.gridX
      .attr('transform', `translate(0,${innerHeight})`)
      .transition()
      .duration(500)
      .call(d3.axisBottom(x).ticks(6).tickSize(-innerHeight).tickFormat(''));

    this.gridY
      .transition()
      .duration(500)
      .call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(''));

    this.axisX
      .attr('transform', `translate(0,${innerHeight})`)
      .transition()
      .duration(500)
      .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0));

    this.axisY
      .transition()
      .duration(500)
      .call(d3.axisLeft(y).ticks(6).tickSizeOuter(0));

    this.linePath
      .datum(this.data)
      .transition()
      .duration(650)
      .attr('fill', 'none')
      .attr('stroke', 'url(#trajectory-gradient)')
      .attr('d', line);

    const activeYearPoint = this.data.reduce((closest, item) => {
      if (!closest) {
        return item;
      }

      return Math.abs(item.year - this.state.year) < Math.abs(closest.year - this.state.year) ? item : closest;
    }, null);

    const circles = this.points.selectAll('circle').data(this.data, (item) => item.year + item.name);

    circles.join(
      (enter) => enter.append('circle').attr('r', 5),
      (update) => update,
      (exit) => exit.remove()
    )
      .transition()
      .duration(650)
      .attr('cx', (item) => x(item.year))
      .attr('cy', (item) => y(item.age))
      .attr('class', (item) => `trajectory-chart__point trajectory-chart__point--${item.category}`)
      .attr('r', (item) => (item.year === activeYearPoint?.year ? 8 : 5))
      .attr('opacity', (item) => (this.state.category === 'all' || item.category === this.state.category ? 1 : 0.28));

    const labels = this.points.selectAll('text').data(this.data.filter((item) => item.year === activeYearPoint?.year), (item) => item.name);

    labels.join(
      (enter) => enter.append('text').attr('class', 'trajectory-chart__label'),
      (update) => update,
      (exit) => exit.remove()
    )
      .transition()
      .duration(650)
      .attr('x', (item) => x(item.year) + 10)
      .attr('y', (item) => y(item.age) - 12)
      .text((item) => `${item.name} · ${item.age} 岁`);

    const focus = this.focus.selectAll('g').data(activeYearPoint ? [activeYearPoint] : []);

    const focusEnter = focus.join((enter) => {
      const group = enter.append('g').attr('class', 'trajectory-chart__focus-group');
      group.append('line').attr('class', 'trajectory-chart__focus-line');
      group.append('circle').attr('class', 'trajectory-chart__focus-ring').attr('r', 12);
      group.append('text').attr('class', 'trajectory-chart__focus-label');
      return group;
    });

    focusEnter
      .transition()
      .duration(600)
      .attr('transform', (item) => `translate(${x(item.year)},${y(item.age)})`);

    focusEnter.select('.trajectory-chart__focus-line')
      .transition()
      .duration(600)
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', -y(activeYearPoint?.age ?? 0) - 20)
      .attr('y2', innerHeight - y(activeYearPoint?.age ?? 0));

    focusEnter.select('.trajectory-chart__focus-label')
      .transition()
      .duration(600)
      .attr('x', 16)
      .attr('y', -16)
      .text((item) => `${item.year} · ${item.category}`);
  }
}
const d3 = globalThis.d3;

if (!d3) {
  throw new Error('D3.js is required for MacroChart.');
}

export class MacroChart {
  constructor(containerSelector, bus) {
    this.container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    this.bus = bus;
    this.data = [];
    this.state = { year: 1901, category: 'all' };
    this.margin = { top: 48, right: 28, bottom: 52, left: 62 };

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('class', 'macro-chart__svg');

    this.defs = this.svg.append('defs');
    const gradient = this.defs.append('linearGradient')
      .attr('id', 'macro-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#66d9ff').attr('stop-opacity', 0.7);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#8bdb9c').attr('stop-opacity', 0.18);

    this.plot = this.svg.append('g').attr('class', 'macro-chart__plot');
    this.axisX = this.plot.append('g').attr('class', 'macro-chart__axis macro-chart__axis--x');
    this.axisY = this.plot.append('g').attr('class', 'macro-chart__axis macro-chart__axis--y');
    this.areaPath = this.plot.append('path').attr('class', 'macro-chart__area');
    this.linePath = this.plot.append('path').attr('class', 'macro-chart__line');
    this.dots = this.plot.append('g').attr('class', 'macro-chart__dots');
    this.focus = this.plot.append('g').attr('class', 'macro-chart__focus');

    this.bus.on('yearChange.memberA', (payload) => {
      this.state.year = payload.year;
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
      .domain([0, d3.max(this.data, (item) => item.laureates) + 2])
      .nice()
      .range([innerHeight, 0]);

    const area = d3.area()
      .x((item) => x(item.year))
      .y0(innerHeight)
      .y1((item) => y(item.laureates))
      .curve(d3.curveMonotoneX);

    const line = d3.line()
      .x((item) => x(item.year))
      .y((item) => y(item.laureates))
      .curve(d3.curveMonotoneX);

    this.axisX
      .attr('transform', `translate(0,${innerHeight})`)
      .transition()
      .duration(600)
      .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0));

    this.axisY
      .transition()
      .duration(600)
      .call(d3.axisLeft(y).ticks(5).tickSizeOuter(0));

    this.areaPath
      .datum(this.data)
      .transition()
      .duration(700)
      .attr('fill', 'url(#macro-gradient)')
      .attr('d', area);

    this.linePath
      .datum(this.data)
      .transition()
      .duration(700)
      .attr('d', line);

    const focusPoint = this.data.reduce((closest, item) => {
      if (!closest) {
        return item;
      }

      return Math.abs(item.year - this.state.year) < Math.abs(closest.year - this.state.year) ? item : closest;
    }, null);

    const dots = this.dots.selectAll('circle').data(this.data, (item) => item.year);

    dots.join(
      (enter) => enter.append('circle')
        .attr('r', 4)
        .attr('cx', (item) => x(item.year))
        .attr('cy', (item) => y(item.laureates)),
      (update) => update,
      (exit) => exit.remove()
    )
      .transition()
      .duration(650)
      .attr('cx', (item) => x(item.year))
      .attr('cy', (item) => y(item.laureates))
      .attr('r', (item) => (item.year === focusPoint?.year ? 7 : 4))
      .attr('opacity', (item) => (item.year === focusPoint?.year ? 1 : 0.72));

    const focusLine = this.focus.selectAll('.macro-chart__focus-line').data(focusPoint ? [focusPoint] : []);

    focusLine.join(
      (enter) => enter.append('line').attr('class', 'macro-chart__focus-line'),
      (update) => update,
      (exit) => exit.remove()
    )
      .transition()
      .duration(550)
      .attr('x1', (item) => x(item.year))
      .attr('x2', (item) => x(item.year))
      .attr('y1', 0)
      .attr('y2', innerHeight);

    const focusDot = this.focus.selectAll('.macro-chart__focus-dot').data(focusPoint ? [focusPoint] : []);

    focusDot.join(
      (enter) => enter.append('circle').attr('class', 'macro-chart__focus-dot').attr('r', 9),
      (update) => update,
      (exit) => exit.remove()
    )
      .transition()
      .duration(550)
      .attr('cx', (item) => x(item.year))
      .attr('cy', (item) => y(item.laureates));

    const focusLabel = this.focus.selectAll('.macro-chart__focus-label').data(focusPoint ? [focusPoint] : []);

    focusLabel.join(
      (enter) => enter.append('text').attr('class', 'macro-chart__focus-label'),
      (update) => update,
      (exit) => exit.remove()
    )
      .transition()
      .duration(550)
      .attr('x', (item) => x(item.year) + 12)
      .attr('y', (item) => y(item.laureates) - 12)
      .text((item) => `${item.year} · ${item.laureates}`);
  }
}
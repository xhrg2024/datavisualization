import { MacroChart } from './modules/memberA/chart.js';
import { TrajectoryChart } from './modules/memberB/chart.js';
import { NetworkChart } from './modules/memberC/chart.js';
import { AlluvialChart } from './modules/memberD/chart.js';
import { MorphingChart } from './modules/memberE/chart.js';

const d3 = globalThis.d3;

if (!d3) {
  throw new Error('D3.js must be loaded before main.js.');
}

const chartRegistry = {
  macro: MacroChart,
  trajectory: TrajectoryChart,
  network: NetworkChart,
  alluvial: AlluvialChart,
  morphing: MorphingChart
};

const dataRegistry = {
  macro: './data/memberA_data.json',
  trajectory: './data/memberB_data.json',
  network: './data/memberC_data.json',
  alluvial: './data/memberD_data.json',
  morphing: './data/memberE_data.json'
};

const pageSequence = Array.from(document.querySelectorAll('.page'));
const modulePages = pageSequence.filter((page) => page.dataset.module);
const carouselCards = Array.from(document.querySelectorAll('[data-carousel] .carousel-card'));
const pageDotsContainer = document.querySelector('.page-dots');
const pageLabel = document.querySelector('[data-page-label]');
const pageCount = document.querySelector('[data-page-count]');
const wheelZone = document.querySelector('.page-wheel-zone');
const carouselPrev = document.querySelector('[data-carousel-prev]');
const carouselNext = document.querySelector('[data-carousel-next]');
const goNextButton = document.querySelector('[data-go-next]');
const goOverviewButton = document.querySelector('[data-go-page]');

const state = {
  currentPage: 0,
  carouselIndex: 0,
  charts: new Map(),
  wheelLock: false
};

function updatePageMeta(index) {
  const page = pageSequence[index];
  const currentTitle = page?.dataset.title ?? '首页';

  if (pageLabel) {
    pageLabel.textContent = currentTitle;
  }

  if (pageCount) {
    pageCount.textContent = `${String(index + 1).padStart(2, '0')} / ${String(pageSequence.length).padStart(2, '0')}`;
  }

  document.title = `通往斯德哥尔摩之路 | ${currentTitle}`;
}

function syncPageClasses(index) {
  pageSequence.forEach((page, pageIndex) => {
    page.classList.remove('is-active', 'is-prev', 'is-next');
    if (pageIndex === index) {
      page.classList.add('is-active');
    } else if (pageIndex < index) {
      page.classList.add('is-prev');
    } else {
      page.classList.add('is-next');
    }
  });

  document.querySelectorAll('.page-dot').forEach((dot, dotIndex) => {
    dot.classList.toggle('is-active', dotIndex === index);
  });

  updatePageMeta(index);
}

function goToPage(index) {
  const targetIndex = Math.max(0, Math.min(index, pageSequence.length - 1));
  state.currentPage = targetIndex;
  syncPageClasses(targetIndex);

  const page = pageSequence[targetIndex];
  if (page?.dataset.module) {
    const chart = state.charts.get(page.dataset.module);
    chart?.resize?.();
  }
}

function movePage(step) {
  goToPage(state.currentPage + step);
}

function buildPageDots() {
  if (!pageDotsContainer) {
    return;
  }

  pageDotsContainer.innerHTML = '';
  pageSequence.forEach((page, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'page-dot';
    dot.setAttribute('aria-label', page.dataset.title ?? `第 ${index + 1} 页`);
    dot.addEventListener('click', () => goToPage(index));
    pageDotsContainer.appendChild(dot);
  });
}

function setCarouselIndex(index) {
  if (!carouselCards.length) {
    return;
  }

  state.carouselIndex = (index + carouselCards.length) % carouselCards.length;
  carouselCards.forEach((card, cardIndex) => {
    card.classList.toggle('is-active', cardIndex === state.carouselIndex);
  });
}

function buildCarousel() {
  if (!carouselCards.length) {
    return;
  }

  let timer = window.setInterval(() => setCarouselIndex(state.carouselIndex + 1), 5200);
  const resetTimer = () => {
    window.clearInterval(timer);
    timer = window.setInterval(() => setCarouselIndex(state.carouselIndex + 1), 5200);
  };

  carouselPrev?.addEventListener('click', () => {
    setCarouselIndex(state.carouselIndex - 1);
    resetTimer();
  });

  carouselNext?.addEventListener('click', () => {
    setCarouselIndex(state.carouselIndex + 1);
    resetTimer();
  });
}

async function loadCharts() {
  const bootstraps = modulePages.map(async (page) => {
    const moduleName = page.dataset.module;
    const container = page.querySelector('.chart-container');
    const ChartClass = chartRegistry[moduleName];
    const dataPath = dataRegistry[moduleName];

    if (!ChartClass || !container || !dataPath) {
      return null;
    }

    const chart = new ChartClass(container, d3.dispatch('yearChange', 'categoryChange'));
    state.charts.set(moduleName, chart);
    await chart.loadData(dataPath);
    return chart;
  });

  return Promise.all(bootstraps);
}

function handleWheelDelta(deltaY) {
  if (state.wheelLock) {
    return;
  }

  if (Math.abs(deltaY) < 18) {
    return;
  }

  state.wheelLock = true;
  movePage(deltaY > 0 ? 1 : -1);

  window.setTimeout(() => {
    state.wheelLock = false;
  }, 820);
}

function installWheelZone() {
  if (!wheelZone) {
    return;
  }

  wheelZone.addEventListener('wheel', (event) => {
    event.preventDefault();
    handleWheelDelta(event.deltaY);
  }, { passive: false });

  let touchStartY = 0;

  wheelZone.addEventListener('touchstart', (event) => {
    touchStartY = event.touches[0]?.clientY ?? 0;
  }, { passive: true });

  wheelZone.addEventListener('touchend', (event) => {
    const touchEndY = event.changedTouches[0]?.clientY ?? 0;
    const delta = touchStartY - touchEndY;
    if (Math.abs(delta) > 40) {
      handleWheelDelta(delta);
    }
  }, { passive: true });
}

function installKeyboard() {
  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
      event.preventDefault();
      movePage(1);
    }

    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault();
      movePage(-1);
    }
  });
}

function installButtons() {
  goNextButton?.addEventListener('click', () => movePage(1));
  goOverviewButton?.addEventListener('click', () => goToPage(1));
}

function installResizeHandling() {
  window.addEventListener('resize', () => {
    state.charts.forEach((chart) => chart.resize?.());
  });
}

async function bootstrap() {
  buildPageDots();
  buildCarousel();
  installWheelZone();
  installKeyboard();
  installButtons();
  installResizeHandling();
  await loadCharts();
  goToPage(0);
}

window.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    console.error('Bootstrap failed:', error);
  });
});
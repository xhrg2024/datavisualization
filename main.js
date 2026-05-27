import { MacroChart } from './modules/memberA/chart.js';
import { TrajectoryChart } from './modules/memberB/chart.js';
import { NetworkChart } from './modules/memberC/chart.js';
import { AlluvialChart } from './modules/memberD/chart.js';
import { MorphingChart } from './modules/memberE/chart.js';

const d3 = globalThis.d3;

if (!d3) {
  throw new Error('D3.js must be loaded before main.js.');
}

const globalBus = d3.dispatch('yearChange', 'categoryChange');

const chartRegistry = {
  macro: MacroChart,
  trajectory: TrajectoryChart,
  network: NetworkChart,
  alluvial: AlluvialChart,
  morphing: MorphingChart
};

const moduleSpecs = [
  { module: 'macro', src: './modules/memberA/page.html', title: '引子 · 谁在赢得诺贝尔奖？', dataFile: './data/memberA_data.json' },
  { module: 'trajectory', src: './modules/memberB/page.html', title: '蓄力 · 卓越是如何炼成的？', dataFile: './data/memberB_data.json' },
  { module: 'network', src: './modules/memberC/page.html', title: '同行 · 巨人的肩膀与同行者', dataFile: './data/memberC_data.json' },
  { module: 'alluvial', src: './modules/memberD/page.html', title: '破壁 · 他们在研究什么？', dataFile: './data/memberD_data.json' },
  { module: 'morphing', src: './modules/memberE/page.html', title: '余音 · 改变世界的代表作', dataFile: './data/memberE_data.json' }
];

const pageLabel = document.querySelector('[data-page-label]');
const pageCount = document.querySelector('[data-page-count]');
const pageDotsContainer = document.querySelector('[data-page-dots]');
const moduleSlot = document.querySelector('[data-module-slot]');
const navShell = document.querySelector('.nav-constellation');
const navPeek = document.querySelector('[data-nav-peek]');
const carouselCards = Array.from(document.querySelectorAll('[data-carousel] .carousel-card'));
const carouselPrev = document.querySelector('[data-carousel-prev]');
const carouselNext = document.querySelector('[data-carousel-next]');
const goNextButton = document.querySelector('[data-go-next]');
const goOverviewButton = document.querySelector('[data-go-page]');

const state = {
  currentPage: 0,
  carouselIndex: 0,
  charts: new Map(),
  pages: [],
  modulePages: [],
  wheelLock: false,
  transitionLock: false,
  transitionDuration: 600
};

function collectPages() {
  state.pages = Array.from(document.querySelectorAll('.page'));
  state.modulePages = state.pages.filter((page) => page.dataset.module);
}

function updatePageMeta(index) {
  const page = state.pages[index];
  const currentTitle = page?.dataset.title ?? '首页';

  // 导航标签切换动画：先淡出，再更新内容，再淡入
  if (pageLabel) {
    pageLabel.classList.add('is-switching');
  }
  if (pageCount) {
    pageCount.classList.add('is-switching');
  }

  setTimeout(() => {
    if (pageLabel) {
      pageLabel.textContent = currentTitle;
      pageLabel.classList.remove('is-switching');
    }
    if (pageCount) {
      pageCount.textContent = `${String(index + 1).padStart(2, '0')} / ${String(state.pages.length).padStart(2, '0')}`;
      pageCount.classList.remove('is-switching');
    }
  }, 150);

  document.title = `通往斯德哥尔摩之路 | ${currentTitle}`;
}

function syncPageClasses(index) {
  state.pages.forEach((page, pageIndex) => {
    page.classList.remove('is-active', 'is-prev', 'is-next');
    if (pageIndex === index) {
      page.classList.add('is-active');
    } else if (pageIndex < index) {
      page.classList.add('is-prev');
    } else {
      page.classList.add('is-next');
    }
  });

  // 更新导航圆球位置
  const dots = document.querySelectorAll('.page-dot');
  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle('is-active', dotIndex === index);
  });

  // 移动 constellation-orb 到当前 dot 的位置
  const orb = document.querySelector('.constellation-orb');
  if (orb && dots[index]) {
    const trackRect = document.querySelector('.constellation-track')?.getBoundingClientRect();
    const dotRect = dots[index].getBoundingClientRect();
    if (trackRect && dotRect) {
      const orbTop = dotRect.top - trackRect.top + dotRect.height / 2 - 8;
      orb.style.top = `${orbTop}px`;
    }
  }

  updatePageMeta(index);
}

function goToPage(index) {
  if (state.transitionLock) return;
  const targetIndex = Math.max(0, Math.min(index, state.pages.length - 1));
  if (targetIndex === state.currentPage) return;

  state.transitionLock = true;
  state.currentPage = targetIndex;
  syncPageClasses(targetIndex);

  const page = state.pages[targetIndex];
  if (page?.dataset.module) {
    const chart = state.charts.get(page.dataset.module);
    chart?.resize?.();
  }

  // 过渡完成后解锁
  setTimeout(() => {
    state.transitionLock = false;
  }, state.transitionDuration);
}

function movePage(step) {
  goToPage(state.currentPage + step);
}

function buildPageDots() {
  if (!pageDotsContainer) {
    return;
  }

  pageDotsContainer.innerHTML = '';
  state.pages.forEach((page, index) => {
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

async function loadModulePages() {
  if (!moduleSlot) {
    return;
  }

  const insertedPages = [];

  for (const spec of moduleSpecs) {
    try {
      const response = await fetch(spec.src, { cache: 'no-store' });
      if (!response.ok) {
        console.warn(`Module page not found: ${spec.src}`);
        continue;
      }

      const html = await response.text();
      const template = document.createElement('template');
      template.innerHTML = html.trim();
      const section = template.content.querySelector('.page') || template.content.firstElementChild;

      if (!section) {
        continue;
      }

      if (!section.classList.contains('page')) {
        section.classList.add('page');
      }

      section.dataset.module = section.dataset.module || spec.module;
      section.dataset.title = section.dataset.title || spec.title;
      section.dataset.dataFile = section.dataset.dataFile || spec.dataFile;
      insertedPages.push(section);
    } catch (error) {
      console.error('Failed to load module page:', spec.src, error);
    }
  }

  if (insertedPages.length) {
    moduleSlot.replaceWith(...insertedPages);
  } else {
    moduleSlot.remove();
  }
}

async function loadCharts() {
  const bootstraps = state.modulePages.map(async (page) => {
    const moduleName = page.dataset.module;
    const container = page.querySelector('[data-chart-target]') || page.querySelector('.chart-container');
    const ChartClass = chartRegistry[moduleName];
    const dataPath = page.dataset.dataFile;

    if (!ChartClass || !container || !dataPath) {
      return null;
    }

    const chart = new ChartClass(container, globalBus);
    state.charts.set(moduleName, chart);
    await chart.loadData(dataPath);
    return chart;
  });

  return Promise.all(bootstraps);
}

function handleWheelDelta(deltaY) {
  if (state.wheelLock || state.transitionLock) {
    return;
  }

  if (Math.abs(deltaY) < 18) {
    return;
  }

  state.wheelLock = true;
  movePage(deltaY > 0 ? 1 : -1);

  window.setTimeout(() => {
    state.wheelLock = false;
  }, 680);
}

function installWheelZone() {
  if (!navShell) {
    return;
  }

  navShell.addEventListener('wheel', (event) => {
    event.preventDefault();
    handleWheelDelta(event.deltaY);
  }, { passive: false });

  let touchStartY = 0;

  navShell.addEventListener('touchstart', (event) => {
    touchStartY = event.touches[0]?.clientY ?? 0;
  }, { passive: true });

  navShell.addEventListener('touchend', (event) => {
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

function installNavIdle() {
  if (!navShell) {
    return;
  }

  const hotZoneWidth = 64;
  const idleDelay = 1400;
  let idleTimer = null;
  let overNav = false;
  let overPeek = false;

  const showNav = () => {
    navShell.classList.remove('is-idle');
    window.clearTimeout(idleTimer);
  };

  const scheduleHide = () => {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (!overNav && !overPeek) {
        navShell.classList.add('is-idle');
      }
    }, idleDelay);
  };

  const handlePointerMove = (event) => {
    const inHotZone = event.clientX >= window.innerWidth - hotZoneWidth;
    if (inHotZone && navShell.classList.contains('is-idle')) {
      showNav();
      scheduleHide();
    }
  };

  navShell.addEventListener('mouseenter', () => {
    overNav = true;
    showNav();
  });

  navShell.addEventListener('mouseleave', () => {
    overNav = false;
    scheduleHide();
  });

  navShell.addEventListener('focusin', showNav);
  navShell.addEventListener('focusout', scheduleHide);

  navPeek?.addEventListener('mouseenter', () => {
    overPeek = true;
    showNav();
  });

  navPeek?.addEventListener('mouseleave', () => {
    overPeek = false;
    scheduleHide();
  });

  navPeek?.addEventListener('click', () => {
    showNav();
    scheduleHide();
  });

  window.addEventListener('mousemove', handlePointerMove, { passive: true });
  window.addEventListener('touchstart', () => {
    showNav();
    scheduleHide();
  }, { passive: true });
  window.addEventListener('keydown', () => {
    showNav();
    scheduleHide();
  });

  showNav();
  scheduleHide();
}

async function bootstrap() {
  await loadModulePages();
  collectPages();
  buildPageDots();
  buildCarousel();
  installWheelZone();
  installKeyboard();
  installButtons();
  installResizeHandling();
  installNavIdle();
  await loadCharts();
  syncPageClasses(0);
  updatePageMeta(0);
  // 初始化 orb 位置（禁用过渡动画，避免页面加载时 orb 滑动）
  const orb = document.querySelector('.constellation-orb');
  if (orb) {
    orb.style.transition = 'none';
    const dots = document.querySelectorAll('.page-dot');
    const trackRect = document.querySelector('.constellation-track')?.getBoundingClientRect();
    if (dots[0] && trackRect) {
      const dotRect = dots[0].getBoundingClientRect();
      orb.style.top = `${dotRect.top - trackRect.top + dotRect.height / 2 - 8}px`;
    }
    // 下一帧恢复过渡
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        orb.style.transition = '';
      });
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    console.error('Bootstrap failed:', error);
  });
});
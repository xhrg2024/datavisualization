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

const sceneConfig = [
  { selector: '#section-macro', year: 1901, category: 'all' },
  { selector: '#section-trajectory', year: 1948, category: 'physics' },
  { selector: '#section-network', year: 1968, category: 'academy' },
  { selector: '#section-alluvial', year: 1998, category: 'Europe' },
  { selector: '#section-morphing', year: 2024, category: 'physics' }
];

function getSceneIndex(section) {
  return sceneConfig.findIndex((scene) => scene.selector === `#${section.id}`);
}

function activateScene(index) {
  const scene = sceneConfig[index];
  if (!scene) {
    return;
  }

  globalBus.call('yearChange', null, { year: scene.year, selector: scene.selector });
  globalBus.call('categoryChange', null, { category: scene.category, selector: scene.selector });

  document.querySelectorAll('.story-section').forEach((section, currentIndex) => {
    section.classList.toggle('is-active', currentIndex === index);
  });
}

function createCharts() {
  const charts = [
    new MacroChart('#section-macro .chart-container', globalBus),
    new TrajectoryChart('#section-trajectory .chart-container', globalBus),
    new NetworkChart('#section-network .chart-container', globalBus),
    new AlluvialChart('#section-alluvial .chart-container', globalBus),
    new MorphingChart('#section-morphing .chart-container', globalBus)
  ];

  return Promise.all([
    charts[0].loadData('./data/memberA_data.json'),
    charts[1].loadData('./data/memberB_data.json'),
    charts[2].loadData('./data/memberC_data.json'),
    charts[3].loadData('./data/memberD_data.json'),
    charts[4].loadData('./data/memberE_data.json')
  ]).then(() => charts);
}

function installSceneObserver() {
  const sections = Array.from(document.querySelectorAll('.story-section'));
  let activeIndex = 0;

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

    if (!visible) {
      return;
    }

    const nextIndex = getSceneIndex(visible.target);
    if (nextIndex !== -1 && nextIndex !== activeIndex) {
      activeIndex = nextIndex;
      activateScene(activeIndex);
    }
  }, {
    threshold: [0.32, 0.45, 0.6, 0.78]
  });

  sections.forEach((section) => observer.observe(section));
  activateScene(activeIndex);
}

async function bootstrap() {
  const charts = await createCharts();
  installSceneObserver();

  window.addEventListener('resize', () => {
    charts.forEach((chart) => chart.resize());
  });

  charts.forEach((chart) => chart.resize());
}

window.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    console.error('Bootstrap failed:', error);
  });
});
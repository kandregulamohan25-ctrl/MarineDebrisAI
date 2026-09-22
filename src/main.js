/**
 * MarineDebrisAI - Main Application Controller
 * Unifies Dashboard, Analysis, Results, Map, and Reports around the real Python YOLO pipeline.
 */

import './styles/variables.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/sonar-viewer.css';
import './styles/map.css';

import { MissionSession } from './state/MissionSession.js';
import { renderDemoController } from './components/DemoController.js';

import { renderSidebar } from './components/Sidebar.js';
import { renderHeader } from './components/Header.js';
import { renderDashboardView } from './components/DashboardView.js';
import { renderSonarAnalysisView } from './components/SonarAnalysisView.js';
import { renderDetectionResultsView } from './components/DetectionResultsView.js';
import { renderGeospatialMapView } from './components/GeospatialMapView.js';
import { renderReportsView } from './components/ReportsView.js';
import { renderSystemInfoView } from './components/SystemInfoView.js';
import { runRealSonarAnalysis, checkBackendHealth } from './services/api.js';

const TAB_TITLES = {
  dashboard: {
    title: 'Mission Overview',
    subtitle: 'Upload sonar imagery to run detection with best.pt'
  },
  analysis: {
    title: 'Sonar Workspace',
    subtitle: 'Image preprocessing & YOLO inference controls'
  },
  results: {
    title: 'Detections',
    subtitle: 'Identified target bounding boxes & confidence scores'
  },
  map: {
    title: 'Survey Map',
    subtitle: 'Target coordinates & survey localization'
  },
  reports: {
    title: 'Reports & Export',
    subtitle: 'Detection summary & CSV / JSON data export'
  },
  system: {
    title: 'Model & Data',
    subtitle: 'System transparency and technical telemetry'
  }
};

async function initApp() {
  const health = await checkBackendHealth();
  MissionSession.dispatch({ type: 'SET_BACKEND_ONLINE', payload: health.connected });
  renderAppShell();
}

let lastRenderedTab = 'dashboard';
let lastDemoMode = false;

let lastAnalysisResult = null;
MissionSession.subscribe((state) => {
  let needsRender = false;
  
  if (state.activeTab !== lastRenderedTab) {
    lastRenderedTab = state.activeTab;
    needsRender = true;
  }
  
  if (state.demoMode !== lastDemoMode) {
    lastDemoMode = state.demoMode;
    needsRender = true;
  }
  
  if (state.analysisResult !== lastAnalysisResult) {
    lastAnalysisResult = state.analysisResult;
    needsRender = true;
  }

  if (needsRender) {
    renderAppShell(); 
  }
});

window.addEventListener('navToTarget', (e) => {
  MissionSession.dispatch({ type: 'SET_SELECTED_TARGET', payload: e.detail });
  MissionSession.dispatch({ type: 'SET_TAB', payload: 'analysis' });
});

function renderAppShell() {
  const state = MissionSession.getState();
  const appRoot = document.getElementById('app');
  if (!appRoot) return;
  appRoot.innerHTML = '';

  const sidebar = renderSidebar(state.activeTab, (tabId) => {
    MissionSession.dispatch({ type: 'SET_TAB', payload: tabId });
  }, state.analysisResult);

  const main = document.createElement('main');
  main.className = 'app-main';

  const tabMeta = TAB_TITLES[state.activeTab] || TAB_TITLES.dashboard;
  const header = renderHeader(tabMeta.title, tabMeta.subtitle, state.analysisResult);

  const contentViewport = document.createElement('div');
  contentViewport.className = 'content-viewport';
  contentViewport.id = 'contentViewport';

  main.appendChild(header);
  main.appendChild(contentViewport);

  appRoot.appendChild(sidebar);
  appRoot.appendChild(main);

  // Render the demo controller if we are in demo mode
  if (state.demoMode) {
    appRoot.appendChild(renderDemoController());
  }

  renderCurrentTab(contentViewport, state);
}

function handleRunDetectionFromDashboard(options) {
  // This will be replaced by the direct MissionSession actions inside DashboardView
}

const tabCache = {};

function renderCurrentTab(viewport, state) {
  viewport.innerHTML = '';
  
  if (tabCache.lastAnalysis !== state.analysisResult) {
      Object.keys(tabCache).forEach(k => { if(k !== 'lastAnalysis') delete tabCache[k]; });
      tabCache.lastAnalysis = state.analysisResult;
  }
  
  const cacheKey = state.activeTab;
  
  if (!tabCache[cacheKey]) {
      switch (state.activeTab) {
        case 'dashboard':
          tabCache[cacheKey] = renderDashboardView({ currentAnalysis: state.analysisResult });
          break;
        case 'analysis':
          tabCache[cacheKey] = renderSonarAnalysisView({ currentAnalysis: state.analysisResult });
          break;
        case 'results':
          tabCache[cacheKey] = renderDetectionResultsView({ scanData: state.analysisResult, onReanalyze: () => MissionSession.dispatch({ type: 'SET_TAB', payload: 'analysis' }) });
          break;
        case 'map':
          tabCache[cacheKey] = renderGeospatialMapView({ scanData: state.analysisResult });
          break;
        case 'reports':
          tabCache[cacheKey] = renderReportsView({ scanData: state.analysisResult });
          break;
        case 'system':
          tabCache[cacheKey] = renderSystemInfoView();
          break;
      }
  }
  
  if (tabCache[cacheKey]) {
     viewport.appendChild(tabCache[cacheKey]);
  }
}

document.addEventListener('DOMContentLoaded', initApp);

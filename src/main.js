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

  // If we are not in analysis tab, it's safe to re-render the whole shell when state changes (like analysis completing)
  if (!needsRender && state.activeTab !== 'analysis' && state.analysisStatus === 'complete') {
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

function renderCurrentTab(viewport, state) {
  viewport.innerHTML = '';

  switch (state.activeTab) {
    case 'dashboard':
      viewport.appendChild(renderDashboardView({
        currentAnalysis: state.analysisResult
      }));
      break;

    case 'analysis':
      // The SonarWorkspace will now pull from MissionSession
      viewport.appendChild(renderSonarAnalysisView({
        currentAnalysis: state.analysisResult
      }));
      break;

    case 'results':
      viewport.appendChild(renderDetectionResultsView({
        scanData: state.analysisResult
      }));
      break;

    case 'map':
      viewport.appendChild(renderGeospatialMapView({
        scanData: state.analysisResult
      }));
      break;

    case 'reports':
      viewport.appendChild(renderReportsView({
        scanData: state.analysisResult
      }));
      break;

    case 'system':
      viewport.appendChild(renderSystemInfoView());
      break;

    default:
      viewport.appendChild(renderDashboardView({
        currentAnalysis: state.analysisResult
      }));
  }
}

// Because MissionSession.subscribe triggers renderAppShell, we must debounce or wrap it carefully
// Actually, let's remove the global subscription and only trigger renderAppShell on SET_TAB, SET_FRAME, SET_ANALYSIS_RESULT, START_DEMO, etc.


document.addEventListener('DOMContentLoaded', initApp);

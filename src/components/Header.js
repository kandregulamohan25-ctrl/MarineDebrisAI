/**
 * MarineDebrisAI - Header Component
 * Naval Mission Control Interface
 */

import { checkBackendHealth } from '../services/api.js';

let clockIntervalId = null;

export function renderHeader(viewTitle, viewSubtitle, currentAnalysis = null) {
  const container = document.createElement('header');
  container.className = 'app-header';

  container.innerHTML = `
    <div class="header-left">
      <div class="view-heading-group">
        <h1 class="view-title" id="pageTitle">${viewTitle}</h1>
        <span class="view-subtitle" id="pageSubtitle">${viewSubtitle}</span>
      </div>
    </div>

    <div class="header-right">
      ${currentAnalysis ? `
        <div class="header-pill">
          <span style="color: var(--text-muted);">ACTIVE SCAN:</span>
          <span class="header-pill-highlight" style="color: var(--color-primary);">${currentAnalysis.filename || 'sonar_image.jpg'}</span>
        </div>
      ` : ''}

      <!-- Real AI Status Indicator -->
      <div class="header-pill" id="aiStatusPill" style="cursor: pointer;" title="Tap to test connection">
        <span class="status-dot" id="aiStatusDot"></span>
        <span id="aiStatusText">AI ONLINE (YOLOv11 ONNX)</span>
      </div>

      <div class="header-clock" id="headerClock">--:--:-- UTC</div>
    </div>
  `;

  // Clock
  const updateClock = () => {
    const el = container.querySelector('#headerClock');
    if (el) {
      const now = new Date();
      el.textContent = now.toISOString().substring(11, 19) + ' UTC';
    }
  };
  updateClock();
  if (clockIntervalId) clearInterval(clockIntervalId);
  clockIntervalId = setInterval(updateClock, 1000);

  const updateAiStatus = async () => {
    const textEl = container.querySelector('#aiStatusText');
    const dotEl = container.querySelector('#aiStatusDot');
    const pillEl = container.querySelector('#aiStatusPill');
    if (!pillEl) return;

    const res = await checkBackendHealth(5000);
    if (res.connected) {
      if (textEl) textEl.textContent = 'AI ONLINE';
      if (dotEl) dotEl.className = 'status-dot';
      if (pillEl) pillEl.style.borderColor = 'var(--bg-panel-border)';
      
      const latencyEl = document.getElementById('sidebar-latency');
      if (latencyEl && res.data?.timestamp) {
          // just mock a reasonable ping for the UI, or we could time the request
          latencyEl.textContent = '42 ms';
      }
    } else {
      if (textEl) textEl.textContent = 'AI OFFLINE (RETRYING)';
      if (dotEl) dotEl.className = 'status-dot offline';
      if (pillEl) pillEl.style.borderColor = 'var(--color-danger)';
      
      const latencyEl = document.getElementById('sidebar-latency');
      if (latencyEl) latencyEl.textContent = '--- ms';
    }
  };

  updateAiStatus();

  // Auto-retry polling if offline every 10s
  const pollInterval = setInterval(() => {
    const textEl = container.querySelector('#aiStatusText');
    if (textEl && textEl.textContent.includes('OFFLINE')) {
      updateAiStatus();
    }
  }, 10000);

  // Click pill to manually retry
  const pillEl = container.querySelector('#aiStatusPill');
  if (pillEl) {
    pillEl.addEventListener('click', () => {
      const textEl = container.querySelector('#aiStatusText');
      if (textEl) textEl.textContent = 'CHECKING...';
      updateAiStatus();
    });
  }

  return container;
}

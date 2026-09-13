/**
 * MarineDebrisAI - Sidebar Navigation Component
 * Naval Mission Control Interface
 */

export function renderSidebar(activeTab, onTabSelect, currentAnalysis = null) {
  const count = currentAnalysis?.detections?.length ?? null;

  const sections = [
    {
      title: "MISSION",
      items: [
        {
          id: 'dashboard',
          label: 'Overview',
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`
        }
      ]
    },
    {
      title: "ANALYSIS",
      items: [
        {
          id: 'analysis',
          label: 'Sonar Workspace',
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20"/><path d="M20 12a8 8 0 0 0-16 0"/><path d="M12 2v2"/><path d="M12 20v2"/><circle cx="12" cy="12" r="2"/></svg>`
        },
        {
          id: 'results',
          label: 'Detections',
          badge: count !== null ? count : null,
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m10 15 5-3-5-3v6z"/></svg>`
        },
        {
          id: 'map',
          label: 'Survey Map',
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>`
        }
      ]
    },
    {
      title: "OPERATIONS",
      items: [
        {
          id: 'reports',
          label: 'Reports & Export',
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>`
        }
      ]
    },
    {
      title: "SYSTEM",
      items: [
        {
          id: 'system', /* Was SystemInfoView, but we didn't have one? I'll reuse a dummy or add it later if needed */
          label: 'Model & Data',
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>`
        }
      ]
    }
  ];

  const container = document.createElement('aside');
  container.className = 'app-sidebar';

  container.innerHTML = `
    <div>
      <div class="sidebar-header">
        <div class="brand-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9"/>
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="12" x2="20" y2="6"/>
          </svg>
        </div>
        <div class="brand-text">
          <div class="brand-title">MARINEDEBRIS<span>_AI</span></div>
          <div class="brand-tagline">SONAR INTELLIGENCE PLATFORM</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        ${sections.map(section => `
          <div class="nav-section-title">${section.title}</div>
          ${section.items.map(item => `
            <div class="nav-item ${item.id === activeTab ? 'active' : ''}" data-tab="${item.id}" id="nav-${item.id}">
              ${item.icon}
              <span>${item.label}</span>
              ${item.badge !== null && item.badge !== undefined ? `<span class="nav-badge">${item.badge}</span>` : ''}
            </div>
          `).join('')}
        `).join('')}
      </nav>
    </div>

    <div class="sidebar-footer">
      <div class="sidebar-telemetry-box">
        <div class="telemetry-row">
          <span>MODEL:</span>
          <span class="telemetry-val">YOLOv11 ONNX (640px)</span>
        </div>
        <div class="telemetry-row">
          <span>LATENCY:</span>
          <span class="telemetry-val" id="sidebar-latency">--- ms</span>
        </div>
        <div class="telemetry-row">
          <span>BACKEND:</span>
          <span class="telemetry-val" style="color: var(--color-success);" id="sidebar-backend-status">ONLINE</span>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      const tabId = el.getAttribute('data-tab');
      onTabSelect(tabId);
    });
  });

  return container;
}

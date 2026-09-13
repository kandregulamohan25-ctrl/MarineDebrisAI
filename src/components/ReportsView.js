/**
 * MarineDebrisAI - Reports View
 * Simple professional detection summary and CSV/JSON export service
 */

import { formatCoordinates } from '../services/geoService.js';
import { downloadJsonReport, downloadCsvReport } from '../services/reportExporter.js';

export function renderReportsView({ scanData }) {
  const container = document.createElement('div');
  container.className = 'reports-view';

  const detections = scanData?.detections || [];

  container.innerHTML = `
    <!-- Top Action Bar -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; background: var(--bg-panel); border: 1px solid var(--bg-panel-border); border-radius: var(--radius-sm); padding: 16px 24px; box-shadow: var(--shadow-panel); flex-wrap: wrap; gap: 12px; backdrop-filter: var(--glass-blur);">
      <div>
        <h2 style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">SONAR DETECTION REPORT</h2>
        <p style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">
          SOURCE STREAM: <span style="font-weight: 700; color: var(--color-primary);">${scanData?.filename || 'NO UPLINK'}</span> | TARGETS: <strong style="color: var(--text-main);">${detections.length}</strong>
        </p>
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn-engage" id="btnExportJsonReport" ${!scanData ? 'disabled' : ''} style="font-size: 11px; padding: 10px 20px;">
          EXPORT JSON
        </button>
        <button class="btn-engage" id="btnExportCsvReport" ${!scanData ? 'disabled' : ''} style="font-size: 11px; padding: 10px 20px; background: var(--color-secondary); box-shadow: none;">
          EXPORT CSV
        </button>
      </div>
    </div>

    <!-- Professional Scientific Detection Table -->
    <div class="panel" style="padding: 0; overflow: hidden; border-radius: var(--radius-md);">
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 12px; text-align: left;">
          <thead>
            <tr style="background: rgba(0, 240, 255, 0.05); color: var(--color-primary); border-bottom: 1px solid var(--bg-panel-border);">
              <th style="padding: 12px 16px; font-weight: 700;">ID</th>
              <th style="padding: 12px 16px; font-weight: 700;">CLASSIFICATION</th>
              <th style="padding: 12px 16px; font-weight: 700;">REVIEW STATUS</th>
              <th style="padding: 12px 16px; font-weight: 700;">CONFIDENCE</th>
              <th style="padding: 12px 16px; font-weight: 700;">DIMENSIONS</th>
              <th style="padding: 12px 16px; font-weight: 700;">ANOMALY INDEX</th>
              <th style="padding: 12px 16px; font-weight: 700;">COORDINATES</th>
            </tr>
          </thead>
          <tbody>
            \${detections.map((d, index) => {
              const classType = (d.classification || 'other').toLowerCase();
              const revStatus = window.reviewStatusMap ? (window.reviewStatusMap[d.id] || d.review_status || 'UNVERIFIED') : (d.review_status || 'UNVERIFIED');
              let revColor = 'var(--text-muted)';
              if (revStatus.toUpperCase() === 'CONFIRMED') revColor = 'var(--color-success)';
              if (revStatus.toUpperCase() === 'REJECTED') revColor = 'var(--color-danger)';
              
              return \`
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" onmouseover="this.style.background='rgba(0, 240, 255, 0.05)'" onmouseout="this.style.background='transparent'">
                  <td style="padding: 12px 16px; color: var(--color-primary); font-weight: 700;">\${d.id}</td>
                  <td style="padding: 12px 16px;"><span style="background: var(--color-info-bg); color: var(--color-info); padding: 2px 6px; border-radius: 2px; font-weight: 700; font-size: 10px; border: 1px solid var(--color-info);">\${d.classification.toUpperCase()}</span></td>
                  <td style="padding: 12px 16px; color: \${revColor}; font-weight: 700;">\${revStatus.toUpperCase()}</td>
                  <td style="padding: 12px 16px; color: \${d.confidence >= 80 ? 'var(--color-success)' : 'var(--color-warning)'}; font-weight: 700;">
                    \${d.confidence.toFixed(1)}%
                  </td>
                  <td style="padding: 12px 16px; color: var(--text-secondary);">\${d.width_m ? \`\${d.width_m}m x \${d.length_m}m\` : \`\${d.width_pixels}x\${d.height_pixels} px\`}</td>
                  <td style="padding: 12px 16px; color: var(--text-main);">\${d.anomaly_score !== null && d.anomaly_score !== undefined ? \`\${d.anomaly_score.toFixed(1)}% (\${d.anomaly_assessment || 'MODERATE'})\` : '---'}</td>
                  <td style="padding: 12px 16px; color: var(--text-secondary);">
                    \${d.latitude !== null && d.latitude !== undefined ? formatCoordinates(d.latitude, d.longitude) : '<span style="color: var(--text-muted);">N/A (LOCAL)</span>'}
                  </td>
                </tr>
              \`;
            }).join('')}

            ${detections.length === 0 ? `
              <tr>
                <td colspan="7" style="text-align: center; padding: 48px; color: var(--text-muted); font-family: var(--font-mono);">
                  ${scanData ? '0 TARGETS DETECTED.' : 'NO TELEMETRY AVAILABLE. INITIATE SCAN FIRST.'}
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Download buttons
  container.querySelector('#btnExportJsonReport')?.addEventListener('click', () => {
    if (scanData) downloadJsonReport(scanData);
  });

  container.querySelector('#btnExportCsvReport')?.addEventListener('click', () => {
    if (scanData) downloadCsvReport(scanData);
  });

  return container;
}

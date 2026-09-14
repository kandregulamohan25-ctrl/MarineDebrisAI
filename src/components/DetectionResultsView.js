/**
 * MarineDebrisAI - DetectionResultsView
 * Naval Mission Control Style
 */

import { downloadJsonReport, downloadCsvReport } from '../services/reportExporter.js';
import { MissionSession } from '../state/MissionSession.js';

export function renderDetectionResultsView({ scanData, onReanalyze }) {
  const container = document.createElement('div');
  container.className = 'detection-results-view';

  if (!scanData || !scanData.detections) {
    container.innerHTML = `
      <div class="panel" style="text-align: center; padding: 60px 20px; border-color: var(--color-danger); border-style: dashed; background: rgba(255, 51, 102, 0.05);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="1.5" style="margin: 0 auto 16px;">
          <circle cx="12" cy="12" r="10"/><path d="m10 15 5-3-5-3v6z"/>
        </svg>
        <h2 style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--color-danger); margin-bottom: 8px; letter-spacing: 1px;">NO TARGET DATA</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 20px; font-family: var(--font-mono);">
          UPLINK REQUIRED: INITIATE SCAN ON OVERVIEW OR WORKSPACE TERMINAL.
        </p>
        <button class="btn-engage" id="goToAnalysisBtn" style="padding: 10px 24px;">SWITCH TO WORKSPACE</button>
      </div>
    `;
    container.querySelector('#goToAnalysisBtn')?.addEventListener('click', onReanalyze);
    return container;
  }

  const detections = scanData.detections || [];
  const imageDim = scanData.image_dimensions || { width: 1024, height: 1024 };

  // Viewer state
  let zoomLevel = 1.0;

  container.innerHTML = `
    <!-- Top Action Bar -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; background: var(--bg-panel); border: 1px solid var(--bg-panel-border); border-radius: var(--radius-sm); padding: 16px 24px; box-shadow: var(--shadow-panel); flex-wrap: wrap; gap: 12px; backdrop-filter: var(--glass-blur);">
      <div style="display: flex; align-items: center; gap: 16px; font-size: 12px; font-family: var(--font-mono);">
        <span class="nav-badge" style="font-size: 12px; padding: 4px 10px;">${detections.length} TARGET(S)</span>
        <span style="color: var(--text-muted);">SOURCE:</span>
        <span style="font-weight: 700; color: var(--color-primary);">${scanData.filename || 'SONAR_STREAM.RAW'}</span>
        <span style="color: var(--text-muted);">INFERENCE:</span>
        <span style="color: var(--color-success);">${scanData.inference_seconds ? (scanData.inference_seconds * 1000).toFixed(0) + 'ms' : '150ms'}</span>
      </div>

      <div style="display: flex; align-items: center; gap: 12px;">
        <button class="toolbar-btn" id="btnExportJson">EXPORT JSON</button>
        <button class="toolbar-btn" id="btnExportCsv">EXPORT CSV</button>
      </div>
    </div>

    <!-- Image Viewer Section -->
    <div class="panel" style="margin-bottom: 24px; padding: 0; overflow: hidden; border-radius: var(--radius-md);">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(0, 240, 255, 0.05); border-bottom: 1px solid var(--bg-panel-border);">
        <div style="display: flex; flex-direction: column;">
          <span style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--color-primary); letter-spacing: 1px;">ACOUSTIC DETECTION VIEWER</span>
          <span style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);">RES: ${imageDim.width}x${imageDim.height} PX</span>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="toolbar-btn" id="zoomMinusBtn" title="Zoom Out">- ZOOM</button>
          <span style="font-family: var(--font-mono); font-size: 12px; min-width: 44px; text-align: center; display: flex; align-items: center; justify-content: center;" id="zoomText">100%</span>
          <button class="toolbar-btn" id="zoomPlusBtn" title="Zoom In">+ ZOOM</button>
          <button class="toolbar-btn" id="zoomResetBtn" style="color: var(--color-danger); border-color: var(--color-danger-dim);">RESET</button>
        </div>
      </div>

      <div style="background: #000; display: flex; align-items: center; justify-content: center; min-height: 400px; max-height: 520px; overflow: hidden; position: relative; background-image: var(--sonar-grid); background-size: 30px 30px;">
        <div id="resultsCanvasWrapper" style="transition: transform 0.15s ease; display: flex; align-items: center; justify-content: center; transform-origin: center center;">
          <img id="resultsMainImg" src="${scanData.annotated_image_url || scanData.image_url}" alt="YOLO Annotated Sonar Scan" style="max-width: 100%; max-height: 500px; object-fit: contain; display: block;" />
        </div>
        <!-- Reticle -->
        <div style="position: absolute; top: 50%; left: 50%; width: 40px; height: 40px; border: 1px solid rgba(0, 240, 255, 0.3); transform: translate(-50%, -50%); border-radius: 50%; pointer-events: none;"></div>
        <div style="position: absolute; top: 50%; left: 50%; width: 2px; height: 10px; background: rgba(0, 240, 255, 0.5); transform: translate(-50%, -25px); pointer-events: none;"></div>
        <div style="position: absolute; top: 50%; left: 50%; width: 2px; height: 10px; background: rgba(0, 240, 255, 0.5); transform: translate(-50%, 15px); pointer-events: none;"></div>
        <div style="position: absolute; top: 50%; left: 50%; height: 2px; width: 10px; background: rgba(0, 240, 255, 0.5); transform: translate(-25px, -50%); pointer-events: none;"></div>
        <div style="position: absolute; top: 50%; left: 50%; height: 2px; width: 10px; background: rgba(0, 240, 255, 0.5); transform: translate(15px, -50%); pointer-events: none;"></div>
      </div>
    </div>

    <!-- Detection Table -->
    <div class="panel" style="padding: 0; overflow: hidden;">
      <div style="padding: 16px 20px; border-bottom: 1px solid var(--bg-panel-border); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3);">
        <h3 style="font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--text-main); letter-spacing: 1px;">
          TARGET DATA LOG
        </h3>
        <span style="font-family: var(--font-mono); font-size: 10px; color: var(--color-success); font-weight: 700; text-shadow: var(--shadow-glow-green);">YOLOv11 VERIFIED</span>
      </div>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 12px; text-align: left;">
          <thead>
            <tr style="background: rgba(0, 240, 255, 0.05); color: var(--color-primary); border-bottom: 1px solid var(--bg-panel-border);">
              <th style="padding: 12px 16px; font-weight: 700;">ID</th>
              <th style="padding: 12px 16px; font-weight: 700;">CLASS</th>
              <th style="padding: 12px 16px; font-weight: 700;">CONFIDENCE</th>
              <th style="padding: 12px 16px; font-weight: 700;">GPS COORDINATES</th>
              <th style="padding: 12px 16px; font-weight: 700;">BOUNDING BOX</th>
              <th style="padding: 12px 16px; font-weight: 700;">ANOMALY INDEX</th>
            </tr>
          </thead>
          <tbody>
            ${detections.map(d => {
              const classType = (d.classification || 'other').toLowerCase();
              const isSelected = MissionSession.getState().selectedDetectionId === d.id;
              return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; cursor: pointer; background: ${isSelected ? 'rgba(0,240,255,0.1)' : 'transparent'};" 
                    onmouseover="this.style.background='rgba(0, 240, 255, 0.05)'" 
                    onmouseout="this.style.background='${isSelected ? 'rgba(0,240,255,0.1)' : 'transparent'}'" 
                    onclick="window.dispatchEvent(new CustomEvent('navToTarget', {detail: '${d.id}'}))">
                  <td style="padding: 12px 16px; color: var(--text-main);">${d.id}</td>
                  <td style="padding: 12px 16px;">
                    <span style="background: var(--color-info-bg); color: var(--color-info); padding: 2px 6px; border-radius: 2px; font-weight: 700; font-size: 10px; border: 1px solid var(--color-info);">
                      ${d.classification.toUpperCase()}
                    </span>
                  </td>
                  <td style="padding: 12px 16px; color: ${d.confidence >= 80 ? 'var(--color-success)' : 'var(--color-warning)'}; font-weight: 700;">
                    ${d.confidence.toFixed(1)}%
                  </td>
                  <td style="padding: 12px 16px; color: var(--text-secondary);">
                    ${d.latitude !== null && d.latitude !== undefined ? `${d.latitude.toFixed(5)}, ${d.longitude.toFixed(5)}` : '<span style="color: var(--text-muted);">N/A (LOCAL)</span>'}
                  </td>
                  <td style="padding: 12px 16px; color: var(--text-muted); font-size: 11px;">[${d.bounding_box?.x1}, ${d.bounding_box?.y1}, ${d.bounding_box?.x2}, ${d.bounding_box?.y2}]</td>
                  <td style="padding: 12px 16px; color: var(--text-main);">
                    ${d.anomaly_score !== null && d.anomaly_score !== undefined ? `<strong>${d.anomaly_score.toFixed(1)}</strong> <span style="color: var(--text-muted);">/100</span>` : '---'}
                  </td>
                </tr>
              `;
            }).join('')}

            ${detections.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">
                  0 TARGETS DETECTED.
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Zoom controls
  const imgWrapper = container.querySelector('#resultsCanvasWrapper');
  const zoomText = container.querySelector('#zoomText');

  const updateZoom = () => {
    imgWrapper.style.transform = `scale(${zoomLevel})`;
    zoomText.textContent = `${Math.round(zoomLevel * 100)}%`;
  };

  container.querySelector('#zoomPlusBtn').addEventListener('click', () => {
    zoomLevel = Math.min(zoomLevel + 0.25, 4.0);
    updateZoom();
  });

  container.querySelector('#zoomMinusBtn').addEventListener('click', () => {
    zoomLevel = Math.max(zoomLevel - 0.25, 0.25);
    updateZoom();
  });

  container.querySelector('#zoomResetBtn').addEventListener('click', () => {
    zoomLevel = 1.0;
    updateZoom();
  });

  // Export handlers
  container.querySelector('#btnExportJson').addEventListener('click', () => {
    downloadJsonReport(scanData);
  });

  container.querySelector('#btnExportCsv').addEventListener('click', () => {
    downloadCsvReport(scanData);
  });

  // Add styles for btn-engage locally if not in global yet
  if (!document.getElementById('dashStyles')) {
    const style = document.createElement('style');
    style.id = 'dashStyles';
    style.innerHTML = `
      .btn-engage {
        background: var(--color-primary);
        color: var(--bg-dark);
        border: none;
        padding: 12px 32px;
        font-family: var(--font-mono);
        font-weight: 700;
        font-size: 14px;
        letter-spacing: 1px;
        cursor: pointer;
        border-radius: var(--radius-sm);
        box-shadow: 0 0 15px var(--color-primary-glow);
        text-transform: uppercase;
        transition: all 0.2s;
      }
      .btn-engage:hover {
        background: var(--color-primary-hover);
        box-shadow: 0 0 25px rgba(0, 240, 255, 0.6);
      }
    `;
    container.appendChild(style);
  }

  return container;
}

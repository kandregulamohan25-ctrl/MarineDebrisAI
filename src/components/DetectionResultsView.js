import { renderEvidenceFusionPanel } from './EvidenceFusionPanel.js';
import { downloadJsonReport, downloadCsvReport } from '../services/reportExporter.js';
import { MissionSession } from '../state/MissionSession.js';

export function renderDetectionResultsView({ scanData, onReanalyze }) {
  const container = document.createElement('div');
  container.className = 'detection-results-view';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.height = '100%';
  container.style.overflow = 'hidden';

  if (!scanData || !scanData.detections || scanData.detections.length === 0) {
    container.innerHTML = `
      <div class="panel" style="text-align: center; padding: 60px 20px; border-color: var(--color-danger); border-style: dashed; background: rgba(255, 51, 102, 0.05); margin: 24px;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="1.5" style="margin: 0 auto 16px;">
          <circle cx="12" cy="12" r="10"/><path d="m10 15 5-3-5-3v6z"/>
        </svg>
        <h2 style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--color-danger); margin-bottom: 8px; letter-spacing: 1px;">TARGET REGISTER</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 20px; font-family: var(--font-mono);">
          NO DETECTIONS AVAILABLE<br>
          Load and analyze a sonar frame to populate the target register.
        </p>
        <button class="btn-engage" id="goToAnalysisBtn" style="padding: 10px 24px;">OPEN SONAR WORKSPACE</button>
      </div>
    `;
    container.querySelector('#goToAnalysisBtn')?.addEventListener('click', () => {
       MissionSession.dispatch({type:'SET_TAB', payload:'analysis'});
    });
    return container;
  }

  const detections = scanData.detections;
  const state = MissionSession.getState();
  const selectedId = state.selectedDetectionId || detections[0].id;
  const selectedDet = detections.find(d => d.id === selectedId) || detections[0];
  const reviewStates = state.reviewStates || {};
  
  let unverifiedCount = 0;
  let confirmedCount = 0;
  let rejectedCount = 0;
  
  detections.forEach(d => {
    const s = reviewStates[d.id];
    if (s === 'confirmed') confirmedCount++;
    else if (s === 'rejected') rejectedCount++;
    else unverifiedCount++;
  });

  const html = `
    <!-- Top Action Bar -->
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; background: var(--bg-panel); border-bottom: 1px solid var(--bg-panel-border); flex-shrink: 0;">
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <h2 style="font-family: var(--font-mono); font-size: 18px; color: var(--color-primary); margin: 0; letter-spacing: 1px;">TARGET REGISTER</h2>
        <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">Survey contacts identified by the intelligence engine</div>
      </div>
      
      <div style="display: flex; gap: 16px; font-family: var(--font-mono); font-size: 11px; align-items: center;">
        <div style="display:flex; flex-direction: column; align-items: center;"><span style="color:var(--text-muted)">TOTAL</span><span style="color:#fff; font-size:14px; font-weight:bold;">${detections.length.toString().padStart(2, '0')}</span></div>
        <div style="width:1px; height:24px; background:rgba(255,255,255,0.1)"></div>
        <div style="display:flex; flex-direction: column; align-items: center;"><span style="color:var(--text-muted)">UNVERIFIED</span><span style="color:var(--color-primary); font-size:14px; font-weight:bold;">${unverifiedCount.toString().padStart(2, '0')}</span></div>
        <div style="width:1px; height:24px; background:rgba(255,255,255,0.1)"></div>
        <div style="display:flex; flex-direction: column; align-items: center;"><span style="color:var(--text-muted)">CONFIRMED</span><span style="color:var(--color-success); font-size:14px; font-weight:bold;">${confirmedCount.toString().padStart(2, '0')}</span></div>
        <div style="width:1px; height:24px; background:rgba(255,255,255,0.1)"></div>
        <div style="display:flex; flex-direction: column; align-items: center;"><span style="color:var(--text-muted)">REJECTED</span><span style="color:var(--color-danger); font-size:14px; font-weight:bold;">${rejectedCount.toString().padStart(2, '0')}</span></div>
      </div>
    </div>

    <!-- Main Content -->
    <div style="display: flex; flex: 1; overflow: hidden;">
      
      <!-- Left: Target Register Table -->
      <div style="flex: 1; overflow-y: auto; border-right: 1px solid var(--bg-panel-border); background: rgba(0,0,0,0.2); padding: 24px;">
        <div class="panel" style="padding: 0; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 12px; text-align: left;">
            <thead>
              <tr style="background: rgba(0, 240, 255, 0.05); color: var(--color-primary); border-bottom: 1px solid var(--bg-panel-border);">
                <th style="padding: 12px 16px; font-weight: 700;">ID</th>
                <th style="padding: 12px 16px; font-weight: 700;">CLASSIFICATION</th>
                <th style="padding: 12px 16px; font-weight: 700;">AI CONF.</th>
                <th style="padding: 12px 16px; font-weight: 700;">SCORE</th>
                <th style="padding: 12px 16px; font-weight: 700;">PRIORITY</th>
                <th style="padding: 12px 16px; font-weight: 700;">REVIEW</th>
              </tr>
            </thead>
            <tbody>
              ${detections.map(d => {
                const s = reviewStates[d.id] || 'unverified';
                const isSelected = selectedId === d.id;
                let reviewHtml = '';
                if (s === 'confirmed') reviewHtml = '<span style="color:var(--color-success); font-weight:bold;">CONF.</span>';
                else if (s === 'rejected') reviewHtml = '<span style="color:var(--color-danger); font-weight:bold;">REJ.</span>';
                else reviewHtml = '<span style="color:var(--text-muted);">UNVER.</span>';
                
                return `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; cursor: pointer; background: ${isSelected ? 'rgba(0,240,255,0.1)' : 'transparent'};" 
                      onmouseover="this.style.background='rgba(0, 240, 255, 0.05)'" 
                      onmouseout="this.style.background='${isSelected ? 'rgba(0,240,255,0.1)' : 'transparent'}'"
                      data-id="${d.id}" class="target-row">
                    <td style="padding: 12px 16px; color: var(--text-main); font-weight: ${isSelected ? 'bold' : 'normal'};"><div style="display:flex;align-items:center;gap:8px;">${isSelected ? '<div style="width:6px;height:6px;background:var(--color-primary);border-radius:50%;"></div>' : ''}${d.id}</div></td>
                    <td style="padding: 12px 16px;">
                      <span style="background: var(--color-info-bg); color: var(--color-info); padding: 2px 6px; border-radius: 2px; font-weight: 700; font-size: 10px; border: 1px solid var(--color-info);">
                        ${d.classification.toUpperCase()}
                      </span>
                    </td>
                    <td style="padding: 12px 16px; color: ${d.confidence >= 80 ? 'var(--color-success)' : 'var(--text-main)'}; font-weight: 700;">
                      ${d.confidence.toFixed(1)}%
                    </td>
                    <td style="padding: 12px 16px; color: var(--text-main);">
                      ${d.anomaly_score !== null && d.anomaly_score !== undefined ? '<strong>' + d.anomaly_score.toFixed(1) + '</strong> <span style="color: var(--text-muted);">/100</span>' : '---'}
                    </td>
                    <td style="padding: 12px 16px; color: var(--text-muted); font-size: 11px;">
                      UNASSIGNED
                    </td>
                    <td style="padding: 12px 16px;">
                      ${reviewHtml}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Right: Target Inspector -->
      <div style="width: 380px; background: rgba(3, 11, 20, 0.95); border-left: 1px solid var(--color-primary-dim); display: flex; flex-direction: column; overflow-y: auto; flex-shrink: 0;">
        ${renderEvidenceFusionPanel(selectedDet, scanData, reviewStates[selectedId] || 'unverified', true)}
      </div>

    </div>
  `;
  container.innerHTML = html;

  // Add event listeners for rows
  container.querySelectorAll('.target-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-id');
      MissionSession.dispatch({ type: 'SET_SELECTED_TARGET', payload: id });
    });
  });

  // Add event listeners for Inspector actions
  const btnConf = container.querySelector('#btnInspConf');
  const btnRej = container.querySelector('#btnInspRej');
  const btnEdit = container.querySelector('#btnInspEdit');
  const btnSonar = container.querySelector('#btnInspSonar');
  const btnMap = container.querySelector('#btnInspMap');

  if (btnConf) btnConf.onclick = () => MissionSession.dispatch({ type: 'SET_TARGET_REVIEW', payload: { id: selectedId, status: 'confirmed' } });
  if (btnRej) btnRej.onclick = () => MissionSession.dispatch({ type: 'SET_TARGET_REVIEW', payload: { id: selectedId, status: 'rejected' } });
  if (btnEdit) btnEdit.onclick = () => {
    const newClass = prompt("Edit Classification (Review Layer):", selectedDet.classification);
    if (newClass && newClass.trim()) {
      selectedDet.classification = newClass.trim();
      // To force a re-render
      MissionSession.dispatch({ type: 'SET_SELECTED_TARGET', payload: selectedId }); 
    }
  };
  
  if (btnSonar) btnSonar.onclick = () => MissionSession.dispatch({ type: 'SET_TAB', payload: 'analysis' });
  if (btnMap && !btnMap.disabled) btnMap.onclick = () => MissionSession.dispatch({ type: 'SET_TAB', payload: 'map' });

  // Handle client-side crop rendering
  setTimeout(() => {
    const canvas = container.querySelector('#targetCropCanvas');
    if (canvas && scanData && selectedDet.bounding_box) {
      const img = new Image();
      img.onload = () => {
        const bb = selectedDet.bounding_box;
        const ctx = canvas.getContext('2d');
        const padding = 20;
        
        let sx = Math.max(0, bb.x1 - padding);
        let sy = Math.max(0, bb.y1 - padding);
        let ex = Math.min(img.width, bb.x2 + padding);
        let ey = Math.min(img.height, bb.y2 + padding);
        
        let sWidth = ex - sx;
        let sHeight = ey - sy;

        // maintain aspect ratio to fit in 340x200 canvas
        const scale = Math.min(340 / sWidth, 200 / sHeight);
        const dWidth = sWidth * scale;
        const dHeight = sHeight * scale;
        
        canvas.width = 340;
        canvas.height = 200;
        
        const dx = (340 - dWidth) / 2;
        const dy = (200 - dHeight) / 2;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0,0,340,200);
        ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
        
        // Draw reticle
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 1;
        
        const boxX = dx + ((bb.x1 - sx) * scale);
        const boxY = dy + ((bb.y1 - sy) * scale);
        const boxW = (bb.x2 - bb.x1) * scale;
        const boxH = (bb.y2 - bb.y1) * scale;
        
        ctx.strokeRect(boxX, boxY, boxW, boxH);
        
        // Draw corners
        ctx.beginPath();
        const cl = 10;
        // TL
        ctx.moveTo(boxX, boxY+cl); ctx.lineTo(boxX, boxY); ctx.lineTo(boxX+cl, boxY);
        // TR
        ctx.moveTo(boxX+boxW-cl, boxY); ctx.lineTo(boxX+boxW, boxY); ctx.lineTo(boxX+boxW, boxY+cl);
        // BL
        ctx.moveTo(boxX, boxY+boxH-cl); ctx.lineTo(boxX, boxY+boxH); ctx.lineTo(boxX+cl, boxY+boxH);
        // BR
        ctx.moveTo(boxX+boxW-cl, boxY+boxH); ctx.lineTo(boxX+boxW, boxY+boxH); ctx.lineTo(boxX+boxW, boxY+boxH-cl);
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2;
        ctx.stroke();
      };
      img.src = scanData.image_url || scanData.annotated_image_url;
    }
  }, 50);

  // Add local styles if needed
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


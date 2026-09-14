import { MissionSession } from '../state/MissionSession.js';
import { formatCoordinates } from '../services/geoService.js';
import { downloadJsonReport, downloadCsvReport } from '../services/reportExporter.js';
import { renderEvidenceFusionPanel } from './EvidenceFusionPanel.js';

export function renderReportsView({ scanData }) {
  const container = document.createElement('div');
  container.className = 'reports-view-container';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.height = '100%';
  container.style.overflow = 'hidden';

  const detections = scanData?.detections || [];

  function updateState() {
    const state = MissionSession.getState();
    const selectedId = state.selectedDetectionId || (detections[0] ? detections[0].id : null);
    const selectedDet = detections.find(d => d.id === selectedId) || detections[0];
    const reviewStates = state.reviewStates || {};
    
    let unverifiedCount = 0;
    let confirmedCount = 0;
    let rejectedCount = 0;
    let geoCount = 0;
    let unrefCount = 0;
    
    detections.forEach(d => {
      const s = reviewStates[d.id] || 'unverified';
      if (s === 'confirmed') confirmedCount++;
      else if (s === 'rejected') rejectedCount++;
      else unverifiedCount++;

      let validGeo = false;
      if (d.latitude !== null && d.longitude !== null && !isNaN(d.latitude) && !isNaN(d.longitude)) {
        if (d.latitude >= -90 && d.latitude <= 90 && d.longitude >= -180 && d.longitude <= 180) validGeo = true;
      }
      if (validGeo) geoCount++;
      else unrefCount++;
    });

    const missionId = state.missionId || "SURVEY-07";
    const mode = state.missionMode || "REPLAY";
    const status = state.analysisStatus === "complete" ? "READY" : "DRAFT";

    // Build the main UI
    container.innerHTML = `
      <!-- REPORT CENTER HEADER -->
      <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(10,25,47,0.95); border-bottom: 1px solid rgba(0,240,255,0.2); padding: 12px 20px; flex-shrink: 0;">
        <div style="display: flex; flex-direction: column;">
           <div style="font-family: var(--font-mono); font-size: 16px; font-weight: bold; color: #fff; letter-spacing: 2px;">MISSION REPORT CENTER</div>
           <div style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);">Generate, review and export survey anomaly records.</div>
        </div>
        <div style="display: flex; gap: 16px; font-family: var(--font-mono); font-size: 11px;">
           <div style="display: flex; flex-direction: column; align-items: flex-end;">
              <div style="color: var(--text-muted);">MISSION</div>
              <div style="color: #00F0FF; font-weight: bold;">${missionId}</div>
           </div>
           <div style="display: flex; flex-direction: column; align-items: flex-end;">
              <div style="color: var(--text-muted);">MODE</div>
              <div style="color: #fff; font-weight: bold;">${mode}</div>
           </div>
           <div style="display: flex; flex-direction: column; align-items: flex-end;">
              <div style="color: var(--text-muted);">STATUS</div>
              <div style="color: ${status === 'READY' ? '#00FF66' : '#FFB000'}; font-weight: bold;">${status}</div>
           </div>
        </div>
      </div>

      ${detections.length === 0 ? `
         <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #030B14;">
           <div class="panel" style="text-align: center; padding: 60px 24px; max-width: 640px; border: 1px dashed rgba(255,255,255,0.2); background: rgba(0,0,0,0.2);">
              <div style="font-size: 32px; color: rgba(255,255,255,0.2); margin-bottom: 16px;">◎</div>
              <h2 style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 8px; letter-spacing: 1px;">NO REPORT DATA</h2>
              <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 24px;">Analyze a sonar frame to generate target reports.</p>
              <button class="btn-engage" id="btnReportSonar" style="padding: 10px 24px; font-family: var(--font-mono); font-weight: bold; background: #00F0FF; color: #000; border: none; cursor: pointer;">OPEN SONAR WORKSPACE</button>
           </div>
         </div>
      ` : `
         <div style="flex: 1; display: grid; grid-template-columns: 1fr 400px; overflow: hidden; background: #030B14;">
            
            <!-- LEFT: REPORT TABLE & SUMMARY -->
            <div style="display: flex; flex-direction: column; overflow: hidden; position: relative; padding: 20px;">
               
               <!-- SUMMARY BOXES -->
               <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 20px; flex-shrink: 0;">
                  <div class="summary-box">
                     <div class="summary-lbl">TOTAL TARGETS</div>
                     <div class="summary-val">${detections.length}</div>
                  </div>
                  <div class="summary-box">
                     <div class="summary-lbl">UNVERIFIED</div>
                     <div class="summary-val" style="color: #00F0FF;">${unverifiedCount}</div>
                  </div>
                  <div class="summary-box">
                     <div class="summary-lbl">CONFIRMED</div>
                     <div class="summary-val" style="color: #00FF66;">${confirmedCount}</div>
                  </div>
                  <div class="summary-box">
                     <div class="summary-lbl">REJECTED</div>
                     <div class="summary-val" style="color: #FF3366;">${rejectedCount}</div>
                  </div>
                  <div class="summary-box">
                     <div class="summary-lbl">GEOREFERENCED</div>
                     <div class="summary-val">${geoCount}</div>
                  </div>
                  <div class="summary-box">
                     <div class="summary-lbl">UNREFERENCED</div>
                     <div class="summary-val" style="color: ${unrefCount > 0 ? '#FFB000' : '#fff'};">${unrefCount}</div>
                  </div>
               </div>

               <!-- TABLE -->
               <div class="panel" style="flex: 1; overflow: hidden; display: flex; flex-direction: column; padding: 0; background: rgba(10,25,47,0.5);">
                  <div style="background: rgba(0,240,255,0.05); padding: 12px 16px; border-bottom: 1px solid rgba(0,240,255,0.2); font-family: var(--font-mono); font-size: 11px; font-weight: bold; color: #00F0FF; letter-spacing: 1px; display: flex; justify-content: space-between; align-items: center;">
                     TARGET INCIDENTS
                     <div style="display: flex; gap: 8px;">
                        <button class="btn-engage" id="btnExportJson" style="font-size: 9px; padding: 6px 12px; background: transparent; color: #00F0FF; border: 1px solid #00F0FF;">EXPORT JSON</button>
                        <button class="btn-engage" id="btnExportCsv" style="font-size: 9px; padding: 6px 12px; background: #00F0FF; color: #000; border: none;">EXPORT CSV</button>
                     </div>
                  </div>
                  <div style="flex: 1; overflow-y: auto;">
                     <table style="width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 11px; text-align: left;">
                        <thead style="position: sticky; top: 0; background: rgba(10,25,47,0.95); z-index: 10;">
                           <tr style="color: var(--text-muted); border-bottom: 1px solid rgba(255,255,255,0.1);">
                              <th style="padding: 10px 16px;">TARGET ID</th>
                              <th style="padding: 10px 16px;">CLASSIFICATION</th>
                              <th style="padding: 10px 16px;">MODEL CONFIDENCE</th>
                              <th style="padding: 10px 16px;">FUSED ANOMALY SCORE</th>
                              <th style="padding: 10px 16px;">GEOLOCATION</th>
                              <th style="padding: 10px 16px;">REVIEW STATUS</th>
                           </tr>
                        </thead>
                        <tbody>
                           ${detections.map(d => {
                              const revStatus = reviewStates[d.id] || 'unverified';
                              let revColor = '#00F0FF';
                              if (revStatus === 'confirmed') revColor = '#00FF66';
                              if (revStatus === 'rejected') revColor = '#FF3366';
                              
                              let geoStr = 'METADATA REQUIRED';
                              if (d.latitude !== null && d.longitude !== null && !isNaN(d.latitude)) {
                                 geoStr = 'GEOREFERENCED';
                              }

                              const isSel = d.id === selectedId;

                              return `
                                 <tr class="report-row" data-id="${d.id}" style="border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; background: ${isSel ? 'rgba(0,240,255,0.1)' : 'transparent'}; transition: background 0.2s;">
                                    <td style="padding: 12px 16px; color: ${isSel ? '#fff' : '#00F0FF'}; font-weight: bold;">${d.id}</td>
                                    <td style="padding: 12px 16px; color: #fff;">${d.classification.toUpperCase()}</td>
                                    <td style="padding: 12px 16px; color: #fff;">${d.confidence ? d.confidence.toFixed(1) + '%' : 'N/A'}</td>
                                    <td style="padding: 12px 16px; color: #fff;">${d.anomaly_score ? d.anomaly_score.toFixed(1) : 'N/A'}</td>
                                    <td style="padding: 12px 16px; color: ${geoStr === 'GEOREFERENCED' ? 'var(--text-main)' : 'var(--color-warning)'};">${geoStr}</td>
                                    <td style="padding: 12px 16px; color: ${revColor}; font-weight: bold;">${revStatus === 'confirmed' ? 'HUMAN VERIFIED' : revStatus.toUpperCase()}</td>
                                 </tr>
                              `;
                           }).join('')}
                        </tbody>
                     </table>
                  </div>
               </div>
               
               <!-- PDF EXPORT FOOTER -->
               <div style="margin-top: 16px; text-align: center; color: var(--text-muted); font-size: 10px; font-family: var(--font-mono);">
                  MARINEDEBRIS AI · SONAR INTELLIGENCE PLATFORM<br>
                  Analysis output is AI-assisted and requires human verification.<br>
                  Required survey/navigation metadata was not provided where geographic or physical metadata is unavailable.
               </div>
            </div>

            <!-- RIGHT: TARGET REPORT DRAWER (EvidenceFusionPanel + PDF Preview) -->
            <div style="background: rgba(10,25,47,0.9); border-left: 1px solid rgba(0,240,255,0.2); display: flex; flex-direction: column; overflow-y: auto; position: relative;">
               <div style="padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 8px;">
                  <button class="btn-engage" id="btnPreviewReport" style="width: 100%; padding: 10px; font-family: var(--font-mono); font-weight: bold; background: #fff; color: #000; border: none; cursor: pointer;">PREVIEW TARGET REPORT</button>
                  <div style="font-size: 9px; color: var(--text-muted); text-align: center;">PDF EXPORT COMING IN REPORT ENGINE</div>
               </div>
               ${renderEvidenceFusionPanel(selectedDet, scanData, reviewStates[selectedId] || 'unverified', true)}
            </div>
         </div>
      `}
      
      <!-- REPORT PREVIEW MODAL (Hidden by default) -->
      <div id="reportPreviewModal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 9999; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
         <div style="background: #fff; color: #000; width: 100%; max-width: 700px; max-height: 90vh; overflow-y: auto; box-shadow: 0 0 40px rgba(0,0,0,0.5); font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; position: relative;">
            <button id="btnCloseModal" style="position: absolute; top: 16px; right: 16px; background: #000; color: #fff; border: none; padding: 8px 12px; font-weight: bold; cursor: pointer; font-family: var(--font-mono); font-size: 11px;">CLOSE PREVIEW</button>
            <div id="reportPreviewContent" style="padding: 40px; border: 1px solid #ccc; margin: 10px;"></div>
         </div>
      </div>
    `;

    // Add Styles
    if (!document.getElementById('reportsStyles')) {
      const s = document.createElement('style');
      s.id = 'reportsStyles';
      s.innerHTML = `
        .summary-box { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .summary-lbl { font-size: 9px; color: var(--text-muted); margin-bottom: 4px; font-family: var(--font-mono); text-align: center; }
        .summary-val { font-size: 18px; color: #fff; font-weight: bold; font-family: var(--font-mono); }
        .report-row:hover { background: rgba(255,255,255,0.05) !important; }
      `;
      document.head.appendChild(s);
    }

    // Bind basic events
    const btnSonar = container.querySelector('#btnReportSonar');
    if (btnSonar) btnSonar.onclick = () => MissionSession.dispatch({ type: 'SET_TAB', payload: 'analysis' });

    container.querySelectorAll('.report-row').forEach(row => {
       row.onclick = (e) => MissionSession.dispatch({ type: 'SET_SELECTED_TARGET', payload: e.currentTarget.dataset.id });
    });

    const btnExportJson = container.querySelector('#btnExportJson');
    const btnExportCsv = container.querySelector('#btnExportCsv');
    if (btnExportJson) btnExportJson.onclick = () => {
       downloadJsonReport(scanData);
       alert("REPORT EXPORTED: JSON downloaded successfully.");
    };
    if (btnExportCsv) btnExportCsv.onclick = () => {
       downloadCsvReport(scanData);
       alert("REPORT EXPORTED: CSV downloaded successfully.");
    };

    // Bind Evidence Panel inner actions
    if (selectedDet) {
       const rightPanel = container; // searching globally in container is fine for these unique IDs
       const bConf = rightPanel.querySelector("#btnInspConf");
       const bRej = rightPanel.querySelector("#btnInspRej");
       const bEdit = rightPanel.querySelector("#btnInspEdit");
       const bS = rightPanel.querySelector("#btnInspSonar"); 
       const bM = rightPanel.querySelector("#btnInspMap");

       if (bConf) bConf.onclick = () => MissionSession.dispatch({ type: 'SET_TARGET_REVIEW', payload: { id: selectedId, status: 'confirmed' } });
       if (bRej) bRej.onclick = () => MissionSession.dispatch({ type: 'SET_TARGET_REVIEW', payload: { id: selectedId, status: 'rejected' } });
       if (bEdit) bEdit.onclick = () => {
         const newClass = prompt("Edit Classification:", selectedDet.classification);
         if (newClass && newClass.trim()) {
           selectedDet.classification = newClass.trim();
           MissionSession.dispatch({ type: 'SET_SELECTED_TARGET', payload: selectedId }); 
         }
       };
       if (bS) bS.onclick = () => MissionSession.dispatch({ type: 'SET_TAB', payload: 'analysis' });
       if (bM) bM.onclick = () => MissionSession.dispatch({ type: 'SET_TAB', payload: 'map' });

       // Draw canvas
       const canvas = rightPanel.querySelector('#targetCropCanvas');
       if (canvas && scanData && selectedDet.bounding_box) {
         const img = new Image();
         img.onload = () => {
           const bb = selectedDet.bounding_box;
           const ctx = canvas.getContext('2d');
           const padding = 20;
           let sx = Math.max(0, bb.x1 - padding), sy = Math.max(0, bb.y1 - padding);
           let ex = Math.min(img.width, bb.x2 + padding), ey = Math.min(img.height, bb.y2 + padding);
           let sWidth = ex - sx, sHeight = ey - sy;
           const scale = Math.min(340 / sWidth, 200 / sHeight);
           const dWidth = sWidth * scale, dHeight = sHeight * scale;
           canvas.width = 340; canvas.height = 200;
           const dx = (340 - dWidth) / 2, dy = (200 - dHeight) / 2;
           ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
           ctx.strokeStyle = '#00F0FF'; ctx.lineWidth = 2;
           const bWidth = (bb.x2 - bb.x1) * scale, bHeight = (bb.y2 - bb.y1) * scale;
           const bx = dx + (bb.x1 - sx) * scale, by = dy + (bb.y1 - sy) * scale;
           ctx.strokeRect(bx, by, bWidth, bHeight);
           ctx.beginPath();
           const cl = 10;
           ctx.moveTo(bx, by+cl); ctx.lineTo(bx, by); ctx.lineTo(bx+cl, by);
           ctx.moveTo(bx+bWidth-cl, by); ctx.lineTo(bx+bWidth, by); ctx.lineTo(bx+bWidth, by+cl);
           ctx.moveTo(bx, by+bHeight-cl); ctx.lineTo(bx, by+bHeight); ctx.lineTo(bx+cl, by+bHeight);
           ctx.moveTo(bx+bWidth-cl, by+bHeight); ctx.lineTo(bx+bWidth, by+bHeight); ctx.lineTo(bx+bWidth, by+bHeight-cl);
           ctx.stroke();
         };
         img.src = scanData.annotated_image_url || scanData.image_url;
       }
    }

    // Modal behavior
    const btnPreview = container.querySelector('#btnPreviewReport');
    const modal = container.querySelector('#reportPreviewModal');
    const modalClose = container.querySelector('#btnCloseModal');
    const modalContent = container.querySelector('#reportPreviewContent');

    if (btnPreview && modal && selectedDet) {
       btnPreview.onclick = () => {
          const revStatus = reviewStates[selectedId] || 'unverified';
          let geoStr = 'Metadata Required';
          if (selectedDet.latitude !== null && selectedDet.latitude !== undefined) {
             geoStr = formatCoordinates(selectedDet.latitude, selectedDet.longitude);
          }
          let dimStr = 'Metadata Required';
          if (selectedDet.width_m !== undefined && selectedDet.width_m !== null) {
             dimStr = `${selectedDet.width_m.toFixed(1)}m × ${selectedDet.length_m.toFixed(1)}m`;
          }

          modalContent.innerHTML = `
             <div style="border-bottom: 2px solid #030B14; padding-bottom: 20px; margin-bottom: 30px;">
                <div style="font-size: 24px; font-weight: 900; color: #030B14; letter-spacing: -0.5px;">MARINEDEBRIS AI</div>
                <div style="font-size: 12px; font-weight: bold; color: #666; letter-spacing: 2px;">SONAR INTELLIGENCE PLATFORM</div>
             </div>
             
             <div style="font-size: 20px; font-weight: 700; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px;">MISSION ANALYSIS REPORT</div>
             
             <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 13px; line-height: 1.6; color: #333; margin-bottom: 40px;">
                <div>
                   <div style="font-size: 10px; font-weight: bold; color: #888; text-transform: uppercase;">MISSION</div>
                   <div style="font-weight: 600; font-family: monospace; font-size: 14px;">${missionId}</div>
                </div>
                <div>
                   <div style="font-size: 10px; font-weight: bold; color: #888; text-transform: uppercase;">TARGET</div>
                   <div style="font-weight: 600; font-family: monospace; font-size: 14px;">${selectedDet.id}</div>
                </div>
                <div>
                   <div style="font-size: 10px; font-weight: bold; color: #888; text-transform: uppercase;">CLASSIFICATION</div>
                   <div style="font-weight: 600;">${selectedDet.classification}</div>
                </div>
                <div>
                   <div style="font-size: 10px; font-weight: bold; color: #888; text-transform: uppercase;">REVIEW STATUS</div>
                   <div style="font-weight: 600; color: ${revStatus === 'confirmed' ? '#15803d' : (revStatus === 'rejected' ? '#b91c1c' : '#333')};">${revStatus === 'confirmed' ? 'Human Verified' : revStatus.toUpperCase()}</div>
                </div>
             </div>

             <div style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 16px;">EVIDENCE ANALYSIS</div>
             <table style="width: 100%; font-size: 13px; margin-bottom: 30px; text-align: left; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #eee;">
                   <td style="padding: 8px 0; color: #666; font-weight: bold; width: 50%;">MODEL CONFIDENCE</td>
                   <td style="padding: 8px 0; font-family: monospace; font-weight: bold;">${selectedDet.confidence ? selectedDet.confidence.toFixed(1) + '%' : 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                   <td style="padding: 8px 0; color: #666; font-weight: bold;">FUSED ANOMALY SCORE</td>
                   <td style="padding: 8px 0; font-family: monospace; font-weight: bold;">${selectedDet.anomaly_score ? selectedDet.anomaly_score.toFixed(1) : 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                   <td style="padding: 8px 0; color: #666; font-weight: bold;">ACOUSTIC EVIDENCE</td>
                   <td style="padding: 8px 0; font-family: monospace;">${selectedDet.shadow_score ? selectedDet.shadow_score.toFixed(1) : 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                   <td style="padding: 8px 0; color: #666; font-weight: bold;">SEAFLOOR EVIDENCE</td>
                   <td style="padding: 8px 0; font-family: monospace;">${selectedDet.texture_score ? selectedDet.texture_score.toFixed(1) : 'N/A'}</td>
                </tr>
             </table>

             <div style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 16px;">SPATIAL & METADATA</div>
             <table style="width: 100%; font-size: 13px; margin-bottom: 40px; text-align: left; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #eee;">
                   <td style="padding: 8px 0; color: #666; font-weight: bold; width: 50%;">GEOLOCATION</td>
                   <td style="padding: 8px 0; font-family: monospace;">${geoStr}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                   <td style="padding: 8px 0; color: #666; font-weight: bold;">PHYSICAL DIMENSIONS</td>
                   <td style="padding: 8px 0; font-family: monospace;">${dimStr}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                   <td style="padding: 8px 0; color: #666; font-weight: bold;">SOURCE FRAME</td>
                   <td style="padding: 8px 0; font-family: monospace;">${scanData.filename || 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                   <td style="padding: 8px 0; color: #666; font-weight: bold;">WARNINGS</td>
                   <td style="padding: 8px 0; color: ${(selectedDet.warnings && selectedDet.warnings.length > 0) ? '#b91c1c' : '#15803d'}; font-family: monospace;">
                      ${(selectedDet.warnings && selectedDet.warnings.length > 0) ? selectedDet.warnings.join('<br>') : 'No Active Warnings'}
                   </td>
                </tr>
             </table>

             <div style="font-size: 10px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 20px;">
                CONFIDENTIAL MARINE INTELLIGENCE REPORT<br>
                Generated at ${new Date().toISOString()}<br>
                MarineDebris AI Platform
             </div>
          `;
          modal.style.display = 'flex';
       };
       modalClose.onclick = () => modal.style.display = 'none';
       modal.onclick = (e) => { if(e.target === modal) modal.style.display = 'none'; };
    }
  }

  updateState();

  MissionSession.subscribe((newState) => {
    if (newState.activeTab === 'reports') {
      updateState();
    }
  });

  return container;
}

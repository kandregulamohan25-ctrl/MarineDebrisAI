export function renderEvidenceFusionPanel(det, scanData, reviewStatus, showCrop = true) {
  if (!det) {
    return `
      <div style="padding: 40px 20px; text-align: center; color: var(--text-muted); font-family: var(--font-mono);">
        <div style="font-size: 24px; margin-bottom: 12px; color: var(--color-primary);">◎</div>
        <div style="font-size: 14px; font-weight: bold; color: var(--color-primary); margin-bottom: 8px;">SELECT A TARGET</div>
        <div style="font-size: 11px; line-height: 1.5;">Choose a contact to inspect its evidence, spatial metadata and review state.</div>
      </div>
    `;
  }

  // Badges
  let badgeHtml = '';
  if (reviewStatus === 'confirmed') badgeHtml = '<div style="background:rgba(0,255,102,0.1); color:#00FF66; border:1px solid rgba(0,255,102,0.3); padding:4px 8px; font-size:10px; font-weight:bold; letter-spacing:1px; border-radius:2px;">HUMAN VERIFIED</div>';
  else if (reviewStatus === 'rejected') badgeHtml = '<div style="background:rgba(255,51,102,0.1); color:#FF3366; border:1px solid rgba(255,51,102,0.3); padding:4px 8px; font-size:10px; font-weight:bold; letter-spacing:1px; border-radius:2px;">REJECTED</div>';
  else badgeHtml = '<div style="background:rgba(0,240,255,0.1); color:#00F0FF; border:1px solid rgba(0,240,255,0.3); padding:4px 8px; font-size:10px; font-weight:bold; letter-spacing:1px; border-radius:2px;">AI DETECTED</div>';

  const hasGps = det.latitude != null;

  // Extract variables
  const anomalyScore = det.anomaly_score !== null && det.anomaly_score !== undefined ? det.anomaly_score : null;
  const confidence = det.confidence;
  const shadowScore = det.shadow_score !== undefined ? det.shadow_score : null;
  const textureScore = det.texture_score !== undefined ? det.texture_score : null;
  const edgeScore = det.edge_score !== undefined ? det.edge_score : null;
  const assessment = det.assessment || (anomalyScore > 75 ? "HIGH" : anomalyScore > 50 ? "MODERATE" : "LOW");
  const warnings = det.warnings || (scanData && scanData.warnings) || [];

  // Data Quality
  const dq = scanData.data_quality || {};
  const dqScore = dq.quality_score !== undefined ? dq.quality_score : null;
  
  // Render Explainable Text / "WHY THIS RESULT?"
  let reasons = [];
  if (confidence) reasons.push("✓ AI detector identified a candidate target.");
  if (shadowScore && shadowScore > 50) reasons.push("✓ Shadow-like image evidence is present.");
  if (textureScore && textureScore > 50) reasons.push("✓ Local texture differs from the surrounding region.");
  if (!hasGps) reasons.push("⚠ Geographic metadata unavailable.");
  if (warnings.length > 0) reasons.push("⚠ Review the listed data-quality warnings before confirmation.");
  if (reviewStatus !== 'confirmed' && reviewStatus !== 'rejected') reasons.push("⚠ Human verification required.");

  return `
    <!-- HEADER -->
    <div style="padding: 20px; border-bottom: 1px solid rgba(0,240,255,0.1); background: rgba(10,25,47,0.4);">
      <div style="font-family: var(--font-mono); font-size: 14px; font-weight: bold; color: var(--color-primary); letter-spacing: 1px; margin-bottom: 4px;">WHY WAS THIS TARGET FLAGGED?</div>
      <div style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);">Evidence supporting this detection</div>
    </div>

    <!-- TARGET IDENTIFIER -->
    <div style="padding: 16px 20px; border-bottom: 1px solid var(--color-primary-dim); display: flex; justify-content: space-between; align-items: flex-start; background: rgba(0,0,0,0.2);">
      <div>
        <div style="font-family: var(--font-mono); font-size: 20px; font-weight: bold; color: #fff; margin-bottom: 2px;">${det.id}</div>
        <div style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);">SOURCE: ${scanData.filename}</div>
      </div>
      ${badgeHtml}
    </div>

    ${showCrop ? `
    <!-- Image Crop Area -->
    <div style="padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); background: #000; position: relative; text-align: center;">
       <canvas id="targetCropCanvas" width="340" height="200" style="width: 100%; max-width: 340px; height: auto; border: 1px solid rgba(0,240,255,0.2); border-radius: 2px;"></canvas>
    </div>
    ` : ''}

    <div style="padding: 20px; display: flex; flex-direction: column; gap: 24px; font-family: var(--font-mono);">
      
      <!-- Classification & Assessment -->
      <div style="display: flex; gap: 12px;">
        <div style="flex: 1; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 12px;">
          <div style="font-size: 9px; color: var(--color-primary); font-weight: bold; letter-spacing: 1px; margin-bottom: 4px;">CLASSIFICATION</div>
          <div style="font-size: 14px; color: #fff; font-weight: bold; margin-bottom: 4px; display: flex; justify-content: space-between;">
             ${det.classification}
             <button id="btnInspEdit" style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: var(--text-muted); font-size: 9px; padding: 2px 6px; cursor: pointer;">EDIT</button>
          </div>
          <div style="font-size: 9px; color: var(--text-muted);">RAW: ${det.raw_classification || det.classification}</div>
        </div>
        <div style="flex: 1; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 12px;">
          <div style="font-size: 9px; color: var(--color-primary); font-weight: bold; letter-spacing: 1px; margin-bottom: 4px;">ASSESSMENT</div>
          <div style="font-size: 14px; color: ${assessment === 'HIGH' ? 'var(--color-danger)' : assessment === 'MODERATE' ? 'var(--color-warning)' : 'var(--color-success)'}; font-weight: bold; margin-bottom: 4px;">
             ${assessment}
          </div>
          <div style="font-size: 9px; color: var(--text-muted);">${assessment === 'HIGH' ? 'Strong supporting evidence' : assessment === 'MODERATE' ? 'Mixed supporting evidence' : 'Limited supporting evidence'}</div>
        </div>
      </div>

      <!-- Fused Anomaly Score & Visual Hierarchy -->
      <div style="background: rgba(0,240,255,0.03); border: 1px solid rgba(0,240,255,0.15); padding: 16px;">
         <div style="text-align: center; margin-bottom: 12px;">
            <div style="font-size: 10px; color: var(--color-primary); font-weight: bold; letter-spacing: 1px; margin-bottom: 4px;">FUSED ANOMALY SCORE</div>
            <div style="font-size: 32px; color: #fff; font-weight: bold;">${anomalyScore !== null ? anomalyScore.toFixed(1) : '---'}</div>
            <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">RULE-BASED EVIDENCE FUSION</div>
         </div>
         
         <!-- Visual Hierarchy -->
         <div style="position: relative; margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(0,240,255,0.1);">
            <div style="position: absolute; top: -1px; left: 50%; width: 1px; height: 16px; background: rgba(0,240,255,0.3); transform: translateX(-50%);"></div>
            <div style="position: absolute; top: 15px; left: 20%; right: 20%; height: 1px; background: rgba(0,240,255,0.3);"></div>
            <div style="position: absolute; top: 15px; left: 20%; width: 1px; height: 8px; background: rgba(0,240,255,0.3);"></div>
            <div style="position: absolute; top: 15px; right: 20%; width: 1px; height: 8px; background: rgba(0,240,255,0.3);"></div>
            
            <div style="display: flex; justify-content: space-between; text-align: center; margin-top: 8px;">
               <div style="flex: 1;">
                 <div style="font-size: 9px; color: var(--text-muted); margin-bottom: 2px;">AI EVIDENCE</div>
                 <div style="font-size: 12px; color: #fff; font-weight: bold;">${confidence ? confidence.toFixed(1) : '---'}</div>
               </div>
               <div style="flex: 1;">
                 <div style="font-size: 9px; color: var(--text-muted); margin-bottom: 2px;">ACOUSTIC</div>
                 <div style="font-size: 12px; color: #fff; font-weight: bold;">${shadowScore !== null ? shadowScore.toFixed(1) : (textureScore !== null ? textureScore.toFixed(1) : '---')}</div>
               </div>
               <div style="flex: 1;">
                 <div style="font-size: 9px; color: var(--text-muted); margin-bottom: 2px;">SEAFLOOR</div>
                 <div style="font-size: 12px; color: #fff; font-weight: bold;">${edgeScore !== null ? edgeScore.toFixed(1) : (textureScore !== null ? textureScore.toFixed(1) : '---')}</div>
               </div>
            </div>
         </div>
         
         <details style="margin-top: 16px; font-size: 10px; color: var(--text-muted);">
            <summary style="cursor: pointer; color: var(--color-primary); outline: none;">HOW IS THIS SCORE FORMED?</summary>
            <div style="margin-top: 8px; padding-left: 12px; border-left: 1px solid rgba(0,240,255,0.3); line-height: 1.5;">
              Model confidence + shadow-like image evidence + image quality + texture evidence + edge/structure evidence.
            </div>
         </details>
      </div>

      <!-- Why This Result -->
      <div>
        <details open style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);">
          <summary style="padding: 10px; cursor: pointer; color: var(--color-primary); font-size: 10px; font-weight: bold; letter-spacing: 1px; outline: none; border-bottom: 1px solid rgba(255,255,255,0.05);">WHY THIS RESULT?</summary>
          <div style="padding: 12px; font-size: 11px; color: var(--text-main); line-height: 1.6; display: flex; flex-direction: column; gap: 6px;">
            ${reasons.map(r => `<div>${r}</div>`).join('')}
          </div>
        </details>
      </div>

      <!-- Detailed Evidence Breakdown -->
      <div style="display: flex; flex-direction: column; gap: 12px;">
         <div style="font-size: 10px; color: var(--color-primary); font-weight: bold; letter-spacing: 1px; padding-bottom: 4px; border-bottom: 1px solid rgba(0,240,255,0.1);">SUPPORTING EVIDENCE</div>
         
         <!-- AI Evidence -->
         <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 8px 12px; border-left: 2px solid var(--color-primary);">
            <div>
              <div style="font-size: 11px; font-weight: bold; color: #fff;">MODEL CONFIDENCE</div>
              <div style="font-size: 9px; color: var(--text-muted); margin-top: 2px;">SOURCE: DETECTOR</div>
            </div>
            <div style="font-size: 14px; color: ${confidence > 80 ? 'var(--color-success)' : 'var(--text-main)'}; font-weight: bold;">${confidence ? confidence.toFixed(1) + '%' : 'NOT AVAILABLE'}</div>
         </div>
         
         <!-- Acoustic -->
         <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 8px 12px; border-left: 2px solid var(--text-muted);">
            <div>
              <div style="font-size: 11px; font-weight: bold; color: #fff;">SHADOW-LIKE EVIDENCE</div>
              <div style="font-size: 9px; color: var(--text-muted); margin-top: 2px;">Image-based shadow-like evidence near target.</div>
              <div style="font-size: 9px; color: var(--text-muted); margin-top: 2px;">SOURCE: IMAGE ANALYSIS</div>
            </div>
            <div style="font-size: 14px; color: #fff; font-weight: bold;">${shadowScore !== null ? shadowScore.toFixed(1) : 'NOT AVAILABLE'}</div>
         </div>

         <!-- Seafloor -->
         <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 8px 12px; border-left: 2px solid var(--text-muted);">
            <div>
              <div style="font-size: 11px; font-weight: bold; color: #fff;">TEXTURE EVIDENCE</div>
              <div style="font-size: 9px; color: var(--text-muted); margin-top: 2px;">Local image texture/contrast associated with the detection.</div>
              <div style="font-size: 9px; color: var(--text-muted); margin-top: 2px;">SOURCE: IMAGE ANALYSIS</div>
            </div>
            <div style="font-size: 14px; color: #fff; font-weight: bold;">${textureScore !== null ? textureScore.toFixed(1) : 'NOT AVAILABLE'}</div>
         </div>

         <!-- Edge Evidence -->
         ${edgeScore !== null ? `
         <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 8px 12px; border-left: 2px solid var(--text-muted);">
            <div>
              <div style="font-size: 11px; font-weight: bold; color: #fff;">STRUCTURAL EDGE EVIDENCE</div>
              <div style="font-size: 9px; color: var(--text-muted); margin-top: 2px;">SOURCE: IMAGE ANALYSIS</div>
            </div>
            <div style="font-size: 14px; color: #fff; font-weight: bold;">${edgeScore.toFixed(1)}</div>
         </div>
         ` : ''}
      </div>

      <!-- Data Quality & Warnings -->
      <div style="display: flex; flex-direction: column; gap: 12px;">
         <div style="font-size: 10px; color: var(--color-warning); font-weight: bold; letter-spacing: 1px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,176,0,0.1);">SONAR INPUT QUALITY & WARNINGS</div>
         
         <!-- Readiness -->
         <div style="background: ${warnings.length > 0 ? 'rgba(255,176,0,0.05)' : 'rgba(0,255,102,0.05)'}; padding: 10px; border-left: 2px solid ${warnings.length > 0 ? 'var(--color-warning)' : 'var(--color-success)'};">
            <div style="font-size: 11px; font-weight: bold; color: ${warnings.length > 0 ? 'var(--color-warning)' : 'var(--color-success)'};">ANALYSIS READINESS: ${warnings.length > 0 ? 'WARNING' : 'READY'}</div>
            <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">${warnings.length > 0 ? 'Image quality may affect detection confidence.' : 'Image is available for analysis.'}</div>
         </div>

         <!-- DQ Stats -->
         <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 8px;">
               <div style="font-size: 9px; color: var(--text-muted); margin-bottom: 2px;">IMAGE QUALITY</div>
               <div style="font-size: 12px; color: #fff; font-weight: bold;">${dqScore !== null ? dqScore.toFixed(1) : 'NOT AVAILABLE'}</div>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 8px;">
               <div style="font-size: 9px; color: var(--text-muted); margin-bottom: 2px;">BRIGHTNESS</div>
               <div style="font-size: 12px; color: #fff; font-weight: bold;">${dq.brightness !== undefined ? dq.brightness.toFixed(1) : 'NOT AVAILABLE'}</div>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 8px;">
               <div style="font-size: 9px; color: var(--text-muted); margin-bottom: 2px;">CONTRAST</div>
               <div style="font-size: 12px; color: #fff; font-weight: bold;">${dq.contrast !== undefined ? dq.contrast.toFixed(1) : 'NOT AVAILABLE'}</div>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 8px;">
               <div style="font-size: 9px; color: var(--text-muted); margin-bottom: 2px;">SHARPNESS</div>
               <div style="font-size: 12px; color: #fff; font-weight: bold;">${dq.sharpness !== undefined ? dq.sharpness.toFixed(1) : 'NOT AVAILABLE'}</div>
            </div>
         </div>
         <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 8px; margin-top: -4px;">
            <div style="font-size: 9px; color: var(--text-muted); margin-bottom: 2px;">DROPOUT DETECTED</div>
            <div style="font-size: 12px; color: ${dq.dropout_detected ? 'var(--color-warning)' : '#fff'}; font-weight: bold;">${dq.dropout_detected !== undefined ? (dq.dropout_detected ? 'YES' : 'NO') : 'NOT AVAILABLE'}</div>
         </div>

         <!-- Warnings Box -->
         <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); padding: 12px;">
            <div style="font-size: 10px; font-weight: bold; color: var(--text-muted); margin-bottom: 8px;">ANALYSIS WARNINGS</div>
            ${warnings.length > 0 
              ? warnings.map(w => `<div style="font-size: 11px; color: var(--color-warning); margin-bottom: 4px;">⚠ ${w}</div>`).join('') 
              : `<div style="font-size: 11px; color: var(--color-success);">✓ NO ACTIVE WARNINGS</div>`}
         </div>
      </div>

      <!-- Spatial Metadata -->
      <div style="display: flex; flex-direction: column; gap: 12px;">
         <div style="font-size: 10px; color: var(--color-primary); font-weight: bold; letter-spacing: 1px; padding-bottom: 4px; border-bottom: 1px solid rgba(0,240,255,0.1);">GEOSPATIAL STATUS</div>
         <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="background: rgba(255,255,255,0.03); padding: 10px; border: 1px solid rgba(255,255,255,0.05);">
               <div style="font-size: 9px; color: var(--text-muted); margin-bottom: 4px;">GPS LATITUDE</div>
               <div style="font-size: 11px; color: ${hasGps ? '#fff' : 'var(--color-warning)'}; font-weight: bold;">${hasGps ? det.latitude.toFixed(5) : 'METADATA REQUIRED'}</div>
               <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">SOURCE: SURVEY METADATA</div>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 10px; border: 1px solid rgba(255,255,255,0.05);">
               <div style="font-size: 9px; color: var(--text-muted); margin-bottom: 4px;">GPS LONGITUDE</div>
               <div style="font-size: 11px; color: ${hasGps ? '#fff' : 'var(--color-warning)'}; font-weight: bold;">${hasGps ? det.longitude.toFixed(5) : 'METADATA REQUIRED'}</div>
               <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">SOURCE: SURVEY METADATA</div>
            </div>
         </div>
         ${!hasGps ? `<div style="font-size: 10px; color: var(--text-muted);">Navigation / survey footprint metadata is required for geographic positioning.</div>` : ''}
      </div>

      <!-- Dimensions -->
      <div>
        <div style="font-size: 10px; color: var(--color-primary); font-weight: bold; margin-bottom: 8px; letter-spacing: 1px;">DIMENSION STATUS</div>
        <div style="background: rgba(255,255,255,0.03); padding: 10px; border: 1px solid rgba(255,255,255,0.05);">
          ${(typeof det.width_m === 'number' && det.scale_source) ? `
            <div style="font-size: 14px; color: #fff; font-weight: bold; margin-bottom: 4px;">PHYSICAL DIMENSIONS: ${det.width_m.toFixed(1)}m × ${det.length_m.toFixed(1)}m</div>
            <div style="font-size: 9px; color: var(--color-success);">SOURCE: Sonar scale / survey metadata</div>
          ` : `
            <div style="font-size: 12px; color: #fff; font-weight: bold; margin-bottom: 4px;">PIXEL DIMENSIONS: ${det.bounding_box ? (det.bounding_box.x2 - det.bounding_box.x1).toFixed(0) : 0} × ${det.bounding_box ? (det.bounding_box.y2 - det.bounding_box.y1).toFixed(0) : 0} px</div>
            <div style="font-size: 9px; color: var(--color-warning);">PHYSICAL SCALE: METADATA REQUIRED</div>
          `}
        </div>
      </div>

      <!-- Actions -->
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
        <div style="font-size: 10px; color: var(--text-muted); font-weight: bold; letter-spacing: 1px; margin-bottom: 4px;">REVIEW STATUS</div>
        <div style="display: flex; gap: 8px;">
          <button id="btnInspConf" style="flex: 1; padding: 12px 10px; font-family: var(--font-mono); font-size: 11px; font-weight: bold; background: rgba(0,255,102,0.1); border: 1px solid rgba(0,255,102,0.3); color: #00FF66; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(0,255,102,0.2)'" onmouseout="this.style.background='rgba(0,255,102,0.1)'">CONFIRM TARGET</button>
          <button id="btnInspRej" style="flex: 1; padding: 12px 10px; font-family: var(--font-mono); font-size: 11px; font-weight: bold; background: rgba(255,51,102,0.1); border: 1px solid rgba(255,51,102,0.3); color: #FF3366; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,51,102,0.2)'" onmouseout="this.style.background='rgba(255,51,102,0.1)'">REJECT TARGET</button>
        </div>
        
        <div style="display: flex; gap: 8px; margin-top: 8px;">
           <button id="btnInspSonar" style="flex: 1; padding: 10px; font-family: var(--font-mono); font-size: 11px; background: rgba(0,240,255,0.1); border: 1px solid rgba(0,240,255,0.3); color: #00F0FF; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(0,240,255,0.2)'" onmouseout="this.style.background='rgba(0,240,255,0.1)'">OPEN IN SONAR</button>
           <button id="btnInspMap" ${hasGps ? '' : 'disabled'} style="flex: 1; padding: 10px; font-family: var(--font-mono); font-size: 11px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: ${hasGps ? '#fff' : 'var(--text-muted)'}; cursor: ${hasGps ? 'pointer' : 'not-allowed'};">
              ${hasGps ? 'SHOW ON MAP' : 'GEOLOCATION UNAVAILABLE'}
           </button>
        </div>
      </div>

    </div>
  `;
}

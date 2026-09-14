/**
 * MarineDebrisAI - DashboardView
 * Redesigned as a Naval Mission-Control Interface
 */

import { MissionSession } from '../state/MissionSession.js';
import { runRealSonarAnalysis } from '../services/api.js';

export function renderDashboardView({ currentAnalysis, onNavigate, onRunDetection }) {
  const container = document.createElement('div');
  container.className = 'dashboard-view';
  
  // Custom local CSS for the dashboard mission-control feel
  container.innerHTML = `
    <style>
      .mission-grid {
        display: grid;
        grid-template-columns: 3fr 1fr;
        gap: 24px;
      }
      @media (max-width: 1200px) {
        .mission-grid { grid-template-columns: 1fr; }
      }
      
      .hero-panel {
        background: linear-gradient(180deg, rgba(10,25,47,0.8) 0%, rgba(2,8,16,0.9) 100%);
        border: 1px solid var(--color-primary-dim);
        border-radius: var(--radius-md);
        padding: 0;
        overflow: hidden;
        position: relative;
        box-shadow: 0 10px 40px rgba(0,0,0,0.8);
      }
      
      .hero-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        background: rgba(0, 240, 255, 0.05);
        border-bottom: 1px solid var(--color-primary-dim);
      }
      
      .hero-title {
        font-family: var(--font-mono);
        color: var(--color-primary);
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 2px;
      }
      
      .upload-zone {
        padding: 60px 24px;
        text-align: center;
        cursor: pointer;
        transition: all var(--transition-fast);
        border-bottom: 1px solid var(--bg-panel-border);
        background: rgba(0,0,0,0.2);
      }
      
      .upload-zone:hover {
        background: rgba(0, 240, 255, 0.05);
      }
      
      .sample-strip {
        display: flex;
        background: rgba(0,0,0,0.4);
        padding: 12px 24px;
        gap: 16px;
        align-items: center;
      }
      
      .sample-btn {
        background: rgba(255,255,255,0.05);
        border: 1px solid var(--text-muted);
        color: var(--text-main);
        padding: 6px 12px;
        border-radius: var(--radius-sm);
        font-family: var(--font-mono);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .sample-btn:hover {
        background: var(--color-primary-dim);
        border-color: var(--color-primary);
        color: var(--color-primary);
      }
      
      .run-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        background: rgba(0,0,0,0.6);
      }
      
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
      
      .btn-engage:disabled {
        background: var(--text-muted);
        box-shadow: none;
        cursor: not-allowed;
      }
      
      .status-panel {
        background: var(--bg-panel);
        border: 1px solid var(--bg-panel-border);
        border-radius: var(--radius-md);
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        backdrop-filter: var(--glass-blur);
      }
      
      .stat-box {
        background: rgba(0,0,0,0.4);
        border: 1px solid rgba(0,240,255,0.1);
        padding: 16px;
        border-radius: var(--radius-sm);
      }
      
      .stat-label {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--text-secondary);
        letter-spacing: 1px;
        margin-bottom: 8px;
        display: block;
      }
      
      .stat-value {
        font-family: var(--font-mono);
        font-size: 24px;
        color: var(--color-primary);
        font-weight: 700;
      }
      
      .stat-sub {
        font-family: var(--font-sans);
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 4px;
      }
    </style>
    
    <div class="mission-grid">
      <!-- Left Column: Command & Control -->
      <div class="hero-panel">
        <div class="hero-header">
          <div class="hero-title">SONAR INGESTION LINK</div>
          <div style="font-family: var(--font-mono); font-size: 12px; color: var(--text-muted);">AWAITING SIGNAL</div>
        </div>
        
        <input type="file" id="dashFileInput" accept="image/jpeg, image/png, image/jpg" style="display: none;" />
        
        <div class="upload-zone" id="dashDropZone">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.5" style="margin-bottom: 16px; filter: drop-shadow(0 0 8px rgba(0,240,255,0.3));">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          <div style="font-family: var(--font-mono); font-size: 14px; color: var(--text-main); margin-bottom: 8px; letter-spacing: 1px;">DRAG & DROP SONAR IMAGERY</div>
          <div style="font-size: 13px; color: var(--text-muted);" id="dashUploadLabel">Click to browse local files</div>
        </div>
        
        <div class="sample-strip">
          <span style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);">OR LOAD CALIBRATION SAMPLE:</span>
          <button class="sample-btn" id="dashSampleShipwreck">TEST_TARGET_ALPHA (Shipwreck)</button>
          <button class="sample-btn" id="dashSampleDebris">TEST_TARGET_BETA (Debris)</button>
        </div>
        
        <div class="run-bar">
          <div id="dashStatusMsg" style="font-family: var(--font-mono); font-size: 12px; color: var(--text-secondary); display: none;"></div>
          <div style="flex: 1"></div>
          <button class="btn-engage" id="dashRunBtn">INITIATE SCAN</button>
        </div>
      </div>
      
      <!-- Right Column: Mission Status -->
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div class="status-panel">
          <div style="font-family: var(--font-mono); font-size: 14px; color: var(--text-main); border-bottom: 1px solid var(--bg-panel-border); padding-bottom: 12px; margin-bottom: 4px;">CURRENT MISSION</div>
          
          <div class="stat-box">
            <span class="stat-label">TOTAL DETECTIONS</span>
            <div class="stat-value" style="color: ${currentAnalysis?.detections?.length > 0 ? 'var(--color-danger)' : 'var(--text-muted)'}">
              ${currentAnalysis ? currentAnalysis.detections.length : '--'}
            </div>
          </div>
          
          <div class="stat-box">
            <span class="stat-label">MAX CONFIDENCE</span>
            <div class="stat-value">
              ${currentAnalysis && currentAnalysis.detections.length > 0 ? 
                Math.max(...currentAnalysis.detections.map(d => d.confidence)).toFixed(1) + '%' : '--'}
            </div>
          </div>
          
          <div class="stat-box">
            <span class="stat-label">AI LATENCY</span>
            <div class="stat-value" style="color: var(--color-success)">
              ${currentAnalysis ? (currentAnalysis.inference_seconds * 1000).toFixed(0) + ' ms' : '--'}
            </div>
            <div class="stat-sub">Hardware: Render CPU (Free)</div>
          </div>
        </div>
        
        ${currentAnalysis ? `
          <button onclick="document.getElementById('nav-results').click()" class="sample-btn" style="padding: 16px; text-align: center; width: 100%; border-color: var(--color-primary); color: var(--color-primary);">
            VIEW FULL DETECTION LOG 
          </button>
        ` : ''}
      </div>
    </div>
  `;

  // Interaction Logic
  const dropZone = container.querySelector('#dashDropZone');
  const fileInput = container.querySelector('#dashFileInput');
  const uploadLabel = container.querySelector('#dashUploadLabel');
  const runBtn = container.querySelector('#dashRunBtn');
  const statusMsg = container.querySelector('#dashStatusMsg');

  // We read the initial selected file from the global MissionSession if available
  
  let selectedFile = MissionSession.getState().activeFrame?.file || null;
  let selectedBlobUrl = MissionSession.getState().activeFrame?.url || null;
  let selectedFilename = MissionSession.getState().activeFrame?.filename || null;

  if (selectedFilename) {
    uploadLabel.textContent = selectedFilename;
    uploadLabel.style.color = 'var(--color-primary)';
  }

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--color-primary)';
    dropZone.style.background = 'rgba(0, 240, 255, 0.1)';
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--bg-panel-border)';
    dropZone.style.background = 'rgba(0,0,0,0.2)';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--bg-panel-border)';
    dropZone.style.background = 'rgba(0,0,0,0.2)';
    if (e.dataTransfer.files?.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files?.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });

  function handleFileSelect(file) {
    selectedFile = file;
    selectedBlobUrl = URL.createObjectURL(file);
    selectedFilename = file.name;
    uploadLabel.textContent = file.name;
    uploadLabel.style.color = 'var(--color-primary)';
    MissionSession.dispatch({ type: 'SET_FRAME', payload: { file, url: selectedBlobUrl, filename: file.name }});
  }

  // Sample buttons
  container.querySelector('#dashSampleShipwreck')?.addEventListener('click', () => {
    selectedFile = null;
    selectedBlobUrl = '/samples/monrovia-side-scan-sonar-IVER-hires.png';
    selectedFilename = 'monrovia.png';
    uploadLabel.textContent = 'CALIBRATION: TEST_TARGET_ALPHA LOADED';
    uploadLabel.style.color = 'var(--color-success)';
    MissionSession.dispatch({ type: 'SET_FRAME', payload: { file: null, url: selectedBlobUrl, filename: selectedFilename }});
  });

  container.querySelector('#dashSampleDebris')?.addEventListener('click', () => {
    selectedFile = null;
    selectedBlobUrl = '/samples/sonar_test.jpg';
    selectedFilename = 'sonar_test.jpg';
    uploadLabel.textContent = 'CALIBRATION: TEST_TARGET_BETA LOADED';
    uploadLabel.style.color = 'var(--color-success)';
    MissionSession.dispatch({ type: 'SET_FRAME', payload: { file: null, url: selectedBlobUrl, filename: selectedFilename }});
  });

  // Run AI Detection button
  runBtn.addEventListener('click', async () => {
    if (!selectedFile && !selectedBlobUrl) {
      selectedBlobUrl = '/samples/monrovia-side-scan-sonar-IVER-hires.png';
      selectedFilename = 'monrovia.png';
      MissionSession.dispatch({ type: 'SET_FRAME', payload: { file: null, url: selectedBlobUrl, filename: selectedFilename }});
    }

    statusMsg.style.display = 'block';
    statusMsg.textContent = 'UPLINKING IMAGE TO AI CLUSTER...';
    runBtn.disabled = true;
    runBtn.textContent = 'SCANNING...';
    runBtn.style.animation = 'pulse 1.5s infinite';
    MissionSession.dispatch({ type: 'SET_ANALYSIS_STATUS', payload: { status: 'processing' }});

    try {
      let blob = selectedFile;
      if (!blob && selectedBlobUrl) {
        const resp = await fetch(selectedBlobUrl);
        blob = await resp.blob();
      }

      const result = await runRealSonarAnalysis({
        imageFile: selectedFile,
        imageBlob: !selectedFile ? blob : null,
        filename: selectedFilename,
        confidenceThreshold: 0.25,
        iouThreshold: 0.45,
        onProgress: (pct, msg) => {
          statusMsg.textContent = `[${pct}%] ${msg.toUpperCase()}`;
        }
      });
      
      MissionSession.dispatch({ type: 'SET_ANALYSIS_RESULT', payload: result });
    } catch (err) {
      alert(`SYSTEM FAILURE:\n${err.message}`);
      MissionSession.dispatch({ type: 'SET_ANALYSIS_STATUS', payload: { status: 'error', error: err.message }});
      statusMsg.style.display = 'none';
      runBtn.disabled = false;
      runBtn.textContent = 'INITIATE SCAN';
      runBtn.style.animation = 'none';
    }
  });

  // Since we load this async but must return the container synchronously in vanilla JS,
  // the container is returned immediately and events are bound in the closure.
  return container;
}

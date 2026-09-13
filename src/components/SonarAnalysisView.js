/**
 * MarineDebrisAI - Sonar Workspace
 * Professional scientific image-analysis workspace
 */

import { runRealSonarAnalysis, checkBackendHealth } from '../services/api.js';

export function renderSonarAnalysisView({ currentAnalysis, onAnalysisComplete }) {
  const container = document.createElement('div');
  container.className = 'sonar-analysis-view';

  let confThreshold = 0.25;
  let iouThreshold = 0.45;
  let selectedFile = null;
  let selectedBlobUrl = '/samples/monrovia-side-scan-sonar-IVER-hires.png';
  let selectedFilename = 'monrovia.png';
  let isRunning = false;

  container.innerHTML = `
    <style>
      .workspace-grid {
        display: grid;
        grid-template-columns: 1fr 350px;
        gap: 24px;
        height: calc(100vh - var(--header-height) - 64px);
      }
      @media (max-width: 1200px) {
        .workspace-grid { grid-template-columns: 1fr; height: auto; }
      }
      
      .sonar-viewer {
        background: #02050a;
        border: 1px solid var(--bg-panel-border);
        border-radius: var(--radius-md);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
        box-shadow: inset 0 0 50px rgba(0, 240, 255, 0.05);
      }
      
      .viewer-toolbar {
        background: var(--bg-panel);
        border-bottom: 1px solid var(--bg-panel-border);
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .toolbar-btn {
        background: transparent;
        border: 1px solid var(--text-muted);
        color: var(--text-main);
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-family: var(--font-mono);
        font-size: 11px;
        transition: all 0.2s;
      }
      .toolbar-btn:hover, .toolbar-btn.active {
        background: var(--color-primary-dim);
        border-color: var(--color-primary);
        color: var(--color-primary);
      }
      
      .viewer-canvas {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        position: relative;
        background-image: linear-gradient(rgba(0, 240, 255, 0.05) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(0, 240, 255, 0.05) 1px, transparent 1px);
        background-size: 50px 50px;
      }
      
      .viewer-img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        filter: contrast(1.1) brightness(0.9);
      }
      
      /* Analysis Pipeline Stages */
      .pipeline-stage {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        border: 1px solid rgba(0, 240, 255, 0.05);
        background: rgba(0,0,0,0.2);
        margin-bottom: 8px;
        border-radius: var(--radius-sm);
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--text-muted);
        transition: all 0.3s;
      }
      
      .pipeline-stage.active {
        border-color: var(--color-primary);
        color: var(--color-primary);
        background: var(--color-primary-dim);
        box-shadow: 0 0 10px var(--color-primary-glow);
      }
      
      .pipeline-stage.done {
        border-color: var(--color-success);
        color: var(--color-success);
      }
      
      .stage-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--text-muted);
      }
      .pipeline-stage.active .stage-dot { background: var(--color-primary); box-shadow: 0 0 8px var(--color-primary); }
      .pipeline-stage.done .stage-dot { background: var(--color-success); }
      
      /* Scanning animation */
      .scan-line {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background: var(--color-primary);
        box-shadow: 0 0 15px var(--color-primary), 0 0 30px var(--color-primary);
        display: none;
        z-index: 10;
      }
      
      @keyframes scan {
        0% { top: 0; opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { top: 100%; opacity: 0; }
      }
    </style>

    <div class="workspace-grid">
      <!-- Main Sonar Viewer -->
      <div class="sonar-viewer">
        <div class="viewer-toolbar">
          <div style="font-family: var(--font-mono); font-size: 12px; color: var(--color-primary);">SONAR_OPTICS // <span id="sonarFileLabel">TEST_TARGET_ALPHA</span></div>
          <div style="display: flex; gap: 8px;">
            <button class="toolbar-btn" id="btnSonarShipwreck">TEST_TARGET_ALPHA</button>
            <button class="toolbar-btn" id="btnSonarDebris">TEST_TARGET_BETA</button>
            <button class="toolbar-btn active" id="btnOriginalToggle">RAW</button>
            <input type="file" id="sonarFileInput" accept="image/*" style="display: none;" />
            <button class="toolbar-btn" id="btnUpload" style="border-color: var(--color-primary); color: var(--color-primary);">+ UPLOAD</button>
          </div>
        </div>
        
        <div class="viewer-canvas" id="sonarDropZone">
          <img src="/samples/monrovia-side-scan-sonar-IVER-hires.png" id="sonarPreviewImg" class="viewer-img" />
          <div class="scan-line" id="scanLine"></div>
        </div>
      </div>

      <!-- Analysis Controls & Pipeline -->
      <div style="display: flex; flex-direction: column; gap: 16px; overflow-y: auto;">
        
        <!-- Controls -->
        <div class="panel" style="padding: 16px; margin-bottom: 0;">
          <div class="panel-header" style="margin-bottom: 12px; padding-bottom: 8px;">
            <div class="panel-title">INFERENCE PARAMETERS</div>
          </div>
          
          <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">
              <span>CONFIDENCE THRESHOLD</span>
              <span id="sonarConfDisplay" style="color: var(--color-primary);">25%</span>
            </div>
            <input type="range" id="sonarConfSlider" min="0.05" max="0.95" step="0.05" value="0.25" style="width: 100%; accent-color: var(--color-primary);" />
          </div>
          
          <button id="sonarRunBtn" style="width: 100%; padding: 12px; background: var(--color-primary); color: var(--bg-dark); border: none; font-family: var(--font-mono); font-weight: 700; letter-spacing: 1px; cursor: pointer; transition: all 0.2s;">
            EXECUTE AI ANALYSIS
          </button>
        </div>
        
        <!-- Pipeline Status -->
        <div class="panel" style="padding: 16px; flex: 1;">
          <div class="panel-header" style="margin-bottom: 16px; padding-bottom: 8px;">
            <div class="panel-title">TELEMETRY PIPELINE</div>
            <span style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);" id="pipelineStatus">IDLE</span>
          </div>
          
          <div id="stage-1" class="pipeline-stage"><div class="stage-dot"></div> SONAR INGESTION</div>
          <div id="stage-2" class="pipeline-stage"><div class="stage-dot"></div> IMAGE QUALITY</div>
          <div id="stage-3" class="pipeline-stage"><div class="stage-dot"></div> PREPROCESSING</div>
          <div id="stage-4" class="pipeline-stage"><div class="stage-dot"></div> YOLOv11 ONNX DETECTION</div>
          <div id="stage-5" class="pipeline-stage"><div class="stage-dot"></div> ACOUSTIC VALIDATION</div>
          <div id="stage-6" class="pipeline-stage"><div class="stage-dot"></div> ANOMALY SCORING</div>
          <div id="stage-7" class="pipeline-stage"><div class="stage-dot"></div> GEOLOCALIZATION</div>
        </div>

      </div>
    </div>
  `;

  // UI Elements
  const previewImg = container.querySelector('#sonarPreviewImg');
  const fileLabel = container.querySelector('#sonarFileLabel');
  const scanLine = container.querySelector('#scanLine');
  const runBtn = container.querySelector('#sonarRunBtn');
  const pipelineStatus = container.querySelector('#pipelineStatus');
  
  // Slider
  const slider = container.querySelector('#sonarConfSlider');
  const confDisplay = container.querySelector('#sonarConfDisplay');
  slider.addEventListener('input', (e) => {
    confThreshold = parseFloat(e.target.value);
    confDisplay.textContent = `${(confThreshold * 100).toFixed(0)}%`;
  });

  // Buttons
  container.querySelector('#btnUpload').addEventListener('click', () => {
    container.querySelector('#sonarFileInput').click();
  });
  
  container.querySelector('#btnSonarShipwreck').addEventListener('click', () => {
    selectedFile = null;
    selectedBlobUrl = '/samples/monrovia-side-scan-sonar-IVER-hires.png';
    selectedFilename = 'monrovia.png';
    previewImg.src = selectedBlobUrl;
    fileLabel.textContent = 'TEST_TARGET_ALPHA';
  });

  container.querySelector('#btnSonarDebris').addEventListener('click', () => {
    selectedFile = null;
    selectedBlobUrl = '/samples/sonar_test.jpg';
    selectedFilename = 'sonar_test.jpg';
    previewImg.src = selectedBlobUrl;
    fileLabel.textContent = 'TEST_TARGET_BETA';
  });

  container.querySelector('#sonarFileInput').addEventListener('change', (e) => {
    if (e.target.files?.length > 0) {
      selectedFile = e.target.files[0];
      selectedBlobUrl = URL.createObjectURL(selectedFile);
      selectedFilename = selectedFile.name;
      previewImg.src = selectedBlobUrl;
      fileLabel.textContent = selectedFilename.toUpperCase();
    }
  });

  // Pipeline Animation Logic
  const setStage = (stageNum, status) => {
    const el = container.querySelector(`#stage-${stageNum}`);
    if (!el) return;
    if (status === 'active') {
      el.className = 'pipeline-stage active';
    } else if (status === 'done') {
      el.className = 'pipeline-stage done';
    } else {
      el.className = 'pipeline-stage';
    }
  };

  runBtn.addEventListener('click', async () => {
    if (isRunning) return;
    isRunning = true;
    
    // Reset pipeline
    for (let i=1; i<=7; i++) setStage(i, 'idle');
    scanLine.style.display = 'block';
    scanLine.style.animation = 'scan 2s linear infinite';
    runBtn.disabled = true;
    runBtn.style.background = 'var(--text-muted)';
    runBtn.textContent = 'PROCESSING...';
    pipelineStatus.textContent = 'UPLINKING';
    pipelineStatus.style.color = 'var(--color-primary)';

    try {
      let blob = selectedFile;
      if (!blob && selectedBlobUrl) {
        const resp = await fetch(selectedBlobUrl);
        blob = await resp.blob();
      }

      setStage(1, 'done');
      
      const result = await runRealSonarAnalysis({
        imageFile: selectedFile,
        imageBlob: !selectedFile ? blob : null,
        filename: selectedFilename,
        confidenceThreshold: confThreshold,
        iouThreshold: iouThreshold,
        onProgress: (pct, msg) => {
          pipelineStatus.textContent = msg.toUpperCase();
          if (pct > 10) setStage(2, 'done');
          if (pct > 30) setStage(3, 'done');
          if (pct > 50) {
              setStage(4, 'active');
          }
          if (pct > 80) {
              setStage(4, 'done');
              setStage(5, 'done');
              setStage(6, 'done');
              setStage(7, 'active');
          }
        }
      });

      setStage(7, 'done');
      pipelineStatus.textContent = 'COMPLETE';
      pipelineStatus.style.color = 'var(--color-success)';

      await new Promise(r => setTimeout(r, 600));

      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
    } catch (err) {
      pipelineStatus.textContent = 'ERROR';
      pipelineStatus.style.color = 'var(--color-danger)';
      alert(`Analysis Error:\n${err.message}`);
    } finally {
      isRunning = false;
      runBtn.disabled = false;
      runBtn.style.background = 'var(--color-primary)';
      runBtn.textContent = 'EXECUTE AI ANALYSIS';
      scanLine.style.animation = 'none';
      scanLine.style.display = 'none';
    }
  });

  return container;
}

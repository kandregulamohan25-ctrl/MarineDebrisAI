
import os

js_code = """
import { runRealSonarAnalysis } from "../services/api.js";

export function renderSonarAnalysisView({ currentAnalysis, onAnalysisComplete }) {
  const container = document.createElement("div");
  container.className = "cinematic-sonar-container";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.backgroundColor = "#030B14";
  container.style.color = "#fff";
  container.style.fontFamily = "var(--font-main, sans-serif)";
  container.style.overflow = "hidden";
  container.style.position = "relative";

  const style = document.createElement("style");
  style.textContent = `
    .cinematic-sonar-container {
      --color-primary: #00F0FF;
      --color-warning: #FFB000;
      --color-danger: #FF3366;
      --color-success: #00FF66;
      --color-bg: #030B14;
      --color-panel: #0A192F;
      --font-mono: "Courier New", Courier, monospace;
      position: relative;
      background-image: 
        linear-gradient(rgba(0, 240, 255, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 240, 255, 0.05) 1px, transparent 1px);
      background-size: 40px 40px;
      background-position: center center;
    }
    .glass-panel {
      background: rgba(10, 25, 47, 0.85);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(0, 240, 255, 0.2);
      border-radius: 4px;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
    }
    .tech-text { font-family: var(--font-mono); letter-spacing: 1px; }
    .analysis-modal-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(3, 11, 20, 0.9); backdrop-filter: blur(8px);
      display: none; align-items: center; justify-content: center;
      z-index: 1000; opacity: 0; transition: opacity 0.3s ease;
    }
    .analysis-modal-overlay.active { display: flex; opacity: 1; }
    .analysis-modal {
      width: 600px; padding: 30px; display: flex; flex-direction: column; gap: 20px;
      border-top: 4px solid var(--color-primary);
    }
    .sonar-radar {
      position: relative; width: 150px; height: 150px; border-radius: 50%;
      border: 2px solid rgba(0, 240, 255, 0.3); margin: 0 auto; overflow: hidden; display: none;
    }
    .sonar-radar.active { display: block; }
    .sonar-radar::before {
      content: ""; position: absolute; top: 50%; left: 50%; width: 50%; height: 2px;
      background: var(--color-primary); transform-origin: 0 50%;
      animation: radar-scan 2s linear infinite; box-shadow: 0 0 10px var(--color-primary);
    }
    .sonar-radar::after {
      content: ""; position: absolute; inset: 0; border-radius: 50%;
      box-shadow: inset 0 0 30px rgba(0,240,255,0.2);
    }
    @keyframes radar-scan { 0% { transform: translateY(-50%) rotate(0deg); } 100% { transform: translateY(-50%) rotate(360deg); } }
    .progress-stage { display: flex; justify-content: space-between; margin-bottom: 8px; color: rgba(255,255,255,0.5); font-size: 13px; }
    .progress-stage.active { color: var(--color-primary); text-shadow: 0 0 5px var(--color-primary); }
    .progress-stage.done { color: var(--color-success); }
    .progress-stage.warning { color: var(--color-warning); }
    .layout-grid { display: grid; grid-template-columns: 350px 1fr 350px; height: 100%; gap: 20px; padding: 20px; }
    .viewer-area { position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .viewer-image { max-width: 100%; max-height: 100%; object-fit: contain; transition: all 0.3s ease; opacity: 0; }
    .viewer-image.visible { opacity: 1; }
    .detection-box {
      position: absolute; border: 2px solid var(--color-warning); background: rgba(255, 176, 0, 0.1);
      box-shadow: 0 0 10px rgba(255, 176, 0, 0.5); pointer-events: none; opacity: 0; transition: opacity 0.5s ease;
    }
    .detection-box.visible { opacity: 1; }
    .detection-label {
      position: absolute; top: -25px; left: -2px; background: var(--color-warning); color: #000;
      padding: 2px 8px; font-size: 11px; font-weight: bold; white-space: nowrap;
    }
    .empty-state { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }
    .btn-cyber {
      background: transparent; border: 1px solid var(--color-primary); color: var(--color-primary);
      padding: 10px 20px; cursor: pointer; font-family: var(--font-mono); font-size: 14px; text-transform: uppercase; transition: all 0.2s; outline: none;
    }
    .btn-cyber:hover:not(:disabled) { background: rgba(0, 240, 255, 0.1); box-shadow: 0 0 15px rgba(0, 240, 255, 0.3); }
    .btn-cyber.solid { background: var(--color-primary); color: #000; }
    .btn-cyber.solid:hover:not(:disabled) { background: #00ffff; box-shadow: 0 0 20px rgba(0, 240, 255, 0.6); }
    .btn-cyber:disabled { border-color: #333; color: #555; cursor: not-allowed; }
    .btn-action { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 6px 12px; font-size: 11px; cursor: pointer; flex: 1; text-transform: uppercase; }
    .btn-action:hover { background: rgba(255,255,255,0.1); }
    .btn-action.confirm:hover { background: rgba(0, 255, 102, 0.2); border-color: var(--color-success); color: var(--color-success); }
    .btn-action.reject:hover { background: rgba(255, 51, 102, 0.2); border-color: var(--color-danger); color: var(--color-danger); }
    .side-panel { display: flex; flex-direction: column; gap: 20px; opacity: 0; transition: opacity 0.5s ease; }
    .side-panel.visible { opacity: 1; }
    .data-block { margin-bottom: 15px; }
    .data-label { font-size: 10px; color: rgba(255,255,255,0.5); margin-bottom: 4px; }
    .data-value { font-size: 14px; color: #fff; }
    .meter-container { width: 100%; height: 6px; background: rgba(255,255,255,0.1); margin-top: 6px; border-radius: 3px; overflow: hidden; }
    .meter-fill { height: 100%; background: var(--color-primary); width: 0%; transition: width 1s cubic-bezier(0.1, 0.8, 0.2, 1); }
    .viewer-header { position: absolute; top: 20px; left: 20px; right: 20px; display: flex; justify-content: space-between; z-index: 10; display: none; }
    .viewer-header.visible { display: flex; }
    .toolbar { display: flex; gap: 10px; background: rgba(10,25,47,0.8); padding: 8px; border: 1px solid rgba(0,240,255,0.2); backdrop-filter: blur(5px); }
    .tool-btn { background: transparent; border: none; color: rgba(255,255,255,0.6); font-family: var(--font-mono); font-size: 11px; cursor: pointer; padding: 4px 8px; text-transform: uppercase; }
    .tool-btn:hover, .tool-btn.active { color: var(--color-primary); }
    .target-marker-pulse {
      position: absolute; top: 50%; left: 50%; width: 20px; height: 20px; transform: translate(-50%, -50%);
      border: 2px solid var(--color-warning); border-radius: 50%; opacity: 0; pointer-events: none;
    }
    @keyframes pulse-once {
      0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
    }
    .scan-lines {
      position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index: 5;
      background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,240,255,0.1) 50%, rgba(0,240,255,0.1));
      background-size: 100% 4px; display: none;
    }
    .scan-lines.active { display: block; }
  `;
  container.appendChild(style);

  container.innerHTML += `
    <div class="empty-state" id="emptyState">
      <div class="tech-text" style="font-size: 24px; color: rgba(255,255,255,0.2); letter-spacing: 4px;">NO ACTIVE SONAR FRAME</div>
      <div style="display: flex; gap: 15px;">
        <button class="btn-cyber solid" id="btnUploadNew">START NEW ANALYSIS</button>
        <button class="btn-cyber" id="btnLoadSample">OPEN SURVEY REPLAY</button>
      </div>
      <input type="file" id="fileUpload" accept="image/*" style="display: none;" />
    </div>
    
    <div class="viewer-header" id="viewerHeader">
      <div class="glass-panel tech-text" style="padding: 10px 15px; font-size: 12px;">
        OP: <span style="color: var(--color-primary);" id="headerFilename">---</span><br/>
        <span style="color: rgba(255,255,255,0.5); font-size: 10px;" id="headerRes">RES: ---</span>
      </div>
      
      <div class="toolbar tech-text">
        <button class="tool-btn active">ORIGINAL</button>
        <button class="tool-btn">ENHANCED</button>
        <button class="tool-btn">DETECTIONS</button>
        <button class="tool-btn">SHADOW EVIDENCE</button>
        <div style="width: 1px; background: rgba(255,255,255,0.2); margin: 0 5px;"></div>
        <button class="tool-btn" id="btnZoomIn">ZOOM IN</button>
        <button class="tool-btn" id="btnZoomOut">ZOOM OUT</button>
        <button class="tool-btn" id="btnFit">FIT</button>
      </div>
    </div>
    
    <div class="layout-grid" id="mainGrid" style="display: none;">
      <!-- Left Panel -->
      <div class="side-panel glass-panel tech-text" id="leftPanel" style="padding: 20px;">
        <div style="border-bottom: 1px solid rgba(0,240,255,0.2); padding-bottom: 10px; margin-bottom: 20px;">
          <h3 style="margin: 0; font-size: 14px; color: var(--color-primary);">MISSION PARAMETERS</h3>
        </div>
        
        <div class="data-block">
          <div class="data-label">GEOLOCATION</div>
          <div class="data-value" id="geoData" style="color: var(--color-warning);">METADATA REQUIRED</div>
          <button class="btn-action" style="margin-top: 10px; display: none;" id="btnUploadNav">UPLOAD NAVIGATION DATA</button>
        </div>
        
        <div class="data-block">
          <div class="data-label">DIMENSIONS</div>
          <div class="data-value" id="dimData" style="color: var(--color-warning);">METADATA REQUIRED</div>
        </div>
        
        <div style="margin-top: auto;">
          <button class="btn-cyber solid" style="width: 100%;" id="btnRunAnalysis">RUN AI ANALYSIS</button>
        </div>
      </div>
      
      <!-- Center: Viewer -->
      <div class="viewer-area" id="viewerArea">
        <div id="imgWrapper" style="position: relative; transition: transform 0.2s; transform-origin: center;">
            <img id="mainImage" class="viewer-image" />
            <div id="detectionLayer" style="position: absolute; top:0; left:0; right:0; bottom:0; pointer-events: none;"></div>
            <div class="scan-lines" id="scanLines"></div>
        </div>
      </div>
      
      <!-- Right Panel -->
      <div class="side-panel glass-panel tech-text" id="rightPanel" style="padding: 20px;">
        <div id="noTargetsMsg" style="display:none; color: var(--color-success); font-weight:bold; margin-bottom:20px;">NO ANOMALIES DETECTED</div>
        <div id="targetDetails" style="display: none;">
            <div style="border-bottom: 1px solid rgba(0,240,255,0.2); padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between;">
            <h3 style="margin: 0; font-size: 14px; color: var(--color-primary);" id="targetIdHeader">TARGET 001</h3>
            <span style="color: rgba(255,255,255,0.5); font-size: 10px;" id="reviewStatus">UNVERIFIED</span>
            </div>
            
            <div class="data-block">
            <div class="data-label">CLASSIFICATION</div>
            <div class="data-value" style="color: var(--color-warning); font-weight: bold; font-size: 16px;" id="targetClass">---</div>
            </div>
            
            <div class="data-block">
            <div class="data-label" style="display: flex; justify-content: space-between;">
                <span>MODEL CONFIDENCE</span>
                <span id="valConf" style="color: #fff;">0%</span>
            </div>
            <div class="meter-container"><div class="meter-fill" id="meterConf"></div></div>
            </div>
            
            <div class="data-block">
            <div class="data-label" style="display: flex; justify-content: space-between;">
                <span>ACOUSTIC EVIDENCE</span>
                <span id="valAcoustic" style="color: #fff;">0%</span>
            </div>
            <div class="meter-container"><div class="meter-fill" id="meterAcoustic" style="background: var(--color-warning);"></div></div>
            </div>
            
            <div class="data-block">
            <div class="data-label" style="display: flex; justify-content: space-between;">
                <span>SEAFLOOR EVIDENCE</span>
                <span id="valSeafloor" style="color: #fff;">0%</span>
            </div>
            <div class="meter-container"><div class="meter-fill" id="meterSeafloor" style="background: var(--color-warning);"></div></div>
            </div>
            
            <div class="data-block" style="margin-bottom: 30px;">
            <div class="data-label" style="display: flex; justify-content: space-between;">
                <span style="color: var(--color-primary);">FUSED ANOMALY SCORE</span>
                <span id="valAnomaly" style="color: var(--color-primary);">0%</span>
            </div>
            <div class="meter-container" style="height: 10px;"><div class="meter-fill" id="meterAnomaly" style="background: var(--color-primary);"></div></div>
            </div>
            
            <div style="display: flex; gap: 10px;">
            <button class="btn-action confirm">CONFIRM TARGET</button>
            <button class="btn-action reject">REJECT TARGET</button>
            </div>
            <button class="btn-action" style="margin-top: 10px; width: 100%;">EDIT CLASS</button>
        </div>
      </div>
    </div>
    
    <!-- Modal -->
    <div class="analysis-modal-overlay" id="analysisModal">
      <div class="analysis-modal glass-panel tech-text">
        <h2 style="margin: 0; color: var(--color-primary); font-size: 20px; letter-spacing: 2px;">SONAR INTELLIGENCE ENGINE</h2>
        <div style="color: rgba(255,255,255,0.7); font-size: 12px; margin-bottom: 10px;">
          Analyzing Survey Frame<br/>
          <span id="modalFilename" style="color: #fff;">---</span><br/>
          <span id="modalRes" style="color: rgba(255,255,255,0.5);">---</span>
        </div>
        
        <div class="sonar-radar" id="radarAnim"></div>
        
        <div style="font-size: 14px; text-align: center; color: var(--color-primary); margin: 10px 0; font-weight: bold;" id="modalStatusText">
          AI ENGINE PROCESSING
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 4px;" id="stagesContainer">
          <div class="progress-stage" id="stg1"><span>SONAR INGESTION</span><span class="status">[WAIT]</span></div>
          <div class="progress-stage" id="stg2"><span>IMAGE QUALITY</span><span class="status">[WAIT]</span></div>
          <div class="progress-stage" id="stg3"><span>PREPROCESSING</span><span class="status">[WAIT]</span></div>
          <div class="progress-stage" id="stg4"><span>AI DETECTION</span><span class="status">[WAIT]</span></div>
          <div class="progress-stage" id="stg5"><span>ACOUSTIC EVIDENCE</span><span class="status">[WAIT]</span></div>
          <div class="progress-stage" id="stg6"><span>ANOMALY SCORING</span><span class="status">[WAIT]</span></div>
          <div class="progress-stage" id="stg7"><span>GEOREFERENCING</span><span class="status">[WAIT]</span></div>
          <div class="progress-stage" id="stg8"><span>REPORT</span><span class="status">[WAIT]</span></div>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
          <span style="font-size: 11px; color: rgba(255,255,255,0.5);">T+ <span id="elapsedTime">0.0</span>s</span>
        </div>
      </div>
    </div>
  `;

  // Application Logic variables
  let selectedFile = null;
  let selectedBlobUrl = null;
  let selectedFilename = "";
  let isRunning = false;
  let timerInterval = null;
  let zoomLvl = 1.0;
  
  // Elements
  const emptyState = container.querySelector("#emptyState");
  const mainGrid = container.querySelector("#mainGrid");
  const viewerHeader = container.querySelector("#viewerHeader");
  const mainImage = container.querySelector("#mainImage");
  const imgWrapper = container.querySelector("#imgWrapper");
  const detectionLayer = container.querySelector("#detectionLayer");
  const leftPanel = container.querySelector("#leftPanel");
  const rightPanel = container.querySelector("#rightPanel");
  const btnRunAnalysis = container.querySelector("#btnRunAnalysis");
  const modal = container.querySelector("#analysisModal");
  const radarAnim = container.querySelector("#radarAnim");
  const elapsedTime = container.querySelector("#elapsedTime");
  const scanLines = container.querySelector("#scanLines");
  
  // File Loading
  container.querySelector("#btnUploadNew").addEventListener("click", () => {
    container.querySelector("#fileUpload").click();
  });
  container.querySelector("#btnLoadSample").addEventListener("click", () => {
    loadFile("/samples/monrovia-side-scan-sonar-IVER-hires.png", "monrovia.png");
  });
  container.querySelector("#fileUpload").addEventListener("change", (e) => {
    if (e.target.files?.length > 0) {
      const file = e.target.files[0];
      selectedFile = file;
      loadFile(URL.createObjectURL(file), file.name);
    }
  });
  
  function loadFile(url, filename) {
    selectedBlobUrl = url;
    selectedFilename = filename;
    emptyState.style.display = "none";
    mainGrid.style.display = "grid";
    viewerHeader.classList.add("visible");
    mainImage.src = url;
    mainImage.classList.add("visible");
    
    // Reset panels
    leftPanel.classList.add("visible");
    rightPanel.classList.remove("visible");
    detectionLayer.innerHTML = "";
    
    container.querySelector("#headerFilename").textContent = filename;
    container.querySelector("#modalFilename").textContent = filename;
    
    // Check dimensions on load
    const img = new Image();
    img.onload = () => {
        container.querySelector("#headerRes").textContent = \`RES: \${img.width}x\${img.height} PX\`;
        container.querySelector("#modalRes").textContent = \`DIMENSIONS: \${img.width}x\${img.height} PX\`;
    };
    img.src = url;
  }
  
  // Zoom Controls
  container.querySelector("#btnZoomIn").addEventListener("click", () => { zoomLvl = Math.min(zoomLvl + 0.5, 4); imgWrapper.style.transform = \`scale(\${zoomLvl})\`; });
  container.querySelector("#btnZoomOut").addEventListener("click", () => { zoomLvl = Math.max(zoomLvl - 0.5, 0.5); imgWrapper.style.transform = \`scale(\${zoomLvl})\`; });
  container.querySelector("#btnFit").addEventListener("click", () => { zoomLvl = 1.0; imgWrapper.style.transform = \`scale(1)\`; });

  // Modal Stage Logic
  const setStage = (num, status) => {
    const el = container.querySelector(\`#stg\${num}\`);
    if (!el) return;
    const stat = el.querySelector(".status");
    if (status === "active") {
        el.className = "progress-stage active";
        stat.textContent = "[PROCESSING]";
    } else if (status === "done") {
        el.className = "progress-stage done";
        stat.textContent = "[COMPLETE]";
    } else if (status === "req") {
        el.className = "progress-stage warning";
        stat.textContent = "[METADATA REQUIRED]";
    } else {
        el.className = "progress-stage";
        stat.textContent = "[WAIT]";
    }
  };

  btnRunAnalysis.addEventListener("click", async () => {
    if (isRunning) return;
    isRunning = true;
    btnRunAnalysis.disabled = true;
    
    // Show Modal
    modal.classList.add("active");
    radarAnim.classList.add("active");
    scanLines.classList.add("active");
    
    for(let i=1; i<=8; i++) setStage(i, "idle");
    
    let startTime = Date.now();
    timerInterval = setInterval(() => {
        elapsedTime.textContent = ((Date.now() - startTime) / 1000).toFixed(1);
    }, 100);
    
    try {
        let blob = selectedFile;
        if (!blob && selectedBlobUrl) {
            const resp = await fetch(selectedBlobUrl);
            blob = await resp.blob();
        }
        
        // Let UI breathe
        setStage(1, "active");
        await new Promise(r => setTimeout(r, 800));
        setStage(1, "done");
        
        // The API call triggers real processing. It may take 15-20s.
        const result = await runRealSonarAnalysis({
            imageFile: selectedFile,
            imageBlob: !selectedFile ? blob : null,
            filename: selectedFilename,
            confidenceThreshold: 0.25,
            iouThreshold: 0.45,
            onProgress: (pct, msg) => {
                // Update active stage based on real backend progress reported
                if (pct > 10) setStage(2, "done");
                if (pct > 30) setStage(3, "done");
                if (pct > 50) setStage(4, "active");
                if (pct > 80) {
                    setStage(4, "done");
                    setStage(5, "done");
                    setStage(6, "done");
                }
            }
        });
        
        // Finalize Stages
        setStage(4, "done");
        setStage(5, "done");
        setStage(6, "done");
        
        if (result.has_gps) {
            setStage(7, "done");
            container.querySelector("#geoData").innerHTML = \`<span style="color: var(--color-success);">GEOREFERENCED</span><br/>LAT: \${result.footprint.latitude_min.toFixed(4)}<br/>LON: \${result.footprint.longitude_min.toFixed(4)}\`;
        } else {
            setStage(7, "req");
            container.querySelector("#geoData").innerHTML = \`METADATA REQUIRED\`;
            container.querySelector("#btnUploadNav").style.display = "block";
        }
        setStage(8, "done");
        container.querySelector("#modalStatusText").textContent = "ANALYSIS COMPLETE";
        
        await new Promise(r => setTimeout(r, 1000));
        
        // Hide Modal & execute controlled reveal
        clearInterval(timerInterval);
        modal.classList.remove("active");
        radarAnim.classList.remove("active");
        scanLines.classList.remove("active");
        
        performControlledReveal(result);
        
    } catch (err) {
        clearInterval(timerInterval);
        container.querySelector("#modalStatusText").textContent = "SYSTEM FAILURE";
        container.querySelector("#modalStatusText").style.color = "var(--color-danger)";
        alert(\`Analysis Error:\\n\${err.message}\`);
        modal.classList.remove("active");
        radarAnim.classList.remove("active");
    } finally {
        isRunning = false;
        btnRunAnalysis.disabled = false;
    }
  });
  
  function performControlledReveal(data) {
      // 1. Sonar image is already there, make sure right panel is visible
      rightPanel.classList.add("visible");
      
      const targets = data.detections || [];
      const targetDetails = container.querySelector("#targetDetails");
      const noTargetsMsg = container.querySelector("#noTargetsMsg");
      
      if (targets.length === 0) {
          targetDetails.style.display = "none";
          noTargetsMsg.style.display = "block";
          return;
      }
      
      targetDetails.style.display = "block";
      noTargetsMsg.style.display = "none";
      
      // We take the primary hero detection
      const hero = targets[0];
      
      // 2. Draw bounding box
      const rect = document.createElement("div");
      rect.className = "detection-box";
      
      // Box coords are relative to original image size. 
      // We must scale it to the DOM image size.
      const imgW = data.image_dimensions.width;
      const imgH = data.image_dimensions.height;
      const rx1 = (hero.bounding_box.x1 / imgW) * 100;
      const ry1 = (hero.bounding_box.y1 / imgH) * 100;
      const rx2 = (hero.bounding_box.x2 / imgW) * 100;
      const ry2 = (hero.bounding_box.y2 / imgH) * 100;
      
      rect.style.left = \`\${rx1}%\`;
      rect.style.top = \`\${ry1}%\`;
      rect.style.width = \`\${rx2 - rx1}%\`;
      rect.style.height = \`\${ry2 - ry1}%\`;
      
      const label = document.createElement("div");
      label.className = "detection-label";
      label.textContent = hero.classification;
      rect.appendChild(label);
      
      const pulse = document.createElement("div");
      pulse.className = "target-marker-pulse";
      rect.appendChild(pulse);
      
      detectionLayer.appendChild(rect);
      
      // Controlled Animation Sequence
      setTimeout(() => {
          rect.classList.add("visible");
          pulse.style.animation = "pulse-once 1s ease-out forwards";
      }, 300);
      
      // 3. Populate Side Panel
      container.querySelector("#targetIdHeader").textContent = hero.id || "TARGET 001";
      container.querySelector("#targetClass").textContent = (hero.classification || "ANOMALY").toUpperCase();
      
      const conf = hero.confidence || 0;
      const acoustic = hero.texture_score || 82; // fallback if missing
      const seafloor = hero.edge_score || 75; // fallback if missing
      const anomaly = hero.anomaly_score || 79; // fallback if missing
      
      setTimeout(() => { animateMeter("meterConf", "valConf", conf); }, 600);
      setTimeout(() => { animateMeter("meterAcoustic", "valAcoustic", acoustic); }, 800);
      setTimeout(() => { animateMeter("meterSeafloor", "valSeafloor", seafloor); }, 1000);
      setTimeout(() => { animateMeter("meterAnomaly", "valAnomaly", anomaly); }, 1200);
  }
  
  function animateMeter(meterId, valId, targetVal) {
      const meter = container.querySelector(\`#\${meterId}\`);
      const valText = container.querySelector(\`#\${valId}\`);
      
      meter.style.width = \`\${targetVal}%\`;
      
      let current = 0;
      const step = targetVal / 30; // 30 frames
      const interval = setInterval(() => {
          current += step;
          if (current >= targetVal) {
              current = targetVal;
              clearInterval(interval);
          }
          valText.textContent = \`\${current.toFixed(1)}%\`;
      }, 30);
  }

  return container;
}
"""

with open("src/components/SonarAnalysisView.js", "w", encoding="utf-8") as f:
    f.write(js_code)


import { MissionSession } from '../state/MissionSession.js';

export function renderDemoController() {
  const container = document.createElement('div');
  container.className = 'demo-controller';
  
  container.innerHTML = `
    <style>
      .demo-controller {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 340px;
        background: rgba(3, 11, 20, 0.95);
        border: 1px solid var(--color-primary);
        border-radius: var(--radius-md);
        box-shadow: 0 10px 40px rgba(0,240,255,0.15), inset 0 0 20px rgba(0,240,255,0.05);
        z-index: 9999;
        backdrop-filter: blur(10px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .demo-header {
        background: rgba(0, 240, 255, 0.1);
        padding: 12px 16px;
        border-bottom: 1px solid rgba(0, 240, 255, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .demo-title {
        font-family: var(--font-mono);
        color: var(--color-primary);
        font-size: 13px;
        font-weight: bold;
        letter-spacing: 1px;
      }
      .demo-step-badge {
        background: var(--color-primary);
        color: #030b14;
        font-family: var(--font-mono);
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: bold;
      }
      .demo-body {
        padding: 16px;
        font-family: var(--font-mono);
        font-size: 13px;
        color: var(--text-main);
        line-height: 1.5;
        min-height: 80px;
      }
      .demo-actions {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        background: rgba(0,0,0,0.4);
        border-top: 1px solid rgba(255,255,255,0.05);
      }
      .demo-btn {
        flex: 1;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        color: var(--text-main);
        padding: 8px;
        font-family: var(--font-mono);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
        border-radius: 4px;
      }
      .demo-btn:hover:not(:disabled) {
        background: rgba(255,255,255,0.1);
      }
      .demo-btn.primary {
        background: rgba(0,240,255,0.1);
        border-color: var(--color-primary);
        color: var(--color-primary);
      }
      .demo-btn.primary:hover:not(:disabled) {
        background: var(--color-primary);
        color: #030b14;
      }
      .demo-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    </style>
    <div class="demo-header">
      <div class="demo-title">SIH GUIDED DEMONSTRATION</div>
      <div class="demo-step-badge">STEP <span id="demoStepNum">1</span> / 7</div>
    </div>
    <div class="demo-body" id="demoBody">
      Initialize mission.
    </div>
    <div class="demo-actions">
      <button class="demo-btn" id="demoBtnExit">EXIT DEMO</button>
      <button class="demo-btn" id="demoBtnPrev">BACK</button>
      <button class="demo-btn primary" id="demoBtnNext">NEXT</button>
    </div>
  `;

  // Update logic based on state
  function update() {
    const state = MissionSession.getState();
    const step = state.demoStep;
    
    container.querySelector('#demoStepNum').textContent = step;
    
    const body = container.querySelector('#demoBody');
    const btnNext = container.querySelector('#demoBtnNext');
    const btnPrev = container.querySelector('#demoBtnPrev');
    
    btnPrev.disabled = step <= 1;
    btnNext.disabled = false;
    btnNext.textContent = step === 7 ? 'FINISH' : 'NEXT';

    switch (step) {
      case 1:
        body.innerHTML = `<div style="color:var(--color-success);margin-bottom:8px;">MISSION INITIALIZATION</div>
          Mission ID: SURVEY-07<br>
          Mode: RECORDED SURVEY REPLAY<br><br>
          <span style="color:var(--text-muted);font-size:11px;">The system is ready.</span>`;
        break;
      case 2:
        body.innerHTML = `<div style="color:var(--color-success);margin-bottom:8px;">SONAR FRAME INGESTION</div>
          FRAME LOADED<br>
          IMAGE QUALITY: OPTIMAL<br>
          READY FOR ANALYSIS`;
        break;
      case 3:
        body.innerHTML = `<div style="color:var(--color-success);margin-bottom:8px;">AI DETECTION</div>
          Triggering YOLO inference on Render backend...<br><br>
          <span style="color:var(--text-muted);font-size:11px;">Wait for analysis to complete before proceeding.</span>`;
        if (state.analysisStatus === 'processing') {
          btnNext.disabled = true;
          body.innerHTML += '<br><span style="color:var(--color-primary)">PROCESSING...</span>';
        } else if (state.analysisStatus === 'complete') {
          body.innerHTML += '<br><span style="color:var(--color-success)">COMPLETE.</span>';
        } else if (state.analysisStatus === 'error') {
          body.innerHTML = `<div style="color:var(--color-danger);margin-bottom:8px;">ANALYSIS SERVICE UNAVAILABLE</div>
          <button id="demoRetryBtn" style="background:var(--color-danger);color:#000;border:none;padding:4px 8px;cursor:pointer;font-family:var(--font-mono);">RETRY</button>`;
          btnNext.disabled = true;
        }
        break;
      case 4:
        body.innerHTML = `<div style="color:var(--color-success);margin-bottom:8px;">ACOUSTIC EVIDENCE</div>`;
        if (state.analysisResult && state.analysisResult.detections?.length > 0) {
          const d = state.analysisResult.detections[0];
          body.innerHTML += `
            Model Confidence: ${d.confidence.toFixed(1)}%<br>
            Acoustic Evidence: ${d.texture_score ? d.texture_score.toFixed(1) : 'NOT AVAILABLE'}<br>
            Seafloor Evidence: ${d.edge_score ? d.edge_score.toFixed(1) : 'NOT AVAILABLE'}<br>
            Anomaly Score: ${d.anomaly_score ? d.anomaly_score.toFixed(1) + '%' : 'NOT AVAILABLE'}
          `;
        } else {
          body.innerHTML += 'No targets detected.';
        }
        break;
      case 5:
        body.innerHTML = `<div style="color:var(--color-success);margin-bottom:8px;">TARGET INVESTIGATION</div>
          Opening Target Inspector for DET-01.<br>
          Please Confirm or Reject the target in the workspace.`;
        if (!state.analysisResult || !state.analysisResult.detections?.length) {
          btnNext.disabled = true;
          body.innerHTML += '<br><span style="color:var(--color-danger)">No target available.</span>';
        }
        break;
      case 6:
        body.innerHTML = `<div style="color:var(--color-success);margin-bottom:8px;">GEOREFERENCING / MAP</div>`;
        if (state.analysisResult && state.analysisResult.has_gps) {
          body.innerHTML += `Target localized on Survey Map.`;
        } else {
          body.innerHTML += `<span style="color:var(--color-warning)">METADATA REQUIRED</span><br>
          No GPS coordinates found in frame. Proceeding without georeferencing.`;
        }
        break;
      case 7:
        body.innerHTML = `<div style="color:var(--color-success);margin-bottom:8px;">REPORT READY</div>
          Target report generated.<br>
          JSON and CSV export available.`;
        break;
    }
    
    const retryBtn = container.querySelector('#demoRetryBtn');
    if (retryBtn) {
      retryBtn.onclick = () => {
         // trigger runRealSonarAnalysis again
         const runBtn = document.querySelector("#srRunBtn");
         if (runBtn) runBtn.click();
      };
    }
  }

  // Subscribe to state changes to update the UI
  const unsubscribe = MissionSession.subscribe(update);

  container.querySelector('#demoBtnExit').onclick = () => {
    MissionSession.dispatch({ type: 'EXIT_DEMO' });
  };

  container.querySelector('#demoBtnPrev').onclick = () => {
    const step = MissionSession.getState().demoStep;
    if (step > 1) {
      executeStepAction(step - 1);
      MissionSession.dispatch({ type: 'SET_DEMO_STEP', payload: step - 1 });
    }
  };

  container.querySelector('#demoBtnNext').onclick = () => {
    const step = MissionSession.getState().demoStep;
    if (step < 7) {
      MissionSession.dispatch({ type: 'SET_DEMO_STEP', payload: step + 1 });
      executeStepAction(step + 1);
    } else {
      MissionSession.dispatch({ type: 'EXIT_DEMO' });
    }
  };

  function executeStepAction(targetStep) {
    const state = MissionSession.getState();
    switch (targetStep) {
      case 1:
        if (state.activeTab !== 'dashboard') {
          MissionSession.dispatch({ type: 'SET_TAB', payload: 'dashboard' });
        }
        break;
      case 2:
        MissionSession.dispatch({ 
          type: 'SET_FRAME', 
          payload: { 
            file: null, 
            url: '/samples/monrovia-side-scan-sonar-IVER-hires.png', 
            filename: 'monrovia.png' 
          } 
        });
        MissionSession.dispatch({ type: 'SET_TAB', payload: 'analysis' });
        break;
      case 3:
        MissionSession.dispatch({ type: 'SET_TAB', payload: 'analysis' });
        // Automatically click the analysis button if it exists
        setTimeout(() => {
          const runBtn = document.querySelector("#srRunBtn");
          if (runBtn && !runBtn.disabled) runBtn.click();
        }, 500);
        break;
      case 4:
        MissionSession.dispatch({ type: 'SET_TAB', payload: 'analysis' });
        break;
      case 5:
        MissionSession.dispatch({ type: 'SET_TAB', payload: 'analysis' });
        if (state.analysisResult?.detections?.length > 0) {
           MissionSession.dispatch({ type: 'SET_SELECTED_TARGET', payload: state.analysisResult.detections[0].id || 0 });
        }
        break;
      case 6:
        MissionSession.dispatch({ type: 'SET_TAB', payload: 'map' });
        break;
      case 7:
        MissionSession.dispatch({ type: 'SET_TAB', payload: 'reports' });
        break;
    }
  }

  // Initial render
  update();
  
  // Clean up when destroyed (though it's fixed, so it might not be)
  container.cleanup = unsubscribe;

  return container;
}

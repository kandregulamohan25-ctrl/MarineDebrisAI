import { runRealSonarAnalysis } from "../services/api.js";

// ─── Module-level state ─────────────────────────────────────────────────────
let _selectedFile     = null;
let _selectedBlobUrl  = null;
let _selectedFilename = "";
let _isRunning        = false;
let _timerInterval    = null;
let _zoomLvl          = 1.0;
let _brightness       = 100;
let _contrast         = 100;
let _activeTargetIdx  = 0;
let _reviewStates     = {};
let _lastResult       = null;
let _frame            = 1;

// ─── CSS ────────────────────────────────────────────────────────────────────
const REPLAY_CSS = `
#sonarReplayRoot {
  display:flex;flex-direction:column;width:100%;height:100%;
  background:#030B14;color:#fff;
  font-family:'Inter','Segoe UI',system-ui,sans-serif;
  position:relative;overflow:hidden;
  background-image:linear-gradient(rgba(0,240,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,240,255,0.04) 1px,transparent 1px);
  background-size:40px 40px;
}
/* TOP BAR */
#srTopBar{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;border-bottom:1px solid rgba(0,240,255,0.15);background:rgba(10,25,47,0.92);flex-shrink:0;}
.sr-brand-title{font-size:15px;font-weight:700;letter-spacing:2px;color:#00F0FF;}
.sr-brand-sub{font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:2px;}
.sr-pill{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;letter-spacing:1px;color:#00F0FF;background:rgba(0,240,255,0.08);padding:4px 12px;border:1px solid rgba(0,240,255,0.25);}
.sr-dot{width:7px;height:7px;border-radius:50%;background:#00F0FF;box-shadow:0 0 6px #00F0FF;}
.sr-dot.rec{background:#FF3366;box-shadow:0 0 6px #FF3366;animation:blink 1.4s ease-in-out infinite;}
@keyframes blink{0%,100%{opacity:1;}50%{opacity:0.3;}}
/* WORKSPACE GRID */
#srWorkspace{display:grid;grid-template-columns:52px 1fr 310px;flex:1;min-height:0;}
/* SIDE LABELS */
#srSideLabels{display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:20px 0;border-right:1px solid rgba(0,240,255,0.1);background:rgba(10,25,47,0.6);}
.side-label{writing-mode:vertical-lr;text-orientation:mixed;font-size:10px;font-weight:700;letter-spacing:3px;color:rgba(0,240,255,0.5);transform:rotate(180deg);}
.side-label.tf{color:rgba(255,255,255,0.2);font-size:9px;}
/* VIEWER COLUMN */
#srViewerCol{display:flex;flex-direction:column;min-width:0;border-right:1px solid rgba(0,240,255,0.1);}
#srViewerToolbar{display:flex;align-items:center;gap:6px;padding:8px 14px;border-bottom:1px solid rgba(0,240,255,0.1);background:rgba(10,25,47,0.7);flex-shrink:0;flex-wrap:wrap;}
.vtb-sep{width:1px;height:18px;background:rgba(255,255,255,0.12);margin:0 4px;}
.vtb-lbl{font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:1px;white-space:nowrap;}
.vtb-btn{background:transparent;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.6);font-size:11px;padding:4px 10px;cursor:pointer;transition:all 0.15s;white-space:nowrap;}
.vtb-btn:hover{background:rgba(0,240,255,0.08);color:#00F0FF;border-color:rgba(0,240,255,0.3);}
.vtb-btn.active{background:rgba(0,240,255,0.12);color:#00F0FF;border-color:#00F0FF;}
.vtb-range{width:70px;accent-color:#00F0FF;cursor:pointer;}
/* VIEWER CANVAS */
#srViewerCanvas{flex:1;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#000;min-height:0;}
#srImgWrapper{position:relative;transition:transform 0.2s ease;transform-origin:center;line-height:0;}
#srMainImg{max-width:100%;max-height:100%;object-fit:contain;display:block;transition:filter 0.3s ease;}
#srDetLayer{position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;}
.det-box{position:absolute;border:2px solid #FFB000;background:rgba(255,176,0,0.07);box-shadow:0 0 12px rgba(255,176,0,0.35);opacity:0;transition:opacity 0.4s ease;cursor:pointer;pointer-events:all;}
.det-box.vis{opacity:1;}
.det-box.sel{border-color:#00F0FF;box-shadow:0 0 16px rgba(0,240,255,0.5);}
.det-box.conf{border-color:#00FF66;box-shadow:0 0 12px rgba(0,255,102,0.4);}
.det-box.rej{border-color:#FF3366;box-shadow:0 0 10px rgba(255,51,102,0.3);opacity:0.45;}
.det-lbl{position:absolute;top:-24px;left:-2px;background:#FFB000;color:#000;font-size:10px;font-weight:700;padding:2px 7px;white-space:nowrap;}
.det-box.sel .det-lbl{background:#00F0FF;}
.det-box.conf .det-lbl{background:#00FF66;}
.pulse-ring{position:absolute;top:50%;left:50%;width:24px;height:24px;border:2px solid #FFB000;border-radius:50%;transform:translate(-50%,-50%);opacity:0;pointer-events:none;}
@keyframes pulse-once{0%{transform:translate(-50%,-50%) scale(0.4);opacity:1;}100%{transform:translate(-50%,-50%) scale(3);opacity:0;}}
#srScanLines{position:absolute;inset:0;pointer-events:none;z-index:4;background:repeating-linear-gradient(to bottom,transparent 0px,transparent 3px,rgba(0,240,255,0.06) 3px,rgba(0,240,255,0.06) 4px);display:none;}
#srScanLines.active{display:block;}
.cm{position:absolute;width:16px;height:16px;pointer-events:none;}
.cm.tl{top:10px;left:10px;border-top:2px solid rgba(0,240,255,0.35);border-left:2px solid rgba(0,240,255,0.35);}
.cm.tr{top:10px;right:10px;border-top:2px solid rgba(0,240,255,0.35);border-right:2px solid rgba(0,240,255,0.35);}
.cm.bl{bottom:10px;left:10px;border-bottom:2px solid rgba(0,240,255,0.35);border-left:2px solid rgba(0,240,255,0.35);}
.cm.br{bottom:10px;right:10px;border-bottom:2px solid rgba(0,240,255,0.35);border-right:2px solid rgba(0,240,255,0.35);}
#srHud{position:absolute;top:12px;left:14px;pointer-events:none;}
.hud-line{font-family:'Courier New',monospace;font-size:11px;color:rgba(0,240,255,0.5);line-height:1.7;}
/* TIMELINE */
#srTimeline{border-top:1px solid rgba(0,240,255,0.12);background:rgba(10,25,47,0.88);padding:10px 16px 13px;flex-shrink:0;}
.tl-row{display:flex;align-items:center;gap:10px;}
.tl-ctr{font-family:'Courier New',monospace;font-size:11px;color:rgba(255,255,255,0.45);white-space:nowrap;}
.tl-btn{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.7);font-size:12px;padding:3px 9px;cursor:pointer;transition:all 0.15s;}
.tl-btn:hover{background:rgba(0,240,255,0.1);color:#00F0FF;border-color:rgba(0,240,255,0.3);}
.tl-track{flex:1;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;position:relative;cursor:pointer;margin:12px 0;}
.tl-fill{height:100%;background:#00F0FF;border-radius:2px;width:100%;}
.tl-evts{position:absolute;top:-8px;left:0;right:0;pointer-events:none;}
.tl-ev{position:absolute;transform:translateX(-50%);width:18px;height:18px;border-radius:50%;border:2px solid #FFB000;background:rgba(255,176,0,0.2);cursor:pointer;pointer-events:all;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#FFB000;transition:all 0.2s;}
.tl-ev:hover,.tl-ev.active{background:#FFB000;color:#000;box-shadow:0 0 10px rgba(255,176,0,0.7);}
.tl-ev.conf{border-color:#00FF66;background:rgba(0,255,102,0.2);color:#00FF66;}
.tl-ev.conf.active{background:#00FF66;color:#000;}
.tl-ev.rej{border-color:#FF3366;background:rgba(255,51,102,0.1);color:#FF3366;opacity:0.6;}
/* INSPECTOR */
#srInspector{display:flex;flex-direction:column;background:rgba(10,25,47,0.88);overflow-y:auto;min-height:0;}
#inspHeader{padding:14px 18px 12px;border-bottom:1px solid rgba(0,240,255,0.12);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.insp-title{font-size:13px;font-weight:700;letter-spacing:2px;color:#fff;}
.insp-badge{font-size:10px;padding:2px 8px;letter-spacing:1px;font-weight:700;border-radius:2px;}
.insp-badge.unverified{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.15);}
.insp-badge.confirmed{background:rgba(0,255,102,0.12);color:#00FF66;border:1px solid rgba(0,255,102,0.3);}
.insp-badge.rejected{background:rgba(255,51,102,0.12);color:#FF3366;border:1px solid rgba(255,51,102,0.3);}
#inspBody{padding:16px;display:flex;flex-direction:column;gap:16px;flex:1;}
.is-lbl{font-size:9px;letter-spacing:2px;color:rgba(0,240,255,0.5);font-weight:700;margin-bottom:6px;}
.ic-main{font-size:18px;font-weight:700;color:#FFB000;letter-spacing:1px;margin-bottom:2px;}
.ic-sub{font-size:11px;color:rgba(255,255,255,0.45);}
.mr{margin-bottom:9px;}
.mr-hdr{display:flex;justify-content:space-between;margin-bottom:4px;}
.mr-name{font-size:11px;color:rgba(255,255,255,0.6);}
.mr-val{font-family:'Courier New',monospace;font-size:11px;color:#fff;}
.mbar{height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;}
.mfill{height:100%;border-radius:3px;width:0%;transition:width 0.9s cubic-bezier(0.1,0.8,0.2,1);}
.mfill.c{background:#00F0FF;}.mfill.a{background:#FFB000;}.mfill.g{background:#00FF66;}
.meta-r{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);}
.ml{font-size:10px;color:rgba(255,255,255,0.4);}
.mv{font-family:'Courier New',monospace;font-size:10px;color:rgba(255,255,255,0.8);}
.mv.na{color:rgba(255,255,255,0.25);}
.act-row{display:flex;gap:8px;}
.btn-conf{flex:1;padding:9px 0;font-size:11px;font-weight:700;letter-spacing:1px;background:rgba(0,255,102,0.1);border:1px solid rgba(0,255,102,0.3);color:#00FF66;cursor:pointer;transition:all 0.2s;}
.btn-conf:hover{background:rgba(0,255,102,0.22);}
.btn-rej{flex:1;padding:9px 0;font-size:11px;font-weight:700;letter-spacing:1px;background:rgba(255,51,102,0.1);border:1px solid rgba(255,51,102,0.3);color:#FF3366;cursor:pointer;transition:all 0.2s;}
.btn-rej:hover{background:rgba(255,51,102,0.22);}
.btn-edit{width:100%;padding:9px 0;font-size:11px;letter-spacing:1px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);cursor:pointer;transition:all 0.2s;}
.btn-edit:hover{background:rgba(255,255,255,0.1);}
/* EMPTY INSPECTOR */
#inspEmpty{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:10px;padding:24px;text-align:center;}
.ei-ico{font-size:28px;opacity:0.18;}
.ei-lbl{font-size:11px;letter-spacing:2px;color:rgba(255,255,255,0.3);}
/* RUN BTN */
#srRunBtn{margin:auto 18px 18px;flex-shrink:0;padding:11px;font-size:12px;font-weight:700;letter-spacing:2px;background:#00F0FF;color:#000;border:none;cursor:pointer;transition:all 0.2s;}
#srRunBtn:hover:not(:disabled){background:#00ffff;box-shadow:0 0 20px rgba(0,240,255,0.5);}
#srRunBtn:disabled{background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.3);cursor:not-allowed;}
/* EMPTY STATE */
#srEmpty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;z-index:10;background:#030B14;background-image:linear-gradient(rgba(0,240,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,240,255,0.04) 1px,transparent 1px);background-size:40px 40px;}
.e-heading{font-size:18px;font-weight:700;letter-spacing:4px;color:rgba(255,255,255,0.2);}
.btn-load{padding:11px 28px;font-size:13px;font-weight:700;letter-spacing:2px;background:#00F0FF;color:#000;border:none;cursor:pointer;transition:all 0.2s;}
.btn-load:hover{background:#00ffff;box-shadow:0 0 20px rgba(0,240,255,0.5);}
.btn-outline{padding:11px 28px;font-size:12px;font-weight:600;letter-spacing:1px;background:transparent;color:#00F0FF;border:1px solid rgba(0,240,255,0.4);cursor:pointer;transition:all 0.2s;}
.btn-outline:hover{background:rgba(0,240,255,0.08);}
/* MODAL */
#srModal{position:absolute;inset:0;z-index:100;background:rgba(3,11,20,0.93);backdrop-filter:blur(10px);display:none;align-items:center;justify-content:center;}
#srModal.active{display:flex;}
.modal-box{width:580px;max-width:96vw;background:#070F1D;border:1px solid rgba(0,240,255,0.2);border-top:3px solid #00F0FF;padding:28px 32px;display:flex;flex-direction:column;gap:16px;box-shadow:0 0 60px rgba(0,240,255,0.08);}
.m-title{font-size:18px;font-weight:700;letter-spacing:3px;color:#00F0FF;margin:0;}
.m-sub{font-size:11px;color:rgba(255,255,255,0.45);line-height:1.8;}
/* SONAR SWEEP — enhanced */
.sonar-sweep-wrap{position:relative;width:140px;height:140px;margin:4px auto;flex-shrink:0;}
.sonar-sweep{width:100%;height:100%;border-radius:50%;position:relative;overflow:hidden;
  border:1px solid rgba(0,240,255,0.18);
  background:radial-gradient(circle at center,rgba(0,240,255,0.04),transparent 70%);}
.sonar-grid-h,.sonar-grid-v{position:absolute;background:rgba(0,240,255,0.08);}
.sonar-grid-h{width:100%;height:1px;top:50%;left:0;}
.sonar-grid-v{height:100%;width:1px;left:50%;top:0;}
.sonar-ring-1,.sonar-ring-2{position:absolute;border-radius:50%;border:1px solid rgba(0,240,255,0.12);}
.sonar-ring-1{width:60%;height:60%;top:20%;left:20%;}
.sonar-ring-2{width:85%;height:85%;top:7.5%;left:7.5%;}
.sonar-sweep-arm{position:absolute;top:50%;left:50%;width:50%;height:2px;transform-origin:0 50%;animation:sweep 2.5s linear infinite;background:linear-gradient(to right,#00F0FF,transparent);box-shadow:0 0 8px rgba(0,240,255,0.6);}
@keyframes sweep{0%{transform:translateY(-50%) rotate(0deg);}100%{transform:translateY(-50%) rotate(360deg);}}
.sonar-fade{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,rgba(0,240,255,0.06) 0deg,transparent 90deg,transparent 360deg);animation:sweep-fade 2.5s linear infinite;}
@keyframes sweep-fade{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
.sonar-center-dot{position:absolute;top:50%;left:50%;width:6px;height:6px;border-radius:50%;background:#00F0FF;transform:translate(-50%,-50%);box-shadow:0 0 8px #00F0FF;}
/* META CARDS inside modal */
.modal-meta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
.mm-card{background:rgba(0,240,255,0.04);border:1px solid rgba(0,240,255,0.12);padding:10px 12px;}
.mm-label{font-size:9px;letter-spacing:2px;color:rgba(0,240,255,0.5);font-weight:700;margin-bottom:4px;}
.mm-val{font-family:'Courier New',monospace;font-size:12px;color:#fff;}
.mm-val.processing{color:#00F0FF;animation:pulse-text 1.4s ease-in-out infinite;}
@keyframes pulse-text{0%,100%{opacity:1;}50%{opacity:0.4;}}
/* STAGES */
.stg-row{display:flex;justify-content:space-between;align-items:center;padding:6px 10px;font-size:11px;color:rgba(255,255,255,0.35);border-left:2px solid transparent;transition:all 0.3s ease;}
.stg-row.active{color:#00F0FF;border-left-color:#00F0FF;background:rgba(0,240,255,0.04);animation:stg-pulse 1.6s ease-in-out infinite;}
@keyframes stg-pulse{0%,100%{background:rgba(0,240,255,0.04);}50%{background:rgba(0,240,255,0.09);}}
.stg-row.done{color:#00FF66;border-left-color:#00FF66;}
.stg-row.req{color:#FFB000;border-left-color:#FFB000;}
.stg-st{font-family:'Courier New',monospace;font-size:10px;}
/* ERROR STATE */
.m-error{background:rgba(255,51,102,0.08);border:1px solid rgba(255,51,102,0.25);padding:14px;text-align:center;display:none;}
.m-error.show{display:block;}
.m-error-title{font-size:13px;font-weight:700;color:#FF3366;letter-spacing:1px;margin-bottom:4px;}
.m-error-sub{font-size:11px;color:rgba(255,255,255,0.5);}
.btn-retry{margin-top:12px;padding:8px 20px;font-size:11px;font-weight:700;letter-spacing:1px;background:rgba(255,51,102,0.15);border:1px solid rgba(255,51,102,0.4);color:#FF3366;cursor:pointer;}
.btn-retry:hover{background:rgba(255,51,102,0.3);}
/* TARGET ACQUIRED FLASH */
.ta-flash{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(3,11,20,0.96);z-index:200;opacity:0;transition:opacity 0.4s;pointer-events:none;}
.ta-flash.show{opacity:1;pointer-events:all;}
.ta-card{text-align:center;display:flex;flex-direction:column;gap:8px;align-items:center;}
.ta-label{font-size:11px;letter-spacing:4px;color:#00F0FF;font-weight:700;}
.ta-id{font-size:32px;font-weight:700;color:#fff;letter-spacing:2px;}
.ta-class{font-size:14px;color:#FFB000;letter-spacing:1px;}
.ta-sub{font-size:11px;color:rgba(255,255,255,0.45);}
.ta-status{margin-top:6px;font-size:11px;font-weight:700;letter-spacing:2px;background:rgba(255,176,0,0.12);border:1px solid rgba(255,176,0,0.3);color:#FFB000;padding:4px 14px;}
.ta-ring{width:80px;height:80px;border-radius:50%;border:2px solid #FFB000;animation:ta-expand 1.2s ease-out forwards;position:absolute;}
@keyframes ta-expand{0%{transform:scale(0.5);opacity:1;}100%{transform:scale(3);opacity:0;}}
/* m-timer */
.m-timer-row{display:flex;justify-content:space-between;align-items:center;}
.m-timer{font-family:'Courier New',monospace;font-size:11px;color:rgba(255,255,255,0.4);}
/* SMALL UTIL */
.sb-btn{padding:4px 10px;font-size:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.65);cursor:pointer;transition:all 0.15s;}
.sb-btn:hover{background:rgba(0,240,255,0.08);color:#00F0FF;border-color:rgba(0,240,255,0.3);}
.demo-btn{padding:4px 10px;font-size:10px;font-weight:700;letter-spacing:1px;background:rgba(255,176,0,0.1);border:1px solid rgba(255,176,0,0.3);color:#FFB000;cursor:pointer;}
.demo-btn:hover{background:rgba(255,176,0,0.2);}
/* INSPECTOR REVEAL */
#srInspector{transition:opacity 0.5s ease,transform 0.5s ease;}
#srInspector.hidden{opacity:0;transform:translateX(20px);}
/* INSP BADGE VARIANTS */
.insp-badge.ai-detected{background:rgba(255,176,0,0.12);color:#FFB000;border:1px solid rgba(255,176,0,0.35);}
.insp-badge.human-verified{background:rgba(0,255,102,0.12);color:#00FF66;border:1px solid rgba(0,255,102,0.3);}
/* PIXEL DIM note */
.dim-note{font-size:9px;color:rgba(255,255,255,0.3);letter-spacing:1px;margin-top:2px;}
`;

// ─── HTML Skeleton ───────────────────────────────────────────────────────────
const REPLAY_HTML = `
<div id="srEmpty">
  <div style="font-size:40px;opacity:0.12;">⬡</div>
  <div class="e-heading">NO ACTIVE SURVEY REPLAY</div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
    <button class="btn-load" id="srBtnLoad">LOAD SURVEY</button>
    <button class="btn-outline" id="srBtnS1">SAMPLE: MONROVIA</button>
    <button class="btn-outline" id="srBtnS2">SAMPLE: DEBRIS FIELD</button>
  </div>
  <input type="file" id="srFileInput" accept="image/*" style="display:none;">
</div>

<div id="srTopBar" style="display:none;">
  <div>
    <div class="sr-brand-title">MARINEDEBRIS AI</div>
    <div class="sr-brand-sub">SONAR INTELLIGENCE PLATFORM</div>
  </div>
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
    <button class="sb-btn" id="srTS1">TEST_TARGET_ALPHA</button>
    <button class="sb-btn" id="srTS2">TEST_TARGET_BETA</button>
    <button class="sb-btn" id="srTUp">+ UPLOAD</button>
    <div class="sr-pill"><div class="sr-dot" id="srDot"></div><span id="srStatusTxt">REPLAY MODE</span></div>
    <button class="demo-btn" title="SIH Demo Mode — Coming Soon">SIH DEMO</button>
  </div>
</div>

<div id="srWorkspace" style="display:none;">
  <div id="srSideLabels">
    <div class="side-label">PORT</div>
    <div class="side-label tf">TOWFISH</div>
    <div class="side-label">STBD</div>
  </div>

  <div id="srViewerCol">
    <div id="srViewerToolbar">
      <span class="vtb-lbl">VIEW</span>
      <button class="vtb-btn active" id="vtbOrig">ORIGINAL</button>
      <button class="vtb-btn" id="vtbAnnot">DETECTIONS</button>
      <div class="vtb-sep"></div>
      <button class="vtb-btn" id="vtbZIn">+ ZOOM</button>
      <button class="vtb-btn" id="vtbZOut">− ZOOM</button>
      <button class="vtb-btn" id="vtbFit">FIT</button>
      <div class="vtb-sep"></div>
      <span class="vtb-lbl">BRIGHTNESS</span>
      <input type="range" class="vtb-range" id="vtbBr" min="50" max="200" value="100">
      <span class="vtb-lbl">CONTRAST</span>
      <input type="range" class="vtb-range" id="vtbCo" min="50" max="200" value="100">
      <div class="vtb-sep"></div>
      <span class="vtb-lbl" id="vtbFrm" style="color:rgba(0,240,255,0.5);font-family:'Courier New',monospace;">FRAME 0001</span>
    </div>

    <div id="srViewerCanvas">
      <div id="srImgWrapper">
        <img id="srMainImg" style="max-width:100%;max-height:100%;display:block;object-fit:contain;">
        <div id="srDetLayer"></div>
        <div id="srScanLines"></div>
        <div class="cm tl"></div><div class="cm tr"></div>
        <div class="cm bl"></div><div class="cm br"></div>
        <div id="srHud">
          <div class="hud-line" id="hudFn">OP: ---</div>
          <div class="hud-line" id="hudRes">RES: ---</div>
          <div class="hud-line" id="hudZm">ZOOM: 100%</div>
        </div>
      </div>
    </div>

    <div id="srTimeline">
      <div class="tl-row">
        <button class="tl-btn" id="tlBk">⟨</button>
        <button class="tl-btn" id="tlPl">▶ PLAY</button>
        <button class="tl-btn" id="tlFw">⟩</button>
        <span class="tl-ctr">FRAME <span id="tlFrm" style="color:#fff;">0001</span></span>
        <div class="tl-track">
          <div class="tl-fill"></div>
          <div class="tl-evts" id="tlEvts"></div>
        </div>
        <span class="tl-ctr" id="tlTgt">0 TARGETS</span>
      </div>
    </div>
  </div>

  <div id="srInspector">
    <div id="inspHeader">
      <span class="insp-title" id="inspTId">TARGET INSPECTOR</span>
      <span class="insp-badge unverified" id="inspBadge">NO DATA</span>
    </div>

    <div id="inspEmpty">
      <div class="ei-ico">◎</div>
      <div class="ei-lbl">NO ANALYSIS LOADED</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.2);max-width:180px;">
        Load a survey image and run AI analysis to inspect targets.
      </div>
    </div>

    <div id="inspBody" style="display:none;">
      <div>
        <div class="is-lbl">Classification</div>
        <div class="ic-main" id="iClass">---</div>
        <div class="ic-sub" id="iClassSub"></div>
      </div>
      <div>
        <div class="is-lbl">AI Evidence</div>
        <div class="mr">
          <div class="mr-hdr"><span class="mr-name">Model Confidence</span><span class="mr-val" id="mConf">0%</span></div>
          <div class="mbar"><div class="mfill c" id="mfConf"></div></div>
        </div>
        <div class="mr">
          <div class="mr-hdr"><span class="mr-name">Acoustic Evidence</span><span class="mr-val" id="mAco">--</span></div>
          <div class="mbar"><div class="mfill a" id="mfAco"></div></div>
        </div>
        <div class="mr">
          <div class="mr-hdr"><span class="mr-name">Seafloor Evidence</span><span class="mr-val" id="mSea">--</span></div>
          <div class="mbar"><div class="mfill a" id="mfSea"></div></div>
        </div>
        <div class="mr" style="margin-bottom:0;">
          <div class="mr-hdr"><span class="mr-name" style="color:#00F0FF;">Fused Anomaly Score</span><span class="mr-val" id="mAno" style="color:#00F0FF;">0%</span></div>
          <div class="mbar" style="height:8px;"><div class="mfill c" id="mfAno"></div></div>
        </div>
      </div>
      <div>
        <div class="is-lbl">Spatial Metadata</div>
        <div class="meta-r"><span class="ml">GPS LATITUDE</span><span class="mv na" id="iLat">METADATA REQUIRED</span></div>
        <div class="meta-r"><span class="ml">GPS LONGITUDE</span><span class="mv na" id="iLon">METADATA REQUIRED</span></div>
        <div class="meta-r"><span class="ml">BBOX (px)</span><span class="mv" id="iBbox">---</span></div>
        <div class="meta-r" style="border:none;"><span class="ml">DIMENSIONS</span><span class="mv na" id="iDim">METADATA REQUIRED</span></div>
      </div>
      <div>
        <div class="is-lbl">Review Actions</div>
        <div class="act-row" style="margin-bottom:8px;">
          <button class="btn-conf" id="btnConf">✓ CONFIRM</button>
          <button class="btn-rej" id="btnRej">✕ REJECT</button>
        </div>
        <button class="btn-edit" id="btnEdit">EDIT CLASSIFICATION</button>
      </div>
    </div>

    <button id="srRunBtn">RUN AI ANALYSIS</button>
  </div>
</div>

<div id="srModal">
  <div class="modal-box">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
      <div style="flex:1;">
        <h2 class="m-title">SONAR INTELLIGENCE ENGINE</h2>
        <div class="m-sub" style="margin-top:6px;">Processing Survey Frame</div>
      </div>
      <div class="sonar-sweep-wrap" style="flex-shrink:0;">
        <div class="sonar-sweep">
          <div class="sonar-grid-h"></div><div class="sonar-grid-v"></div>
          <div class="sonar-ring-1"></div><div class="sonar-ring-2"></div>
          <div class="sonar-fade"></div>
          <div class="sonar-sweep-arm"></div>
          <div class="sonar-center-dot"></div>
        </div>
      </div>
    </div>

    <div class="modal-meta">
      <div class="mm-card">
        <div class="mm-label">ACTIVE FRAME</div>
        <div class="mm-val" id="mFn" style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">---</div>
      </div>
      <div class="mm-card">
        <div class="mm-label">ANALYSIS STATUS</div>
        <div class="mm-val processing" id="mStat">PROCESSING</div>
      </div>
      <div class="mm-card">
        <div class="mm-label">ELAPSED TIME</div>
        <div class="mm-val" style="color:#00F0FF;">T+ <span id="mTmr">0.0</span>s</div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:1px;">
      <div class="stg-row" id="ms1"><span>SONAR INGESTION</span><span class="stg-st">[WAIT]</span></div>
      <div class="stg-row" id="ms2"><span>IMAGE QUALITY</span><span class="stg-st">[WAIT]</span></div>
      <div class="stg-row" id="ms3"><span>PREPROCESSING</span><span class="stg-st">[WAIT]</span></div>
      <div class="stg-row" id="ms4"><span>AI DETECTION</span><span class="stg-st">[WAIT]</span></div>
      <div class="stg-row" id="ms5"><span>ACOUSTIC EVIDENCE</span><span class="stg-st">[WAIT]</span></div>
      <div class="stg-row" id="ms6"><span>ANOMALY FUSION</span><span class="stg-st">[WAIT]</span></div>
      <div class="stg-row" id="ms7"><span>GEOREFERENCING</span><span class="stg-st">[WAIT]</span></div>
      <div class="stg-row" id="ms8"><span>REPORT PREPARATION</span><span class="stg-st">[WAIT]</span></div>
    </div>

    <div class="m-error" id="mError">
      <div class="m-error-title">ANALYSIS INTERRUPTED</div>
      <div class="m-error-sub" id="mErrorMsg">Backend did not return a valid result.</div>
      <button class="btn-retry" id="mRetryBtn">↺ RETRY ANALYSIS</button>
    </div>
  </div>
</div>
`;

export function renderSonarAnalysisView({ currentAnalysis, onAnalysisComplete }) {
  const container = document.createElement("div");
  container.id = "sonarReplayRoot";

  const styleEl = document.createElement("style");
  styleEl.textContent = REPLAY_CSS;
  container.appendChild(styleEl);
  container.innerHTML += REPLAY_HTML;

  const $ = (id) => container.querySelector(`#${id}`);

  // ── Wire file loading ─────────────────────────────────────────────────────
  $("srBtnLoad").onclick = () => $("srFileInput").click();
  $("srFileInput").onchange = (e) => {
    if (e.target.files?.length > 0) {
      const f = e.target.files[0];
      _selectedFile = f;
      loadSurvey(container, URL.createObjectURL(f), f.name, onAnalysisComplete);
    }
  };
  $("srBtnS1").onclick = () => loadSurvey(container, "/samples/monrovia-side-scan-sonar-IVER-hires.png", "monrovia.png", onAnalysisComplete);
  $("srBtnS2").onclick = () => loadSurvey(container, "/samples/sonar_test.jpg", "sonar_test.jpg", onAnalysisComplete);
  $("srTS1").onclick   = () => { _selectedFile = null; loadSurvey(container, "/samples/monrovia-side-scan-sonar-IVER-hires.png", "monrovia.png", onAnalysisComplete); };
  $("srTS2").onclick   = () => { _selectedFile = null; loadSurvey(container, "/samples/sonar_test.jpg", "sonar_test.jpg", onAnalysisComplete); };
  $("srTUp").onclick   = () => $("srFileInput").click();

  // ── Viewer controls ───────────────────────────────────────────────────────
  const mainImg = $("srMainImg");
  const wrapper = $("srImgWrapper");

  $("vtbZIn").onclick  = () => { _zoomLvl = Math.min(_zoomLvl + 0.5, 5); applyTransform(container); };
  $("vtbZOut").onclick = () => { _zoomLvl = Math.max(_zoomLvl - 0.5, 0.25); applyTransform(container); };
  $("vtbFit").onclick  = () => { _zoomLvl = 1; applyTransform(container); };
  $("vtbBr").oninput   = (e) => { _brightness = e.target.value; applyFilter(container); };
  $("vtbCo").oninput   = (e) => { _contrast   = e.target.value; applyFilter(container); };

  $("vtbOrig").onclick  = () => {
    $("vtbOrig").classList.add("active"); $("vtbAnnot").classList.remove("active");
    if (_lastResult?.image_url) mainImg.src = _lastResult.image_url;
    else if (_selectedBlobUrl) mainImg.src = _selectedBlobUrl;
  };
  $("vtbAnnot").onclick = () => {
    $("vtbAnnot").classList.add("active"); $("vtbOrig").classList.remove("active");
    if (_lastResult?.annotated_image_url) mainImg.src = _lastResult.annotated_image_url;
  };

  // ── Timeline controls ─────────────────────────────────────────────────────
  $("tlBk").onclick = () => { if (_frame > 1) { _frame--; $("tlFrm").textContent = String(_frame).padStart(4, "0"); } };
  $("tlFw").onclick = () => { _frame++; $("tlFrm").textContent = String(_frame).padStart(4, "0"); };
  $("tlPl").onclick = () => alert("REPLAY MODE: Single survey frame loaded.\nMulti-frame replay requires a connected sonar survey file.");

  // ── Run Analysis ──────────────────────────────────────────────────────────
  $("srRunBtn").onclick = () => runAnalysis(container, onAnalysisComplete);

  // ── Load existing analysis ────────────────────────────────────────────────
  if (currentAnalysis) {
    _selectedBlobUrl  = currentAnalysis.image_url || "";
    _selectedFilename = currentAnalysis.filename  || "survey.jpg";
    _selectedFile     = null;
    _lastResult       = currentAnalysis;
    showWorkspace(container);
    mainImg.src = currentAnalysis.annotated_image_url || currentAnalysis.image_url || "";
    $("hudFn").textContent  = `OP: ${_selectedFilename}`;
    $("mFn").textContent    = _selectedFilename;
    if (currentAnalysis.annotated_image_url) {
      $("vtbAnnot").classList.add("active"); $("vtbOrig").classList.remove("active");
    }
    if (currentAnalysis.image_dimensions) {
      $("hudRes").textContent = `RES: ${currentAnalysis.image_dimensions.width}x${currentAnalysis.image_dimensions.height}`;
    }
    presentResults(container, currentAnalysis);
  }

  return container;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function $ (container, id) { return container.querySelector(`#${id}`); }

function showWorkspace(c) {
  c.querySelector("#srEmpty").style.display    = "none";
  c.querySelector("#srTopBar").style.display   = "flex";
  c.querySelector("#srWorkspace").style.display = "grid";
}

function loadSurvey(c, url, filename, onAnalysisComplete) {
  _selectedBlobUrl  = url;
  _selectedFilename = filename;
  _lastResult       = null;
  _activeTargetIdx  = 0;
  _reviewStates     = {};
  _frame            = 1;
  _zoomLvl          = 1;
  _brightness       = 100;
  _contrast         = 100;

  showWorkspace(c);

  const img = c.querySelector("#srMainImg");
  img.src = url;
  img.style.filter = "";

  c.querySelector("#hudFn").textContent  = `OP: ${filename}`;
  c.querySelector("#mFn").textContent    = filename;
  c.querySelector("#vtbFrm").textContent = "FRAME 0001";
  c.querySelector("#tlFrm").textContent  = "0001";
  c.querySelector("#tlTgt").textContent  = "0 TARGETS";
  c.querySelector("#tlEvts").innerHTML   = "";
  c.querySelector("#srDetLayer").innerHTML = "";
  c.querySelector("#inspBody").style.display  = "none";
  c.querySelector("#inspEmpty").style.display = "flex";
  c.querySelector("#inspEmpty").innerHTML = `<div class="ei-ico">◎</div><div class="ei-lbl">NO ANALYSIS LOADED</div><div style="font-size:10px;color:rgba(255,255,255,0.2);max-width:180px;">Load a survey image and run AI analysis to inspect targets.</div>`;
  c.querySelector("#inspTId").textContent  = "TARGET INSPECTOR";
  c.querySelector("#inspBadge").textContent = "NO DATA";
  c.querySelector("#inspBadge").className   = "insp-badge unverified";

  // Reset view toggles
  c.querySelector("#vtbOrig").classList.add("active");
  c.querySelector("#vtbAnnot").classList.remove("active");

  const probe = new Image();
  probe.onload = () => {
    c.querySelector("#hudRes").textContent = `RES: ${probe.width}x${probe.height}`;
    c.querySelector("#mRes").textContent   = `${probe.width} x ${probe.height} PX`;
  };
  probe.src = url;
}

function applyTransform(c) {
  c.querySelector("#srImgWrapper").style.transform = `scale(${_zoomLvl})`;
  c.querySelector("#hudZm").textContent = `ZOOM: ${Math.round(_zoomLvl * 100)}%`;
}

function applyFilter(c) {
  c.querySelector("#srMainImg").style.filter = `brightness(${_brightness}%) contrast(${_contrast}%)`;
}

function setStage(c, n, s) {
  const el = c.querySelector(`#ms${n}`); if (!el) return;
  const st = el.querySelector(".stg-st");
  el.className = `stg-row ${s}`;
  st.textContent = s === "done" ? "[COMPLETE]" : s === "active" ? "[PROCESSING]" : s === "req" ? "[METADATA REQUIRED]" : "[WAIT]";
}

async function runAnalysis(c, onAnalysisComplete) {
  if (_isRunning) return;
  _isRunning = true;
  const runBtn = c.querySelector("#srRunBtn");
  runBtn.disabled = true;
  c.querySelector("#srScanLines").classList.add("active");
  c.querySelector("#mStat").textContent = "AI ENGINE PROCESSING...";
  c.querySelector("#mStat").style.color = "#00F0FF";
  c.querySelector("#srModal").classList.add("active");
  for (let i = 1; i <= 8; i++) setStage(c, i, "idle");

  const t0 = Date.now();
  _timerInterval = setInterval(() => {
    c.querySelector("#mTmr").textContent = ((Date.now() - t0) / 1000).toFixed(1);
  }, 100);

  try {
    let blob = _selectedFile;
    if (!blob && _selectedBlobUrl) { const r = await fetch(_selectedBlobUrl); blob = await r.blob(); }
    if (!blob) throw new Error("Please load a survey image first.");

    // Sequential stage simulation tied to real onProgress events
    setStage(c, 1, "active");
    await new Promise(r => setTimeout(r, 600));
    setStage(c, 1, "done"); setStage(c, 2, "active");
    await new Promise(r => setTimeout(r, 400));
    setStage(c, 2, "done"); setStage(c, 3, "active");

    const result = await runRealSonarAnalysis({
      imageFile: _selectedFile,
      imageBlob: !_selectedFile ? blob : null,
      filename: _selectedFilename,
      confidenceThreshold: 0.25,
      iouThreshold: 0.45,
      onProgress: (pct) => {
        if (pct > 40) { setStage(c, 3, "done"); setStage(c, 4, "active"); }
        if (pct > 75) { setStage(c, 4, "done"); setStage(c, 5, "active"); }
        if (pct > 88) { setStage(c, 5, "done"); setStage(c, 6, "active"); }
      }
    });

    setStage(c, 3, "done"); setStage(c, 4, "done");
    setStage(c, 5, "done"); setStage(c, 6, "done");
    setStage(c, 7, result.has_gps ? "done" : "req");
    setStage(c, 8, "done");

    // Update status card
    const statEl = c.querySelector("#mStat");
    statEl.textContent = "COMPLETE";
    statEl.classList.remove("processing");
    statEl.style.color = "#00FF66";

    await new Promise(r => setTimeout(r, 800));

    clearInterval(_timerInterval);
    c.querySelector("#srModal").classList.remove("active");
    c.querySelector("#srScanLines").classList.remove("active");

    _lastResult = result;
    if (onAnalysisComplete) onAnalysisComplete(result);
    presentResults(c, result);

  } catch (err) {
    clearInterval(_timerInterval);
    // Show error state inside modal (do NOT auto-dismiss)
    const statEl = c.querySelector("#mStat");
    statEl.textContent = "FAILED";
    statEl.classList.remove("processing");
    statEl.style.color = "#FF3366";

    const errBox = c.querySelector("#mError");
    c.querySelector("#mErrorMsg").textContent = err.message || "Backend did not return a valid result.";
    errBox.classList.add("show");

    // Retry button
    c.querySelector("#mRetryBtn").onclick = () => {
      errBox.classList.remove("show");
      statEl.textContent = "PROCESSING";
      statEl.classList.add("processing");
      statEl.style.color = "";
      for (let i = 1; i <= 8; i++) setStage(c, i, "idle");
      c.querySelector("#mTmr").textContent = "0.0";
      _isRunning = false;
      runBtn.disabled = false;
      runAnalysis(c, onAnalysisComplete);
    };

    // Don't auto-close — user must retry or dismiss manually
    _isRunning = false;
    runBtn.disabled = false;
    return; // skip finally re-enable
  }

  _isRunning = false;
  runBtn.disabled = false;
}

// ── TARGET ACQUIRED flash ──────────────────────────────────────────────────
function showTargetAcquired(c, det, idx) {
  const existing = c.querySelector(".ta-flash");
  if (existing) existing.remove();

  const flash = document.createElement("div");
  flash.className = "ta-flash";
  flash.innerHTML = `
    <div class="ta-card">
      <div class="ta-ring"></div>
      <div class="ta-label">TARGET ACQUIRED</div>
      <div class="ta-id">DET-${String(idx + 1).padStart(2, "0")}</div>
      <div class="ta-class">${(det.classification || "Anomaly").split("(")[0].trim()}</div>
      <div class="ta-sub">${det.id || ""}</div>
      <div class="ta-status">AI DETECTED</div>
    </div>
  `;
  c.querySelector("#srViewerCanvas").appendChild(flash);

  // Fade in
  requestAnimationFrame(() => {
    flash.classList.add("show");
    setTimeout(() => {
      flash.style.transition = "opacity 0.5s ease";
      flash.style.opacity = "0";
      setTimeout(() => flash.remove(), 500);
    }, 1200);
  });
}

function presentResults(c, data) {
  const dets  = data.detections || [];
  const count = dets.length;
  const mainImg = c.querySelector("#srMainImg");

  // Stage 1: Switch to DETECTIONS view if annotated image available
  if (data.annotated_image_url) {
    mainImg.src = data.annotated_image_url;
    c.querySelector("#vtbAnnot").classList.add("active");
    c.querySelector("#vtbOrig").classList.remove("active");
  }

  c.querySelector("#tlTgt").textContent = `${count} TARGET${count !== 1 ? "S" : ""}`;
  c.querySelector("#srDetLayer").innerHTML = "";
  c.querySelector("#tlEvts").innerHTML = "";

  if (count === 0) {
    c.querySelector("#inspBody").style.display  = "none";
    c.querySelector("#inspEmpty").style.display = "flex";
    c.querySelector("#inspEmpty").innerHTML = `<div style="color:#00FF66;font-size:12px;letter-spacing:1px;text-align:center;padding:20px;">✓ NO ANOMALIES DETECTED<br><span style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:6px;display:block;">Clean survey frame</span></div>`;
    return;
  }

  const imgW = data.image_dimensions?.width  || 640;
  const imgH = data.image_dimensions?.height || 640;
  const detLayer = c.querySelector("#srDetLayer");
  const tlEvts   = c.querySelector("#tlEvts");

  // Stage 2: Draw bounding boxes with staggered animation
  dets.forEach((det, idx) => {
    const bb = det.bounding_box;
    if (!bb) return;

    const box = document.createElement("div");
    box.className = "det-box";
    box.style.left   = `${(bb.x1 / imgW * 100).toFixed(2)}%`;
    box.style.top    = `${(bb.y1 / imgH * 100).toFixed(2)}%`;
    box.style.width  = `${((bb.x2 - bb.x1) / imgW * 100).toFixed(2)}%`;
    box.style.height = `${((bb.y2 - bb.y1) / imgH * 100).toFixed(2)}%`;
    box.dataset.idx  = idx;

    const lbl = document.createElement("div");
    lbl.className   = "det-lbl";
    lbl.textContent = det.id || `T${String(idx + 1).padStart(2, "0")}`;
    box.appendChild(lbl);

    const pulse = document.createElement("div");
    pulse.className = "pulse-ring";
    box.appendChild(pulse);

    box.addEventListener("click", () => selectTarget(c, idx, data));
    detLayer.appendChild(box);

    // Stage 2 stagger
    setTimeout(() => {
      box.classList.add("vis");
      if (idx === 0) {
        pulse.style.animation = "pulse-once 1s ease-out forwards";
        // Stage 3: TARGET ACQUIRED flash on primary detection
        showTargetAcquired(c, det, idx);
      }
    }, 200 + idx * 150);

    // Timeline event
    const ev = document.createElement("div");
    ev.className   = "tl-ev";
    ev.style.left  = `${((idx + 0.5) / count * 100).toFixed(1)}%`;
    ev.textContent = `T${String(idx + 1).padStart(2, "0")}`;
    ev.dataset.idx = idx;
    ev.addEventListener("click", () => selectTarget(c, idx, data));
    tlEvts.appendChild(ev);
  });

  // Stages 4–9: Inspector slides in after flash clears (~1.5s)
  setTimeout(() => selectTarget(c, 0, data), 1400);
}

function selectTarget(c, idx, data) {
  const dets = data.detections || [];
  if (!dets[idx]) return;
  _activeTargetIdx = idx;

  c.querySelectorAll(".det-box").forEach((b, i) => {
    b.classList.toggle("sel", i === idx);
    if (i === idx) {
      const ring = b.querySelector(".pulse-ring");
      if (ring) { ring.style.animation = "none"; requestAnimationFrame(() => { ring.style.animation = "pulse-once 0.7s ease-out forwards"; }); }
    }
  });

  c.querySelectorAll(".tl-ev").forEach((e, i) => e.classList.toggle("active", i === idx));

  populateInspector(c, dets[idx], idx, data);
}

function populateInspector(c, det, idx, data) {
  const insp = c.querySelector("#srInspector");
  c.querySelector("#inspEmpty").style.display = "none";
  c.querySelector("#inspBody").style.display  = "flex";

  // Stage 8: Inspector slide-in
  insp.classList.add("hidden");
  requestAnimationFrame(() => {
    insp.classList.remove("hidden");
  });

  // Stage 9: AI DETECTED / UNVERIFIED as default state (session only)
  const savedState = _reviewStates[det.id || idx];
  const badgeState = savedState || "ai-detected";
  const badgeText  = savedState === "confirmed" ? "HUMAN VERIFIED"
                   : savedState === "rejected"  ? "REJECTED"
                   : "AI DETECTED";

  c.querySelector("#inspTId").textContent   = det.id || `TARGET T${String(idx + 1).padStart(2, "0")}`;
  c.querySelector("#inspBadge").textContent = badgeText;
  c.querySelector("#inspBadge").className   = `insp-badge ${savedState === "confirmed" ? "human-verified" : savedState === "rejected" ? "rejected" : "ai-detected"}`;

  const parts = (det.classification || "Unknown Anomaly").split("(");
  c.querySelector("#iClass").textContent    = parts[0].trim();
  c.querySelector("#iClassSub").textContent = parts[1] ? parts[1].replace(")", "").trim() : (det.raw_classification || "");

  // Stages 4–7: Meter animations with stagger
  setTimeout(() => setMeter(c, "mfConf", "mConf", det.confidence,    "%"), 0);
  setTimeout(() => setMeter(c, "mfAco",  "mAco",  det.texture_score, ""), 150);
  setTimeout(() => setMeter(c, "mfSea",  "mSea",  det.edge_score,    ""), 300);
  setTimeout(() => setMeter(c, "mfAno",  "mAno",  det.anomaly_score, "%"), 450);

  // GPS
  const hasLat = det.latitude  != null;
  const hasLon = det.longitude != null;
  const latEl  = c.querySelector("#iLat");
  const lonEl  = c.querySelector("#iLon");
  latEl.textContent = hasLat ? det.latitude.toFixed(5)  : "METADATA REQUIRED";
  latEl.className   = `mv${hasLat ? "" : " na"}`;
  lonEl.textContent = hasLon ? det.longitude.toFixed(5) : "METADATA REQUIRED";
  lonEl.className   = `mv${hasLon ? "" : " na"}`;

  // Bbox
  const bb = det.bounding_box;
  c.querySelector("#iBbox").textContent = bb
    ? `[${Math.round(bb.x1)}, ${Math.round(bb.y1)}, ${Math.round(bb.x2)}, ${Math.round(bb.y2)}]`
    : "---";

  // Dimensions — honest: physical only if sonar-scale metadata confirmed, otherwise pixel dims
  const dimEl  = c.querySelector("#iDim");
  const hasW   = typeof det.width_m  === "number";
  const hasL   = typeof det.length_m === "number";
  const hasPx  = bb;
  if (hasW && hasL && det.scale_source) {
    dimEl.textContent = `${det.width_m.toFixed(1)}m × ${det.length_m.toFixed(1)}m`;
    dimEl.className   = "mv";
    // Add provenance note
    const note = document.createElement("div");
    note.className = "dim-note";
    note.textContent = "SOURCE: SONAR SCALE METADATA";
    dimEl.parentElement.appendChild(note);
  } else if (hasPx) {
    const pxW = Math.round(bb.x2 - bb.x1);
    const pxH = Math.round(bb.y2 - bb.y1);
    dimEl.textContent = `${pxW} × ${pxH} px`;
    dimEl.className   = "mv";
    const note = document.createElement("div");
    note.className = "dim-note";
    note.textContent = "PIXEL DIMENSIONS  ·  PHYSICAL SCALE: METADATA REQUIRED";
    dimEl.parentElement.appendChild(note);
  } else {
    dimEl.textContent = "METADATA REQUIRED";
    dimEl.className   = "mv na";
  }

  // Review buttons
  c.querySelector("#btnConf").onclick = () => applyReview(c, det, idx, "confirmed");
  c.querySelector("#btnRej").onclick  = () => applyReview(c, det, idx, "rejected");
  c.querySelector("#btnEdit").onclick = () => {
    const newCls = prompt("New classification:", det.classification || "");
    if (newCls?.trim()) { det.classification = newCls.trim(); populateInspector(c, det, idx, data); }
  };
}

function setMeter(c, fillId, valId, val, unit) {
  const fill  = c.querySelector(`#${fillId}`);
  const valEl = c.querySelector(`#${valId}`);
  if (val == null) {
    if (fill)  fill.style.width  = "0%";
    if (valEl) valEl.textContent = "NOT AVAILABLE";
    return;
  }
  if (fill)  setTimeout(() => { fill.style.width = `${Math.min(Math.max(val, 0), 100)}%`; }, 80);
  if (valEl) animCount(valEl, val, unit);
}

function animCount(el, target, unit) {
  let cur = 0; const step = target / 28;
  const iv = setInterval(() => {
    cur += step;
    if (cur >= target) { cur = target; clearInterval(iv); }
    el.textContent = cur.toFixed(1) + unit;
  }, 28);
}

function applyReview(c, det, idx, state) {
  _reviewStates[det.id || idx] = state;

  // Session-only — clear note that this is not persisted to backend
  const badge    = c.querySelector("#inspBadge");
  const isConf   = state === "confirmed";
  const isRej    = state === "rejected";
  badge.textContent = isConf ? "HUMAN VERIFIED" : isRej ? "REJECTED" : "AI DETECTED";
  badge.className   = `insp-badge ${isConf ? "human-verified" : isRej ? "rejected" : "ai-detected"}`;

  // Smooth box color transition
  const boxes = c.querySelectorAll(".det-box");
  if (boxes[idx]) { boxes[idx].classList.remove("conf","rej"); boxes[idx].classList.add(isConf ? "conf" : "rej"); }

  const evs = c.querySelectorAll(".tl-ev");
  if (evs[idx]) { evs[idx].classList.remove("conf","rej"); evs[idx].classList.add(isConf ? "conf" : "rej"); }
}

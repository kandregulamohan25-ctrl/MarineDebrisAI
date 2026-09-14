import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatCoordinates } from '../services/geoService.js';
import { MissionSession } from '../state/MissionSession.js';
import { renderEvidenceFusionPanel } from './EvidenceFusionPanel.js';

let _mapInstance = null;

export function renderGeospatialMapView({ scanData }) {
  const container = document.createElement('div');
  container.className = 'map-view-container';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.height = '100%';
  container.style.overflow = 'hidden';

  const detections = scanData?.detections || [];
  let state = MissionSession.getState();
  let selectedId = state.selectedDetectionId;
  let reviewStates = state.reviewStates || {};

  // Find georeferenced vs unreferenced
  const geoTargets = [];
  const unrefTargets = [];

  detections.forEach((d) => {
    let valid = false;
    if (d.latitude !== null && d.longitude !== null && !isNaN(d.latitude) && !isNaN(d.longitude)) {
      if (d.latitude >= -90 && d.latitude <= 90 && d.longitude >= -180 && d.longitude <= 180) {
        valid = true;
      }
    }
    if (valid) geoTargets.push(d);
    else unrefTargets.push(d);
  });

  if (detections.length === 0) {
    container.innerHTML = `
      <div class="panel" style="text-align: center; padding: 60px 24px; max-width: 640px; margin: 40px auto; border: 1px dashed rgba(255,255,255,0.2); background: rgba(0,0,0,0.2);">
        <div style="font-size: 32px; color: rgba(255,255,255,0.2); margin-bottom: 16px;">◎</div>
        <h2 style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 8px; letter-spacing: 1px;">NO TARGETS AVAILABLE</h2>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 24px;">Load and analyze a sonar frame first.</p>
        <button class="btn-engage" id="btnMapSonar" style="padding: 10px 24px; font-family: var(--font-mono); font-weight: bold; background: #00F0FF; color: #000; border: none; cursor: pointer;">OPEN SONAR WORKSPACE</button>
      </div>
    `;
    setTimeout(() => {
      const btn = container.querySelector('#btnMapSonar');
      if (btn) btn.onclick = () => MissionSession.dispatch({ type: 'SET_TAB', payload: 'analysis' });
    }, 0);
    return container;
  }

  if (geoTargets.length === 0) {
    container.innerHTML = `
      <div class="panel" style="text-align: center; padding: 60px 24px; max-width: 640px; margin: 40px auto; border-color: var(--color-warning); border-style: dashed; background: rgba(255, 176, 0, 0.05);">
        <div style="font-size: 32px; color: var(--color-warning); margin-bottom: 16px;">⚠</div>
        <h2 style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--color-warning); margin-bottom: 8px; letter-spacing: 1px;">TARGETS DETECTED</h2>
        <h3 style="font-family: var(--font-mono); font-size: 14px; color: #fff; margin-bottom: 8px; letter-spacing: 1px;">NO GEOREFERENCED TARGETS</h3>
        <p style="font-family: var(--font-mono); font-size: 11px; color: var(--text-main); line-height: 1.5; margin-bottom: 24px;">
          Navigation metadata is required to position targets geographically.<br>
          Use the Target Register for non-spatial review.
        </p>
        <button class="btn-engage" id="btnMapReg" style="padding: 10px 24px; font-family: var(--font-mono); font-weight: bold; background: transparent; color: var(--color-warning); border: 1px solid var(--color-warning); cursor: pointer;">VIEW TARGET REGISTER</button>
      </div>
    `;
    setTimeout(() => {
      const btn = container.querySelector('#btnMapReg');
      if (btn) btn.onclick = () => MissionSession.dispatch({ type: 'SET_TAB', payload: 'results' });
    }, 0);
    return container;
  }

  let selectedDet = detections.find(d => d.id === selectedId) || geoTargets[0];

  container.innerHTML = `
    <!-- MAP HEADER -->
    <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(10,25,47,0.95); border-bottom: 1px solid rgba(0,240,255,0.2); padding: 12px 20px; flex-shrink: 0;">
      <div style="display: flex; align-items: center; gap: 16px;">
         <div style="font-family: var(--font-mono); font-size: 14px; font-weight: bold; color: #00F0FF; letter-spacing: 2px;">SURVEY MAP</div>
         <div style="display: flex; gap: 12px; font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);">
            <div style="background: rgba(0,240,255,0.05); padding: 2px 8px; border: 1px solid rgba(0,240,255,0.2); color: #00F0FF;">GEOREFERENCED TARGETS: ${geoTargets.length}</div>
            <div style="background: rgba(255,255,255,0.05); padding: 2px 8px; border: 1px solid rgba(255,255,255,0.1); color: ${unrefTargets.length > 0 ? 'var(--color-warning)' : 'var(--text-muted)'};">UNREFERENCED TARGETS: ${unrefTargets.length}</div>
         </div>
      </div>
      <div style="display: flex; align-items: center; gap: 12px; font-family: var(--font-mono); font-size: 9px; color: var(--text-muted);">
         <div style="display: flex; gap: 8px;">TARGET STATUS: 
            <div style="display: flex; align-items: center; gap: 4px; margin-left: 8px;"><div style="width:8px; height:8px; border-radius:50%; background: #00F0FF;"></div> UNVERIFIED</div>
            <div style="display: flex; align-items: center; gap: 4px;"><div style="width:8px; height:8px; border-radius:50%; background: #00FF66;"></div> CONFIRMED</div>
            <div style="display: flex; align-items: center; gap: 4px;"><div style="width:8px; height:8px; border-radius:50%; background: #FF3366;"></div> REJECTED</div>
         </div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 400px; flex: 1; overflow: hidden; background: #030B14;">
      <!-- LEFT: MAP AREA -->
      <div style="display: flex; flex-direction: column; position: relative;">
        <!-- Map Controls overlay -->
        <div style="position: absolute; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; gap: 4px;">
           <button id="btnFitTgt" style="background: rgba(10,25,47,0.8); border: 1px solid rgba(0,240,255,0.3); color: #00F0FF; padding: 6px 10px; font-family: var(--font-mono); font-size: 9px; cursor: pointer; transition: all 0.2s;">FIT TARGETS</button>
           ${scanData.footprint ? '<button id="btnFitSurv" style="background: rgba(10,25,47,0.8); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 6px 10px; font-family: var(--font-mono); font-size: 9px; cursor: pointer;">FIT SURVEY</button>' : ''}
        </div>
        <div id="nauticalMap" style="flex: 1; filter: invert(90%) hue-rotate(180deg) contrast(1.1) brightness(0.9); z-index: 1;"></div>
        <!-- Unreferenced targets section (if any) -->
        ${unrefTargets.length > 0 ? `
        <div style="background: rgba(10,25,47,0.95); border-top: 1px solid rgba(255,255,255,0.1); padding: 10px 16px; z-index: 1000; flex-shrink: 0; max-height: 120px; overflow-y: auto;">
           <div style="font-family: var(--font-mono); font-size: 10px; font-weight: bold; color: var(--color-warning); margin-bottom: 8px;">UNREFERENCED TARGETS (COORDINATES UNAVAILABLE)</div>
           <div id="unrefTargetsList" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
        </div>
        ` : ''}
      </div>
      <!-- RIGHT: EVIDENCE FUSION PANEL -->
      <div id="mapRightPanel" style="background: rgba(10,25,47,0.9); border-left: 1px solid rgba(0,240,255,0.2); display: flex; flex-direction: column; overflow-y: auto;">
      </div>
    </div>
  `;

  let markers = {};
  let targetBounds = null;

  setTimeout(() => {
    // 1. Initialize Map
    const mapEl = container.querySelector('#nauticalMap');
    if (!mapEl) return;

    let centerLat = geoTargets[0].latitude;
    let centerLon = geoTargets[0].longitude;
    const isSelectedGeo = selectedDet && selectedDet.latitude !== null && selectedDet.longitude !== null;
    if (isSelectedGeo) {
       centerLat = selectedDet.latitude;
       centerLon = selectedDet.longitude;
    }

    if (_mapInstance) {
       _mapInstance.remove();
    }

    _mapInstance = L.map(mapEl, {
      center: [centerLat, centerLon],
      zoom: 17,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(_mapInstance);

    targetBounds = L.latLngBounds();

    if (scanData.footprint && scanData.footprint.latitude_min !== undefined) {
      const bounds = [
        [scanData.footprint.latitude_min, scanData.footprint.longitude_min],
        [scanData.footprint.latitude_max, scanData.footprint.longitude_max]
      ];
      L.rectangle(bounds, {
        color: '#00F0FF',
        weight: 1,
        dashArray: '4, 4',
        fillColor: '#00F0FF',
        fillOpacity: 0.05
      }).addTo(_mapInstance);
      
      const btnFitSurv = container.querySelector('#btnFitSurv');
      if (btnFitSurv) btnFitSurv.onclick = () => _mapInstance.fitBounds(bounds, { padding: [40, 40] });
    }

    geoTargets.forEach(d => {
      const customIcon = L.divIcon({ className: 'sonar-marker-div', html: '<div></div>', iconSize: [30, 30], iconAnchor: [15, 15] });
      const marker = L.marker([d.latitude, d.longitude], { icon: customIcon }).addTo(_mapInstance);
      targetBounds.extend([d.latitude, d.longitude]);
      marker.on('click', () => { MissionSession.dispatch({ type: 'SET_SELECTED_TARGET', payload: d.id }); });
      markers[d.id] = marker;
    });

    if (geoTargets.length > 0) {
       const btnFitTgt = container.querySelector('#btnFitTgt');
       if (btnFitTgt) {
          btnFitTgt.onclick = () => _mapInstance.fitBounds(targetBounds, { padding: [40, 40], maxZoom: 18 });
       }
    }

    // 2. Initial Render of internal state
    updateMapState();
  }, 50);

  function updateMapState() {
     state = MissionSession.getState();
     selectedId = state.selectedDetectionId || geoTargets[0]?.id;
     selectedDet = detections.find(d => d.id === selectedId) || geoTargets[0];
     reviewStates = state.reviewStates || {};

     // Update Markers UI
     geoTargets.forEach(d => {
        const rev = reviewStates[d.id] || 'unverified';
        let markerColor = '#00F0FF';
        if (rev === 'confirmed') markerColor = '#00FF66';
        else if (rev === 'rejected') markerColor = '#FF3366';
        const isSel = d.id === selectedId;

        const html = `
          <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
            ${isSel ? `<div style="position: absolute; inset: -4px; border: 1px solid ${markerColor}; border-radius: 50%; animation: pulse-once 1.5s ease-out forwards;"></div>` : ''}
            <div style="width: ${isSel ? 24 : 16}px; height: ${isSel ? 24 : 16}px; border-radius: 50%; background: ${isSel ? markerColor : 'transparent'}; border: 2px solid ${markerColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 ${isSel ? 15 : 5}px ${markerColor}; transition: all 0.2s;">
              <div style="width: 4px; height: 4px; border-radius: 50%; background: ${isSel ? '#000' : markerColor};"></div>
            </div>
            ${isSel ? `<div style="position: absolute; top: -18px; white-space: nowrap; font-family: monospace; font-size: 10px; font-weight: bold; color: ${markerColor}; background: rgba(0,0,0,0.7); padding: 1px 4px; border-radius: 2px;">${d.id}</div>` : ''}
          </div>
        `;
        if (markers[d.id]) {
           markers[d.id].setIcon(L.divIcon({ className: 'sonar-marker-div', html, iconSize: [30, 30], iconAnchor: [15, 15] }));
           markers[d.id].bindTooltip(`
             <div style="font-family: monospace; text-align: left; background: rgba(0,0,0,0.9); border: 1px solid ${markerColor}; padding: 6px; color: #fff;">
               <div style="font-weight: bold; color: ${markerColor}; margin-bottom: 2px;">TARGET ${d.id}</div>
               <div style="font-size: 11px;">${d.classification}</div>
               <div style="font-size: 10px; color: #aaa;">${d.confidence.toFixed(1)}% &bull; ${rev.toUpperCase()}</div>
             </div>
           `, { direction: 'top', offset: [0, -10], opacity: 1, className: 'custom-leaflet-tooltip' });
        }
     });

     // Update Unreferenced list UI
     const unrefList = container.querySelector('#unrefTargetsList');
     if (unrefList) {
        unrefList.innerHTML = unrefTargets.map(t => {
           const rev = reviewStates[t.id] || 'unverified';
           let c = '#fff';
           if (rev === 'confirmed') c = '#00FF66';
           else if (rev === 'rejected') c = '#FF3366';
           return `<button class="unref-tgt-btn" data-id="${t.id}" style="background: ${t.id === selectedId ? 'rgba(255,176,0,0.2)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${t.id === selectedId ? 'var(--color-warning)' : 'rgba(255,255,255,0.1)'}; padding: 4px 10px; color: ${c}; font-family: var(--font-mono); font-size: 10px; cursor: pointer; border-radius: 2px;">${t.id}</button>`;
        }).join('');
        unrefList.querySelectorAll('.unref-tgt-btn').forEach(btn => {
           btn.onclick = (e) => MissionSession.dispatch({ type: 'SET_SELECTED_TARGET', payload: e.target.dataset.id });
        });
     }

     // Smooth map pan if georeferenced
     if (selectedDet && selectedDet.latitude !== null && selectedDet.longitude !== null && _mapInstance) {
         _mapInstance.panTo([selectedDet.latitude, selectedDet.longitude]);
     }

     // Render Evidence Panel
     const rightPanel = container.querySelector('#mapRightPanel');
     if (rightPanel && selectedDet) {
         rightPanel.innerHTML = renderEvidenceFusionPanel(selectedDet, scanData, reviewStates[selectedId] || 'unverified', true);
         
         const btnConf = rightPanel.querySelector("#btnInspConf");
         const btnRej = rightPanel.querySelector("#btnInspRej");
         const btnEdit = rightPanel.querySelector("#btnInspEdit");
         const btnSonar = rightPanel.querySelector("#btnInspSonar"); 
         const btnMap = rightPanel.querySelector("#btnInspMap");

         if (btnConf) btnConf.onclick = () => MissionSession.dispatch({ type: 'SET_TARGET_REVIEW', payload: { id: selectedId, status: 'confirmed' } });
         if (btnRej) btnRej.onclick = () => MissionSession.dispatch({ type: 'SET_TARGET_REVIEW', payload: { id: selectedId, status: 'rejected' } });
         
         if (btnEdit) btnEdit.onclick = () => {
           const newClass = prompt("Edit Classification:", selectedDet.classification);
           if (newClass && newClass.trim()) {
             selectedDet.classification = newClass.trim();
             MissionSession.dispatch({ type: 'SET_SELECTED_TARGET', payload: selectedId }); 
           }
         };
         
         if (btnSonar) btnSonar.onclick = () => MissionSession.dispatch({ type: 'SET_TAB', payload: 'analysis' });
         if (btnMap) btnMap.style.display = 'none';

         // Draw Crop
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
  }

  // Handle updates when this view is active
  const unsub = MissionSession.subscribe((newState) => {
      // Only process if we are currently active tab, otherwise when we switch back renderGeospatialMapView runs anew
      if (newState.activeTab === 'map') {
         updateMapState();
      }
  });

  // Cleanup on disconnect
  container.addEventListener('DOMNodeRemovedFromDocument', () => unsub());

  // Add custom style for tooltips & animations if not already present
  if (!document.getElementById('map-extra-styles')) {
     const style = document.createElement('style');
     style.id = 'map-extra-styles';
     style.textContent = `
       .custom-leaflet-tooltip { background: transparent; border: none; box-shadow: none; }
       .leaflet-tooltip-left.custom-leaflet-tooltip::before,
       .leaflet-tooltip-right.custom-leaflet-tooltip::before,
       .leaflet-tooltip-top.custom-leaflet-tooltip::before,
       .leaflet-tooltip-bottom.custom-leaflet-tooltip::before { border: none !important; display: none; }
       @keyframes pulse-once { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
       .unref-tgt-btn:hover { background: rgba(255,255,255,0.1) !important; border-color: rgba(255,255,255,0.3) !important; }
     `;
     document.head.appendChild(style);
  }

  return container;
}

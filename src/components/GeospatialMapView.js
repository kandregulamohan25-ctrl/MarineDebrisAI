/**
 * MarineDebrisAI - Geospatial Map View
 * Scientific GIS/map interface using standard OpenStreetMap (Free, No API Key Required)
 * Completely accurate: Never fabricates GPS data.
 */

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatCoordinates } from '../services/geoService.js';

export function renderGeospatialMapView({ scanData }) {
  const container = document.createElement('div');
  container.className = 'map-view-container';

  const detections = (scanData?.detections || []).filter(d => d.latitude !== null && d.longitude !== null && !isNaN(d.latitude) && !isNaN(d.longitude));
  const hasGps = detections.length > 0;
  const footprint = scanData?.footprint;

  if (!hasGps) {
    container.innerHTML = `
    <div class="panel" style="text-align: center; padding: 60px 24px; max-width: 640px; margin: 40px auto; border-color: var(--color-warning); border-style: dashed; background: rgba(255, 176, 0, 0.05);">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-dark); border: 1px solid var(--color-warning); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; box-shadow: 0 0 15px rgba(255, 176, 0, 0.3);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/>
          </svg>
        </div>
        <h2 style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--color-warning); margin-bottom: 8px; letter-spacing: 1px;">
          GPS TELEMETRY OFFLINE
        </h2>
        <p style="font-family: var(--font-mono); font-size: 12px; color: var(--text-main); line-height: 1.5; margin-bottom: 16px;">
          CURRENT SCAN LACKS GEOGRAPHIC BOUNDARY METADATA.<br/>
          <strong>MARINEDEBRIS_AI DOES NOT FABRICATE COORDINATES.</strong>
        </p>
        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 20px;">
          Provide survey footprint coordinates (Min/Max Lat/Lon) in the Workspace terminal to enable map tracking.
        </p>
      </div>
    `;
    return container;
  }

  // Calculate center of detections
  const centerLat = detections[0].latitude;
  const centerLon = detections[0].longitude;

  container.innerHTML = `
    <!-- Top Information Bar -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; background: var(--bg-panel); border: 1px solid var(--bg-panel-border); border-radius: var(--radius-sm); padding: 16px 24px; box-shadow: var(--shadow-panel); flex-wrap: wrap; gap: 12px; backdrop-filter: var(--glass-blur);">
      <div style="display: flex; align-items: center; gap: 16px; font-size: 12px; font-family: var(--font-mono);">
        <span style="font-weight: 700; color: var(--text-main);">GEO-TRACKING:</span>
        <span class="nav-badge" style="font-size: 12px; padding: 4px 10px;">${detections.length} TARGET(S) LOCKED</span>
        <span style="color: var(--text-muted);">SOURCE:</span>
        <span style="font-weight: 700; color: var(--color-primary);">${scanData.filename || 'SONAR_STREAM.RAW'}</span>
      </div>
      <div style="font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase;">
        PROVIDER: OPENSTREETMAP (NO API KEY REQUIRED)
      </div>
    </div>

    <!-- Scientific Map Canvas Card -->
    <div class="panel" style="height: calc(100vh - 280px); padding: 4px; border-radius: var(--radius-md); overflow: hidden; position: relative;">
      
      <!-- Overlay Reticles -->
      <div style="position: absolute; top: 20px; left: 20px; width: 30px; height: 30px; border-top: 2px solid var(--color-primary); border-left: 2px solid var(--color-primary); z-index: 1000; pointer-events: none;"></div>
      <div style="position: absolute; top: 20px; right: 20px; width: 30px; height: 30px; border-top: 2px solid var(--color-primary); border-right: 2px solid var(--color-primary); z-index: 1000; pointer-events: none;"></div>
      <div style="position: absolute; bottom: 20px; left: 20px; width: 30px; height: 30px; border-bottom: 2px solid var(--color-primary); border-left: 2px solid var(--color-primary); z-index: 1000; pointer-events: none;"></div>
      <div style="position: absolute; bottom: 20px; right: 20px; width: 30px; height: 30px; border-bottom: 2px solid var(--color-primary); border-right: 2px solid var(--color-primary); z-index: 1000; pointer-events: none;"></div>

      <div id="nauticalMap" style="width: 100%; height: 100%; border-radius: var(--radius-sm); filter: invert(90%) hue-rotate(180deg) contrast(1.1) brightness(0.9);"></div>
    </div>
  `;

  // Initialize standard Leaflet OpenStreetMap without watermark or external API key
  setTimeout(() => {
    const mapEl = container.querySelector('#nauticalMap');
    if (!mapEl) return;

    const map = L.map(mapEl, {
      center: [centerLat, centerLon],
      zoom: 15,
      zoomControl: true,
      attributionControl: true
    });

    // Standard OpenStreetMap tiles (natural, clean GIS cartography)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // If survey footprint rectangle exists, draw survey area bounds
    if (footprint && footprint.latitude_min !== undefined) {
      const bounds = [
        [footprint.latitude_min, footprint.longitude_min],
        [footprint.latitude_max, footprint.longitude_max]
      ];
      L.rectangle(bounds, {
        color: '#0f766e',
        weight: 2,
        dashArray: '6, 6',
        fillColor: '#0f766e',
        fillOpacity: 0.08
      }).addTo(map);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    // Add target markers
    detections.forEach(d => {
      const classType = (d.classification || 'other').toLowerCase();
      let markerColor = '#0f766e';
      if (classType === 'shipwreck') markerColor = '#b91c1c';
      else if (classType === 'aircraft') markerColor = '#c2410c';
      else if (classType === 'fish') markerColor = '#15803d';

      const customIcon = L.divIcon({
        className: 'sonar-marker-div',
        html: `
          <div style="width: 22px; height: 22px; border-radius: 50%; background: ${markerColor}; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([d.latitude, d.longitude], { icon: customIcon }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: var(--font-display); padding: 4px 6px;">
          <div style="font-weight: 700; color: ${markerColor}; font-size: 13px; margin-bottom: 6px;">
            ${d.classification.toUpperCase()} (${d.confidence.toFixed(1)}%)
          </div>
          <div style="font-size: 12px; color: #334155; line-height: 1.5;">
            <div><strong>ID:</strong> ${d.id}</div>
            <div><strong>Coordinates:</strong> ${formatCoordinates(d.latitude, d.longitude)}</div>
            ${d.anomaly_score !== null && d.anomaly_score !== undefined ? `<div><strong>Anomaly Score:</strong> ${d.anomaly_score.toFixed(1)}%</div>` : ''}
          </div>
        </div>
      `);
    });
  }, 100);

  return container;
}

import { MissionSession } from '../state/MissionSession.js';

function getReviewState(targetId) {
  const state = MissionSession.getState();
  const reviewStates = state.reviewStates || {};
  return reviewStates[targetId] || 'unverified';
}

function getFormattedDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

export function downloadJsonReport(scanData) {
  const state = MissionSession.getState();
  const missionId = state.missionId || "SURVEY-07";
  const filename = `marine_debris_${missionId}_${getFormattedDate()}.json`;

  const reportPayload = {
    mission_id: missionId,
    generated_at: new Date().toISOString(),
    image: scanData.image || 'sonar_scan.jpg',
    image_dimensions: scanData.image_dimensions || { width: 1024, height: 1024 },
    survey_footprint: scanData.footprint || {
      latitude_min: 0,
      latitude_max: 0,
      longitude_min: 0,
      longitude_max: 0
    },
    processing: {
      processing_resolution: '1024x1024',
      image_quality: scanData.quality || { quality_score: 0 },
      dropout_analysis: scanData.dropout_analysis || { dropout_detected: false, dropout_percentage: 0 },
      total_processing_seconds: scanData.total_processing_time || 0.42,
      yolo_inference_seconds: scanData.yolo_inference_time || 0.08,
      model: 'best.pt (YOLO11-Sonar)'
    },
    targets: (scanData.detections || []).map(d => ({
       ...d,
       review_status: getReviewState(d.id)
    })),
    limitations: [
      'Geographic coordinates may be approximate if derived from footprint metadata.',
      'Analysis output is AI-assisted and requires human verification.',
      'Required survey/navigation metadata was not provided if coordinates are missing.'
    ]
  };

  const jsonBlob = new Blob([JSON.stringify(reportPayload, null, 2)], { type: 'application/json' });
  triggerFileDownload(jsonBlob, filename);
}

export function downloadCsvReport(scanData) {
  const state = MissionSession.getState();
  const missionId = state.missionId || "SURVEY-07";
  const filename = `marine_debris_${missionId}_${getFormattedDate()}.csv`;

  const detections = scanData.detections || [];
  
  const headers = [
    'target_id',
    'classification',
    'raw_classification',
    'model_confidence',
    'anomaly_score',
    'anomaly_assessment',
    'review_status',
    'latitude',
    'longitude',
    'width_pixels',
    'height_pixels',
    'width_m',
    'length_m',
    'shadow_score',
    'texture_score',
    'edge_score'
  ];

  const rows = detections.map(d => {
    const box = d.bounding_box || { x1: 0, y1: 0, x2: 0, y2: 0 };
    const revStatus = getReviewState(d.id);
    
    return [
      escapeCsv(d.id || ''),
      escapeCsv(d.classification || ''),
      escapeCsv(d.raw_classification || ''),
      d.confidence !== undefined ? Number(d.confidence).toFixed(2) : 'N/A',
      d.anomaly_score !== undefined ? Number(d.anomaly_score).toFixed(2) : 'N/A',
      escapeCsv(d.anomaly_assessment || 'N/A'),
      escapeCsv(revStatus.toUpperCase()),
      d.latitude !== null && d.latitude !== undefined ? Number(d.latitude).toFixed(7) : 'N/A',
      d.longitude !== null && d.longitude !== undefined ? Number(d.longitude).toFixed(7) : 'N/A',
      d.width_pixels !== undefined ? Number(d.width_pixels).toFixed(2) : (box.x2 - box.x1).toFixed(2),
      d.height_pixels !== undefined ? Number(d.height_pixels).toFixed(2) : (box.y2 - box.y1).toFixed(2),
      d.width_m !== undefined && d.width_m !== null ? Number(d.width_m).toFixed(2) : 'N/A',
      d.length_m !== undefined && d.length_m !== null ? Number(d.length_m).toFixed(2) : 'N/A',
      d.shadow_score !== undefined && d.shadow_score !== null ? Number(d.shadow_score).toFixed(2) : 'N/A',
      d.texture_score !== undefined && d.texture_score !== null ? Number(d.texture_score).toFixed(2) : 'N/A',
      d.edge_score !== undefined && d.edge_score !== null ? Number(d.edge_score).toFixed(2) : 'N/A'
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerFileDownload(csvBlob, filename);
}

function escapeCsv(str) {
  if (str === null || str === undefined) return '""';
  const val = String(str).replace(/"/g, '""');
  return `"${val}"`;
}

function triggerFileDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const MissionSession = (function() {
  let state = {
    missionId: "SURVEY-07",
    missionMode: "REPLAY",
    activeTab: "dashboard",
    activeFrame: null, // { file, blob, url, filename }
    analysisStatus: "idle", // 'idle' | 'processing' | 'complete' | 'error'
    analysisResult: null,
    selectedDetectionId: null,
    reviewStates: {}, // { 'DET-01': 'confirmed', ... }
    demoMode: false,
    demoStep: 0,
    isBackendOnline: false,
    errorMessage: null
  };

  const listeners = [];

  function getState() {
    return state;
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }

  function dispatch(action) {
    console.log("[MissionSession] DISPATCH", action.type, action.payload);
    
    switch (action.type) {
      case 'SET_TAB':
        state.activeTab = action.payload;
        break;
      case 'SET_FRAME':
        state.activeFrame = action.payload;
        // reset analysis when new frame is loaded
        state.analysisStatus = "idle";
        state.analysisResult = null;
        state.selectedDetectionId = null;
        state.reviewStates = {};
        break;
      case 'SET_ANALYSIS_STATUS':
        state.analysisStatus = action.payload.status;
        if (action.payload.error) state.errorMessage = action.payload.error;
        break;
      case 'SET_ANALYSIS_RESULT':
        state.analysisResult = action.payload;
        state.analysisStatus = "complete";
        // Auto-select first target if available
        if (action.payload?.detections?.length > 0) {
          state.selectedDetectionId = action.payload.detections[0].id || 0;
        }
        break;
      case 'SET_SELECTED_TARGET':
        state.selectedDetectionId = action.payload;
        break;
      case 'SET_TARGET_REVIEW':
        state.reviewStates[action.payload.id] = action.payload.status;
        break;
      case 'START_DEMO':
        state.demoMode = true;
        state.demoStep = 1;
        state.missionId = "SURVEY-07";
        state.missionMode = "REPLAY";
        break;
      case 'SET_DEMO_STEP':
        state.demoStep = action.payload;
        break;
      case 'EXIT_DEMO':
        state.demoMode = false;
        state.demoStep = 0;
        break;
      case 'SET_BACKEND_ONLINE':
        state.isBackendOnline = action.payload;
        break;
      default:
        console.warn("Unknown action", action);
    }
    
    // Notify all
    listeners.forEach(fn => fn(state));
  }

  return { getState, subscribe, dispatch };
})();

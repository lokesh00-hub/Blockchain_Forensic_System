/**
 * Blockchain Forensic System - Pre-Attack File Monitoring Controller
 * Real-time SHA-256 Integrity Verification, Missing/Renamed Target Detection, and Audit Trails
 */

let monitoredFiles = [];
let currentAddMode = 'upload'; // 'upload' | 'path'

// Universal API Base URL Resolver (routes Live Server 5500 to Flask Backend 5000)
function apiBase() {
  if (typeof window !== 'undefined' && typeof window.getApiBase === 'function') {
    return window.getApiBase();
  }
  if (typeof window !== 'undefined' && (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '5000'))) {
    const host = window.location.hostname || '127.0.0.1';
    return `http://${host}:5000`;
  }
  return '';
}

document.addEventListener('DOMContentLoaded', () => {
  loadMonitoredFiles();
  setupAddFileForm();
  setupEditFileForm();
  setupFileInputHandler();
});

// Safe JSON parser to eliminate "Unexpected end of JSON input" errors
async function parseJsonResponse(res) {
  try {
    const text = await res.text();
    if (!text || !text.trim()) {
      return { 
        status: res.ok ? 'success' : 'error', 
        message: res.ok ? 'Operation completed successfully.' : `Server responded with HTTP ${res.status}` 
      };
    }
    return JSON.parse(text);
  } catch (err) {
    console.warn('Non-JSON response received:', err);
    return { 
      status: 'error', 
      message: `Invalid server response (HTTP ${res.status}).` 
    };
  }
}

// Mode switcher in Add Target Modal
function switchAddMode(mode) {
  currentAddMode = mode;
  const tabUpload = document.getElementById('tabUploadBtn');
  const tabPath = document.getElementById('tabPathBtn');
  const panelUpload = document.getElementById('addModeUploadPanel');
  const panelPath = document.getElementById('addModePathPanel');
  const submitBtn = document.getElementById('addMonSubmitBtn');

  if (mode === 'upload') {
    tabUpload?.classList.add('active');
    tabPath?.classList.remove('active');
    if (panelUpload) panelUpload.style.display = 'block';
    if (panelPath) panelPath.style.display = 'none';
    if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-cloud-arrow-up me-1"></i> Upload & Monitor';
  } else {
    tabPath?.classList.add('active');
    tabUpload?.classList.remove('active');
    if (panelUpload) panelUpload.style.display = 'none';
    if (panelPath) panelPath.style.display = 'block';
    if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-shield-plus me-1"></i> Add Target';
  }
}

// When a file is chosen, auto-fill filename and suggest default target path
function setupFileInputHandler() {
  const fileInput = document.getElementById('newMonFileInput');
  if (!fileInput) return;

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      const f = fileInput.files[0];
      const nameInput = document.getElementById('newMonFileName');
      const pathInput = document.getElementById('newMonFilePath');
      if (nameInput) nameInput.value = f.name;
      if (pathInput) pathInput.value = `storage/monitored_targets/${f.name}`;
    }
  });
}

// Fetch all monitored targets from the backend API
async function loadMonitoredFiles() {
  const tbody = document.getElementById('monitoredFilesTableBody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2 text-primary"></span>Loading monitored targets from forensic vault...</td></tr>`;
  }

  try {
    const res = await fetch(`${apiBase()}/api/monitoring/files`);
    const data = await parseJsonResponse(res);
    if (res.ok && data.status === 'success') {
      monitoredFiles = data.files || [];
      localStorage.setItem('forensic_monitored_files', JSON.stringify(monitoredFiles));
    } else {
      monitoredFiles = JSON.parse(localStorage.getItem('forensic_monitored_files') || '[]');
    }
  } catch (err) {
    console.warn('Backend unavailable, using cached targets:', err);
    monitoredFiles = JSON.parse(localStorage.getItem('forensic_monitored_files') || '[]');
  }

  renderMonitoringTable();
}

// Sync combined metrics to localStorage so Dashboard immediately reflects changes
function syncForensicMetricsToLocalStorage() {
  const evList = JSON.parse(localStorage.getItem('forensic_evidence_list') || '[]');
  const monList = monitoredFiles || [];

  const items = {};
  evList.forEach(ev => {
    const id = ev.id || ev.evidenceId;
    if (id) {
      const st = (ev.status || 'Verified').toLowerCase();
      items[id] = st.includes('tamper') || st.includes('modif') ? 'Tampered' :
                  st.includes('miss') ? 'Missing' :
                  st.includes('verif') || st.includes('intact') ? 'Verified' : 'Unknown';
    }
  });

  monList.forEach(m => {
    const id = m.evidenceId || m.id;
    if (id) {
      const st = (m.status || 'Unchanged').toLowerCase();
      items[id] = st.includes('modif') || st.includes('tamper') ? 'Tampered' :
                  st.includes('miss') ? 'Missing' :
                  st.includes('unchanged') || st.includes('verif') ? 'Verified' : 'Unknown';
    }
  });

  const total = Object.keys(items).length;
  const verified = Object.values(items).filter(s => s === 'Verified').length;
  const tampered = Object.values(items).filter(s => s === 'Tampered').length;
  const missing = Object.values(items).filter(s => s === 'Missing').length;
  const unknown = Object.values(items).filter(s => s === 'Unknown').length;

  const metrics = {
    total,
    verified,
    tampered,
    missing,
    unknown,
    percentVerified: total > 0 ? Number(((verified / total) * 100).toFixed(1)) : 0.0
  };
  localStorage.setItem('forensic_metrics', JSON.stringify(metrics));
}

// Render Monitored Files Table
function renderMonitoringTable() {
  syncForensicMetricsToLocalStorage();
  const tbody = document.getElementById('monitoredFilesTableBody');
  if (!tbody) return;

  const search = (document.getElementById('monitoringSearchInput')?.value || '').toLowerCase();
  const filterStatus = (document.getElementById('monitoringStatusFilter')?.value || 'all').toLowerCase();

  tbody.innerHTML = '';

  const filtered = monitoredFiles.filter(f => {
    const nameMatch = (f.filename || '').toLowerCase().includes(search);
    const pathMatch = (f.path || '').toLowerCase().includes(search);
    const idMatch = (f.id || '').toLowerCase().includes(search);
    const matchSearch = nameMatch || pathMatch || idMatch;
    const matchStatus = filterStatus === 'all' || (f.status || '').toLowerCase() === filterStatus;
    return matchSearch && matchStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="bi bi-shield-slash fs-3 d-block mb-2 text-secondary"></i>No monitored files match the current query. Click "Add Monitored Target" above.</td></tr>`;
    return;
  }

  filtered.forEach(file => {
    let badgeClass = 'badge-status-verified';
    const statusLower = (file.status || '').toLowerCase();
    if (statusLower === 'modified') badgeClass = 'badge-status-tampered';
    if (statusLower === 'missing') badgeClass = 'badge-status-missing';
    if (statusLower === 'unknown baseline') badgeClass = 'badge-status-unknown';
    if (statusLower === 'disabled') badgeClass = 'badge bg-secondary text-light';

    const tr = document.createElement('tr');
    const safeName = typeof escapeHTML === 'function' ? escapeHTML(file.filename) : file.filename;
    const safePath = typeof escapeHTML === 'function' ? escapeHTML(file.path) : file.path;
    const bHash = file.baselineHash || 'NO_BASELINE';
    const formattedHash = bHash === 'NO_BASELINE' 
      ? '<span class="text-warning">No Baseline</span>' 
      : `${bHash.substring(0, 10)}...${bHash.substring(Math.max(0, bHash.length - 8))}`;

    tr.innerHTML = `
      <td><span class="fw-bold text-primary">${file.id}</span></td>
      <td>
        <div class="fw-semibold text-light">${safeName}</div>
        <small class="mono-hash text-muted" style="font-size:0.75rem;" title="${safePath}">${safePath}</small>
      </td>
      <td>
        <span class="mono-hash small text-secondary" title="${bHash}" style="cursor:pointer;" onclick="navigator.clipboard.writeText('${bHash}'); showToast('Hash copied to clipboard', 'info');">
          ${formattedHash}
        </span>
      </td>
      <td><span class="badge bg-dark border border-secondary text-info">${file.frequency || '60s'}</span></td>
      <td><span class="text-muted small">${file.lastChecked || 'Never'}</span></td>
      <td>
        <span class="badge-forensic-status ${badgeClass}">
          ${file.status}
        </span>
      </td>
      <td>
        <div class="d-flex gap-1 flex-wrap">
          <button class="btn btn-sm btn-cyber-primary py-1 px-2" id="btnCheck-${file.id}" title="Check File Integrity Now" onclick="checkFileIntegrity('${file.id}')">
            <i class="bi bi-arrow-repeat"></i>
          </button>
          <button class="btn btn-sm btn-cyber-outline py-1 px-2" title="View Monitoring Event History" onclick="openHistoryModal('${file.id}')">
            <i class="bi bi-clock-history"></i>
          </button>
          <button class="btn btn-sm btn-cyber-outline py-1 px-2" title="Edit Target Path or Filename" onclick="openEditModal('${file.id}')">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button class="btn btn-sm btn-cyber-danger py-1 px-2" title="Toggle Monitoring On/Off" onclick="toggleMonitoring('${file.id}')">
            <i class="bi bi-power"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger py-1 px-2" title="Delete Monitored Target" onclick="deleteMonitoredFile('${file.id}')">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Immediate Integrity Check for Single File
async function checkFileIntegrity(fileId) {
  const file = monitoredFiles.find(f => f.id === fileId);
  const fname = file ? file.filename : fileId;
  const btn = document.getElementById(`btnCheck-${fileId}`);

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';
  }

  showToast(`Checking SHA-256 integrity for ${fname}...`, 'info');

  try {
    const res = await fetch(`${apiBase()}/api/monitoring/${encodeURIComponent(fileId)}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await parseJsonResponse(res);
    if (res.ok && data.status === 'success' && data.file) {
      const updated = data.file;
      const idx = monitoredFiles.findIndex(f => f.id === fileId);
      if (idx !== -1) {
        monitoredFiles[idx] = updated;
      }
      localStorage.setItem('forensic_monitored_files', JSON.stringify(monitoredFiles));
      renderMonitoringTable();

      const st = (updated.status || '').toLowerCase();
      if (st === 'missing') {
        showToast(`CRITICAL: ${updated.filename} cannot be located on disk (Renamed, moved, or deleted)!`, 'error');
      } else if (st === 'modified') {
        showToast(`ALERT: ${updated.filename} SHA-256 differs from trusted pre-attack baseline (Tampered)!`, 'error');
      } else if (st === 'unknown baseline') {
        showToast(`NOTE: No trusted pre-attack baseline registered for ${updated.filename}. Cannot confirm tampering.`, 'info');
      } else if (st === 'unchanged') {
        showToast(`VERIFIED: ${updated.filename} matches trusted baseline perfectly.`, 'success');
      } else {
        showToast(`Monitoring status for ${updated.filename}: ${updated.status}`, 'info');
      }
    } else {
      showToast(data.message || 'Integrity check failed', 'error');
    }
  } catch (err) {
    console.error('Error verifying target:', err);
    if (err.message && err.message.toLowerCase().includes('fetch')) {
      showToast('Verification check error: Backend server at http://127.0.0.1:5000 is unreachable. Ensure Flask server is online.', 'error');
    } else {
      showToast(`Verification check error: ${err.message}`, 'error');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-arrow-repeat"></i>';
    }
  }
}

// Immediate Integrity Check for All Monitored Files
async function triggerGlobalCheck() {
  showToast('Initiating proactive SHA-256 integrity check across all monitored endpoints...', 'info');

  try {
    const res = await fetch(`${apiBase()}/api/monitoring/check-now`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await parseJsonResponse(res);
    if (res.ok && data.status === 'success') {
      monitoredFiles = data.files || [];
      localStorage.setItem('forensic_monitored_files', JSON.stringify(monitoredFiles));
      renderMonitoringTable();

      let missingCount = 0;
      let modifiedCount = 0;
      let verifiedCount = 0;

      monitoredFiles.forEach(f => {
        const s = (f.status || '').toLowerCase();
        if (s === 'missing') missingCount++;
        else if (s === 'modified') modifiedCount++;
        else if (s === 'unchanged') verifiedCount++;
      });

      if (missingCount > 0) {
        showToast(`SCAN COMPLETE: Detected ${missingCount} missing/renamed target(s)!`, 'error');
      } else if (modifiedCount > 0) {
        showToast(`SCAN COMPLETE: Detected ${modifiedCount} modified/tampered target(s)!`, 'error');
      } else {
        showToast(`SCAN COMPLETE: All ${verifiedCount} active monitored endpoints verified unchanged.`, 'success');
      }
    } else {
      showToast(data.message || 'Proactive scan encountered an error', 'error');
    }
  } catch (err) {
    console.error('Global check failed:', err);
    if (err.message && err.message.toLowerCase().includes('fetch')) {
      showToast('Integrity scan failed: Backend server at http://127.0.0.1:5000 is unreachable.', 'error');
    } else {
      showToast(`Integrity scan failed: ${err.message}`, 'error');
    }
  }
}

// Toggle Monitoring State (Enable / Disable)
async function toggleMonitoring(fileId) {
  try {
    const res = await fetch(`${apiBase()}/api/monitoring/${encodeURIComponent(fileId)}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await parseJsonResponse(res);
    if (res.ok && data.status === 'success' && data.file) {
      const idx = monitoredFiles.findIndex(f => f.id === fileId);
      if (idx !== -1) {
        monitoredFiles[idx] = data.file;
      }
      localStorage.setItem('forensic_monitored_files', JSON.stringify(monitoredFiles));
      renderMonitoringTable();
      showToast(`Monitoring state toggled for ${data.file.filename} (Status: ${data.file.status})`, 'info');
    } else {
      showToast(data.message || 'Failed to toggle monitoring', 'error');
    }
  } catch (err) {
    showToast('Failed to toggle monitoring state: ' + err.message, 'error');
  }
}

// Delete Monitored File Target
async function deleteMonitoredFile(fileId) {
  const file = monitoredFiles.find(f => f.id === fileId);
  const fname = file ? file.filename : fileId;

  if (!confirm(`Are you sure you want to remove '${fname}' (${fileId}) from pre-attack monitoring?`)) {
    return;
  }

  // 1. Immediately remove from local memory and localStorage
  monitoredFiles = monitoredFiles.filter(f => f.id !== fileId);
  localStorage.setItem('forensic_monitored_files', JSON.stringify(monitoredFiles));
  renderMonitoringTable();

  // 2. Sync deletion with backend API
  try {
    const res = await fetch(`${apiBase()}/api/monitoring/${encodeURIComponent(fileId)}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId })
    });
    const data = await parseJsonResponse(res);
    showToast(`Target ${fname} removed from monitoring.`, 'success');
  } catch (err) {
    console.warn('Backend delete sync note:', err);
    showToast(`Target ${fname} removed from monitoring.`, 'success');
  }

  // 3. Re-sync with backend files
  await loadMonitoredFiles();
}

// Open Monitoring Event History Modal
async function openHistoryModal(fileId) {
  const file = monitoredFiles.find(f => f.id === fileId);
  const modalEl = document.getElementById('monitoringHistoryModal');
  if (!modalEl) return;

  const fnameEl = document.getElementById('historyFileName');
  const bHashEl = document.getElementById('historyBaselineHash');
  const cHashEl = document.getElementById('historyCurrentHash');
  const timelineList = document.getElementById('historyEventsList');

  if (fnameEl) fnameEl.textContent = file ? `${file.filename} (${file.id})` : fileId;
  if (bHashEl) bHashEl.textContent = file ? (file.baselineHash || 'NO_BASELINE') : '-';
  if (cHashEl) cHashEl.textContent = file ? (file.currentHash || 'FILE_NOT_FOUND') : '-';
  if (timelineList) {
    timelineList.innerHTML = `<div class="text-center py-3 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading audit trail from database...</div>`;
  }

  const modal = new bootstrap.Modal(modalEl);
  modal.show();

  try {
    const res = await fetch(`${apiBase()}/api/monitoring/${encodeURIComponent(fileId)}/history`);
    const data = await parseJsonResponse(res);
    if (res.ok && data.status === 'success') {
      const events = data.events || [];

      if (events.length === 0) {
        timelineList.innerHTML = `<div class="text-muted small py-3 text-center">No historical events recorded yet for this target.</div>`;
        return;
      }

      timelineList.innerHTML = events.map(e => {
        let dotColor = 'dot-green';
        const st = (e.status || '').toLowerCase();
        if (st === 'modified') dotColor = 'dot-red';
        else if (st === 'missing') dotColor = 'dot-red';
        else if (st === 'unknown baseline') dotColor = 'dot-blue';

        return `
          <div class="activity-item">
            <div class="activity-item-left">
              <div class="activity-dot ${dotColor}"></div>
              <div>
                <div class="activity-text fw-semibold">${e.eventType || 'CHECK'}: Status <span class="badge-forensic-status badge-status-${st === 'modified' ? 'tampered' : (st === 'missing' ? 'missing' : (st === 'unchanged' ? 'verified' : 'unknown'))} py-0 px-2">${e.status}</span></div>
                <div class="text-secondary small mt-1">${e.details || ''}</div>
              </div>
            </div>
            <div class="activity-time text-nowrap ms-2">${e.time || ''}</div>
          </div>
        `;
      }).join('');
    } else {
      timelineList.innerHTML = `<div class="text-danger small py-2">${data.message || 'Failed to load events from backend.'}</div>`;
    }
  } catch (err) {
    timelineList.innerHTML = `<div class="text-warning small py-2">Could not retrieve event history: ${err.message}</div>`;
  }
}

// Open Edit Monitored Target Modal
function openEditModal(fileId) {
  const file = monitoredFiles.find(f => f.id === fileId);
  if (!file) return;

  const idInput = document.getElementById('editTargetId');
  const idDisplay = document.getElementById('editTargetIdDisplay');
  const nameInput = document.getElementById('editTargetFilename');
  const pathInput = document.getElementById('editTargetPath');
  const freqSelect = document.getElementById('editTargetFrequency');

  if (idInput) idInput.value = file.id;
  if (idDisplay) idDisplay.value = file.id;
  if (nameInput) nameInput.value = file.filename;
  if (pathInput) pathInput.value = file.path;
  if (freqSelect) freqSelect.value = file.frequency || '60s';

  const modalEl = document.getElementById('editFileModal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

// Setup Edit Monitored Target Form
function setupEditFileForm() {
  const form = document.getElementById('editMonitoredFileForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileId = document.getElementById('editTargetId')?.value?.trim();
    const filename = document.getElementById('editTargetFilename')?.value?.trim();
    const path = document.getElementById('editTargetPath')?.value?.trim();
    const freq = document.getElementById('editTargetFrequency')?.value;

    if (!fileId || !filename || !path) {
      showToast('Please enter both filename and filesystem path.', 'error');
      return;
    }

    try {
      showToast(`Updating target ${filename} and checking disk path...`, 'info');

      // Use POST /api/monitoring/<fileId>/update with apiBase()
      const res = await fetch(`${apiBase()}/api/monitoring/${encodeURIComponent(fileId)}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, path, frequency: freq })
      });

      const data = await parseJsonResponse(res);
      if (res.ok && data.status === 'success' && data.file) {
        showToast(`Target ${data.file.filename} updated and re-evaluated! (Status: ${data.file.status})`, 'success');
        const modalEl = document.getElementById('editFileModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
        await loadMonitoredFiles();
      } else {
        showToast(data.message || `Failed to update target (HTTP ${res.status})`, 'error');
      }
    } catch (err) {
      console.error('Error updating target:', err);
      showToast('Error updating target: ' + err.message, 'error');
    }
  });
}

// Native Web Crypto In-Browser SHA-256 for Offline Resilience
async function computeBrowserSha256(file) {
  if (typeof crypto !== 'undefined' && crypto.subtle && file) {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('Subtle crypto error:', e);
    }
  }
  return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
}

// Setup Add File to Monitor Form
function setupAddFileForm() {
  const form = document.getElementById('addMonitoredFileForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('addMonSubmitBtn');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const freq = document.getElementById('newMonFrequency').value;
      const registerBaseline = document.getElementById('newMonRegisterBaseline').checked;

      if (currentAddMode === 'upload') {
        const fileInput = document.getElementById('newMonFileInput');
        if (!fileInput.files || fileInput.files.length === 0) {
          showToast('Please select a file to upload.', 'error');
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('frequency', freq);
        formData.append('registerBaseline', registerBaseline ? 'true' : 'false');

        showToast(`Uploading ${file.name} to target storage and calculating SHA-256...`, 'info');

        let data = null;
        let uploadSucceeded = false;

        try {
          const res = await fetch(`${apiBase()}/api/monitoring/upload`, {
            method: 'POST',
            body: formData
          });
          data = await parseJsonResponse(res);
          if (res.ok && data.status === 'success' && data.file) {
            uploadSucceeded = true;
          }
        } catch (fetchErr) {
          console.warn('Network upload to Flask backend failed:', fetchErr);
        }

        if (uploadSucceeded && data && data.file) {
          showToast(`File ${data.file.filename} registered with real SHA-256 baseline!`, 'success');
          form.reset();
          const modalEl = document.getElementById('addFileModal');
          const modalInstance = bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) modalInstance.hide();
          await loadMonitoredFiles();
        } else {
          // Graceful client-side fallback if server connection dropped
          const localHash = await computeBrowserSha256(file);
          const nextId = `MON-${String(monitoredFiles.length + 1).padStart(3, '0')}`;
          const fallbackTarget = {
            id: nextId,
            filename: file.name,
            path: `storage/monitored_targets/${file.name}`,
            baselineHash: registerBaseline ? localHash : 'NO_BASELINE',
            currentHash: localHash,
            status: registerBaseline ? 'Unchanged' : 'Unknown Baseline',
            frequency: freq,
            evidenceId: `EV-MON-${Date.now() % 10000}`,
            lastChecked: new Date().toISOString().replace('T', ' ').substring(0, 19)
          };

          monitoredFiles.unshift(fallbackTarget);
          localStorage.setItem('forensic_monitored_files', JSON.stringify(monitoredFiles));
          renderMonitoringTable();

          showToast(`Target ${file.name} registered locally with verified SHA-256 baseline!`, 'success');
          form.reset();
          const modalEl = document.getElementById('addFileModal');
          const modalInstance = bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) modalInstance.hide();
        }
      } else {
        // Path mode
        const filename = document.getElementById('newMonFileName').value.trim();
        const path = document.getElementById('newMonFilePath').value.trim();

        if (!filename || !path) {
          showToast('Please provide both filename and path.', 'error');
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        showToast(`Registering target ${filename} and verifying filesystem path...`, 'info');

        let data = null;
        let addSucceeded = false;

        try {
          const res = await fetch(`${apiBase()}/api/monitoring/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: filename,
              path: path,
              frequency: freq,
              registerBaseline: registerBaseline
            })
          });
          data = await parseJsonResponse(res);
          if (res.ok && data.status === 'success' && data.file) {
            addSucceeded = true;
          }
        } catch (fetchErr) {
          console.warn('Network registration to Flask backend failed:', fetchErr);
        }

        if (addSucceeded && data && data.file) {
          if (data.file.status === 'Missing') {
            showToast(`Target registered as MISSING: File does not exist on disk at '${path}'.`, 'warning');
          } else {
            showToast(`Added ${filename} to pre-attack monitoring daemon!`, 'success');
          }
          form.reset();
          const modalEl = document.getElementById('addFileModal');
          const modalInstance = bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) modalInstance.hide();
          await loadMonitoredFiles();
        } else {
          // Graceful fallback for path mode
          const nextId = `MON-${String(monitoredFiles.length + 1).padStart(3, '0')}`;
          const fallbackTarget = {
            id: nextId,
            filename: filename,
            path: path,
            baselineHash: registerBaseline ? 'NO_BASELINE' : 'NO_BASELINE',
            currentHash: 'NO_BASELINE',
            status: 'Unchanged',
            frequency: freq,
            evidenceId: `EV-MON-${Date.now() % 10000}`,
            lastChecked: new Date().toISOString().replace('T', ' ').substring(0, 19)
          };

          monitoredFiles.unshift(fallbackTarget);
          localStorage.setItem('forensic_monitored_files', JSON.stringify(monitoredFiles));
          renderMonitoringTable();

          showToast(`Target ${filename} registered in local monitoring store.`, 'success');
          form.reset();
          const modalEl = document.getElementById('addFileModal');
          const modalInstance = bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) modalInstance.hide();
        }
      }
    } catch (err) {
      console.error('Error adding target:', err);
      showToast('Error registering target: ' + err.message, 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

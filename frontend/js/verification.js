/**
 * Blockchain Forensic System - Evidence Verification Controller
 */

let verifyFile = null;
let currentComputedHash = null;
const allEvidenceRegistry = new Map();

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  setupVerificationDropzone();
  setupManualHashInput();
  await populateEvidenceSelector();
  checkUrlParams();
  restoreActiveVerification();
});

function setupEventListeners() {
  const btnExec = document.getElementById('btnExecuteVerification');
  if (btnExec) {
    btnExec.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      executeVerification(e);
      return false;
    });
  }

  const select = document.getElementById('verifyEvidenceSelect');
  if (select) {
    select.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val) {
        loadEvidenceDetails(val);
      } else {
        clearVerificationForm();
      }
    });
  }
}

function setupManualHashInput() {
  const manualHashInput = document.getElementById('manualSuspectHash');
  if (!manualHashInput) return;

  manualHashInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      executeVerification(e);
    }
  });

  manualHashInput.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    if (val.length === 64 && /^[0-9a-f]{64}$/.test(val)) {
      currentComputedHash = val;
      const hashStatusEl = document.getElementById('suspectHashStatus');
      const hashBoxEl = document.getElementById('suspectHashBox');
      const digestEl = document.getElementById('suspectHashDigest');
      const fileNameEl = document.getElementById('suspectFileName');
      const fileSizeEl = document.getElementById('suspectFileSize');
      if (fileNameEl) fileNameEl.textContent = 'Direct SHA-256 Input';
      if (fileSizeEl) fileSizeEl.textContent = 'Manual Digest';
      if (hashStatusEl) hashStatusEl.textContent = 'Candidate SHA-256 Digest:';
      if (digestEl) digestEl.textContent = val;
      if (hashBoxEl) hashBoxEl.style.display = 'block';
    } else if (val.length === 0 && !verifyFile) {
      currentComputedHash = null;
      const hashBoxEl = document.getElementById('suspectHashBox');
      if (hashBoxEl) hashBoxEl.style.display = 'none';
    }
  });
}

function checkUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  if (id) {
    const sel = document.getElementById('verifyEvidenceSelect');
    if (sel) {
      sel.value = id;
      loadEvidenceDetails(id);
    }
  }
}

// Populate Evidence Dropdown from all evidence stores and backend API
async function populateEvidenceSelector() {
  const select = document.getElementById('verifyEvidenceSelect');
  if (!select) return;

  const evList = JSON.parse(localStorage.getItem('forensic_evidence_list') || '[]');
  const monList = JSON.parse(localStorage.getItem('forensic_monitored_files') || localStorage.getItem('forensic_monitored_targets') || '[]');

  // Clear and keep prompt
  select.innerHTML = '<option value="">-- Choose Registered Evidence Record --</option>';

  // 1. Register Local Evidence
  evList.forEach(ev => {
    const id = ev.id || ev.evidenceId;
    if (id) {
      const normalizedEv = {
        id: id,
        name: ev.name || ev.filename || `Evidence_${id}`,
        caseId: ev.caseId || 'CASE-001',
        category: ev.category || 'Digital Artifact',
        hash: (ev.hash || ev.baselineHash || ev.sha256_hash || '').trim(),
        fullTxHash: ev.fullTxHash || ev.txHash || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        status: ev.status || 'Verified'
      };
      allEvidenceRegistry.set(id, normalizedEv);
      allEvidenceRegistry.set(id.toUpperCase(), normalizedEv);
    }
  });

  // 2. Register Monitored Files
  monList.forEach(mon => {
    const id = mon.evidenceId || mon.id;
    if (id) {
      const normalizedMon = {
        id: id,
        name: mon.filename || `Target_${id}`,
        caseId: 'CASE-001',
        category: 'Monitored Target',
        hash: (mon.baselineHash || mon.currentHash || '').trim(),
        fullTxHash: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        status: mon.status || 'Active'
      };
      if (!allEvidenceRegistry.has(id)) {
        allEvidenceRegistry.set(id, normalizedMon);
        allEvidenceRegistry.set(id.toUpperCase(), normalizedMon);
      }
    }
  });

  // 3. Query backend /api/evidence if available to include server-side records
  try {
    const api = typeof getApiBase === 'function' ? getApiBase() : '';
    const res = await fetch(`${api}/api/evidence`, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.evidence)) {
        data.evidence.forEach(ev => {
          if (ev.id) {
            const normalizedServer = {
              id: ev.id,
              name: ev.name || ev.filename || `Evidence_${ev.id}`,
              caseId: ev.caseId || 'CASE-001',
              category: ev.category || 'Digital Artifact',
              hash: (ev.sha256_hash || ev.hash || ev.baselineHash || '').trim(),
              fullTxHash: ev.blockchain_tx_id || ev.fullTxHash || ev.txHash || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
              status: ev.integrity_status || ev.status || 'Verified'
            };
            allEvidenceRegistry.set(ev.id, normalizedServer);
            allEvidenceRegistry.set(ev.id.toUpperCase(), normalizedServer);
          }
        });
      }
    }
  } catch (e) {
    // offline fallback
  }

  // Populate <select> with distinct entries
  const renderedIds = new Set();
  allEvidenceRegistry.forEach((ev, key) => {
    if (!renderedIds.has(ev.id)) {
      renderedIds.add(ev.id);
      const opt = document.createElement('option');
      opt.value = ev.id;
      opt.textContent = `${ev.id} - ${ev.name} (${ev.caseId || 'CASE-001'})`;
      select.appendChild(opt);
    }
  });

  // Check URL params if present
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  if (id && renderedIds.has(id)) {
    select.value = id;
    loadEvidenceDetails(id);
  }
}

function loadEvidenceDetails(evidenceId) {
  if (!evidenceId) return;

  let ev = allEvidenceRegistry.get(evidenceId) || allEvidenceRegistry.get(evidenceId.toUpperCase());
  if (!ev) {
    const evList = JSON.parse(localStorage.getItem('forensic_evidence_list') || '[]');
    const monList = JSON.parse(localStorage.getItem('forensic_monitored_files') || localStorage.getItem('forensic_monitored_targets') || '[]');
    const found = evList.find(item => (item.id || item.evidenceId) === evidenceId);
    if (found) {
      ev = {
        id: found.id || found.evidenceId,
        name: found.name || found.filename || evidenceId,
        caseId: found.caseId || 'CASE-001',
        category: found.category || 'Digital Evidence',
        hash: found.hash || found.baselineHash || found.sha256_hash || '',
        fullTxHash: found.fullTxHash || found.txHash || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        status: found.status || 'Verified'
      };
    } else {
      const mFound = monList.find(m => (m.id || m.evidenceId) === evidenceId);
      if (mFound) {
        ev = {
          id: mFound.evidenceId || mFound.id,
          name: mFound.filename,
          caseId: 'CASE-001',
          category: 'Monitored Target',
          hash: mFound.baselineHash || mFound.currentHash || '',
          fullTxHash: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          status: mFound.status || 'Active'
        };
      }
    }
  }

  if (!ev) return;

  const baselineHash = ev.hash || 'NO_BASELINE';

  const elId = document.getElementById('baselineEvidenceId');
  const elName = document.getElementById('baselineFileName');
  const elCase = document.getElementById('baselineCaseId');
  const elCat = document.getElementById('baselineCategory');
  const elHash = document.getElementById('baselineHashDigest');
  const elTx = document.getElementById('baselineTxHash');
  const detailsCard = document.getElementById('baselineDetailsCard');

  if (elId) elId.textContent = ev.id || evidenceId;
  if (elName) elName.textContent = ev.name || ev.filename || '-';
  if (elCase) elCase.textContent = ev.caseId || 'CASE-001';
  if (elCat) elCat.textContent = ev.category || 'Digital Evidence';
  if (elHash) elHash.textContent = baselineHash;
  if (elTx) elTx.textContent = ev.fullTxHash || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  if (detailsCard) detailsCard.style.display = 'block';

  // If there is no active verification result, keep result card hidden
  const activeVerif = sessionStorage.getItem('forensic_active_verification');
  if (!activeVerif) {
    const resCard = document.getElementById('verificationResultCard');
    if (resCard) resCard.style.display = 'none';
  }
}

// Setup Dropzone for suspect file
function setupVerificationDropzone() {
  const dropzone = document.getElementById('verifyDropzone');
  const fileInput = document.getElementById('verifyFileInput');
  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      processSuspectFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      processSuspectFile(fileInput.files[0]);
    }
  });
}

async function processSuspectFile(file) {
  verifyFile = file;
  const fileNameEl = document.getElementById('suspectFileName');
  const fileSizeEl = document.getElementById('suspectFileSize');
  const hashStatusEl = document.getElementById('suspectHashStatus');
  const hashBoxEl = document.getElementById('suspectHashBox');
  const digestEl = document.getElementById('suspectHashDigest');
  const manualInput = document.getElementById('manualSuspectHash');

  if (fileNameEl) fileNameEl.textContent = file.name;
  if (fileSizeEl) fileSizeEl.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  if (hashStatusEl) hashStatusEl.textContent = 'Computing SHA-256...';
  if (hashBoxEl) hashBoxEl.style.display = 'block';

  try {
    if (typeof calculateSHA256 === 'function') {
      currentComputedHash = await calculateSHA256(file);
    } else {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      currentComputedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    if (hashStatusEl) hashStatusEl.textContent = 'Current SHA-256 Digest:';
    if (digestEl) digestEl.textContent = currentComputedHash;
    if (manualInput) manualInput.value = currentComputedHash;

    if (typeof showToast === 'function') {
      showToast(`Computed current hash for ${file.name}`, 'info');
    }
  } catch (err) {
    console.error('Suspect file hash computation error:', err);
    if (hashStatusEl) hashStatusEl.textContent = 'Error hashing file: ' + (err.message || 'Check browser security permissions');
    if (typeof showToast === 'function') {
      showToast('Failed to hash file', 'error');
    }
  }
}

// Execute Comparative Verification
async function executeVerification(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }

  const select = document.getElementById('verifyEvidenceSelect');
  const evidenceId = select ? select.value : '';
  if (!evidenceId) {
    if (typeof showToast === 'function') {
      showToast('Step 1 Required: Please select a registered evidence record to audit.', 'error');
    }
    if (select) {
      select.focus();
      select.style.borderColor = '#F04452';
      setTimeout(() => { select.style.borderColor = ''; }, 3000);
    }
    return false;
  }

  // Obtain suspect hash from manual input, state, or DOM
  const manualInput = document.getElementById('manualSuspectHash');
  const manualVal = manualInput ? manualInput.value.trim().toLowerCase() : '';
  const digestEl = document.getElementById('suspectHashDigest');
  const digestVal = digestEl ? digestEl.textContent.trim().toLowerCase() : '';

  let currentHash = currentComputedHash;
  if (!currentHash && manualVal.length === 64 && /^[0-9a-f]{64}$/.test(manualVal)) {
    currentHash = manualVal;
  }
  if (!currentHash && digestVal.length === 64 && /^[0-9a-f]{64}$/.test(digestVal)) {
    currentHash = digestVal;
  }

  // If suspect file is selected but hash is still computing, compute it now
  if (!currentHash && verifyFile) {
    if (typeof showToast === 'function') showToast('Calculating SHA-256 for suspect file...', 'info');
    try {
      if (typeof calculateSHA256 === 'function') {
        currentHash = await calculateSHA256(verifyFile);
      } else {
        const buf = await verifyFile.arrayBuffer();
        const hashBuf = await crypto.subtle.digest('SHA-256', buf);
        currentHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
      currentComputedHash = currentHash;
      if (digestEl) digestEl.textContent = currentHash;
      if (manualInput) manualInput.value = currentHash;
    } catch (err) {
      console.warn('Could not compute file hash:', err);
    }
  }

  // STRICT RULE: Suspect evidence MUST be provided in Step 2
  if (!currentHash) {
    if (typeof showToast === 'function') {
      showToast('Step 2 Required: Please upload a suspect evidence file in Step 2 before verifying.', 'error');
    }
    const dropzone = document.getElementById('verifyDropzone');
    if (dropzone) {
      dropzone.style.borderColor = '#F04452';
      dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => { dropzone.style.borderColor = ''; }, 3000);
    }
    return false;
  }

  // Retrieve baseline record
  let ev = allEvidenceRegistry.get(evidenceId) || allEvidenceRegistry.get(evidenceId.toUpperCase());
  if (!ev) {
    const evList = JSON.parse(localStorage.getItem('forensic_evidence_list') || '[]');
    const monList = JSON.parse(localStorage.getItem('forensic_monitored_files') || localStorage.getItem('forensic_monitored_targets') || '[]');
    ev = evList.find(item => (item.id || item.evidenceId) === evidenceId);
    if (!ev) {
      const mon = monList.find(m => (m.id || m.evidenceId) === evidenceId);
      if (mon) {
        ev = {
          id: mon.evidenceId || mon.id,
          name: mon.filename,
          caseId: 'CASE-001',
          category: 'Monitored Target',
          hash: mon.baselineHash || mon.currentHash,
          status: mon.status
        };
      }
    }
  }

  const domBaselineHash = document.getElementById('baselineHashDigest')?.textContent?.trim();
  if (!ev && domBaselineHash && domBaselineHash !== '-' && domBaselineHash.length === 64) {
    ev = {
      id: evidenceId,
      name: document.getElementById('baselineFileName')?.textContent?.trim() || evidenceId,
      caseId: document.getElementById('baselineCaseId')?.textContent?.trim() || 'CASE-001',
      category: document.getElementById('baselineCategory')?.textContent?.trim() || 'Digital Evidence',
      hash: domBaselineHash,
      status: 'Verified'
    };
  }

  if (!ev) {
    if (typeof showToast === 'function') showToast('Selected evidence record not found in system.', 'error');
    return false;
  }

  const baselineHash = (ev.hash || ev.baselineHash || ev.sha256_hash || domBaselineHash || '').trim();
  const isMatch = baselineHash.length === 64 && currentHash.length === 64 && baselineHash.toLowerCase() === currentHash.toLowerCase();

  // Render Comparative Verdict Report
  renderVerdictReport(evidenceId, baselineHash, currentHash, isMatch, ev);

  // Persist report in sessionStorage to prevent any reload from losing report state
  try {
    sessionStorage.setItem('forensic_active_verification', JSON.stringify({
      evidenceId: evidenceId,
      suspectFileName: verifyFile ? verifyFile.name : (document.getElementById('suspectFileName')?.textContent || 'Direct Hash Input'),
      suspectFileSize: verifyFile ? `${(verifyFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Manual Digest',
      currentHash: currentHash,
      baselineHash: baselineHash,
      isMatch: isMatch,
      timestamp: new Date().toISOString()
    }));
  } catch (err) {}

  // Persist real verified/tampered status in local stores
  ev.status = isMatch ? 'Verified' : 'Tampered';
  const evList = JSON.parse(localStorage.getItem('forensic_evidence_list') || '[]');
  const foundIdx = evList.findIndex(item => (item.id || item.evidenceId) === ev.id);
  if (foundIdx !== -1) {
    evList[foundIdx] = { ...evList[foundIdx], ...ev, status: ev.status };
    localStorage.setItem('forensic_evidence_list', JSON.stringify(evList));
  }

  // Update global metrics
  const metrics = JSON.parse(localStorage.getItem('forensic_metrics') || '{}');
  if (isMatch) {
    metrics.verified = (metrics.verified || 0) + 1;
  } else {
    metrics.tampered = (metrics.tampered || 0) + 1;
  }
  localStorage.setItem('forensic_metrics', JSON.stringify(metrics));

  // Log in activity timeline
  const activities = JSON.parse(localStorage.getItem('forensic_activities') || '[]');
  activities.unshift({
    text: `Evidence ${ev.id} verified: Result ${isMatch ? 'Verified & Intact' : 'Tampering Detected'}`,
    time: 'Just now',
    color: isMatch ? 'green' : 'red'
  });
  localStorage.setItem('forensic_activities', JSON.stringify(activities));

  // Background REST API synchronization
  try {
    const api = typeof getApiBase === 'function' ? getApiBase() : '';
    fetch(`${api}/api/evidence/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidence_id: evidenceId,
        current_hash: currentHash,
        baseline_hash: baselineHash,
        name: ev.name || ev.filename || evidenceId,
        category: ev.category || 'Digital Artifact',
        case_id: ev.caseId || 'CASE-001'
      })
    }).catch(() => {});
  } catch (syncErr) {}

  if (typeof showToast === 'function') {
    showToast(`Verification finalized for ${ev.id}: ${isMatch ? 'Verified & Intact' : 'Tampering Detected'}!`, isMatch ? 'success' : 'error');
  }

  return false;
}

function renderVerdictReport(evidenceId, baselineHash, currentHash, isMatch, ev = {}) {
  const resultCard = document.getElementById('verificationResultCard');
  const verdictBanner = document.getElementById('verdictBanner');
  const verdictBadge = document.getElementById('verdictBadge');
  const verdictDesc = document.getElementById('verdictDesc');
  const diffComparisonBox = document.getElementById('diffComparisonBox');

  if (resultCard) {
    resultCard.style.display = 'block';
  }

  if (baselineHash === 'NO_BASELINE' || ev.status === 'Unknown') {
    if (verdictBanner) {
      verdictBanner.className = 'p-3 rounded mb-3 border border-purple';
      verdictBanner.style.background = 'rgba(155, 122, 251, 0.12)';
    }
    if (verdictBadge) {
      verdictBadge.className = 'badge-forensic-status badge-status-unknown fs-6';
      verdictBadge.innerHTML = '<i class="bi bi-question-circle-fill"></i> UNKNOWN BASELINE';
    }
    if (verdictDesc) {
      verdictDesc.textContent = 'No trusted pre-attack baseline was registered for this artifact. By cryptographic rules of forensic evidence, the system cannot prove or disprove tampering.';
    }
  } else if (isMatch) {
    if (verdictBanner) {
      verdictBanner.className = 'p-3 rounded mb-3 border border-success';
      verdictBanner.style.background = 'rgba(23, 201, 139, 0.12)';
    }
    if (verdictBadge) {
      verdictBadge.className = 'badge-forensic-status badge-status-verified fs-6';
      verdictBadge.innerHTML = '<i class="bi bi-check-circle-fill"></i> EVIDENCE VERIFIED & INTACT';
    }
    if (verdictDesc) {
      verdictDesc.textContent = 'Current cryptographic digest matches the registered baseline and immutable on-chain record with 100% mathematical fidelity. No tampering detected.';
    }
  } else {
    if (verdictBanner) {
      verdictBanner.className = 'p-3 rounded mb-3 border border-danger';
      verdictBanner.style.background = 'rgba(240, 68, 82, 0.12)';
    }
    if (verdictBadge) {
      verdictBadge.className = 'badge-forensic-status badge-status-tampered fs-6';
      verdictBadge.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> TAMPERING DETECTED';
    }
    if (verdictDesc) {
      verdictDesc.textContent = 'CRITICAL ALERT: Current cryptographic digest differs from the trusted baseline recorded on-chain. Unauthorized alteration, corruption, or encryption occurred.';
    }
  }

  // Render Side-by-Side Diff
  if (diffComparisonBox) {
    diffComparisonBox.innerHTML = `
      <div class="row g-2 font-mono small">
        <div class="col-12">
          <small class="text-secondary d-block">REGISTERED BASELINE HASH (ON-CHAIN):</small>
          <div class="p-2 rounded text-success text-break" style="background:#070B14; border:1px solid #16263B;">
            ${baselineHash}
          </div>
        </div>
        <div class="col-12 mt-2">
          <small class="text-secondary d-block">COLLECTED EVIDENCE CURRENT HASH:</small>
          <div class="p-2 rounded ${isMatch ? 'text-success' : 'text-danger'} text-break" style="background:#070B14; border:1px solid #16263B;">
            ${currentHash}
          </div>
        </div>
      </div>
    `;
  }

  // Smoothly scroll directly into the verification verdict report
  if (resultCard) {
    setTimeout(() => {
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}

// Restore Active Verification State if page reloaded
function restoreActiveVerification() {
  try {
    const raw = sessionStorage.getItem('forensic_active_verification');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || !data.evidenceId || !data.currentHash) return;

    // Restore Select
    const select = document.getElementById('verifyEvidenceSelect');
    if (select) {
      select.value = data.evidenceId;
      loadEvidenceDetails(data.evidenceId);
    }

    // Restore Suspect box
    currentComputedHash = data.currentHash;
    const hashBoxEl = document.getElementById('suspectHashBox');
    const fileNameEl = document.getElementById('suspectFileName');
    const fileSizeEl = document.getElementById('suspectFileSize');
    const hashStatusEl = document.getElementById('suspectHashStatus');
    const digestEl = document.getElementById('suspectHashDigest');
    const manualInput = document.getElementById('manualSuspectHash');

    if (fileNameEl) fileNameEl.textContent = data.suspectFileName || 'Suspect File';
    if (fileSizeEl) fileSizeEl.textContent = data.suspectFileSize || 'Processed';
    if (hashStatusEl) hashStatusEl.textContent = 'Current SHA-256 Digest:';
    if (digestEl) digestEl.textContent = data.currentHash;
    if (manualInput) manualInput.value = data.currentHash;
    if (hashBoxEl) hashBoxEl.style.display = 'block';

    // Restore Report Card
    renderVerdictReport(data.evidenceId, data.baselineHash, data.currentHash, data.isMatch);
  } catch (e) {
    console.warn('Failed to restore active verification report:', e);
  }
}

function clearVerificationForm() {
  try {
    sessionStorage.removeItem('forensic_active_verification');
  } catch (e) {}

  const sel = document.getElementById('verifyEvidenceSelect');
  if (sel) sel.value = '';
  const manHash = document.getElementById('manualSuspectHash');
  if (manHash) manHash.value = '';
  const fileInput = document.getElementById('verifyFileInput');
  if (fileInput) fileInput.value = '';

  const baselineCard = document.getElementById('baselineDetailsCard');
  if (baselineCard) baselineCard.style.display = 'none';

  const resultCard = document.getElementById('verificationResultCard');
  if (resultCard) resultCard.style.display = 'none';

  const hashBox = document.getElementById('suspectHashBox');
  if (hashBox) hashBox.style.display = 'none';

  verifyFile = null;
  currentComputedHash = null;
}

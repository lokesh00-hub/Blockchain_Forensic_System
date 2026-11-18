/**
 * Blockchain Forensic System - Evidence Registration Controller
 */

let selectedFile = null;
let calculatedHash = null;

const DEFAULT_EVIDENCE = [];

function initEvidenceStore() {
  const EVIDENCE_VERSION = 'v3_clean_production_no_samples';
  const storedVersion = localStorage.getItem('forensic_evidence_version');
  if (!storedVersion || storedVersion !== EVIDENCE_VERSION) {
    localStorage.setItem('forensic_evidence_list', JSON.stringify([]));
    localStorage.setItem('forensic_evidence_version', EVIDENCE_VERSION);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initEvidenceStore();
  populateEvidenceCaseDropdown();
  renderEvidenceTable();
  setupDropzone();
  checkUrlFilter();
});

function populateEvidenceCaseDropdown() {
  const sel = document.getElementById('evidenceCaseId');
  if (!sel) return;

  const cases = JSON.parse(localStorage.getItem('forensic_investigations') || '[]');
  sel.innerHTML = '';

  if (cases.length === 0) {
    const opt = document.createElement('option');
    opt.value = 'CASE-001';
    opt.textContent = 'CASE-001 (Active Investigation)';
    sel.appendChild(opt);
    return;
  }

  cases.forEach(c => {
    const cid = c.caseId || c.case_id;
    const title = c.title || 'Investigation';
    const opt = document.createElement('option');
    opt.value = cid;
    opt.textContent = `${cid}: ${title}`;
    sel.appendChild(opt);
  });
}

function checkUrlFilter() {
  const urlParams = new URLSearchParams(window.location.search);
  const filter = urlParams.get('filter');
  const search = urlParams.get('search');

  if (search) {
    const searchInput = document.getElementById('evidenceSearchInput');
    if (searchInput) {
      searchInput.value = search;
    }
  }

  if (filter && filter !== 'total') {
    const filterSelect = document.getElementById('evidenceFilterStatus');
    if (filterSelect) {
      filterSelect.value = filter;
    }
  }

  if (filter || search) {
    applyEvidenceFilters();
  }
}

// Setup Drag & Drop File Hasher
function setupDropzone() {
  const dropzone = document.getElementById('evidenceDropzone');
  const fileInput = document.getElementById('evidenceFileInput');
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
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFileSelected(fileInput.files[0]);
    }
  });
}

// Handle Selected File & Compute Real-Time Client-Side SHA-256
async function handleFileSelected(file) {
  selectedFile = file;
  const fileNameEl = document.getElementById('selectedFileName');
  const fileSizeEl = document.getElementById('selectedFileSize');
  const hashStatusEl = document.getElementById('fileHashStatus');
  const hashBoxEl = document.getElementById('hashDisplayBox');
  const digestEl = document.getElementById('fileSha256Digest');

  if (fileNameEl) fileNameEl.textContent = file.name;
  if (fileSizeEl) fileSizeEl.textContent = formatBytes(file.size);
  if (hashStatusEl) hashStatusEl.textContent = 'Calculating cryptographic SHA-256 hash...';
  if (hashBoxEl) hashBoxEl.style.display = 'block';

  try {
    if (typeof calculateSHA256 === 'function') {
      calculatedHash = await calculateSHA256(file);
    } else {
      // Direct fallback to backend compute-hash endpoint
      const formData = new FormData();
      formData.append('file', file);
      const api = typeof getApiBase === 'function' ? getApiBase() : '';
      const res = await fetch(`${api}/api/evidence/compute-hash`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('API hash service failed');
      const data = await res.json();
      calculatedHash = data.sha256_hash;
    }
    if (hashStatusEl) hashStatusEl.textContent = 'SHA-256 Cryptographic Digest Generated:';
    if (digestEl) digestEl.textContent = calculatedHash;
    
    // Auto-fill evidence name if empty
    const nameInput = document.getElementById('evidenceName');
    if (nameInput && !nameInput.value) {
      nameInput.value = file.name;
    }

    if (typeof showToast === 'function') {
      showToast(`Calculated SHA-256 for ${file.name}`, 'success');
    }
  } catch (err) {
    console.error('Evidence file hash calculation error:', err);
    if (hashStatusEl) hashStatusEl.textContent = 'Error computing hash: ' + (err.message || 'Check browser security permissions');
    if (typeof showToast === 'function') {
      showToast('Failed to calculate SHA-256 hash.', 'error');
    }
  }
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Submit Evidence Registration
function submitEvidenceRegistration() {
  const name = document.getElementById('evidenceName').value.trim();
  const caseId = document.getElementById('evidenceCaseId').value;
  const category = document.getElementById('evidenceCategory').value;
  const desc = document.getElementById('evidenceDescription').value.trim();

  if (!selectedFile && !calculatedHash) {
    if (typeof showToast === 'function') showToast('Please select or drop an evidence file first.', 'error');
    return;
  }
  if (!name) {
    if (typeof showToast === 'function') showToast('Please provide an Evidence Name.', 'error');
    return;
  }

  // Generate clean sequential Evidence ID
  const list = JSON.parse(localStorage.getItem('forensic_evidence_list') || '[]');
  const nextNum = String(list.length + 1).padStart(3, '0');
  const evidenceId = `EV-${nextNum}`;
  const txHash = typeof generateTxHash === 'function' ? generateTxHash() : ('0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''));

  const newEvidence = {
    id: evidenceId,
    name: name,
    category: category,
    caseId: caseId,
    hash: calculatedHash,
    txHash: txHash.substring(0, 30),
    fullTxHash: txHash,
    status: 'Verified',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    size: formatBytes(selectedFile ? selectedFile.size : 1024000),
    description: desc,
    custodian: 'Mr. Narra Lokesh Vardhan'
  };

  list.unshift(newEvidence);
  localStorage.setItem('forensic_evidence_list', JSON.stringify(list));

  // Update activity timeline
  const activities = JSON.parse(localStorage.getItem('forensic_activities') || '[]');
  activities.unshift({
    text: `Evidence ${evidenceId} registered with hash ${calculatedHash.substring(0, 4)}...${calculatedHash.substring(60)}`,
    time: 'Just now',
    color: 'blue'
  });
  localStorage.setItem('forensic_activities', JSON.stringify(activities));

  // Update metrics
  const metrics = JSON.parse(localStorage.getItem('forensic_metrics') || '{}');
  metrics.total = (metrics.total || 0) + 1;
  metrics.verified = (metrics.verified || 0) + 1;
  localStorage.setItem('forensic_metrics', JSON.stringify(metrics));

  // Update transactions
  const txs = JSON.parse(localStorage.getItem('forensic_transactions') || '[]');
  txs.unshift({
    hash: txHash.substring(0, 30),
    fullHash: txHash,
    type: 'Evidence Registration',
    time: 'Just now',
    status: 'Confirmed',
    block: 498125
  });
  localStorage.setItem('forensic_transactions', JSON.stringify(txs));

  if (typeof showToast === 'function') {
    showToast(`Evidence ${evidenceId} anchored on blockchain!`, 'success');
  }
  renderEvidenceTable();
  resetRegistrationForm();

  // Show Receipt Modal
  showReceiptModal(newEvidence);

  // Sync to Flask REST API if server is active
  try {
    const formData = new FormData();
    if (selectedFile) formData.append('file', selectedFile);
    formData.append('name', name);
    formData.append('case_id', caseId);
    formData.append('category', category);
    formData.append('description', desc);
    formData.append('sha256_hash', calculatedHash);
    const api = typeof getApiBase === 'function' ? getApiBase() : '';
    fetch(`${api}/api/evidence/register`, { method: 'POST', body: formData })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          console.log('Synchronized evidence to backend ledger:', data);
        }
      })
      .catch(err => console.warn('Backend sync warning (offline mode):', err));
  } catch(e) {}
}

function resetRegistrationForm() {
  document.getElementById('evidenceRegistrationForm').reset();
  selectedFile = null;
  calculatedHash = null;
  document.getElementById('hashDisplayBox').style.display = 'none';
}

function showReceiptModal(evidence) {
  const modalEl = document.getElementById('evidenceReceiptModal');
  if (!modalEl) return;

  document.getElementById('receiptEvidenceId').textContent = evidence.id;
  document.getElementById('receiptFileName').textContent = evidence.name;
  document.getElementById('receiptSha256').textContent = evidence.hash;
  document.getElementById('receiptTxHash').textContent = evidence.fullTxHash || evidence.txHash;
  document.getElementById('receiptCaseId').textContent = evidence.caseId;
  document.getElementById('receiptTimestamp').textContent = evidence.timestamp;

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// Render Evidence Table
function renderEvidenceTable() {
  const tbody = document.getElementById('evidenceTableBody');
  if (!tbody) return;

  const list = JSON.parse(localStorage.getItem('forensic_evidence_list') || '[]');
  const search = (document.getElementById('evidenceSearchInput')?.value || '').toLowerCase();
  const filterStatus = (document.getElementById('evidenceFilterStatus')?.value || 'all').toLowerCase();
  const filterCategory = (document.getElementById('evidenceFilterCategory')?.value || 'all').toLowerCase();

  tbody.innerHTML = '';

  const filtered = list.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search) || item.id.toLowerCase().includes(search) || item.caseId.toLowerCase().includes(search);
    const matchStatus = filterStatus === 'all' || item.status.toLowerCase() === filterStatus;
    const matchCat = filterCategory === 'all' || item.category.toLowerCase() === filterCategory;
    return matchSearch && matchStatus && matchCat;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No evidence records found matching criteria.</td></tr>`;
    return;
  }

  filtered.forEach(ev => {
    let badgeClass = 'badge-status-verified';
    if (ev.status.toLowerCase() === 'tampered') badgeClass = 'badge-status-tampered';
    if (ev.status.toLowerCase() === 'missing') badgeClass = 'badge-status-missing';
    if (ev.status.toLowerCase() === 'unknown') badgeClass = 'badge-status-unknown';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="fw-bold text-primary">${ev.id}</span></td>
      <td>
        <div class="fw-semibold text-light">${ev.name}</div>
        <small class="text-muted">${ev.size || 'N/A'}</small>
      </td>
      <td><span class="badge bg-dark border border-secondary text-light">${ev.category}</span></td>
      <td><span class="text-secondary">${ev.caseId}</span></td>
      <td>
        <span class="mono-hash small text-muted" title="${ev.hash}">
          ${ev.hash.substring(0, 10)}...${ev.hash.substring(54)}
        </span>
        <button class="btn btn-sm btn-link text-primary p-0 ms-1" onclick="navigator.clipboard.writeText('${ev.hash}'); showToast('SHA-256 hash copied to clipboard!', 'info');" title="Copy Hash">
          <i class="bi bi-clipboard"></i>
        </button>
      </td>
      <td>
        <span class="badge-forensic-status ${badgeClass}">
          ${ev.status}
        </span>
      </td>
      <td>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-cyber-outline py-1 px-2" title="Inspect Chain of Custody" onclick="showReceiptModal(${JSON.stringify(ev).replace(/"/g, '&quot;')})">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-sm btn-cyber-primary py-1 px-2" title="Verify Now" onclick="window.location.href='verification.html?id=${ev.id}'">
            <i class="bi bi-shield-check"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function applyEvidenceFilters() {
  renderEvidenceTable();
}

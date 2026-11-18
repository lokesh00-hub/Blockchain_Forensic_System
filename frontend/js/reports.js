/**
 * Blockchain Forensic System - Forensic Reports Controller
 * Real-time synthesis, custom report uploads, disk vault management, and print preview
 */

let cachedCases = [];

document.addEventListener('DOMContentLoaded', () => {
  populateCaseDropdown();
  loadSavedReports();
});

// Fetch and populate cases list in dropdown
async function populateCaseDropdown() {
  const sel = document.getElementById('reportCaseSelect');
  if (!sel) return;

  try {
    const api = typeof getApiBase === 'function' ? getApiBase() : '';
    const res = await fetch(`${api}/api/investigations`);
    if (res.ok) {
      const data = await res.json();
      cachedCases = data.cases || [];
    }
  } catch (err) {
    console.warn('Backend investigations API unavailable, falling back to local store:', err);
  }

  // Fallback to local storage if API returned empty
  if (!cachedCases || cachedCases.length === 0) {
    cachedCases = JSON.parse(localStorage.getItem('forensic_investigations') || '[]');
  }

  sel.innerHTML = '';

  if (!cachedCases || cachedCases.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '-- No Cases Available --';
    sel.appendChild(opt);

    // Show empty state
    showEmptyState(true);
    return;
  }

  cachedCases.forEach(c => {
    const cid = c.caseId || c.case_id;
    const title = c.title || 'Untitled Case';
    const opt = document.createElement('option');
    opt.value = cid;
    opt.textContent = `${cid}: ${title}`;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => {
    generateForensicReport();
  });

  // Render initial report preview
  generateForensicReport();
}

function showEmptyState(isEmpty) {
  const emptyState = document.getElementById('reportEmptyState');
  const activeContent = document.getElementById('reportActiveContent');

  if (emptyState && activeContent) {
    if (isEmpty) {
      emptyState.style.display = 'block';
      activeContent.style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      activeContent.style.display = 'block';
    }
  }
}

// Generate Forensic Report Document Preview
function generateForensicReport() {
  const caseId = document.getElementById('reportCaseSelect')?.value;

  if (!caseId) {
    showEmptyState(true);
    return;
  }

  const includeHashes = document.getElementById('optIncludeHashes')?.checked ?? true;
  const includeBlockchain = document.getElementById('optIncludeBlockchain')?.checked ?? true;
  const includeChainOfCustody = document.getElementById('optIncludeChainOfCustody')?.checked ?? true;

  const cases = cachedCases.length > 0 ? cachedCases : JSON.parse(localStorage.getItem('forensic_investigations') || '[]');
  const evidenceList = JSON.parse(localStorage.getItem('forensic_evidence_list') || '[]');
  const c = cases.find(item => (item.caseId || item.case_id) === caseId);

  if (!c) {
    showEmptyState(true);
    return;
  }

  showEmptyState(false);

  const cid = c.caseId || c.case_id;
  const associated = evidenceList.filter(ev => (ev.caseId || ev.case_id) === cid);

  // Update Report Preview Fields
  const repDocNumber = document.getElementById('repDocNumber');
  const repDocDate = document.getElementById('repDocDate');
  const repHdrCaseId = document.getElementById('repHdrCaseId');
  const repHdrTitle = document.getElementById('repHdrTitle');
  const repHdrSeverity = document.getElementById('repHdrSeverity');
  const repHdrInvestigator = document.getElementById('repHdrInvestigator');
  const repHdrStatus = document.getElementById('repHdrStatus');
  const repSummaryText = document.getElementById('repSummaryText');
  const repAttestedInvestigator = document.getElementById('repAttestedInvestigator');

  const now = new Date();
  if (repDocNumber) repDocNumber.textContent = `REP-${cid}-${now.getFullYear()}`;
  if (repDocDate) repDocDate.textContent = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  if (repHdrCaseId) repHdrCaseId.textContent = cid;
  if (repHdrTitle) repHdrTitle.textContent = c.title || 'Digital Forensic Investigation';
  if (repHdrSeverity) repHdrSeverity.textContent = (c.severity || 'HIGH').toUpperCase();
  if (repHdrInvestigator) repHdrInvestigator.textContent = c.investigator || c.investigator_name || 'Mr. Narra Lokesh Vardhan';
  if (repHdrStatus) repHdrStatus.textContent = c.status || 'Active';
  if (repSummaryText) repSummaryText.textContent = c.description || 'Forensic investigation, artifact examination, and cryptographic integrity verification record.';
  if (repAttestedInvestigator) repAttestedInvestigator.textContent = `${c.investigator || c.investigator_name || 'Mr. Narra Lokesh Vardhan'}, Lead Forensic Analyst`;

  // Render Evidence Table in Report
  const repEvidenceTable = document.getElementById('repEvidenceTableBody');
  if (repEvidenceTable) {
    if (associated.length === 0) {
      repEvidenceTable.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">No associated evidence files registered under case ${cid}.</td></tr>`;
    } else {
      repEvidenceTable.innerHTML = associated.map(ev => {
        const hash = ev.hash || ev.sha256_hash || '';
        const shortHash = hash ? (hash.substring(0, 16) + '...' + hash.substring(hash.length - 8)) : '[No Hash]';
        const status = ev.status || ev.integrity_status || 'Verified';
        const badgeClass = status === 'Verified' ? 'bg-success' : (status === 'Tampered' ? 'bg-danger' : 'bg-warning');
        return `
          <tr>
            <td class="fw-bold">${ev.id || ev.evidence_id}</td>
            <td>${ev.name || ev.filename}</td>
            <td>${ev.category || 'Binary Artifact'}</td>
            <td><span class="badge ${badgeClass}">${status}</span></td>
            <td class="mono-hash small">${includeHashes ? shortHash : '[Redacted]'}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // Blockchain Ledger Section
  const repBlockchainSection = document.getElementById('repBlockchainSection');
  if (repBlockchainSection) {
    repBlockchainSection.style.display = includeBlockchain ? 'block' : 'none';
  }

  // Chain of Custody Section
  const repCustodySection = document.getElementById('repCustodySection');
  if (repCustodySection) {
    repCustodySection.style.display = includeChainOfCustody ? 'block' : 'none';
  }
}

// Download / Print Report
async function printForensicReport() {
  const caseId = document.getElementById('reportCaseSelect')?.value;
  if (!caseId) {
    if (typeof showToast === 'function') {
      showToast('Please select or create an investigation case first.', 'warning');
    } else {
      alert('Please select or create an investigation case first.');
    }
    return;
  }

  if (typeof showToast === 'function') {
    showToast(`Synthesizing court-defensible forensic report for ${caseId}...`, 'info');
  }

  // Trigger download from backend REST API
  try {
    const downloadLink = document.createElement('a');
    downloadLink.href = `/api/reports/${caseId}/download`;
    downloadLink.setAttribute('download', `Forensic_Report_${caseId}.pdf`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  } catch (e) {
    console.error('Download error:', e);
  }

  // Reload saved reports after generation
  setTimeout(() => {
    loadSavedReports();
    window.print();
  }, 1000);
}

// Load Real Generated & Uploaded Reports from Backend Vault
async function loadSavedReports() {
  const container = document.getElementById('savedReportsList');
  if (!container) return;

  try {
    const api = typeof getApiBase === 'function' ? getApiBase() : '';
    const res = await fetch(`${api}/api/reports`);
    if (!res.ok) throw new Error('API request failed');
    const data = await res.json();
    const reports = data.reports || [];

    if (reports.length === 0) {
      container.innerHTML = `
        <div class="text-center py-4 text-muted small">
          <i class="bi bi-folder2-open fs-2 d-block mb-2 text-secondary"></i>
          No reports in vault yet.<br>Generate from an investigation case or upload your own report file.
        </div>
      `;
      return;
    }

    container.innerHTML = reports.map(rep => `
      <div class="d-flex align-items-center justify-content-between p-3 rounded mb-2" style="background:#0D1626; border:1px solid #16263B;">
        <div class="me-2" style="min-width: 0;">
          <div class="fw-semibold text-light small text-truncate" title="${escapeHTML(rep.title)}">${escapeHTML(rep.title)}</div>
          <small class="text-muted d-block text-truncate">${escapeHTML(rep.id)} • ${escapeHTML(rep.date)} • ${escapeHTML(rep.size)}</small>
        </div>
        <div class="d-flex gap-1 flex-shrink-0">
          <a href="${rep.downloadUrl}" class="btn btn-sm btn-cyber-outline py-1 px-2" title="Download Document" download>
            <i class="bi bi-download"></i>
          </a>
          <button class="btn btn-sm btn-outline-danger py-1 px-2" title="Delete from Vault" onclick="deleteReport('${escapeHTML(rep.filename || rep.id)}')">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.warn('Unable to load reports from backend:', err);
    container.innerHTML = `
      <div class="text-center py-4 text-muted small">
        <i class="bi bi-folder2-open fs-2 d-block mb-2 text-secondary"></i>
        No reports in vault yet.<br>Generate a report above or upload your own file.
      </div>
    `;
  }
}

// Handle User Uploading Their Own Report File
async function handleUploadReport(event) {
  event.preventDefault();
  const fileInput = document.getElementById('customReportFile');
  const caseIdInput = document.getElementById('customReportCaseId');
  const uploadBtn = document.getElementById('uploadReportBtn');

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    if (typeof showToast === 'function') {
      showToast('Please choose a report file to upload.', 'warning');
    }
    return;
  }

  const file = fileInput.files[0];
  const caseId = caseIdInput?.value?.trim() || '';

  const formData = new FormData();
  formData.append('file', file);
  if (caseId) {
    formData.append('case_id', caseId);
  }

  if (uploadBtn) {
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Uploading...';
  }

  try {
    const api = typeof getApiBase === 'function' ? getApiBase() : '';
    const res = await fetch(`${api}/api/reports/upload`, {
      method: 'POST',
      body: formData
    });

    const result = await res.json();

    if (res.ok && result.status === 'success') {
      if (typeof showToast === 'function') {
        showToast(`Report "${file.name}" successfully stored in vault!`, 'success');
      } else {
        alert(`Report "${file.name}" successfully stored in vault!`);
      }
      document.getElementById('uploadReportForm')?.reset();
      loadSavedReports();
    } else {
      const msg = result.message || 'Failed to upload report file';
      if (typeof showToast === 'function') {
        showToast(msg, 'error');
      } else {
        alert(msg);
      }
    }
  } catch (err) {
    console.error('Upload failed:', err);
    if (typeof showToast === 'function') {
      showToast('Error uploading report document to backend server.', 'error');
    }
  } finally {
    if (uploadBtn) {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = '<i class="bi bi-upload"></i> Upload to Reports Vault';
    }
  }
}

// Delete Report from Vault
async function deleteReport(target) {
  if (!confirm(`Are you sure you want to permanently delete report "${target}" from the secure vault?`)) {
    return;
  }

  try {
    const api = typeof getApiBase === 'function' ? getApiBase() : '';
    const res = await fetch(`${api}/api/reports/${encodeURIComponent(target)}`, {
      method: 'DELETE'
    });
    const result = await res.json();

    if (res.ok && result.status === 'success') {
      if (typeof showToast === 'function') {
        showToast(`Report "${target}" deleted from vault.`, 'info');
      }
      loadSavedReports();
    } else {
      const msg = result.message || 'Failed to delete report';
      if (typeof showToast === 'function') {
        showToast(msg, 'error');
      }
    }
  } catch (err) {
    console.error('Delete error:', err);
    if (typeof showToast === 'function') {
      showToast('Error deleting report from server.', 'error');
    }
  }
}

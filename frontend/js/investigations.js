/**
 * Blockchain Forensic System - Investigation Management Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  renderInvestigations();
  setupCreateCaseForm();
});

// Render Investigation Cases
function renderInvestigations() {
  const container = document.getElementById('investigationsGrid');
  if (!container) return;

  const cases = JSON.parse(localStorage.getItem('forensic_investigations') || '[]');
  const search = (document.getElementById('caseSearchInput')?.value || '').toLowerCase();
  const filterSeverity = (document.getElementById('caseSeverityFilter')?.value || 'all').toLowerCase();
  const filterStatus = (document.getElementById('caseStatusFilter')?.value || 'all').toLowerCase();

  let storageNeedsUpdate = false;
  cases.forEach(c => {
    if (!c.investigator || c.investigator.includes('Alex')) {
      c.investigator = 'Mr. Narra Lokesh Vardhan';
      storageNeedsUpdate = true;
    }
  });
  if (storageNeedsUpdate) {
    localStorage.setItem('forensic_investigations', JSON.stringify(cases));
  }

  container.innerHTML = '';

  const filtered = cases.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search) || c.caseId.toLowerCase().includes(search) || c.description.toLowerCase().includes(search);
    const matchSev = filterSeverity === 'all' || c.severity.toLowerCase() === filterSeverity;
    const matchStat = filterStatus === 'all' || c.status.toLowerCase() === filterStatus;
    return matchSearch && matchSev && matchStat;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="col-12 text-center text-muted py-5"><i class="bi bi-briefcase fs-2 d-block mb-2 text-secondary"></i>No investigation cases found. Click "New Investigation" above to register a case.</div>`;
    return;
  }

  filtered.forEach(c => {
    let sevBadge = 'badge-critical';
    if (c.severity.toLowerCase() === 'high') sevBadge = 'badge-warning';
    if (c.severity.toLowerCase() === 'medium') sevBadge = 'badge-info';
    if (c.severity.toLowerCase() === 'low') sevBadge = 'badge-low';

    const col = document.createElement('div');
    col.className = 'col-lg-4 col-md-6';
    col.innerHTML = `
      <div class="cyber-card h-100 d-flex flex-column justify-content-between">
        <div>
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="fw-bold text-primary fs-5 font-heading">${c.caseId}</span>
            <span class="badge-pill-severity ${sevBadge}">${c.severity}</span>
          </div>

          <h5 class="text-white mb-2" style="font-size:1.05rem;">${c.title}</h5>
          <p class="text-secondary small mb-3" style="line-height:1.4;">${c.description}</p>
        </div>

        <div>
          <div class="p-2 rounded mb-3" style="background:#0D1626; border:1px solid #16263B;">
            <div class="d-flex justify-content-between small text-secondary mb-1">
              <span>Incident Date:</span>
              <span class="text-light">${c.date}</span>
            </div>
            <div class="d-flex justify-content-between small text-secondary mb-1">
              <span>Lead Investigator:</span>
              <span class="text-light">${c.investigator}</span>
            </div>
            <div class="d-flex justify-content-between small text-secondary">
              <span>Associated Evidence:</span>
              <span class="text-primary fw-bold">${c.evidenceCount} Artifacts</span>
            </div>
          </div>

          <div class="d-flex justify-content-between align-items-center">
            <span class="badge bg-dark border border-secondary text-info">${c.status}</span>
            <button class="btn btn-sm btn-cyber-outline" onclick="openCaseDetails('${c.caseId}')">
              <i class="bi bi-eye"></i> View Case
            </button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(col);
  });
}

// Open Case Details Modal
function openCaseDetails(caseId) {
  const cases = JSON.parse(localStorage.getItem('forensic_investigations') || '[]');
  const c = cases.find(item => item.caseId === caseId);
  if (!c) return;

  const modalEl = document.getElementById('caseDetailsModal');
  if (!modalEl) return;

  document.getElementById('modalCaseId').textContent = c.caseId;
  document.getElementById('modalCaseTitle').textContent = c.title;
  document.getElementById('modalCaseSeverity').textContent = c.severity.toUpperCase();
  document.getElementById('modalCaseDate').textContent = c.date;
  document.getElementById('modalCaseInvestigator').textContent = (c.investigator && !c.investigator.includes('Alex')) ? c.investigator : 'Mr. Narra Lokesh Vardhan';
  document.getElementById('modalCaseStatus').textContent = c.status;
  document.getElementById('modalCaseDesc').textContent = c.description;

  // Retrieve Associated Evidence
  const evidenceList = JSON.parse(localStorage.getItem('forensic_evidence_list') || '[]');
  const associated = evidenceList.filter(ev => ev.caseId === caseId);
  const evidenceContainer = document.getElementById('modalCaseEvidenceList');
  
  if (associated.length === 0) {
    evidenceContainer.innerHTML = `<div class="text-muted small py-2">No evidence files currently associated.</div>`;
  } else {
    evidenceContainer.innerHTML = associated.map(ev => `
      <div class="d-flex align-items-center justify-content-between p-2 rounded mb-1" style="background:#0D1626; border:1px solid #16263B;">
        <div>
          <span class="fw-bold text-primary small me-2">${ev.id}</span>
          <span class="text-light small">${ev.name}</span>
        </div>
        <span class="badge-forensic-status badge-status-${ev.status.toLowerCase()} py-0 px-2" style="font-size:0.7rem;">${ev.status}</span>
      </div>
    `).join('');
  }

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// Setup Create Case Form
function setupCreateCaseForm() {
  const form = document.getElementById('createCaseForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('newCaseTitle').value.trim();
    const severity = document.getElementById('newCaseSeverity').value;
    const date = document.getElementById('newCaseDate').value;
    const desc = document.getElementById('newCaseDesc').value.trim();

    if (!title || !desc) {
      showToast('Please provide a title and incident description.', 'error');
      return;
    }

    const cases = JSON.parse(localStorage.getItem('forensic_investigations') || '[]');
    const caseId = `CASE-${String(cases.length + 1).padStart(3, '0')}`;

    const newCase = {
      caseId: caseId,
      title: title,
      severity: severity,
      status: 'Active',
      date: date || new Date().toISOString().substring(0, 10),
      investigator: 'Mr. Narra Lokesh Vardhan',
      evidenceCount: 0,
      description: desc
    };

    cases.unshift(newCase);
    localStorage.setItem('forensic_investigations', JSON.stringify(cases));

    // Update Activity Timeline
    const activities = JSON.parse(localStorage.getItem('forensic_activities') || '[]');
    activities.unshift({
      text: `Case ${caseId} created: ${title}`,
      time: 'Just now',
      color: 'blue'
    });
    localStorage.setItem('forensic_activities', JSON.stringify(activities));

    showToast(`Case ${caseId} created and initialized.`, 'success');
    renderInvestigations();
    form.reset();

    const modalEl = document.getElementById('createCaseModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
  });
}

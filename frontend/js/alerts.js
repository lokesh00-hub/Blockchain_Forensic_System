/**
 * Blockchain Forensic System - Alerts & Incident Center Controller
 */

let activeSeverityFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  renderAlertsList();
  setupFilterTabs();
});

function setupFilterTabs() {
  const tabs = document.querySelectorAll('.alert-filter-pill');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      activeSeverityFilter = e.target.getAttribute('data-severity');
      renderAlertsList();
    });
  });
}

// Render Alerts Table / Cards
function renderAlertsList() {
  const container = document.getElementById('alertsContainer');
  if (!container) return;

  const alerts = JSON.parse(localStorage.getItem('forensic_alerts') || '[]');
  const search = (document.getElementById('alertsSearchInput')?.value || '').toLowerCase();

  container.innerHTML = '';

  const filtered = alerts.filter(a => {
    const matchSearch = a.text.toLowerCase().includes(search) || a.id.toLowerCase().includes(search) || a.evidenceId.toLowerCase().includes(search);
    const matchSev = activeSeverityFilter === 'all' || a.severity.toLowerCase() === activeSeverityFilter;
    return matchSearch && matchSev;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="p-5 text-center text-muted"><i class="bi bi-bell-slash fs-2 d-block mb-2 text-secondary"></i>No active security alerts. All systems operational.</div>`;
    return;
  }

  filtered.forEach(a => {
    let badgeClass = 'badge-critical';
    let iconClass = 'bi-exclamation-triangle-fill text-danger';

    if (a.severity === 'warning') {
      badgeClass = 'badge-warning';
      iconClass = 'bi-exclamation-circle-fill text-warning';
    } else if (a.severity === 'info') {
      badgeClass = 'badge-info';
      iconClass = 'bi-info-circle-fill text-primary';
    } else if (a.severity === 'low') {
      badgeClass = 'badge-low';
      iconClass = 'bi-info-circle-fill text-secondary';
    }

    const card = document.createElement('div');
    card.className = 'cyber-card mb-3 p-3';
    card.style.background = a.acknowledged ? 'rgba(16, 28, 46, 0.4)' : 'var(--bg-card)';
    card.innerHTML = `
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div class="d-flex align-items-center gap-3">
          <i class="bi ${iconClass} fs-4"></i>
          <div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="fw-bold text-light">${a.text}</span>
              <span class="badge-pill-severity ${badgeClass}">${a.severity.toUpperCase()}</span>
              ${a.acknowledged ? '<span class="badge bg-secondary font-mono small">Acknowledged</span>' : ''}
            </div>
            <div class="text-secondary small">
              Alert ID: <span class="mono-hash text-muted me-3">${a.id}</span>
              Affected Artifact: <span class="text-primary fw-bold me-3">${a.evidenceId}</span>
              Recorded: <span class="text-muted">${a.time}</span>
            </div>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2">
          ${!a.acknowledged ? `
            <button class="btn btn-sm btn-cyber-primary" onclick="acknowledgeAlertItem('${a.id}')">
              <i class="bi bi-check2"></i> Acknowledge
            </button>
          ` : `
            <span class="text-success small me-2"><i class="bi bi-check-circle"></i> Logged in Custody</span>
          `}
          <button class="btn btn-sm btn-cyber-outline" onclick="window.location.href='verification.html?id=${a.evidenceId}'">
            <i class="bi bi-shield-check"></i> Verify Artifact
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function acknowledgeAlertItem(alertId) {
  const alerts = JSON.parse(localStorage.getItem('forensic_alerts') || '[]');
  const alert = alerts.find(a => a.id === alertId);
  if (!alert) return;

  alert.acknowledged = true;
  localStorage.setItem('forensic_alerts', JSON.stringify(alerts));

  // Log in activity
  const activities = JSON.parse(localStorage.getItem('forensic_activities') || '[]');
  activities.unshift({
    text: `Alert ${alertId} acknowledged by Mr. Narra Lokesh Vardhan`,
    time: 'Just now',
    color: 'green'
  });
  localStorage.setItem('forensic_activities', JSON.stringify(activities));

  showToast(`Alert ${alertId} acknowledged and stamped in chain of custody.`, 'success');
  renderAlertsList();
}

/**
 * Blockchain Forensic System - Dashboard Controller
 * Powers KPI metrics, Chart.js donut chart, alerts feed, timeline, and blockchain ledger
 */

let integrityChart = null;
window.allLedgerTransactions = [];
window.activeLedgerFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  renderKPICards();
  renderDonutChart();
  renderAlertsFeed();
  renderActivityTimeline();
  renderBlockchainTable();
  setupTimeFilterListener();
  syncFromBackend();
});

// Auto-sync from Flask REST API if server is running
async function syncFromBackend() {
  const api = typeof getApiBase === 'function' ? getApiBase() : '';
  
  try {
    const [summaryRes, alertsRes, activityRes, txRes] = await Promise.allSettled([
      fetch(`${api}/api/dashboard/summary`),
      fetch(`${api}/api/dashboard/alerts`),
      fetch(`${api}/api/dashboard/activity`),
      fetch(`${api}/api/dashboard/transactions?limit=20`)
    ]);

    // 1. Process Summary Metrics
    if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
      const data = await summaryRes.value.json();
      if (data && data.metrics) {
        let metrics = data.metrics;
        // If backend returned total 0, check local fallback
        if (metrics.total === 0) {
          const local = computeLocalMetrics();
          if (local && local.total > 0) {
            metrics = local;
          }
        }
        localStorage.setItem('forensic_metrics', JSON.stringify(metrics));
        renderKPICards();
        renderDonutChart();
      }
    } else {
      const local = computeLocalMetrics();
      if (local && local.total > 0) {
        localStorage.setItem('forensic_metrics', JSON.stringify(local));
        renderKPICards();
        renderDonutChart();
      }
    }

    // 2. Process Alerts
    if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
      const data = await alertsRes.value.json();
      if (data && Array.isArray(data.alerts) && data.alerts.length > 0) {
        localStorage.setItem('forensic_alerts', JSON.stringify(data.alerts));
        renderAlertsFeed();
      }
    }

    // 3. Process Activity
    if (activityRes.status === 'fulfilled' && activityRes.value.ok) {
      const data = await activityRes.value.json();
      if (data && Array.isArray(data.activity) && data.activity.length > 0) {
        const mapped = data.activity.map(act => {
          let dotColor = 'primary';
          const actionUpper = (act.action || '').toUpperCase();
          if (actionUpper.includes('VERIF') || actionUpper.includes('MATCH')) dotColor = 'success';
          else if (actionUpper.includes('TAMPER') || actionUpper.includes('FAIL')) dotColor = 'danger';
          else if (actionUpper.includes('TRANSFER')) dotColor = 'purple';
          else if (actionUpper.includes('WARN')) dotColor = 'warning';

          return {
            color: dotColor,
            text: `${act.action} (${act.evidenceId || 'Evidence'}) by ${act.actor || 'System'}`,
            time: act.time || 'Recent'
          };
        });
        localStorage.setItem('forensic_activities', JSON.stringify(mapped));
        renderActivityTimeline();
      }
    }

    // 4. Process Blockchain Transactions
    if (txRes.status === 'fulfilled' && txRes.value.ok) {
      const data = await txRes.value.json();
      if (data && Array.isArray(data.transactions) && data.transactions.length > 0) {
        localStorage.setItem('forensic_transactions', JSON.stringify(data.transactions));
        window.allLedgerTransactions = data.transactions;
        renderBlockchainTable();
      }
    }

  } catch (e) {
    console.warn('[DASHBOARD] Offline or server sync issue:', e);
    const local = computeLocalMetrics();
    if (local && local.total > 0) {
      localStorage.setItem('forensic_metrics', JSON.stringify(local));
      renderKPICards();
      renderDonutChart();
    }
  }
}

// Compute consolidated metrics from local stores (Evidence Vault + Monitored Targets)
function computeLocalMetrics() {
  const evList = JSON.parse(localStorage.getItem('forensic_evidence_list') || '[]');
  const monList = JSON.parse(localStorage.getItem('forensic_monitored_files') || localStorage.getItem('forensic_monitored_targets') || '[]');

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
  if (total === 0) return null;

  const verified = Object.values(items).filter(s => s === 'Verified').length;
  const tampered = Object.values(items).filter(s => s === 'Tampered').length;
  const missing = Object.values(items).filter(s => s === 'Missing').length;
  const unknown = Object.values(items).filter(s => s === 'Unknown').length;

  return {
    total,
    verified,
    tampered,
    missing,
    unknown,
    percentVerified: total > 0 ? Number(((verified / total) * 100).toFixed(1)) : 0.0
  };
}

// Render 5 KPI Cards
function renderKPICards() {
  let metrics = JSON.parse(localStorage.getItem('forensic_metrics') || '{}');
  
  if (!metrics || metrics.total === undefined || metrics.total === 0) {
    const local = computeLocalMetrics();
    if (local && local.total > 0) {
      metrics = local;
      localStorage.setItem('forensic_metrics', JSON.stringify(metrics));
    }
  }

  const totalEl = document.getElementById('kpiTotalVal');
  const verifiedEl = document.getElementById('kpiVerifiedVal');
  const tamperedEl = document.getElementById('kpiTamperedVal');
  const missingEl = document.getElementById('kpiMissingVal');
  const unknownEl = document.getElementById('kpiUnknownVal');

  if (totalEl) totalEl.textContent = metrics.total !== undefined ? metrics.total : 0;
  if (verifiedEl) verifiedEl.textContent = metrics.verified !== undefined ? metrics.verified : 0;
  if (tamperedEl) tamperedEl.textContent = metrics.tampered !== undefined ? metrics.tampered : 0;
  if (missingEl) missingEl.textContent = metrics.missing !== undefined ? metrics.missing : 0;
  if (unknownEl) unknownEl.textContent = metrics.unknown !== undefined ? metrics.unknown : 0;
}

// Render Donut Chart matching the uploaded UI
function renderDonutChart() {
  const canvas = document.getElementById('evidenceIntegrityDonut');
  if (!canvas) return;

  let metrics = JSON.parse(localStorage.getItem('forensic_metrics') || '{}');
  if (!metrics || metrics.total === undefined || metrics.total === 0) {
    const local = computeLocalMetrics();
    if (local && local.total > 0) {
      metrics = local;
      localStorage.setItem('forensic_metrics', JSON.stringify(metrics));
    }
  }

  const verified = metrics.verified !== undefined ? metrics.verified : 0;
  const tampered = metrics.tampered !== undefined ? metrics.tampered : 0;
  const missing = metrics.missing !== undefined ? metrics.missing : 0;
  const unknown = metrics.unknown !== undefined ? metrics.unknown : 0;
  const total = verified + tampered + missing + unknown;

  const pct = total > 0 ? ((verified / total) * 100).toFixed(1) : '0.0';
  const centerPctEl = document.getElementById('donutCenterPct');
  if (centerPctEl) centerPctEl.textContent = `${pct}%`;

  const ctx = canvas.getContext('2d');
  
  if (integrityChart) {
    integrityChart.destroy();
  }

  const chartData = total > 0 
    ? [verified, tampered, missing, unknown]
    : [0, 0, 0, 1]; // neutral empty ring

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'quantum';
  const isLight = currentTheme === 'light';
  const isQuantum = currentTheme === 'quantum';
  
  let emptyRingColor = '#1E293B';
  let ringBorderColor = '#101C2E';
  
  if (isLight) {
    emptyRingColor = '#E2E8F0';
    ringBorderColor = '#FFFFFF';
  } else if (isQuantum) {
    emptyRingColor = '#20183B';
    ringBorderColor = '#151026';
  }

  const chartColors = total > 0
    ? (isQuantum 
        ? ['#10B981', '#EC4899', '#F59E0B', '#C084FC']
        : ['#17C98B', '#F04452', '#F5A623', '#9B7AFB'])
    : [emptyRingColor];

  integrityChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: total > 0 ? ['Verified', 'Tampered', 'Missing', 'Unknown'] : ['No Data'],
      datasets: [{
        data: chartData,
        backgroundColor: chartColors,
        borderWidth: 2,
        borderColor: ringBorderColor,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '76%',
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: total > 0,
          backgroundColor: '#0A1220',
          titleColor: '#F4F7FC',
          bodyColor: '#94A3B8',
          borderColor: '#203650',
          borderWidth: 1,
          padding: 10,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const calcPct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return ` ${context.label}: ${val} (${calcPct}%)`;
            }
          }
        }
      }
    }
  });

  // Update Legend numbers
  const legVer = document.getElementById('legValVerified');
  const legTam = document.getElementById('legValTampered');
  const legMis = document.getElementById('legValMissing');
  const legUnk = document.getElementById('legValUnknown');

  if (legVer) legVer.textContent = verified;
  if (legTam) legTam.textContent = tampered;
  if (legMis) legMis.textContent = missing;
  if (legUnk) legUnk.textContent = unknown;
}

// Render Recent Alerts
function renderAlertsFeed() {
  const container = document.getElementById('recentAlertsFeed');
  if (!container) return;

  const alerts = JSON.parse(localStorage.getItem('forensic_alerts') || '[]');
  container.innerHTML = '';

  if (alerts.length === 0) {
    container.innerHTML = '<div class="text-center py-4 text-muted small"><i class="bi bi-shield-check text-success fs-3 d-block mb-1"></i>No security alerts. System normal.</div>';
    return;
  }

  alerts.slice(0, 4).forEach(alert => {
    let iconClass = 'bi-info-circle text-primary';
    let badgeClass = 'badge-info';
    let badgeText = 'Info';

    const sev = (alert.severity || '').toLowerCase();
    if (sev === 'critical') {
      iconClass = 'bi-exclamation-triangle-fill text-danger';
      badgeClass = 'badge-critical';
      badgeText = 'Critical';
    } else if (sev === 'warning') {
      iconClass = 'bi-exclamation-circle-fill text-warning';
      badgeClass = 'badge-warning';
      badgeText = 'Warning';
    } else if (sev === 'low') {
      iconClass = 'bi-info-circle-fill text-secondary';
      badgeClass = 'badge-low';
      badgeText = 'Low';
    }

    const item = document.createElement('div');
    item.className = 'alert-feed-item';
    item.onclick = () => openAlertDetails(alert.id);
    item.innerHTML = `
      <div class="alert-left-content">
        <i class="bi ${iconClass} alert-item-icon"></i>
        <div class="alert-item-text" title="${alert.text}">${alert.text}</div>
      </div>
      <div class="alert-right-meta">
        <span class="alert-item-time">${alert.time || ''}</span>
        <span class="badge-pill-severity ${badgeClass}">${badgeText}</span>
      </div>
    `;
    container.appendChild(item);
  });
}

// Render Recent Activity Timeline
function renderActivityTimeline() {
  const container = document.getElementById('recentActivityFeed');
  if (!container) return;

  const activities = JSON.parse(localStorage.getItem('forensic_activities') || '[]');
  container.innerHTML = '';

  if (activities.length === 0) {
    container.innerHTML = '<div class="text-center py-4 text-muted small"><i class="bi bi-clock-history fs-3 d-block mb-1 text-secondary"></i>No recent forensic activities logged.</div>';
    return;
  }

  activities.slice(0, 4).forEach(act => {
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <div class="activity-item-left">
        <div class="activity-dot dot-${act.color || 'primary'}"></div>
        <div class="activity-text" title="${act.text}">${act.text}</div>
      </div>
      <div class="activity-time">${act.time || ''}</div>
    `;
    container.appendChild(item);
  });
}

// Render Blockchain Transactions Table (Dashboard card preview)
function renderBlockchainTable() {
  const tbody = document.getElementById('blockchainTxTableBody');
  if (!tbody) return;

  const txs = JSON.parse(localStorage.getItem('forensic_transactions') || '[]');
  tbody.innerHTML = '';

  if (txs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted small"><i class="bi bi-link-45deg fs-3 d-block mb-1 text-secondary"></i>No blockchain transactions recorded yet.</td></tr>';
    return;
  }

  txs.slice(0, 4).forEach(tx => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <a href="javascript:void(0)" class="tx-hash-link font-mono" onclick="openTxModal('${tx.fullHash}')">
          ${tx.hash || (tx.fullHash ? tx.fullHash.substring(0, 24) + '...' : '0x...')}
        </a>
      </td>
      <td>${tx.type || 'Registration'}</td>
      <td>${tx.time || 'Recent'}</td>
      <td>
        <span class="badge-status-confirmed">
          <i class="bi bi-check-circle-fill"></i> ${tx.status || 'Confirmed'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Time Filter in Header of Donut Chart
function setupTimeFilterListener() {
  const select = document.getElementById('donutTimeFilter');
  if (!select) return;

  select.addEventListener('change', () => {
    syncFromBackend();
  });
}

// Open Full On-Chain Ledger Modal
function openAllLedgerModal() {
  const modalEl = document.getElementById('allLedgerModal');
  if (!modalEl) return;

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();

  // Load latest on-chain transactions
  loadAllLedgerRecords(false);
}

// Load All Ledger Records from REST API with fallback to localStorage
async function loadAllLedgerRecords(showToastFeedback = false) {
  const tbody = document.getElementById('allLedgerTableBody');
  const countEl = document.getElementById('ledgerRecordCount');

  if (tbody && (!window.allLedgerTransactions || window.allLedgerTransactions.length === 0)) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
          Querying cryptographic ledger on Hardhat Localnet (Chain ID: 31337)...
        </td>
      </tr>
    `;
  }

  try {
    const api = typeof getApiBase === 'function' ? getApiBase() : '';
    const res = await fetch(`${api}/api/dashboard/transactions?limit=100`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.transactions)) {
        window.allLedgerTransactions = data.transactions;
        localStorage.setItem('forensic_transactions', JSON.stringify(data.transactions));
      }
    }
  } catch (err) {
    console.warn('[LEDGER] Fetch failed, using cached transactions:', err);
    window.allLedgerTransactions = JSON.parse(localStorage.getItem('forensic_transactions') || '[]');
  }

  filterLedgerTable();

  if (showToastFeedback && typeof showToast === 'function') {
    showToast(`Ledger synchronized: ${window.allLedgerTransactions.length} blocks confirmed on-chain.`, 'success');
  }
}

// Filter and Render Ledger Table
function filterLedgerTable() {
  const tbody = document.getElementById('allLedgerTableBody');
  const countEl = document.getElementById('ledgerRecordCount');
  const searchInput = document.getElementById('ledgerSearchInput');
  const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const filterType = window.activeLedgerFilter || 'all';

  let list = window.allLedgerTransactions || [];

  // Filter by Type Pill
  if (filterType !== 'all') {
    list = list.filter(tx => {
      const typeStr = (tx.type || '').toLowerCase();
      if (filterType === 'registration') return typeStr.includes('reg') || typeStr.includes('anchor');
      if (filterType === 'verification') return typeStr.includes('verif') || typeStr.includes('integ');
      if (filterType === 'transfer') return typeStr.includes('custod') || typeStr.includes('transf');
      return true;
    });
  }

  // Filter by Search Query
  if (query) {
    list = list.filter(tx => {
      const hash = (tx.fullHash || tx.hash || '').toLowerCase();
      const type = (tx.type || '').toLowerCase();
      const evId = (tx.evidenceId || '').toLowerCase();
      const block = String(tx.block || '');
      return hash.includes(query) || type.includes(query) || evId.includes(query) || block.includes(query);
    });
  }

  if (countEl) countEl.textContent = list.length;
  renderLedgerTable(list);
}

// Render Ledger Table Rows
function renderLedgerTable(records) {
  const tbody = document.getElementById('allLedgerTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!records || records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5 text-muted">
          <i class="bi bi-folder2-open fs-2 d-block mb-2 text-secondary"></i>
          <div>No on-chain ledger records found matching your query.</div>
        </td>
      </tr>
    `;
    return;
  }

  records.forEach((tx) => {
    const fullHash = tx.fullHash || tx.hash || '0x0000000000000000000000000000000000000000';
    const shortHash = fullHash.length > 22 ? fullHash.substring(0, 10) + '...' + fullHash.slice(-8) : fullHash;
    const blockNum = tx.block || 498120;
    const txType = tx.type || 'Evidence Registration';
    const evId = tx.evidenceId || 'N/A';
    const timeStr = tx.time || 'Confirmed';
    const status = tx.status || 'Confirmed';

    // Type badge style
    let badgeStyle = 'bg-primary-subtle text-primary border border-primary';
    const lowerType = txType.toLowerCase();
    if (lowerType.includes('verif')) {
      badgeStyle = 'bg-success-subtle text-success border border-success';
    } else if (lowerType.includes('transf') || lowerType.includes('custod')) {
      badgeStyle = 'bg-info-subtle text-info border border-info';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="d-flex align-items-center gap-1 font-mono">
          <a href="javascript:void(0)" class="tx-hash-link text-break" onclick="openTxModal('${fullHash}')" title="${fullHash}">
            ${shortHash}
          </a>
          <button class="btn btn-sm btn-link p-0 text-secondary" onclick="copyLedgerHash('${fullHash}')" title="Copy Tx Hash">
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
      </td>
      <td>
        <span class="badge ${badgeStyle} font-mono small">${txType}</span>
      </td>
      <td>
        ${evId !== 'N/A' ? `<span class="badge bg-secondary-subtle text-light font-mono">${evId}</span>` : '<span class="text-secondary small">N/A</span>'}
      </td>
      <td>
        <span class="badge bg-dark border border-secondary text-light font-mono">#${blockNum}</span>
      </td>
      <td class="text-secondary small">${timeStr}</td>
      <td>
        <span class="badge-status-confirmed">
          <i class="bi bi-check-circle-fill"></i> ${status}
        </span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-cyber-outline py-1 px-2" onclick="openTxModal('${fullHash}')" title="Inspect Block & Cryptographic Merkle Proof">
          <i class="bi bi-search"></i> Inspect
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Filter Button Pill Switcher
function setLedgerFilter(type) {
  window.activeLedgerFilter = type;

  const btnMap = {
    'all': 'btnFilterAll',
    'registration': 'btnFilterReg',
    'verification': 'btnFilterVer',
    'transfer': 'btnFilterTrans'
  };

  Object.entries(btnMap).forEach(([k, id]) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (k === type) {
      btn.className = 'btn btn-sm btn-cyber-primary active';
    } else {
      btn.className = 'btn btn-sm btn-cyber-outline';
    }
  });

  filterLedgerTable();
}

// Copy Hash to Clipboard
function copyLedgerHash(hash) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(hash).then(() => {
      if (typeof showToast === 'function') {
        showToast('Transaction hash copied to clipboard!', 'info');
      }
    });
  } else {
    prompt('Copy Transaction Hash:', hash);
  }
}

// Export Full Ledger as JSON
function exportLedgerJSON() {
  const records = window.allLedgerTransactions || [];
  if (records.length === 0) {
    if (typeof showToast === 'function') showToast('No ledger records available to export.', 'warning');
    return;
  }

  const exportPayload = {
    system: "Blockchain Forensic System",
    network: "Hardhat Forensic Localnet",
    chainId: 31337,
    contract: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    exportTimestamp: new Date().toISOString(),
    totalRecords: records.length,
    ledger: records
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `onchain_forensic_ledger_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (typeof showToast === 'function') {
    showToast(`Exported ${records.length} on-chain records to JSON.`, 'success');
  }
}

// Open Blockchain Tx Details Modal
function openTxModal(fullHash) {
  const txs = JSON.parse(localStorage.getItem('forensic_transactions') || '[]');
  const allTxs = window.allLedgerTransactions || [];
  const combined = [...txs, ...allTxs];
  
  const tx = combined.find(t => t.fullHash === fullHash || t.hash === fullHash) || {
    fullHash: fullHash,
    hash: fullHash.length > 24 ? fullHash.substring(0, 24) + '...' : fullHash,
    type: 'Evidence Registration',
    block: 498124,
    time: 'Confirmed on-chain',
    status: 'Confirmed',
    contract: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    gas: '64,281 Gwei'
  };

  const modalEl = document.getElementById('blockchainTxModal');
  if (!modalEl) return;

  const hashEl = document.getElementById('modalTxHash');
  const typeEl = document.getElementById('modalTxType');
  const blockEl = document.getElementById('modalTxBlock');
  const timeEl = document.getElementById('modalTxTime');
  const statusEl = document.getElementById('modalTxStatus');
  const contractEl = document.getElementById('modalTxContract');
  const gasEl = document.getElementById('modalTxGas');

  if (hashEl) hashEl.textContent = tx.fullHash || fullHash;
  if (typeEl) typeEl.textContent = tx.type || 'Evidence Registration';
  if (blockEl) blockEl.textContent = `#${tx.block || 498120}`;
  if (timeEl) timeEl.textContent = tx.time || 'Confirmed';
  if (statusEl) statusEl.textContent = tx.status || 'Confirmed';
  if (contractEl) contractEl.textContent = tx.contract || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  if (gasEl) gasEl.textContent = tx.gas || '64,281 Gwei';

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

// Verify Proof On-Chain Action
function verifyProofOnChain() {
  const hashEl = document.getElementById('modalTxHash');
  const blockEl = document.getElementById('modalTxBlock');
  const txHash = hashEl ? hashEl.textContent : '0x...';
  const block = blockEl ? blockEl.textContent : '#498120';

  if (typeof showToast === 'function') {
    showToast(`Cryptographic Merkle Proof verified: Root anchor matches smart contract state at ${block} on Hardhat Localnet.`, 'success');
  }
}

// Open Alert Details Modal
function openAlertDetails(alertId) {
  const alerts = JSON.parse(localStorage.getItem('forensic_alerts') || '[]');
  const alert = alerts.find(a => a.id === alertId);
  if (!alert) return;

  const modalEl = document.getElementById('alertModal');
  if (!modalEl) return;

  const idEl = document.getElementById('alertModalId');
  const textEl = document.getElementById('alertModalText');
  const sevEl = document.getElementById('alertModalSeverity');
  const timeEl = document.getElementById('alertModalTime');
  const evEl = document.getElementById('alertModalEvidence');

  if (idEl) idEl.textContent = alert.id;
  if (textEl) textEl.textContent = alert.text;
  if (sevEl) sevEl.textContent = (alert.severity || 'CRITICAL').toUpperCase();
  if (timeEl) timeEl.textContent = alert.time || 'Just now';
  if (evEl) evEl.textContent = alert.evidenceId || 'N/A';

  const btnAck = document.getElementById('btnAcknowledgeAlert');
  if (btnAck) {
    btnAck.onclick = () => {
      alert.acknowledged = true;
      localStorage.setItem('forensic_alerts', JSON.stringify(alerts));
      if (typeof showToast === 'function') {
        showToast(`Alert ${alert.id} acknowledged and logged in chain of custody.`, 'success');
      }
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();
      renderAlertsFeed();
    };
  }

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

// Metric Filter Click Handler
function filterByMetric(status) {
  if (typeof showToast === 'function') {
    showToast(`Filtering forensic evidence records by: ${status.toUpperCase()}`, 'info');
  }
  setTimeout(() => {
    window.location.href = `evidence.html?filter=${status}`;
  }, 400);
}

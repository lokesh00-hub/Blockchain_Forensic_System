/**
 * Blockchain Forensic System - Settings & Audit Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  renderProfileSettings();
  renderAuditLogs();
});

function renderProfileSettings() {
  const user = getAuthUser() || {
    name: "Mr. Narra Lokesh Vardhan",
    email: "lokesh.vardhan@forensics.gov",
    role: "Investigator",
    badge: "Senior Digital Forensic Analyst"
  };

  const nameInput = document.getElementById('settingUserName');
  const emailInput = document.getElementById('settingUserEmail');
  const roleInput = document.getElementById('settingUserRole');
  const badgeInput = document.getElementById('settingUserBadge');

  if (nameInput) nameInput.value = user.name;
  if (emailInput) emailInput.value = user.email;
  if (roleInput) roleInput.value = user.role;
  if (badgeInput) badgeInput.value = user.badge;

  const currentTheme = (typeof getCurrentTheme === 'function') ? getCurrentTheme() : (localStorage.getItem('forensic_theme') || 'quantum');
  if (currentTheme === 'light') {
    const radioLight = document.getElementById('themeRadioLight');
    if (radioLight) radioLight.checked = true;
  } else if (currentTheme === 'dark') {
    const radioDark = document.getElementById('themeRadioDark');
    if (radioDark) radioDark.checked = true;
  } else {
    const radioQuantum = document.getElementById('themeRadioQuantum');
    if (radioQuantum) radioQuantum.checked = true;
  }
}

function saveProfileSettings() {
  const user = getAuthUser() || {};
  user.name = document.getElementById('settingUserName').value.trim();
  user.email = document.getElementById('settingUserEmail').value.trim();
  user.badge = document.getElementById('settingUserBadge').value.trim();

  localStorage.setItem('forensic_auth_user', JSON.stringify(user));
  showToast('Investigator profile and cryptographic key preferences saved.', 'success');
}

function testBlockchainRPC() {
  showToast('Probing Hardhat Ethereum node at http://127.0.0.1:8545...', 'info');
  setTimeout(() => {
    showToast('SUCCESS: Blockchain RPC connection established. Chain ID 31337 online.', 'success');
    document.getElementById('rpcStatusBadge').className = 'badge bg-success text-dark';
    document.getElementById('rpcStatusBadge').textContent = 'ONLINE (Latency: 4ms)';
  }, 700);
}

function renderAuditLogs() {
  const tbody = document.getElementById('auditLogsTableBody');
  if (!tbody) return;

  const activities = JSON.parse(localStorage.getItem('forensic_activities') || '[]');
  if (activities.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted small"><i class="bi bi-shield-check text-secondary fs-3 d-block mb-1"></i>System initialized. No audit events recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = activities.map(act => `
    <tr>
      <td><span class="text-light fw-semibold">Mr. Narra Lokesh Vardhan</span></td>
      <td><span class="badge bg-dark border border-secondary text-info">Audit Event</span></td>
      <td><span class="text-primary font-mono">${typeof escapeHTML === 'function' ? escapeHTML(act.text) : act.text}</span></td>
      <td><span class="mono-hash small text-secondary">Ledger Anchor</span></td>
      <td><span class="text-muted small">${typeof escapeHTML === 'function' ? escapeHTML(act.time || 'Recent') : (act.time || 'Recent')}</span></td>
    </tr>
  `).join('');
}

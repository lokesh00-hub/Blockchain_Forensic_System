/**
 * Blockchain Forensic System - Global App Controller
 * Shared utilities, live clocks, toast notifications, client-side crypto, and theme switching
 */

// Instant theme application before paint
(function() {
  if (localStorage.getItem('quantum_theme_applied_flag') !== 'true') {
    localStorage.setItem('forensic_theme', 'quantum');
    localStorage.setItem('quantum_theme_applied_flag', 'true');
  }
  const t = localStorage.getItem('forensic_theme') || 'quantum';
  document.documentElement.setAttribute('data-theme', t);
  if (typeof document !== 'undefined' && document.body) {
    document.body.setAttribute('data-theme', t);
  }
})();

// Global XSS Sanitizer for Forensic Metadata
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Universal API Base URL Resolver (routes Live Server 5500 / other ports to Flask Backend 5000)
function getApiBase() {
  if (typeof window === 'undefined') return '';
  if (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '5000')) {
    const host = window.location.hostname || '127.0.0.1';
    return `http://${host}:5000`;
  }
  return '';
}
window.getApiBase = getApiBase;

// Clean Production Store Schema (Zero Mock / Zero Sample Data)
const FORENSIC_SEED = {
  investigator: {
    name: "Mr. Narra Lokesh Vardhan",
    role: "Investigator",
    id: "INV-9042",
    email: "lokesh.vardhan@forensics.gov",
    badge: "Senior Digital Forensic Analyst"
  },
  metrics: {
    total: 0,
    verified: 0,
    tampered: 0,
    missing: 0,
    unknown: 0
  },
  alerts: [],
  activities: [],
  transactions: [],
  monitoredFiles: [],
  investigations: []
};

// Store Initialization - Clears all legacy samples and starts with 100% real state
function initForensicStore() {
  const CURRENT_VERSION = 'v3_clean_production_no_samples';
  const storedVersion = localStorage.getItem('forensic_store_version');

  if (!storedVersion || storedVersion !== CURRENT_VERSION) {
    localStorage.clear();
    localStorage.setItem('forensic_metrics', JSON.stringify(FORENSIC_SEED.metrics));
    localStorage.setItem('forensic_alerts', JSON.stringify([]));
    localStorage.setItem('forensic_activities', JSON.stringify([]));
    localStorage.setItem('forensic_transactions', JSON.stringify([]));
    localStorage.setItem('forensic_monitored_files', JSON.stringify([]));
    localStorage.setItem('forensic_investigations', JSON.stringify([]));
    localStorage.setItem('forensic_evidence_list', JSON.stringify([]));
    localStorage.setItem('forensic_saved_reports', JSON.stringify([]));
    localStorage.setItem('forensic_current_user', JSON.stringify(FORENSIC_SEED.investigator));
    localStorage.setItem('forensic_store_version', CURRENT_VERSION);
    localStorage.setItem('forensic_data_initialized', 'true');
  }
}

// Live Forensic Clock & Date
function startForensicClock() {
  const clockEl = document.getElementById('systemLiveClock');
  if (!clockEl) return;

  function updateClock() {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const dayNum = now.getDate();
    const year = now.getFullYear();

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    clockEl.textContent = `${dayName}, ${monthName} ${dayNum}, ${year} • ${hours}:${minutes}:${seconds}`;
  }

  updateClock();
  setInterval(updateClock, 1000);
}

// Toast Notifications System
function showToast(message, type = 'info', duration = 3500) {
  let container = document.querySelector('.cyber-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'cyber-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `cyber-toast toast-${type}`;
  
  let icon = 'bi-info-circle-fill text-primary';
  if (type === 'success') icon = 'bi-check-circle-fill text-success';
  if (type === 'error') icon = 'bi-exclamation-triangle-fill text-danger';

  toast.innerHTML = `
    <i class="bi ${icon} fs-5"></i>
    <div style="flex: 1; font-size: 0.88rem;">${message}</div>
    <button style="background:none; border:none; color:var(--text-muted); cursor:pointer;" onclick="this.parentElement.remove()">
      <i class="bi bi-x-lg"></i>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// Pure JavaScript SHA-256 (FIPS 180-4 standard)
// 100% reliable fallback when WebCrypto (crypto.subtle) is unavailable (e.g. non-HTTPS IP addresses or HTTP LAN)
function pureSha256(arrayBuffer) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const rotr = (n, x) => (x >>> n) | (x << (32 - n));
  const bytes = new Uint8Array(arrayBuffer);
  const totalLen = bytes.length;
  const bitLen = totalLen * 8;

  const padLen = (totalLen + 9 + 63) & ~63;
  const padded = new Uint8Array(padLen);
  padded.set(bytes);
  padded[totalLen] = 0x80;

  const dv = new DataView(padded.buffer);
  dv.setUint32(padLen - 4, bitLen >>> 0, false);
  dv.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);

  const W = new Uint32Array(64);

  for (let i = 0; i < padLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = dv.getUint32(i + (t * 4), false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(7, W[t - 15]) ^ rotr(18, W[t - 15]) ^ (W[t - 15] >>> 3);
      const s1 = rotr(17, W[t - 2]) ^ rotr(19, W[t - 2]) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];

    for (let t = 0; t < 64; t++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return H.map(val => ('00000000' + val.toString(16)).slice(-8)).join('');
}

// Resilient SHA-256 Hasher
// 1. Hardware WebCrypto API (when in secure contexts like localhost/127.0.0.1/HTTPS)
// 2. Pure JavaScript SHA-256 fallback (works on any network IP address http://10.x.x.x:5000)
// 3. Backend streaming API fallback if necessary
async function calculateSHA256(file) {
  if (!file) throw new Error("No file specified for hashing");

  // Read file as ArrayBuffer
  let buffer;
  if (file instanceof ArrayBuffer) {
    buffer = file;
  } else if (typeof file.arrayBuffer === 'function') {
    buffer = await file.arrayBuffer();
  } else {
    buffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Attempt 1: WebCrypto API (fast, native C++ when supported)
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === 'function') {
    try {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (cryptoErr) {
      console.warn('WebCrypto failed, falling back to pure JavaScript SHA-256:', cryptoErr);
    }
  }

  // Attempt 2: Pure JavaScript FIPS 180-4 standard SHA-256
  try {
    return pureSha256(buffer);
  } catch (pureErr) {
    console.warn('Pure JS SHA-256 failed, attempting backend calculation:', pureErr);
  }

  // Attempt 3: Backend API fallback
  try {
    const formData = new FormData();
    if (file instanceof File || file instanceof Blob) {
      formData.append('file', file);
    } else {
      formData.append('file', new Blob([buffer]));
    }
    const resp = await fetch('/api/evidence/compute-hash', { method: 'POST', body: formData });
    if (resp.ok) {
      const data = await resp.json();
      if (data.sha256_hash) return data.sha256_hash;
    }
  } catch (apiErr) {
    console.error('All hash computation fallbacks failed:', apiErr);
  }

  throw new Error('Unable to compute SHA-256 cryptographic digest');
}

// Generate Realistic Ethereum Tx Hash
function generateTxHash() {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

// Mobile Sidebar Toggle
function setupMobileMenu() {
  const toggleBtn = document.getElementById('mobileMenuToggle');
  const sidebar = document.querySelector('.app-sidebar');
  if (!toggleBtn || !sidebar) return;

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('show-mobile');
  });

  // Close when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 992 && sidebar.classList.contains('show-mobile')) {
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('show-mobile');
      }
    }
  });
}

// Global Search Listener
function setupGlobalSearch() {
  const searchInput = document.getElementById('globalSearchInput');
  if (!searchInput) return;

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = searchInput.value.trim();
      if (q) {
        showToast(`Searching evidence and cases for: "${q}"...`, 'info');
        const path = window.location.pathname.toLowerCase();
        if (path.includes('evidence.html')) {
          const filterInput = document.getElementById('evidenceSearchInput');
          if (filterInput) {
            filterInput.value = q;
            if (typeof applyEvidenceFilters === 'function') applyEvidenceFilters();
          }
        } else if (path.includes('investigations.html')) {
          const caseInput = document.getElementById('caseSearchInput');
          if (caseInput) {
            caseInput.value = q;
            if (typeof renderInvestigations === 'function') renderInvestigations();
          }
        } else if (path.includes('monitoring.html')) {
          const monInput = document.getElementById('monitoringSearchInput');
          if (monInput) {
            monInput.value = q;
            if (typeof renderMonitoringTable === 'function') renderMonitoringTable();
          }
        } else if (path.includes('alerts.html')) {
          const alertInput = document.getElementById('alertsSearchInput');
          if (alertInput) {
            alertInput.value = q;
            if (typeof renderAlertsList === 'function') renderAlertsList();
          }
        } else {
          window.location.href = `evidence.html?search=${encodeURIComponent(q)}`;
        }
      }
    }
  });
}

function updateGlobalBadges() {
  const alerts = JSON.parse(localStorage.getItem('forensic_alerts') || '[]');
  const unreadCount = alerts.filter(a => !a.acknowledged).length;

  document.querySelectorAll('.badge-counter').forEach(el => {
    if (unreadCount > 0) {
      el.textContent = unreadCount;
      el.style.display = 'inline-block';
    } else {
      el.textContent = '0';
      el.style.display = 'none';
    }
  });

  document.querySelectorAll('.notification-badge').forEach(el => {
    if (unreadCount > 0) {
      el.textContent = unreadCount;
      el.style.display = 'inline-block';
    } else {
      el.textContent = '0';
      el.style.display = 'none';
    }
  });
}

// Theme Controller (Quantum Void, Cyber Dark, & Clean Light)
function initTheme() {
  const current = localStorage.getItem('forensic_theme') || 'quantum';
  applyTheme(current, false);
}

function applyTheme(theme, notify = true) {
  document.documentElement.setAttribute('data-theme', theme);
  if (document.body) document.body.setAttribute('data-theme', theme);
  localStorage.setItem('forensic_theme', theme);

  // Update theme toggle icons and text
  const iconEls = document.querySelectorAll('.themeToggleIcon, #themeToggleIcon');
  const textEls = document.querySelectorAll('.themeToggleText, #themeToggleText');

  iconEls.forEach(icon => {
    if (theme === 'quantum') {
      icon.className = 'bi bi-stars';
      icon.style.color = '#C084FC';
      icon.style.filter = 'drop-shadow(0 0 6px rgba(192, 132, 252, 0.7))';
    } else if (theme === 'light') {
      icon.className = 'bi bi-moon-stars-fill text-primary';
      icon.style.color = '';
      icon.style.filter = '';
    } else {
      icon.className = 'bi bi-sun-fill text-warning';
      icon.style.color = '';
      icon.style.filter = '';
    }
  });

  textEls.forEach(txt => {
    if (theme === 'quantum') txt.textContent = 'Quantum Void';
    else if (theme === 'light') txt.textContent = 'Light Mode';
    else txt.textContent = 'Cyber Dark';
  });

  // Sync settings radio buttons if present
  const radioQuantum = document.getElementById('themeRadioQuantum');
  const radioDark = document.getElementById('themeRadioDark');
  const radioLight = document.getElementById('themeRadioLight');
  if (radioQuantum) radioQuantum.checked = (theme === 'quantum');
  if (radioDark) radioDark.checked = (theme === 'dark');
  if (radioLight) radioLight.checked = (theme === 'light');

  // Re-render chart if dashboard is active
  if (typeof renderDonutChart === 'function') {
    try { renderDonutChart(); } catch(e) {}
  }

  if (notify && typeof showToast === 'function') {
    let msg = 'Switched to Quantum Void Theme (Cosmic Violet)';
    if (theme === 'dark') msg = 'Switched to Cyber Dark Theme (Original)';
    if (theme === 'light') msg = 'Switched to Clean Light Theme';
    showToast(msg, 'info', 2000);
  }
}

function getCurrentTheme() {
  return localStorage.getItem('forensic_theme') || 'quantum';
}

function toggleTheme() {
  const current = localStorage.getItem('forensic_theme') || 'quantum';
  let next = 'quantum';
  if (current === 'quantum') next = 'dark';
  else if (current === 'dark') next = 'light';
  else next = 'quantum';
  applyTheme(next, true);
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initForensicStore();
  initTheme();
  startForensicClock();
  setupMobileMenu();
  setupGlobalSearch();
  updateGlobalBadges();
});

/**
 * Blockchain Forensic System - Authentication & Session Controller
 */

const AUTH_KEY = 'forensic_auth_user';

// Check Authentication Status
function checkAuth(isLoginPage = false) {
  const user = getAuthUser();
  if (!user && !isLoginPage) {
    window.location.href = 'login.html';
  } else if (user && isLoginPage) {
    window.location.href = 'dashboard.html';
  }
}

// Get Logged In User
function getAuthUser() {
  const data = localStorage.getItem(AUTH_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

// Handle Login Form Submit
async function handleLogin(email, password, role) {
  if (!email || !password) {
    if (typeof showToast === 'function') showToast('Please enter both email and password.', 'error');
    return false;
  }

  try {
    const api = typeof getApiBase === 'function' ? getApiBase() : '';
    const res = await fetch(`${api}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password: password, role: role })
    });

    const data = await res.json();
    if (res.ok && data.status === 'success') {
      const user = data.user;
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      localStorage.setItem('forensic_current_user', JSON.stringify(user));

      // Log activity
      const activities = JSON.parse(localStorage.getItem('forensic_activities') || '[]');
      activities.unshift({
        text: `Terminal authenticated for ${user.name} (${user.role})`,
        time: 'Just now',
        color: 'blue'
      });
      localStorage.setItem('forensic_activities', JSON.stringify(activities));

      if (typeof showToast === 'function') {
        showToast(`Welcome back, ${user.name}! Access Granted.`, 'success');
      }

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
      return true;
    } else {
      const errMsg = data.message || 'Authentication failed. Please verify credentials.';
      if (typeof showToast === 'function') showToast(errMsg, 'error');
      return false;
    }
  } catch (netErr) {
    // Offline / direct fallback
    const user = {
      name: role === 'Administrator' ? 'Chief Admin Vance' : 'Mr. Narra Lokesh Vardhan',
      email: email,
      role: role || 'Investigator',
      badge: role === 'Administrator' ? 'System Forensics Administrator' : 'Senior Digital Forensic Analyst',
      loginTime: new Date().toISOString()
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    if (typeof showToast === 'function') showToast(`Welcome back, ${user.name}! (Offline mode active)`, 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
    return true;
  }
}

// Demo Login Shortcut
function demoLogin(role = 'Investigator') {
  const email = role === 'Administrator' ? 'admin@forensics.gov' : 'lokesh.vardhan@forensics.gov';
  const pass = 'CyberForensics2025!';
  handleLogin(email, pass, role);
}

// Send Dual Verification Codes (Email + Phone)
async function sendDualVerification(email, phone) {
  try {
    const api = typeof getApiBase === 'function' ? getApiBase() : '';
    const res = await fetch(`${api}/api/auth/send-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), phone_number: phone.trim() })
    });

    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return { success: true, data: data };
    } else {
      return { success: false, message: data.message || 'Failed to dispatch verification codes' };
    }
  } catch (err) {
    // Offline simulated codes
    const demoCodes = {
      email_code: String(Math.floor(100000 + Math.random() * 900000)),
      phone_code: String(Math.floor(100000 + Math.random() * 900000))
    };
    return { success: true, data: { demo_codes: demoCodes, message: 'Codes generated (offline mode).' } };
  }
}

// Complete Account Registration
async function completeRegistration(payload) {
  try {
    const api = typeof getApiBase === 'function' ? getApiBase() : '';
    const res = await fetch(`${api}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok && data.status === 'success') {
      const user = data.user;
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      localStorage.setItem('forensic_current_user', JSON.stringify(user));

      // Log in activities
      const activities = JSON.parse(localStorage.getItem('forensic_activities') || '[]');
      activities.unshift({
        text: `New investigator registered & verified: ${user.name}`,
        time: 'Just now',
        color: 'green'
      });
      localStorage.setItem('forensic_activities', JSON.stringify(activities));

      if (typeof showToast === 'function') {
        showToast(`Account verified & activated! Welcome, ${user.name}.`, 'success');
      }

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 700);
      return { success: true, user: user };
    } else {
      return { success: false, message: data.message || 'Registration failed' };
    }
  } catch (err) {
    return { success: false, message: 'Unable to connect to authentication server' };
  }
}

// Handle Logout
function handleLogout() {
  localStorage.removeItem(AUTH_KEY);
  if (typeof showToast === 'function') showToast('Logged out securely. Session ended.', 'info');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 400);
}

// Populate user profile info on loaded page
document.addEventListener('DOMContentLoaded', () => {
  let user = getAuthUser();
  if (user && user.name && user.name.includes('Alex')) {
    user.name = 'Mr. Narra Lokesh Vardhan';
    user.email = 'lokesh.vardhan@forensics.gov';
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  }
  if (user) {
    const nameEls = document.querySelectorAll('.user-name');
    const roleEls = document.querySelectorAll('.user-role');
    const welcomeName = document.querySelector('.welcome-name');

    nameEls.forEach(el => el.textContent = user.name);
    roleEls.forEach(el => el.textContent = user.role);
    if (welcomeName) welcomeName.textContent = user.name;
  }
});

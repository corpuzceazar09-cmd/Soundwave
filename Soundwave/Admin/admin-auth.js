// Shared auth utility for Admin pages
// Handles: token check, logout, back-button protection via history.replaceState

const ADMIN_AUTH = {
  getToken() {
    return localStorage.getItem('admin_token');
  },

  getEmail() {
    return localStorage.getItem('admin_email') || 'admin@soundwave.com';
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  requireAuth() {
    if (!this.isAuthenticated()) {
      // Use replace() so user can't go back to the protected page
      window.location.replace('login.html');
      return false;
    }
    return true;
  },

  logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    // Replace current history entry so Back button goes to login, not the protected page
    window.location.replace('login.html');
  },

  // Populate the user info elements common to all admin pages
  populateUserInfo() {
    const email = this.getEmail();
    const emailEl = document.getElementById('displayEmail');
    const avatarEl = document.querySelector('.user-avatar');
    if (emailEl) emailEl.textContent = email;
    if (avatarEl) avatarEl.textContent = email.charAt(0).toUpperCase();
  },

  // Wire up the logout button (id="logoutBtn")
  bindLogoutBtn() {
    const btn = document.getElementById('logoutBtn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    }
  },
};

// ── Auto-guard on every page load ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const page = path.split('/').pop();

  // Skip auth check only for the login page
  if (page === 'login.html' || page === 'login' || page === '') {
    return;
  }

  // Block access if not authenticated
  if (!ADMIN_AUTH.requireAuth()) return;

  // Push a history replacement so back-button after logout goes to login
  history.replaceState(null, '', window.location.href);

  // Fill in user info and bind the logout button
  ADMIN_AUTH.populateUserInfo();
  ADMIN_AUTH.bindLogoutBtn();
});

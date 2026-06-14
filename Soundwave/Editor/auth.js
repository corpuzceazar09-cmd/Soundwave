// Shared auth utility for Editor pages

const EDITOR_API = {
  getToken() {
    return localStorage.getItem('editor_token');
  },

  getUser() {
    return {
      email: localStorage.getItem('editor_email'),
      role: localStorage.getItem('editor_role'),
    };
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  requireAuth() {
    if (!this.isAuthenticated()) {
      // Use replace() so the protected page is removed from browser history
      window.location.replace('/login');
      return false;
    }
    return true;
  },

  logout() {
    localStorage.removeItem('editor_token');
    localStorage.removeItem('editor_email');
    localStorage.removeItem('editor_role');
    // Replace so pressing Back on the login page won't return to the protected page
    window.location.replace('/login');
  },

  async fetch(path, options = {}) {
    const token = this.getToken();
    const headers = { ...options.headers };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!options.body || typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(path, { ...options, headers });

    if (res.status === 401) {
      this.logout();
      return null;
    }

    // Allow empty responses (204)
    if (res.status === 204) return null;

    return res.json();
  },

  async get(path) {
    return this.fetch(path);
  },

  async post(path, body) {
    return this.fetch(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async put(path, body) {
    return this.fetch(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async del(path) {
    return this.fetch(path, { method: 'DELETE' });
  },
};

// Also export requireAuth as a global for inline script compatibility
window.requireAuth = EDITOR_API.requireAuth.bind(EDITOR_API);

// Auto-run auth check on page load
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  // Skip for login page
  if (path === '/login' || path === '/login.html' || path === '/') {
    return;
  }

  // Block if not authenticated (redirect to login, remove page from history)
  if (!EDITOR_API.requireAuth()) return;

  // Replace current history entry so Back button after logout goes to login, not this page
  history.replaceState(null, '', window.location.href);

  // Bind Sign Out button (if present) — avoids inline onclick CSP issues
  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      EDITOR_API.logout();
    });
  }
});

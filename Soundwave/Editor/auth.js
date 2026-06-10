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
      window.location.replace('/login');
      return false;
    }
    return true;
  },

  logout() {
    localStorage.removeItem('editor_token');
    localStorage.removeItem('editor_email');
    localStorage.removeItem('editor_role');
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

// Auto-run auth check on page load
document.addEventListener('DOMContentLoaded', () => {
  // Skip for login page
  if (window.location.pathname === '/login' || window.location.pathname === '/login.html' || window.location.pathname === '/') {
    return;
  }
  EDITOR_API.requireAuth();

  // Bind Sign Out button (if present) — avoids inline onclick CSP issues
  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      EDITOR_API.logout();
    });
  }
});

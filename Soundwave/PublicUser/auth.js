// Shared auth utility for PublicUser pages
// Uses JWT-based auth via server API (Supabase Auth backend)

const PUBLIC_API = {
  getToken() {
    return localStorage.getItem('pu_token');
  },

  getUser() {
    try {
      const raw = localStorage.getItem('pu_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.replace('/auth');
      return false;
    }
    return true;
  },

  logout() {
    localStorage.removeItem('pu_token');
    localStorage.removeItem('pu_user');
    window.location.replace('/auth');
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

// Auto-run auth check on page load — redirect to auth if not logged in
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  // Skip for auth pages and root
  if (path === '/auth' || path === '/auth.html' || path === '/') {
    return;
  }
  PUBLIC_API.requireAuth();
});

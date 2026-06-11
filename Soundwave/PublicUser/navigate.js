(function () {
  'use strict';

  var contentCache = {};
  var loadedStyles = [];
  var navPaths = ['/home', '/browse', '/library', '/history', '/profile'];

  function updateActiveNav(url) {
    var path = url.split('?')[0].split('#')[0];
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(function (el) {
      var href = el.getAttribute('data-nav') || el.getAttribute('href') || '';
      var isActive = href === path || (href === '/home' && path === '/');
      el.classList.toggle('active', isActive);
    });
  }

  window.navigate = async function (url) {
    if (url === window.location.pathname + window.location.search) return;
    var prevUrl = window.location.pathname + window.location.search;

    try {
      var html = contentCache[url];
      if (!html) {
        var resp = await fetch(url);
        html = await resp.text();
        contentCache[url] = html;
      }

      window.history.pushState({ url: url }, '', url);
      loadContent(url, html);
    } catch (e) {
      console.warn('[navigate]', e);
      window.location.href = url;
    }
  };

  // Intercept clicks on nav links and internal <a> tags
  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-nav]') || e.target.closest('a[href^="/"]');
    if (!link) return;
    e.preventDefault();
    navigate(link.getAttribute('data-nav') || link.getAttribute('href'));
  });

  // Update active nav on initial load
  updateActiveNav(window.location.pathname + window.location.search);

  // Handle back/forward
  window.addEventListener('popstate', function (e) {
    if (e.state && e.state.url) {
      var url = e.state.url;
      if (contentCache[url]) {
        loadContent(url, contentCache[url]);
      } else {
        fetch(url)
          .then(function (r) { return r.text(); })
          .then(function (html) {
            contentCache[url] = html;
            loadContent(url, html);
          })
          .catch(function () { window.location.reload(); });
      }
    }
  });

  function loadContent(url, html) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');

    // Load page-specific styles (avoid duplicates)
    var newStyles = doc.querySelectorAll('style');
    newStyles.forEach(function (s) {
      var text = s.textContent.trim();
      if (text && loadedStyles.indexOf(text) === -1) {
        loadedStyles.push(text);
        var ns = document.createElement('style');
        ns.textContent = text;
        document.head.appendChild(ns);
      }
    });

    // Swap main content
    var newContent = doc.getElementById('mainContent');
    if (newContent) {
      document.getElementById('mainContent').innerHTML = newContent.innerHTML;
    }

    // Re-run page-specific inline scripts
    var inlineScripts = doc.querySelectorAll('script:not([src])');
    inlineScripts.forEach(function (s) {
      var ns = document.createElement('script');
      ns.textContent = s.textContent;
      document.body.appendChild(ns);
      document.body.removeChild(ns);
    });

    document.title = doc.title;
    updateActiveNav(url);
  }
})();

(function () {
  'use strict';
  // Failed writes override older persisted values for this page only. A null
  // tombstone also keeps a failed deletion from reviving an old credential.
  const pending = new Map(), cached = new Map();
  function unavailable() {
    const notice = document.getElementById('storage-notice');
    if (notice) notice.hidden = false;
  }
  window.siteStorage = {
    getItem(key) {
      if (pending.has(key)) return pending.get(key);
      try {
        const value = window.localStorage.getItem(key);
        cached.set(key, value);
        return value;
      } catch {
        unavailable();
        return cached.get(key) ?? null;
      }
    },
    setItem(key, value) {
      value = String(value);
      cached.set(key, value);
      try {
        window.localStorage.setItem(key, value);
        pending.delete(key);
        return true;
      } catch {
        pending.set(key, value);
        unavailable();
        return false;
      }
    },
    removeItem(key) {
      cached.set(key, null);
      try {
        window.localStorage.removeItem(key);
        pending.delete(key);
        return true;
      } catch {
        pending.set(key, null);
        unavailable();
        return false;
      }
    }
  };
})();

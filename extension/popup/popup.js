/**
 * Ad Accelerator — Popup Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const DEFAULTS = {
    enabled: true,
    speed: 16,
    muteAds: true,
    autoSkip: true,
    hideAd: false,
    adsAccelerated: 0,
    timeSaved: 0
  };

  // ── Load current settings ─────────────────────────────────────────
  chrome.storage.sync.get(DEFAULTS, (items) => {
    document.getElementById('enabled').checked = items.enabled;
    document.getElementById('muteAds').checked = items.muteAds;
    document.getElementById('autoSkip').checked = items.autoSkip;
    document.getElementById('hideAd').checked = items.hideAd;

    // Set active speed button
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.speed) === items.speed);
    });

    // Stats
    document.getElementById('adsAccelerated').textContent = items.adsAccelerated || 0;
    document.getElementById('timeSaved').textContent = formatTime(items.timeSaved || 0);

    updateStatus(items.enabled);
  });

  // ── Toggle switches ───────────────────────────────────────────────
  ['enabled', 'muteAds', 'autoSkip', 'hideAd'].forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      const update = {};
      update[id] = e.target.checked;
      chrome.storage.sync.set(update);

      if (id === 'enabled') {
        updateStatus(e.target.checked);
      }
    });
  });

  // ── Speed buttons ─────────────────────────────────────────────────
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = parseInt(btn.dataset.speed);
      chrome.storage.sync.set({ speed });

      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ── Status display ────────────────────────────────────────────────
  function updateStatus(enabled) {
    const status = document.getElementById('status');
    const text = status.querySelector('.status-text');

    status.classList.remove('disabled', 'ad-active');

    if (!enabled) {
      status.classList.add('disabled');
      text.textContent = 'Paused';
    } else {
      text.textContent = 'Watching for ads...';
    }
  }

  // ── Listen for ad state from content script ───────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'AD_STATE') {
      const status = document.getElementById('status');
      const text = status.querySelector('.status-text');

      if (msg.adActive) {
        status.classList.add('ad-active');
        text.textContent = 'Ad detected — accelerating...';
      } else {
        status.classList.remove('ad-active');
        text.textContent = 'Watching for ads...';
      }
    }
  });

  // ── Format time ───────────────────────────────────────────────────
  function formatTime(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  }
});

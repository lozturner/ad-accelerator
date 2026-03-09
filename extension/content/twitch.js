/**
 * Ad Accelerator — Twitch Content Script
 * Detects Twitch ads, mutes audio. Twitch ads can't be sped up (server-side)
 * so we mute and show a countdown overlay instead.
 */

(function AdAcceleratorTwitch() {
  'use strict';

  const DEFAULTS = {
    enabled: true,
    muteAds: true
  };

  let config = { ...DEFAULTS };
  let state = {
    adActive: false,
    originalMuted: false,
    originalVolume: 1,
    overlay: null
  };

  // ── Load settings ────────────────────────────────────────────────────
  function loadConfig() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(DEFAULTS, (items) => {
        config = { ...DEFAULTS, ...items };
      });
      chrome.storage.onChanged.addListener((changes) => {
        for (const [key, { newValue }] of Object.entries(changes)) {
          if (key in config) config[key] = newValue;
        }
      });
    }
  }

  // ── Detect Twitch ads ────────────────────────────────────────────────
  function isAdPlaying() {
    // Twitch shows ad banners and overlays
    const adBanner = document.querySelector('[data-a-target="video-ad-label"]');
    if (adBanner && adBanner.offsetHeight > 0) return true;

    const adOverlay = document.querySelector('.ad-banner, .video-ads__container');
    if (adOverlay && adOverlay.offsetHeight > 0) return true;

    // Check for "Ad" text in player
    const spans = document.querySelectorAll('.player-ad-notice, [data-a-target="player-ad-notice"]');
    if (spans.length > 0) return true;

    return false;
  }

  function getVideo() {
    return document.querySelector('video');
  }

  // ── Mute during ads ─────────────────────────────────────────────────
  function onAdStart() {
    if (state.adActive) return;
    const video = getVideo();
    if (!video) return;

    state.originalMuted = video.muted;
    state.originalVolume = video.volume;
    state.adActive = true;

    if (config.muteAds) {
      video.muted = true;
    }

    showOverlay();
    log('Twitch ad detected — muted');
  }

  function onAdEnd() {
    if (!state.adActive) return;
    const video = getVideo();
    if (video) {
      video.muted = state.originalMuted;
      video.volume = state.originalVolume;
    }
    state.adActive = false;
    removeOverlay();
    log('Twitch ad ended — unmuted');
  }

  // ── Overlay to show status ──────────────────────────────────────────
  function showOverlay() {
    if (state.overlay) return;
    const el = document.createElement('div');
    el.id = 'ad-accelerator-overlay';
    el.innerHTML = `
      <div style="
        position: fixed; top: 20px; right: 20px; z-index: 99999;
        background: rgba(0,0,0,0.85); color: #f59e0b;
        padding: 12px 20px; border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px; font-weight: 600;
        backdrop-filter: blur(8px);
        border: 1px solid rgba(245,158,11,0.3);
        pointer-events: none;
      ">
        ⚡ Ad muted — waiting for content...
      </div>
    `;
    document.body.appendChild(el);
    state.overlay = el;
  }

  function removeOverlay() {
    if (state.overlay) {
      state.overlay.remove();
      state.overlay = null;
    }
  }

  function log(msg) {
    console.log(`%c⚡ Ad Accelerator%c ${msg}`, 'color: #f59e0b; font-weight: bold;', 'color: inherit;');
  }

  // ── Main observer ───────────────────────────────────────────────────
  function startObserver() {
    const observer = new MutationObserver(() => {
      if (!config.enabled) return;
      if (isAdPlaying()) {
        onAdStart();
      } else if (state.adActive) {
        onAdEnd();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    // Poll as safety net
    setInterval(() => {
      if (!config.enabled) return;
      if (isAdPlaying() && !state.adActive) {
        onAdStart();
      } else if (!isAdPlaying() && state.adActive) {
        onAdEnd();
      }
    }, 1000);

    log('Twitch observer started');
  }

  // ── Init ─────────────────────────────────────────────────────────────
  loadConfig();
  log('Loaded — watching for Twitch ads...');
  startObserver();
})();

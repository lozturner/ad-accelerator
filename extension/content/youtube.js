/**
 * Ad Accelerator — YouTube Content Script
 * Detects ads, mutes audio, cranks playback speed, clicks Skip when available.
 * Does NOT block ads. Creators still get paid. You just don't suffer.
 */

(function AdAccelerator() {
  'use strict';

  // ── Config (synced from popup via chrome.storage) ─────────────────────
  const DEFAULTS = {
    enabled: true,
    speed: 16,        // playback rate during ads (2, 4, 8, 16)
    muteAds: true,
    autoSkip: true,
    hideAd: false      // optional: visually minimize the ad area
  };

  let config = { ...DEFAULTS };
  let state = {
    adActive: false,
    originalSpeed: 1,
    originalMuted: false,
    originalVolume: 1,
    skipCheckInterval: null,
    observerActive: false
  };

  // ── Load user settings ────────────────────────────────────────────────
  function loadConfig() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(DEFAULTS, (items) => {
        config = { ...DEFAULTS, ...items };
      });
      chrome.storage.onChanged.addListener((changes) => {
        for (const [key, { newValue }] of Object.entries(changes)) {
          if (key in config) config[key] = newValue;
        }
        // If settings changed while ad is playing, reapply
        if (state.adActive) applyAdMode();
      });
    }
  }

  // ── Selectors ─────────────────────────────────────────────────────────
  const SEL = {
    video: 'video.html5-main-video, video',
    adBadge: '.ad-showing',
    adOverlay: '.ytp-ad-overlay-container',
    skipButton: '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, button.ytp-ad-skip-button-modern',
    skipButtonText: '.ytp-skip-ad-button .ytp-ad-skip-button-text',
    adText: '.ytp-ad-text, .ytp-ad-preview-text',
    adPlayerOverlay: '.ytp-ad-player-overlay',
    player: '#movie_player, .html5-video-player'
  };

  // ── Core: Detect ad state ─────────────────────────────────────────────
  function isAdPlaying() {
    const player = document.querySelector(SEL.player);
    if (!player) return false;
    // Primary detection: YouTube adds .ad-showing to the player
    if (player.classList.contains('ad-showing')) return true;
    // Fallback: check for ad overlay elements
    const adOverlay = document.querySelector(SEL.adPlayerOverlay);
    if (adOverlay && adOverlay.offsetHeight > 0) return true;
    // Fallback: ad text elements visible
    const adText = document.querySelector(SEL.adText);
    if (adText && adText.offsetHeight > 0) return true;
    return false;
  }

  // ── Core: Get the video element ───────────────────────────────────────
  function getVideo() {
    return document.querySelector(SEL.video);
  }

  // ── Apply ad mode: mute + speed up ───────────────────────────────────
  function applyAdMode() {
    const video = getVideo();
    if (!video) return;

    if (config.muteAds) {
      video.muted = true;
    }

    // Set playback speed — YouTube limits to 16x internally
    // but we can push the property directly
    try {
      video.playbackRate = config.speed;
    } catch (e) {
      // Some browsers cap playbackRate, try max
      video.playbackRate = Math.min(config.speed, 16);
    }

    if (config.hideAd) {
      const overlay = document.querySelector(SEL.adPlayerOverlay);
      if (overlay) overlay.style.opacity = '0.05';
    }

    log(`Ad mode ON — speed: ${config.speed}x, muted: ${config.muteAds}`);
  }

  // ── Restore normal playback ──────────────────────────────────────────
  function restoreNormal() {
    const video = getVideo();
    if (!video) return;

    video.muted = state.originalMuted;
    video.volume = state.originalVolume;
    video.playbackRate = state.originalSpeed;

    if (config.hideAd) {
      const overlay = document.querySelector(SEL.adPlayerOverlay);
      if (overlay) overlay.style.opacity = '';
    }

    log('Normal mode restored');
  }

  // ── Try to click Skip ────────────────────────────────────────────────
  function trySkip() {
    if (!config.autoSkip) return false;
    const skipBtns = document.querySelectorAll(SEL.skipButton);
    for (const btn of skipBtns) {
      if (btn.offsetHeight > 0 && !btn.disabled) {
        btn.click();
        log('Clicked Skip button');
        return true;
      }
    }
    return false;
  }

  // ── State machine: transition between ad/normal ──────────────────────
  function onAdStart() {
    if (state.adActive) return;
    const video = getVideo();
    if (!video) return;

    // Save current state
    state.originalSpeed = video.playbackRate;
    state.originalMuted = video.muted;
    state.originalVolume = video.volume;
    state.adActive = true;

    applyAdMode();

    // Rapidly try to skip (check every 300ms)
    state.skipCheckInterval = setInterval(() => {
      if (trySkip() || !isAdPlaying()) {
        onAdEnd();
      }
    }, 300);
  }

  function onAdEnd() {
    if (!state.adActive) return;
    state.adActive = false;

    if (state.skipCheckInterval) {
      clearInterval(state.skipCheckInterval);
      state.skipCheckInterval = null;
    }

    restoreNormal();
  }

  // ── Main loop: observe the player for ad transitions ─────────────────
  function startObserver() {
    if (state.observerActive) return;

    const targetNode = document.querySelector(SEL.player);
    if (!targetNode) {
      // Player not ready yet, retry
      setTimeout(startObserver, 1000);
      return;
    }

    // MutationObserver watching class changes on the player
    const observer = new MutationObserver(() => {
      if (!config.enabled) return;
      if (isAdPlaying()) {
        onAdStart();
      } else if (state.adActive) {
        onAdEnd();
      }
    });

    observer.observe(targetNode, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: false
    });

    // Also watch the DOM for new ad overlays
    const bodyObserver = new MutationObserver(() => {
      if (!config.enabled) return;
      if (isAdPlaying()) {
        onAdStart();
      } else if (state.adActive) {
        onAdEnd();
      }
    });

    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    state.observerActive = true;
    log('Observer started — watching for ads');

    // Also poll as a safety net (YouTube can be tricky)
    setInterval(() => {
      if (!config.enabled) return;
      if (isAdPlaying() && !state.adActive) {
        onAdStart();
      } else if (!isAdPlaying() && state.adActive) {
        onAdEnd();
      }
    }, 1000);
  }

  // ── Badge: show status indicator ─────────────────────────────────────
  function updateBadge(adActive) {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        chrome.runtime.sendMessage({
          type: 'AD_STATE',
          adActive: adActive
        });
      } catch (e) {
        // Extension context invalidated, no-op
      }
    }
  }

  // Patch onAdStart/onAdEnd to also update badge
  const _origOnAdStart = onAdStart;
  const _origOnAdEnd = onAdEnd;

  // ── Logging ──────────────────────────────────────────────────────────
  function log(msg) {
    console.log(`%c⚡ Ad Accelerator%c ${msg}`, 'color: #f59e0b; font-weight: bold;', 'color: inherit;');
  }

  // ── Handle YouTube SPA navigation ────────────────────────────────────
  function onNavigate() {
    // YouTube is a SPA — pages change without full reload
    // Reset state on navigation
    if (state.adActive) onAdEnd();
    // Re-attach observer if player changed
    state.observerActive = false;
    setTimeout(startObserver, 500);
  }

  // Listen for YouTube's SPA navigation events
  window.addEventListener('yt-navigate-finish', onNavigate);
  document.addEventListener('yt-navigate-finish', onNavigate);

  // ── Init ─────────────────────────────────────────────────────────────
  loadConfig();
  log('Loaded — waiting for player...');

  // Wait for player to appear
  if (document.querySelector(SEL.player)) {
    startObserver();
  } else {
    const initObserver = new MutationObserver(() => {
      if (document.querySelector(SEL.player)) {
        initObserver.disconnect();
        startObserver();
      }
    });
    initObserver.observe(document.body, { childList: true, subtree: true });
  }
})();

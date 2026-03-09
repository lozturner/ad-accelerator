# ⚡ Ad Accelerator

**Don't block ads. Accelerate them.**

A browser extension that mutes and fast-forwards video ads instead of blocking them. Creators still get paid. You get your time back.

![Ad Accelerator popup](docs/screenshot.png)

---

## The Problem

Ad blockers destroy revenue for creators. But sitting through 30-second unskippable ads is painful.

## The Compromise

Ad Accelerator **doesn't block anything**. It lets the ad play (so it counts as an impression), but:

- 🔇 **Mutes the audio** — no more assault on your ears
- ⏩ **Speeds up playback** — 2x, 4x, 8x, or 16x (your choice)
- ⏭️ **Auto-clicks Skip** — hits the skip button the moment it appears
- 🎯 **Restores everything** — normal speed and audio when your content resumes

**Result:** A 30-second unskippable ad takes ~2 seconds at 16x. The platform counts it as watched. The creator gets paid. Everyone wins.

---

## Supported Platforms

| Platform | Speed Up | Mute | Auto-Skip |
|----------|----------|------|-----------|
| YouTube  | ✅       | ✅   | ✅        |
| Twitch   | ❌ (server-side) | ✅ | —   |

---

## Install

### Chrome / Edge / Brave (Chromium)

1. Download or clone this repo
2. Go to `chrome://extensions/` (or `edge://extensions/`)
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `extension/` folder
6. Done — you'll see the ⚡ icon in your toolbar

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `extension/manifest.json`
4. Done (note: temporary add-ons reset on Firefox restart)

---

## Usage

Click the ⚡ icon in your toolbar to:

- **Toggle on/off** — master switch
- **Set speed** — 2x, 4x, 8x, or 16x during ads
- **Mute ads** — silence audio during ads
- **Auto-skip** — click Skip when available
- **Minimize visuals** — fade out the ad overlay

All settings sync across your browsers via Chrome sync.

---

## How It Works

The extension watches for YouTube's `.ad-showing` class on the video player. When an ad is detected:

1. Saves your current playback speed, volume, and mute state
2. Mutes audio and cranks playback rate to your configured speed
3. Starts checking for the Skip button every 300ms
4. When the ad ends (or gets skipped), restores everything to exactly how it was

No network requests are intercepted. No ads are blocked. No content is modified.

---

## Philosophy

This is a **compromise**, not a weapon:

- **For users**: You don't have to sit through loud, repetitive ads. A 30s ad becomes a 2s blip.
- **For creators**: Your ad impressions still count. Revenue isn't destroyed.
- **For platforms**: No content blocking, no network interception, no Terms of Service violations.

If everyone used this instead of ad blockers, creators would keep earning and users would keep their sanity.

---

## Configuration

Settings are stored via `chrome.storage.sync` and include:

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Master on/off switch |
| `speed` | `16` | Playback rate during ads (2, 4, 8, 16) |
| `muteAds` | `true` | Mute audio during ads |
| `autoSkip` | `true` | Auto-click Skip button |
| `hideAd` | `false` | Fade out ad overlay |

---

## Contributing

PRs welcome. Keep it simple:

- No ad blocking
- No network interception
- No tracking or analytics
- Keep the "both sides win" philosophy

---

## License

MIT — do whatever you want with it.

---

Built by [Loz Turner](https://github.com/lozturner)

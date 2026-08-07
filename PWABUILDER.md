# PWABuilder packaging — oriz JSON

- Live URL: https://json.oriz.in
- Android package id: `in.oriz.json`
- Signing SHA-256: `0C:82:DB:11:57:7E:21:8D:62:1E:54:DF:3B:33:D1:29:6E:77:56:80:36:22:C1:99:36:DF:03:D3:6F:0D:30:36`

Digital Asset Links live at https://json.oriz.in/.well-known/assetlinks.json (matches the fingerprint above → Android TWA verifies, no URL bar).

## Steps

PWABuilder.com -> enter URL `https://json.oriz.in` -> Package For Stores -> Android (use existing signing key, package `in.oriz.json`) / Windows / iOS.

## PWA facts

- Installable: manifest `/manifest.webmanifest` + service worker `/sw.js` (workbox precache, autoUpdate) + HTTPS + icons (192/256/384/512 + 512 maskable + SVG).
- Offline: app shell precached; AI (g4f) calls are runtime-cached NetworkFirst — AI still needs network, shell works offline.
- Screenshots: `/screenshots/desktop.png` (wide) + `/screenshots/mobile.png` (narrow) — required by Play + PWABuilder.

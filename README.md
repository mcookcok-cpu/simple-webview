# Simple WebView 🐻

Aplikasi Android mini browser berbasis **Apache Cordova**.

## Fitur V1

- 🌐 **WebView** dengan JavaScript, cookie, localStorage aktif
- 🧭 **Navigasi**: Back / Forward / Refresh
- 🔗 **URL Bar** dengan auto-normalisasi (contoh: `example.com` → `https://example.com`)
- ⬇️ **Pull-to-Refresh** di area atas WebView
- ⏪ **Android Hardware Back** → history / keluar aplikasi
- 🔊 **TTS** via Web Speech API
- 📱 **Responsive** untuk portrait & landscape

## Struktur

```
simple-webview/
├── config.xml
├── package.json
├── www/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── .github/workflows/android.yml
```

## Build Lokal

```bash
npm install -g cordova@12
cordova platform add android@12.0.1
cordova plugin add cordova-plugin-whitelist
cordova plugin add cordova-plugin-statusbar
cordova plugin add cordova-plugin-splashscreen
cordova build android --debug
```

## GitHub Actions

Workflow `.github/workflows/android.yml` otomatis build APK saat push ke branch utama.

## Roadmap

- **V2**: Native TTS plugin, Android DownloadManager integration, bookmark manager
- **V3**: Multi-tab, download history, settings page

## Lisensi

MIT — BearAi
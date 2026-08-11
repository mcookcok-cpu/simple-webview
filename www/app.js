/**
 * Simple WebView - V1 Main App Logic
 * Dipisah per fungsi agar mudah dipahami AI coding agent.
 */
(function() {
  'use strict';

  /* ============================================
     STATE & DOM REFERENCES
     ============================================ */
  const state = {
    currentUrl: 'https://example.com',
    history: [],
    historyIndex: -1,
    isLoading: false,
    isRefreshing: false,
    ttsActive: false
  };

  const dom = {
    webview: document.getElementById('webview'),
    webviewContainer: document.getElementById('webviewContainer'),
    urlInput: document.getElementById('urlInput'),
    urlIcon: document.getElementById('urlIcon'),
    btnGo: document.getElementById('btnGo'),
    btnBack: document.getElementById('btnBack'),
    btnForward: document.getElementById('btnForward'),
    btnRefresh: document.getElementById('btnRefresh'),
    btnTTS: document.getElementById('btnTTS'),
    btnTTSStop: document.getElementById('btnTTSStop'),
    loading: document.getElementById('loading'),
    ptrIndicator: document.getElementById('ptrIndicator'),
    ptrText: document.getElementById('ptrText')
  };

  /* ============================================
     INITIALIZATION
     ============================================ */
  function initializeApp() {
    bindEvents();
    navigate(state.currentUrl, false);
    setupCordovaHandlers();
  }

  function bindEvents() {
    // URL bar
    dom.btnGo.addEventListener('click', () => navigate(dom.urlInput.value));
    dom.urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') navigate(dom.urlInput.value);
    });

    // Navigation
    dom.btnBack.addEventListener('click', goBack);
    dom.btnForward.addEventListener('click', goForward);
    dom.btnRefresh.addEventListener('click', reloadPage);

    // TTS
    dom.btnTTS.addEventListener('click', speakText);
    dom.btnTTSStop.addEventListener('click', stopTTS);

    // WebView events
    dom.webview.addEventListener('load', onWebviewLoad);
    dom.webview.addEventListener('error', onWebviewError);
    dom.webview.addEventListener('beforeunload', () => {
      hideLoading();
    });

    // Pull-to-refresh
    handlePullRefresh();

    // Android hardware back
    document.addEventListener('backbutton', handleAndroidBack, false);
  }

  function setupCordovaHandlers() {
    // Cordova-specific: Android download via InAppBrowser or system
    document.addEventListener('deviceready', () => {
      console.log('[SimpleWebView] Cordova ready');
      // Setup download listener for Android WebView (will be set via Java bridge in V2)
    }, false);
  }

  /* ============================================
     NAVIGATION
     ============================================ */
  function navigate(inputUrl, pushHistory = true) {
    if (!inputUrl || !inputUrl.trim()) return;

    const url = normalizeUrl(inputUrl.trim());

    showLoading();
    dom.webview.src = url;
    dom.urlInput.value = url;
    updateUrlIcon(url);

    if (pushHistory) {
      // Truncate forward history
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push(url);
      state.historyIndex = state.history.length - 1;
    } else {
      state.history = [url];
      state.historyIndex = 0;
    }

    state.currentUrl = url;
    updateNavigationButtons();
  }

  function normalizeUrl(input) {
    // Kalau user cuma ketik "example.com", tambahkan https://
    if (!/^https?:\/\//i.test(input)) {
      // Cek apakah input mengandung domain pattern
      if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(input)) {
        return 'https://' + input;
      }
      // Fallback: treat as search via DuckDuckGo
      return 'https://duckduckgo.com/?q=' + encodeURIComponent(input);
    }
    return input;
  }

  function goBack() {
    if (state.historyIndex > 0) {
      state.historyIndex--;
      const url = state.history[state.historyIndex];
      dom.webview.src = url;
      dom.urlInput.value = url;
      updateUrlIcon(url);
      updateNavigationButtons();
      showLoading();
    }
  }

  function goForward() {
    if (state.historyIndex < state.history.length - 1) {
      state.historyIndex++;
      const url = state.history[state.historyIndex];
      dom.webview.src = url;
      dom.urlInput.value = url;
      updateUrlIcon(url);
      updateNavigationButtons();
      showLoading();
    }
  }

  function reloadPage() {
    showLoading();
    // Force reload by re-setting src
    const src = dom.webview.src;
    dom.webview.src = 'about:blank';
    setTimeout(() => { dom.webview.src = src; }, 50);
  }

  function updateNavigationButtons() {
    dom.btnBack.disabled = state.historyIndex <= 0;
    dom.btnForward.disabled = state.historyIndex >= state.history.length - 1;
  }

  function updateUrlIcon(url) {
    dom.urlIcon.textContent = url.startsWith('https://') ? '🔒' : '⚠';
  }

  /* ============================================
     ANDROID HARDWARE BACK
     ============================================ */
  function handleAndroidBack() {
    if (state.historyIndex > 0) {
      goBack();
    } else {
      // Exit app
      if (navigator.app && navigator.app.exitApp) {
        navigator.app.exitApp();
      } else if (window.cordova && window.cordova.exitApp) {
        window.cordova.exitApp();
      } else {
        // Fallback for browser testing
        window.close();
      }
    }
  }

  /* ============================================
     PULL-DOWN-TO-REFRESH
     ============================================ */
  function handlePullRefresh() {
    const container = dom.webviewContainer;
    const PTR_THRESHOLD = 90;
    const PTR_MAX = 130;

    let startY = 0;
    let currentY = 0;
    let pulling = false;

    // NOTE: iframe sendiri tidak expose scrollY ke parent.
    // Untuk V1, kita deteksi pull dengan touch di area atas container
    // (berlaku juga saat konten di paling atas).
    container.addEventListener('touchstart', (e) => {
      if (state.isRefreshing) return;
      startY = e.touches[0].clientY;
      pulling = true;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (!pulling || state.isRefreshing) return;
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > 0) {
        e.preventDefault();
        const distance = Math.min(diff * 0.5, PTR_MAX);
        dom.ptrIndicator.style.height = distance + 'px';
        dom.ptrIndicator.classList.add('visible');

        if (distance > PTR_THRESHOLD) {
          dom.ptrText.textContent = '↻ Lepas untuk refresh';
          dom.ptrIndicator.classList.add('refreshing');
        } else {
          dom.ptrText.textContent = '↓ Tarik untuk refresh';
          dom.ptrIndicator.classList.remove('refreshing');
        }
      }
    }, { passive: false });

    container.addEventListener('touchend', () => {
      if (!pulling) return;
      const indicatorHeight = parseInt(dom.ptrIndicator.style.height || '0');
      pulling = false;

      if (indicatorHeight > PTR_THRESHOLD && !state.isRefreshing) {
        triggerRefresh();
      } else {
        resetPtrIndicator();
      }
      startY = 0;
      currentY = 0;
    });

    function triggerRefresh() {
      state.isRefreshing = true;
      dom.ptrText.textContent = '↻ Refreshing...';
      dom.ptrIndicator.classList.add('refreshing');

      setTimeout(() => {
        resetPtrIndicator();
        state.isRefreshing = false;
        reloadPage();
      }, 600);
    }

    function resetPtrIndicator() {
      dom.ptrIndicator.style.height = '0px';
      dom.ptrIndicator.classList.remove('visible', 'refreshing');
      dom.ptrText.textContent = '↓ Tarik untuk refresh';
      setTimeout(() => { dom.ptrIndicator.style.height = ''; }, 200);
    }
  }

  /* ============================================
     DOWNLOAD (V1: handle via iframe + future native bridge)
     ============================================ */
  function handleDownload(url, filename, mimeType) {
    if (!url) {
      console.warn('[Download] No URL provided');
      return;
    }

    // Fallback filename
    if (!filename) {
      try {
        const u = new URL(url);
        filename = u.pathname.split('/').pop() || 'download';
      } catch {
        filename = 'download';
      }
    }

    // V1: trigger native browser download (akan di-upgrade ke Android DownloadManager di V2)
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      console.log('[Download]', filename, mimeType || 'unknown');
    } catch (err) {
      console.error('[Download] Failed:', err);
      alert('Gagal mendownload file: ' + err.message);
    }
  }

  /* ============================================
     TTS (Web Speech API)
     ============================================ */
  function speakText() {
    if (!('speechSynthesis' in window)) {
      alert('Browser/device ini tidak mendukung Text-to-Speech.');
      return;
    }

    // Ambil teks dari halaman aktif (via iframe contents - mungkin blocked CORS)
    // Fallback: gunakan teks dari URL bar atau placeholder
    let text = '';

    try {
      const iframeDoc = dom.webview.contentDocument || dom.webview.contentWindow.document;
      if (iframeDoc && iframeDoc.body) {
        text = (iframeDoc.body.innerText || '').trim().substring(0, 5000);
      }
    } catch (e) {
      // CORS-blocked, pakai placeholder
    }

    if (!text) {
      text = 'Tidak dapat membaca konten halaman. Pastikan URL dapat diakses dan coba lagi.';
    }

    if (state.ttsActive) {
      // Toggle: pause/resume
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        window.speechSynthesis.pause();
      }
      return;
    }

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'id-ID';
    utter.rate = 1.0;

    utter.onstart = () => {
      state.ttsActive = true;
      dom.btnTTS.textContent = '⏸ Pause';
      dom.btnTTSStop.style.display = 'block';
    };

    utter.onend = () => {
      resetTTSUI();
    };

    utter.onerror = () => {
      resetTTSUI();
    };

    window.speechSynthesis.speak(utter);
  }

  function stopTTS() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    resetTTSUI();
  }

  function resetTTSUI() {
    state.ttsActive = false;
    dom.btnTTS.textContent = '🔊 TTS';
    dom.btnTTSStop.style.display = 'none';
  }

  /* ============================================
     LOADING INDICATOR
     ============================================ */
  function showLoading() {
    state.isLoading = true;
    dom.loading.classList.add('show');
  }

  function hideLoading() {
    state.isLoading = false;
    dom.loading.classList.remove('show');
  }

  function onWebviewLoad() {
    hideLoading();
    try {
      const iframeUrl = dom.webview.contentWindow.location.href;
      dom.urlInput.value = iframeUrl;
      updateUrlIcon(iframeUrl);
    } catch (e) {
      // CORS-blocked, keep current url
    }
  }

  function onWebviewError() {
    hideLoading();
    console.warn('[WebView] Load error');
  }

  /* ============================================
     BOOT
     ============================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }

  /* ============================================
     PUBLIC API (untuk debugging / external hooks)
     ============================================ */
  window.SimpleWebView = {
    navigate,
    goBack,
    goForward,
    reloadPage,
    handleDownload,
    speakText,
    stopTTS,
    getState: () => ({ ...state })
  };

})();
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@pinia/nuxt', '@pinia-plugin-persistedstate/nuxt', '@nuxt/icon'],
  devtools: {
    enabled: true
  },
  nitro: {
    storage: {
      'nuxt:payload': { driver: 'memory' }
    },
    experimental: {
      wasm: true
    },
  },
  // ~/assets/css/main.css
  css: ['~/assets/css/main.css'],
  // API 位址統一在這裡管理
  // 本地開發讀 .env，正式環境讀 Netlify 環境變數
  runtimeConfig: {
    public: {
      apiBase: 'https://madustrialtd.asuscomm.com:8080'
    }
  },
  routeRules: {
    '/**': {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
      }
    },
    // ── 登入頁面不可設 COOP ──────────────────────────────────────
    // Google GSI（Google Sign-In）按鈕透過 cross-origin iframe 的
    // postMessage 把 credential 傳回頁面。
    // same-origin-allow-popups 只放行「由本頁 open 的 popup」，
    // 無法放行 iframe postMessage，導致 console 出現 COOP 警告。
    // unsafe-none 等同瀏覽器預設（不限制），讓 GSI 正常運作。
    '/': {
      headers: {
        'Cross-Origin-Opener-Policy': 'unsafe-none'
      }
    },
    // ── API 反向代理 ─────────────────────────────────────────────
    // 把 /api/holy/** 在伺服器端轉發到家中主機，瀏覽器端只看到
    // Netlify 同網域請求，cookie 變成「第一方 cookie」。
    // 這是為了解決 iOS Safari / iOS Chrome（皆為 WebKit 引擎）的
    // ITP 機制會限制或擋掉跨站第三方 cookie，導致手機上登入態
    // 無法保持（開新頁面後 /holy/customer/me 讀不到 cookie）的問題。
    '/api/holy/**': {
      proxy: 'https://madustrialtd.asuscomm.com:8080/holy/**'
    }
  },
  app: {
    head: {
      script: [
        {
          // 必須加 tagPosition: 'head' 且放在最前面
          innerHTML: `(function(){try{if(localStorage.getItem('adminDark')==='1'){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          tagPosition: 'head'
        }
      ]
    }
  },
  compatibilityDate: '2025-01-15',
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['import'],
          loadPaths: ['app/assets/scss']
        }
      }
    }
  },
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
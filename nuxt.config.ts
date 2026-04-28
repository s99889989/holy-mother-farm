export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt'
  ],
  devtools: {
    enabled: true
  },
  nitro: {
    storage: {
      'nuxt:payload': { driver: 'memory' }
    }
  },
  css: [

  ],
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

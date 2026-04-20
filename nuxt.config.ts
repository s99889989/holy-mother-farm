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

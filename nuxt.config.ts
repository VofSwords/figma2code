import htmlMiddleware from './vite-plugin-html-middleware'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@nuxt/eslint', '@nuxt/content'],

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2025-07-16',
  vite: {
    plugins: [htmlMiddleware()],
    assetsInclude: ['**/*.html'],
  },
})

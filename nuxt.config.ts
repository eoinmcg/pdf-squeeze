export default defineNuxtConfig({
  compatibilityDate: '2026-05-05',
  ssr: false,
  nitro: {
    preset: 'static',
    prerender: {
      crawlLinks: true,
      routes: ['/']
    }
  },
  devtools: { enabled: true },
  app: {
    baseURL: process.env.NODE_ENV === 'production' ? '/pdf-squeeze/' : '/',
    buildAssetsDir: 'assets',
  },
  runtimeConfig: {
    name: 'PdfSqueeze',
  },
  devServer: {
    port: 8009,
  },
  modules: ['@nuxt/icon'],
})

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
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
    buildAssetsDir: 'assets'  // optional, but keeps paths clean
  },
  future: {
    compatibilityVersion: 4
  },
  css: ['~/assets/css/style.css'],
  runtimeConfig: {
    name: 'PdfSqueeze',
  },
  devServer: {
    port: 8009,
  },
})

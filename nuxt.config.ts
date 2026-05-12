import { execSync } from 'child_process'
import { readFileSync } from 'fs'

const gitHash = execSync('git rev-parse --short HEAD').toString().trim()
const buildTime = new Date().toISOString()
const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

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
  app: {
    baseURL: process.env.NODE_ENV === 'production' ? '/pdfd' : '/',
    buildAssetsDir: 'assets',
    pageTransition: { name: 'page', mode: 'out-in' },
    // layoutTransition: false // Temporary debug
  },
  devtools: { enabled: true },
  runtimeConfig: {
    name: 'PDFd',
  },
  devServer: {
    port: 8009,
    // https: true,
    // host: '0.0.0.0',
  },
  modules: ['@nuxt/icon', '@nuxtjs/i18n', '@vueuse/nuxt'],
  i18n: {
    strategy: 'no_prefix', // Keeps URLs the same, or use 'prefix_except_default'
    defaultLocale: 'en',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'es', name: 'Español', file: 'es.json' }
    ],
    lazy: true,
    langDir: 'locales/'
  },
  vite: {
    define: {
      __GIT_HASH__: JSON.stringify(gitHash),
      __BUILD_TIME__: JSON.stringify(buildTime),
      __APP_VERSION__: JSON.stringify(version),
    },
  },
})

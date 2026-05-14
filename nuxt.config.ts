import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { svg4VuePlugin } from 'vite-plugin-svg4vue';

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
    baseURL: process.env.NODE_ENV === 'production' ? '/offgrid-pdf' : '/',
    buildAssetsDir: 'assets',
    pageTransition: { name: 'page', mode: 'out-in' },
    // layoutTransition: false // Temporary debug
  },
  devtools: { enabled: true },
  runtimeConfig: {
    name: 'offgrid-PDF',
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
    plugins: [
      svg4VuePlugin({
        assetsDirName: 'assets/icons', // Optional: specify directory
      }),
    ],
    build: {
      rollupOptions: {
        onwarn(warning, handler) {
          if (warning.code === 'INVALID_ANNOTATION') return
          handler(warning)
        }
      }
    },

    define: {
      __GIT_HASH__: JSON.stringify(gitHash),
      __BUILD_TIME__: JSON.stringify(buildTime),
      __APP_VERSION__: JSON.stringify(version),
    },
  },
})

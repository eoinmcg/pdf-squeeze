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
  vite: {
    define: {
      __GIT_HASH__: JSON.stringify(gitHash),
      __BUILD_TIME__: JSON.stringify(buildTime),
      __APP_VERSION__: JSON.stringify(version),
    },
  },
})

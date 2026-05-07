<script setup lang="ts">
const { toggleDebug, isDebug } = useDebug()
const stats = ref({
  secure: false,
  crypto: false,
  subtle: false,
  opfs: false,
  quota: 'Checking...',
  persistence: 'Checking...',
  incognito: 'Checking...',
  ua: ''
})

const runDiagnostics = async () => {
  stats.value.ua = navigator.userAgent
  stats.value.secure = window.isSecureContext
  stats.value.crypto = !!window.crypto
  stats.value.subtle = !!window.crypto?.subtle
  stats.value.opfs = !!(navigator.storage && navigator.storage.getDirectory)

  if (navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate()
      const used = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2)
      const total = ((estimate.quota || 0) / (1024 * 1024)).toFixed(2)
      stats.value.quota = `${used} MB / ${total} MB`

      const persisted = await navigator.storage.persisted()
      stats.value.persistence = persisted ? 'Permanent' : 'Best Effort'
    } catch (e) {
      stats.value.quota = 'Error reading storage'
    }
  }

  // Real-world check for Incognito/Private mode
  // Many browsers allow the API to exist but block actual writing
  if (stats.value.opfs) {
    try {
      const root = await navigator.storage.getDirectory()
      const testFile = await root.getFileHandle('test.tmp', { create: true })
      await root.removeEntry('test.tmp')
      stats.value.incognito = 'Likely Normal'
    } catch (e) {
      stats.value.incognito = 'Likely Private/Restricted'
    }
  } else {
    stats.value.incognito = 'N/A (OPFS Missing)'
  }
}

onMounted(runDiagnostics)

const handleToggleDebug = () => {
  toggleDebug()
}

</script>

<template>
  <main class="container">
    <hgroup>
      <h1>System Diagnostics</h1>
      <p>Debugging Web Crypto & OPFS Availability</p>
    </hgroup>

    <article>
      <table role="grid">
        <thead>
          <tr>
            <th>Feature</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Secure Context (HTTPS)</strong></td>
            <td>
              <mark :style="{ backgroundColor: stats.secure ? '#2ecc71' : '#e74c3c', color: 'white' }">
                {{ stats.secure ? 'YES' : 'NO' }}
              </mark>
            </td>
          </tr>
          <tr>
            <td><strong>Crypto API</strong></td>
            <td>{{ stats.crypto ? '✅' : '❌' }}</td>
          </tr>
          <tr>
            <td><strong>Subtle Crypto</strong></td>
            <td>{{ stats.subtle ? '✅' : '❌' }}</td>
          </tr>
          <tr>
            <td><strong>OPFS Support</strong></td>
            <td>{{ stats.opfs ? '✅' : '❌' }}</td>
          </tr>
          <tr>
            <td><strong>Storage Mode</strong></td>
            <td><code>{{ stats.incognito }}</code></td>
          </tr>
          <tr>
            <td><strong>Quota Usage</strong></td>
            <td>{{ stats.quota }}</td>
          </tr>
          <tr>
            <td><strong>Persistence</strong></td>
            <td>{{ stats.persistence }}</td>
          </tr>
          <tr>
            <td><strong>Debug Mode</strong></td>
            <td>
              <button @click="handleToggleDebug" :class="{ active: isDebug }" class="debug">
                {{ isDebug }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <footer>
        <small><strong>User Agent:</strong> {{ stats.ua }}</small>
      </footer>
    </article>

    <button @click="runDiagnostics">Re-Run Test</button>
  </main>
</template>

<style scoped>
mark {
  padding: 2px 8px;
  border-radius: 4px;
}

button {
  border: 2px solid crimson;
  background: orangered;
}

button.debug.active {
  border: 2px solid black;
  background: crimson;
}

button.debug {
  border: 2px solid #dde;
  background: lightblue;
}
</style>

<script setup lang="ts">
declare const __GIT_HASH__: string
declare const __BUILD_TIME__: string
const isDev = import.meta.dev

const gitHash = __GIT_HASH__
const buildTime = formatDate(__BUILD_TIME__) // your existing util!
</script>

<template>
  <footer>
    <p>
      &copy {{ new Date().getFullYear() }}
      |
      made by <a href="https://eoinmcgrath.com">eoinmcg</a>
    </p>
    <p>
      <small v-if="isDev">dev mode</small>
      <small v-else="!isDev">v{{ gitHash }} · {{ buildTime }}</small>
    </p>
  </footer>
</template>

<style scoped>
footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 1rem;
  opacity: 0.6;
  font-size: 70%;
  text-align: center;
  color: var(--text-muted);
  transition: all .3s linear;
}

footer:hover {
  opacity: 1;
}

footer a {
  text-decoration: none;
  color: var(--text-muted);
  font-weight: bold;
}

small {
  opacity: .3;
}
</style>

<template>
  <footer>&copy {{ new Date().getFullYear() }}</footer>
</template>

<style scoped>
footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 1rem;
  font-size: 90%;
  text-align: center;
  color: var(--text-muted);
}
</style>

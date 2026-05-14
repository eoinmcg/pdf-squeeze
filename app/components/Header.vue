<script setup lang="ts">

import Logo from '~/assets/icons/logo.svg';

const { toggleDebug, isDebug } = useDebug()
const { locale, locales } = useI18n()
const { toast } = useToast()

const router = useRouter()

let tapCount = 0
let tapTimer: any = null

const handleLogoTap = () => {
  tapCount++

  console.log(tapCount)
  if (tapCount === 1) {
    // Wait to see if another tap follows
    tapTimer = setTimeout(() => {
      if (tapCount === 1) {
        // Just a single tap, go home
        router.push('/')
      }
      tapCount = 0
    }, 300)
  } else if (tapCount === 3) {
    // Success! Triple tap
    clearTimeout(tapTimer)
    tapCount = 0

    toggleDebug()

    toast('DEBUG MODE: ' + isDebug.value, 'info')

    if (navigator.vibrate) navigator.vibrate([50, 30, 50])
    // alert('🛠️ Debug Mode Toggled') // Optional feedback
  }
  console.log(Logo)
}
</script>
<template>
  <header>
    <NuxtLink to="/" @click.prevent="handleLogoTap">
      <div class="logo">
        <div class="logo-image"></div>
        <div class="logo-text">
          offgrid
          <strong>PDF</strong>
        </div>
      </div>
    </NuxtLink>
    <nav>
      <NuxtLink to="/about">
        <div class="local-only">100% {{ $t('private') }}</div>
      </NuxtLink>
      <NuxtLink to="/about">
        <Icon name="fa7-solid:circle-info" />
      </NuxtLink>
      <select v-model="locale" class="hidden">
        <option v-for="lang in locales" :key="lang.code" :value="lang.code">
          {{ lang.code }}
        </option>
      </select>
    </nav>
  </header>
</template>

<style scoped>
header {
  display: block;
  padding: .5rem 1rem;
  margin: 0 auto 1rem auto;
  max-width: 800px;
  border-bottom: 1px solid rgba(255, 255, 255, .4);
  display: flex;
  justify-content: space-between;
}

header a {
  text-decoration: none;
}

nav {
  gap: .5rem;
}

.local-only {
  font-size: 70%;
  font-weight: thin;
  padding: .75rem 1rem;
  background: darkgreen;
  color: #fff;
  border: 3px solid rgba(0, 0, 0, 0.3);
  line-height: .1;
  height: 1.5rem;
  border-radius: var(--radius-lg);
}


.logo {
  display: flex;
  gap: 10px;
  transition: all .3s ease-in-out;
  align-items: center;
}

.logo-image {

  width: 28px;
  height: 28px;
  background-color: #444;
  mask: url('/logo.svg') no-repeat center / contain;
  -webkit-mask: url('/logo.svg') no-repeat center / contain;
  transition: background-color .2s;
}

.logo:hover .logo-image {
  background-color: darkgreen;
}

.logo-text {
  display: flex;
  /* flex-direction: column; */
  line-height: 1.1;
}

.logo-text strong {
  font-weight: bold;
}

.logo:hover {
  color: darkgreen;
}
</style>

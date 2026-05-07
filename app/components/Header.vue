<script setup lang="ts">
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
}
</script>
<template>
  <header>
    <NuxtLink to="/" @click.prevent="handleLogoTap">
      <div class="logo"> 📑 PDFd</div>
    </NuxtLink>
    <nav>
      <NuxtLink to="/about">
        <div class="local-only">100% {{ $t('private') }}</div>
      </NuxtLink>
      <NuxtLink to="/help">
        <Icon name="fa7-solid:circle-question" class="icon" />
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
  font-size: 80%;
  font-weight: thin;
  padding: .75rem 1rem;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.3);
  line-height: .1;
  height: 1.5rem;
  border-radius: var(--radius-lg);
}


.logo {
  font-size: 150%;
  color: #333;
  font-weight: bold;
  transition: all .3s ease-in-out;
}

.logo:hover {
  color: darkgreen;
}
</style>

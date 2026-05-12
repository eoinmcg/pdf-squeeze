<script setup>
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const props = defineProps({
  pdfDoc: {
    type: Object,
    required: true
  },
  id: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['page-change', 'ready', 'delete-page'])

const canvasWrapRef = ref(null)
const canvasRef = ref(null)
const slideOutMenuRef = ref(null)
const slideOutMenuOpen = ref(false)
const currentPage = ref(1)
const totalPages = ref(0)
const showOptions = ref(false)
const isRendering = ref(false)
const scale = ref(1.5)

const isFullscreen = ref(false)

const updateFullscreen = () => {
  isFullscreen.value = !!document.fullscreenElement
}
let renderTask = null

const renderPage = async (pageNum) => {
  if (!canvasRef.value || isRendering.value) return

  // cancel any in-flight render
  if (renderTask) {
    renderTask.cancel()
    renderTask = null
  }

  isRendering.value = true

  try {
    const page = await props.pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: scale.value })

    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    canvas.width = viewport.width
    canvas.height = viewport.height

    renderTask = page.render({ canvasContext: ctx, viewport })
    await renderTask.promise

    emit('page-change', { page: pageNum, total: totalPages.value })
  } catch (err) {
    if (err.name !== 'RenderingCancelledException') {
      console.error('Render error', err)
    }
  } finally {
    isRendering.value = false
    renderTask = null
  }
}

const goTo = (pageNum) => {
  const clamped = Math.max(1, Math.min(pageNum, totalPages.value))
  if (clamped === currentPage.value) return
  currentPage.value = clamped
  renderPage(clamped)
}

const prev = () => goTo(currentPage.value - 1)
const next = () => goTo(currentPage.value + 1)

const { direction, distanceX } = useSwipe(canvasRef, {
  passive: true,
  onSwipeEnd(e, direction) {
    if (direction === 'left') {
      next() // Your next page function
    } else if (direction === 'right') {
      prev() // Your prev page function
    }
  },
})

// re-render if scale changes
watch(scale, () => renderPage(currentPage.value))

onMounted(async () => {
  totalPages.value = props.pdfDoc.numPages
  await renderPage(1)
  emit('ready', { total: totalPages.value })
  updateFullscreen()
  document.addEventListener('fullscreenchange', updateFullscreen)
  document.addEventListener('click', closeOptions);
})

onBeforeUnmount(() => {
  if (renderTask) renderTask.cancel()
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', updateFullscreen)
  document.removeEventListener('click', closeOptions);
})

const handleDelete = async () => {
  if (!window.confirm('Are you sure?')) return
  emit('delete-page', { page: currentPage.value })
}

const handleFullScreen = async () => {
  const div = canvasWrapRef.value;

  try {
    if (!document.fullscreenElement) {
      await div.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (err) {
    console.error(`Fullscreen error: ${err.message}`);
  }
}
const handleJumpTo = async () => {

}

const handleAnnotate = async () => {
  console.log('ANNOT8')
  slideOutMenuOpen.value = !slideOutMenuOpen.value
}

const toggleOptions = async () => {
  showOptions.value = !showOptions.value
}

const closeOptions = (e) => {
  // Check if the click target is NOT inside the slidemenu
  if (slideOutMenuOpen.value && !slideOutMenuRef.value.contains(e.target)) {
    // slideOutMenuOpen.value = false
  }
}

// expose so parent can call prev/next/goTo programmatically
defineExpose({ prev, next, goTo, currentPage, totalPages, scale })
</script>

<template>
  <div class="pdf-viewer" ref="canvasWrapRef">

    <div ref="slideOutMenuRef" class="slideout-menu" :class="slideOutMenuOpen ? 'active' : ''">
      <button class="close" @click="slideOutMenuOpen = false">
        <Icon name="mdi:close-circle" />
      </button>
      <nav class="primary">
        <button @click="isFullscreen = !isFullscreen">
          <Icon :name="isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" />
          {{ $t('fullscreen') }}
        </button>

        <button @click="handleAnnotate">
          <Icon name="mdi:sticker" />
          {{ $t('sticky_note') }}
        </button>

        <button @click="handleAnnotate">
          <Icon name="mdi:signature-freehand" />
          {{ $t('signature') }}
        </button>

        <button @click="handleDelete">
          <Icon name="mdi:delete" />
          {{ $t('delete_page') }}
        </button>

      </nav>

      <nav>
        <button @click="navigateTo(`/merge/${props.id}`)">
          <!-- <Icon name="mdi:table-merge-cells" /> -->
          {{ $t('merge') }}
        </button>
        <button @click="navigateTo(`/compress/${props.id}`)">
          <!-- <Icon name="mdi:zip-box-outline" /> -->
          {{ $t('compress') }}
        </button>
        <button class="danger" @click="navigateTo(`/`)">
          <!-- <Icon name="mdi:exit-run" /> -->
          {{ $t('exit_to_menu') }}
        </button>
      </nav>
    </div>

    <div class="page-nav primary">
      <div class="nav-group">
        <button class="nav-btn" :disabled="currentPage <= 1" @click="prev">
          <Icon name="solar:round-arrow-left-bold" />
        </button>
        <span class="page-indicator" @click="handleJumpTo">
          {{ currentPage }} <span class="divider">/</span> {{ totalPages }}
        </span>
        <button class="nav-btn" :disabled="currentPage >= totalPages" @click="next">
          <Icon name="solar:round-arrow-right-bold" />
        </button>
      </div>

      <div class="spacer"></div>

      <div class="action-group">
        <button class="action-btn" @click="handleFullScreen">
          <Icon :name="isFullscreen ? 'ic:outline-fullscreen-exit' : 'ic:outline-fullscreen'" />
        </button>

        <button class="action-btn" @click="handleAnnotate">
          <Icon name="ic:baseline-format-list-bulleted" />
          <span class="btn-label">{{ $t('options') }}</span>
        </button>
      </div>
    </div>

    <div class="canvas-wrap">
      <canvas ref="canvasRef" class="pdf-canvas" />
      <div v-if="isRendering" class="render-overlay">{{ $t('rendering') }}</div>
    </div>

  </div>
</template>

<style scoped>
.pdf-viewer {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.canvas-wrap {
  flex: 1;
  overflow: auto;
  width: 100%;
  display: flex;
  justify-content: center;
  position: relative;
  -webkit-overflow-scrolling: touch;
  /* smooth scroll on iOS */
}

.pdf-canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  margin: auto;
}

.render-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--color-text-tertiary);
  background: var(--color-background-primary);
  opacity: 0.7;
}

.slideout-menu {
  position: absolute;
  /* left: -300px; */
  display: block;
  right: -200px;
  width: 0;
  top: 0;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  z-index: 1;
  transition: all .2s linear;
}

.slideout-menu.active {
  width: 200px;
  right: 0;
}

.slideout-menu button.close {
  border: none;
  background: transparent;
  text-align: right;
  width: 100%;
  display: block;
  text-indent: -9999px;
  font-size: 150%;
}

.slideout-menu button.close:hover {
  background: transparent;
  color: crimson;
}

.slideout-menu button:hover {
  transform: translateY(0);
}

.slideout-menu nav {
  margin-top: 2rem;
  display: block;
  font-size: 120%;
}

.slideout-menu nav.primary button {
  font-size: 80%;
}


.slideout-menu nav button {
  display: block;
  width: 100%;
  text-align: left;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: .5rem 1rem;
}

.slideout-menu nav button:hover {
  background-color: darkorange;
  border-bottom: 1px solid #000;
  color: #222;
}


.page-nav.primary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 16px;
  background: #1a1a1a;
  box-sizing: border-box;
  /* Ensures padding doesn't break 100% width */
}

/* Base Styles (Desktop) */
.nav-group,
.action-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spacer {
  flex: 1;
}

.nav-group,
.action-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Page Indicator */
.page-indicator {
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  color: #ccc;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.page-indicator:hover {
  background: #333;
}

.divider {
  color: #666;
  margin: 0 2px;
}

/* Modern Button Style */
button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #2a2a2a;
  color: #efefef;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

button:hover:not(:disabled) {
  background: #383838;
  border-color: #555;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.delete-page:hover {
  background: #442222;
  border-color: #aa4444;
  color: #ff8888;
}


hr {
  border: 0;
  border-top: 1px solid #444;
  margin: 4px 0;
}

/* Transition */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Mobile Adaptation */
@media (max-width: 768px) {
  .page-nav.primary {
    padding: 6px 8px;
    gap: 4px;
  }

  .nav-group,
  .action-group {
    gap: 4px;
  }

  /* Hide the text labels to save space */
  .btn-label {
    display: none;
  }

  /* Make buttons more square/touch-friendly */
  .action-btn,
  .nav-btn {
    padding: 8px;
    min-width: 40px;
    justify-content: center;
  }

  .page-indicator {
    font-size: 12px;
  }
}

/* Ultra-small screens (Phones in portrait) */
@media (max-width: 480px) {

  /* If it's still too cramped, we can reduce the spacer */
  .spacer {
    display: none;
  }

  .page-nav.primary {
    justify-content: space-around;
  }
}
</style>

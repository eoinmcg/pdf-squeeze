<script setup lang="ts">

import { AnnotationLayer } from 'pdfjs-dist'

const { ask } = useConfirm()
const { t } = useI18n()

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
const annotationLayerRef = ref(null)
const slideOutMenuOpen = ref(false)
const currentPage = ref(1)
const totalPages = ref(0)
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


    // annotation layer — needs a div overlaid on the canvas
    annotationLayerRef.value.innerHTML = ''
    annotationLayerRef.value.style.width = `${canvas.width}px`
    annotationLayerRef.value.style.height = `${canvas.height}px`
    const annotations = await page.getAnnotations()
    const linkService = {
      getDestinationHash: () => '',
      getAnchorUrl: () => '',
      addLinkAttributes: () => { },
      navigateTo: () => { },
      goToDestination: () => { },
      page: pageNum,
      pagesCount: totalPages.value,
      externalLinkTarget: null,
      externalLinkRel: null,
      externalLinkEnabled: false,
    }

    const annotationLayer = new AnnotationLayer({
      viewport: viewport.clone({ dontFlip: true }),
      div: annotationLayerRef.value,
      annotations,
      page,
      linkService,
      renderForms: false,
    })

    await annotationLayer.render({
      viewport: viewport.clone({ dontFlip: true }),
      div: annotationLayerRef.value,
      annotations,
      page,
      linkService,
      renderForms: false,
    })

    // const filtered = annotations.filter(a => a.subtype !== 'Link')
    // console.log('non-link annotations:', filtered)
    //
    // console.log('raw rect:', annotations[0]?.rect)
    //
    // // this is what PDF.js uses internally to position the annotation
    // const transformed = viewport.convertToViewportRectangle(annotations[0]?.rect)
    // console.log('transformed rect:', transformed)
    // console.log('canvas size:', canvasRef.value.width, canvasRef.value.height)
    // console.log('annotation layer size:', annotationLayerRef.value.offsetWidth, annotationLayerRef.value.offsetHeight)

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

const goTo = (pageNum: number) => {
  const clamped = Math.max(1, Math.min(pageNum, totalPages.value))
  if (clamped === currentPage.value) return
  currentPage.value = clamped
  renderPage(clamped)
}

const prev = () => goTo(currentPage.value - 1)
const next = () => goTo(currentPage.value + 1)

const { direction } = useSwipe(canvasRef, {
  passive: true,
  onSwipeEnd(e, direction) {
    if (direction === 'left') {
      next() // Your next page function
    } else if (direction === 'right') {
      prev() // Your prev page function
    }
  },
})

const handleNavigation = (type) => {
  const routes = {
    merge: `/merge/${props.id}`,
    compress: `/compress/${props.id}`,
    reorder: `/reorder/${props.id}`,
    exit: '/'
  };
  navigateTo(routes[type]);
};
// re-render if scale changes
watch(scale, () => renderPage(currentPage.value))

onMounted(async () => {
  totalPages.value = props.pdfDoc.numPages
  // await testAnnotation(props.id);
  await renderPage(1)
  emit('ready', { total: totalPages.value })
  updateFullscreen()
  document.addEventListener('fullscreenchange', updateFullscreen)
  document.addEventListener('keydown', handleKeyboard)
})

onBeforeUnmount(() => {
  if (renderTask) renderTask.cancel()
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', updateFullscreen)
  document.removeEventListener('keydown', handleKeyboard)
})

const handleKeyboard = (e: KeyboardEvent) => {
  if (!e || !e.code) return
  if (e.code === 'ArrowLeft') {
    prev()
  } else if (e.code === 'ArrowRight') {
    next()
  }
}

const handleDelete = async () => {
  const confirmed = await ask({
    title: t('delete_page?'),
    message: t('absolutely_sure_page?'),
    confirmText: t('confirm_delete')
  })
  if (!confirmed) return
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

const handleSticky = async () => {
  slideOutMenuOpen.value = false;
  console.log('STICKY NOTE')
}

const handleHighlight = async () => {
  slideOutMenuOpen.value = false;
  console.log('HIGHLIGHY')
}



// expose so parent can call prev/next/goTo programmatically
defineExpose({ prev, next, goTo, currentPage, totalPages, scale })
</script>

<template>
  <div class="pdf-viewer" ref="canvasWrapRef">

    <SlideoutMenu v-model="slideOutMenuOpen" :is-fullscreen="isFullscreen" @fullscreen="handleFullScreen"
      @sticky="handleSticky" @highlight="handleHighlight" @delete="handleDelete" @navigate="handleNavigation" />

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
        <button :title="$t('fullscreen')" class="action-btn" @click="handleFullScreen">
          <Icon :name="isFullscreen ? 'ic:outline-fullscreen-exit' : 'ic:outline-fullscreen'" />
        </button>

        <button :title="$t('options')" class="action-btn" @click="slideOutMenuOpen = !slideOutMenuOpen">
          <Icon name="ic:baseline-format-list-bulleted" />
          <span class="btn-label">{{ $t('options') }}</span>
        </button>
      </div>
    </div>

    <div class="canvas-wrap" ref="canvasWrapRef">
      <canvas ref="canvasRef" class="pdf-canvas" />
      <div ref="annotationLayerRef" class="annotation-layer" />
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

.canvas-wrap:fullscreen {
  overflow: visible !important;
}

.annotation-layer {
  position: absolute;
  top: 0;
  left: 0;
  /* width: 100%; */
  /* height: 100%; */
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

.page-nav.primary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.7);
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

.page-nav button,
.nav-group button {
  border: none;
  background: none;
}

.nav-group button {
  border-radius: 100%;
  font-size: 130%;
}

.page-nav button:hover {
  transform: translateY(0);
  background-color: transparent;
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
    justify-content: space-between;
  }
}
</style>

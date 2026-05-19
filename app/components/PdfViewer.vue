<script setup lang="ts">
import { getDb } from '../lib/db'

const { ask } = useConfirm()
const { t } = useI18n()
const { toast } = useToast()

const props = defineProps({
  pdfDoc: {
    type: Object,
    required: true
  },
  id: {
    type: String,
    required: true
  },
  fileMetaData: {
    type: Object,
    required: true
  },
})

const { annotations, loadForPage, addAnnotation, updateAnnotation, deleteAnnotation, save } = useAnnotations(props.id)
const { downloadFile } = useFileStorage()

const emit = defineEmits(['page-change', 'ready', 'delete-page'])

const baseViewport = ref({ height: 0, width: 0 })
const viewerRef = ref(null)      // fullscreen target (outer .pdf-viewer)
const canvasWrapRef = ref(null)  // scroll container (inner .canvas-wrap)
const canvasRef = ref(null)
const slideOutMenuOpen = ref(false)
const currentPage = ref(1)
const totalPages = ref(0)
const isRendering = ref(false)
const scale = ref(1.5)

const isFullscreen = ref(false)
const isPlacingNote = ref(false)

const pageId = computed(() => props.fileMetaData?.pages?.[currentPage.value - 1]?.id)

watch(currentPage, async () => {
  if (!pageId.value) return
  await loadForPage(pageId.value)
}, { immediate: true })

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



    baseViewport.value = viewport
    await loadForPage(pageId.value)

  } catch (err) {
    if (err.name !== 'RenderingCancelledException') {
      console.error('Render error', err)
    }
  } finally {
    isRendering.value = false
    renderTask = null
  }
}


const onCanvasClick = (e) => {
  if (!isPlacingNote.value) return
  const { left, top } = canvasRef.value.getBoundingClientRect()
  const cssScale = canvasRef.value.getBoundingClientRect().width / canvasRef.value.width
  const x = (e.clientX - left) / cssScale / scale.value
  const y = baseViewport.value.height - (e.clientY - top) / cssScale / scale.value

  addAnnotation(pageId.value, {
    type: 'sticky',
    rect: [x, y - 50, x + 150, y],
    content: ''
  })

  isPlacingNote.value = false
}

const goTo = (pageNum: number) => {
  const clamped = Math.max(1, Math.min(pageNum, totalPages.value))
  if (clamped === currentPage.value) return
  currentPage.value = clamped
  renderPage(clamped)
}

const prev = () => goTo(currentPage.value - 1)
const next = () => goTo(currentPage.value + 1)

const isAnnotationDragging = ref(false)
useSwipe(canvasRef, {
  passive: true,
  onSwipeStart() {
    if (isAnnotationDragging.value) return false  // block swipe
  },
  onSwipeEnd(e, direction) {
    if (isAnnotationDragging.value) return        // block swipe
    if (direction === 'left') next()
    else if (direction === 'right') prev()
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
  await renderPage(1)
  emit('ready', { total: totalPages.value })
  updateFullscreen()
  document.addEventListener('fullscreenchange', updateFullscreen)
  document.addEventListener('keydown', handleKeyboard)

  const db = await getDb()
  const doc = await db.get('documents', props.id)
  const pages = doc.pages
  pages.forEach((page) => {
    console.log(page.id, page.annotations)
  })
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

const handleDownload = async () => {
  console.log(props.pdfDoc)
  await downloadFile(props.id)
}

const handleDelete = async () => {
  const confirmed = await ask({
    title: t('delete_page?'),
    message: t('absolutely_sure_page?'),
    confirmText: t('confirm_delete')
  })
  if (!confirmed) return

  const db = await getDb()
  const doc = await db.get('documents', props.id)

  const pages = doc.pages
  doc.pages = pages.filter(page => page.id !== pageId.value)

  await db.put('documents', doc)
}

const handleFullScreen = async () => {
  const div = viewerRef.value

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
  slideOutMenuOpen.value = false
  isPlacingNote.value = true
}

const handleHighlight = async () => {
  slideOutMenuOpen.value = false;
  console.log('HIGHLIGHT')
}

// expose so parent can call prev/next/goTo programmatically
defineExpose({ prev, next, goTo, currentPage, totalPages, scale })
</script>

<template>
  <div class="pdf-viewer" ref="viewerRef">

    <SlideoutMenu v-model="slideOutMenuOpen" :is-fullscreen="isFullscreen" @fullscreen="handleFullScreen"
      @sticky="handleSticky" @highlight="handleHighlight" @delete="handleDelete" @download="handleDownload"
      @navigate="handleNavigation" />

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

    <div class="canvas-wrap" ref="canvasWrapRef" @click="onCanvasClick">
      <div class="canvas-container">
        <canvas ref="canvasRef" class="pdf-canvas" />
        <StickyNote v-for="ann in annotations" :key="ann.id" :annotation="ann" :canvas-el="canvasRef"
          :page-height="baseViewport.height" :scale="scale" @update="(ann) => updateAnnotation(pageId, ann)"
          @delete-annotation="(id) => deleteAnnotation(pageId, id)" @drag-start="isAnnotationDragging = true"
          @drag-end="isAnnotationDragging = false" />
      </div>
      <div v-if="isRendering" class="render-overlay">{{ $t('rendering') }}</div>
    </div>

  </div>
  <pre>PID: {{ pageId }}</pre>
  <pre>ANNOTS: {{ annotations }}</pre>
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

.canvas-wrap:fullscreen {
  overflow: visible !important;
}

.canvas-wrap {
  flex: 1;
  overflow: auto;
  width: 100%;
  display: flex;
  justify-content: center;
  position: relative;
  -webkit-overflow-scrolling: touch;
}

.canvas-container {
  position: relative;
  /* Sticky notes anchor to this */
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  max-height: 100%;
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

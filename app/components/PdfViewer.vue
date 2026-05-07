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

const canvasRef = ref(null)
const currentPage = ref(1)
const totalPages = ref(0)
const isRendering = ref(false)
const scale = ref(1.5)

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

// re-render if scale changes
watch(scale, () => renderPage(currentPage.value))

onMounted(async () => {
  totalPages.value = props.pdfDoc.numPages
  await renderPage(1)
  emit('ready', { total: totalPages.value })
  console.log(props)
})

onBeforeUnmount(() => {
  if (renderTask) renderTask.cancel()
})
const handleDelete = async () => {
  if (!window.confirm('Are you sure?')) return
  emit('delete-page', { page: currentPage.value })
}


// expose so parent can call prev/next/goTo programmatically
defineExpose({ prev, next, goTo, currentPage, totalPages, scale })
</script>

<template>
  <div class="pdf-viewer">

    <div class="canvas-wrap">
      <canvas ref="canvasRef" class="pdf-canvas" />
      <div v-if="isRendering" class="render-overlay">{{ $t('rendering') }}</div>
    </div>

    <div class="page-nav">
      <button :disabled="currentPage <= 1" @click="prev">‹</button>
      <span>{{ currentPage }} / {{ totalPages }}</span>
      <button :disabled="currentPage >= totalPages" @click="next">›</button>
    </div>
    <div class="page-nav">
      <button @click="handleDelete">{{ $t('delete_page') }}</button>
      <button @click="navigateTo(`/merge/${props.id}`)">{{ $t('merge') }}</button>
      <button @click="navigateTo(`/compress/${props.id}`)">{{ $t('compress') }}</button>
      <button @click="navigateTo(`/share/${props.id}`)">{{ $t('share') }}</button>
    </div>

  </div>
</template>

<style scoped>
.pdf-viewer {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
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

.page-nav {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.page-nav button {
  background: #333;
  color: #eee;
  border: 1px solid #000;
  font-size: 18px;
  padding: 4px 12px;
  cursor: pointer;
}

.page-nav button:disabled {
  opacity: 0.3;
  cursor: default;
}
</style>

<script setup>
const props = defineProps({
  annotation: { type: Object, required: true },
  canvasEl: { type: Object, required: true },  // the canvas element
  pageHeight: { type: Number, required: true }, // PDF page height at scale 1
  scale: { type: Number, required: true },
})

const emit = defineEmits(['update', 'delete', 'drag-start', 'drag-end'])

watch(() => props.annotation.text, (newText) => {
  text.value = newText
})

const noteRef = ref(null)
const isEditing = ref(false)
const text = ref(props.annotation.text)
const isDragging = ref(false)
const textareaRef = ref(null)
const resizeTrigger = ref(0)
let cachedCanvasDimensions = null


// convert PDF coords → screen px
const toScreen = (rect) => {
  // Use clientWidth to get the precise visual layout width of the canvas element
  const canvasW = props.canvasEl.clientWidth
  const canvasNatural = props.canvasEl.width  // actual internal pixel buffer width
  const cssScale = canvasW / canvasNatural    // CSS shrink factor

  return {
    x: rect[0] * props.scale * cssScale,
    // Ensure the Y calculation maps directly to the active scaling environment
    y: (props.pageHeight - rect[3]) * props.scale * cssScale,
    width: (rect[2] - rect[0]) * props.scale * cssScale,
    height: (rect[3] - rect[1]) * props.scale * cssScale,
  }
}

// convert screen px → PDF coords
const toPdf = (x, y, width, height) => {
  const canvasW = props.canvasEl.clientWidth
  const canvasNatural = props.canvasEl.width
  const cssScale = canvasW / canvasNatural

  const pdfX = x / props.scale / cssScale
  const pdfY = props.pageHeight - (y / props.scale / cssScale)
  const pdfW = width / props.scale / cssScale
  const pdfH = height / props.scale / cssScale

  return [pdfX, pdfY - pdfH, pdfX + pdfW, pdfY]
}

const pos = computed(() => {
  // Accessing this value tells Vue to re-run this computed block whenever resizeTrigger changes
  resizeTrigger.value

  return toScreen(props.annotation.rect)
})

const cleanupGlobalListeners = () => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}
const startEditing = async () => {
  isEditing.value = true

  await nextTick()

  if (textareaRef.value) {
    textareaRef.value.focus()
    // move cursor to the end of the text instead of the beginning
    const length = textareaRef.value.value.length
    textareaRef.value.setSelectionRange(length, length)
  }
}

// drag
let dragStart = null
let lastTap = 0
const onPointerDown = (e) => {
  if (isEditing.value) return
  e.preventDefault()

  const now = Date.now()
  const DOUBLE_TAP_DELAY = 300 // ms
  if (now - lastTap < DOUBLE_TAP_DELAY) {
    lastTap = 0 // Reset
    startEditing()
    return // Stop here so we don't start dragging while trying to edit
  }
  lastTap = now
  isDragging.value = true

  cachedCanvasDimensions = {
    width: props.canvasEl.clientWidth,
    naturalWidth: props.canvasEl.width
  }

  dragStart = {
    px: e.clientX - pos.value.x,
    py: e.clientY - pos.value.y,
  }
  e.target.setPointerCapture(e.pointerId)
  emit('drag-start')
  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

const onPointerMove = (e) => {
  if (!isDragging.value) return
  e.preventDefault()
  const x = e.clientX - dragStart.px
  const y = e.clientY - dragStart.py
  const newRect = toPdf(x, y, pos.value.width, pos.value.height)
  emit('update', { ...props.annotation, rect: newRect })
}

const onPointerUp = () => {
  isDragging.value = false
  dragStart = null
  emit('drag-end')
  cleanupGlobalListeners()
  cachedCanvasDimensions = null
}

const onDblClick = () => { isEditing.value = true }

const onBlur = () => {
  isEditing.value = false
  emit('update', { ...props.annotation, text: text.value })
}

const onDelete = () => emit('delete', props.annotation.id)

let resizeObserver = null

// A helper to force Vue to recalculate everything
const forceRecalculate = () => {
  resizeTrigger.value++
}

// Fullscreen transitions take a split second to settle in the DOM
const handleFullscreenChange = () => {
  forceRecalculate()
  // A tiny 100ms backup timeout ensures we capture the absolute final layout state
  setTimeout(forceRecalculate, 100)
}

onMounted(() => {
  if (props.canvasEl) {
    resizeObserver = new ResizeObserver(forceRecalculate)
    resizeObserver.observe(props.canvasEl)
  }
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  cleanupGlobalListeners()
})

</script>

<template>
  <div ref="noteRef" class="sticky-note" :class="{ dragging: isDragging, editing: isEditing }"
    :style="{ left: `${pos.x}px`, top: `${pos.y}px`, width: `${pos.width}px`, minHeight: `${pos.height}px` }"
    @pointerdown="onPointerDown" @dblclick="onDblClick">
    <div class="note-toolbar">
      <button class="delete-btn" @pointerdown.stop @click="onDelete">✕</button>
    </div>
    <textarea v-if="isEditing" v-model="text" ref="textareaRef" class="note-textarea" @blur="onBlur"
      @pointerdown.stop />
    <div v-else class="note-text">{{ text }}</div>
  </div>
</template>

<style scoped>
.sticky-note {
  touch-action: none;
  position: absolute;
  background: #fef9c3;
  border: 1px solid #d4b400;
  border-radius: 4px;
  padding: 4px;
  box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.2);
  cursor: grab;
  user-select: none;
  z-index: 10;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.sticky-note.dragging {
  cursor: grabbing;
  opacity: 0.85;
  box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.3);
}

.note-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 2px;
}

.delete-btn {
  background: transparent;
  border: none;
  color: #999;
  font-size: 10px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}

.delete-btn:hover {
  color: crimson;
}

.note-text {
  font-size: 12px;
  color: #333;
  word-break: break-word;
  white-space: pre-wrap;
  flex: 1;
}

.note-textarea {
  width: 100%;
  height: 100%;
  flex: 1;
  border: none;
  background: transparent;
  field-sizing: content;
  font-size: 12px;
  color: #333;
  resize: none;
  outline: none;
  font-family: inherit;
}
</style>

<script setup>
const props = defineProps({
  annotation: { type: Object, required: true },
  canvasEl: { type: Object, required: true },
  pageHeight: { type: Number, required: true },
  scale: { type: Number, required: true },
})

const emit = defineEmits(['update', 'delete-annotation', 'drag-start', 'drag-end'])

// Available color presets (Tailwind-like background & border pairs)
const colorPresets = [
  { id: 'yellow', bg: '#fef9c3', border: '#d4b400' },
  { id: 'blue', bg: '#e0f2fe', border: '#0284c7' },
  { id: 'green', bg: '#dcfce7', border: '#16a34a' },
  { id: 'pink', bg: '#fce7f3', border: '#db2777' }
]

// Fallback to yellow if the annotation doesn't have a color property yet
const currentColor = computed(() => {
  return colorPresets.find(c => c.id === props.annotation.color) || colorPresets[0]
})

watch(() => props.annotation.content, (newContent) => {
  text.value = newContent
})

const noteRef = ref(null)
const isEditing = ref(false)
const text = ref(props.annotation.content)
const isDragging = ref(false)
const textareaRef = ref(null)
const resizeTrigger = ref(0)
let cachedCanvasDimensions = null

const getCanvasDimensions = (customCache = null) => {
  if (customCache) return customCache
  return {
    width: props.canvasEl?.clientWidth || 0,
    naturalWidth: props.canvasEl?.width || 1
  }
}

const toScreen = (rect) => {
  const dims = getCanvasDimensions()
  const cssScale = dims.width / dims.naturalWidth

  return {
    x: rect[0] * props.scale * cssScale,
    y: (props.pageHeight - rect[3]) * props.scale * cssScale,
    width: (rect[2] - rect[0]) * props.scale * cssScale,
    height: (rect[3] - rect[1]) * props.scale * cssScale,
  }
}

const toPdf = (x, y, width, height, customCache = null) => {
  const dims = getCanvasDimensions(customCache)
  const cssScale = dims.width / dims.naturalWidth

  const pdfX = x / props.scale / cssScale
  const pdfY = props.pageHeight - (y / props.scale / cssScale)
  const pdfW = width / props.scale / cssScale
  const pdfH = height / props.scale / cssScale

  return [pdfX, pdfY - pdfH, pdfX + pdfW, pdfY]
}

const pos = computed(() => {
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
    const length = textareaRef.value.value.length
    textareaRef.value.setSelectionRange(length, length)
  }
}

let dragStart = null
let lastTap = 0

const onPointerDown = (e) => {
  if (isEditing.value) return

  // If clicking a menu item or button inside the note, don't trigger drag
  if (e.target.closest('.color-dot') || e.target.closest('.delete-btn')) return

  e.preventDefault()

  const now = Date.now()
  const DOUBLE_TAP_DELAY = 300
  if (now - lastTap < DOUBLE_TAP_DELAY) {
    lastTap = 0
    startEditing()
    return
  }
  lastTap = now
  isDragging.value = true

  cachedCanvasDimensions = {
    width: props.canvasEl.clientWidth,
    naturalWidth: props.canvasEl.width || 1
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

  const newRect = toPdf(x, y, pos.value.width, pos.value.height, cachedCanvasDimensions)
  emit('update', { ...toRaw(props.annotation), rect: newRect })
}

const onPointerUp = () => {
  isDragging.value = false
  dragStart = null
  emit('drag-end')
  cleanupGlobalListeners()
  cachedCanvasDimensions = null
}

const onBlur = () => {
  isEditing.value = false
  emit('update', { ...toRaw(props.annotation), content: text.value })
}

// FLOURISH: Updates the color scheme in the parent data object
const changeColor = (colorId) => {
  emit('update', { ...toRaw(props.annotation), color: colorId })
}

const onDelete = () => {
  emit('delete-annotation', props.annotation.id)
}

let resizeObserver = null
const forceRecalculate = () => {
  resizeTrigger.value++
}

const handleFullscreenChange = () => {
  forceRecalculate()
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
  if (resizeObserver) resizeObserver.disconnect()
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  cleanupGlobalListeners()
})
</script>

<template>
  <div ref="noteRef" class="sticky-note" :class="{ dragging: isDragging, editing: isEditing }" :style="{
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    width: `${pos.width}px`,
    minHeight: `${pos.height}px`,
    background: currentColor.bg,
    borderColor: currentColor.border
  }" @pointerdown="onPointerDown">

    <div class="note-toolbar">
      <div class="color-palette">
        <button v-for="preset in colorPresets" :key="preset.id" class="color-dot"
          :class="{ active: preset.id === currentColor.id }"
          :style="{ backgroundColor: preset.bg, borderColor: preset.border }" @click="changeColor(preset.id)"
          :title="`Switch to ${preset.id}`" />
      </div>
      <button class="delete-btn" @pointerdown.stop @click="onDelete">
        <Icon name="fa7-solid:trash-alt" />
      </button>
    </div>

    <textarea v-if="isEditing" v-model="text" ref="textareaRef" class="note-textarea" @blur="onBlur"
      @pointerdown.stop />
    <div v-else class="note-text">{{ annotation.content }}</div>
  </div>
</template>

<style scoped>
.sticky-note {
  touch-action: none;
  position: absolute;
  border: 1px solid #d4b400;
  border-radius: 4px;
  padding: 6px;
  /* slightly increased internal breathing room */
  box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.2);
  cursor: grab;
  user-select: none;
  z-index: 10;
  display: flex;
  flex-direction: column;
  min-width: 120px;
  box-sizing: border-box;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.sticky-note.dragging {
  cursor: grabbing;
  opacity: 0.85;
  box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.3);
}

/* FLOURISH: Absolute position the menu completely outside the container body */
.note-toolbar {
  position: absolute;
  left: 0;
  right: 0;
  top: -18px;
  /* Shifts the menu exactly 28px above the top boundary line */

  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 4px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  pointer-events: none;
  /* Prevents an invisible layout box from blocking page elements */

  /* Your updated adjustment: completely invisible by default */
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
  transform: translateY(4px);
}

/* Toolbar slides up slightly and reveals itself on user interaction */
.sticky-note:hover .note-toolbar,
.sticky-note.editing .note-toolbar {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
  /* Re-enable pointer events only when visible */
}

.color-palette {
  display: flex;
  gap: 4px;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid transparent;
  cursor: pointer;
  padding: 0;
  box-sizing: border-box;
  transition: transform 0.1s ease;
}

.color-dot:hover {
  transform: scale(1.2);
}

.color-dot.active {
  transform: scale(1.1);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.2);
}

.delete-btn {
  background: transparent;
  border: none;
  color: #666;
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
  min-width: 120px;
  padding: 0;
}
</style>

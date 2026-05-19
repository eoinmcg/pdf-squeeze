<script setup lang="ts">
import { useRoute } from 'vue-router'
import VueDraggable from 'vuedraggable'

const { loadFile, getMeta, generateThumbnail, reorderPages } = useFileStorage()
const { toast } = useToast()
const { t } = useI18n()

interface PageItem {
  id: string
  thumbnail: string
  sourceIndex?: number
  isBlank?: boolean
  rotation: number    // Track absolute rotation in degrees: 0, 90, 180, 270
}

const fileMeta = ref<{ name: string; pages?: any[] } | null>(null)
const filePdf = ref<Blob | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)

const pages = ref<PageItem[]>([])
const originalOrderString = ref('')

const route = useRoute()
const ID = route.params.id as string

// Generates a quick client-side blank white thumbnail so it doesn't spin infinitely
const generateBlankThumbnail = (width = 120, height = 160): string => {
  if (import.meta.env.SSR) return ''
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.strokeRect(2, 2, width - 4, height - 4)
  }
  return canvas.toDataURL()
}

const hasChanges = computed(() => {
  const currentSnapshot = pages.value.map(p => ({ id: p.id, rotation: p.rotation }))
  return JSON.stringify(currentSnapshot) !== originalOrderString.value
})

onMounted(async () => {
  try {
    const [metaResult, fileResult] = await Promise.all([
      getMeta(ID),
      loadFile(ID)
    ])

    fileMeta.value = metaResult
    filePdf.value = fileResult

    if (!filePdf.value) throw new Error('File failed to load')

    const arrayBuffer = await filePdf.value.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    isLoading.value = false

    // Fallback generation logic matching your IndexedDB startup logic
    const dbPages = fileMeta.value?.pages ?? []

    for (let i = 1; i <= pdf.numPages; i++) {
      const pageIndex = i - 1
      const existingPage = dbPages[pageIndex]
      const existingPageId = dbPages[pageIndex]?.id || crypto.randomUUID()

      pages.value.push({
        id: existingPageId,
        thumbnail: '',
        sourceIndex: pageIndex,
        rotation: existingPage?.rotation ?? 0
      })

      // Push asynchronous background thumbnail generation 
      generateThumbnail(pdf, i, 120).then(thumb => {
        const targetPage = pages.value.find(p => p.id === existingPageId)
        if (targetPage) {
          targetPage.thumbnail = thumb
        }
      }).catch(err => console.error(`Failed thumbnail for page ${i}:`, err))
    }

    // Capture snapshot string representation of initial state
    originalOrderString.value = JSON.stringify(pages.value.map(p => ({ id: p.id, rotation: p.rotation })))

  } catch (error) {
    console.error(error)
    toast(t('error_loading_file') || 'Failed to load document', 'error')
  } finally {
    isLoading.value = false
  }
})

// Insert a blank page into the local state adhering to your structural metadata rules
const insertBlankPage = () => {
  const blankItem: PageItem = {
    id: crypto.randomUUID(), // Generates standard clean structural integrity UUID
    thumbnail: generateBlankThumbnail(),
    isBlank: true
  }
  pages.value.push(blankItem)
}

const rotatePage = (index: number) => {
  const page = pages.value[index]
  // Increment by 90 and wrap around at 360
  page.rotation = (page.rotation + 90) % 360
}

// Removes page layout node from current working draft
const deleteLocalPage = (index: number) => {
  pages.value.splice(index, 1)
}

const handleSave = async () => {
  isSaving.value = true
  try {
    const updatedPagesPayload = pages.value.map(p => ({
      id: p.id,
      thumbnail: p.isBlank ? null : p.thumbnail,
      annotations: [],
      sourceIndex: p.sourceIndex ?? null,
      isBlank: p.isBlank ?? false,
      rotation: p.rotation // Enforce data flow to OPFS backend
    }))

    await reorderPages(ID, updatedPagesPayload)
    originalOrderString.value = JSON.stringify(pages.value.map(p => ({ id: p.id, rotation: p.rotation })))
    toast(t('save_success') || 'Changes saved successfully')
  } catch (error) {
    console.error(error)
    toast(t('save_error') || 'Failed to save changes')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <main class="container" v-if="isLoading">
    <Loading />
  </main>
  <main class="container" v-else-if="fileMeta">
    <div class="header-actions">
      <h3>{{ t('reorder') }}:
        <NuxtLink :to="`/editor/${ID}`">
          {{ fileMeta.name }}
        </NuxtLink>
      </h3>

      <div class="action-buttons">
        <button class="btn-secondary" @click="insertBlankPage">
          <Icon name="fa7-solid:plus" class="btn-icon" />
          {{ t('insert_blank_page') || 'Insert Blank Page' }}
        </button>
        <button class="btn-save" :disabled="!hasChanges || isSaving" @click="handleSave">
          {{ isSaving ? t('saving') || 'Saving...' : t('save') || 'Save Changes' }}
        </button>
      </div>
    </div>

    <!-- item-key stays mapped directly to your single unique clean id field string -->
    <VueDraggable v-model="pages" item-key="id" tag="div" class="page-view reorder" ghost-class="ghost-card"
      animation="200">
      <template #item="{ element, index }">
        <div class="page-card" :class="{ 'blank-page-card': element.isBlank }">
          <div class="page-number">{{ index + 1 }}</div>

          <!-- Toolbar container for card controls -->
          <div class="card-actions">
            <button class="btn-action btn-rotate" @click.stop="rotatePage(index)" title="Rotate 90°">
              <Icon name="fa7-solid:redo" />
            </button>
            <button class="btn-action btn-delete" @click.stop="deleteLocalPage(index)" title="Delete Page">
              <Icon name="fa7-solid:trash-alt" />
            </button>
          </div>

          <!-- Apply a dynamic CSS transformation matrix based on local state degrees -->
          <div class="thumbnail-wrapper" :style="{ transform: `rotate(${element.rotation}deg)` }">
            <img :src="element.thumbnail" v-if="element.thumbnail" alt="PDF Page thumbnail" />
            <div v-else>
              <div class="loading" aria-busy="true"></div>
            </div>
          </div>
        </div>
      </template>
    </VueDraggable>
  </main>
</template>

<style scoped>
/* ==========================================================================
   1. Header & Global Layout Actions
   ========================================================================== */
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

h3 {
  margin: 0;
  color: #333;
}

/* ==========================================================================
   2. Shared & Base Button Layouts (DRY Rules Integration)
   ========================================================================== */
.btn-secondary,
.btn-save {
  padding: 0.6rem 1.2rem;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background-color 0.2s, opacity 0.2s;
}

.btn-secondary {
  background-color: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
}

.btn-secondary:hover {
  background-color: #e2e8f0;
}

.btn-save {
  background-color: darkgreen;
  color: white;
  border: none;
}

.btn-save:hover:not(:disabled) {
  background-color: #005000;
}

.btn-save:disabled {
  background-color: #cbd5e1;
  color: #94a3b8;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 0.85rem;
}

/* ==========================================================================
   3. Grid Workspace & Document Canvas Wrapper
   ========================================================================== */
.page-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 20px;
  padding: 15px;
}

.page-card {
  position: relative;
  background: white;
  border: 1px solid #e0e0e0;
  padding: 15px 10px 10px 10px;
  /* Top padding added to clear floating toolbars */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  cursor: grab;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.blank-page-card {
  background: #f8fafc;
  border-style: dashed;
}

.page-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.page-card:active {
  cursor: grabbing;
}

.page-card img {
  max-width: 100%;
  height: auto;
  display: block;
}

.ghost-card {
  opacity: 0.4;
  background: #e0e7ff;
  border: 2px dashed #4f46e5;
}

/* ==========================================================================
   4. Floating Decorative Badges
   ========================================================================== */
.page-number {
  position: absolute;
  top: -8px;
  left: -8px;
  background: #666;
  color: white;
  font-size: 11px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

/* ==========================================================================
   5. Interactive Card Action Toolbars & Icon Management
   ========================================================================== */
.card-actions {
  position: absolute;
  top: -10px;
  right: -6px;
  display: flex;
  gap: 6px;
  opacity: 0;
  /* Hidden by default on desktop monitors */
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
}

/* Reveal entire action bar container contextually upon desktop hovering */
.page-card:hover .card-actions {
  opacity: 1;
}

.btn-action {
  color: white;
  border: none;
  border-radius: 50%;
  width: 28px;
  /* Adjusted size for structural consistency */
  height: 28px;
  /* Adjusted size for structural consistency */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  transition: transform 0.1s, background-color 0.2s;
}

/* Force inner graphic node assets to dynamically stretch out inside the button grid */
.btn-action :deep(svg),
.btn-action .icon,
.btn-action i {
  font-size: 0.85rem !important;
  width: 1em;
  height: 1em;
}

.btn-action:hover {
  transform: scale(1.15);
}

.btn-rotate {
  background: #4f46e5;
}

.btn-rotate:hover {
  background: #4338ca;
}

.btn-delete {
  background: crimson;
}

.btn-delete:hover {
  background-color: #dc2626;
}

/* ==========================================================================
   6. Image Transformations & Dynamic Structural Layouts
   ========================================================================== */
.thumbnail-wrapper {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
}

/* ==========================================================================
   7. Touch Devices Optimization (Fixes Hover and Layout Sizing Issues)
   ========================================================================== */
@media (pointer: coarse) {

  /* Permanently reveal action controllers on touch inputs to avoid hover dependency */
  .card-actions {
    opacity: 1;
    top: -12px;
    right: -4px;
    gap: 8px;
  }

  /* Expand target tapping boundaries to mitigate accidental clicks */
  .btn-action {
    width: 34px;
    height: 34px;
  }

  .btn-action :deep(svg),
  .btn-action .icon,
  .btn-action i {
    font-size: 1rem !important;
  }

  /* Pad layout box limits to accommodate larger control handles */
  .page-card {
    padding-top: 22px;
  }
}
</style>

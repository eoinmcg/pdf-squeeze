<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import VueDraggable from 'vuedraggable'

const { loadFile, getMeta, generateThumbnail, reorderPages } = useFileStorage()
const { toast } = useToast()
const { t } = useI18n()

interface PageItem {
  id: number        // The original 0-based index of the page in the source PDF
  thumbnail: string // The data URL string
}

const fileMeta = ref<{ name: string } | null>(null)
const filePdf = ref<Blob | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)

const pages = ref<PageItem[]>([])
const originalOrderString = ref('')

const route = useRoute()
const ID = route.params.id as string

// Computes changes: active if pages were reordered OR any pages were deleted
const hasChanges = computed(() => {
  const currentOrderString = JSON.stringify(pages.value.map(p => p.id))
  return currentOrderString !== originalOrderString.value
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

    const promises = []
    for (let i = 1; i <= pdf.numPages; i++) {
      promises.push(generateThumbnail(pdf, i, 120))
    }

    const thumbnails = await Promise.all(promises)

    pages.value = thumbnails.map((thumb, index) => ({
      id: index,
      thumbnail: thumb
    }))

    originalOrderString.value = JSON.stringify(pages.value.map(p => p.id))
  } catch (error) {
    console.error(error)
    toast(t('error_loading_file') || 'Failed to load document', 'error')
  } finally {
    isLoading.value = false
  }
})

// Removes a page from the UI layout state (does not write to disk yet)
const deleteLocalPage = (index: number) => {
  pages.value.splice(index, 1)
}

const handleSave = async () => {
  isSaving.value = true
  try {
    // Extract remaining original indices in their current updated order
    // e.g., if we had 4 pages [0, 1, 2, 3] and deleted page 2, this sends [0, 1, 3]
    const pageOrderIndices = pages.value.map(p => p.id)

    await reorderPages(ID, pageOrderIndices)

    originalOrderString.value = JSON.stringify(pageOrderIndices)
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

      <button class="btn-save" :disabled="!hasChanges || isSaving" @click="handleSave">
        {{ isSaving ? t('saving') || 'Saving...' : t('save') || 'Save Changes' }}
      </button>
    </div>

    <VueDraggable v-model="pages" item-key="id" tag="div" class="page-view reorder" ghost-class="ghost-card"
      animation="200">
      <template #item="{ element, index }">
        <div class="page-card">
          <div class="page-number">{{ index + 1 }}</div>

          <!-- Delete button placed in the upper right corner of the card -->
          <button class="btn-delete" @click.stop="deleteLocalPage(index)" title="Delete Page">
            <Icon name="fa7-solid:trash-alt" />
          </button>

          <img :src="element.thumbnail" alt="PDF Page thumbnail" />
        </div>
      </template>
    </VueDraggable>
  </main>
</template>

<style scoped>
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

h3 {
  margin: 0;
  color: #333;
}

.btn-save {
  background-color: darkgreen;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
}

.btn-save:hover:not(:disabled) {
  background-color: darkgreen;
}

.btn-save:disabled {
  background-color: #cbd5e1;
  color: #94a3b8;
  cursor: not-allowed;
}

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
  border-radius: 6px;
  padding: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  cursor: grab;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.page-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Make sure the delete button shows up elegantly over the thumbnail */
.page-card:hover .btn-delete {
  opacity: 1;
}

.page-card:active {
  cursor: grabbing;
}

.page-card img {
  max-width: 100%;
  height: auto;
  display: block;
  border-radius: 4px;
}

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
  z-index: 2;
}

/* Style for Delete button overlay */
.btn-delete {
  position: absolute;
  top: -8px;
  right: -8px;
  background: crimson;
  color: white;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, background-color 0.2s, transform 0.1s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  z-index: 2;
}

.btn-delete:hover {
  background-color: #dc2626;
  transform: scale(1.1);
}

.ghost-card {
  opacity: 0.4;
  background: #e0e7ff;
  border: 2px dashed #4f46e5;
}
</style>

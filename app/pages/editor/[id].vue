<script setup lang="ts">

import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const { loadFile, updateMeta, getMeta, deletePage } = useFileStorage()
const route = useRoute()
const fileMetaData = ref({
  id: null,
  name: '',
  size: 0,
  contentHash: '',
  pageCount: 0,
  lastOpenedAt: null,
  createdAt: null,
});
const pdfDoc = shallowRef(null)
const loading = ref(true)
const error = ref(false)

// prevent pdf getting stale
const pdfReloadKey = ref(0)

const ID = route.params.id as string

const { toast } = useToast()

onMounted(async () => {
  await loadPdf();
})

const loadPdf = async () => {

  let meta = {}

  try {
    const file = await loadFile(ID)
    const arrayBuffer = await file.arrayBuffer()
    const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    meta.lastOpenedAt = Date.now();
    meta.pageCount = doc.numPages;

    pdfDoc.value = markRaw(doc) // tell Vue: don't touch this object
    fileMetaData.value = await getMeta(ID);
    pdfReloadKey.value++; // force reload
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }

  if (Object.keys(meta).length) {
    await updateMeta(ID, meta)
  }

}

const handlePageDelete = async (payload) => {
  try {
    await deletePage(ID, payload.page - 1)
    await loadPdf();
    toast('Page deleted', 'info')
  } catch (e) {
    console.log('Error: ', e)
  }
}

const saveMetadata = async () => {
  await updateMeta(ID, { name: fileMetaData.value.name })
  toast('RENAMED')
}
</script>


<template>
  <main class="container">
    <Header />

    <div v-if="loading">
      <span aria-busy="true">Loading</span>
    </div>
    <div v-else-if="pdfDoc">
      <EditableTitle v-model="fileMetaData.name" @update:modelValue="saveMetadata" />

      <PdfViewer v-if="pdfDoc" :key="pdfReloadKey" :id="ID" :pdf-doc="pdfDoc" @delete-page="handlePageDelete" />

    </div>
    <div v-else-if="error" class="error card">
      Can not load file
    </div>

  </main>
</template>

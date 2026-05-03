<script setup lang="ts">
// pages/editor/[id].vue

import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const { loadFile, updateMeta, getMeta, deleteFile, deletePage } = useFileStorage()
const route = useRoute()
const fileMetaData = ref({})
const pdfDoc = shallowRef(null)
const loading = ref(true)
const error = ref(false)

const id = route.params.id as string


onMounted(async () => {
  await loadPdf();
})

const loadPdf = async () => {
  try {
    const file = await loadFile(id)
    const arrayBuffer = await file.arrayBuffer()
    const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    pdfDoc.value = markRaw(doc) // tell Vue: don't touch this object
    fileMetaData.value = await getMeta(id);
  } catch (e) {
    error.value = true
    console.log('ERROR')
  } finally {
    loading.value = false
  }


  // Now you have page count — backfill it into IndexedDB
  await updateMeta(route.params.id as string, {
    lastOpenedAt: Date.now(),
  })

}

const handlePageDelete = async (payload) => {
  try {
    await deletePage(id, payload.page - 1)
    console.log('deleted page')
    await loadPdf();
    console.log('reloaded page')
    // console.log('RELAD')
  } catch (e) {
    console.log('Error: ', e)
  }
}
</script>


<template>
  <main class="container">
    <header>
      <NuxtLink to="/">
        <h1> <span>📑</span> PDFer</h1>
      </NuxtLink>
      <div class="local-only">Local only</div>
    </header>

    <div v-if="loading">
      <span aria-busy="true">Loading</span>
    </div>
    <div v-else-if="pdfDoc">
      <h1>{{ fileMetaData.name }}</h1>
      <PdfViewer v-if="pdfDoc" :pdf-doc="pdfDoc" @delete-page="handlePageDelete" />
    </div>
    <div v-else-if="error" class="error card">
      Can not load file
    </div>

  </main>
</template>

<script setup lang="ts">

const { saveFile, loadFile, getMeta } = useFileStorage()
const { toast } = useToast()

const route = useRoute()
const ID = route.params.id as string

const fileMeta = ref()
const fileCopy = ref()
const compressed = ref()
const isProcessing = ref(false)
const copySaved = ref(false)

const saving = computed(() => {
  return Math.ceil(100 - (compressed.value.size / fileMeta.value.size) * 100)
})


onMounted(async () => {
  fileMeta.value = await getMeta(ID)
  fileCopy.value = await loadFile(ID)
})

async function handlePdfCompress() {
  isProcessing.value = true;
  compressed.value = null;
  compressed.value = await compressPdf(fileCopy.value, {
    format: "image/jpeg",
    quality: 0.7,
    scale: 1
  });
  isProcessing.value = false;
}

function downloadPdf() {
  const name = fileMeta.value.name + '_COMPRESSED.pdf'
  const url = URL.createObjectURL(compressed.value)
  const a = document.createElement("a")
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function clearFile() {
  isProcessing.value = false
  compressed.value = null
}

async function savePdf() {
  const newFileName = fileMeta.value.name += '_COMPRESSED.pdf';
  const file = new File([compressed.value], newFileName, { type: compressed.value.type })

  try {
    const meta = await saveFile(file)
    if (meta.exists) {
      return toast('File exists')
    }
    copySaved.value = true
    toast('ADDED: ' + newFileName, 'info')
  } catch (err) {
    console.error('Failed to save file', err)
    toast('FAILED TO SAVE FILE', 'error')
  }
}

</script>

<template>
  <main class="container">
    <Header />
    <span v-if="fileMeta">
      <FileMeta :data="fileMeta" <hr />
      <p>
        <button v-if="!compressed" :disabled="isProcessing" :aria-busy="isProcessing" @click="handlePdfCompress()"
          class="submit">
          {{ isProcessing ? 'Compressing' : 'Compress' }}
        </button>
        <UiProgress v-if="isProcessing" />
        <span v-if="compressed">
          <UiProgress :value="saving" />
          Compresed: {{ formatBytes(compressed.size) }}<br />
          Saving: {{ saving }}%
          <hr />
          <div class="button-group">
            <button @click="downloadPdf" class="submit">
              <Icon name="fa7-solid:download" />
              Download
            </button>
            <button v-if="!copySaved" @click="savePdf" class="submit">
              <Icon name="fa7-solid:copy" />
              Save Copy
            </button>
            <button @click="clearFile" class="cancel">
              <Icon name="fa7-solid:xmark-circle" />
              Clear
            </button>
          </div>
        </span>
      </p>

    </span>

  </main>
</template>

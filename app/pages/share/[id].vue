<script setup lang="ts">

const { loadFile, getMeta } = useFileStorage()
const { toast } = useToast()
const { t } = useI18n()

const fileMeta = ref()
const filePdf = ref()
const isLoading = ref(true)

const route = useRoute()
const ID = route.params.id as string

onMounted(async () => {
  fileMeta.value = await getMeta(ID)
  filePdf.value = await loadFile(ID)
  isLoading.value = false;
})

function downloadPdf() {
  const url = URL.createObjectURL(filePdf.value)
  const a = document.createElement('a')
  a.href = url
  a.download = fileMeta.value.name
  a.click()
  URL.revokeObjectURL(url)
}

async function sharePdf() {
  if (!navigator.canShare?.({ files: [filePdf.value] })) {
    toast('Sharing not supported on this device', 'error')
    return
  }

  try {
    await navigator.share({
      files: [filePdf.value],
      title: fileMeta.value.name,
    })
  } catch (err) {
    if (err.name !== 'AbortError') { // user cancelled
      toast('Failed to share file', 'error')
    }
  }
}

</script>

<template>
  <main class="container">
    <h3>{{ $t('share') }}</h3>

    <Loading v-if="isLoading" />

    <div v-else>
      <FileMeta :data="fileMeta" <hr />
      <div class="button-group">
        <button class="submit" @click="downloadPdf">
          <Icon name="fa7-solid:download" />
          {{ $t('download') }}
        </button>

        <button class="submit" @click="sharePdf">
          <Icon name="fa7-solid:share-alt" />
          {{ $t('share') }}
        </button>
      </div>
    </div>

  </main>
</template>

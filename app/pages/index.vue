<script setup lang="ts">

const { saveFile, getAllMeta, deleteFile } = useFileStorage()
const router = useRouter()

const docs = ref([]);
const files = ref([]);
const compressed = ref();
const fileInput = ref(null)
const isDragOver = ref(false)
const isProcessing = ref(false)

function onDragOver() {
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(e) {
  isDragOver.value = false
  const file = e.dataTransfer.files[0]

  if (!file) {
    return;
  }

  if (file) {
    console.log("Dropped file:", file)
    handleFile(file)
  }
}


function openFileDialog() {
  fileInput.value?.click()
}

function onFileSelected(e) {
  const file = e.target.files[0]
  handleFile(file)
}

async function handleFile(file: File) {
  if (!file) return
  if (file.type !== 'application/pdf') {
    console.warn('Only PDF files are allowed')
    return
  }

  try {
    const meta = await saveFile(file)
    // Navigate straight to the editor — the file is ready
    router.push(`/editor/${meta.id}`)
  } catch (err) {
    console.error('Failed to save file', err)
    // show user-facing error toast
  }
}

function clearFiles() {
  if (!window.confirm('Are you sure?')) return
  files.value = [];
  compressed.value = null;
}

async function squishPdf() {
  isProcessing.value = true;
  compressed.value = null;
  const file = files.value[0];
  compressed.value = await compressPdf(file, {
    format: "image/jpeg", // much smaller than PNG
    quality: 0.7,
    scale: 1
  });

  isProcessing.value = false;

}

function downloadPdf() {
  // Download
  const name = files.value[0].name.replace('.pdf', '_compressed.pdf')
  const url = URL.createObjectURL(compressed.value);
  const a = document.createElement("a");
  a.href = url;
  // console.log(files[0].value.name)
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);

}

const handleDelete = async (file: DocumentMeta) => {
  if (!window.confirm(`Delete ${file.name}? Are you sure?`)) return;

  await deleteFile(file.id);

  docs.value = await getAllMeta();
}

onMounted(async () => {
  docs.value = await getAllMeta()
})

</script>

<template>
  <main class="container">
    <Header />

    <p>Need to perform quick operations on a PDF? We got you covered</p>

    <div v-if="!files.length" class="dropbox" :class="{ 'is-dragover': isDragOver }" @dragover.prevent="onDragOver"
      @dragleave="onDragLeave" @drop.prevent="onDrop" @click="openFileDialog">
      Drag PDF here or click to upload
    </div>
    <input ref="fileInput" type="file" class="hidden-input" accept="application/pdf" @change="onFileSelected" />
    <span v-for="file in files">
      <p>
        <button v-if="!compressed" :disabled="isProcessing" class="secondary" @click="clearFiles">cancel</button>
        {{ file.name }} {{ Math.floor(file.size / 1000) }}kb
        <button v-if="!compressed" :disabled="isProcessing" :aria-busy="isProcessing" @click="squishPdf">
          {{ isProcessing ? 'Squishing' : 'Squish' }}
        </button>
        <PdfVice v-if="isProcessing" />
        <span v-if="compressed">
          Compresed: {{ compressed.size / 1000 }}kb <br />
          Saving: {{ Math.ceil(100 - (compressed.size / file.size) * 100) }}%
          <button @click="downloadPdf">Download</button>
          <button @click="clearFiles">Clear</button>
        </span>
      </p>
    </span>

    <div class="docs-list card">
      <h3>Your Files</h3>
      <p v-for="doc in docs">
        <button class="secondary link" @click="handleDelete(doc)">Delete</button>
        <NuxtLink :to="`/editor/${doc.id}`">
          {{ doc.name }}
        </NuxtLink>
      </p>
    </div>

  </main>
</template>

<style scoped>
.dropbox {
  position: relative;
  margin: 2rem 0;
  border: 3px dashed rgba(0, 0, 0, 0.2);
  padding: 2rem 1rem;
  text-align: center;
  transition: all 0.2s;
  background: linear-gradient(rgba(255, 255, 255, .8), rgba(255, 255, 255, .9));
}

.dropbox::before {
  content: "";
  position: absolute;
  top: 10px;
  left: 10px;
  width: 70%;
  height: 70%;
  background-image: url('/pdf.svg');
  background-repeat: no-repeat;
  background-position: top left;
  background-size: contain;
  opacity: 0.2;
  pointer-events: none;
}

.dropbox:hover {
  cursor: pointer;
  background: #eef;
  border-color: darkgreen;
}

.dropbox.is-dragover {
  background: #eef;
  border-color: #55f;
}

button.secondary {
  /* background: #fff; */

}

.hidden-input {
  display: none;
}
</style>

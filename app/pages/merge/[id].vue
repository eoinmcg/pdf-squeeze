<script setup>
import VueDraggable from 'vuedraggable'
const { getAllMeta, mergePdfs } = useFileStorage()

const route = useRoute()
const ID = route.params.id

const docs = ref([])
const sourceDoc = ref([])
const loading = ref(true)
const selected = ref([])

const { getMeta } = useFileStorage()

onMounted(async () => {
  await loadMeta()
  docs.value = await getAllMeta()
  selected.value.push(ID)
  loading.value = false;
})

const loadMeta = async () => {
  sourceDoc.value = await getMeta(ID)
}

const filteredDocs = computed(() => {
  return docs.value.filter((doc) => doc.id !== ID)
})

const mergeSelected = async () => {
  const newId = crypto.randomUUID()
  const merged = await mergePdfs(selected.value[0], selected.value[1], newId)
  return navigateTo(`/editor/${merged.id}`)
}

const docNames = computed(() =>
  Object.fromEntries(docs.value.map(doc => [doc.id, doc.name]))
)


</script>

<template>
  <main class="container">
    <Header />

    <div v-if="loading">
      <Loading />
    </div>

    <div v-else class="docs-list card">
      <h3>Select files to merge with <strong>{{ sourceDoc.name }}</strong></h3>
      <div v-if="filteredDocs.length" v-for="doc in filteredDocs" :key="doc.id">
        <input :id="doc.id" type="checkbox" :value="doc.id"
          :disabled="selected.length >= 2 && !selected.includes(doc.id)" v-model="selected">
        <label :for="doc.id"> {{ doc.name }} </label>
      </div>
      <div v-else class="info">
        <p>
          You don't have files to merge with.
        </p>
        <p>
          <NuxtLink to="/">Upload</NuxtLink> some and come back.
        </p>
      </div>
      <div v-if="selected.length >= 2">
        Document order:
        <VueDraggable v-model="selected" :item-key="(s) => s" tag="ul" class="reorder" :animation="200"
          ghost-class="dragging-ghost" :force-fallback="true" :fallback-tolerance="5">
          <template #item="{ element }">
            <li>
              <Icon name="fa7-solid:reorder" />
              {{ docNames[element] }}
            </li>
          </template>
        </VueDraggable>
        <p>
          <small class="hint">
            <Icon name="fa7-solid:hand-point-right" />
            Drag items to change order
          </small>
        </p>
        <button @click="mergeSelected">Merge</button>
      </div>
    </div>

  </main>
</template>


<style>
.docs-list div {
  margin-bottom: 1rem;
}

label {
  color: #fff;
}

/* The placeholder "ghost" that shows where item will drop */
.dragging-ghost {
  opacity: 0.4;
  background: #c8ebfb;
}

/* The item while it's being dragged */
.dragging-item {
  opacity: 0.9;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Add a grab cursor and smooth transitions to list items */
.reorder li {
  cursor: grab;
  transition: box-shadow 0.2s ease;
}

.reorder li:active {
  cursor: grabbing;
}

.reorder {
  padding: 0;
}

.reorder li {
  list-style: none;
  padding: 1rem;
  margin: .75rem 0;
  border: 1px solid #fff;
  border-radius: 15px;
}
</style>

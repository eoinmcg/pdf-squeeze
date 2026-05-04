<script setup lang="ts">
const { getAllMeta, mergePdfs } = useFileStorage()

const docs = ref([]);
const loading = ref(true);
const selected = ref([]);

onMounted(async () => {
  loading.value = false;
  docs.value = await getAllMeta()
})

const mergeSelected = async () => {
  // mergePdfs(selected)
  const newId = crypto.randomUUID()
  const merged = await mergePdfs(selected.value[0], selected.value[1], newId);
  return navigateTo(`/editor/${merged.id}`);
}

</script>

<template>
  <main class="container">
    <Header />

    <div v-if="loading">
      <Loading />
    </div>

    <div v-else class="docs-list card">
      <h3>Select files to merge</h3>
      <div v-for="doc in docs" :key="doc.id">
        <input :id="doc.id" type="checkbox" :value="doc.id"
          :disabled="selected.length >= 2 && !selected.includes(doc.id)" v-model="selected">
        <label :for="doc.id"> {{ doc.name }} </label>
      </div>
      <button v-if="selected.length === 2" @click="mergeSelected">Merge</button>
    </div>
    <p>Selected: {{ selected }}</p>

  </main>
</template>


<style>
.docs-list div {
  margin-bottom: 1rem;
}

label {
  color: #fff;
}
</style>

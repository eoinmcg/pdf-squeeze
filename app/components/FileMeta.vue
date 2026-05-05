<script setup lang="ts">

const route = useRoute()
const ID = route.params.id as string

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
})

</script>

<template>
  <div class="file-meta">
    <NuxtLink :to="`/editor/${ID}`">
      <h3>{{ data.name }}</h3>
    </NuxtLink>
    <p>
      <b>Size:</b> {{ formatBytes(data.size) }} <br />
      <b>Added:</b> {{ formatDate(data.createdAt) }} <br />
      <b>Last opened:</b> {{ formatDate(data.lastOpenedAt) }} <br />
      <b>Pages: </b> {{ data.pageCount }} <br />
      <b>Annotations: </b> {{ data.annotationCount }} <br />
    </p>
  </div>
</template>

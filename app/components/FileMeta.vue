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
    <h3>
      <NuxtLink :to="`/editor/${ID}`">
        {{ data.name }}
      </NuxtLink>
    </h3>
    <p>
      <b>{{ $t('size') }}:</b> {{ formatBytes(data.size) }} <br />
      <b>{{ $t('added') }}:</b> {{ formatDate(data.createdAt) }} <br />
      <b>{{ $t('last_opened') }}:</b> {{ formatDate(data.lastOpenedAt) }} <br />
      <b>{{ $t('pages') }}: </b> {{ data.pageCount }} <br />
      <b>{{ $t('annotations') }}: </b> {{ data.annotationCount }} <br />
    </p>
  </div>
</template>

<style scoped>
h3 a {
  text-decoration: none;
}
</style>

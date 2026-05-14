<script setup lang="ts">

const { deleteFile } = useFileStorage()
const { toast } = useToast()

const props = defineProps({
  docs: Array
})

const emit = defineEmits(['deleteDoc'])

function handleDelete(doc: Partial<DocMeta>) {
  emit('deleteDoc', doc)
}

function goToDoc(id) {
  navigateTo(`/editor/${id}`)
}

</script>

<template>
  <div class="docs-list card" v-if="docs.length">
    <h3>{{ $t('your_files') }}</h3>
    <!-- <input type="search" name="search" placeholder="Search" aria-label="Search" /> -->
    <TransitionGroup name="list" tag="div" class="doc-container">

      <div v-for="doc in docs" class="doc" :key="doc.id">
        <div class="list-item-row">
          <!-- 1. Delete Button -->
          <div class="action-left">
            <UiDeleteButton @click="handleDelete(doc)" />
          </div>

          <div class="thumbnail" @click="goToDoc(doc.id)">
            <img :src="doc.thumbnail" width="120" />
          </div>

          <!-- 2. Main Content (The "Stretchy" part) -->
          <div class="content-main" @click="goToDoc(doc.id)" :key="doc.id">
            <h4>
              <NuxtLink :to="`/editor/${doc.id}`">
                {{ doc.name }}
              </NuxtLink>
            </h4>
            <small>
              {{ doc.pageCount }} {{ $t('pages') }} •
              {{ formatDate(doc.createdAt) }} •
              {{ formatBytes(doc.size, 0) }}
            </small>
          </div>

          <!-- 3. Extra Items Dropdown -->
          <div class="action-right">
            <details role="list">
              <summary aria-haspopup="listbox">
              </summary>
              <ul role="listbox">
                <li>
                  <NuxtLink :to="`/compress/${doc.id}`">
                    <Icon name="fa7-solid:compress-arrows-alt" />
                    {{ $t('compress') }}
                  </NuxtLink>
                </li>
                <li>
                  <NuxtLink :to="`/share/${doc.id}`">
                    <Icon name="fa7-solid:share-alt" />
                    {{ $t('share') }}
                  </NuxtLink>
                </li>
                <li>
                  <NuxtLink :to="`/share/${doc.id}`">
                    <Icon name="fa7-solid:download" />
                    {{ $t('download') }}
                  </NuxtLink>
                </li>
              </ul>
            </details>
          </div>
        </div>
      </div>

    </TransitionGroup>
  </div>
</template>

<style scoped>
.doc-container {
  position: relative;
  overflow: hidden;
}

.doc {
  transition: all .2s ease-in;
}

.doc .thumbnail,
.doc .content-main {
  cursor: pointer;
}


.doc p.info {
  opacity: .4;
  font-size: 90%;
  text-align: right;
  transition: all .3s ease-in-out;
}

.doc:hover p.info {
  opacity: .8;
}

.doc {
  border: .5px solid rgba(0, 0, 0, 0.1);
  background-color: rgba(255, 255, 255, 0.5);
  /* or your default color */
  overflow: hidden;
  /* Crucial for the collapse effect */
  margin-bottom: 8px;
}

.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

/* 2. The leaving transition (the specific animation for the deleted doc) */
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* 3. Ensure the leaving element is taken out of layout flow 
      so the others can slide up immediately */
.list-leave-active {
  position: absolute;
  width: 100%;
  /* Match the width of your container */
}

.list-item-row {
  display: flex;
  align-items: top;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.action-left {
  flex-shrink: 0;
  padding-left: 1rem;
  /* Don't let button squash */
}

.content-main {
  flex-grow: 1;
  /* Take up all available remaining space */
  display: flex;
  flex-direction: column;
  /* Stack Title and Meta */
  min-width: 0;
  /* Prevents text overflow from breaking flexbox */
}

.content-main strong,
.content-main small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 70%;
  opacity: .5;
  font-family: monospace;
}

.content-main h4 {
  margin: 0;
}

.content-main h4 a {
  font-size: 90%;
  color: darkgreen;
  text-decoration: none;
}

ul li {
  list-style: none;
}

ul {
  margin-right: 2rem;
}

li a {
  display: block;
  /* color: #fff; */
  font-size: 70%;
  border: 1px solid rgba(255, 255, 255, 0.5);
  width: 100%;
  padding: 5px;
  border-radius: 5px;
  text-decoration: none;
  ;
}

.action-right {
  flex-shrink: 0;
}

/* Pico Dropdown specific tweak: prevent margin bottom inside list */
.action-right details {
  margin-bottom: 0;
}
</style>

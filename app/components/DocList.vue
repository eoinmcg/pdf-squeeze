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

          <!-- 2. Main Content (The "Stretchy" part) -->
          <div class="content-main">
            <NuxtLink :to="`/editor/${doc.id}`">
              <Icon name="fa7-solid:pencil" />
              {{ doc.name }}
            </NuxtLink>
            <small>
              <Icon name="fa7-solid:calendar-alt" /> {{ formatDate(doc.createdAt) }} •
              {{ formatBytes(doc.size) }}
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
                  <NuxtLink :to="`/download/${doc.id}`">
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
  background-color: transparent;
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
  align-items: center;
  /* Vertical centering */
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.action-left {
  flex-shrink: 0;
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
}

ul li {
  list-style: none;
}

ul {
  margin-right: 2rem;
}

li a {
  display: block;
  color: #fff;
  font-size: 70%;
  border: 1px solid rgba(255, 255, 255, 0.5);
  width: 100%;
  padding: 5px;
  border-radius: 5px;
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

<script setup>
const props = defineProps({
  modelValue: Boolean, // Controls visibility
  isFullscreen: Boolean
});

const emit = defineEmits([
  'update:modelValue',
  'fullscreen',
  'sticky',
  'highlight',
  'delete',
  'navigate'
]);

const target = ref(null);

// Centralized close function
const close = () => {
  emit('update:modelValue', false);
};

// Handle Escape Key
const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.modelValue) {
    close();
  }
};

// Handle Click Outside
const handleClickOutside = (event) => {
  // If the menu is open AND the click target is NOT inside our 'target' div
  if (props.modelValue && target.value && !target.value.contains(event.target)) {
    close();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  // Using pointerdown is often more responsive than 'click'
  window.addEventListener('pointerdown', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('pointerdown', handleClickOutside);
});
</script>

<template>
  <div ref="target" class="slideout-menu" :class="{ active: modelValue }">
    <button class="close" @click="$emit('update:modelValue', false)">
      <Icon name="mdi:close-circle" />
    </button>

    <nav class="primary">
      <button @click="$emit('fullscreen')">
        <Icon :name="isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" />
        {{ $t('fullscreen') }}
      </button>

      <button @click="$emit('sticky')">
        <Icon name="mdi:sticker" />
        {{ $t('sticky_note') }}
      </button>

      <button @click="$emit('highlight')">
        <Icon name="mdi:signature-freehand" />
        {{ $t('signature') }}
      </button>

      <button @click="$emit('delete')">
        <Icon name="mdi:delete" />
        {{ $t('delete_page') }}
      </button>
    </nav>

    <nav>
      <button @click="$emit('navigate', 'merge')">
        {{ $t('merge') }}
      </button>
      <button @click="$emit('navigate', 'compress')">
        {{ $t('compress') }}
      </button>
      <button class="danger" @click="$emit('navigate', 'exit')">
        {{ $t('exit_to_menu') }}
      </button>
    </nav>
  </div>
</template>

<style scoped>
.slideout-menu {
  position: absolute;
  display: block;
  right: -200px;
  width: 0;
  top: 0;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  z-index: 1;
  transition: all .2s linear;
  touch-action: pointer-events;
}

.slideout-menu.active {
  width: 200px;
  right: 0;
}

.slideout-menu button.close {
  border: none;
  background: transparent;
  color: #fff;
  text-align: right;
  display: block;
  margin-left: auto;
  font-size: 150%;
  transition: all var(--transition-slow);
}

.slideout-menu button.close:hover {
  transform: rotate(180deg);
  color: crimson;
}

.slideout-menu button:hover {
  transform: translateY(0);
}

.slideout-menu nav {
  margin-top: 2rem;
  display: block;
  font-size: 120%;
}

.slideout-menu nav.primary button {
  font-size: 80%;
}


.slideout-menu nav button {
  font-size: 70%;
  display: block;
  width: 100%;
  text-align: left;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  background-color: transparent;
  font-weight: normal;
  padding: .5rem 1rem;
}

.slideout-menu nav button:hover {
  background-color: darkgreen;
  border-bottom: 1px solid #000;
  color: #fff;
}
</style>

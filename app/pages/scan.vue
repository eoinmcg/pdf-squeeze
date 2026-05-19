<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const video = ref(null)
const stream = ref(null)
const captured = ref(null)

onMounted(async () => {
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    })
    video.value.srcObject = stream.value
  } catch (err) {
    console.error('Camera error:', err)
  }
})

onBeforeUnmount(() => {
  if (stream.value) {
    stream.value.getTracks().forEach(t => t.stop())
  }
})

function capture() {
  const canvas = document.createElement('canvas')
  const v = video.value

  canvas.width = v.videoWidth
  canvas.height = v.videoHeight

  const ctx = canvas.getContext('2d')
  ctx.drawImage(v, 0, 0, canvas.width, canvas.height)

  captured.value = canvas.toDataURL('image/jpeg', 0.92)

  // Later: send this to your CV worker
}
</script>


<template>
  <div class="scanner">
    <video ref="video" autoplay playsinline class="preview"></video>

    <!-- Simple rectangular alignment frame -->
    <div class="frame-overlay"></div>

    <button class="capture-btn" @click="capture">Capture</button>

    <!-- Show captured image for debugging -->
    <img v-if="captured" :src="captured" class="preview-image" />
  </div>
</template>

<style scoped>
.scanner {
  position: relative;
  width: 100%;
  height: 100%;
  background: black;
}

.preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Simple rectangular frame */
.frame-overlay {
  position: absolute;
  top: 10%;
  left: 5%;
  width: 90%;
  height: 70%;
  border: 3px solid rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  pointer-events: none;
}

.capture-btn {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border-radius: 50%;
  width: 70px;
  height: 70px;
  border: none;
}

.preview-image {
  width: 100%;
  margin-top: 1rem;
}
</style>

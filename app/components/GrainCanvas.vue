<script setup lang="ts">

// ── seeded PRNG (mulberry32) — deterministic grain per load ──
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const canvasRef = ref(null)
let resizeObserver = null

const hsla = (h, s, l, a) => `hsla(${h},${s}%,${l}%,${a})`

function draw(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const rng = mulberry32(0xC0FFEE42)
  const r = (lo, hi) => rng() * (hi - lo) + lo

  const W = canvas.width
  const H = canvas.height
  const pixels = W * H

  // 1 — base cream fill
  ctx.fillStyle = '#f4ecda'
  ctx.fillRect(0, 0, W, H)

  // 2 — radial warm vignette
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, H * 0.9)
  vig.addColorStop(0, 'rgba(255,248,230,0)')
  vig.addColorStop(1, 'rgba(170,130,80,0.07)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, W, H)

  // 3 — large soft blobs — paper tonal unevenness
  for (let i = 0; i < 14; i++) {
    const x = r(0, W)
    const y = r(0, H)
    const rx = r(W * 0.06, W * 0.22)
    const ry = r(H * 0.06, H * 0.22)
    const alpha = r(0.008, 0.022)
    const light = r(0, 1) > 0.5
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(1, ry / rx)
    ctx.beginPath()
    ctx.arc(0, 0, rx, 0, Math.PI * 2)
    ctx.restore()
    ctx.fillStyle = light
      ? hsla(r(30, 46), r(30, 55), r(88, 97), alpha)
      : hsla(r(22, 38), r(25, 50), r(48, 68), alpha * 0.7)
    ctx.fill()
  }

  // 4 — medium dust specs — primary grain layer
  const dustCount = Math.floor(pixels * 0.0022)
  for (let i = 0; i < dustCount; i++) {
    ctx.beginPath()
    ctx.arc(r(0, W), r(0, H), r(0.3, 1.2), 0, Math.PI * 2)
    ctx.fillStyle = hsla(r(25, 45), r(15, 55), r(40, 90), r(0.04, 0.22))
    ctx.fill()
  }

  // 5 — dark micro-specs — depth and richness
  const darkCount = Math.floor(pixels * 0.0007)
  for (let i = 0; i < darkCount; i++) {
    ctx.beginPath()
    ctx.arc(r(0, W), r(0, H), r(0.2, 0.75), 0, Math.PI * 2)
    ctx.fillStyle = hsla(r(20, 36), r(30, 60), r(20, 48), r(0.03, 0.12))
    ctx.fill()
  }

  // 6 — bright fiber highlights — paper catching light
  const brightCount = Math.floor(pixels * 0.0004)
  for (let i = 0; i < brightCount; i++) {
    ctx.beginPath()
    ctx.arc(r(0, W), r(0, H), r(0.3, 0.9), 0, Math.PI * 2)
    ctx.fillStyle = hsla(r(38, 52), r(55, 80), r(90, 99), r(0.07, 0.28))
    ctx.fill()
  }

  // 7 — elongated fiber strokes — paper pulp texture
  const fiberCount = Math.floor(pixels * 0.00005)
  ctx.lineCap = 'round'
  for (let i = 0; i < fiberCount; i++) {
    const x = r(0, W)
    const y = r(0, H)
    const len = r(1.8, 7)
    const angle = r(0, Math.PI * 2)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
    ctx.strokeStyle = hsla(r(24, 44), 38, r(32, 68), r(0.025, 0.09))
    ctx.lineWidth = r(0.3, 0.85)
    ctx.stroke()
  }

  // 8 — pixel-level ImageData noise — finest grain, warm-biased
  const imgData = ctx.getImageData(0, 0, W, H)
  const d = imgData.data
  const str = 7
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * str
    d[i] = Math.min(255, Math.max(0, d[i] + n * 1.05))
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n * 0.92))
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n * 0.65))
  }
  ctx.putImageData(imgData, 0, 0)
}

function init() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = canvas.offsetWidth
  canvas.height = canvas.offsetHeight
  draw(canvas)
}

onMounted(() => {
  init()
  resizeObserver = new ResizeObserver(init)
  resizeObserver.observe(canvasRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <canvas ref="canvasRef" class="grain-canvas" />
</template>

<style scoped>
.grain-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>

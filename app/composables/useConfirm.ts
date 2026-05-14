import { ref } from 'vue'

const isVisible = ref(false)
const dialogRef = ref<HTMLDialogElement | null>(null) // Add this
const options = ref({ title: '', message: '', confirmText: 'Confirm', cancelText: 'Cancel' })
let resolvePromise: (value: boolean) => void

export const useConfirm = () => {
  const ask = (config: any) => {
    options.value = { ...options.value, ...config }
    isVisible.value = true

    // Crucial: Use the native method if the ref exists
    if (dialogRef.value) {
      dialogRef.value.showModal()
    }

    return new Promise<boolean>((res) => { resolvePromise = res })
  }

  const handleAction = (value: boolean) => {
    isVisible.value = false
    dialogRef.value?.close()
    resolvePromise(value)
  }

  return { isVisible, options, ask, confirm: () => handleAction(true), cancel: () => handleAction(false), dialogRef }
}

// stores/documents.ts
interface DocMeta {
  id: string
  name: string
  size: number
  contentHash: string
  pageCount: number
  annotationCount: number
  lastOpenedAt: number
  createdAt: number
}

export const useDocumentStore = defineStore('documents', {
  state: () => ({
    docs: [] as DocMeta[]
  }),
  // pinia-plugin-persistedstate handles IndexedDB persistence
})

import { openDB, type DBSchema } from 'idb'

interface DocMeta {
  id: string
  name: string
  size: number
  contentHash: string
  createdAt: number
  lastOpenedAt: number
  annotationCount: number
  pageCount: number | null
  thumbnail: string | null
}

interface PdfEditorDB extends DBSchema {
  documents: {
    key: string
    value: DocMeta
    indexes: { contentHash: string }
  }
}

const DB_NAME = 'pdf-editor'
const DB_VERSION = 5

export const getDb = () =>
  openDB<PdfEditorDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('documents')) {
        const store = db.createObjectStore('documents', { keyPath: 'id' })
        store.createIndex('contentHash', 'contentHash', { unique: false })
      }
    }
  })

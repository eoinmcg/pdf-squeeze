import { openDB, type DBSchema } from 'idb'

interface Page {
  id: string
  thumbnail: string | null   // OPFS path, generated lazily
  annotations: Annotation[]
}

interface Annotation {
  id: string
  pageId: string             // stable UUID, not a page number
  x: number
  y: number
  type: 'sticky' | 'image'
  content: string
  createdAt: number
}

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
  pages: Page[]
}

interface PdfEditorDB extends DBSchema {
  documents: {
    key: string
    value: DocMeta
    indexes: { contentHash: string }
  }
}

const DB_NAME = 'pdf-editor'
const DB_VERSION = 6

export const getDb = () =>
  openDB<PdfEditorDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        const store = db.createObjectStore('documents', { keyPath: 'id' })
        store.createIndex('contentHash', 'contentHash', { unique: false })
      }
      if (oldVersion >= 1 && oldVersion < 6) {
        const store = tx.objectStore('documents')
        store.openCursor().then(function migrate(cursor) {
          if (!cursor) return
          cursor.update({
            ...cursor.value,
            pages: Array.from(
              { length: cursor.value.pageCount ?? 0 },
              () => ({
                id: crypto.randomUUID(),
                thumbnail: null,
                annotations: []
              })
            )
          })
          cursor.continue().then(migrate)
        })
      }
    }
  })

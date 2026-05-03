// composables/useFileStorage.ts
import { openDB } from 'idb' // npm i idb — thin IndexedDB wrapper
import { PDFDocument } from 'pdf-lib'

const DB_NAME = 'pdf-editor'
const DB_VERSION = 1

const getDb = () => openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    db.createObjectStore('documents', { keyPath: 'id' })
  }
})

export const useFileStorage = () => {

  const saveFile = async (file: File) => {
    const id = crypto.randomUUID()

    // 1. Write bytes to OPFS
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('documents', { create: true })
    const fh = await dir.getFileHandle(`${id}.pdf`, { create: true })
    const writable = await fh.createWritable()
    await writable.write(file)
    await writable.close()

    // 2. Write metadata to IndexedDB
    const meta = {
      id,
      name: file.name,
      size: file.size,
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
      annotationCount: 0,
      pageCount: null, // fill this in after PDF.js loads the doc
    }
    const db = await getDb()
    await db.put('documents', meta)

    return meta
  }

  const loadFile = async (id: string) => {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('documents')
    const fh = await dir.getFileHandle(`${id}.pdf`)
    return fh.getFile() // returns a File object, ready for PDF.js
  }


  const getMeta = async (id: string) => {
    const db = await getDb()
    const existing = await db.get('documents', id);
    console.log({ id, existing })
    return existing;

  }

  const updateMeta = async (id: string, patch: Partial<DocMeta>) => {
    const db = await getDb()
    const existing = await db.get('documents', id)
    if (existing) await db.put('documents', { ...existing, ...patch })
  }

  const getAllMeta = async () => {
    const db = await getDb()
    return db.getAll('documents') as Promise<DocMeta[]>
  }

  const deleteFile = async (id: string) => {
    const [root, db] = await Promise.all([
      navigator.storage.getDirectory(),
      getDb()
    ])

    const dir = await root.getDirectoryHandle('documents')

    // Use Promise.allSettled or a try/catch to prevent 
    // a missing file from crashing the whole UI
    try {
      await dir.removeEntry(`${id}.pdf`)
    } catch (e) {
      console.warn(`File ${id}.pdf not found in OPFS, skipping file deletion.`)
    }

    await db.delete('documents', id)
  }

  const deletePage = async (id: string, pageIndex: number) => {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('documents')

    // 1. Get the file from OPFS
    const fileHandle = await dir.getFileHandle(`${id}.pdf`)
    const file = await fileHandle.getFile()
    const arrayBuffer = await file.arrayBuffer()

    // 2. Load and Modify
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    pdfDoc.removePage(pageIndex) // 0-based index

    // 3. Serialize to bytes
    const pdfBytes = await pdfDoc.save()

    // 4. Write back to OPFS (Overwriting)
    const writable = await fileHandle.createWritable()
    await writable.write(pdfBytes)
    await writable.close()

    console.log(`Page ${pageIndex + 1} deleted successfully.`)
  }

  return { saveFile, loadFile, getAllMeta, getMeta, updateMeta, deleteFile, deletePage }
}

import { PDFDocument } from 'pdf-lib'
import { openDB } from 'idb' // npm i idb — thin IndexedDB wrapper

// fallback for dev - cryptp.subtle
// not available when testing over dev network
import { sha256 } from 'js-sha256';

const DB_NAME = 'pdf-editor'
const DB_VERSION = 2

const getDb = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore('documents', { keyPath: 'id' })
      store.createIndex('contentHash', 'contentHash', { unique: false })
    }
  })

export const useFileStorage = () => {

  const saveFile = async (file: File) => {

    const db = await getDb()
    const arrayBuffer = await file.arrayBuffer()
    const contentHash = await hashBytes(arrayBuffer)

    const tx = db.transaction('documents', 'readonly')
    const store = tx.objectStore('documents')
    const index = store.index('contentHash')

    const existing = await index.get(contentHash)
    if (existing) {
      console.log("Duplicate upload skipped")
      existing.exists = true;
      return existing
    } else {
      console.log('HASH DOES NOT EXIST', contentHash)
    }

    const id = generateId()

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
      name: file.name.replace('.pdf', ''),
      size: file.size,
      contentHash,
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
      annotationCount: 0,
      pageCount: null, // fill this in after PDF.js loads the doc
    }
    await db.put('documents', meta)

    return meta
  }

  const loadFile = async (id: string) => {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('documents')
    const fh = await dir.getFileHandle(`${id}.pdf`)
    return fh.getFile() // returns a File object, ready for PDF.js
  }

  async function hashBytes(bytes) {
    // const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    // return [...new Uint8Array(hashBuffer)]
    //   .map(b => b.toString(16).padStart(2, "0"))
    //   .join("");

    if (window.isSecureContext && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback for insecure contexts
      return sha256(bytes);
    }

  }


  const getMeta = async (id: string) => {
    const db = await getDb()
    const existing = await db.get('documents', id);
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

    // 5. update meta
    const contentHash = hashBytes(pdfBytes);
    updateMeta(id, {
      contentHash
    });
  }

  const mergePdfs = async (id1: string, id2: string, name: string) => {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('documents')

    const db = await getDb()
    const [meta1, meta2] = await Promise.all([
      db.get('documents', id1),
      db.get('documents', id2),
    ])
    const baseName = (name: string) => name.replace(/\.pdf$/i, '')
    const mergedName = `${baseName(meta1.name)} + ${baseName(meta2.name)}.pdf`

    const load = async (id: string) => {
      const fh = await dir.getFileHandle(`${id}.pdf`)
      return (await fh.getFile()).arrayBuffer()
    }

    const [buf1, buf2] = await Promise.all([load(id1), load(id2)])

    const baseDoc = await PDFDocument.load(buf1)
    const donor = await PDFDocument.load(buf2)

    const pageIndices = donor.getPageIndices() // [0, 1, 2, ...]
    const copiedPages = await baseDoc.copyPages(donor, pageIndices)
    copiedPages.forEach(page => baseDoc.addPage(page))

    const mergedBytes = await baseDoc.save()

    // Wrap in a File so saveFile handles all the OPFS + IndexedDB bookkeeping
    const mergedFile = new File(
      [mergedBytes],
      mergedName,
      { type: 'application/pdf' }
    )

    return saveFile(mergedFile)  // returns the new meta
  }

  return { saveFile, loadFile, getAllMeta, getMeta, updateMeta, deleteFile, deletePage, mergePdfs }
}

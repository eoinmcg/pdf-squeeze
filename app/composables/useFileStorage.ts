import { PDFDocument, PDFString, rgb } from 'pdf-lib'
import { getDb } from '../lib/db'

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

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const pageCount = pdf.numPages
    const thumbnail = await generateThumbnail(pdf)
    console.log(thumbnail);

    // 2. Write metadata to IndexedDB
    const meta = {
      id,
      name: file.name.replace('.pdf', ''),
      size: file.size,
      contentHash,
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
      annotationCount: 0,
      pageCount: pageCount,
      thumbnail,
    }
    await db.put('documents', meta)

    return meta
  }


  const testAnnotation = async (docId: string) => {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('documents')
    const fh = await dir.getFileHandle(`${docId}.pdf`)
    const file = await fh.getFile()
    const bytes = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(bytes)
    const page = pdfDoc.getPage(0)
    const { height } = page.getSize()
    const annot = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Text',
      Rect: [50, height - 100, 80, height - 70],
      Contents: PDFString.of('Hello from pdf-lib!'),
      Open: true,
      Name: 'Note',
      C: [1, 0.8, 0],
    })

    const ref = pdfDoc.context.register(annot)
    const pageRef = page.node
    const existing = pageRef.get(pageRef.context.obj('Annots'))
    if (existing) {
      existing.push(ref)
    } else {
      pageRef.set(pageRef.context.obj('Annots'), pdfDoc.context.obj([ref]))
    }

    const saved = await pdfDoc.save()
    const writable = await fh.createWritable()
    await writable.write(saved)
    await writable.close()

    return
  }

  const generateThumbnail = async (pdf, pageNum = 1, thumbWidth = 160): Promise<string> => {
    const page = await pdf.getPage(pageNum)

    const viewport = page.getViewport({ scale: 1 })
    const scale = thumbWidth / viewport.width
    const scaledViewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = scaledViewport.width
    canvas.height = scaledViewport.height  // natural page height, no forced crop

    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise

    return canvas.toDataURL('image/webp', 0.8)
  }

  const loadFile = async (id: string) => {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('documents')
    const fh = await dir.getFileHandle(`${id}.pdf`)
    return fh.getFile() // returns a File object, ready for PDF.js
  }

  async function hashBytes(bytes) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hashBuffer)]
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

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
    const files = await db.getAll('documents') as Promise<DocMeta[]>
    return files.reverse()
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

  /**
   * Reorders the pages of an existing PDF document in OPFS.
   * @param id The document ID
   * @param pageIndices Array of original 0-based indices in their new sequence (e.g., [2, 0, 1])
   */
  const reorderPages = async (id: string, pageIndices: number[]) => {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('documents')

    // 1. Get the file from OPFS
    const fileHandle = await dir.getFileHandle(`${id}.pdf`)
    const file = await fileHandle.getFile()
    const arrayBuffer = await file.arrayBuffer()

    // 2. Load the source PDF and establish a clean target PDF
    const sourcePdfDoc = await PDFDocument.load(arrayBuffer)
    const targetPdfDoc = await PDFDocument.create()

    // 3. Copy pages over in the new sequence ordered by the user
    // copyPages handles page mapping without degrading PDF elements or text content
    const copiedPages = await targetPdfDoc.copyPages(sourcePdfDoc, pageIndices)

    // 4. Inject the copied pages sequentially into your new document
    copiedPages.forEach((page) => {
      targetPdfDoc.addPage(page)
    })

    // 5. Serialize to bytes
    const pdfBytes = await targetPdfDoc.save()

    // 6. Write back to OPFS (Overwriting original file)
    const writable = await fileHandle.createWritable()
    await writable.write(pdfBytes)
    await writable.close()

    // 7. Update meta hash
    const contentHash = hashBytes(pdfBytes)
    updateMeta(id, {
      contentHash
    })
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

  return { saveFile, loadFile, getAllMeta, getMeta, updateMeta, deleteFile, deletePage, mergePdfs, testAnnotation, generateThumbnail, reorderPages }
}

import { PDFDocument, PDFString, PDFName, PDFArray, PDFNumber, PDFRef, PDFDict } from 'pdf-lib'

export const useAnnotations = (docId: string) => {
  const docAnnotations = ref<Record<number, any[]>>({})
  const loadedPages = ref<Record<number, boolean>>({})
  const isDirty = ref(false)

  const loadForPage = async (pdfJsPage, pageIndex: number) => {
    console.log(`--- DBG: LOADING PAGE INDEX ${pageIndex} ---`)

    // If memory guard triggers, log it
    if (loadedPages.value[pageIndex]) {
      console.log(`Loaded from active memory cache:`, docAnnotations.value[pageIndex])
      return docAnnotations.value[pageIndex] || []
    }

    // Fetch directly via PDF.js reader engine
    const raw = await pdfJsPage.getAnnotations()
    console.log(`PDF.js extracted ${raw.length} total raw annotations from disk for this page.`, raw)

    const parsed = raw
      .filter(a => a.subtype === 'FreeText' || a.subtype === 'Text')
      .map(a => ({
        id: a.id,
        rect: a.rect,
        text: a.contents ?? a.contentsObj?.str ?? '',
      }))

    console.log('Parsed target FreeText/Text items:', parsed)

    docAnnotations.value = {
      ...docAnnotations.value,
      [pageIndex]: parsed
    }

    loadedPages.value[pageIndex] = true
    return parsed
  }
  const addAnnotation = (pageIndex: number, rect, text = '') => {
    if (!docAnnotations.value[pageIndex]) docAnnotations.value[pageIndex] = []
    docAnnotations.value[pageIndex].push({ id: crypto.randomUUID(), rect, text, isNew: true })
    isDirty.value = true
  }

  const updateAnnotation = (pageIndex: number, updated) => {
    if (!docAnnotations.value[pageIndex]) return
    const idx = docAnnotations.value[pageIndex].findIndex(a => a.id === updated.id)
    if (idx !== -1) {
      docAnnotations.value[pageIndex][idx] = updated
      isDirty.value = true
    }
  }

  const deleteAnnotation = (pageIndex: number, id: string) => {
    if (!docAnnotations.value[pageIndex]) return
    docAnnotations.value[pageIndex] = docAnnotations.value[pageIndex].filter(a => a.id !== id)
    isDirty.value = true
  }

  const save = async (pageIndex: number) => {
    const annotationsForPage = docAnnotations.value[pageIndex]
      || docAnnotations.value[String(pageIndex)]
      || []

    console.log('--- EXECUTING MODULAR ONE-WAY EXPORT PASS ---')

    // File Retrieval Pipeline
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('documents')
    const fh = await dir.getFileHandle(`${docId}.pdf`)
    const file = await fh.getFile()
    const bytes = await file.arrayBuffer()

    const pdfDoc = await PDFDocument.load(bytes)
    const page = pdfDoc.getPage(pageIndex)
    const context = pdfDoc.context

    // Ensure global Helvetica font dictionary entry exists
    const resources = (context.lookup(page.node.get(PDFName.of('Resources'))) || PDFDict.withContext(context)) as PDFDict
    let fontDict = (resources.get(PDFName.of('Font')) ? context.lookup(resources.get(PDFName.of('Font'))) : PDFDict.withContext(context)) as PDFDict

    if (!fontDict.get(PDFName.of('Helvetica'))) {
      const helv = PDFDict.withContext(context)
      helv.set(PDFName.of('Type'), PDFName.of('Font'))
      helv.set(PDFName.of('Subtype'), PDFName.of('Type1'))
      helv.set(PDFName.of('BaseFont'), PDFName.of('Helvetica'))
      fontDict.set(PDFName.of('Helvetica'), context.register(helv))
      resources.set(PDFName.of('Font'), fontDict)
    }

    // Purge prior /FreeText elements to prevent export stacking duplicates
    const preservedRefs: PDFRef[] = []
    const annotsVal = page.node.get(PDFName.of('Annots'))
    if (annotsVal) {
      const annotsArray = context.lookup(annotsVal)
      if (annotsArray instanceof PDFArray) {
        for (let i = 0; i < annotsArray.size(); i++) {
          const entry = annotsArray.get(i)
          if (entry instanceof PDFRef && (context.lookup(entry) as PDFDict).get(PDFName.of('Subtype'))?.toString() !== '/FreeText') {
            preservedRefs.push(entry)
          }
        }
      }
    }

    // Compile active layout elements using the isolated transformers
    const newRefs = annotationsForPage.map(a => {
      const dict = PDFDict.withContext(context)
      dict.set(PDFName.of('Type'), PDFName.of('Annot'))
      dict.set(PDFName.of('Subtype'), PDFName.of('FreeText'))
      if (a.id) dict.set(PDFName.of('NM'), PDFString.of(String(a.id)))

      // Helper 1: Coordinate transformation pass
      const geo = transformCoordinates(a, page)

      dict.set(PDFName.of('Rect'), context.obj([geo.scaledX1, geo.y1, geo.scaledX2, geo.y2]))
      dict.set(PDFName.of('Contents'), PDFString.of(a.text ?? ''))
      dict.set(PDFName.of('DA'), PDFString.of('/Helvetica 10 Tf 0 0 0 rg'))
      dict.set(PDFName.of('F'), PDFNumber.of(4))
      dict.set(PDFName.of('C'), context.obj([1, 0.98, 0.76]))
      dict.set(PDFName.of('Border'), context.obj([0, 0, 0]))

      // Helper 2: Generate visual stream block mapping
      const apStreamRef = createAppearanceStream(context, a.text ?? '', geo.scaledWidth, geo.scaledHeight, fontDict)
      const apDict = PDFDict.withContext(context)
      apDict.set(PDFName.of('N'), apStreamRef)
      dict.set(PDFName.of('AP'), apDict)

      return context.register(dict)
    })

    // Flush data to physical system file handle stream
    const finalAnnotsArray = PDFArray.withContext(context)
      ;[...preservedRefs, ...newRefs].forEach(ref => finalAnnotsArray.push(ref))
    page.node.set(PDFName.of('Annots'), context.register(finalAnnotsArray))

    const saved = await pdfDoc.save({ useObjectStreams: false })
    const writable = await fh.createWritable({ keepExistingData: false })
    await writable.write(saved)
    await writable.close()

    isDirty.value = false
    console.log('--- CLEAN OVERWRITE SUCCESSFUL ---')
  }

  return { docAnnotations, isDirty, loadForPage, addAnnotation, updateAnnotation, deleteAnnotation, save }

}

import { PDFDocument, PDFString, PDFName, PDFArray, PDFNumber, PDFRef, PDFDict } from 'pdf-lib'


export const useAnnotations = (docId: string) => {
  const annotations = ref([])

  const loadForPage = async (pdfJsPage, pageHeight: number, scale: number) => {
    const raw = await pdfJsPage.getAnnotations()
    console.log('raw annotation fields:', raw.map(a => ({
      subtype: a.subtype,
      contents: a.contents,
      textContent: a.textContent,
      contentsObj: a.contentsObj,
    })))
    annotations.value = raw
      .filter(a => a.subtype === 'FreeText' || a.subtype === 'Text')
      .map(a => ({
        id: a.id,
        rect: a.rect,
        // PDF.js puts the text in `contents`, not `textContent`
        // `textContent` is for highlight/underline markup annotations
        text: a.contents ?? a.contentsObj?.str ?? '',
      }))
  }

  const updateAnnotation = (updated) => {
    const idx = annotations.value.findIndex(a => a.id === updated.id)
    if (idx !== -1) annotations.value[idx] = updated
  }

  const addAnnotation = (rect, text = '') => {
    annotations.value.push({ id: crypto.randomUUID(), rect, text, isNew: true })
  }

  const deleteAnnotation = (id: string) => {
    annotations.value = annotations.value.filter(a => a.id !== id)
  }

  const save = async (pageIndex: number) => {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('documents')
    const fh = await dir.getFileHandle(`${docId}.pdf`)
    const file = await fh.getFile()
    const bytes = await file.arrayBuffer()

    const pdfDoc = await PDFDocument.load(bytes)
    const page = pdfDoc.getPage(pageIndex)
    const context = pdfDoc.context

    // --- Ensure Helvetica is registered in page resources FIRST ---
    // Resources may be an indirect ref, so look it up explicitly
    const resourcesRef = page.node.get(PDFName.of('Resources'))
    const resources = resourcesRef instanceof PDFRef
      ? context.lookup(resourcesRef) as PDFDict
      : resourcesRef as PDFDict

    let fontDict = resources?.get(PDFName.of('Font'))
    if (fontDict instanceof PDFRef) fontDict = context.lookup(fontDict) as PDFDict

    if (!fontDict) {
      fontDict = PDFDict.withContext(context)
      resources.set(PDFName.of('Font'), fontDict)
    }

    if (!fontDict.get(PDFName.of('Helv'))) {
      const helveticaFont = PDFDict.withContext(context)
      helveticaFont.set(PDFName.of('Type'), PDFName.of('Font'))
      helveticaFont.set(PDFName.of('Subtype'), PDFName.of('Type1'))
      helveticaFont.set(PDFName.of('BaseFont'), PDFName.of('Helvetica'))
      fontDict.set(PDFName.of('Helv'), context.register(helveticaFont))
    }

    // --- Preserve non-FreeText annotations ---
    const annotsVal = page.node.get(PDFName.of('Annots'))
    const annotsArray = annotsVal instanceof PDFRef
      ? context.lookup(annotsVal) as PDFArray
      : annotsVal as PDFArray

    const nonFreeTextRefs: PDFRef[] = []
    if (annotsArray instanceof PDFArray) {
      for (let i = 0; i < annotsArray.size(); i++) {
        const entry = annotsArray.get(i)
        if (!(entry instanceof PDFRef)) continue
        const obj = context.lookup(entry) as PDFDict
        const subtype = obj?.get?.(PDFName.of('Subtype'))
        if (subtype?.toString() !== '/FreeText') {
          nonFreeTextRefs.push(entry)
        }
      }
    }

    // --- Build new FreeText dicts, DA now correctly set here ---
    const newRefs = annotations.value.map(a => {
      const dict = PDFDict.withContext(context)
      dict.set(PDFName.of('Type'), PDFName.of('Annot'))
      dict.set(PDFName.of('Subtype'), PDFName.of('FreeText'))
      dict.set(PDFName.of('Rect'), context.obj(a.rect.map(Number)))
      dict.set(PDFName.of('Contents'), PDFString.of(a.text ?? ''))
      dict.set(PDFName.of('DA'), PDFString.of('/Helv 12 Tf 0 0 0 rg')) // ✓ scoped here
      dict.set(PDFName.of('F'), PDFNumber.of(4))
      dict.set(PDFName.of('Border'), context.obj([0, 0, 0]))
      dict.set(PDFName.of('C'), context.obj([1, 0.98, 0.76]))
      return context.register(dict)
    })

    // --- Write Annots ---
    const newAnnotsArray = PDFArray.withContext(context)
    for (const ref of [...nonFreeTextRefs, ...newRefs]) {
      newAnnotsArray.push(ref)
    }
    page.node.set(PDFName.of('Annots'), newAnnotsArray)

    const saved = await pdfDoc.save()
    const writable = await fh.createWritable()
    await writable.write(saved)
    await writable.close()
  }

  return { annotations, loadForPage, addAnnotation, updateAnnotation, deleteAnnotation, save }
}




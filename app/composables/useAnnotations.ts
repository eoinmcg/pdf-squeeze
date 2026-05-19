import { getDb } from '../lib/db'

export const useAnnotations = (docId: string) => {
  const annotations = ref<Annotation[]>([])

  const loadForPage = async (pageId: string) => {
    const db = await getDb()
    const doc = await db.get('documents', docId)
    const page = doc?.pages.find(p => p.id === pageId)
    annotations.value = page?.annotations ?? []
  }

  const persistForPage = async (pageId: string) => {
    const db = await getDb()
    const doc = await db.get('documents', docId)
    if (!doc) return

    const pageIndex = doc.pages.findIndex(p => p.id === pageId)
    if (pageIndex === -1) return

    const cleanAnnotations = JSON.parse(JSON.stringify(toRaw(annotations.value)))
    doc.pages[pageIndex].annotations = cleanAnnotations

    const cleanDoc = JSON.parse(JSON.stringify(doc))
    await db.put('documents', cleanDoc)
  }

  const addAnnotation = async (pageId: string, annotation: Omit<Annotation, 'id' | 'createdAt'>) => {
    annotations.value.push({
      ...annotation,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    })
    await persistForPage(pageId)
  }

  const updateAnnotation = async (pageId: string, updated: Annotation) => {
    const raw = toRaw(updated)
    const idx = annotations.value.findIndex(a => toRaw(a).id === raw.id)
    if (idx !== -1) annotations.value[idx] = raw
    await persistForPage(pageId)
  }

  const deleteAnnotation = async (pageId: string, id: string) => {
    console.log(pageId, id)
    annotations.value = annotations.value.filter(a => a.id !== id)
    await persistForPage(pageId)
  }

  return { annotations, loadForPage, addAnnotation, updateAnnotation, deleteAnnotation }
}

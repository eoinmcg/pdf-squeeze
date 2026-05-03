export const requestPersistence = async () => {
  if (!navigator.storage?.persist) {
    console.log('Storage persistence not supported')
    return
  }

  const granted = await navigator.storage.persist()
  console.log(granted ? 'Persistence granted' : 'Persistence not granted')
}

export const useDebug = () => {
  const route = useRoute()

  // Internal state to allow manual toggling
  const manualDebug = useState('manualDebug', () => false)

  // Combined logic: Active if ?debug is in URL OR manually toggled
  const isDebug = computed(() => 'debug' in route.query || manualDebug.value)

  const toggleDebug = () => {
    manualDebug.value = !manualDebug.value
  }

  return { isDebug, toggleDebug }
}

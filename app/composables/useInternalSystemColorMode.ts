const STORAGE_KEY = 'color-mode'

type ColorMode = 'light' | 'dark'

const colorMode = ref<ColorMode>('light')
let initialized = false

function applyClass(mode: ColorMode) {
  if (!import.meta.client) return
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

export function useInternalSystemColorMode() {
  if (!initialized && import.meta.client) {
    initialized = true
    const saved = localStorage.getItem(STORAGE_KEY) as ColorMode | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    colorMode.value = saved ?? (prefersDark ? 'dark' : 'light')
    applyClass(colorMode.value)
  }

  function setColorMode(mode: ColorMode) {
    colorMode.value = mode
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, mode)
      applyClass(mode)
    }
  }

  function toggleColorMode() {
    setColorMode(colorMode.value === 'dark' ? 'light' : 'dark')
  }

  return { colorMode, setColorMode, toggleColorMode }
}
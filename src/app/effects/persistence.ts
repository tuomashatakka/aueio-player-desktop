/**
 * Two independent persistence lines: the `ui` slice's own concerns (density,
 * grouping, sort, columns, sidebar) round-trip through `services.storage`
 * under `aueio-ui`; `settings/changed` is folded back to the main process via
 * `gateway.saveSettings`, debounced. See AGENTS.md L6 and "Track Table
 * Columns" on why columns are reconciled against `DEFAULT_COLUMNS` on load.
 */
import { reconcileColumns } from '../state/ui/columns'
import type { UiState } from '../state/ui/state'
import type { Effect, Services } from './services'
import { tapDispatch } from './tapDispatch'


const UI_STORAGE_KEY            = 'aueio-ui'
const SETTINGS_SAVE_DEBOUNCE_MS = 300

interface PersistedUi {
  density?:     UiState['density']
  grouping?:    UiState['grouping']
  sort?:        UiState['sort']
  columns?:     UiState['columns']
  sidebarOpen?: UiState['sidebarOpen']
}

function readUi (services: Services): PersistedUi | null {
  try {
    const raw = services.storage.getItem(UI_STORAGE_KEY)
    if (!raw)
      return null

    const parsed = JSON.parse(raw) as PersistedUi
    return typeof parsed === 'object' && parsed !== null ? parsed : null
  }
  catch {
    return null
  }
}

function buildHydratedPatch (saved: PersistedUi): PersistedUi {
  const patch: PersistedUi = {}

  if (saved.density !== undefined)
    patch.density = saved.density
  if (saved.grouping !== undefined)
    patch.grouping = saved.grouping
  if (saved.sort !== undefined)
    patch.sort = saved.sort
  if (saved.sidebarOpen !== undefined)
    patch.sidebarOpen = saved.sidebarOpen
  if (Array.isArray(saved.columns))
    patch.columns = reconcileColumns(saved.columns)

  return patch
}

export const persistence: Effect = (stores, services) => {
  const saved = readUi(services)
  if (saved)
    stores.ui.dispatch({ type: 'ui/hydrated', patch: buildHydratedPatch(saved) })

  const unsubscribeUi = stores.ui.subscribe(() => {
    const { density, grouping, sort, columns, sidebarOpen } = stores.ui.getState()

    try {
      services.storage.setItem(UI_STORAGE_KEY, JSON.stringify({ density, grouping, sort, columns, sidebarOpen }))
    }
    catch {
      // A read-only or full storage backend must not disable the UI.
    }
  })

  let saveTimer: ReturnType<typeof setTimeout> | null = null

  const untapSettings = tapDispatch(stores.settings, action => {
    if (action.type !== 'settings/changed')
      return

    if (saveTimer)
      clearTimeout(saveTimer)

    saveTimer = setTimeout(() => {
      saveTimer = null
      void services.gateway.saveSettings(stores.settings.getState().settings.toJSON())
    }, SETTINGS_SAVE_DEBOUNCE_MS)
  })

  return (): void => {
    unsubscribeUi()
    untapSettings()
    if (saveTimer)
      clearTimeout(saveTimer)
  }
}

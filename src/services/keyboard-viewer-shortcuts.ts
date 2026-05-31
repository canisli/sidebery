export const KEYBOARD_VIEWER_SHORTCUT_ACTIONS = [
  'select_prev',
  'select_next',
  'select_panel',
  'select_panel_tabs',
  'confirm',
  'cancel',
  'remove_tab',
] as const

export type KeyboardViewerShortcutAction = (typeof KEYBOARD_VIEWER_SHORTCUT_ACTIONS)[number]

export type KeyboardViewerShortcuts = Record<KeyboardViewerShortcutAction, string[]>

export const DEFAULT_KEYBOARD_VIEWER_SHORTCUTS: KeyboardViewerShortcuts = {
  select_prev: ['ArrowUp'],
  select_next: ['ArrowDown'],
  select_panel: ['ArrowLeft'],
  select_panel_tabs: ['ArrowRight'],
  confirm: ['Enter'],
  cancel: ['Escape'],
  remove_tab: ['Backspace'],
}

export const DEFAULT_KEYBOARD_VIEWER_SHORTCUTS_CONF = JSON.stringify(
  DEFAULT_KEYBOARD_VIEWER_SHORTCUTS
)

export function parseKeyboardViewerShortcuts(raw: string | undefined): KeyboardViewerShortcuts {
  const shortcuts = cloneDefaultKeyboardViewerShortcuts()
  if (!raw) return shortcuts

  let parsed: Partial<Record<KeyboardViewerShortcutAction, unknown>>
  try {
    parsed = JSON.parse(raw) as Partial<Record<KeyboardViewerShortcutAction, unknown>>
  } catch {
    return shortcuts
  }

  for (const action of KEYBOARD_VIEWER_SHORTCUT_ACTIONS) {
    const actionShortcuts = parsed[action]
    if (!Array.isArray(actionShortcuts)) continue

    shortcuts[action] = normalizeKeyboardViewerShortcuts(actionShortcuts)
  }

  return shortcuts
}

export function stringifyKeyboardViewerShortcuts(shortcuts: KeyboardViewerShortcuts): string {
  const normalized = cloneDefaultKeyboardViewerShortcuts()
  for (const action of KEYBOARD_VIEWER_SHORTCUT_ACTIONS) {
    normalized[action] = normalizeKeyboardViewerShortcuts(shortcuts[action])
  }

  return JSON.stringify(normalized)
}

export function cloneDefaultKeyboardViewerShortcuts(): KeyboardViewerShortcuts {
  return {
    select_prev: [...DEFAULT_KEYBOARD_VIEWER_SHORTCUTS.select_prev],
    select_next: [...DEFAULT_KEYBOARD_VIEWER_SHORTCUTS.select_next],
    select_panel: [...DEFAULT_KEYBOARD_VIEWER_SHORTCUTS.select_panel],
    select_panel_tabs: [...DEFAULT_KEYBOARD_VIEWER_SHORTCUTS.select_panel_tabs],
    confirm: [...DEFAULT_KEYBOARD_VIEWER_SHORTCUTS.confirm],
    cancel: [...DEFAULT_KEYBOARD_VIEWER_SHORTCUTS.cancel],
    remove_tab: [...DEFAULT_KEYBOARD_VIEWER_SHORTCUTS.remove_tab],
  }
}

export function normalizeKeyboardViewerShortcuts(shortcuts: unknown[]): string[] {
  const normalized: string[] = []

  for (const shortcut of shortcuts) {
    if (typeof shortcut !== 'string') continue
    if (!isKeyboardViewerShortcutCode(shortcut)) continue
    if (normalized.includes(shortcut)) continue

    normalized.push(shortcut)
  }

  return normalized
}

export function isKeyboardViewerShortcutCode(code: string): boolean {
  if (code.startsWith('Key')) return code.length === 4
  if (code.startsWith('Digit')) return code.length === 6
  if (code.startsWith('Numpad')) return /^Numpad\d$/.test(code)
  if (/^F\d\d?$/.test(code)) return true

  return [
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Enter',
    'Escape',
    'Backspace',
    'Delete',
    'Home',
    'End',
    'PageUp',
    'PageDown',
    'Insert',
    'Comma',
    'Period',
    'Space',
  ].includes(code)
}

export function getKeyboardViewerShortcutCode(e: KeyboardEvent): string | undefined {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
  if (!isKeyboardViewerShortcutCode(e.code)) return

  return e.code
}

export function formatKeyboardViewerShortcut(code: string): string {
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`
  if (code.startsWith('Arrow')) return code.slice(5)
  if (code === 'Comma') return ','
  if (code === 'Period') return '.'
  if (code === 'Space') return 'Space'

  return code
}

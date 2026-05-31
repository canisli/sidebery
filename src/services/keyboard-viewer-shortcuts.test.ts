import { describe, expect, it } from 'vitest'
import {
  DEFAULT_KEYBOARD_VIEWER_SHORTCUTS,
  parseKeyboardViewerShortcuts,
  stringifyKeyboardViewerShortcuts,
} from './keyboard-viewer-shortcuts'

describe('keyboard viewer shortcuts', () => {
  it('returns defaults without stored shortcuts', () => {
    expect(parseKeyboardViewerShortcuts(undefined)).toEqual(DEFAULT_KEYBOARD_VIEWER_SHORTCUTS)
  })

  it('keeps defaults for missing actions and allows clearing configured actions', () => {
    const shortcuts = parseKeyboardViewerShortcuts(
      JSON.stringify({
        select_prev: [],
        select_next: ['KeyJ'],
      })
    )

    expect(shortcuts.select_prev).toEqual([])
    expect(shortcuts.select_next).toEqual(['KeyJ'])
    expect(shortcuts.confirm).toEqual(DEFAULT_KEYBOARD_VIEWER_SHORTCUTS.confirm)
  })

  it('removes duplicate and invalid shortcut codes when serializing', () => {
    const shortcuts = parseKeyboardViewerShortcuts(
      stringifyKeyboardViewerShortcuts({
        ...DEFAULT_KEYBOARD_VIEWER_SHORTCUTS,
        select_next: ['KeyJ', 'KeyJ', 'Ctrl+J'],
      })
    )

    expect(shortcuts.select_next).toEqual(['KeyJ'])
  })

  it('returns defaults for invalid stored data', () => {
    expect(parseKeyboardViewerShortcuts('{')).toEqual(DEFAULT_KEYBOARD_VIEWER_SHORTCUTS)
  })
})

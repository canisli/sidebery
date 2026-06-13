import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { PanelType } from 'src/enums'
import * as Sidebar from 'src/services/sidebar.fg'
import * as Settings from 'src/services/settings'
import * as Tabs from 'src/services/tabs.fg'
import { addMNavBtn, addMPanel, resetMSidebar } from 'src/defaults/mocks.sidebar.fg'
import { addMTab, resetMTabs, setDefaultMTabPanel } from 'src/defaults/mocks.tabs.fg'

describe('Sidebar.switchPanel()', () => {
  beforeEach(() => {
    Settings.state.navSwitchPanelsDelay = 0
    Settings.state.hideEmptyPanels = false
    Settings.state.hideDiscardedTabPanels = false
    Sidebar.setReadyState(true)
  })

  afterEach(() => {
    Settings.resetSettings()
    Sidebar.reactive.keyboardViewerSearchActive = false
    Sidebar.reactive.keyboardViewerSearchQuery = ''
    resetMSidebar()
    resetMTabs()
    Tabs.setPinned([])
    Tabs.reactive.pinnedIds = []
  })

  test('to the next panel', () => {
    addMPanel({ type: PanelType.tabs, id: 'a' })
    addMPanel({ type: PanelType.tabs, id: 'b', skipOnSwitching: true })
    addMPanel({ type: PanelType.tabs, id: 'c' })
    addMPanel({ type: PanelType.tabs, id: 'd', hidden: true })
    Sidebar.setActivePanelId('a')

    Sidebar.switchPanel(1, false, false, false, false)
    expect(Sidebar.activePanelId).toBe('c')
  })
  test('to the prev panel', () => {
    addMPanel({ type: PanelType.tabs, id: 'a' })
    addMPanel({ type: PanelType.tabs, id: 'b', skipOnSwitching: true })
    addMPanel({ type: PanelType.tabs, id: 'c' })
    addMPanel({ type: PanelType.tabs, id: 'd', hidden: true })
    Sidebar.setActivePanelId('c')

    Sidebar.switchPanel(-1, false, false, false, false)
    expect(Sidebar.activePanelId).toBe('a')
  })

  test('to the next panel without looping', () => {
    addMPanel({ type: PanelType.tabs, id: 'a' })
    addMPanel({ type: PanelType.tabs, id: 'b', skipOnSwitching: true })
    addMPanel({ type: PanelType.tabs, id: 'c' })
    addMPanel({ type: PanelType.tabs, id: 'd', hidden: true })
    Sidebar.setActivePanelId('d')

    Sidebar.switchPanel(1, false, false, false, false)
    expect(Sidebar.activePanelId).toBe('d')
  })
  test('to the prev panel without looping', () => {
    addMPanel({ type: PanelType.tabs, id: 'a' })
    addMPanel({ type: PanelType.tabs, id: 'b', skipOnSwitching: true })
    addMPanel({ type: PanelType.tabs, id: 'c' })
    addMPanel({ type: PanelType.tabs, id: 'd', hidden: true })
    Sidebar.setActivePanelId('a')

    Sidebar.switchPanel(-1, false, false, false, false)
    expect(Sidebar.activePanelId).toBe('a')
  })

  test('to the prev cyclically', () => {
    addMPanel({ type: PanelType.tabs, id: 'a' })
    addMPanel({ type: PanelType.tabs, id: 'b', skipOnSwitching: true })
    addMPanel({ type: PanelType.tabs, id: 'c' })
    addMPanel({ type: PanelType.tabs, id: 'd', hidden: true })
    Sidebar.setActivePanelId('a')

    Sidebar.switchPanel(-1, false, false, false, true)
    expect(Sidebar.activePanelId).toBe('d')
  })
  test('to the next cyclically', () => {
    addMPanel({ type: PanelType.tabs, id: 'a' })
    addMPanel({ type: PanelType.tabs, id: 'b', skipOnSwitching: true })
    addMPanel({ type: PanelType.tabs, id: 'c' })
    addMPanel({ type: PanelType.tabs, id: 'd', hidden: true })
    Sidebar.setActivePanelId('d')

    Sidebar.switchPanel(1, false, false, false, true)
    expect(Sidebar.activePanelId).toBe('a')
  })
  test('cyclically through the list', () => {
    addMPanel({ type: PanelType.tabs, id: 'a' })
    addMPanel({ type: PanelType.tabs, id: 'b', skipOnSwitching: true })
    addMPanel({ type: PanelType.tabs, id: 'c' })
    addMPanel({ type: PanelType.tabs, id: 'd', hidden: true })
    Sidebar.setActivePanelId('a')

    Sidebar.switchPanel(1, false, false, false, true)
    expect(Sidebar.activePanelId).toBe('c')
    Sidebar.switchPanel(1, false, false, false, true)
    expect(Sidebar.activePanelId).toBe('d')
  })

  test('ignoring hidden panels', () => {
    addMPanel({ type: PanelType.tabs, id: 'a' })
    addMPanel({ type: PanelType.tabs, id: 'b', skipOnSwitching: true })
    addMPanel({ type: PanelType.tabs, id: 'c' })
    addMPanel({ type: PanelType.tabs, id: 'd', hidden: true })
    Sidebar.setActivePanelId('a')

    Sidebar.switchPanel(1, true, false, false, false)
    expect(Sidebar.activePanelId).toBe('c')

    Sidebar.switchPanel(1, true, false, false, false)
    expect(Sidebar.activePanelId).toBe('c')

    Sidebar.switchPanel(1, true, false, false, true)
    expect(Sidebar.activePanelId).toBe('a')

    Sidebar.switchPanel(-1, true, false, false, true)
    expect(Sidebar.activePanelId).toBe('c')
  })

  test('with the hidden panels popup after "a", ignoring hidden panels', () => {
    Settings.state.navBarInline = false
    addMPanel({ type: PanelType.tabs, id: 'a' })
    addMNavBtn('hdn')
    addMPanel({ type: PanelType.tabs, id: 'b', skipOnSwitching: true })
    addMPanel({ type: PanelType.tabs, id: 'c' })
    addMPanel({ type: PanelType.tabs, id: 'd', hidden: true })
    Sidebar.setActivePanelId('a')

    Sidebar.switchPanel(1, true, false, false, false)
    expect(Sidebar.activePanelId).toBe('c')
    Sidebar.switchPanel(-1, true, false, false, false)
    expect(Sidebar.activePanelId).toBe('a')
  })

  test('with the hidden panels popup after "a", opening/closing the hidden panels popup', () => {
    Settings.state.navBarInline = false
    addMPanel({ type: PanelType.tabs, id: 'a' })
    addMNavBtn('hdn')
    addMPanel({ type: PanelType.tabs, id: 'b', skipOnSwitching: true })
    addMPanel({ type: PanelType.tabs, id: 'c' })
    addMPanel({ type: PanelType.tabs, id: 'd', hidden: true })
    Sidebar.setActivePanelId('a')

    Sidebar.switchPanel(1, false, false, false, false)
    expect(Sidebar.activePanelId).toBe('d')
    expect(Sidebar.reactive.hiddenPanelsPopup).toBe(true)
    Sidebar.switchPanel(1, false, false, false, false)
    expect(Sidebar.activePanelId).toBe('c')
    expect(Sidebar.reactive.hiddenPanelsPopup).toBe(false)
    Sidebar.switchPanel(-1, false, false, false, false)
    expect(Sidebar.activePanelId).toBe('d')
    expect(Sidebar.reactive.hiddenPanelsPopup).toBe(true)
    Sidebar.switchPanel(-1, false, false, false, false)
    expect(Sidebar.activePanelId).toBe('a')
    expect(Sidebar.reactive.hiddenPanelsPopup).toBe(false)
  })

  test("looping without ignoring hidden panels, when there's no hidden panels", () => {
    addMPanel({ type: PanelType.tabs, id: 'a' })
    addMPanel({ type: PanelType.tabs, id: 'b', skipOnSwitching: true })
    addMPanel({ type: PanelType.tabs, id: 'c' })
    Sidebar.setActivePanelId('a')

    Sidebar.switchPanel(-1, false, false, false, true)
    expect(Sidebar.activePanelId).toBe('c')
    expect(Sidebar.reactive.hiddenPanelsPopup).toBe(false)
  })

  test('looping forward when the first panel is a bookmarks panel set to be skipped', () => {
    addMPanel({ type: PanelType.bookmarks, id: 'a', skipOnSwitching: true })
    addMPanel({ type: PanelType.tabs, id: 'b' })
    addMPanel({ type: PanelType.tabs, id: 'c' })
    Sidebar.setActivePanelId('c')

    Sidebar.switchPanel(1, true, false, false, true)
    expect(Sidebar.activePanelId).toBe('b')
  })

  test('looping backward when the first panel is a bookmarks panel set to be skipped', () => {
    addMPanel({ type: PanelType.bookmarks, id: 'a', skipOnSwitching: true })
    addMPanel({ type: PanelType.tabs, id: 'b' })
    addMPanel({ type: PanelType.tabs, id: 'c' })
    Sidebar.setActivePanelId('b')

    Sidebar.switchPanel(-1, true, false, false, true)
    expect(Sidebar.activePanelId).toBe('c')
  })

  test('looping backward when the last panel is a bookmarks panel set to be skipped', () => {
    addMPanel({ type: PanelType.tabs, id: 'a' })
    addMPanel({ type: PanelType.tabs, id: 'b' })
    addMPanel({ type: PanelType.bookmarks, id: 'c', skipOnSwitching: true })
    Sidebar.setActivePanelId('a')

    Sidebar.switchPanel(-1, true, false, false, true)
    expect(Sidebar.activePanelId).toBe('b')
  })

  test('removing visible tab keeps filtered tab results in sync for regular search', () => {
    const panel = addMPanel({ type: PanelType.tabs, id: 'a' })
    if (!panel || panel.type !== PanelType.tabs) throw 'no tabs panel'
    setDefaultMTabPanel(panel.id)
    const first = addMTab({ id: 1, title: 'First match' })
    const second = addMTab({ id: 2, title: 'Second match' })

    panel.tabs = [first, second]
    panel.filteredTabs = [first, second]
    panel.reactive.filteredLen = 2
    panel.reactive.visibleTabIds = [first.id, second.id]

    Sidebar.removeFromVisibleTabs(panel.id, first.id)

    expect(panel.filteredTabs).toEqual([second])
    expect(panel.reactive.filteredLen).toBe(1)
    expect(panel.reactive.visibleTabIds).toEqual([second.id])
  })

  test('removing visible tab keeps keyboard viewer pinned results in filtered count', () => {
    const panel = addMPanel({ type: PanelType.tabs, id: 'a' })
    if (!panel || panel.type !== PanelType.tabs) throw 'no tabs panel'
    setDefaultMTabPanel(panel.id)
    const pinned = addMTab({ id: 1, pinned: true, title: 'Pinned match' })
    const first = addMTab({ id: 2, title: 'First match' })
    const second = addMTab({ id: 3, title: 'Second match' })

    Sidebar.reactive.keyboardViewerSearchActive = true
    panel.pinnedTabs = [pinned]
    panel.tabs = [first, second]
    panel.filteredTabs = [first, second]
    panel.reactive.pinnedTabIds = [pinned.id]
    panel.reactive.filteredLen = 3
    panel.reactive.visibleTabIds = [first.id, second.id]

    Sidebar.removeFromVisibleTabs(panel.id, first.id)

    expect(panel.reactive.pinnedTabIds).toEqual([pinned.id])
    expect(panel.filteredTabs).toEqual([second])
    expect(panel.reactive.filteredLen).toBe(2)
    expect(panel.reactive.visibleTabIds).toEqual([second.id])
  })

  test('recalculating tabs panels preserves filtered panel pinned results in keyboard viewer search', () => {
    const panel = addMPanel({ type: PanelType.tabs, id: 'a' })
    if (!panel || panel.type !== PanelType.tabs) throw 'no tabs panel'
    setDefaultMTabPanel(panel.id)
    const pinnedMatch = addMTab({ id: 1, pinned: true, title: 'Pinned match' })
    const pinnedOther = addMTab({ id: 2, pinned: true, title: 'Pinned other' })
    const visible = addMTab({ id: 3, title: 'Visible match' })

    Sidebar.reactive.keyboardViewerSearchActive = true
    panel.filteredTabs = [visible]
    panel.reactive.pinnedTabIds = [pinnedMatch.id]

    Sidebar.recalcTabsPanels()

    expect(panel.pinnedTabs).toEqual([pinnedMatch, pinnedOther])
    expect(panel.reactive.pinnedTabIds).toEqual([pinnedMatch.id])
  })

  test('recalculating tabs panels preserves filtered global pinned results in keyboard viewer search', () => {
    Settings.state.pinnedTabsPosition = 'top'
    const panel = addMPanel({ type: PanelType.tabs, id: 'a' })
    if (!panel || panel.type !== PanelType.tabs) throw 'no tabs panel'
    setDefaultMTabPanel(panel.id)
    const pinnedMatch = addMTab({ id: 1, pinned: true, title: 'Pinned match' })
    const pinnedOther = addMTab({ id: 2, pinned: true, title: 'Pinned other' })
    const visible = addMTab({ id: 3, title: 'Visible match' })

    Sidebar.reactive.keyboardViewerSearchActive = true
    panel.filteredTabs = [visible]
    Tabs.reactive.pinnedIds = [pinnedMatch.id]

    Sidebar.recalcTabsPanels()

    expect(Tabs.pinned).toEqual([pinnedMatch, pinnedOther])
    expect(Tabs.reactive.pinnedIds).toEqual([pinnedMatch.id])
  })
})

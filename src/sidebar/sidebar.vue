<template lang="pug">
#root.root.Sidebar(
  ref="rootEl"
  :data-keyboard-viewer="keyboardViewerActive"
  :key="rrc"
  :data-native-scrollbar="Settings.state.nativeScrollbars"
  :data-native-scrollbars-thin="Settings.state.nativeScrollbarsThin"
  :data-native-scrollbars-left="Settings.state.nativeScrollbarsLeft"
  :data-theme="Settings.state.theme"
  :data-density="Settings.state.density"
  :data-frame-color-scheme="Styles.reactive.frameColorScheme"
  :data-toolbar-color-scheme="Styles.reactive.toolbarColorScheme"
  :data-act-el-color-scheme="Styles.reactive.actElColorScheme"
  :data-popup-color-scheme="Styles.reactive.popupColorScheme"
  :data-animations="animations"
  :data-pinned-tabs-position="Settings.state.pinnedTabsPosition"
  :data-pinned-tabs-list="Settings.state.pinnedTabsList"
  :data-tabs-tree-lvl-marks="Settings.state.tabsLvlDots"
  :data-tabs-close-btn="Settings.state.tabRmBtn"
  :data-drag="DnD.reactive.isStarted"
  :data-nav-inline="Settings.state.navBarInline"
  :data-nav-layout="navBarLayout"
  :data-search="Search.reactive.active"
  :data-sticky-bookmarks="Settings.state.pinOpenedBookmarksFolder"
  :data-colorized-branches="Settings.state.colorizeTabsBranches"
  :data-syncing="Sync.reactive.syncing"
  :data-new-tab-btns="Settings.state.showNewTabBtns"
  @dragend="DnD.onDragEnd"
  @dragenter="DnD.onDragEnter"
  @dragleave="DnD.onDragLeave"
  @dragover.prevent="DnD.onDragMove"
  @drop.stop.prevent="DnD.onDrop"
  @contextmenu.stop.prevent
  @mouseenter="onMouseEnter"
  @mouseleave="onMouseLeave"
  @mousedown="onMouseDown"
  @mouseup="onMouseUp"
  @mousemove.passive="Mouse.onMouseMove"
  @focusin="onFocusIn"
  @focusout="onFocusOut")

  Transition(name="popup" type="transition"): ConfirmPopup(v-if="Popups.reactive.confirm")
  Transition(name="popup" type="transition"): WindowsPopup(v-if="Windows.reactive.choosing")
  Transition(name="popup" type="transition"): BookmarksPopup(v-if="Bookmarks.reactive.popup")
  Transition(name="popup" type="transition"): PanelConfigPopup(v-if="Popups.reactive.panelConfigPopup")
  Transition(name="popup" type="transition"): ContainerConfigPopup(v-if="Popups.reactive.containerConfigPopup")
  Transition(name="popup" type="transition"): GroupConfigPopup(v-if="Popups.reactive.groupConfigPopup")
  Transition(name="popup" type="transition"): DialogPopup(v-if="Popups.reactive.dialog" :dialog="Popups.reactive.dialog")
  Transition(name="popup" type="transition"): NewTabShortcutsPopup(v-if="Popups.reactive.newTabShortcutsPopup")
  Transition(name="popup" type="transition"): SiteConfigPopup(v-if="Popups.reactive.siteConfigPopup")
  Transition(name="popup" type="transition"): ProcessingTabsPopup(v-if="Popups.reactive.processingTabsPopup")
  CtxMenuPopup
  DragAndDropTooltip
  NotificationsPopup
  .tab-preview(
    v-if="inlinePreview"
    v-show="Tabs.reactive.inlinePreview"
    ref="tprvw"
    :data-onet="Settings.state.previewTabsTitle === 1"
    :data-oneu="Settings.state.previewTabsUrl === 1")
    .preview-body
      .preview-title(v-if="Settings.state.previewTabsTitle > 0") {{Tabs.reactive.inlinePreviewTitle}}
      .preview-url(v-if="Settings.state.previewTabsUrl > 0") {{Tabs.reactive.inlinePreviewUrl}}
      img.preview-img(v-if="Tabs.reactive.inlinePreviewImg" :src="Tabs.reactive.inlinePreviewImg")

  .top-horizontal-box(v-if="navBarHorizontal")
    NavigationBar.-top

  SearchBar(v-if="navBarHorizontal" v-show="Settings.state.searchBarMode !== 'none'")

  .main-box
    .left-vertical-box(v-if="pinnedTabsBarLeft || navBarLeft")
      PinnedTabsBar(v-if="pinnedTabsBarLeft")
      NavigationBar.-vert(v-if="navBarLeft")

    .central-box
      PinnedTabsBar(v-if="pinnedTabsBarTop")
      SearchBar(v-if="!navBarHorizontal" v-show="Settings.state.searchBarMode !== 'none'")
      .panel-box(ref="panelBoxEl" @wheel.passive="onWheel")
        component.panel(
          v-for="(panel, i) in panels"
          :key="panel.id"
          :is="getPanelComponent(panel)"
          :data-pos="getPanelPos(i, panel.id)"
          :panel="panel")

      Transition(name="bottom-bar")
        .BottomBar(
          v-if="bottomBar && Utils.isTabsPanel(activePanel)"
          @dragover.prevent.stop=""
          :data-drop-target-bookmarks="DnD.reactive.dstType === E.DropType.BookmarksSubPanelBtn && DnD.reactive.dstPanelId === activePanel.id"
          :data-drop-target-sync="DnD.reactive.dstType === E.DropType.SyncSubPanelBtn")
          .tool-btn(
            v-if="Settings.state.subPanelRecentlyClosedBar"
            :data-disabled="!Tabs.reactive.recentlyRemovedLen"
            @click="Sidebar.openSubPanel(E.SubPanelType.RecentlyClosedTabs, activePanel)")
            svg: use(href="#icon_trash")
          .tool-btn.-bookmarks(
            v-if="Settings.state.subPanelBookmarks"
            @dragleave="onBSPBDragLeave"
            @click="Sidebar.openSubPanel(E.SubPanelType.Bookmarks, activePanel)")
            .dnd-layer(data-dnd-type="bspb")
            svg: use(href="#icon_bookmarks")
          .tool-btn(
            v-if="Settings.state.subPanelHistory"
            @click="Sidebar.openSubPanel(E.SubPanelType.History, activePanel)")
            svg: use(href="#icon_clock")
          .tool-btn.-sync(
            v-if="Settings.state.subPanelSync"
            @dragleave="onSSPBDragLeave"
            @click="Sidebar.openSubPanel(E.SubPanelType.Sync, activePanel)")
            .dnd-layer(data-dnd-type="sspb")
            svg: use(href="#icon_sync")

      SubPanel

    .right-vertical-box(v-if="pinnedTabsBarRight || navBarRight")
      PinnedTabsBar(v-if="pinnedTabsBarRight")
      NavigationBar.-vert(v-if="navBarRight")

  teleport(
    v-if="Settings.state.selLen && Sidebar.reactive.selLenBadgeTarget && Sidebar.reactive.selLen"
    :to="Sidebar.reactive.selLenBadgeTarget")
    .sel-len-teleported {{Sidebar.reactive.selLen}}
</template>

<script lang="ts" setup>
import type { Component } from 'vue'
import { ref, computed, onMounted, onBeforeUnmount, nextTick, useTemplateRef } from 'vue'
import type { Panel, Tab } from 'src/types'
import * as E from 'src/enums'
import { NOID } from 'src/defaults'
import * as Settings from 'src/services/settings'
import * as Sidebar from 'src/services/sidebar.fg'
import * as Styles from 'src/services/styles.fg'
import * as Selection from 'src/services/selection.fg'
import * as Menu from 'src/services/menu.fg'
import * as Tabs from 'src/services/tabs.fg'
import * as TabPreview from 'src/services/tabs.fg.preview'
import * as Mouse from 'src/services/mouse.fg'
import * as DnD from 'src/services/drag-and-drop.fg'
import * as Bookmarks from 'src/services/bookmarks.fg'
import * as Windows from 'src/services/windows.fg'
import * as Search from 'src/services/search.fg'
import * as Sync from 'src/services/sync.fg'
import * as Info from 'src/services/info'
import * as Keybindings from 'src/services/keybindings.fg'
import * as Utils from 'src/utils'
import * as Popups from 'src/services/popups.fg'
import * as Logs from 'src/services/logs'
import * as Preview from 'src/services/tabs.fg.preview'
import ConfirmPopup from './components/popup.confirm.vue'
import CtxMenuPopup from './components/popup.context-menu.vue'
import DragAndDropTooltip from './components/dnd-tooltip.vue'
import PinnedTabsBar from './components/bar.pinned-tabs.vue'
import NotificationsPopup from './components/popup.notifications.vue'
import NavigationBar from './components/bar.navigation.vue'
import WindowsPopup from './components/popup.windows.vue'
import TabsPanel from './components/panel.tabs.vue'
import BookmarksPanel from './components/panel.bookmarks.vue'
import HistoryPanel from './components/panel.history.vue'
import SyncPanel from './components/panel.sync.vue'
import SearchBar from './components/bar.search.vue'
import BookmarksPopup from 'src/components/popup.bookmarks.vue'
import PanelConfigPopup from './components/popup.panel-config.vue'
import ContainerConfigPopup from './components/popup.container-config.vue'
import GroupConfigPopup from './components/popup.group-config.vue'
import DialogPopup from 'src/components/popup.dialog.vue'
import NewTabShortcutsPopup from '../components/popup.new-tab-shortcuts.vue'
import SiteConfigPopup from '../components/popup.site-config.vue'
import ProcessingTabsPopup from './components/popup.processing-tabs.vue'
import SubPanel from './components/sub-panel.vue'

const rootEl = ref<HTMLElement | null>(null)
const panelBoxEl = ref<HTMLElement | null>(null)
const tabPreviewEl = useTemplateRef<HTMLElement>('tprvw')
const rrc = ref(0)

let animations = !Settings.state.animations ? 'none' : Settings.state.animationSpeed || 'fast'
let pinnedTabsBarTop = Settings.state.pinnedTabsPosition === 'top'
let pinnedTabsBarLeft = Settings.state.pinnedTabsPosition === 'left'
let pinnedTabsBarRight = Settings.state.pinnedTabsPosition === 'right'
let navBarHorizontal = Settings.state.navBarLayout === 'horizontal'
let navBarVertical = Settings.state.navBarLayout === 'vertical'
let navBarLayout = navBarVertical ? Settings.state.navBarSide : Settings.state.navBarLayout
let navBarLeft = navBarVertical && Settings.state.navBarSide === 'left'
let navBarRight = navBarVertical && Settings.state.navBarSide === 'right'
let bottomBar =
  Settings.state.subPanelRecentlyClosedBar ||
  Settings.state.subPanelBookmarks ||
  Settings.state.subPanelHistory ||
  Settings.state.subPanelSync
let inlinePreview =
  Settings.state.previewTabs &&
  (Settings.state.previewTabsMode === 'i' || Settings.state.previewTabsPageModeFallback === 'i')

function recalcStaticVars() {
  animations = !Settings.state.animations ? 'none' : Settings.state.animationSpeed || 'fast'
  pinnedTabsBarTop = Settings.state.pinnedTabsPosition === 'top'
  pinnedTabsBarLeft = Settings.state.pinnedTabsPosition === 'left'
  pinnedTabsBarRight = Settings.state.pinnedTabsPosition === 'right'
  navBarHorizontal = Settings.state.navBarLayout === 'horizontal'
  navBarVertical = Settings.state.navBarLayout === 'vertical'
  navBarLayout = navBarVertical ? Settings.state.navBarSide : Settings.state.navBarLayout
  navBarLeft = navBarVertical && Settings.state.navBarSide === 'left'
  navBarRight = navBarVertical && Settings.state.navBarSide === 'right'
  bottomBar =
    Settings.state.subPanelRecentlyClosedBar ||
    Settings.state.subPanelBookmarks ||
    Settings.state.subPanelHistory ||
    Settings.state.subPanelSync
  inlinePreview =
    Settings.state.previewTabs &&
    (Settings.state.previewTabsMode === 'i' || Settings.state.previewTabsPageModeFallback === 'i')
}

Sidebar.setReMountSidebarFn(() => {
  Sidebar.rememberActivePanelScrollPosition()
  recalcStaticVars()
  rrc.value++
  nextTick(updSidebarEls)
})

const activePanel = computed<Panel | undefined>(() => {
  return Sidebar.panelsById[Sidebar.reactive.activePanelId]
})

const panels = computed<Panel[]>(() => {
  const output = []
  for (const id of Sidebar.reactive.nav) {
    const panel = Sidebar.panelsById[id]
    if (panel) output.push(panel)
  }
  return output
})

function updSidebarEls() {
  if (panelBoxEl.value) Sidebar.setPanelsBoxEl(panelBoxEl.value)
  if (rootEl.value) Sidebar.registerRootEl(rootEl.value)
  if (inlinePreview) TabPreview.registerSPreviewEl(tabPreviewEl.value)
  Sidebar.recalcElementSizes()
  Sidebar.recalcSidebarSize()
  Sidebar.restoreActivePanelScrollPosition()
}

onMounted(() => {
  logKeyboardViewer('sidebar mounted', {
    winId: Windows.id,
    location: location.href,
    visibilityState: document.visibilityState,
    hasFocus: document.hasFocus(),
  })
  updSidebarEls()
  document.addEventListener('keydown', onDocumentKeydown, true)
  Sidebar.setKeyboardViewerKeyHandler(handleKeyboardViewerCode)
  initKeyboardViewer()
})

onBeforeUnmount(() => {
  logKeyboardViewer('sidebar before unmount', {
    winId: Windows.id,
    keyboardViewerControllerOpen,
    keyboardViewerControllerWinId,
  })
  document.removeEventListener('keydown', onDocumentKeydown, true)
  Sidebar.setKeyboardViewerKeyHandler(null)
  closeKeyboardViewerController()
})

function getPanelComponent(panel: Panel): Component | undefined {
  if (panel.type === E.PanelType.tabs) return TabsPanel
  if (panel.type === E.PanelType.bookmarks) return BookmarksPanel
  if (panel.type === E.PanelType.history) return HistoryPanel
  if (panel.type === E.PanelType.sync) return SyncPanel
}

function onFocusIn(e: FocusEvent): void {
  // if (Search.reactive.barIsShowed && !Selection.isSet()) Search.focus()
}

function onFocusOut(e: FocusEvent): void {
  if ((e as MozFocusEvent).explicitOriginalTarget === e.target && !DnD.reactive.isStarted) {
    if (keyboardViewerActive.value) {
      if (Menu.isOpen) Menu.close()
      if (Sidebar.reactive.hiddenPanelsPopup) Sidebar.closeHiddenPanelsPopup(true)
      return
    }

    resetKeyboardViewer()
    if (Menu.isOpen) Menu.close()
    Selection.resetSelection()
    if (Sidebar.reactive.hiddenPanelsPopup) Sidebar.closeHiddenPanelsPopup(true)
  }
}

function onDocumentKeydown(e: KeyboardEvent): void {
  if (keyboardViewerActive.value && isKeyboardViewerToggleKeydown(e)) {
    logKeyboardViewer('document keydown matched toggle shortcut', {
      event: getKeyboardViewerEventLogInfo(e),
      activeElement: getKeyboardViewerElementLogInfo(document.activeElement),
      target: getKeyboardViewerElementLogInfo(e.target),
    })
  }

  if (handleKeyboardViewerKeydown(e)) return

  // Close popups
  if (e.code === 'Escape') {
    Sidebar.resetOrCancelInteraction()
  }

  // Confirm popups
  if (e.code === 'Enter') {
    // Confirm popup
    if (Popups.reactive.confirm?.ok) Popups.reactive.confirm.ok()
  }

  // Paste
  if (e.code === 'KeyV' && (Info.reactive.os === 'mac' ? e.metaKey : e.ctrlKey)) {
    if (e.target instanceof HTMLInputElement) return

    let actPanel
    if (Sidebar.subPanelActive) actPanel = Sidebar.subPanels.bookmarks
    else actPanel = Sidebar.panelsById[Sidebar.activePanelId]

    if (Utils.isTabsPanel(actPanel)) {
      if (Selection.isTabs()) {
        Tabs.pasteAfter(Selection.ids())
      } else {
        Tabs.paste({ panelId: Sidebar.activePanelId })
      }
    } else if (Utils.isBookmarksPanel(actPanel)) {
      if (Selection.isBookmarks()) {
        const target = Bookmarks.byId.get(Selection.getLast())
        if (!target) return Logs.warn('Sidebar.onDocumentKeyup: Paste bkm: No sel target')
        if (target.type === E.BkmType.Folder) Bookmarks.pasteIn(target.id)
        else Bookmarks.pasteAfter(target.id)
      } else {
        Bookmarks.pasteIn(actPanel.rootId)
      }
    }
  }
}

let keyboardViewerPanelId: ID | null = null
const keyboardViewerActive = ref(false)
let keyboardViewerControllerOpen = false
let keyboardViewerControllerWinId: ID | undefined
let keyboardViewerToggleShortcuts: string[] = []
const keyboardViewerCapturedTabIds = new Set<ID>()
const KEYBOARD_VIEWER_PAGE_CAPTURE_TTL = 5 * 60 * 1000
const KEYBOARD_VIEWER_PAGE_CAPTURE_TIMEOUT = 300
const KEYBOARD_VIEWER_CONTROLLER_WIDTH = 80
const KEYBOARD_VIEWER_CONTROLLER_HEIGHT = 40
const KEYBOARD_VIEWER_CONTROLLER_OFFSCREEN_OFFSET = 10000
const KEYBOARD_VIEWER_TOGGLE_COMMAND = '_execute_sidebar_action'
const KEYBOARD_VIEWER_URL_WITHOUT_PROTOCOL_RE = /^(.+\.)\/?(.+\/)?\w+/

interface KeyboardViewerControllerWindowBounds {
  width: number
  height: number
  left: number
  top: number
}

function logKeyboardViewer(message: string, data?: unknown): void {
  Logs.info('Sidebar.keyboardViewer:', message, data)
  browser.runtime
    .sendMessage({
      type: 'sideberyKeyboardViewerLog',
      winId: Windows.id,
      message,
      data,
    })
    .catch(() => {})
}

function suppressNextKeyboardViewerToggle(reason: string): void {
  logKeyboardViewer('requesting background toggle suppression', { reason })
  browser.runtime
    .sendMessage({
      type: 'sideberyKeyboardViewerSuppressNextToggle',
      winId: Windows.id,
      reason,
    })
    .catch(() => {})
}

function formatKeyboardViewerError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`
  return String(err)
}

function getKeyboardViewerNativeTabLogInfo(
  tab: browser.tabs.Tab | undefined
): Record<string, unknown> {
  if (!tab) return { available: false }

  return {
    available: true,
    id: tab.id,
    windowId: tab.windowId,
    active: tab.active,
    discarded: tab.discarded,
    hidden: tab.hidden,
    status: tab.status,
    url: tab.url,
    title: tab.title,
  }
}

function getKeyboardViewerSideberyTabLogInfo(tab: Tab): Record<string, unknown> {
  return {
    id: tab.id,
    windowId: tab.windowId,
    active: tab.active,
    discarded: tab.discarded,
    reactiveDiscarded: tab.reactive.discarded,
    panelId: tab.panelId,
    url: tab.url,
    title: tab.title,
  }
}

function getKeyboardViewerEventLogInfo(e: KeyboardEvent): Record<string, unknown> {
  return {
    key: e.key,
    code: e.code,
    alt: e.altKey,
    ctrl: e.ctrlKey,
    meta: e.metaKey,
    shift: e.shiftKey,
    defaultPrevented: e.defaultPrevented,
  }
}

function getKeyboardViewerElementLogInfo(target: EventTarget | null): Record<string, unknown> {
  if (!(target instanceof HTMLElement)) return { available: false }

  return {
    available: true,
    tagName: target.tagName,
    id: target.id,
    className: target.className,
    isContentEditable: target.isContentEditable,
    inputType: target instanceof HTMLInputElement ? target.type : undefined,
  }
}

function resetKeyboardViewer(): void {
  keyboardViewerPanelId = null
  keyboardViewerActive.value = false
}

function startKeyboardViewer(): void {
  if (keyboardViewerPanelId === null) keyboardViewerPanelId = Sidebar.activePanelId
  keyboardViewerActive.value = true
}

async function initKeyboardViewer(): Promise<void> {
  logKeyboardViewer('init keyboard viewer start', {
    winId: Windows.id,
    activePanelId: Sidebar.activePanelId,
    activeTabId: Tabs.activeId,
    markerCommand: KEYBOARD_VIEWER_TOGGLE_COMMAND,
  })
  startKeyboardViewer()
  await loadKeyboardViewerToggleShortcut()
  logKeyboardViewer('init keyboard viewer shortcuts loaded', {
    shortcuts: keyboardViewerToggleShortcuts,
  })
  openKeyboardViewerController()

  await Tabs.waitForTabsReady()
  await nextTick()

  if (!selectActiveTabInActivePanel()) selectFirstVisibleTabInActivePanel()
  logKeyboardViewer('init keyboard viewer selection ready', {
    selectedTabId: Selection.isTabs() ? Selection.getFirst() : undefined,
    activePanelId: Sidebar.activePanelId,
    keyboardViewerControllerOpen,
  })
  enableKeyboardViewerPageCapture()
}

async function loadKeyboardViewerToggleShortcut(): Promise<void> {
  const commands = await browser.commands.getAll().catch(() => [])
  keyboardViewerToggleShortcuts = commands
    .filter(cmd => {
      return cmd.name === KEYBOARD_VIEWER_TOGGLE_COMMAND && !!cmd.shortcut
    })
    .map(cmd => cmd.shortcut ?? '')
  logKeyboardViewer('loaded sidebar toggle command registry', {
    commands: commands.map(cmd => ({
      name: cmd.name,
      shortcut: cmd.shortcut,
      description: cmd.description,
    })),
    targetCommand: KEYBOARD_VIEWER_TOGGLE_COMMAND,
  })
}

async function openKeyboardViewerController(): Promise<void> {
  keyboardViewerControllerOpen = true
  if (await enableKeyboardViewerPageCapture()) return

  focusKeyboardViewerController()
}

function getKeyboardViewerControllerUrl(): string {
  return browser.runtime.getURL(`/popup.keyboard/keyboard.html?winId=${Windows.id}`)
}

function resetKeyboardViewerBrowserActionPopup(): void {
  try {
    browser.browserAction.setPopup({ popup: null })
  } catch {
    // Browser action popup reset is best-effort cleanup.
  }
}

function focusKeyboardViewerController(): void {
  if (!keyboardViewerControllerOpen) return

  try {
    browser.browserAction.setPopup({ popup: getKeyboardViewerControllerUrl() })
    browser.browserAction.openPopup()
    setTimeout(resetKeyboardViewerBrowserActionPopup, 500)
    setTimeout(openKeyboardViewerControllerWindow, 350)
  } catch (err) {
    resetKeyboardViewerBrowserActionPopup()
    Logs.err('Sidebar.keyboardViewer: Cannot open controller popup:', err)
    openKeyboardViewerControllerWindow()
  }
}

function refocusKeyboardViewerController(): void {
  enableKeyboardViewerPageCapture().then(captured => {
    logKeyboardViewer('refocus controller page capture result', {
      captured,
      activeTabId: Tabs.activeId,
    })
    if (captured) return

    focusKeyboardViewerController()
    setTimeout(focusKeyboardViewerController, 50)
    setTimeout(focusKeyboardViewerController, 150)
  })
}

function closeKeyboardViewerController(notifyPopup = true): void {
  keyboardViewerControllerOpen = false
  disableKeyboardViewerPageCapture()
  resetKeyboardViewerBrowserActionPopup()

  if (notifyPopup) {
    browser.runtime
      .sendMessage({ type: 'sideberyKeyboardViewerClose', winId: Windows.id })
      .catch(() => {})
  }

  closeKeyboardViewerControllerWindow()
}

function openKeyboardViewerControllerWindow(): void {
  if (!keyboardViewerControllerOpen) return

  if (keyboardViewerControllerWinId !== undefined) {
    browser.windows.update(keyboardViewerControllerWinId, { focused: true }).catch(() => {
      keyboardViewerControllerWinId = undefined
      openKeyboardViewerControllerWindow()
    })
    return
  }

  const bounds = getKeyboardViewerControllerWindowBounds()
  browser.windows
    .create({
      url: getKeyboardViewerControllerUrl(),
      type: 'popup',
      ...bounds,
      focused: true,
      allowScriptsToClose: true,
      titlePreface: '',
    })
    .then(win => {
      keyboardViewerControllerWinId = win.id
      if (win.id !== undefined) browser.windows.update(win.id, bounds).catch(() => {})
    })
    .catch(err => {
      Logs.err('Sidebar.keyboardViewer: Cannot open controller window:', err)
    })
}

function getKeyboardViewerControllerWindowBounds(): KeyboardViewerControllerWindowBounds {
  const screenBounds = screen as Screen & { availLeft?: number; availTop?: number }
  const availLeft = screenBounds.availLeft ?? 0
  const availTop = screenBounds.availTop ?? 0

  return {
    width: KEYBOARD_VIEWER_CONTROLLER_WIDTH,
    height: KEYBOARD_VIEWER_CONTROLLER_HEIGHT,
    left: availLeft - KEYBOARD_VIEWER_CONTROLLER_OFFSCREEN_OFFSET,
    top: availTop + screen.availHeight + KEYBOARD_VIEWER_CONTROLLER_OFFSCREEN_OFFSET,
  }
}

function closeKeyboardViewerControllerWindow(): void {
  const winId = keyboardViewerControllerWinId
  keyboardViewerControllerWinId = undefined
  if (winId === undefined) return

  browser.windows.remove(winId).catch(() => {})
}

function getKeyboardViewerPageCaptureScript(active: boolean): string {
  const activeUntil = active ? `Date.now() + ${KEYBOARD_VIEWER_PAGE_CAPTURE_TTL}` : '0'
  const isActive = active ? 'true' : 'false'
  const toggleShortcuts = JSON.stringify(keyboardViewerToggleShortcuts)

  return `
(() => {
  const marker = '__sideberyKeyboardViewer'
  const state = window[marker] || (window[marker] = {})
  state.activeUntil = ${activeUntil}
  state.toggleShortcuts = ${toggleShortcuts}
  if (state.installed && state.handler) {
    window.removeEventListener('keydown', state.handler, true)
  }
  state.installed = false
  if (!${isActive}) return true

  state.parseShortcut = shortcut => {
    if (!shortcut) return null
    const parts = shortcut.split('+')
    const key = parts.pop()
    if (!key) return null
    const mods = new Set()
    for (const part of parts) {
      if (part === 'Alt') mods.add('alt')
      else if (part === 'Shift') mods.add('shift')
      else if (part === 'Ctrl' || part === 'MacCtrl') mods.add('ctrl')
      else if (part === 'Command') mods.add('meta')
    }
    return { key: state.normalizeShortcutKey(key), mods }
  }
  state.normalizeShortcutKey = key => {
    if (key.startsWith('Digit')) return key.slice(5)
    if (key.startsWith('Numpad')) return key.slice(6)
    if (key.startsWith('Arrow')) return key.slice(5)
    return key
  }
  state.getEventShortcutKey = event => {
    if (event.code.startsWith('Key')) return event.code.slice(3)
    if (event.code.startsWith('Digit')) return event.code.slice(5)
    if (event.code.startsWith('Numpad')) return event.code.slice(6)
    if (event.code.startsWith('Arrow')) return event.code.slice(5)
    if (event.code === 'Comma') return 'Comma'
    if (event.code === 'Period') return 'Period'
    if (event.code === 'Space') return 'Space'
    if (event.code === 'Insert') return 'Insert'
    if (event.code === 'Delete') return 'Delete'
    if (event.code === 'Home') return 'Home'
    if (event.code === 'End') return 'End'
    if (event.code === 'PageUp') return 'PageUp'
    if (event.code === 'PageDown') return 'PageDown'
    if (/^F\\d\\d?$/.test(event.code)) return event.code
  }
  state.hasMod = (event, mod) => {
    if (mod === 'ctrl') return event.ctrlKey
    if (mod === 'alt') return event.altKey
    if (mod === 'shift') return event.shiftKey
    return event.metaKey
  }
  state.isToggleSidebarShortcut = event => {
    const eventKey = state.getEventShortcutKey(event)
    if (!eventKey) return false
    return (state.toggleShortcuts || []).some(shortcutStr => {
      const shortcut = state.parseShortcut(shortcutStr)
      if (!shortcut) return false
      if (eventKey !== shortcut.key) return false
      return ['ctrl', 'alt', 'shift', 'meta'].every(mod => {
        return state.hasMod(event, mod) === shortcut.mods.has(mod)
      })
    })
  }
  state.installed = true
  state.handler = event => {
    if (Date.now() > state.activeUntil) return
    const isToggle = state.isToggleSidebarShortcut(event)
    if (!isToggle && (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)) return
    if (!isToggle && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(event.code)) return

    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    browser.runtime.sendMessage({
      type: 'sideberyKeyboardViewerLog',
      message: 'page capture: captured key',
      data: {
        code: event.code,
        isToggle,
        activeTag: document.activeElement && document.activeElement.tagName,
        activeId: document.activeElement && document.activeElement.id,
        activeEditable: document.activeElement && document.activeElement.isContentEditable
      }
    }).catch(() => {})
    if (isToggle) {
      browser.runtime.sendMessage({
        type: 'sideberyKeyboardViewerSuppressNextToggle',
        reason: 'page capture toggle'
      }).catch(() => {})
    }
    browser.runtime.sendMessage({
      type: 'sideberyKeyboardViewerKey',
      code: isToggle ? 'Escape' : event.code
    }).catch(() => {})
  }
  window.addEventListener('keydown', state.handler, true)
  return true
})()
`
}

async function enableKeyboardViewerPageCapture(tabId = Tabs.activeId): Promise<boolean> {
  if (!keyboardViewerControllerOpen) {
    logKeyboardViewer('page capture skipped: controller closed', { tabId })
    return false
  }
  if (tabId === undefined || tabId === NOID) {
    logKeyboardViewer('page capture skipped: invalid tab id', { tabId })
    return false
  }

  logKeyboardViewer('page capture start', { tabId })
  let settled = false
  const capture = browser.tabs
    .executeScript(tabId, {
      code: getKeyboardViewerPageCaptureScript(true),
      runAt: 'document_start',
      allFrames: false,
      matchAboutBlank: true,
    })
    .then(() => {
      settled = true
      keyboardViewerCapturedTabIds.add(tabId)
      logKeyboardViewer('page capture installed', { tabId })
      return true
    })
    .catch(err => {
      settled = true
      logKeyboardViewer('page capture failed', {
        tabId,
        error: formatKeyboardViewerError(err),
      })
      return false
    })

  const timeout = new Promise<boolean>(resolve => {
    setTimeout(() => {
      if (!settled) logKeyboardViewer('page capture timed out', { tabId })
      resolve(false)
    }, KEYBOARD_VIEWER_PAGE_CAPTURE_TIMEOUT)
  })

  return Promise.race([capture, timeout])
}

function disableKeyboardViewerPageCapture(): void {
  const tabIds = [...keyboardViewerCapturedTabIds]
  keyboardViewerCapturedTabIds.clear()

  for (const tabId of tabIds) {
    if (tabId === NOID) continue

    browser.tabs
      .executeScript(tabId, {
        code: getKeyboardViewerPageCaptureScript(false),
        runAt: 'document_start',
        allFrames: false,
        matchAboutBlank: true,
      })
      .catch(() => {})
  }
}

function isKeyboardViewerInputTarget(e: KeyboardEvent): boolean {
  const target = e.target
  if (!(target instanceof HTMLElement)) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  )
}

function hasKeyboardViewerMods(e: KeyboardEvent): boolean {
  return e.altKey || e.ctrlKey || e.metaKey || e.shiftKey
}

function parseKeyboardViewerShortcut(
  shortcut: string | undefined
): { key: string; mods: Set<'ctrl' | 'alt' | 'shift' | 'meta'> } | undefined {
  if (!shortcut) return

  const parts = shortcut.split('+')
  const key = parts.pop()
  if (!key) return

  const mods = new Set<'ctrl' | 'alt' | 'shift' | 'meta'>()
  for (const part of parts) {
    if (part === 'Alt') mods.add('alt')
    else if (part === 'Shift') mods.add('shift')
    else if (part === 'Ctrl' || part === 'MacCtrl') mods.add('ctrl')
    else if (part === 'Command') mods.add('meta')
  }

  return { key: normalizeKeyboardViewerShortcutKey(key), mods }
}

function normalizeKeyboardViewerShortcutKey(key: string): string {
  if (key.startsWith('Digit')) return key.slice(5)
  if (key.startsWith('Numpad')) return key.slice(6)
  if (key.startsWith('Arrow')) return key.slice(5)
  return key
}

function getKeyboardViewerEventShortcutKey(e: KeyboardEvent): string | undefined {
  if (e.code.startsWith('Key')) return e.code.slice(3)
  if (e.code.startsWith('Digit')) return e.code.slice(5)
  if (e.code.startsWith('Numpad')) return e.code.slice(6)
  if (e.code.startsWith('Arrow')) return e.code.slice(5)
  if (e.code === 'Comma') return 'Comma'
  if (e.code === 'Period') return 'Period'
  if (e.code === 'Space') return 'Space'
  if (e.code === 'Insert') return 'Insert'
  if (e.code === 'Delete') return 'Delete'
  if (e.code === 'Home') return 'Home'
  if (e.code === 'End') return 'End'
  if (e.code === 'PageUp') return 'PageUp'
  if (e.code === 'PageDown') return 'PageDown'
  if (/^F\d\d?$/.test(e.code)) return e.code
}

function hasKeyboardViewerShortcutMod(
  e: KeyboardEvent,
  mod: 'ctrl' | 'alt' | 'shift' | 'meta'
): boolean {
  if (mod === 'ctrl') return e.ctrlKey
  if (mod === 'alt') return e.altKey
  if (mod === 'shift') return e.shiftKey
  return e.metaKey
}

function isKeyboardViewerToggleKeydown(e: KeyboardEvent): boolean {
  const eventKey = getKeyboardViewerEventShortcutKey(e)
  if (!eventKey) return false

  const mods: ('ctrl' | 'alt' | 'shift' | 'meta')[] = ['ctrl', 'alt', 'shift', 'meta']
  return keyboardViewerToggleShortcuts.some(shortcutStr => {
    const shortcut = parseKeyboardViewerShortcut(shortcutStr)
    if (!shortcut) return false
    if (eventKey !== shortcut.key) return false

    return mods.every(mod => hasKeyboardViewerShortcutMod(e, mod) === shortcut.mods.has(mod))
  })
}

function isKeyboardViewerBlocked(): boolean {
  return !!(Menu.isOpen || Search.active || Windows.reactive.choosing || DnD.reactive.isStarted)
}

function selectActiveTabInActivePanel(): boolean {
  const activePanel = Sidebar.panelsById[Sidebar.activePanelId]
  const activeTab = Tabs.byId[Tabs.activeId]

  if (!Utils.isTabsPanel(activePanel)) return false
  if (!activeTab) return false

  const activeTabIsInPanel =
    activeTab.panelId === activePanel.id ||
    (activeTab.pinned && Settings.state.pinnedTabsPosition !== 'panel')
  if (!activeTabIsInPanel) return false

  Selection.resetSelection()
  Selection.selectTab(activeTab.id)
  Tabs.scrollToTab(activeTab.id, true)
  return true
}

function selectFirstVisibleTabInActivePanel(): void {
  const activePanel = Sidebar.panelsById[Sidebar.activePanelId]
  if (!Utils.isTabsPanel(activePanel)) return

  const tabId = activePanel.reactive.visibleTabIds[0] ?? activePanel.reactive.pinnedTabIds[0]
  if (!tabId) return

  Selection.resetSelection()
  Selection.selectTab(tabId)
  Tabs.scrollToTab(tabId, true)
}

function moveKeyboardViewerTab(dir: 1 | -1): void {
  startKeyboardViewer()
  if (!Selection.isTabs()) selectActiveTabInActivePanel()
  Keybindings.selectNext(dir)
}

function selectKeyboardViewerPanel(): void {
  startKeyboardViewer()
  Selection.resetSelection()
  Selection.selectNavItem(Sidebar.activePanelId)
}

function moveKeyboardViewerPanel(dir: 1 | -1): void {
  startKeyboardViewer()
  Sidebar.selectPanel?.(dir)
}

function enterKeyboardViewerPanel(): void {
  startKeyboardViewer()

  if (!Selection.isNavItem()) return

  const panelId = Selection.getFirst()
  if (!Sidebar.panelsById[panelId]) return
  Sidebar.switchToPanel(panelId, true, true)

  nextTick(() => {
    if (!selectActiveTabInActivePanel()) selectFirstVisibleTabInActivePanel()
  })
}

function cancelKeyboardViewer(notifyPopup = true): void {
  const initialPanelId = keyboardViewerPanelId
  logKeyboardViewer('cancel keyboard viewer', {
    initialPanelId,
    activePanelId: Sidebar.activePanelId,
    notifyPopup,
    activeElement: getKeyboardViewerElementLogInfo(document.activeElement),
  })
  resetKeyboardViewer()
  Selection.resetSelection()
  if (Sidebar.reactive.hiddenPanelsPopup) Sidebar.closeHiddenPanelsPopup(true)
  if (initialPanelId && Sidebar.panelsById[initialPanelId]) {
    Sidebar.switchToPanel(initialPanelId, true, true)
  }
  closeKeyboardViewerSidebar(notifyPopup)
}

async function commitKeyboardViewer(): Promise<boolean> {
  startKeyboardViewer()
  if (!Selection.isTabs()) selectActiveTabInActivePanel()
  if (!Selection.isTabs()) return false

  const tabId = Selection.getFirst()
  const tab = Tabs.byId[tabId]
  if (!tab) return false

  logKeyboardViewer('commit selected tab', {
    selectedTabId: tabId,
    activeTabId: Tabs.activeId,
    tab: getKeyboardViewerSideberyTabLogInfo(tab),
  })
  Sidebar.preserveKeyboardViewerSelection()

  try {
    if (tabId === Tabs.activeId) {
      await loadKeyboardViewerTab(tab)
      return true
    }

    logKeyboardViewer('activating selected tab without pre-activation page capture', { tabId })
    await activateKeyboardViewerTab(tab)
    return true
  } finally {
    refocusKeyboardViewerController()
  }
}

function activateKeyboardViewerTab(tab: Tab): Promise<void> {
  return activateAndLoadKeyboardViewerTab(tab).catch(err => {
    logKeyboardViewer('activate tab failed', {
      tab: getKeyboardViewerSideberyTabLogInfo(tab),
      error: formatKeyboardViewerError(err),
    })
    Logs.err('Sidebar.keyboardViewer: Cannot activate tab:', err)
  })
}

function loadKeyboardViewerTab(tab: Tab): Promise<void> {
  return activateAndLoadKeyboardViewerTab(tab).catch(err => {
    logKeyboardViewer('load unloaded tab failed', {
      tab: getKeyboardViewerSideberyTabLogInfo(tab),
      error: formatKeyboardViewerError(err),
    })
    Logs.err('Sidebar.keyboardViewer: Cannot load unloaded tab:', err)
  })
}

async function activateAndLoadKeyboardViewerTab(tab: Tab): Promise<void> {
  const nativeTab = await browser.tabs.get(tab.id).catch(err => {
    logKeyboardViewer('browser.tabs.get failed before activation', {
      tab: getKeyboardViewerSideberyTabLogInfo(tab),
      error: formatKeyboardViewerError(err),
    })
    return undefined
  })
  const tabInfo = nativeTab ?? tab
  const shouldForceLoad =
    !!(tabInfo.discarded || tab.discarded || tab.reactive.discarded) ||
    isKeyboardViewerBlankUrlPlaceholder(tabInfo, tab)
  const loadUrl = shouldForceLoad ? getKeyboardViewerTabLoadUrl(tabInfo, tab) : undefined

  logKeyboardViewer('activation decision', {
    nativeTab: getKeyboardViewerNativeTabLogInfo(nativeTab),
    sideberyTab: getKeyboardViewerSideberyTabLogInfo(tab),
    shouldForceLoad,
    loadUrl,
  })

  await browser.windows.update(tabInfo.windowId, { focused: true }).catch(err => {
    logKeyboardViewer('browser.windows.update focus failed', {
      windowId: tabInfo.windowId,
      error: formatKeyboardViewerError(err),
    })
  })

  if (tabInfo.hidden) {
    await browser.tabs.show(tab.id).catch(err => {
      logKeyboardViewer('browser.tabs.show failed', {
        tabId: tab.id,
        error: formatKeyboardViewerError(err),
      })
      Logs.err('Sidebar.keyboardViewer: Cannot show unloaded tab:', err)
    })
  }

  if (shouldForceLoad && loadUrl) {
    logKeyboardViewer('activating tab with url', { tabId: tab.id, loadUrl })
    await browser.tabs.update(tab.id, { active: true, url: loadUrl })
    await waitForKeyboardViewerTabLoadKickoff()
  } else if (shouldForceLoad) {
    logKeyboardViewer('activating tab then reloading', { tabId: tab.id })
    await browser.tabs.update(tab.id, { active: true })
    await browser.tabs.reload(tab.id).catch(err => {
      logKeyboardViewer('browser.tabs.reload failed', {
        tabId: tab.id,
        error: formatKeyboardViewerError(err),
      })
      Logs.err('Sidebar.keyboardViewer: Cannot reload unloaded tab:', err)
    })
    await waitForKeyboardViewerTabLoadKickoff()
  } else {
    logKeyboardViewer('activating tab without forced load', { tabId: tab.id })
    await browser.tabs.update(tab.id, { active: true })
  }

  const afterTab = await browser.tabs.get(tab.id).catch(err => {
    logKeyboardViewer('browser.tabs.get failed after activation', {
      tabId: tab.id,
      error: formatKeyboardViewerError(err),
    })
    return undefined
  })
  logKeyboardViewer('activation finished', {
    nativeTab: getKeyboardViewerNativeTabLogInfo(afterTab),
  })
}

function isKeyboardViewerBlankUrlPlaceholder(tab: browser.tabs.Tab, fallbackTab: Tab): boolean {
  const url = Utils.restoreUrl(tab.url) ?? Utils.restoreUrl(fallbackTab.url)
  const title = tab.title?.trim() || fallbackTab.title.trim()
  return url === 'about:blank' && KEYBOARD_VIEWER_URL_WITHOUT_PROTOCOL_RE.test(title)
}

function getKeyboardViewerTabLoadUrl(tab: browser.tabs.Tab, fallbackTab: Tab): string | undefined {
  const url = getKeyboardViewerLoadableUrl(tab.url) ?? getKeyboardViewerLoadableUrl(fallbackTab.url)
  const title = tab.title?.trim() || fallbackTab.title.trim()

  if (url) return url

  if (title) {
    if (/^[a-z][a-z\d+.-]*:/i.test(title)) return title
    if (KEYBOARD_VIEWER_URL_WITHOUT_PROTOCOL_RE.test(title)) return `https://${title}`
  }
}

function getKeyboardViewerLoadableUrl(url: string | undefined): string | undefined {
  const restoredUrl = Utils.restoreUrl(url)
  if (!restoredUrl || restoredUrl === 'about:blank' || restoredUrl === 'about:newtab') return
  return restoredUrl
}

function waitForKeyboardViewerTabLoadKickoff(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 1000))
}

function closeKeyboardViewerSidebar(notifyPopup = true): void {
  logKeyboardViewer('closing keyboard viewer sidebar', { notifyPopup })

  try {
    browser.sidebarAction.close()
    logKeyboardViewer('browser.sidebarAction.close called from sidebar')
  } catch (err) {
    logKeyboardViewer('browser.sidebarAction.close failed from sidebar', {
      error: formatKeyboardViewerError(err),
    })
    Logs.err('Sidebar.keyboardViewer: Cannot close sidebar:', err)
  }

  closeKeyboardViewerController(notifyPopup)
}

function handleKeyboardViewerKeydown(e: KeyboardEvent): boolean {
  if (isKeyboardViewerToggleKeydown(e)) {
    suppressNextKeyboardViewerToggle('sidebar document keydown toggle')
    logKeyboardViewer('handling toggle shortcut as close', {
      event: getKeyboardViewerEventLogInfo(e),
      activeElement: getKeyboardViewerElementLogInfo(document.activeElement),
      target: getKeyboardViewerElementLogInfo(e.target),
      keyboardViewerPanelId,
    })
    return !!handleKeyboardViewerCode('Escape', () => {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
    })
  }

  if (hasKeyboardViewerMods(e)) return false
  if (isKeyboardViewerInputTarget(e)) {
    logKeyboardViewer('ignored non-toggle key from input target', {
      event: getKeyboardViewerEventLogInfo(e),
      activeElement: getKeyboardViewerElementLogInfo(document.activeElement),
      target: getKeyboardViewerElementLogInfo(e.target),
    })
    return false
  }
  if (isKeyboardViewerBlocked()) {
    logKeyboardViewer('ignored key because keyboard viewer is blocked', {
      event: getKeyboardViewerEventLogInfo(e),
      menuOpen: Menu.isOpen,
      searchActive: Search.active,
      choosingWindow: Windows.reactive.choosing,
      dragging: DnD.reactive.isStarted,
    })
    return false
  }

  return !!handleKeyboardViewerCode(e.code, () => {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
  })
}

function handleKeyboardViewerCode(
  code: string,
  preventDefault?: () => void
): Sidebar.KeyboardViewerKeyResponse {
  if (code === 'CloseFromKeyboardViewerController') {
    logKeyboardViewer('handling controller close code', {
      keyboardViewerPanelId,
      activeElement: getKeyboardViewerElementLogInfo(document.activeElement),
    })
    cancelKeyboardViewer(false)
    return 'cancel'
  }

  if (code === 'Escape' && keyboardViewerPanelId !== null) {
    logKeyboardViewer('handling Escape close code', {
      keyboardViewerPanelId,
      activeElement: getKeyboardViewerElementLogInfo(document.activeElement),
    })
    preventDefault?.()
    cancelKeyboardViewer()
    return 'cancel'
  }

  if (isKeyboardViewerBlocked()) return false

  if (code === 'ArrowUp') {
    preventDefault?.()
    if (Selection.isNavItem()) moveKeyboardViewerPanel(-1)
    else moveKeyboardViewerTab(-1)
    return 'handled'
  }

  if (code === 'ArrowDown') {
    preventDefault?.()
    if (Selection.isNavItem()) moveKeyboardViewerPanel(1)
    else moveKeyboardViewerTab(1)
    return 'handled'
  }

  if (code === 'ArrowLeft') {
    preventDefault?.()
    selectKeyboardViewerPanel()
    return 'handled'
  }

  if (code === 'ArrowRight') {
    preventDefault?.()
    enterKeyboardViewerPanel()
    return 'handled'
  }

  if (code === 'Enter') {
    if (Popups.reactive.confirm?.ok) return false
    if (Selection.isNavItem()) {
      preventDefault?.()
      enterKeyboardViewerPanel()
      return 'handled'
    }
    if (keyboardViewerPanelId === null && !Selection.isTabs()) return false
    preventDefault?.()
    return commitKeyboardViewer().then(committed => (committed ? 'commit' : false))
  }

  return false
}

let lastDir: number | undefined
const onWheel = Mouse.getWheelDebouncer(E.WheelDirection.Horizontal, e => {
  if (Menu.isOpen) Menu.close()

  if (e.deltaX !== 0) Mouse.blockWheel(E.WheelDirection.Vertical)
  else return

  if (Settings.state.hScrollAction === 'switch_panels') {
    const dir = e.deltaX > 0 ? 1 : -1

    // Restart debouncer if direction is the same
    const restartDebouncer =
      Settings.state.onePanelSwitchPerScroll && (lastDir === undefined || lastDir === dir)
    lastDir = dir

    return Sidebar.switchPanel(dir, true, false, restartDebouncer)
  } else if (Settings.state.hScrollAction === 'switch_act_tabs') {
    if (e.deltaX > 0) return Tabs.switchToRecentlyActiveTab(Tabs.SwitchingTabScope.global, 1)
    if (e.deltaX < 0) return Tabs.switchToRecentlyActiveTab(Tabs.SwitchingTabScope.global, -1)
  }
})

let leaveTimeout: number | undefined
let subPanelTimeout: number | undefined
function onMouseEnter(): void {
  Mouse.setMouseInState(true)

  Sidebar.switchPanelBackResetTimeout()

  if (leaveTimeout) {
    clearTimeout(leaveTimeout)
    leaveTimeout = undefined
  }

  clearTimeout(subPanelTimeout)
}

function onMouseLeave(): void {
  if (
    Preview.state.status === Preview.Status.Open ||
    Preview.state.status === Preview.Status.Opening
  ) {
    Preview.closePreview()
  }

  // Detect if this event was fired right after drop/dragend
  // so the mouse cursor might actually still be inside the sidebar
  if (DnD.dragEndedRecently || DnD.droppedRecently) return

  Mouse.setMouseInState(false)
  Mouse.stopResizing()

  const activePanel = Sidebar.panelsById[Sidebar.activePanelId]
  if (!Utils.isTabsPanel(activePanel) && activePanel?.tempMode && !Search.active) {
    Sidebar.switchPanelBack(300)
  }

  if (Bookmarks.reactive.popup) return

  if (Mouse.multiSelectionMode) {
    leaveTimeout = setTimeout(() => {
      Mouse.stopMultiSelection()
    }, 250)
  }

  if (Sidebar.subPanelActive && !Search.active && !Menu.isOpen && !DnD.items.length) {
    Sidebar.closeSubPanel()
  }

  if (Sidebar.switchOnMouseLeave) Sidebar.switchPanelOnMouseLeave()
  if (Sidebar.scrollOnMouseLeave) Sidebar.scrollPanelOnMouseLeave()

  if (Tabs.activateSelectedOnMouseLeave && Selection.isTabs()) {
    Tabs.setActivateSelectedOnMouseLeaveState(false)

    const id = Selection.ids()[0]
    const targetTab = Tabs.byId[id]
    if (!targetTab || targetTab.id === Tabs.activeId) return Selection.resetSelection()

    browser.tabs.update(id, { active: true }).catch(err => {
      Logs.err('MouseLeave: Cannot activate tab on mouseleave:', err)
    })
  }
}

function onMouseDown(e: MouseEvent): void {
  Selection.resetSelection()

  if (e.button === 1) {
    Mouse.blockWheel()
    e.preventDefault()
  }
}

function onMouseUp(e: MouseEvent): void {
  Mouse.resetClickLock(120)

  if (e.button === 0 && !e.ctrlKey && !e.shiftKey) {
    Menu.close()
    Selection.resetSelection()
    if (Sidebar.reactive.hiddenPanelsPopup) {
      Sidebar.closeHiddenPanelsPopup()
    }
  }

  const inMultiSelectionMode = Mouse.multiSelectionMode
  if (inMultiSelectionMode) Mouse.stopMultiSelection()

  if (e.button === 1) {
    if (!Settings.state.multipleMiddleClose) return

    if (inMultiSelectionMode && !Settings.state.autoMenuMultiSel && Selection.getLength() > 1) {
      return
    }

    Tabs.removeTabs(Selection.ids())
  } else if (e.button === 2) {
    let type: E.MenuType | undefined
    if (Selection.isBookmarks()) type = E.MenuType.Bookmarks
    if (Selection.isTabs()) type = E.MenuType.Tabs
    if (type === undefined) return
    if (inMultiSelectionMode && !Settings.state.autoMenuMultiSel && Selection.getLength() > 1) {
      return
    }
    Menu.open(type, e.clientX, e.clientY)
  }
}

type PanelPosition = 'left' | 'center' | 'right'
function getPanelPos(i: number, panelId: ID): PanelPosition {
  if (panelId === Sidebar.reactive.activePanelId) return 'center'
  if (i === -1) return 'right'

  const activePanel = Sidebar.panelsById[Sidebar.activePanelId]
  if (activePanel && i > activePanel.index) return 'right'
  else return 'left'
}

let onBSPBDragLeaveTimeout: number | undefined
function onBSPBDragLeave() {
  if (Sidebar.subPanelActive) DnD.reactive.dstType = E.DropType.Bookmarks
  else DnD.reactive.dstType = E.DropType.Nowhere

  clearTimeout(onBSPBDragLeaveTimeout)
  onBSPBDragLeaveTimeout = setTimeout(() => {
    if (Sidebar.subPanelActive) Sidebar.updateBounds()
  }, 120)
}

function onSSPBDragLeave() {
  DnD.reactive.dstType = E.DropType.Nowhere
}
</script>

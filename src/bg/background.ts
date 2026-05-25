import * as E from 'src/enums'
import { NOID } from 'src/defaults'
import * as IPC from 'src/services/ipc'
import * as IPPC from 'src/services/ippc.addon'
import * as Logs from 'src/services/logs'
import * as Settings from 'src/services/settings.bg'
import * as Windows from 'src/services/windows.bg'
import * as Favicons from 'src/services/favicons.bg'
import * as Containers from 'src/services/containers.bg'
import * as Tabs from 'src/services/tabs.bg'
import * as Store from 'src/services/storage.bg'
import * as Permissions from 'src/services/permissions.bg'
import * as Snapshots from 'src/services/snapshots.bg'
import * as Sidebar from 'src/services/sidebar.bg'
import * as Info from 'src/services/info.bg'
import * as Menu from 'src/services/menu.bg'
import * as WebReq from 'src/services/web-req.bg'
import * as Sync from 'src/services/sync.bg'
import * as Omnibox from 'src/services/omnibox.bg'
import * as Styles from 'src/services/styles.bg'

void (async function main() {
  markLocalStorage()

  Info.setInstanceType(E.InstanceType.bg)
  IPC.setInstanceType(E.InstanceType.bg)
  IPPC.setInstanceType(E.InstanceType.bg)
  Logs.setInstanceType(E.InstanceType.bg)

  const ts = performance.now()
  Logs.info('Init start')

  // Register globaly available actions
  IPC.registerActions({
    cacheTabsData: Tabs.cacheTabsData,
    getGroupPageInitData: Tabs.getGroupPageInitData,
    getPlaceholderPageInitData: Tabs.getPlaceholderPageInitData,
    tabsApiProxy: Tabs.tabsApiProxy,
    getSidebarTabs: Tabs.getSidebarTabs,
    detachSidebarTabs: Tabs.detachSidebarTabs,
    openTabs: Tabs.openTabs,
    setActivePanelId: Sidebar.setActivePanelId,
    createSnapshot: Snapshots.createSnapshot,
    addSnapshot: Snapshots.addSnapshot,
    removeSnapshot: Snapshots.removeSnapshot,
    openSnapshotWindows: Snapshots.openWindows,
    createWindowWithTabs: Windows.createWithTabs,
    isWindowTabsLocked: Windows.isWindowTabsLocked,
    saveFavicon: Favicons.saveFavicon,
    reloadFavicons: Favicons.load,
    saveInLocalStorage: Store.setFromRemoteFg,
    checkIpInfo: WebReq.checkIpInfo,
    disableAutoReopening: WebReq.disableAutoReopening,
    enableAutoReopening: WebReq.enableAutoReopening,

    saveToSync: Sync.save,
    saveTabsToSync: Sync.saveTabs,
    saveProfileInfoToGoogleSync: Sync.Google.saveProfileInfo,
    removeFromSync: Sync.remove,
    removeFromFirefoxSync: Sync.Firefox.remove,
    removeByTypeFromSync: Sync.removeByType,
    removeCachedIdFromGoogleSync: Sync.Google.removeCachedId,
    getDataFromSync: Sync.getData,
    loadSync: Sync.load,

    getContainers: Containers.getContainers,
    setContainers: Containers.setContainers,
    createContainer: Containers.createAndSave,
    removeContainer: Containers.removeAndSave,
    importContainers: Containers.importContainers,
  })

  // Init first-need stuff
  IPC.setupGlobalMessageListener()
  IPC.setupConnectionListener()
  setupKeyboardViewerMessageListener()
  await migrateKeyboardViewerToggleShortcut()
  await Promise.all([Windows.load(), Containers.load(), Settings.load(), Info.loadVersionInfo()])

  Info.saveVersion()
  Windows.setupWindowsListeners()
  Settings.setupSettingsChangeListener()

  await Sidebar.load()
  Sidebar.setupListeners()

  WebReq.updateReqHandlers()

  Tabs.setupListeners()
  await Tabs.load()

  Permissions.load()
  Permissions.setupListeners()
  Favicons.load()
  Menu.setupListeners()
  Snapshots.scheduleSnapshots()

  // Update title preface on sidebar connection/disconnection
  IPC.onConnected(E.InstanceType.sidebar, winId => {
    Logs.info('IPC.onConnected sidebar', winId)

    const tabs = Windows.byId.get(winId)?.tabs
    if (tabs) Tabs.initInternalPageScripts(tabs)

    if (Settings.state.markWindow && winId !== NOID) {
      IPC.sendToSidebar(winId, 'updWindowPreface')
    }
  })
  IPC.onDisconnected(E.InstanceType.sidebar, winId => {
    Logs.info('IPC.onDisconnected sidebar', winId)

    if (Settings.state.markWindow && Windows.byId.has(winId)) {
      browser.windows.update(winId, { titlePreface: '' })
    }
  })

  initToolbarButton()
  Styles.load()
  Styles.setupListeners()

  browser.runtime.onUpdateAvailable.addListener(details => {
    const currentVersion = Info.versionToInt(browser.runtime.getManifest().version)
    const newVersion = Info.versionToInt(details.version)
    if (newVersion <= currentVersion) browser.runtime.reload()
  })

  Omnibox.setupListeners()
  Omnibox.load()

  Logs.info(`Init end: ${performance.now() - ts}ms`)

  window.getSideberyState = () => {
    return {
      profileId: Info.getProfileId(),
      Windows: {
        byId: Windows.byId,
      },
      Tabs: {
        byId: Tabs.byId,
        cacheByWin: Tabs.cacheByWin,
      },
    }
  }
})()

function initToolbarButton(): void {
  Menu.createBrowserActionMenu()

  browser.browserAction.onClicked.addListener((_, info): void => {
    if (info && info.button === 1) browser.runtime.openOptionsPage()
    else browser.sidebarAction.toggle()
  })
}

function markLocalStorage() {
  localStorage.setItem('sdbr', '+')
}

const KEYBOARD_VIEWER_NATIVE_TOGGLE_COMMAND = '_execute_sidebar_action'
const KEYBOARD_VIEWER_DEFAULT_TOGGLE_SHORTCUT = 'Alt+1'
const KEYBOARD_VIEWER_OLD_DEFAULT_TOGGLE_SHORTCUTS = new Set(['Ctrl+E', 'MacCtrl+E', 'F1'])
const KEYBOARD_VIEWER_DIAGNOSTIC_MARKER = 'native-only-2026-05-24-1908'
const KEYBOARD_VIEWER_LOG_BUFFER_LIMIT = 200
const KEYBOARD_VIEWER_STORAGE_LOG_KEY = 'keyboardViewerDebugLog'
const KEYBOARD_VIEWER_STORAGE_LOG_UPDATED_KEY = 'keyboardViewerDebugLogUpdatedAt'
const keyboardViewerLogBuffer: string[] = []
let keyboardViewerLogSaveTimeout: number | undefined
let keyboardViewerLogCopyTimeout: number | undefined

function logKeyboardViewer(message: string, data?: unknown, winId?: ID): void {
  Logs.info('Sidebar.keyboardViewer:', message, data)
  appendKeyboardViewerBufferedLog(`background: ${message}`, data)
  browser.runtime
    .sendMessage({
      type: 'sideberyKeyboardViewerLog',
      winId,
      message: `background: ${message}`,
      data,
    })
    .catch(() => {})
}

function appendKeyboardViewerBufferedLog(message: string, data?: unknown): void {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false })
  const renderedData = data === undefined ? '' : ` ${formatKeyboardViewerLogData(data)}`
  keyboardViewerLogBuffer.push(`${timestamp} ${message}${renderedData}`)
  if (keyboardViewerLogBuffer.length > KEYBOARD_VIEWER_LOG_BUFFER_LIMIT) {
    keyboardViewerLogBuffer.splice(
      0,
      keyboardViewerLogBuffer.length - KEYBOARD_VIEWER_LOG_BUFFER_LIMIT
    )
  }
  scheduleKeyboardViewerLogPersistence()
  scheduleKeyboardViewerLogClipboardCopy()
}

function formatKeyboardViewerLogData(data: unknown): string {
  if (data instanceof Error) return `${data.name}: ${data.message}`
  if (typeof data === 'string') return data

  try {
    return JSON.stringify(data)
  } catch {
    return String(data)
  }
}

function scheduleKeyboardViewerLogPersistence(): void {
  clearTimeout(keyboardViewerLogSaveTimeout)
  keyboardViewerLogSaveTimeout = setTimeout(() => {
    browser.storage.local
      .set({
        [KEYBOARD_VIEWER_STORAGE_LOG_KEY]: keyboardViewerLogBuffer.join('\n'),
        [KEYBOARD_VIEWER_STORAGE_LOG_UPDATED_KEY]: Date.now(),
      })
      .catch(() => {})
  }, 100)
}

function scheduleKeyboardViewerLogClipboardCopy(): void {
  clearTimeout(keyboardViewerLogCopyTimeout)
  keyboardViewerLogCopyTimeout = setTimeout(() => {
    writeKeyboardViewerLogToClipboard(keyboardViewerLogBuffer.join('\n')).catch(() => {})
  }, 250)
}

async function writeKeyboardViewerLogToClipboard(text: string): Promise<void> {
  if (!text) return

  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    // Fall through to execCommand for extension pages where navigator.clipboard is unavailable.
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    document.execCommand('copy')
  } finally {
    textarea.remove()
  }
}

function setupKeyboardViewerMessageListener(): void {
  browser.runtime.onMessage.addListener(
    (
      msg: { type?: string; code?: unknown; winId?: unknown; message?: unknown; data?: unknown },
      sender: { tab?: { windowId?: ID }; url?: string }
    ) => {
      if (!msg) return

      if (msg.type === 'sideberyKeyboardViewerGetLogs') {
        return Promise.resolve({
          marker: KEYBOARD_VIEWER_DIAGNOSTIC_MARKER,
          lines: keyboardViewerLogBuffer,
        })
      }

      if (msg.type === 'sideberyKeyboardViewerLog') {
        appendKeyboardViewerBufferedLog(
          typeof msg.message === 'string' ? msg.message : 'external log',
          {
            data: msg.data,
            msgWinId: msg.winId,
            senderWinId: sender.tab?.windowId,
            senderUrl: sender.url,
          }
        )
        return
      }

      if (msg.type === 'sideberyKeyboardViewerSuppressNextToggle') {
        const winIds = getKeyboardViewerCommandWinIds(
          typeof msg.winId === 'number' ? msg.winId : sender.tab?.windowId
        )
        logKeyboardViewer('suppress next toggle requested', { msg, sender, winIds })
        return
      }

      if (msg.type === 'sideberyKeyboardViewerCloseRequest') {
        const requestedWinId = typeof msg.winId === 'number' ? msg.winId : undefined
        const winIds = getKeyboardViewerCommandWinIds(requestedWinId)
        logKeyboardViewer('close request received', { msg, winIds }, requestedWinId)
        return closeKeyboardViewerInWindows(winIds, true)
      }

      if (msg.type !== 'sideberyKeyboardViewerKey') return
      if (typeof msg.code !== 'string') return

      const winId = typeof msg.winId === 'number' ? msg.winId : sender.tab?.windowId
      if (winId === undefined) return

      logKeyboardViewer(
        'key message received',
        {
          code: msg.code,
          msgWinId: msg.winId,
          senderWinId: sender.tab?.windowId,
          targetWinId: winId,
        },
        winId
      )
      return IPC.sidebar(winId, 'onKeyboardViewerKey', msg.code).catch(() => false)
    }
  )
}

async function migrateKeyboardViewerToggleShortcut(): Promise<void> {
  const commands = await browser.commands.getAll().catch(() => [])
  const nativeToggleCmd = commands.find(cmd => cmd.name === KEYBOARD_VIEWER_NATIVE_TOGGLE_COMMAND)
  const nativeTargetShortcut =
    !nativeToggleCmd?.shortcut ||
    KEYBOARD_VIEWER_OLD_DEFAULT_TOGGLE_SHORTCUTS.has(nativeToggleCmd.shortcut)
      ? KEYBOARD_VIEWER_DEFAULT_TOGGLE_SHORTCUT
      : ''

  if (nativeTargetShortcut && nativeToggleCmd?.shortcut !== nativeTargetShortcut) {
    await browser.commands
      .update({ name: KEYBOARD_VIEWER_NATIVE_TOGGLE_COMMAND, shortcut: nativeTargetShortcut })
      .catch(err => {
        Logs.err('Sidebar.keyboardViewer: Cannot migrate native sidebar shortcut:', err)
      })
  }

  await logKeyboardViewerCommandDiagnostics('startup after shortcut migration')
}

async function logKeyboardViewerCommandDiagnostics(reason: string): Promise<void> {
  const commands = await browser.commands.getAll().catch(err => {
    logKeyboardViewer('command diagnostics getAll failed', {
      reason,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    })
    return []
  })
  const manifest = browser.runtime.getManifest()

  logKeyboardViewer('command diagnostics', {
    reason,
    marker: KEYBOARD_VIEWER_DIAGNOSTIC_MARKER,
    extensionUrl: browser.runtime.getURL(''),
    version: manifest.version,
    manifestCommands: manifest.commands,
    runtimeCommands: commands.map(cmd => ({
      name: cmd.name,
      shortcut: cmd.shortcut,
      description: cmd.description,
    })),
    winIds: getKeyboardViewerCommandWinIds(),
  })
}

async function closeKeyboardViewerInWindows(winIds: ID[], forceClose: boolean): Promise<boolean> {
  for (const winId of winIds) {
    logKeyboardViewer('close in window attempt', { winId, forceClose }, winId)
    if (forceClose) {
      const result = await IPC.sidebar(
        winId,
        'onKeyboardViewerKey',
        'CloseFromKeyboardViewerController'
      ).catch(() => false)
      logKeyboardViewer('close in window forced controller close result', { winId, result }, winId)
      await closeKeyboardViewerWindow(winId)
      return true
    }

    const result = await IPC.sidebar(winId, 'onKeyboardViewerKey', 'Escape').catch(() => false)
    logKeyboardViewer('close in window Escape result', { winId, result }, winId)
    if (result === 'cancel') {
      await closeKeyboardViewerWindow(winId)
      return true
    }
  }

  return false
}

async function closeKeyboardViewerWindow(winId: ID): Promise<void> {
  logKeyboardViewer('closing controller and sidebar window', { winId }, winId)

  await browser.windows.update(winId, { focused: true }).catch(() => undefined)

  try {
    browser.sidebarAction.close()
    logKeyboardViewer('browser.sidebarAction.close called from background', { winId }, winId)
  } catch (err) {
    logKeyboardViewer(
      'browser.sidebarAction.close failed from background',
      { winId, error: err instanceof Error ? `${err.name}: ${err.message}` : String(err) },
      winId
    )
    Logs.err('Sidebar.keyboardViewer: Cannot close sidebar from background:', err)
  }

  await new Promise(resolve => setTimeout(resolve, 150))
  browser.runtime.sendMessage({ type: 'sideberyKeyboardViewerClose', winId }).catch(() => {})
}

function getKeyboardViewerCommandWinIds(preferredWinId?: ID): ID[] {
  const winIds = [preferredWinId, Windows.focusedId, Windows.lastFocusedId, ...Windows.byId.keys()]
  return [...new Set(winIds)].filter((winId): winId is ID => {
    return winId !== undefined && winId !== NOID
  })
}

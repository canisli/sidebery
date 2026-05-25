import { KEYBOARD_VIEWER_DEBUG_LOGGING } from 'src/services/keyboard-viewer-debug'
import * as Settings from 'src/services/settings'

type KeyboardViewerKeyResult = 'handled' | 'commit' | 'cancel' | false
type ShortcutPart = 'ctrl' | 'alt' | 'shift' | 'meta'

interface KeyboardViewerShortcut {
  key: string
  mods: Set<ShortcutPart>
}

interface KeyboardViewerBufferedLogsResponse {
  marker?: string
  lines?: string[]
}

const CAPTURED_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Enter',
  'Escape',
])
const params = new URLSearchParams(location.search)
const targetWinId = Number(params.get('winId'))
const controllerSessionId = params.get('session') ?? ''
const keyCatcher = document.getElementById('key_catcher')
const logEl = document.getElementById('keyboard_log')
const copyLogBtn = document.getElementById('copy_log_btn') as HTMLButtonElement | null
const KEYBOARD_VIEWER_TOGGLE_COMMAND = '_execute_sidebar_action'
const KEYBOARD_VIEWER_STORAGE_LOG_KEY = 'keyboardViewerDebugLog'
const KEYBOARD_VIEWER_STORAGE_LOG_UPDATED_KEY = 'keyboardViewerDebugLogUpdatedAt'
const SIDEBAR_CLOSED_CONFIRMATION_POLLS = 4
let toggleSidebarShortcuts: KeyboardViewerShortcut[] = []
const intervals = { sidebarOpen: 0 }
let closing = false
let closeRequestPending = false
let focusPausedUntil = 0
let logLines: string[] = []
let copyLogStatusTimeout: number | undefined
let autoCopyLogTimeout: number | undefined
let persistLogTimeout: number | undefined
let shortcutClosePending = false
let sidebarClosedPolls = 0
let settingsLoaded: Promise<void> = Promise.resolve()

function getSingleShortcutKey(e: KeyboardEvent): string | undefined {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return

  if (e.code.startsWith('Digit')) return e.code.slice(5)
  if (e.code.startsWith('Key')) return e.code.slice(3)
  if (e.key === ',') return 'Comma'
  if (e.key === '.') return 'Period'
  if (e.key === ' ') return 'Space'
}

function isMarkModeShortcut(e: KeyboardEvent): boolean {
  const key = getSingleShortcutKey(e)
  if (!key) return false

  return Settings.state.kbMarkPinnedTabs.split(/\s+/).includes(key)
}

function logKeyboardViewer(message: string, data?: unknown): void {
  if (!KEYBOARD_VIEWER_DEBUG_LOGGING) return

  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false })
  const renderedData = data === undefined ? '' : ` ${formatLogData(data)}`
  const line = `${timestamp} ${message}${renderedData}`

  console.warn('[Sidebery keyboard viewer]', message, data ?? '')
  logLines = [...logLines.slice(-79), line]
  if (logEl) logEl.textContent = logLines.join('\n')
  scheduleLogPersistence()
  scheduleLogAutoCopy()
  browser.runtime
    .sendMessage({
      type: 'sideberyKeyboardViewerLog',
      source: 'keyboard-popup',
      winId: targetWinId,
      message: `popup: ${message}`,
      data,
    })
    .catch(() => {})
}

function importBufferedLogLines(lines: string[]): void {
  if (!KEYBOARD_VIEWER_DEBUG_LOGGING) return
  if (!lines.length) return

  logLines = [...lines.slice(-60), ...logLines].slice(-80)
  if (logEl) logEl.textContent = logLines.join('\n')
}

async function loadBackgroundLogs(): Promise<void> {
  if (!KEYBOARD_VIEWER_DEBUG_LOGGING) return

  const response = (await browser.runtime
    .sendMessage({ type: 'sideberyKeyboardViewerGetLogs' })
    .catch(err => {
      logKeyboardViewer('cannot load background log buffer', err)
      return null
    })) as KeyboardViewerBufferedLogsResponse | null

  if (!response?.lines) return
  importBufferedLogLines(response.lines)
  logKeyboardViewer('loaded background log buffer', {
    marker: response.marker,
    lines: response.lines.length,
  })
}

function scheduleLogPersistence(): void {
  clearTimeout(persistLogTimeout)
  persistLogTimeout = setTimeout(() => {
    browser.storage.local
      .set({
        [KEYBOARD_VIEWER_STORAGE_LOG_KEY]: logLines.join('\n'),
        [KEYBOARD_VIEWER_STORAGE_LOG_UPDATED_KEY]: Date.now(),
      })
      .catch(() => {})
  }, 100)
}

function scheduleLogAutoCopy(): void {
  clearTimeout(autoCopyLogTimeout)
  autoCopyLogTimeout = setTimeout(() => {
    writeLogToClipboard().catch(() => {})
  }, 250)
}

function formatLogData(data: unknown): string {
  if (data instanceof Error) return `${data.name}: ${data.message}`
  if (typeof data === 'string') return data

  try {
    return JSON.stringify(data)
  } catch {
    return String(data)
  }
}

async function copyLog(): Promise<void> {
  if (!copyLogBtn) return

  await writeLogToClipboard()
  logKeyboardViewer('copied log to clipboard', { lines: logLines.length })
  showCopyLogStatus('Copied')
}

async function copyLogBeforeClose(): Promise<void> {
  if (!logLines.length) return

  logKeyboardViewer('copying log to clipboard before close', { lines: logLines.length })
  await writeLogToClipboard()
  logKeyboardViewer('copied log to clipboard before close', { lines: logLines.length })
}

async function writeLogToClipboard(): Promise<void> {
  await writeTextToClipboard(logLines.join('\n'))
}

async function writeTextToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch (err) {
    logKeyboardViewer('navigator.clipboard.writeText failed, trying execCommand', err)
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
    if (!document.execCommand('copy')) {
      throw new Error('document.execCommand("copy") returned false')
    }
  } finally {
    textarea.remove()
  }
}

function showCopyLogStatus(label: string): void {
  if (!copyLogBtn) return

  clearTimeout(copyLogStatusTimeout)
  copyLogBtn.textContent = label
  copyLogStatusTimeout = setTimeout(() => {
    copyLogBtn.textContent = 'Copy'
  }, 1200)
}

function isCopyLogButtonTarget(target: EventTarget | null): boolean {
  return !!copyLogBtn && target instanceof Node && copyLogBtn.contains(target)
}

function focusController(): void {
  if (closing) return
  if (Date.now() < focusPausedUntil) return

  window.focus()
  keyCatcher?.focus({ preventScroll: true })
}

function pauseControllerFocus(duration = 8000): void {
  focusPausedUntil = Date.now() + duration
}

function resumeControllerFocus(): void {
  focusPausedUntil = 0
}

function closeController(): void {
  if (closing) return

  logKeyboardViewer('closing controller')
  closing = true
  if (intervals.sidebarOpen) clearInterval(intervals.sidebarOpen)

  copyLogBeforeClose()
    .catch(err => {
      logKeyboardViewer('copy log before close failed', err)
    })
    .finally(() => {
      window.close()
    })
}

function closeSidebarFromUserAction(): void {
  try {
    logKeyboardViewer('focusing target window before popup user-action close', { targetWinId })
    if (Number.isFinite(targetWinId)) browser.windows.update(targetWinId, { focused: true })
  } catch (err) {
    logKeyboardViewer('browser.windows.update target focus failed', err)
  }

  try {
    logKeyboardViewer('closing sidebar from popup user action')
    browser.sidebarAction.close()
  } catch (err) {
    logKeyboardViewer('browser.sidebarAction.close failed', err)
    // Closing the sidebar is best-effort; Firefox restricts this to user actions.
  }
}

async function sendKey(code: string): Promise<KeyboardViewerKeyResult> {
  if (!Number.isFinite(targetWinId)) {
    logKeyboardViewer('not sending key: missing target window id', { code, targetWinId })
    return false
  }

  const response = browser.runtime
    .sendMessage({
      type: 'sideberyKeyboardViewerKey',
      winId: targetWinId,
      code,
    })
    .catch(err => {
      logKeyboardViewer('send key failed', { code, error: formatLogData(err) })
      return false
    }) as Promise<KeyboardViewerKeyResult>

  return response
}

async function requestCloseKeyboardViewer(): Promise<void> {
  if (!Number.isFinite(targetWinId)) {
    logKeyboardViewer('not requesting close: missing target window id', { targetWinId })
    return
  }

  closeRequestPending = true
  try {
    await browser.runtime
      .sendMessage({
        type: 'sideberyKeyboardViewerSuppressNextToggle',
        winId: targetWinId,
        session: controllerSessionId,
        reason: 'popup close request',
      })
      .catch(err => {
        logKeyboardViewer('suppress next toggle request failed', err)
        return false
      })

    await browser.runtime
      .sendMessage({
        type: 'sideberyKeyboardViewerCloseRequest',
        winId: targetWinId,
        session: controllerSessionId,
      })
      .catch(err => {
        logKeyboardViewer('close request failed', err)
        return false
      })
  } finally {
    closeRequestPending = false
  }
}

function parseShortcut(shortcut: string | undefined): KeyboardViewerShortcut | undefined {
  if (!shortcut) return

  const parts = shortcut.split('+')
  const key = parts.pop()
  if (!key) return

  const mods = new Set<ShortcutPart>()
  for (const part of parts) {
    if (part === 'Alt') mods.add('alt')
    else if (part === 'Shift') mods.add('shift')
    else if (part === 'Ctrl' || part === 'MacCtrl') mods.add('ctrl')
    else if (part === 'Command') mods.add('meta')
  }

  return { key: normalizeShortcutKey(key), mods }
}

function normalizeShortcutKey(key: string): string {
  if (key.startsWith('Digit')) return key.slice(5)
  if (key.startsWith('Numpad')) return key.slice(6)
  if (key.startsWith('Arrow')) return key.slice(5)
  return key
}

function getEventShortcutKey(e: KeyboardEvent): string | undefined {
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

function hasMod(e: KeyboardEvent, mod: ShortcutPart): boolean {
  if (mod === 'ctrl') return e.ctrlKey
  if (mod === 'alt') return e.altKey
  if (mod === 'shift') return e.shiftKey
  return e.metaKey
}

function isToggleSidebarShortcut(e: KeyboardEvent): boolean {
  const eventKey = getEventShortcutKey(e)
  if (!eventKey) return false

  const mods: ShortcutPart[] = ['ctrl', 'alt', 'shift', 'meta']
  return toggleSidebarShortcuts.some(shortcut => {
    if (eventKey !== shortcut.key) return false

    return mods.every(mod => hasMod(e, mod) === shortcut.mods.has(mod))
  })
}

async function cancelKeyboardViewer(): Promise<void> {
  logKeyboardViewer('cancel requested')
  closeSidebarFromUserAction()
  await requestCloseKeyboardViewer()
  await waitForKeyboardViewerCloseLogs()
  closeController()
}

function closeKeyboardViewerFromShortcut(): void {
  logKeyboardViewer('shortcut close requested')
  shortcutClosePending = true
  closeSidebarFromUserAction()
  requestCloseKeyboardViewer()
    .catch(err => {
      logKeyboardViewer('shortcut close request failed', err)
    })
    .finally(() => {
      waitForKeyboardViewerCloseLogs().then(closeController)
    })
}

function waitForKeyboardViewerCloseLogs(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 150))
}

async function closeIfSidebarClosed(): Promise<void> {
  if (!Number.isFinite(targetWinId)) return

  const isOpen = await browser.sidebarAction.isOpen({ windowId: targetWinId }).catch(() => true)
  if (isOpen) {
    sidebarClosedPolls = 0
    if (shortcutClosePending) logKeyboardViewer('shortcut close poll', { isOpen })
    return
  }

  if (shortcutClosePending) {
    logKeyboardViewer('shortcut close poll', { isOpen })
    shortcutClosePending = false
    sidebarClosedPolls = 0
  }

  if (closeRequestPending) {
    logKeyboardViewer('sidebar is closed; waiting for close request to finish')
    return
  }

  sidebarClosedPolls++
  if (sidebarClosedPolls < SIDEBAR_CLOSED_CONFIRMATION_POLLS) {
    logKeyboardViewer('sidebar closed poll not yet confirmed', {
      polls: sidebarClosedPolls,
      required: SIDEBAR_CLOSED_CONFIRMATION_POLLS,
    })
    return
  }

  logKeyboardViewer('sidebar is closed; closing controller')
  closeController()
}

document.addEventListener(
  'keydown',
  async (e: KeyboardEvent) => {
    if (isCopyLogButtonTarget(e.target)) return

    logKeyboardViewer('keydown', {
      key: e.key,
      code: e.code,
      alt: e.altKey,
      ctrl: e.ctrlKey,
      meta: e.metaKey,
      shift: e.shiftKey,
      targetWinId,
    })

    if (isToggleSidebarShortcut(e)) {
      logKeyboardViewer('matched toggle shortcut')
      e.preventDefault()
      e.stopPropagation()
      closeKeyboardViewerFromShortcut()
      return
    }

    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
      logKeyboardViewer('ignored modified key', { code: e.code })
      return
    }
    await settingsLoaded
    if (!CAPTURED_KEYS.has(e.code) && !isMarkModeShortcut(e)) {
      logKeyboardViewer('ignored uncaptured key', { code: e.code })
      return
    }

    e.preventDefault()
    e.stopPropagation()

    if (e.code === 'Enter') pauseControllerFocus()
    const result = await sendKey(e.code)
    logKeyboardViewer('sidebar key result', { code: e.code, result })
    resumeControllerFocus()

    if (result === 'cancel') closeController()
    else focusController()
  },
  true
)

browser.runtime.onMessage.addListener(
  (msg: {
    type?: string
    source?: unknown
    winId?: unknown
    session?: unknown
    message?: unknown
    data?: unknown
  }) => {
    if (!msg) return
    if (msg.source === 'keyboard-popup') return
    if (typeof msg.winId === 'number' && msg.winId !== targetWinId) return
    if (typeof msg.session === 'string' && msg.session !== controllerSessionId) return

    if (msg.type === 'sideberyKeyboardViewerLog') {
      logKeyboardViewer(
        typeof msg.message === 'string' ? `sidebar: ${msg.message}` : 'sidebar log',
        msg.data
      )
      return
    }

    if (msg.type !== 'sideberyKeyboardViewerClose') return

    logKeyboardViewer('close message received')
    closeController()
  }
)

copyLogBtn?.addEventListener('click', e => {
  e.preventDefault()
  e.stopPropagation()

  copyLog()
    .catch(err => {
      logKeyboardViewer('copy log failed', err)
      showCopyLogStatus('Failed')
    })
    .finally(() => focusController())
})

window.addEventListener('blur', () => {
  if (!closing) setTimeout(focusController, 0)
})

let focusAttempts = 0
const focusInterval = setInterval(() => {
  focusController()
  focusAttempts++
  if (document.hasFocus() || focusAttempts >= 40) clearInterval(focusInterval)
}, 25)
focusController()
settingsLoaded = Settings.load().catch(err => {
  logKeyboardViewer('settings load failed', err)
})
if (KEYBOARD_VIEWER_DEBUG_LOGGING) {
  loadBackgroundLogs().catch(err => {
    logKeyboardViewer('background log buffer load failed', err)
  })
}
logKeyboardViewer('controller started', { targetWinId, controllerSessionId })
intervals.sidebarOpen = setInterval(() => {
  closeIfSidebarClosed()
}, 250)

browser.commands
  .getAll()
  .then(commands => {
    toggleSidebarShortcuts = commands
      .filter(cmd => {
        return cmd.name === KEYBOARD_VIEWER_TOGGLE_COMMAND && !!cmd.shortcut
      })
      .map(cmd => parseShortcut(cmd.shortcut))
      .filter((shortcut): shortcut is KeyboardViewerShortcut => !!shortcut)
    logKeyboardViewer('loaded toggle shortcuts', {
      commands: commands.map(cmd => ({
        name: cmd.name,
        shortcut: cmd.shortcut,
        description: cmd.description,
      })),
      targetCommand: KEYBOARD_VIEWER_TOGGLE_COMMAND,
      parsed: toggleSidebarShortcuts.map(shortcut => ({
        key: shortcut.key,
        mods: Array.from(shortcut.mods),
      })),
    })
  })
  .catch(err => {
    logKeyboardViewer('cannot load commands', err)
  })

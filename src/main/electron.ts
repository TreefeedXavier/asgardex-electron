import { join } from 'path'

import { BrowserWindow, app, ipcMain, nativeImage } from 'electron'
import electronDebug from 'electron-debug'
import isDev from 'electron-is-dev'
import log from 'electron-log'
import { warn } from 'electron-log'
import windowStateKeeper from 'electron-window-state'
import * as E from 'fp-ts/lib/Either'
import * as FP from 'fp-ts/lib/function'

import {
  IPCLedgerAddressesIO,
  ipcKeystoreWalletsIO,
  ipcLedgerApproveERC20TokenParamsIO,
  ipcLedgerDepositTxParamsIO,
  ipcLedgerSendTxParamsIO
} from '../shared/api/io'
import type { IPCExportKeystoreParams, IPCLedgerAdddressParams, StoreFileName } from '../shared/api/types'
import { DEFAULT_STORAGES } from '../shared/const'
import type { Locale } from '../shared/i18n/types'
import { registerAppCheckUpdatedHandler } from './api/appUpdate'
import { getFileStoreService } from './api/fileStore'
import { exportKeystore, initKeystoreWallets, loadKeystore, saveKeystoreWallets } from './api/keystore'
import {
  getAddress as getLedgerAddress,
  sendTx as sendLedgerTx,
  deposit as depositLedgerTx,
  verifyLedgerAddress,
  getAddresses as getLedgerAddresses,
  saveAddresses as saveLedgerAddresses
} from './api/ledger'
import { approveLedgerERC20Token } from './api/ledger/ethereum/approve'
import IPCMessages from './ipc/messages'
import { setMenu } from './menu'

export const IS_DEV = isDev && process.env.NODE_ENV !== 'production'
export const PORT = process.env.PORT || 3000

export const APP_ROOT = join(__dirname, '..', '..')

const BASE_URL_DEV = `http://localhost:${PORT}`
const BASE_URL_PROD = `file://${join(__dirname, '../build/index.html')}`
// use dev server for hot reload or file in production
export const BASE_URL = IS_DEV ? BASE_URL_DEV : BASE_URL_PROD
// Application icon
const APP_ICON = join(APP_ROOT, 'resources', process.platform.match('win32') ? 'icon.ico' : 'icon.png')

const initLogger = () => {
  log.transports.file.resolvePath = (variables: log.PathVariables) => {
    // Logs go into ~/.config/{appName}/logs/ dir
    const path = join(app.getPath('userData'), 'logs', variables.fileName as string)
    return path
  }
}

// set global configuration for logging
initLogger()

// disable the Electron Security Warnings shown when access the dev url
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = `${IS_DEV}`

log.debug(`Starting Electron main process`)

// Enable keyboard shortcuts and optionally activate DevTools on each created `BrowserWindow`.
electronDebug({ isEnabled: IS_DEV })

let mainWindow: BrowserWindow | null = null

const activateHandler = () => {
  if (mainWindow === null) {
    initMainWindow()
  }
}

const allClosedHandler = () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
}

const closeHandler = () => {
  mainWindow = null
}

const setupDevEnv = async () => {
  const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer')
  try {
    await installExtension(REACT_DEVELOPER_TOOLS)
  } catch (e) {
    warn('unable to install devtools', e)
  }
}

const initMainWindow = async () => {
  const mainWindowState = windowStateKeeper({
    defaultWidth: IS_DEV ? 1600 : 1200,
    defaultHeight: IS_DEV ? 1000 : 800
  })

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    icon: nativeImage.createFromPath(APP_ICON),
    webPreferences: {
      // Disable Node.js integration
      // This recommendation is the default behavior in Electron since 5.0.0.
      // ^ https://www.electronjs.org/docs/tutorial/security#2-do-not-enable-nodejs-integration-for-remote-content
      nodeIntegration: false,
      // Context Isolation
      // ^ https://www.electronjs.org/docs/tutorial/context-isolation
      // From Electron 12, it will be enabled by default.
      contextIsolation: true,
      // preload script
      preload: join(__dirname, IS_DEV ? '../../public/' : '../build/', 'preload.js'),
      // for develop locally only to avoid CORS issues
      webSecurity: !IS_DEV,
      // `allowRunningInsecureContent` needs to set to `true`,
      // it will be changed to `false` whenever `webSecurity` is `true`
      // @see https://www.electronjs.org/docs/latest/api/browser-window#new-browserwindowoptions
      allowRunningInsecureContent: false
    }
  })

  mainWindowState.manage(mainWindow)
  mainWindow.on('closed', closeHandler)
  mainWindow.loadURL(BASE_URL)
  // hide menu at start, we need to wait for locale sent by `ipcRenderer`
  mainWindow.setMenuBarVisibility(false)
}

const langChangeHandler = (locale: Locale) => {
  setMenu(locale, IS_DEV)
  // show menu, which is hided at start
  if (mainWindow && !mainWindow.isMenuBarVisible()) {
    mainWindow.setMenuBarVisibility(true)
  }
}

const initIPC = () => {
  // Lang
  ipcMain.on(IPCMessages.UPDATE_LANG, (_, locale: Locale) => langChangeHandler(locale))
  // Keystore
  ipcMain.handle(IPCMessages.SAVE_KEYSTORE_WALLETS, async (_, params: unknown) => {
    return FP.pipe(
      // params need to be decoded
      ipcKeystoreWalletsIO.decode(params),
      E.fold(
        (e) => Promise.reject(e),
        (wallets) => saveKeystoreWallets(wallets)()
      )
    )
  })
  ipcMain.handle(IPCMessages.EXPORT_KEYSTORE, async (_, params: IPCExportKeystoreParams) => exportKeystore(params))
  ipcMain.handle(IPCMessages.LOAD_KEYSTORE, async () => loadKeystore())
  ipcMain.handle(IPCMessages.INIT_KEYSTORE_WALLETS, async () => initKeystoreWallets())
  // Ledger
  ipcMain.handle(IPCMessages.GET_LEDGER_ADDRESS, async (_, params: IPCLedgerAdddressParams) => getLedgerAddress(params))
  ipcMain.handle(IPCMessages.VERIFY_LEDGER_ADDRESS, async (_, params: IPCLedgerAdddressParams) =>
    verifyLedgerAddress(params)
  )
  ipcMain.handle(IPCMessages.SEND_LEDGER_TX, async (_, params: unknown) => {
    return FP.pipe(
      // params need to be decoded
      ipcLedgerSendTxParamsIO.decode(params),
      E.fold((e) => Promise.reject(e), sendLedgerTx)
    )
  })
  ipcMain.handle(IPCMessages.DEPOSIT_LEDGER_TX, async (_, params: unknown) => {
    return FP.pipe(
      // params need to be decoded
      ipcLedgerDepositTxParamsIO.decode(params),
      E.fold((e) => Promise.reject(e), depositLedgerTx)
    )
  })
  ipcMain.handle(IPCMessages.APPROVE_LEDGER_ERC20_TOKEN, async (_, params: unknown) => {
    return FP.pipe(
      // params need to be decoded
      ipcLedgerApproveERC20TokenParamsIO.decode(params),
      E.fold((e) => Promise.reject(e), approveLedgerERC20Token)
    )
  })
  ipcMain.handle(IPCMessages.SAVE_LEDGER_ADDRESSES, async (_, params: IPCLedgerAddressesIO) =>
    saveLedgerAddresses(params)()
  )
  ipcMain.handle(IPCMessages.GET_LEDGER_ADDRESSES, async () => getLedgerAddresses())
  // Update
  registerAppCheckUpdatedHandler(IS_DEV)
  // Register all file-stored data services
  Object.entries(DEFAULT_STORAGES).forEach(([name, defaultValue]) => {
    getFileStoreService(name as StoreFileName, defaultValue).registerIpcHandlersMain()
  })
}

const init = async () => {
  await app.whenReady()
  if (IS_DEV) {
    await setupDevEnv()
  }
  await initMainWindow()
  app.on('window-all-closed', allClosedHandler)
  app.on('activate', activateHandler)
  initIPC()
}

try {
  init()
} catch (error) {
  log.error(`Unable to initial Electron app: ${error}`)
}

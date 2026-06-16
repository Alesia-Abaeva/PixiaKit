// /**
//  * CanvasKitLoader.ts
//  *
//  * Smart loader for CanvasKit WASM.
//  *
//  * Priority:
//  *  1. Custom build at /canvaskit/canvaskit.js  (includes PDF backend)
//  *  2. Fallback: npm canvaskit-wasm             (no PDF, but renders canvas)
//  *
//  * Place your compiled files at:
//  *   public/canvaskit/canvaskit.js
//  *   public/canvaskit/canvaskit.wasm
//  */
// import CanvasKitInit from 'canvaskit-wasm'
// // The npm package's init function signature
// type CKInitFn = (opts: { locateFile: (f: string) => string }) => Promise<any>

// let _ck: any = null

// /**
//  * Load CanvasKit once and cache it.
//  * Returns the CanvasKit instance and a flag indicating if PDF is supported.
//  */
// export async function loadCanvasKit(): Promise<{ ck: any; hasPDF: boolean }> {
//   if (_ck) {
//     return { ck: _ck, hasPDF: hasPDFSupport(_ck) }
//   }

//   // ── Try custom build first ──────────────────────────────────────────────
//   const customAvailable =
//     (await checkFileExists('/canvaskit/canvaskit.js')) &&
//     (await checkFileExists('/canvaskit/canvaskit.wasm'))

//   if (customAvailable) {
//     console.log('[CanvasKitLoader] Using custom build (PDF enabled)')
//     try {
//       _ck = await loadCustomBuild()
//       return { ck: _ck, hasPDF: hasPDFSupport(_ck) }
//     } catch (e) {
//       console.warn('[CanvasKitLoader] Custom build failed, falling back to npm:', e)
//     }
//   }

//   // ── Fallback: npm canvaskit-wasm ────────────────────────────────────────
//   console.warn('[CanvasKitLoader] Using npm build — PDF export NOT available.')
//   console.warn('Run wasm-build/build.sh to compile a PDF-capable build.')

//   const { default: CanvasKitInit } = (await import('canvaskit-wasm')) as { default: CKInitFn }
//   _ck = await CanvasKitInit({
//     locateFile: (file: string) => `https://unpkg.com/canvaskit-wasm@0.41.1/bin/${file}`,
//   })

//   return { ck: _ck, hasPDF: false }
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// async function checkFileExists(url: string): Promise<boolean> {
//   try {
//     const res = await fetch(url, { method: 'HEAD' })
//     return res.ok
//   } catch {
//     return false
//   }
// }

// async function loadCustomBuild(): Promise<any> {
//   // Dynamically insert the custom canvaskit.js script tag
//   await injectScript('/canvaskit/canvaskit.js')

//   // The script sets window.CanvasKitInit
//   const init = (window as any).CanvasKitInit
//   if (typeof init !== 'function') {
//     throw new Error('window.CanvasKitInit not found after loading custom build')
//   }

//   return await init({
//     locateFile: (file: string) => `/canvaskit/${file}`,
//   })
// }

// function injectScript(src: string): Promise<void> {
//   return new Promise((resolve, reject) => {
//     // Avoid double-loading
//     if (document.querySelector(`script[src="${src}"]`)) {
//       resolve()
//       return
//     }
//     const s = document.createElement('script')
//     s.src = src
//     s.onload = () => resolve()
//     s.onerror = () => reject(new Error(`Failed to load script: ${src}`))
//     document.head.appendChild(s)
//   })
// }

// /**
//  * Check whether the loaded CanvasKit instance has PDF support.
//  * The PDF backend exposes MakePDFDocument or MakeSkPDFDocument.
//  */
// export function hasPDFSupport(ck: any): boolean {
//   return typeof ck?.MakePDFDocument === 'function' || typeof ck?.MakeSkPDFDocument === 'function'
// }

// src/core/CanvasKitLoader.ts

/**
 * CanvasKitLoader.ts
 *
 * Smart loader for CanvasKit WASM.
 *
 * Priority:
 *  1. Custom build at /canvaskit/canvaskit.js  (includes PDF backend)
 *  2. Fallback: npm canvaskit-wasm             (no PDF, but renders canvas)
 *
 * Place your compiled files at:
 *   public/canvaskit/canvaskit.js
 *   public/canvaskit/canvaskit.wasm
 */

type CanvasKitInstance = any
type CKInitFn = (opts: { locateFile: (f: string) => string }) => Promise<CanvasKitInstance>

let _ck: CanvasKitInstance | null = null
let _hasPDF: boolean = false
let _loading: Promise<{ ck: CanvasKitInstance; hasPDF: boolean }> | null = null

/**
 * Load CanvasKit once and cache it.
 * Returns the CanvasKit instance and a flag indicating if PDF is supported.
 */
export async function loadCanvasKit(): Promise<{ ck: CanvasKitInstance; hasPDF: boolean }> {
  // Если уже загружено, возвращаем
  if (_ck) {
    return { ck: _ck, hasPDF: _hasPDF }
  }

  // Если уже идет загрузка, ждем
  if (_loading) {
    return _loading
  }

  // Начинаем загрузку
  _loading = (async () => {
    console.log('[CanvasKitLoader] Starting load...')

    // ── Try custom build first ──────────────────────────────────────────────
    const customAvailable =
      (await checkFileExists('/canvaskit/canvaskit.js')) &&
      (await checkFileExists('/canvaskit/canvaskit.wasm'))

    console.log(`[CanvasKitLoader] Custom build available: ${customAvailable}`)

    if (customAvailable) {
      console.log('[CanvasKitLoader] Loading custom build (PDF enabled)...')
      try {
        _ck = await loadCustomBuild()
        _hasPDF = hasPDFSupport(_ck)
        console.log(`[CanvasKitLoader] Custom build loaded. PDF: ${_hasPDF}`)
        return { ck: _ck, hasPDF: _hasPDF }
      } catch (e) {
        console.warn('[CanvasKitLoader] Custom build failed, falling back to npm:', e)
      }
    }

    // ── Fallback: npm canvaskit-wasm ────────────────────────────────────────
    console.warn('[CanvasKitLoader] Using npm build — PDF export NOT available.')
    console.warn('Run: npm run canvaskit to compile a PDF-capable build.')

    try {
      const { default: CanvasKitInit } = (await import('canvaskit-wasm')) as { default: CKInitFn }

      _ck = await CanvasKitInit({
        locateFile: (file: string) => `https://unpkg.com/canvaskit-wasm@0.41.1/bin/${file}`,
      })

      _hasPDF = false
      console.log('[CanvasKitLoader] NPM build loaded successfully')
      return { ck: _ck, hasPDF: false }
    } catch (e) {
      console.error('[CanvasKitLoader] Failed to load CanvasKit:', e)
      throw new Error('Failed to load CanvasKit. Please check your network connection.')
    }
  })()

  return _loading
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function checkFileExists(url: string): Promise<boolean> {
  try {
    // Пробуем разные методы
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-cache',
    })
    return response.ok
  } catch (e) {
    console.debug(`[CanvasKitLoader] File check failed for ${url}:`, e)
    return false
  }
}

async function loadCustomBuild(): Promise<CanvasKitInstance> {
  // Проверяем, не загружен ли уже скрипт
  const existingScript = document.querySelector(`script[src="/canvaskit/canvaskit.js"]`)

  if (!existingScript) {
    console.log('[CanvasKitLoader] Injecting custom CanvasKit script...')
    await injectScript('/canvaskit/canvaskit.js')
  } else {
    console.log('[CanvasKitLoader] Script already injected')
  }

  // Ждем, пока появится window.CanvasKitInit
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const init = (window as any).CanvasKitInit
    if (typeof init === 'function') {
      console.log('[CanvasKitLoader] Found window.CanvasKitInit')

      try {
        const ck = await init({
          locateFile: (file: string) => `/canvaskit/${file}`,
        })
        console.log('[CanvasKitLoader] Custom CanvasKit initialized successfully')
        return ck
      } catch (e) {
        console.error('[CanvasKitLoader] CanvasKitInit failed:', e)
        throw e
      }
    }

    // Ждем 100ms перед следующей попыткой
    await new Promise((resolve) => setTimeout(resolve, 100))
    attempts++
  }

  throw new Error('CanvasKitInit not found after loading custom build')
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Проверяем, не загружен ли уже скрипт
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true

    script.onload = () => {
      console.log(`[CanvasKitLoader] Script loaded: ${src}`)
      resolve()
    }

    script.onerror = () => {
      reject(new Error(`Failed to load script: ${src}`))
    }

    document.head.appendChild(script)
    console.log(`[CanvasKitLoader] Script injected: ${src}`)
  })
}

/**
 * Check whether the loaded CanvasKit instance has PDF support.
 */
export function hasPDFSupport(ck: CanvasKitInstance): boolean {
  const hasMakePDF = typeof ck?.MakePDFDocument === 'function'
  const hasMakeSkPDF = typeof ck?.MakeSkPDFDocument === 'function'
  const hasPDF = hasMakePDF || hasMakeSkPDF

  console.log(
    `[CanvasKitLoader] PDF support check: MakePDFDocument=${hasMakePDF}, MakeSkPDFDocument=${hasMakeSkPDF}`
  )

  return hasPDF
}

/**
 * Проверяет, загружен ли CanvasKit
 */
export function isCanvasKitLoaded(): boolean {
  return _ck !== null
}

/**
 * Получить экземпляр CanvasKit (синхронно)
 */
export function getCanvasKit(): CanvasKitInstance | null {
  return _ck
}

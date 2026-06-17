import type { CanvasKit } from '@warmBuild'
import CanvasKitInit from '@warmBuild'

let _ck: CanvasKit | null = null

/** Загружает CanvasKit WASM (кастомная сборка из libs/skia/) с поддержкой PDF */
export async function loadCanvasKit(): Promise<CanvasKit> {
  if (_ck) return _ck

  try {
    _ck = await CanvasKitInit({
      locateFile: (file: string) => `${import.meta.env.BASE_URL}canvaskit/${file}`,
    })
    return _ck
  } catch (err) {
    _ck = null
    console.error('[CanvasKit] ❌ Failed to load:', err)
    // eslint-disable-next-line preserve-caught-error
    throw new Error(
      'Не удалось загрузить CanvasKit WASM.\n' +
        'Проверьте, что файлы доступны:\n' +
        '  - /canvaskit/canvaskit.js\n' +
        '  - /canvaskit/canvaskit.wasm'
    )
  }
}

/**
 * Загружает CanvasKit (кастомная WASM-сборка с приоритетом, fallback на npm)
 * один раз при монтировании. Отдаёт сам инстанс плюс флаг готовности.
 */

import type { CanvasKit } from '@warmBuild'
import React from 'react'

import { loadCanvasKit } from '../core/CanvasKitLoader'

export function useCanvasKit(addLog: (message: string) => void) {
  const [canvasKit, setCanvasKit] = React.useState<CanvasKit | null>(null)

  React.useEffect(() => {
    let disposed = false

    ;(async () => {
      try {
        const instance = await loadCanvasKit()

        if (disposed) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasPDF = Boolean((instance as any).MakePDFDocument)
        console.log('CanvasKit loaded, PDF support:', hasPDF ? 'yes' : 'no')

        setCanvasKit(instance)
        addLog(
          hasPDF ? 'CanvasKit loaded with PDF support' : 'CanvasKit loaded without PDF support'
        )
      } catch (error) {
        if (disposed) return

        console.error('Failed to load CanvasKit:', error)
        addLog(
          'Failed to load CanvasKit: ' + (error instanceof Error ? error.message : String(error))
        )
      }
    })()

    return () => {
      disposed = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return canvasKit
}

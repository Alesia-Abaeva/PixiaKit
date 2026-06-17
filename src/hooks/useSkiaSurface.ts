/**
 * Создаёт Skia software-surface (MakeSWCanvasSurface) на уже примонтированном
 * <canvas> элементе, как только CanvasKit готов. Surface хранится в ref,
 * а не в state — он не должен вызывать ре-рендер React при создании/пересоздании,
 * и должен быть синхронно доступен из PIXI ticker (см. useSkiaRenderLoop).
 */

import type { CanvasKit } from '@warmBuild'
import React from 'react'

export function useSkiaSurface(
  canvasKit: CanvasKit | null,
  skiaCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  width: number,
  height: number,
  addLog: (message: string) => void
) {
  const skiaSurfaceRef = React.useRef<ReturnType<CanvasKit['MakeSWCanvasSurface']> | null>(null)

  React.useEffect(() => {
    if (!canvasKit) {
      return
    }

    const canvas = skiaCanvasRef.current

    if (!canvas) {
      return
    }

    canvas.width = width
    canvas.height = height

    const surface = canvasKit.MakeSWCanvasSurface(canvas)

    if (!surface) {
      addLog('Skia surface was not created')
      return
    }

    skiaSurfaceRef.current = surface

    return () => {
      surface.dispose()
      skiaSurfaceRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasKit, width, height, addLog])

  return skiaSurfaceRef
}

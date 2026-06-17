/**
 * usePixiSkiaRenderLoop.ts
 *
 * Создаёт PIXI.Application (forceCanvas: true, как требует ТЗ) и навешивает
 * на него главный render loop через app.ticker. Принимает уже существующие
 * refs (appRef, needsSkiaRedrawRef) — не создаёт собственные — потому что
 * useSceneSwitcher и handleAddRandomObject в App.tsx должны писать в те же
 * самые объекты, а не в отдельные копии.
 */

import type { CanvasKit } from '@warmBuild'
import * as PIXI from 'pixi.js-legacy'
import React from 'react'

import type { EventBridge } from '../core/EventBridge'
import { renderPixiContainerToSkia } from '../core/SkiaRenderer'

export interface UsePixiSkiaRenderLoopOptions {
  pixiRootRef: React.RefObject<HTMLDivElement | null>
  appRef: React.RefObject<PIXI.Application | null>
  canvasKitRef: React.RefObject<CanvasKit | null>
  currentSceneRef: React.RefObject<PIXI.Container | null>
  skiaSurfaceRef: React.RefObject<ReturnType<CanvasKit['MakeSWCanvasSurface']> | null>
  eventBridgeRef: React.RefObject<EventBridge | null>
  needsSkiaRedrawRef: React.RefObject<boolean>
  width: number
  height: number
}

export function usePixiSkiaRenderLoop(options: UsePixiSkiaRenderLoopOptions) {
  const {
    pixiRootRef,
    appRef,
    canvasKitRef,
    currentSceneRef,
    skiaSurfaceRef,
    eventBridgeRef,
    needsSkiaRedrawRef,
    width,
    height,
  } = options

  const drawSceneToSkia = React.useCallback(() => {
    const ck = canvasKitRef.current
    const scene = currentSceneRef.current
    const surface = skiaSurfaceRef.current

    if (!ck || !scene || !surface) {
      return
    }

    try {
      const skCanvas = surface.getCanvas()
      skCanvas.clear(ck.TRANSPARENT)

      renderPixiContainerToSkia(scene, { ck, canvas: skCanvas })

      surface.flush()
    } catch (err) {
      console.error('[usePixiSkiaRenderLoop] render failed:', err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    if (!pixiRootRef.current) {
      return
    }

    const app = new PIXI.Application<HTMLCanvasElement>({
      width,
      height,
      forceCanvas: true,
      backgroundColor: 0x1f2028,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })

    app.view.style.touchAction = 'none'
    app.view.style.userSelect = 'none'

    app.stage.on('mouseup', () => {
      needsSkiaRedrawRef.current = true
    })

    appRef.current = app
    app.stage.eventMode = 'dynamic'

    pixiRootRef.current.appendChild(app.view as HTMLCanvasElement)

    const tick = () => {
      app.render()

      if (!needsSkiaRedrawRef.current) {
        return
      }

      drawSceneToSkia()
      needsSkiaRedrawRef.current = false
    }

    app.ticker.add(tick)

    return () => {
      app.ticker.remove(tick)
      eventBridgeRef.current?.detach()
      eventBridgeRef.current = null

      app.destroy(true, { children: true })
      appRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawSceneToSkia, width, height])
}

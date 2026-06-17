/**
 * Подключает EventBridge (хит-тест pointerdown/pointerup для Skia canvas)
 * к текущей сцене. Принимает уже существующий eventBridgeRef снаружи —
 * usePixiSkiaRenderLoop тоже на него ссылается (чтобы отвязать слушатели
 * при размонтировании Application), поэтому это должен быть один общий объект.
 */

import * as PIXI from 'pixi.js-legacy'
import React from 'react'

import { EventBridge } from '../core/EventBridge'

export function useEventBridge(
  skiaCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  eventBridgeRef: React.RefObject<EventBridge | null>,
  currentScene: PIXI.Container | null,
  addLog: (message: string) => void
) {
  React.useEffect(() => {
    const canvas = skiaCanvasRef.current

    if (!canvas || !currentScene) {
      return
    }

    const eventBridge = new EventBridge({
      canvas,
      scene: currentScene,
      onPointerDown: (hit) => {
        addLog(`Skia pointerdown: ${hit.object.constructor.name}`)
      },
      onPointerUp: (hit) => {
        addLog(`Skia pointerup: ${hit.object.constructor.name}`)
      },
    })

    eventBridge.attach()
    eventBridgeRef.current = eventBridge

    return () => {
      eventBridge.detach()

      if (eventBridgeRef.current === eventBridge) {
        eventBridgeRef.current = null
      }
    }
  }, [currentScene, addLog])
}

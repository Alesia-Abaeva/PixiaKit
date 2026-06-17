/**
 * Управляет текущим индексом сцены и пересозданием PIXI.Container при смене.
 * Принимает уже существующие refs (а не создаёт свои) — appRef, eventBridgeRef
 * и needsSkiaRedrawRef используются также render loop'ом и EventBridge-хуком,
 * поэтому они должны быть едиными объектами, созданными один раз в App.tsx.
 */

import * as PIXI from 'pixi.js-legacy'
import React from 'react'

import type { EventBridge } from '../core/EventBridge'
import { SCENES } from '../pixi/scene'

export interface UseSceneSwitcherOptions {
  appRef: React.RefObject<PIXI.Application | null>
  currentSceneRef: React.RefObject<PIXI.Container | null>
  eventBridgeRef: React.RefObject<EventBridge | null>
  needsSkiaRedrawRef: React.RefObject<boolean>
  addLog: (message: string) => void
}

export function useSceneSwitcher(options: UseSceneSwitcherOptions) {
  const { appRef, currentSceneRef, eventBridgeRef, needsSkiaRedrawRef, addLog } = options

  const [currentSceneIndex, setCurrentSceneIndex] = React.useState(0)
  // currentScene (state) существует ТОЛЬКО для подписчиков, которым нужен
  // React re-render при смене сцены (useEventBridge). Сам рендер-цикл Skia
  // читает currentSceneRef напрямую, не это state.
  const [currentScene, setCurrentScene] = React.useState<PIXI.Container | null>(null)

  React.useEffect(() => {
    const app = appRef.current

    if (!app) {
      return
    }

    app.stage.removeChildren()

    const scene = SCENES[currentSceneIndex].factory()

    app.stage.addChild(scene)
    app.render()

    // Пишем в currentSceneRef СИНХРОННО здесь, а не в отдельном useEffect,
    // реагирующем на currentScene state — иначе между React re-render и
    // обновлением ref возникает гонка, и PIXI ticker может успеть отрисовать
    // Skia со старой сценой.
    currentSceneRef.current = scene
    needsSkiaRedrawRef.current = true

    setCurrentScene(scene)
    eventBridgeRef.current?.setScene(scene)

    addLog(`Scene changed: ${SCENES[currentSceneIndex].label}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneIndex, addLog])

  return {
    currentScene,
    currentSceneIndex,
    setCurrentSceneIndex,
  }
}

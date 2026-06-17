import type { CanvasKit } from '@warmBuild'
import * as PIXI from 'pixi.js-legacy'
import React from 'react'

import type { EventBridge } from './core'
import { exportAndDownloadPDF } from './core'
import {
  useCanvasKit,
  useEventBridge,
  useLogger,
  usePixiSkiaRenderLoop,
  useSceneSwitcher,
  useSkiaSurface,
} from './hooks'
import { addRandomObject, SCENES } from './pixi'

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 400

export default function App() {
  const pixiRootRef = React.useRef<HTMLDivElement | null>(null)
  const skiaCanvasRef = React.useRef<HTMLCanvasElement | null>(null)

  const appRef = React.useRef<PIXI.Application | null>(null)
  const currentSceneRef = React.useRef<PIXI.Container | null>(null)
  const eventBridgeRef = React.useRef<EventBridge | null>(null)
  const needsSkiaRedrawRef = React.useRef(true)
  const canvasKitRef = React.useRef<CanvasKit | null>(null)

  const { logs, addLog } = useLogger()
  const canvasKit = useCanvasKit(addLog)

  React.useEffect(() => {
    canvasKitRef.current = canvasKit
    needsSkiaRedrawRef.current = true
  }, [canvasKit])

  const skiaSurfaceRef = useSkiaSurface(
    canvasKit,
    skiaCanvasRef,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    addLog
  )

  usePixiSkiaRenderLoop({
    pixiRootRef,
    appRef,
    canvasKitRef,
    currentSceneRef,
    skiaSurfaceRef,
    eventBridgeRef,
    needsSkiaRedrawRef,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  })

  const { currentScene, setCurrentSceneIndex } = useSceneSwitcher({
    appRef,
    currentSceneRef,
    eventBridgeRef,
    needsSkiaRedrawRef,
    addLog,
  })

  /** EventBridge для Skia canvas  */
  useEventBridge(skiaCanvasRef, eventBridgeRef, currentScene, addLog)

  const handleAddRandomObject = () => {
    const scene = currentSceneRef.current
    if (!scene) return

    const kind = addRandomObject(scene)
    needsSkiaRedrawRef.current = true

    const addedObject = scene.children[scene.children.length - 1]
    if (addedObject) {
      addedObject.eventMode = 'dynamic'
      addedObject.cursor = 'pointer'
    }

    appRef.current?.render()
    addLog(`Added random ${kind}`)
  }

  const handleExportPdf = async () => {
    if (!canvasKit || !currentScene) return

    const error = await exportAndDownloadPDF(
      {
        ck: canvasKit,
        container: currentScene,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      },
      'pixiakit-scene.pdf'
    )

    if (error) {
      addLog(`ERROR: ${error}`)
      return
    }

    addLog('PDF exported ✓')
  }

  return (
    <main className="py-15 px-5">
      <h1 className="text-3xl font-bold pb-2">PixiJS to Skia Renderer</h1>
      <p className="pb-15">Welcome to the PixiJS to Skia Renderer!</p>

      <section className="grid grid-cols-2 gap-8">
        <section className="relative z-50">
          <h2 className="text-xl font-semibold pb-5">PixiJS Scene</h2>
          <div ref={pixiRootRef} />
        </section>

        <section>
          <h2 className="text-xl font-semibold pb-5">Skia output canvas</h2>
          <div>
            <canvas
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              ref={skiaCanvasRef}
              style={{ border: '1px solid #333' }}
            />
          </div>
        </section>
      </section>

      <div className="pt-15 flex gap-2 flex-cols m-auto">
        <button className="button" onClick={handleAddRandomObject}>
          Add random shape
        </button>

        <button className="button" onClick={handleExportPdf}>
          Export PDF
        </button>

        {SCENES.map((scene, index) => (
          <button
            key={scene.label}
            type="button"
            className="button"
            onClick={() => setCurrentSceneIndex(index)}
          >
            {scene.label}
          </button>
        ))}
      </div>

      <section className="bg-neutral-900 text-neutral-300 p-4 mt-15 rounded-md">
        <p className="text-xl pb-1">CanvasKit: {canvasKit ? 'loaded' : 'loading...'}</p>

        <ul>
          {logs.map((log, index) => (
            <li key={`${log}-${index}`}>{log}</li>
          ))}
        </ul>
      </section>
    </main>
  )
}

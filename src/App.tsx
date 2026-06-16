import CanvasKitInit from 'canvaskit-wasm'
import * as PIXI from 'pixi.js-legacy'
import React from 'react'

import { EventBridge } from './core/EventBridge'
import { exportAndDownloadPDF } from './core/SkiaPDFExporter'
import { renderPixiContainerToSkia } from './core/SkiaRenderer'
import { addRandomObject } from './pixi/generators'
import { SCENES } from './pixi/scene'
import type { CanvasKit } from './types/types'

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 400

export default function App() {
  const pixiRootRef = React.useRef<HTMLDivElement | null>(null)
  const skiaCanvasRef = React.useRef<HTMLCanvasElement | null>(null)

  const skiaSurfaceRef = React.useRef<ReturnType<CanvasKit['MakeSWCanvasSurface']> | null>(null)

  const appRef = React.useRef<PIXI.Application | null>(null)
  const eventBridgeRef = React.useRef<EventBridge | null>(null)

  const [canvasKit, setCanvasKit] = React.useState<CanvasKit | null>(null)
  const [currentSceneIndex, setCurrentSceneIndex] = React.useState(0)
  const [currentScene, setCurrentScene] = React.useState<PIXI.Container | null>(null)
  const [renderVersion, setRenderVersion] = React.useState(0)
  const [logs, setLogs] = React.useState<string[]>([])

  const addLog = React.useCallback((message: string) => {
    setLogs((prevLogs) => [message, ...prevLogs].slice(0, 8))
  }, [])

  /**
   * 1. Создаём PIXI.Application({ forceCanvas: true })
   */
  React.useEffect(() => {
    if (!pixiRootRef.current) {
      return
    }

    const app = new PIXI.Application<HTMLCanvasElement>({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      forceCanvas: true,
      backgroundColor: 0x1f2028,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })

    app.view.addEventListener('pointerdown', () => {
      console.log('CANVAS POINTER OK')
    })

    app.view.style.touchAction = 'none'
    app.view.style.userSelect = 'none'

    app.stage.on('pointerdown', () => {
      console.log('PIXI STAGE CLICK OK')
    })

    appRef.current = app
    app.stage.eventMode = 'dynamic'

    pixiRootRef.current.appendChild(app.view as HTMLCanvasElement)

    // simple render loop (optional but safe)
    app.ticker.add(() => {
      app.render()
    })

    return () => {
      eventBridgeRef.current?.detach()
      eventBridgeRef.current = null

      app.destroy(true, { children: true })
      appRef.current = null
    }
  }, [])

  /**
   * 2. Загружаем CanvasKit
   */
  React.useEffect(() => {
    let disposed = false

    CanvasKitInit({
      locateFile: (file) => {
        return `https://unpkg.com/canvaskit-wasm@0.41.1/bin/${file}`
      },
    }).then((loadedCanvasKit) => {
      if (!disposed) {
        setCanvasKit(loadedCanvasKit)
        addLog('CanvasKit loaded')
      }
    })

    return () => {
      disposed = true
    }
  }, [addLog])

  /**
   * 3. Создаём Skia surface
   */
  React.useEffect(() => {
    if (!canvasKit) {
      return
    }

    const canvas = skiaCanvasRef.current

    if (!canvas) {
      return
    }

    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT

    const surface = canvasKit.MakeSWCanvasSurface(canvas)
    // canvas.style.pointerEvents = 'none'

    if (!surface) {
      addLog('Skia surface was not created')
      return
    }

    skiaSurfaceRef.current = surface

    return () => {
      surface.dispose()
      skiaSurfaceRef.current = null
    }
  }, [canvasKit, addLog])

  /**
   * 4. Держим текущую сцену и переключаем сцены
   */
  React.useEffect(() => {
    const app = appRef.current

    if (!app) {
      return
    }

    app.stage.removeChildren()

    const scene = SCENES[currentSceneIndex].factory()

    app.stage.addChild(scene)
    app.render()

    setCurrentScene(scene)
    eventBridgeRef.current?.setScene(scene)

    addLog(`Scene changed: ${SCENES[currentSceneIndex].label}`)
  }, [currentSceneIndex, addLog])

  /**
   * 5. Подключаем EventBridge к Skia canvas
   */
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

  /**
   * 6. Рендерим сцену через Skia
   */
  React.useEffect(() => {
    if (!canvasKit) {
      return
    }

    if (!currentScene) {
      return
    }

    const surface = skiaSurfaceRef.current

    if (!surface) {
      return
    }

    const skCanvas = surface.getCanvas()

    skCanvas.clear(canvasKit.TRANSPARENT)

    renderPixiContainerToSkia(currentScene, {
      ck: canvasKit,
      canvas: skCanvas,
    })

    surface.flush()
  }, [canvasKit, currentScene, renderVersion])

  const handleAddRandomObject = () => {
    if (!currentScene) {
      return
    }

    const kind = addRandomObject(currentScene)

    /**
     * MVP-фикс:
     * делаем добавленный объект интерактивным,
     * чтобы EventBridge мог его найти.
     */
    const addedObject = currentScene.children[currentScene.children.length - 1]

    if (addedObject) {
      addedObject.eventMode = 'dynamic'
      addedObject.cursor = 'pointer'
    }

    appRef.current?.render()

    setRenderVersion((version) => version + 1)

    addLog(`Added random ${kind}`)
  }

  const handleExportPdf = () => {
    if (!canvasKit || !currentScene) return

    const error = exportAndDownloadPDF(
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
    <main className="main-content">
      <h1 className="text-3xl font-bold">PixiJS to Skia Renderer</h1>
      <p>Welcome to the PixiJS to Skia Renderer!</p>

      <section>
        <h2>Features</h2>
        <ul>
          <li>Render PixiJS scenes to Skia canvas</li>
          <li>Export rendered content as PDF</li>
        </ul>
      </section>

      <section className="grid grid-cols-2 gap-8">
        <section className="relative z-50">
          <h2>PixiJS Scene</h2>
          <div ref={pixiRootRef} />
        </section>

        <section>
          <h2>Skia output canvas</h2>
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

      <div style={{ marginTop: 10 }}>
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

      <section className="App__status">
        <p>CanvasKit: {canvasKit ? 'loaded' : 'loading...'}</p>

        <ul>
          {logs.map((log, index) => (
            <li key={`${log}-${index}`}>{log}</li>
          ))}
        </ul>
      </section>
    </main>
  )
}

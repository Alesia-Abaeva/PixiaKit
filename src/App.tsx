import CanvasKitInit from 'canvaskit-wasm'
import * as PIXI from 'pixi.js-legacy'
import React from 'react'

import { loadCanvasKit } from './core/CanvasKitLoader'
// import { loadCanvasKit } from './core/CanvasKitLoader'
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

  // Текущая сцена держим в ref, а не только в state — ticker должен
  // видеть актуальную сцену на каждом тике без переподписки.
  const currentSceneRef = React.useRef<PIXI.Container | null>(null)
  const canvasKitRef = React.useRef<CanvasKit | null>(null)

  // Глобальный флаг "сцена изменилась, нужен перерендер в Skia"
  const needsSkiaRedrawRef = React.useRef(true)

  const [canvasKit, setCanvasKit] = React.useState<CanvasKit | null>(null)
  const [currentSceneIndex, setCurrentSceneIndex] = React.useState(0)
  // currentScene (state) оставляем ТОЛЬКО для UI/EventBridge, которым нужен re-render.
  // Рендер-цикл Skia больше НЕ зависит от этого state.
  const [currentScene, setCurrentScene] = React.useState<PIXI.Container | null>(null)
  const [logs, setLogs] = React.useState<string[]>([])

  const addLog = React.useCallback((message: string) => {
    setLogs((prevLogs) => [message, ...prevLogs].slice(0, 8))
  }, [])

  React.useEffect(() => {
    canvasKitRef.current = canvasKit
    needsSkiaRedrawRef.current = true
  }, [canvasKit])

  /**
   * Рисует текущую сцену на Skia surface "как есть" — без какой-либо
   * зависимости от React state. Вызывается из PIXI ticker каждый кадр,
   * поэтому drag, который меняет obj.position напрямую, тоже подхватывается.
   */
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
      // PIXI ticker сам проглатывает необработанные исключения внутри tick(),
      // поэтому без явного catch ошибка рендера в Skia была бы совсем не видна.
      console.error('[drawSceneToSkia] render failed:', err)
    }

    surface.flush()
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

    app.view.style.touchAction = 'none'
    app.view.style.userSelect = 'none'

    /** оптимизация перемещения */
    app.stage.on('mouseup', () => {
      console.log('mouseup')
      needsSkiaRedrawRef.current = true
    })

    appRef.current = app
    app.stage.eventMode = 'dynamic'

    pixiRootRef.current.appendChild(app.view as HTMLCanvasElement)

    // Главный цикл: каждый кадр —
    //   1) PIXI рендерит сам себя (нужно для drag/move/transform),
    //   2) та же сцена перерисовывается на Skia canvas.
    // Благодаря этому любое изменение позиции/угла/масштаба (включая drag)
    // мгновенно отражается в Skia без ручных вызовов setRenderVersion.

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
  }, [drawSceneToSkia])

  /**
   * 2. Загружаем CanvasKit
   */
  React.useEffect(() => {
    let disposed = false

    loadCanvasKit().then(({ ck, hasPDF }) => {
      console.log('CanvasKit loaded, PDF support:', hasPDF)

      if (!disposed) {
        setCanvasKit(ck)
        addLog(
          hasPDF ? 'CanvasKit loaded with PDF support' : 'CanvasKit loaded without PDF support'
        )
      }
    })

    // CanvasKitInit({
    //   locateFile: (file) => {
    //     return `/canvaskit/${file}`
    //   },
    // }).then((loadedCanvasKit) => {
    //   if (!disposed) {
    //     setCanvasKit(loadedCanvasKit)
    //     addLog('CanvasKit loaded')
    //   }
    // })
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

    currentSceneRef.current = scene
    needsSkiaRedrawRef.current = true

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

  const handleAddRandomObject = () => {
    if (!currentScene) {
      return
    }

    const kind = addRandomObject(currentScene)
    needsSkiaRedrawRef.current = true

    /**
     * MVP-фикс:
     * делаем добавленный объект интерактивным,
     * чтобы EventBridge мог его найти.
     */
    const addedObject = currentScene.children[currentScene.children.length - 1]

    if (addedObject) {
      const scene = currentSceneRef.current

      if (scene) {
        const lastSceneObject = scene.children[scene.children.length - 1]

        if (lastSceneObject) {
          lastSceneObject.eventMode = 'dynamic'
          lastSceneObject.cursor = 'pointer'
        }
      }
    }

    appRef.current?.render()

    // setRenderVersion((version) => version + 1)

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
    <main className="py-15 px-5">
      <h1 className="text-3xl font-bold pb-2">PixiJS to Skia Renderer</h1>
      <p className="pb-15">Welcome to the PixiJS to Skia Renderer!</p>

      <section className="grid grid-cols-2 gap-8">
        <section className="relative z-50 ">
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

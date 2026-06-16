/**
 * Слой событий для Skia canvas.
 *
 * Pixi сам умеет обрабатывать pointerdown/pointerup на Pixi canvas,
 * но Skia canvas после отрисовки превращается в обычную картинку.
 * Поэтому для Skia-канваса нужно вручную определить, какой PIXI.DisplayObject находится под курсором.
 */

import * as PIXI from 'pixi.js-legacy'

export type PointerEventName = 'pointerdown' | 'pointerup'

export interface EventBridgeOptions {
  /** Canvas, на котором пользователь кликает. */
  canvas: HTMLCanvasElement

  /**
   * Корневой PIXI.Container сцены.
   * Обычно это та же сцена, которую SkiaRenderer отрисовал на canvas.
   */
  scene: PIXI.Container

  /** Вызывается, когда пользователь нажал на интерактивный объект Skia canvas. */
  onPointerDown?: (hit: EventBridgeHit) => void

  /** Вызывается, когда пользователь отпустил нажатие на интерактивный объект Skia canvas. */
  onPointerUp?: (hit: EventBridgeHit) => void
}

export interface EventBridgeHit {
  object: PIXI.DisplayObject
  localX: number
  localY: number
}

export class EventBridge {
  private readonly canvas: HTMLCanvasElement
  private readonly options: EventBridgeOptions
  private scene: PIXI.Container

  constructor(options: EventBridgeOptions) {
    this.canvas = options.canvas
    this.options = options
    this.scene = options.scene

    this.handlePointerDown = this.handlePointerDown.bind(this)
    this.handlePointerUp = this.handlePointerUp.bind(this)
  }

  /** Обновляет сцену после переключения/пересоздания. */
  setScene(scene: PIXI.Container): void {
    this.scene = scene
  }

  /** Подключает обработчики pointerdown/pointerup к canvas. */
  attach(): void {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown)
    this.canvas.addEventListener('pointerup', this.handlePointerUp)
  }

  /** Отключает обработчики pointerdown/pointerup от canvas. */
  detach(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.canvas.removeEventListener('pointerup', this.handlePointerUp)
  }

  /**
   * Находит верхний интерактивный объект под координатами клика.
   *
   * Сначала проверяем дочерние объекты, чтобы клик по объекту внутри контейнера
   * не попадал сразу на сам контейнер.
   */
  hitTest(x: number, y: number): EventBridgeHit | null {
    const hit = this.findInteractiveChild(this.scene, x, y)

    return hit ?? this.findInteractiveObject(this.scene, x, y)
  }

  private handlePointerDown(event: PointerEvent): void {
    this.emitPointerEvent('pointerdown', event)
  }

  private handlePointerUp(event: PointerEvent): void {
    this.emitPointerEvent('pointerup', event)
  }

  private emitPointerEvent(type: 'pointerdown' | 'pointerup', event: PointerEvent): void {
    const point = this.getCanvasPoint(event)
    const hit = this.hitTest(point.x, point.y)

    if (!hit) {
      return
    }

    if (type === 'pointerdown') {
      this.options.onPointerDown?.(hit)
      return
    }

    this.options.onPointerUp?.(hit)
  }

  private getCanvasPoint(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width / rect.width
    const scaleY = this.canvas.height / rect.height

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  private findInteractiveChild(
    container: PIXI.Container,
    x: number,
    y: number
  ): EventBridgeHit | null {
    for (let i = container.children.length - 1; i >= 0; i--) {
      const child = container.children[i]

      if (!this.isInteractive(child)) {
        if (child instanceof PIXI.Container) {
          const nestedHit = this.findInteractiveChild(child, x, y)

          if (nestedHit) {
            return nestedHit
          }
        }

        continue
      }
      const worldPoint = new PIXI.Point(x, y)

      const inv = child.worldTransform.clone().invert()
      const localPoint = inv.apply(worldPoint, new PIXI.Point())
      //   const localPoint = child.toLocal(new PIXI.Point(x, y), undefined, undefined, true)
      const hit = this.containsDisplayObject(child, localPoint.x, localPoint.y)

      if (hit) {
        return {
          object: child,
          localX: localPoint.x,
          localY: localPoint.y,
        }
      }
    }

    return null
  }

  private findInteractiveObject(
    object: PIXI.DisplayObject,
    x: number,
    y: number
  ): EventBridgeHit | null {
    if (!this.isInteractive(object)) {
      return null
    }

    const localPoint = object.toLocal(new PIXI.Point(x, y), undefined, undefined, true)

    if (!this.containsDisplayObject(object, localPoint.x, localPoint.y)) {
      return null
    }

    return {
      object,
      localX: localPoint.x,
      localY: localPoint.y,
    }
  }

  private isInteractive(object: PIXI.DisplayObject): boolean {
    return object.visible && object.renderable && object.eventMode !== 'none'
  }

  private containsDisplayObject(
    object: PIXI.DisplayObject,
    localX: number,
    localY: number
  ): boolean {
    if (object instanceof PIXI.Graphics) {
      return object.containsPoint(new PIXI.Point(localX, localY))
    }

    const bounds = object.getLocalBounds()
    return bounds.contains(localX, localY)
  }
}

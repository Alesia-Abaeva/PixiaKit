import type CanvasKitInit from 'canvaskit-wasm'
import * as PIXI from 'pixi.js-legacy'


export type CanvasKit = Awaited<ReturnType<typeof CanvasKitInit>>
export type SkSurface = ReturnType<CanvasKit['MakeSWCanvasSurface']>
export type SkCanvas = ReturnType<NonNullable<SkSurface>['getCanvas']>


export interface SkiaRendererOptions {
  ck: CanvasKit
  canvas: SkCanvas
}

export interface SkPathBuilderLike {
    moveTo(x: number, y: number): SkPathBuilderLike
    lineTo(x: number, y: number): SkPathBuilderLike
    close(): SkPathBuilderLike
    detachAndDelete(): SkPathLike
    delete(): void
}

export interface SkPathLike {
    delete(): void
}


export interface SkImageLike {
    delete(): void
}


export type BaseTextureWithSource = PIXI.BaseTexture & {
    resource: {
        source?: HTMLImageElement | HTMLCanvasElement
    }
}

export type Shape =
  | {
      kind: 'rect'
      x: number
      y: number
      width: number
      height: number
    }
  | {
      kind: 'ellipse'
      x: number
      y: number
      rx: number
      ry: number
    }
  | {
      kind: 'polygon'
      points: number[]
    }
  | {
      kind: 'polyline'
      points: number[]
    }

export type DrawCall =
  | {
      type: 'fill'
      color: number
      alpha: number
      shape: Shape
    }
  | {
      type: 'stroke'
      color: number
      alpha: number
      lineWidth: number
      shape: Shape
    }
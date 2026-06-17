import type { CanvasKit, Path, PathBuilder } from '@warmBuild'
import * as PIXI from 'pixi.js-legacy'

// Экспортируем типы из CanvasKit для удобства
export type { CanvasKit, Path, PathBuilder }

export type SkSurface = ReturnType<CanvasKit['MakeSWCanvasSurface']>
export type SkCanvas = ReturnType<NonNullable<SkSurface>['getCanvas']>

export interface SkiaRendererOptions {
  ck: CanvasKit
  canvas: SkCanvas
}

export type BaseTextureWithSource = PIXI.BaseTexture & {
  resource: {
    source?: HTMLImageElement | HTMLCanvasElement
  }
}

// Типы для фигур
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

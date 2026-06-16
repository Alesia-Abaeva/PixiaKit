import * as PIXI from 'pixi.js-legacy'

import type { CanvasKit, DrawCall, SkCanvas, SkiaRendererOptions, SkPath } from '../types/types'

/**
 * Конвертирует цвет Pixi в CanvasKit Color4f.
 */
function parseColor(ck: CanvasKit, raw: number | string, alpha = 1): Float32Array {
  if (typeof raw === 'number') {
    return ck.Color4f(((raw >> 16) & 255) / 255, ((raw >> 8) & 255) / 255, (raw & 255) / 255, alpha)
  }

  const value = raw.trim()

  if (!value.startsWith('#')) {
    return ck.Color4f(0, 0, 0, alpha)
  }

  const hex = value.slice(1)
  const normalizedHex =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => char + char)
          .join('')
      : hex.padEnd(6, '0').slice(0, 6)

  return ck.Color4f(
    parseInt(normalizedHex.slice(0, 2), 16) / 255,
    parseInt(normalizedHex.slice(2, 4), 16) / 255,
    parseInt(normalizedHex.slice(4, 6), 16) / 255,
    alpha
  )
}

/**
 * Применяет мировую матрицу Pixi-объекта к Skia canvas.
 */
function applyTransform(canvas: SkCanvas, obj: PIXI.DisplayObject): void {
  const matrix = obj.localTransform

  canvas.concat([matrix.a, matrix.c, matrix.tx, matrix.b, matrix.d, matrix.ty, 0, 0, 1])
}

/**
 * Извлекает понятные draw calls из PIXI.Graphics.
 */

function extractDrawCalls(graphics: PIXI.Graphics): DrawCall[] {
  const geometry = graphics.geometry
  const graphicsData = geometry.graphicsData

  const calls: DrawCall[] = []

  for (const data of graphicsData) {
    const { shape, fillStyle, lineStyle } = data

    if (!shape) {
      continue
    }

    const pushFill = (shapeDescriptor: DrawCall['shape'], fill: typeof fillStyle): void => {
      if (!fill.visible) {
        return
      }

      calls.push({
        type: 'fill',
        color: fill.color,
        alpha: fill.alpha * graphics.worldAlpha,
        shape: shapeDescriptor,
      })
    }

    const pushStroke = (shapeDescriptor: DrawCall['shape'], stroke: typeof lineStyle): void => {
      if (!stroke.visible || stroke.width <= 0) {
        return
      }

      calls.push({
        type: 'stroke',
        color: stroke.color,
        alpha: stroke.alpha * graphics.worldAlpha,
        lineWidth: stroke.width,
        shape: shapeDescriptor,
      })
    }

    switch (shape.type) {
      case PIXI.SHAPES.RECT:
      case PIXI.SHAPES.RREC: {
        const descriptor: DrawCall['shape'] = {
          kind: 'rect',
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
        }

        pushFill(descriptor, fillStyle)
        pushStroke(descriptor, lineStyle)

        break
      }

      case PIXI.SHAPES.CIRC: {
        const descriptor: DrawCall['shape'] = {
          kind: 'ellipse',
          x: shape.x,
          y: shape.y,
          rx: shape.radius,
          ry: shape.radius,
        }

        pushFill(descriptor, fillStyle)
        pushStroke(descriptor, lineStyle)

        break
      }

      case PIXI.SHAPES.ELIP: {
        const descriptor: DrawCall['shape'] = {
          kind: 'ellipse',
          x: shape.x,
          y: shape.y,
          rx: shape.width,
          ry: shape.height,
        }

        pushFill(descriptor, fillStyle)
        pushStroke(descriptor, lineStyle)

        break
      }

      case PIXI.SHAPES.POLY: {
        const points = [...shape.points]

        if (points.length < 4) {
          break
        }

        const isClosed =
          points.length >= 6 &&
          points[0] === points[points.length - 2] &&
          points[1] === points[points.length - 1]

        const descriptor: DrawCall['shape'] = {
          kind: isClosed ? 'polygon' : 'polyline',
          points,
        }

        if (isClosed) {
          pushFill(descriptor, fillStyle)
        }

        pushStroke(descriptor, lineStyle)

        break
      }

      default:
        break
    }
  }

  return calls
}

/**
 * Рисует один draw call.
 */
function renderDrawCall(ck: CanvasKit, canvas: SkCanvas, call: DrawCall): void {
  const paint = new ck.Paint()

  paint.setAntiAlias(true)
  paint.setColor(parseColor(ck, call.color, call.alpha))

  if (call.type === 'fill') {
    paint.setStyle(ck.PaintStyle.Fill)
  } else {
    paint.setStyle(ck.PaintStyle.Stroke)
    paint.setStrokeWidth(call.lineWidth)
    paint.setStrokeCap(ck.StrokeCap.Round)
    paint.setStrokeJoin(ck.StrokeJoin.Round)
  }

  if (call.shape.kind === 'rect') {
    canvas.drawRect(
      ck.XYWHRect(call.shape.x, call.shape.y, call.shape.width, call.shape.height),
      paint
    )
  }

  if (call.shape.kind === 'ellipse') {
    canvas.drawOval(
      ck.XYWHRect(
        call.shape.x - call.shape.rx,
        call.shape.y - call.shape.ry,
        call.shape.rx * 2,
        call.shape.ry * 2
      ),
      paint
    )
  }

  if (call.shape.kind === 'polygon' || call.shape.kind === 'polyline') {
    const path = new ck.Path() as unknown as SkPath
    const points = call.shape.points

    path.moveTo(points[0], points[1])

    for (let index = 2; index < points.length; index += 2) {
      path.lineTo(points[index], points[index + 1])
    }

    if (call.shape.kind === 'polygon') {
      path.close()
    }

    canvas.drawPath(path as unknown as Parameters<typeof canvas.drawPath>[0], paint)
    path.delete()
  }

  paint.delete()
}

/**
 * Рекурсивно рендерит PIXI.DisplayObject.
 */
function renderNode(ck: CanvasKit, canvas: SkCanvas, node: PIXI.DisplayObject): void {
  if (!node.visible) {
    return
  }

  canvas.save()

  applyTransform(canvas, node)

  if (node instanceof PIXI.Graphics) {
    const drawCalls = extractDrawCalls(node)

    for (const drawCall of drawCalls) {
      renderDrawCall(ck, canvas, drawCall)
    }
  }

  if (node instanceof PIXI.Container) {
    for (const child of node.children) {
      renderNode(ck, canvas, child)
    }
  }

  canvas.restore()
}

/** TODO: успеет ли отрендерить? */
export function renderPixiContainerToSkia(
  container: PIXI.Container,
  options: SkiaRendererOptions
): void {
  renderNode(options.ck, options.canvas, container)
}

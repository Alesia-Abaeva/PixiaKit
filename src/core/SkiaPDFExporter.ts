import type { CanvasKit } from '@warmBuild/index'
import * as PIXI from 'pixi.js-legacy'

import { renderPixiContainerToSkia } from './SkiaRenderer'

interface PDFExportOptions {
  ck: CanvasKit
  container: PIXI.Container
  width: number
  height: number
}

export async function exportAndDownloadPDF(
  options: PDFExportOptions,
  filename = 'scene.pdf'
): Promise<string | null> {
  if (!('MakePDFDocument' in options.ck)) {
    return 'PDF backend not available. Нужна кастомная WASM-сборка с PDF backend.'
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ckPdf = options.ck as any

  options.container.updateTransform()

  const doc = ckPdf.MakePDFDocument(options.width, options.height)

  try {
    if (!doc) throw new Error('Failed to create PDF document')

    const canvas = ckPdf._pdf_beginPage(doc._docPtr, doc._width, doc._height)

    if (!canvas) throw new Error('Failed to begin PDF page')

    const paint = new options.ck.Paint()
    paint.setColor(options.ck.Color4f(1, 1, 1, 1))
    paint.setStyle(options.ck.PaintStyle.Fill)

    canvas.drawRect(options.ck.XYWHRect(0, 0, options.width, options.height), paint)

    paint.delete()

    renderPixiContainerToSkia(options.container, {
      ck: options.ck,
      canvas,
    })

    ckPdf._pdf_endPage(doc._docPtr)
    ckPdf._pdf_close(doc._docPtr)

    const rawBytes = ckPdf._pdf_getData(doc._streamPtr ?? doc._docPtr)
    const bytes = new Uint8Array(rawBytes)

    if (!rawBytes || rawBytes.length === 0) {
      throw new Error('Empty PDF output')
    }

    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename

    document.body.appendChild(a)
    a.click()
    a.remove()

    setTimeout(() => URL.revokeObjectURL(url), 5000)
    return null
  } catch (err) {
    ckPdf._pdf_close(doc._docPtr)

    throw err instanceof Error ? err.message : String(err)
  }
}

/**
 * SkiaPDFExporter.ts
 *
 * Экспорт PIXI.Container в векторный PDF через Skia PDF backend.
 *
 * Требует кастомной WASM-сборки CanvasKit с поддержкой PDF.
 * Стандартный npm-пакет canvaskit-wasm PDF backend не включает.
 */

import * as PIXI from 'pixi.js-legacy'

import type { CanvasKit, SkCanvas } from '../types/types'
import { renderPixiContainerToSkia } from './SkiaRenderer'

interface SkPDFDocument {
  /** Открывает новую страницу и возвращает canvas для рисования. */
  beginPage(width: number, height: number): SkCanvas
  endPage(): void
  /** Завершает документ и возвращает байты PDF-файла. */
  close(): Uint8Array<ArrayBuffer>
}

export interface PDFExportOptions {
  ck: CanvasKit
  container: PIXI.Container
  width: number
  height: number
}

export type PDFExportResult =
  | { ok: true; bytes: Uint8Array<ArrayBuffer> }
  | { ok: false; error: string }

/**
 * Рендерит PIXI.Container в PDF и возвращает байты.
 *
 * Возвращает Result-объект вместо throw, чтобы вызывающий код
 * мог показать пользователю понятное сообщение об ошибке.
 */
export function exportContainerToPDF(options: PDFExportOptions): PDFExportResult {
  const { ck, container, width, height } = options

  //  Получаем PDF-документ
  const doc = makePDFDocument(ck)

  if (!doc) {
    return {
      ok: false,
      error:
        'MakePDFDocument не найден в CanvasKit. ' +
        'Нужна кастомная WASM-сборка с PDF backend. ' +
        'См. wasm-build/build.sh',
    }
  }

  try {
    // Открываем страницу
    const pageCanvas = doc.beginPage(width, height)

    //  Белый фон (PDF по умолчанию прозрачный)
    const bgPaint = new ck.Paint()
    bgPaint.setColor(ck.Color4f(1, 1, 1, 1))
    bgPaint.setStyle(ck.PaintStyle.Fill)
    pageCanvas.drawRect(ck.XYWHRect(0, 0, width, height), bgPaint)
    bgPaint.delete()

    //  Рендерим сцену
    // pageCanvas имеет тот же интерфейс что и SkCanvas от MakeSWCanvasSurface,
    // поэтому renderPixiContainerToSkia работает без изменений.
    // Все Graphics рисуются как векторные PDF-пути, не как растр.
    renderPixiContainerToSkia(container, {
      ck,
      canvas: pageCanvas,
    })

    doc.endPage()

    // Сериализуем в байты
    const bytes = doc.close()

    return { ok: true, bytes }
  } catch (err) {
    // Если что-то пошло не так — закрываем документ чтобы не течь памятью
    try {
      doc.close()
    } catch {
      /* ignore */
    }

    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Скачивает PDF-байты как файл в браузере.
 */
export function downloadPDFBytes(bytes: Uint8Array<ArrayBuffer>, filename = 'scene.pdf'): void {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()

  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/**
 * Удобная обёртка: экспортирует и сразу скачивает.
 * Возвращает строку с ошибкой или null при успехе.
 */
export function exportAndDownloadPDF(
  options: PDFExportOptions,
  filename = 'scene.pdf'
): string | null {
  const result = exportContainerToPDF(options)

  if (!result.ok) {
    return result.error
  }

  downloadPDFBytes(result.bytes, filename)
  return null
}

// Вспомогательные функции

/**
 * Пробует получить PDF-документ из CanvasKit.
 * Проверяем оба возможных имени метода — они различались в разных версиях Skia.
 */
function makePDFDocument(ck: CanvasKit): SkPDFDocument | null {
  type CanvasKitWithPDF = CanvasKit & {
    MakePDFDocument?: () => SkPDFDocument
    MakeSkPDFDocument?: () => SkPDFDocument
  }

  const ckWithPDF = ck as CanvasKitWithPDF

  if (typeof ckWithPDF.MakePDFDocument === 'function') {
    return ckWithPDF.MakePDFDocument()
  }

  if (typeof ckWithPDF.MakeSkPDFDocument === 'function') {
    return ckWithPDF.MakeSkPDFDocument()
  }

  return null
}

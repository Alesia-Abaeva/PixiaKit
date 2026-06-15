/**
 * SkiaPDFExporter.ts
 *
 * Экспорт PIXI.Container в векторный PDF через Skia PDF backend.
 *
 * Требует кастомной WASM-сборки CanvasKit с поддержкой PDF.
 * Стандартный npm-пакет canvaskit-wasm PDF backend не включает.
 */

import * as PIXI from 'pixi.js-legacy'
import type { CanvasKit } from '../types/types'
import { renderPixiContainerToSkia } from './SkiaRenderer'

// ─── Типы PDF-документа (не экспортируются из canvaskit-wasm) ────────────────

interface SkPDFDocument {
  /**
   * Открывает новую страницу и возвращает canvas для рисования.
   * Canvas имеет тот же интерфейс что и обычный SkCanvas —
   * поэтому renderPixiContainerToSkia работает без изменений.
   */
  beginPage(width: number, height: number): any
  endPage(): void
  /** Завершает документ и возвращает байты PDF-файла. */
  close(): Uint8Array
}

// ─── Публичный API ────────────────────────────────────────────────────────────

export interface PDFExportOptions {
  ck: CanvasKit
  container: PIXI.Container
  width: number
  height: number
}

export type PDFExportResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; error: string }

/**
 * Рендерит PIXI.Container в PDF и возвращает байты.
 *
 * Возвращает Result-объект вместо throw, чтобы вызывающий код
 * мог показать пользователю понятное сообщение об ошибке.
 */
export function exportContainerToPDF(options: PDFExportOptions): PDFExportResult {
  const { ck, container, width, height } = options

  // ── 1. Получаем PDF-документ ───────────────────────────────────────────────
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
    // ── 2. Открываем страницу ──────────────────────────────────────────────
    const pageCanvas = doc.beginPage(width, height)

    // ── 3. Белый фон (PDF по умолчанию прозрачный) ────────────────────────
    const bgPaint = new ck.Paint()
    bgPaint.setColor(ck.Color4f(1, 1, 1, 1))
    bgPaint.setStyle(ck.PaintStyle.Fill)
    pageCanvas.drawRect(ck.XYWHRect(0, 0, width, height), bgPaint)
    bgPaint.delete()

    // ── 4. Рендерим сцену ──────────────────────────────────────────────────
    // pageCanvas имеет тот же интерфейс что и SkCanvas от MakeSWCanvasSurface,
    // поэтому renderPixiContainerToSkia работает без изменений.
    // Все Graphics рисуются как векторные PDF-пути, не как растр.
    renderPixiContainerToSkia(container, {
      ck,
      canvas: pageCanvas,
    })

    doc.endPage()

    // ── 5. Сериализуем в байты ─────────────────────────────────────────────
    const bytes = doc.close()

    return { ok: true, bytes }
  } catch (err) {
    // Если что-то пошло не так — закрываем документ чтобы не течь памятью
    try { doc.close() } catch { /* ignore */ }

    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Скачивает PDF-байты как файл в браузере.
 */
export function downloadPDFBytes(bytes: Uint8Array, filename = 'scene.pdf'): void {
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
  filename = 'scene.pdf',
): string | null {
  const result = exportContainerToPDF(options)

  if (!result.ok) {
    return result.error
  }

  downloadPDFBytes(result.bytes, filename)
  return null
}

// ─── Вспомогательные функции ──────────────────────────────────────────────────

/**
 * Пробует получить PDF-документ из CanvasKit.
 * Проверяем оба возможных имени метода — они различались в разных версиях Skia.
 */
function makePDFDocument(ck: CanvasKit): SkPDFDocument | null {
  const ckAny = ck as any

  if (typeof ckAny.MakePDFDocument === 'function') {
    return ckAny.MakePDFDocument() as SkPDFDocument
  }

  if (typeof ckAny.MakeSkPDFDocument === 'function') {
    return ckAny.MakeSkPDFDocument() as SkPDFDocument
  }

  return null
}
/**
 * Готовые PIXI-сцены для переключения через UI.
 */

import * as PIXI from 'pixi.js-legacy'

import { makeDraggable } from './generators'

function setLineHitArea(
  line: PIXI.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  padding = 15
): void {
  const minX = Math.min(x1, x2) - padding
  const minY = Math.min(y1, y2) - padding
  const width = Math.abs(x2 - x1) + padding * 2
  const height = Math.abs(y2 - y1) + padding * 2

  line.hitArea = new PIXI.Rectangle(minX, minY, width, height)
}

/**
 * Сцена 1 — пример из задания.
 */
export function createScene1(): PIXI.Container {
  const mainContainer = new PIXI.Container()
  const subContainer = new PIXI.Container()

  const g1 = new PIXI.Graphics()
  const g2 = new PIXI.Graphics()
  const g3 = new PIXI.Graphics()
  const g4 = new PIXI.Graphics()

  g1.beginFill('#ff0000').drawEllipse(0, 0, 200, 100).endFill()

  g1.position.set(200, 100)
  g1.angle = 30
  makeDraggable(g1)

  g2.beginFill('#0000ff').drawRect(-50, -75, 100, 150).endFill()

  g2.position.set(120, 60)
  g2.angle = 15
  g2.scale.set(1.5, 1.7)
  makeDraggable(g2)

  g3.lineStyle(10, '#ffffff', 1).moveTo(0, 0).lineTo(150, 100)
  setLineHitArea(g3, 0, 0, 150, 100)
  g3.position.set(200, 100)
  g3.angle = -20
  makeDraggable(g3)

  g4.lineStyle(10, '#ffff00', 1).moveTo(0, 70).lineTo(150, -30)
  setLineHitArea(g4, 0, 70, 150, -30)

  g4.angle = 20
  makeDraggable(g4)

  subContainer.position.set(75, 50)
  subContainer.addChild(g3, g4)

  mainContainer.addChild(subContainer, g1, g2)

  return mainContainer
}

/**
 * Сцена 2 — набор простых фигур для проверки Skia-рендерера.
 */
export function createScene2(): PIXI.Container {
  const container = new PIXI.Container()

  const circle = new PIXI.Graphics()
  circle.beginFill('#9b59b6').drawEllipse(0, 0, 80, 80).endFill()
  circle.position.set(100, 100)
  makeDraggable(circle)

  const rect = new PIXI.Graphics()
  rect.beginFill('#2ecc71').drawRect(-60, -40, 120, 80).endFill()
  rect.position.set(350, 120)
  rect.angle = 25
  makeDraggable(rect)

  const ellipse = new PIXI.Graphics()
  ellipse.beginFill('#e67e22').drawEllipse(0, 0, 140, 60).endFill()
  ellipse.position.set(500, 300)
  makeDraggable(ellipse)

  const cross = new PIXI.Graphics()
  cross.beginFill('#1abc9c').drawRect(-10, -50, 20, 100).drawRect(-50, -10, 100, 20).endFill()
  cross.position.set(200, 350)
  cross.angle = 15
  makeDraggable(cross)

  const line = new PIXI.Graphics()

  line.lineStyle(6, '#e91e63', 1).moveTo(0, 0).lineTo(200, 150)
  setLineHitArea(line, 0, 0, 200, 150)
  line.position.set(50, 220)
  makeDraggable(line)

  container.addChild(circle, rect, ellipse, cross, line)

  return container
}

/**
 * Сцена 3 — сетка прямоугольников.
 * Полезна для проверки трансформаций и большого количества объектов.
 */
export function createScene3(): PIXI.Container {
  const container = new PIXI.Container()

  const COLS = 6
  const ROWS = 4
  const W = 90
  const H = 60
  const GAP = 20
  const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c']

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const g = new PIXI.Graphics()

      g.beginFill(COLORS[(col + row) % COLORS.length])
        .drawRect(0, 0, W, H)
        .endFill()

      g.position.set(40 + col * (W + GAP), 60 + row * (H + GAP))
      g.angle = (col - COLS / 2) * 5
      makeDraggable(g)

      container.addChild(g)
    }
  }

  return container
}

export const SCENES: Array<{ label: string; factory: () => PIXI.Container }> = [
  { label: 'Scene 1 — Task Example', factory: createScene1 },
  { label: 'Scene 2 — Shapes Showcase', factory: createScene2 },
  { label: 'Scene 3 — Grid', factory: createScene3 },
]

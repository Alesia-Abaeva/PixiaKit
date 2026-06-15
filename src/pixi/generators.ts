import * as PIXI from 'pixi.js-legacy'

const PALETTE = [
  '#e74c3c', '#3498db', '#2ecc71', '#f1c40f',
  '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1',
  '#ff69b4', '#00bcd4', '#ff5722', '#8bc34a',
]

function randomColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)]
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function addRandomGraphics(container: PIXI.Container): void {
  const graphics = new PIXI.Graphics()
  const fill = randomColor()
  const alpha = 0.75 + Math.random() * 0.25

  graphics.beginFill(fill, alpha)

  const x = rand(0, 520)
  const y = rand(0, 360)
  const size = 30 + Math.random() * 80

  if (Math.random() > 0.5) {
    graphics.drawRect(-size / 2, -size / 2, size, size)
  } else {
    graphics.drawCircle(0, 0, size / 2)
  }

  graphics.endFill()

  graphics.position.set(x, y)
  graphics.angle = Math.random() * 360
  graphics.scale.set(0.75 + Math.random() * 1.5)

  container.addChild(graphics)
}

export function addRandomLine(container: PIXI.Container): void {
  const line = new PIXI.Graphics()
  const color = randomColor()
  const thickness = 2 + Math.random() * 12

  line.lineStyle(thickness, color, 0.9)
  line.moveTo(0, 0)
  line.lineTo(80 + Math.random() * 180, (Math.random() - 0.5) * 160)

  line.position.set(rand(0, 520), rand(0, 360))
  line.angle = Math.random() * 360

  container.addChild(line)
}

export function addRandomObject(container: PIXI.Container): 'graphics' | 'line' {
  if (Math.random() > 0.5) {
    addRandomGraphics(container)
    return 'graphics'
  }

  addRandomLine(container)
  return 'line'
}

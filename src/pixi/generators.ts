import * as PIXI from 'pixi.js-legacy'

const PALETTE = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f1c40f',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#ecf0f1',
  '#ff69b4',
  '#00bcd4',
  '#ff5722',
  '#8bc34a',
]

function randomColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)]
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function makeDraggable(obj: PIXI.DisplayObject) {
  let dragging = false
  let dragPosition: { x: number; y: number } | null = null

  obj.eventMode = 'dynamic'
  obj.cursor = 'pointer'
  obj.interactive = true

  obj.on('pointerdown', (event: PIXI.FederatedPointerEvent) => {
    dragging = true
    dragPosition = event.global.clone()
    obj.parent?.setChildIndex(obj, obj.parent.children.length - 1)
    event.stopPropagation()
  })

  obj.on('globalpointermove', (event: PIXI.FederatedPointerEvent) => {
    if (!dragging || !dragPosition) return

    const newPosition = event.global
    const dx = newPosition.x - dragPosition.x
    const dy = newPosition.y - dragPosition.y

    obj.position.x += dx
    obj.position.y += dy

    dragPosition = newPosition.clone()
  })

  obj.on('pointerup', () => {
    dragging = false
    dragPosition = null
  })

  obj.on('pointerupoutside', () => {
    dragging = false
    dragPosition = null
  })
}

// Вспомогательная функция для обновления hitArea
function updateHitArea(graphics: PIXI.Graphics) {
  const bounds = graphics.getBounds()
  graphics.hitArea = new PIXI.Rectangle(
    bounds.x - graphics.x,
    bounds.y - graphics.y,
    bounds.width,
    bounds.height
  )
}

export function addRandomGraphics(container: PIXI.Container): void {
  const graphics = new PIXI.Graphics()
  // graphics.eventMode = 'dynamic'
  // graphics.cursor = 'pointer'
  // graphics.interactive = true
  // graphics.hitArea = graphics.getBounds()
  // graphics.buttonMode = true

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

  graphics.position.set(rand(0, container.width - 100), rand(0, container.height - 100))
  graphics.angle = Math.random() * 360
  graphics.scale.set(0.75 + Math.random() * 1.5)

  // Обновляем hitArea после установки всех свойств
  updateHitArea(graphics)

  container.addChild(graphics)
  makeDraggable(graphics)
}

export function addRandomLine(container: PIXI.Container): void {
  const line = new PIXI.Graphics()

  const color = randomColor()
  const thickness = 2 + Math.random() * 12
  const endX = 80 + Math.random() * 180
  const endY = (Math.random() - 0.5) * 160

  line.lineStyle(thickness, color, 0.9)
  line.moveTo(0, 0)
  line.lineTo(80 + Math.random() * 180, (Math.random() - 0.5) * 160)

  line.position.set(rand(0, 520), rand(0, 360))
  line.angle = Math.random() * 360

  // Для линии создаем hitArea на основе bounding box
  const bounds = line.getBounds()
  line.hitArea = new PIXI.Rectangle(-10, -10, Math.abs(endX) + 20, Math.abs(endY) + 20)

  container.addChild(line)
  makeDraggable(line)
}

export function addRandomObject(container: PIXI.Container): 'graphics' | 'line' {
  if (Math.random() > 0.5) {
    addRandomGraphics(container)
    return 'graphics'
  }

  addRandomLine(container)
  return 'line'
}

export function setupContainerInteraction(container: PIXI.Container) {
  container.eventMode = 'static'
  container.interactiveChildren = true
}

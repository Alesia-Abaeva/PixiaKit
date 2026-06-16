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

export function makeDraggable(obj: PIXI.DisplayObject) {
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
  const fill = randomColor()
  const alpha = 0.75 + Math.random() * 0.25

  graphics.beginFill(fill, alpha)

  // const x = rand(0, 520)
  // const y = rand(0, 360)
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
  // const bounds = line.getBounds()
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

export function makeGroupDraggable(targetContainer: PIXI.Container): void {
  let dragging = false
  let dragPosition: { x: number; y: number } | null = null

  // Сам контейнер тоже должен быть eventMode='dynamic', чтобы дочерние
  // события могли всплывать и чтобы клик прямо по контейнеру тоже работал.
  targetContainer.eventMode = 'dynamic'
  targetContainer.cursor = 'pointer'

  const onPointerDown = (event: PIXI.FederatedPointerEvent) => {
    dragging = true
    dragPosition = event.global.clone()

    // Поднимаем всю машину наверх z-order относительно её родителя (root),
    // а не относительно самой себя — иначе setChildIndex упадёт, т.к.
    // у targetContainer.parent могут быть другие сцены/декорации (дорога).
    targetContainer.parent?.setChildIndex(
      targetContainer,
      targetContainer.parent.children.length - 1
    )

    event.stopPropagation()
  }

  const onPointerMove = (event: PIXI.FederatedPointerEvent) => {
    if (!dragging || !dragPosition) return

    const newPosition = event.global
    const dx = newPosition.x - dragPosition.x
    const dy = newPosition.y - dragPosition.y

    // ВАЖНО: двигаем targetContainer (всю машину), а не event.currentTarget
    // (конкретную деталь, по которой кликнули).
    targetContainer.position.x += dx
    targetContainer.position.y += dy

    dragPosition = newPosition.clone()
  }

  const onPointerUp = () => {
    dragging = false
    dragPosition = null
  }

  // Навешиваем обработчики на сам контейнер...
  targetContainer.on('pointerdown', onPointerDown)
  targetContainer.on('globalpointermove', onPointerMove)
  targetContainer.on('pointerup', onPointerUp)
  targetContainer.on('pointerupoutside', onPointerUp)

  // ...и на каждого текущего ребёнка — чтобы клик по детали тоже стартовал drag.
  // Дочерние объекты получают eventMode и те же обработчики,
  // но event.stopPropagation() в onPointerDown не используется здесь —
  // событие должно дойти и сработать сразу на уровне ребёнка.
  for (const child of targetContainer.children) {
    enableChildAsDragHandle(child, onPointerDown, onPointerMove, onPointerUp)
  }
}

/** Включает у дочернего объекта possibility быть "ручкой" для перетаскивания родителя. */
function enableChildAsDragHandle(
  child: PIXI.DisplayObject,
  onPointerDown: (e: PIXI.FederatedPointerEvent) => void,
  onPointerMove: (e: PIXI.FederatedPointerEvent) => void,
  onPointerUp: () => void
): void {
  child.eventMode = 'dynamic'
  child.cursor = 'pointer'

  child.on('pointerdown', onPointerDown)
  child.on('globalpointermove', onPointerMove)
  child.on('pointerup', onPointerUp)
  child.on('pointerupoutside', onPointerUp)

  // Если ребёнок сам Container (например wheelFront с tire/rim/hub внутри),
  // рекурсивно включаем то же самое для его собственных детей —
  // иначе клик по диску колеса (rim) внутри wheelFront не сработает.
  if (child instanceof PIXI.Container) {
    for (const grandchild of child.children) {
      enableChildAsDragHandle(grandchild, onPointerDown, onPointerMove, onPointerUp)
    }
  }
}

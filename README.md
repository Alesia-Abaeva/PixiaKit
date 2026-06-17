# PixiaKit

PixiaKit — React + TypeScript приложение, которое рендерит сцены **Pixi.js** одновременно в стандартный Pixi canvas и в **Skia CanvasKit**, а также экспортирует текущую сцену в **PDF** через кастомный CanvasKit WASM с PDF backend.

Проект демонстрирует:

- собственный рендерер `PIXI.Container` средствами Skia;
- сохранение трансформаций через иерархию контейнеров;
- векторную отрисовку `PIXI.Graphics` в Skia/PDF;
- экспорт PDF без рендера всей сцены в один растр;
- интерактивность на Pixi canvas и отдельный hit-test для Skia canvas;
- модульную архитектуру через React hooks.

---

## Возможности

### Реализовано

- `PIXI.Application` с `forceCanvas: true`.
- Рендеринг Pixi-сцены в отдельный Skia canvas через CanvasKit.
- Поддержка `PIXI.Graphics`:
  - прямоугольники;
  - эллипсы;
  - линии;
  - полигоны;
  - `moveTo` / `lineTo`.
- Переключение между несколькими готовыми сценами.
- Добавление случайных фигур и линий.
- Drag-and-drop объектов на Pixi canvas.
- Hit-test на Skia canvas через `EventBridge`.
- Экспорт в PDF через `Skia PDF backend`.
- Кастомная сборка CanvasKit WASM в `wasm-build/`.

### Ограничения

- `PIXI.Sprite` поддерживается в структуре типов, но текущие демонстрационные сцены используют в основном `PIXI.Graphics`.
- PDF backend доступен только при наличии кастомной сборки CanvasKit в `public/canvaskit`.
- Hit-test на Skia canvas использует bounding box, поэтому для сильно повернутых объектов область попадания приближенная.
- Нативная сборка CanvasKit требует Linux/macOS или Docker.

---

## Быстрый старт

```bash
npm install
npm run dev
```

Откройте:

```text
http://localhost:5173
```

Без кастомной WASM-сборки приложение может не загрузить CanvasKit, если в `public/canvaskit` нет файлов:

```text
public/canvaskit/canvaskit.js
public/canvaskit/canvaskit.wasm
```

---

## Команды

```bash
npm run dev      # запуск dev-сервера Vite
npm run build    # TypeScript build + Vite production build
npm run lint     # ESLint
npm run preview  # preview production-сборки
```

---

## Структура проекта

```txt
PixiaKit/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── eslint.config.mjs
├── public/
│   └── canvaskit/
│       ├── canvaskit.js       ← runtime CanvasKit WASM
│       └── canvaskit.wasm     ← runtime CanvasKit WASM
├── src/
│   ├── main.tsx               ← React entry point
│   ├── App.tsx                ← главный экран и UI
│   ├── index.css              ← глобальные стили + Tailwind
│   ├── App.css                ← legacy styles, если используются
│   ├── core/                  ← низкоуровневые модули
│   │   ├── index.ts
│   │   ├── CanvasKitLoader.ts ← загрузка кастомного CanvasKit
│   │   ├── EventBridge.ts     ← hit-test и pointer events для Skia canvas
│   │   ├── SkiaRenderer.ts    ← PIXI.Container → Skia rendering
│   │   └── SkiaPDFExporter.ts ← экспорт текущей сцены в PDF
│   ├── hooks/                 ← React hooks
│   │   ├── index.ts
│   │   ├── useCanvasKit.ts    ← загрузка CanvasKit
│   │   ├── useEventBridge.ts  ← подключение EventBridge
│   │   ├── useLogger.ts       ← хранение логов
│   │   ├── usePixiSkiaRenderLoop.ts
│   │   ├── useSceneSwitcher.ts
│   │   └── useSkiaSurface.ts  ← создание Skia surface
│   ├── pixi/                  ← Pixi сцены и утилиты
│   │   ├── index.ts
│   │   ├── generators.ts      ← drag, случайные фигуры, линии
│   │   └── scene.ts           ← готовые сцены
│   └── types/
│       └── types.ts           ← общие типы Skia/CanvasKit/Pixi
└── wasm-build/
    ├── build.sh               ← Bash-сборка CanvasKit с PDF
    ├── canvaskit.patch        ← патч/описание изменений
    ├── Dockerfile             ← Docker-сборка
    ├── out/                   ← результат сборки
    │   ├── canvaskit.js
    │   ├── canvaskit.wasm
    │   ├── index.d.ts
    │   └── package.json
    └── README.md              ← инструкция по сборке WASM
```

---

## Как устроено приложение

### `App.tsx`

Главный компонент отвечает за UI:

- Pixi canvas;
- Skia output canvas;
- кнопку добавления случайной фигуры;
- кнопку экспорта в PDF;
- кнопки переключения сцен;
- лог событий.

Основная логика вынесена в hooks.

### `src/core/SkiaRenderer.ts`

Рекурсивно проходит по `PIXI.Container` и рисует каждый `PIXI.DisplayObject` на CanvasKit canvas.

Для `PIXI.Graphics` извлекаются draw calls из `geometry.graphicsData`, после чего они переводятся в Skia:

- прямоугольники — `drawRect`;
- эллипсы — `drawOval`;
- линии/полигоны — `drawPath`.

Трансформации применяются через `PIXI.DisplayObject.localTransform`.

### `src/core/SkiaPDFExporter.ts`

Экспортирует текущую сцену в PDF:

1. Проверяет наличие PDF backend в CanvasKit.
2. Создает PDF document через `MakePDFDocument`.
3. Открывает страницу через `_pdf_beginPage`.
4. Рисует белый фон.
5. Вызывает `renderPixiContainerToSkia`.
6. Закрывает PDF и скачивает файл.

`PIXI.Graphics` сохраняются как векторные элементы PDF.

### `src/core/EventBridge.ts`

Skia canvas после отрисовки — обычный DOM canvas, поэтому Pixi events на нем автоматически не работают.

`EventBridge` делает hit-test по координатам клика на Skia canvas и вызывает логику событий Pixi-объектов.

### `src/pixi/scene.ts`

Содержит готовые сцены:

- `createScene1` — пример из задания;
- `createScene2` — набор фигур для проверки рендера;
- `createScene3` — сетка прямоугольников.

### `src/pixi/generators.ts`

Содержит утилиты:

- `makeDraggable`;
- `addRandomObject`;
- `addRandomGraphics`;
- `addRandomLine`;
- `setupContainerInteraction`;
- `makeGroupDraggable`.

### `src/hooks/*`

Hooks разделяют ответственность приложения:

- `useCanvasKit` — загрузка CanvasKit;
- `useSkiaSurface` — создание Skia surface;
- `usePixiSkiaRenderLoop` — создание Pixi app и общий render loop;
- `useSceneSwitcher` — переключение сцен;
- `useEventBridge` — подключение hit-test к Skia canvas;
- `useLogger` — хранение и добавление логов.

---

## CanvasKit и PDF backend

Стандартный npm-пакет `canvaskit-wasm` не включает PDF backend.

Для экспорта в PDF проект использует кастомную WASM-сборку CanvasKit.

Runtime-файлы должны лежать здесь:

```txt
public/canvaskit/canvaskit.js
public/canvaskit/canvaskit.wasm
```

Загрузчик находится в:

```txt
src/core/CanvasKitLoader.ts
```

Он загружает CanvasKit через:

```ts
CanvasKitInit({
  locateFile: (file: string) => `${import.meta.env.BASE_URL}canvaskit/${file}`,
})
```

Vite alias для локальной сборки настроен в `vite.config.ts`:

```ts
alias: {
  '@warmBuild': fileURLToPath(new URL('wasm-build/out/canvaskit.js', import.meta.url')),
  'wasmBuild': fileURLToPath(new URL('wasm-build/out', import.meta.url')),
}
```

---

## Сборка кастомного CanvasKit WASM

Подробная инструкция находится в:

```txt
wasm-build/README.md
```

Кратко:

### Docker

```powershell
docker build -t pixiakit-wasm-builder .\wasm-build

docker run --rm `
  -v "${PWD}\wasm-build\out:/output" `
  pixiakit-wasm-builder
```

Затем:

```powershell
New-Item -ItemType Directory -Force public/canvaskit
Copy-Item wasm-build/out/canvaskit.js public/canvaskit/canvaskit.js
Copy-Item wasm-build/out/canvaskit.wasm public/canvaskit/canvaskit.wasm
```

### Bash

```bash
cd wasm-build
chmod +x build.sh
./build.sh
```

После сборки скопируйте файлы из `wasm-build/out/` в `public/canvaskit/`.

---

## Как проверить работу

1. Запустить проект:

   ```bash
   npm run dev
   ```

2. Открыть `http://localhost:5173`.

3. Проверить, что:

   - Pixi canvas отображает сцену;
   - Skia canvas отображает такую же сцену;
   - объекты можно перетаскивать на Pixi canvas;
   - клики по Skia canvas попадают в лог через `EventBridge`;
   - кнопка `Add random shape` добавляет новую фигуру или линию;
   - кнопки сцен переключают текущий контейнер;
   - кнопка `Export PDF` скачивает PDF-файл.

4. В логах приложения должно быть сообщение, похожее на:

   ```txt
   CanvasKit loaded with PDF support
   ```

---

## Технологический стек

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Pixi.js Legacy 7.2.4
- CanvasKit / Skia WASM
- ESLint + Prettier
- Docker для сборки WASM


или

```bash
npm install
npm run start
```

---

# PixiaKit

**PIXI.js → Skia (CanvasKit) → PDF**

Приложение рендерит `PIXI.Container` через Skia CanvasKit и экспортирует сцену в векторный PDF.

---

## Быстрый старт

```bash
npm install
npm run dev
```

Откройте [http://localhost:5173](http://localhost:5173).

> **Примечание:** PDF-экспорт требует кастомной WASM-сборки (см. ниже).  
> Без неё PIXI-рендер и Skia-canvas работают полностью.

---

## Структура проекта

```
pixiakit/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── wasm-build/
│   ├── build.sh          ← скрипт сборки WASM (Linux/macOS)
│   └── Dockerfile        ← Docker-вариант сборки
└── src/
    ├── main.tsx           ← React entry point
    ├── App.tsx            ← главный компонент
    ├── index.css
    ├── core/
    │   ├── CanvasKitLoader.ts   ← умный загрузчик (кастомный / npm fallback)
    │   ├── SkiaRenderer.ts      ← PIXI → Skia обёртка
    │   ├── SkiaPDFExporter.ts   ← экспорт в PDF
    │   └── EventBridge.ts       ← pointerdown/pointerup на Skia canvas
    └── pixi/
        ├── scene.ts       ← 3 готовые сцены
        └── generators.ts  ← генератор случайных фигур
```

---

## Компиляция кастомного CanvasKit с PDF-бэкендом

Стандартный `canvaskit-wasm` из npm **не включает PDF backend**.  
Чтобы получить `MakePDFDocument`, нужно скомпилировать Skia самостоятельно.

### Вариант А — Docker (рекомендуется, работает везде)

```bash
cd wasm-build

# Собрать образ (занимает 20–40 мин при первом запуске)
docker build -t pixiakit-wasm-builder .

# Запустить сборку, результат появится в ./out/
docker run --rm -v $(pwd)/out:/build/out pixiakit-wasm-builder

# Скопировать в проект
mkdir -p ../public/canvaskit
cp out/canvaskit.js  ../public/canvaskit/
cp out/canvaskit.wasm ../public/canvaskit/
```

### Вариант Б — Нативная сборка (Linux / macOS)

#### 1. Установите зависимости

**macOS:**
```bash
brew install ninja cmake python3 git
```

**Ubuntu / Debian:**
```bash
sudo apt-get install -y git python3 ninja-build cmake curl xz-utils
```

#### 2. Запустите скрипт сборки

```bash
cd wasm-build
chmod +x build.sh
./build.sh
```

Скрипт автоматически:
- Установит Emscripten SDK 3.1.44
- Клонирует Skia ветку `chrome/m114`
- Синхронизирует зависимости Skia
- Скомпилирует CanvasKit с флагом `pdf`
- Положит результат в `wasm-build/out/`

#### 3. Скопируйте результат в проект

```bash
mkdir -p public/canvaskit
cp wasm-build/out/canvaskit.js   public/canvaskit/
cp wasm-build/out/canvaskit.wasm public/canvaskit/
```

#### 4. Перезапустите dev-сервер

```bash
npm run dev
```

Кнопка **"⬇ Export PDF"** станет активной автоматически — `CanvasKitLoader` обнаружит файлы в `/canvaskit/` и использует кастомную сборку.

---

## Как это работает

### CanvasKitLoader (умный загрузчик)

При старте приложения:

```
1. Проверяет наличие /canvaskit/canvaskit.js (HEAD-запрос)
   ├── Найден → загружает кастомную сборку (PDF ✓)
   └── Не найден → загружает npm canvaskit-wasm (PDF ✗, но рендер работает)
```

### SkiaRenderer (PIXI → Skia)

Рекурсивно обходит дерево `PIXI.Container`:

```
PIXI.Container
  └── apply transform (translate → rotate → scale)
      ├── PIXI.Graphics → extractDrawCalls() → renderDrawCall()
      │     └── geometry.graphicsData → Skia Path / Oval / Rect
      ├── PIXI.Sprite → renderSprite()
      │     └── читает пиксели из HTMLImageElement → ck.MakeImage()
      └── PIXI.Container → рекурсия
```

### SkiaPDFExporter

```
ck.MakePDFDocument()        ← Skia PDF backend
  └── doc.beginPage(w, h)   ← получаем Skia canvas
       └── renderPixiContainerToSkia()  ← те же вызовы, что и для экрана
  └── doc.endPage()
  └── doc.close()           ← Uint8Array с PDF-байтами
```

PDF получается **векторным**: все `PIXI.Graphics` → PDF paths, `PIXI.Sprite` → bitmap.

### EventBridge (события)

```
Skia canvas (DOM element)
  └── pointerdown / pointerup listener
       └── getBoundingClientRect() → координаты клика
            └── для каждого зарегистрированного PIXI.DisplayObject
                 └── getBounds() → AABB hit-test
                      └── obj.emit('pointerdown', event)
```

---

## Размер WASM и время сборки

| | Файл | Размер | Время сборки |
|---|---|---|---|
| npm (без PDF) | canvaskit.wasm | ~8 MB | — |
| кастомный (с PDF) | canvaskit.wasm | ~9–10 MB | 20–40 мин |

---

## Известные ограничения

- **`moveTo` / `lineTo` в PIXI.Graphics** — PIXI v7 хранит линии как `PIXI.SHAPES.POLY` с массивом точек. Они корректно рендерятся через Skia Path.
- **Hit-test** — используется AABB (ось-выровненный прямоугольник). Для сильно повёрнутых объектов область клика приблизительная.
- **Sprites в PDF** — встраиваются как растровые изображения (по условию задания).
- **`forceCanvas: true`** — указан при создании PIXI.Application согласно требованиям.

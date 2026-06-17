# wasm-build

Эта папка содержит инструменты для сборки **кастомного CanvasKit WASM** с поддержкой PDF backend.

Стандартный пакет `canvaskit-wasm` из npm не включает PDF backend. Поэтому для экспорта в PDF проект использует отдельную WASM-сборку CanvasKit, собранную из Skia.

---

## Что лежит в папке

```txt
wasm-build/
├── build.sh             ← Bash-скрипт сборки CanvasKit с PDF
├── canvaskit.patch      ← патч/описание изменений для CanvasKit/Skia
├── Dockerfile           ← Docker-образ для воспроизводимой сборки
├── out/                 ← результат сборки
│   ├── canvaskit.js
│   ├── canvaskit.wasm
│   ├── index.d.ts
│   └── package.json
└── README.md            ← этот файл
```

---

## Быстрый старт

Если нужны только готовые артефакты из `wasm-build/out`, скопируй их в `public/canvaskit`:

### PowerShell

```powershell
New-Item -ItemType Directory -Force public/canvaskit
Copy-Item wasm-build/out/canvaskit.js public/canvaskit/canvaskit.js
Copy-Item wasm-build/out/canvaskit.wasm public/canvaskit/canvaskit.wasm
```

После этого запусти dev-сервер:

```powershell
npm run dev
```

Приложение загрузит CanvasKit из:

```txt
/canvaskit/canvaskit.js
/canvaskit/canvaskit.wasm
```

---

## Вариант A — Docker-сборка

Docker-сборка рекомендуется, если нужно повторить сборку в чистой Linux-среде.

### 1. Собрать образ

```powershell
docker build -t pixiakit-wasm-builder .\wasm-build
```

### 2. Запустить сборку

```powershell
docker run --rm `
  -v "${PWD}\wasm-build\out:/output" `
  pixiakit-wasm-builder
```

Результат появится в:

```txt
wasm-build/out/
```

### 3. Скопировать артефакты в проект

```powershell
New-Item -ItemType Directory -Force public/canvaskit
Copy-Item wasm-build/out/canvaskit.js public/canvaskit/canvaskit.js
Copy-Item wasm-build/out/canvaskit.wasm public/canvaskit/canvaskit.wasm
```

---

## Вариант B — нативная Bash-сборка

Этот вариант работает в Linux/macOS-среде, где доступен Bash.

### 1. Установить зависимости

Для Ubuntu/Debian:

```bash
sudo apt-get install -y \
  git \
  python3 \
  python3-pip \
  ninja-build \
  cmake \
  curl \
  wget \
  xz-utils \
  ca-certificates \
  libglib2.0-dev
```

### 2. Запустить сборку

```bash
cd wasm-build
chmod +x build.sh
./build.sh
```

По умолчанию результат будет записан в:

```txt
wasm-build/out/
```

или в Docker-контейнере — в `/output`.

---

## Что делает `build.sh`

Скрипт выполняет 5 шагов:

1. Клонирует Skia в `/build/skia`.
2. Патчит `DEPS`, чтобы пропустить тяжёлые зависимости `dawn` и `swiftshader`.
3. Синхронизирует зависимости Skia.
4. Применяет PDF patch к `canvaskit_bindings.cpp`.
5. Собирает CanvasKit с флагом PDF и копирует артефакты в выходную папку.

Ключевые изменения сборки:

```bash
sed -i 's/skia_enable_pdf=false/skia_enable_pdf=true/' compile.sh
bash compile.sh is_debug=false extra_cflags='["-DCK_ENABLE_PDF"]'
```

---

## Что делает PDF patch

В `canvaskit_bindings.cpp` добавляются binding-функции:

```cpp
MakePDFDocument
_pdf_beginPage
_pdf_endPage
_pdf_close
_pdf_getData
```

Они доступны в собранном CanvasKit как:

```ts
ck.MakePDFDocument(...)
ck._pdf_beginPage(...)
ck._pdf_endPage(...)
ck._pdf_close(...)
ck._pdf_getData(...)
```

---

## Как проект использует собранную сборку

В `vite.config.ts` настроен alias:

```ts
alias: {
  '@warmBuild': fileURLToPath(new URL('wasm-build/out/canvaskit.js', import.meta.url)),
  'wasmBuild': fileURLToPath(new URL('wasm-build/out', import.meta.url)),
}
```

`src/core/CanvasKitLoader.ts` загружает CanvasKit из публичной папки:

```ts
CanvasKitInit({
  locateFile: (file: string) => `${import.meta.env.BASE_URL}canvaskit/${file}`,
})
```

То есть runtime-файлы должны лежать здесь:

```txt
public/canvaskit/canvaskit.js
public/canvaskit/canvaskit.wasm
```

---

## Проверка PDF support

После запуска приложения проверь логи в браузере.

Если всё работает, должно быть что-то вроде:

```txt
CanvasKit loaded with PDF support
```

Кнопка **Export PDF** должна скачивать файл `pixiakit-scene.pdf`.

---

## Известные ограничения

- Сборка Skia может занимать 20–40 минут при первом запуске.
- `./emsdk install latest` может со временем сломаться из-за изменения `latest`. Для стабильной сборки лучше зафиксировать конкретную версию Emscripten.
- PDF backend требует кастомной сборки. Обычный `canvaskit-wasm` из npm PDF не поддерживает.
- `PIXI.Sprite` экспортируется как bitmap, `PIXI.Graphics` — как векторные пути/прямоугольники/овалы.


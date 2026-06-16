#!/usr/bin/env bash
# build-manual.sh

set -euo pipefail

SKIA_VERSION="chrome/m126"
EMSDK_VERSION="3.1.44"
OUT_DIR="$(pwd)/out"

# ── Настройка путей ──────────────────────────────────────────────────────────
export PATH="/build/emsdk:/build/emsdk/upstream/emscripten:${PATH}"
export EMSDK="/build/emsdk"
export EM_CONFIG="/build/emsdk/.emscripten"

cd skia

# ── Генерация сборки через GN ───────────────────────────────────────────────
echo ">>> Generating build files with GN..."

./bin/gn gen out/canvaskit_wasm --args='
  target_cpu="wasm32" 
  is_debug=false 
  skia_use_system_libjpeg_turbo=false 
  skia_use_system_libpng=false 
  skia_use_system_zlib=false 
  skia_use_system_icu=false
  skia_use_libwebp=false 
  skia_use_libjpeg_turbo_decode=false 
  skia_use_libjpeg_turbo_encode=false
  skia_use_libpng_decode=false 
  skia_use_libpng_encode=false
  skia_use_lua=false 
  skia_use_piex=false
  skia_use_dng_sdk=false 
  skia_use_expat=false
  skia_use_fontconfig=false 
  skia_use_freetype=true
  skia_use_harfbuzz=true 
  skia_use_icu=false
  skia_use_sfntly=false 
  skia_use_xml=false
  skia_enable_skottie=false 
  skia_enable_sksl_tracing=false
  skia_enable_particles=false 
  skia_enable_ccpr=false
  skia_enable_gpu=false 
  skia_enable_skparagraph=false
  skia_enable_pdf=true           # ← ВКЛЮЧАЕМ PDF
  skia_enable_skunicode=true
  extra_cflags=["-s", "WASM=1", "-s", "EXPORT_NAME=CanvasKitInit", "-s", "EXPORTED_RUNTIME_METHODS=['cwrap','getValue','setValue']"]
'

# ── Сборка ────────────────────────────────────────────────────────────────────
echo ">>> Building CanvasKit with ninja..."
ninja -C out/canvaskit_wasm canvaskit

# ── Проверка наличия PDF символов ────────────────────────────────────────────
echo ">>> Checking for PDF symbols..."
if grep -q "MakePDFDocument" out/canvaskit_wasm/canvaskit.js; then
    echo "✅ PDF support found in canvaskit.js"
else
    echo "❌ PDF support NOT found - checking alternative..."
    if grep -q "MakeSkPDFDocument" out/canvaskit_wasm/canvaskit.js; then
        echo "✅ PDF support found (MakeSkPDFDocument)"
    else
        echo "⚠️  PDF support may be missing"
    fi
fi

# ── Копирование ───────────────────────────────────────────────────────────────
mkdir -p "$OUT_DIR"
cp out/canvaskit_wasm/canvaskit.js "$OUT_DIR/"
cp out/canvaskit_wasm/canvaskit.wasm "$OUT_DIR/"

echo "✅ Build complete!"
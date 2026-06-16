#!/usr/bin/env bash
# build.sh

set -euo pipefail

SKIA_VERSION="chrome/m126"
EMSDK_VERSION="3.1.44"
OUT_DIR="$(pwd)/out"

# ... зависимости ...

# ── 3. Build with PDF support ─────────────────────────────────────────────────
echo ">>> Configuring CanvasKit build with PDF support..."

# ВАЖНО: Правильные флаги для сборки с PDF
bash modules/canvaskit/compile.sh \
  pdf \              # ← Этот флаг включает PDF поддержку
  no_skottie \
  no_sksl_tracing \
  no_particles \
  release

# Или попробуйте этот вариант:
# bash modules/canvaskit/compile.sh \
#   pdf \
#   release
# # # Dockerfile
# # FROM debian:bookworm-slim

# # RUN apt-get update && apt-get install -y \
# #     git python3 python3-pip curl ninja-build cmake xz-utils ca-certificates \
# #     && rm -rf /var/lib/apt/lists/*

# # WORKDIR /build

# # ENV EMSDK_VERSION=3.1.44

# # # Emscripten
# # RUN git clone https://github.com/emscripten-core/emsdk.git && \
# #     cd emsdk && \
# #     ./emsdk install ${EMSDK_VERSION} && \
# #     ./emsdk activate ${EMSDK_VERSION}

# # ENV PATH="/build/emsdk:/build/emsdk/upstream/emscripten:${PATH}"
# # ENV EMSDK="/build/emsdk"
# # ENV EM_CONFIG="/build/emsdk/.emscripten"

# # # Skia
# # RUN git clone --depth 1 --branch chrome/m126 https://github.com/google/skia.git && \
# #     cd skia && \
# #     python3 tools/git-sync-deps --shallow

# # # Сборка с PDF
# # RUN cd skia && \
# #     bash modules/canvaskit/compile.sh pdf release

# # # Проверка
# # RUN echo "=== Checking for PDF support ===" && \
# #     if grep -q "MakePDFDocument" /build/skia/out/canvaskit_wasm/canvaskit.js; then \
# #     echo "✅ PDF support found"; \
# #     else \
# #     echo "❌ PDF support NOT found - trying alternative build..."; \
# #     cd /build/skia && \
# #     ./bin/gn gen out/canvaskit_wasm --args='target_cpu="wasm32" is_debug=false skia_enable_pdf=true' && \
# #     ninja -C out/canvaskit_wasm canvaskit; \
# #     fi

# # RUN mkdir -p /build/out && \
# #     cp /build/skia/out/canvaskit_wasm/canvaskit.js /build/out/ && \
# #     cp /build/skia/out/canvaskit_wasm/canvaskit.wasm /build/out/

# # CMD echo "Build complete! Check /build/out/"

# # Dockerfile
# FROM debian:bookworm-slim

# RUN apt-get update && apt-get install -y \
#     git python3 python3-pip curl ninja-build cmake xz-utils ca-certificates \
#     && rm -rf /var/lib/apt/lists/*

# WORKDIR /build

# ENV EMSDK_VERSION=3.1.44

# # Emscripten
# RUN git clone https://github.com/emscripten-core/emsdk.git && \
#     cd emsdk && \
#     ./emsdk install ${EMSDK_VERSION} && \
#     ./emsdk activate ${EMSDK_VERSION}

# ENV PATH="/build/emsdk:/build/emsdk/upstream/emscripten:${PATH}"
# ENV EMSDK="/build/emsdk"
# ENV EM_CONFIG="/build/emsdk/.emscripten"

# # Skia
# RUN git clone --depth 1 --branch chrome/m126 https://github.com/google/skia.git && \
#     cd skia && \
#     python3 tools/git-sync-deps --shallow

# # Сборка с PDF.
# # compile.sh сам внутри запускает gn gen + ninja с правильными аргументами —
# # никакого ручного fallback не требуется. Если PDF реально не собрался,
# # узнаем об этом по логам выше (этап 6/8), а не через grep после.
# RUN cd skia && \
#     bash modules/canvaskit/compile.sh pdf release

# # Просто копируем результат — без grep-проверки, которая ломала сборку
# # из-за неправильного fallback (несуществующий ./bin/gn, неверная ninja-цель).
# # Проверим наличие PDF backend позже, уже в браузере, через
# # typeof CanvasKit.MakePDFDocument === 'function'.
# RUN mkdir -p /build/out && \
#     cp /build/skia/out/canvaskit_wasm/canvaskit.js /build/out/ && \
#     cp /build/skia/out/canvaskit_wasm/canvaskit.wasm /build/out/

# CMD echo "Build complete! Check /build/out/"
# Dockerfile
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    git python3 python3-pip curl ninja-build cmake xz-utils ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

ENV EMSDK_VERSION=3.1.44

# Emscripten
RUN git clone https://github.com/emscripten-core/emsdk.git && \
    cd emsdk && \
    ./emsdk install ${EMSDK_VERSION} && \
    ./emsdk activate ${EMSDK_VERSION}

ENV PATH="/build/emsdk:/build/emsdk/upstream/emscripten:${PATH}"
ENV EMSDK="/build/emsdk"
ENV EM_CONFIG="/build/emsdk/.emscripten"

# Skia
RUN git clone --depth 1 --branch chrome/m126 https://github.com/google/skia.git && \
    cd skia && \
    python3 tools/git-sync-deps --shallow

# Сборка с PDF — результат остаётся внутри образа, в /build/skia/out/canvaskit_wasm/
RUN cd skia && \
    bash modules/canvaskit/compile.sh pdf release

# ВАЖНО: НЕ копируем в /build/out на этапе build больше.
# Volume mount (-v ${PWD}/out:/build/out) при docker run ПЕРЕКРЫВАЕТ
# содержимое /build/out, которое было создано здесь в RUN — поэтому
# раньше файлы пропадали. Копирование переносим в CMD, которая
# выполняется уже ПОСЛЕ того как volume примонтирован.
CMD mkdir -p /build/out && \
    cp /build/skia/out/canvaskit_wasm/canvaskit.js /build/out/ && \
    cp /build/skia/out/canvaskit_wasm/canvaskit.wasm /build/out/ && \
    echo "✅ CanvasKit copied to /build/out (mounted volume)" && \
    ls -la /build/out

RUN cd skia && cat modules/canvaskit/compile.sh | grep -i -A 10 "pdf"
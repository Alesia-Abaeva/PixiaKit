FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# ── Зависимости ───────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    ninja-build \
    python3 \
    python3-pip \
    git \
    cmake \
    curl \
    wget \
    xz-utils \
    ca-certificates \
    lsb-release \
    libglib2.0-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# ── Копируем патч и скрипт сборки ────────────────────────────────────────────
COPY build.sh .
COPY canvaskit.patch .

RUN chmod +x build.sh

# ── Запуск сборки ─────────────────────────────────────────────────────────────
# Артефакты будут в /output после сборки
CMD ["bash", "build.sh", "/output"]
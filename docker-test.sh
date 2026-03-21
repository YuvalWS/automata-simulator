#!/bin/bash
# Run all tests (unit + E2E) inside Docker with Node 22 + Playwright
# Usage: bash docker-test.sh [unit|e2e|all]
# Note: On Windows/MSYS, set MSYS_NO_PATHCONV=1 before running
#   MSYS_NO_PATHCONV=1 bash docker-test.sh

MODE="${1:-all}"
IMAGE="mcr.microsoft.com/playwright:v1.58.2-noble"

# Detect project root (works on both Linux and Windows with MSYS)
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd -W 2>/dev/null || pwd)"

DOCKER_RUN="docker run --rm -v ${PROJECT_DIR}:/app -w /app $IMAGE"

case "$MODE" in
  unit)
    echo "=== Running unit tests ==="
    $DOCKER_RUN bash -c "npm install --prefer-offline 2>&1 | tail -3 && npx vitest run"
    ;;
  e2e)
    echo "=== Running E2E tests ==="
    $DOCKER_RUN bash -c "npm install --prefer-offline 2>&1 | tail -3 && npx playwright test"
    ;;
  all)
    echo "=== Running all tests (unit + E2E) ==="
    $DOCKER_RUN bash -c "npm install --prefer-offline 2>&1 | tail -3 && npx vitest run && npx playwright test"
    ;;
  *)
    echo "Usage: bash docker-test.sh [unit|e2e|all]"
    exit 1
    ;;
esac

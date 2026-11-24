#!/usr/bin/env bash
# Install or reuse ~/saju-calc (override with SAJU_CALC_HOME). Prints the install dir.
set -euo pipefail
REPO_URL="${SAJU_CALC_REPO:-https://github.com/Poetrion93/saju-calc.git}"
ARCHIVE_URL="${SAJU_CALC_ARCHIVE:-https://github.com/Poetrion93/saju-calc/archive/refs/heads/main.tar.gz}"
DIR="${SAJU_CALC_HOME:-$HOME/saju-calc}"

is_ready() { [[ -f "$1/scripts/saju-calc.mjs" && -f "$1/package.json" ]]; }

if ! is_ready "$DIR"; then
  tmp="$(mktemp -d)"
  cleanup() { rm -rf "$tmp"; }
  trap cleanup EXIT
  fetched=0
  if command -v git >/dev/null 2>&1; then
    if git clone --depth 1 "$REPO_URL" "$tmp/src" >/dev/null 2>&1; then
      fetched=1
    fi
  fi
  if [[ "$fetched" -ne 1 ]]; then
    if command -v curl >/dev/null 2>&1; then
      curl -fsSL "$ARCHIVE_URL" -o "$tmp/src.tgz"
    elif command -v wget >/dev/null 2>&1; then
      wget -q -O "$tmp/src.tgz" "$ARCHIVE_URL"
    else
      echo "git 또는 curl/wget이 필요해. Node 18+와 함께 설치해 줘." >&2
      exit 1
    fi
    mkdir -p "$tmp/src"
    tar -xzf "$tmp/src.tgz" -C "$tmp/src" --strip-components=1
    fetched=1
  fi
  mkdir -p "$DIR"
  cp -R "$tmp/src/." "$DIR/"
fi

cd "$DIR"
if [[ ! -d node_modules/manseryeok || ! -d node_modules/iztro ]]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "npm(Node 18+)이 필요해." >&2
    exit 1
  fi
  npm install --omit=dev
fi
printf '%s\n' "$DIR"

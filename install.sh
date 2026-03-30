#!/usr/bin/env bash
set -e

echo "🧰 LifeKit Installer"
echo "━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. 사전 요구사항 체크
if ! command -v bun &> /dev/null; then
  echo "❌ bun이 설치되어 있지 않습니다."
  echo ""
  echo "  bun 설치 방법:"
  echo "    curl -fsSL https://bun.sh/install | bash"
  echo ""
  echo "  설치 후 다시 실행해주세요."
  exit 1
fi

if ! command -v git &> /dev/null; then
  echo "❌ git이 설치되어 있지 않습니다."
  echo "  Xcode CLI tools: xcode-select --install"
  exit 1
fi

echo "✅ bun $(bun --version) 확인"
echo ""

# 2. git clone (이미 디렉토리 있으면 스킵, pull만)
INSTALL_DIR="$HOME/lifekit"
if [ -d "$INSTALL_DIR" ]; then
  echo "📂 Existing installation found, updating..."
  cd "$INSTALL_DIR" && git pull
else
  echo "📥 Cloning LifeKit..."
  git clone https://github.com/coolcoolk/openclaw-lifekit "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

echo ""

# 3. bun install
echo "📦 Installing dependencies..."
bun install

echo ""

# 4. lifekit init 실행
echo "🚀 Starting setup..."
bun run lifekit init

echo ""
echo "━━━━━━━━━━━━━━━━━━━━"
echo "✅ LifeKit 설치 완료!"
echo "📁 위치: $INSTALL_DIR"

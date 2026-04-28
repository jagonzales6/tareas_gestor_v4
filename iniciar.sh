#!/bin/bash
# ============================================================
#  Gestor de Tareas NIHR v4 — Arranque Ubuntu Server / Linux
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
ENV_FILE="$BACKEND_DIR/.env"

echo ""
echo "============================================"
echo "  Gestor de Tareas NIHR v4"
echo "============================================"
echo ""

# --- Node.js ---
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js no está instalado."
  echo "Instala con:  sudo apt install -y nodejs npm"
  exit 1
fi
echo "✓ Node.js $(node --version)"

# --- .env ---
if [ ! -f "$ENV_FILE" ]; then
  echo ""
  echo "⚠️  No se encontró backend/.env"
  echo "   Creando desde .env.example..."
  cp "$BACKEND_DIR/.env.example" "$ENV_FILE"
  echo ""
  echo "   ✏️  Edita el archivo antes de continuar:"
  echo "      nano $ENV_FILE"
  echo ""
  echo "   Campos mínimos a cambiar:"
  echo "     SESSION_SECRET  → cadena larga y aleatoria"
  echo "     DATABASE_URL    → ./data/nihr.db (ya configurado por defecto)"
  echo ""
  read -rp "   ¿Continuar de todos modos? [s/N]: " resp
  [[ "$resp" =~ ^[sS]$ ]] || exit 0
fi

cd "$BACKEND_DIR"

# --- Dependencias ---
if [ ! -d "node_modules" ]; then
  echo ""
  echo "📦 Instalando dependencias (primera vez, puede tardar ~2 min)..."
  npm install --omit=dev
  echo ""
fi

# --- Crear directorios de datos ---
mkdir -p data/uploads/evidencias data/uploads/anuncios data/uploads/presupuestos data/uploads/comprobantes

echo ""
echo "============================================"
echo "  ✅ Iniciando servidor en puerto 3000"
echo "============================================"
echo ""
echo "  Frontend (en el mismo servidor):"
echo "    http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "  Login inicial:"
echo "    Email:      admin@unifranz.edu"
echo "    Contraseña: Nihr2026!"
echo ""
echo "  La base de datos SQLite se crea automáticamente."
echo "  Presiona Ctrl+C para detener el servidor."
echo ""
echo "============================================"
echo ""

# --- Arrancar ---
npm start

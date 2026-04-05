#!/usr/bin/env bash
# ==============================================================================
# deploy-ubuntu.sh — Despliegue con Docker en Ubuntu 22.04 / 24.04 LTS
# Gestor de Tareas NIHR v4
#
# PREREQUISITOS:
#   - Usuario con sudo (NO ejecutar como root)
#   - El repositorio ya está clonado en este directorio
#   - Tener backend/.env listo con credenciales reales
#
# USO:
#   chmod +x deploy-ubuntu.sh
#   ./deploy-ubuntu.sh
# ==============================================================================

set -euo pipefail

# --- Colores ---
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Verificaciones previas ---
[[ $EUID -eq 0 ]] && error "No ejecutes este script como root. Usa un usuario con sudo."

if [[ ! -f "$PROJECT_DIR/backend/.env" ]]; then
  warn "No se encontró backend/.env"
  warn "Copia backend/.env.example como backend/.env y rellena los valores:"
  warn "  cp backend/.env.example backend/.env && nano backend/.env"
  error "Abortando: falta backend/.env"
fi

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  Despliegue NIHR TaskHub v4 — Docker${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# =============================================================================
# PASO 1: Instalar Docker Engine
# =============================================================================
info "Paso 1/4 — Instalando Docker Engine..."

if command -v docker &>/dev/null; then
  success "Docker $(docker --version | grep -oP '[\d.]+' | head -1) ya instalado — omitiendo"
else
  sudo apt-get update -qq
  sudo apt-get install -y ca-certificates curl gnupg

  # Agregar clave GPG oficial de Docker
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  # Agregar repositorio Docker
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  sudo apt-get update -qq
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  # Agregar el usuario actual al grupo docker (evita usar sudo en cada comando)
  sudo usermod -aG docker "$USER"
  warn "Usuario '$USER' agregado al grupo 'docker'."
  warn "Para aplicar sin reiniciar, ejecuta: newgrp docker"

  sudo systemctl enable docker
  sudo systemctl start docker
  success "Docker instalado"
fi

# =============================================================================
# PASO 2: Verificar Docker Compose plugin
# =============================================================================
info "Paso 2/4 — Verificando Docker Compose..."

if docker compose version &>/dev/null; then
  success "Docker Compose $(docker compose version --short) disponible"
else
  error "Docker Compose plugin no encontrado. Reinstala Docker con el paso anterior."
fi

# =============================================================================
# PASO 3: Configurar firewall (UFW)
# =============================================================================
info "Paso 3/4 — Configurando firewall UFW..."

if command -v ufw &>/dev/null; then
  sudo ufw allow OpenSSH    2>/dev/null || true
  sudo ufw allow 80/tcp     2>/dev/null || true
  sudo ufw allow 443/tcp    2>/dev/null || true
  # Bloquear acceso directo al puerto 3000 desde el exterior
  sudo ufw deny 3000/tcp    2>/dev/null || true
  sudo ufw --force enable   2>/dev/null || true
  success "UFW: SSH + HTTP (80) + HTTPS (443) permitidos. Puerto 3000 solo interno."
else
  warn "ufw no encontrado — configura el firewall manualmente si es necesario."
fi

# =============================================================================
# PASO 4: Construir y levantar los contenedores
# =============================================================================
info "Paso 4/4 — Construyendo y levantando contenedores Docker..."

cd "$PROJECT_DIR"

# Si hay contenedores corriendo, detenerlos primero
if docker compose ps --quiet 2>/dev/null | grep -q .; then
  warn "Deteniendo contenedores existentes..."
  docker compose down
fi

docker compose up -d --build

success "Contenedores levantados"

# Esperar a que la app responda
info "      Esperando a que la app esté lista..."
for i in $(seq 1 30); do
  if curl -sf http://localhost/health &>/dev/null; then
    success "App respondiendo en http://localhost/health"
    break
  fi
  if [[ $i -eq 30 ]]; then
    warn "La app tardó más de lo esperado. Revisa los logs:"
    warn "  docker compose logs nihr-app"
  fi
  sleep 2
done

# =============================================================================
# RESUMEN FINAL
# =============================================================================
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  DESPLIEGUE COMPLETADO${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "  Estado:       docker compose ps"
echo "  Logs app:     docker compose logs -f nihr-app"
echo "  Logs nginx:   docker compose logs -f nihr-nginx"
echo "  Reiniciar:    docker compose restart nihr-app"
echo "  Detener:      docker compose down"
echo ""
echo -e "${YELLOW}PASOS MANUALES PENDIENTES:${NC}"
echo ""
echo "  1. Edita nginx-nihr.conf:"
echo "     Reemplaza YOUR_DOMAIN_OR_IP con tu IP o dominio real"
echo "     Luego: docker compose restart nihr-nginx"
echo ""
echo "  2. Actualiza ALLOWED_ORIGINS en backend/.env:"
echo "     ALLOWED_ORIGINS=http://TU_IP_O_DOMINIO"
echo "     Luego: docker compose restart nihr-app"
echo ""
echo "  3. HTTPS con Certbot (requiere dominio real, no IP):"
echo "     sudo apt-get install -y certbot"
echo "     sudo certbot certonly --standalone -d tu-dominio.com"
echo "     Luego descomenta el bloque HTTPS en nginx-nihr.conf,"
echo "     monta los certificados en docker-compose.yml,"
echo "     y actualiza backend/.env: HTTPS_ENABLED=true"
echo ""
echo "  4. Si usas Google OAuth, actualiza en Google Console:"
echo "     URI de redirección: http(s)://TU_DOMINIO/api/google/callback"
echo ""

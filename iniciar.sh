#!/bin/bash

echo ""
echo "============================================"
echo "  Gestor de Tareas - MVP Local"
echo "============================================"
echo ""

# Verifica Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js no está instalado"
    echo "Descarga desde: https://nodejs.org/"
    echo ""
    exit 1
fi

echo "✓ Node.js encontrado: $(node --version)"
echo ""

# Navega al backend
cd backend || exit

# Instala dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias (primera vez)..."
    npm install
    echo ""
fi

echo "============================================"
echo "  ✅ Backend iniciando en puerto 3000"
echo "============================================"
echo ""
echo "Frontend: Abre esto en el navegador cuando esté listo:"
echo "  file://$(pwd)/../frontend/index.html"
echo ""
echo "Login de prueba:"
echo "  Email: usuario@unifranz.edu"
echo "  Nombre: Usuario Test"
echo "  Rol: investigador (o admin)"
echo ""
echo "============================================"
echo ""

# Inicia servidor
npm start

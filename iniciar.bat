@echo off
REM Script para iniciar el MVP local en Windows

echo.
echo ============================================
echo  Gestor de Tareas - MVP Local
echo ============================================
echo.

REM Verifica Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no está instalado
    echo Descarga desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo ✓ Node.js encontrado
echo.

REM Navega al backend
cd backend

REM Instala dependencias si no existen
if not exist "node_modules" (
    echo Instalando dependencias (primera vez)...
    call npm install
    echo.
)

echo ============================================
echo  ✅ Backend iniciando en puerto 3000
echo ============================================
echo.
echo Frontend: Abre esto en el navegador cuando esté listo:
echo   file:///PATH/TO/tareas_gestor_cloud/frontend/index.html
echo.
echo Login de prueba:
echo   Email: usuario@unifranz.edu
echo   Nombre: Usuario Test
echo   Rol: investigador (o admin)
echo.
echo ============================================
echo.

REM Inicia servidor
npm start

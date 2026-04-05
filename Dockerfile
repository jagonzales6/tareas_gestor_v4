# ==============================================================================
# Dockerfile — Gestor de Tareas NIHR v4
# Node.js 18 Alpine (imagen ligera ~180 MB final)
# ==============================================================================

FROM node:18-alpine

WORKDIR /app

# Instalar dependencias primero (esta capa se cachea si package.json no cambia)
COPY backend/package*.json backend/
RUN cd backend && npm install --omit=dev --ignore-scripts

# Copiar código fuente del backend y el frontend estático
COPY backend/src backend/src
COPY frontend frontend

# Crear directorios de uploads vacíos.
# El volumen Docker se montará sobre /app/data/uploads y persistirá los archivos.
RUN mkdir -p data/uploads/evidencias \
              data/uploads/anuncios \
              data/uploads/presupuestos \
              data/uploads/comprobantes

EXPOSE 3000

CMD ["node", "backend/src/app.js"]

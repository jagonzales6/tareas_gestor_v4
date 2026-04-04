# CLAUDE.md — Gestor de Tareas NIHR v4

## Estado del Proyecto

**MVP v4 — Funcional para pruebas locales (abril 2026)**

Sistema de gestión de tareas para el Centro de Investigación NIHR LatAm (UNIFRANZ), orientado a dos ensayos clínicos: **DIALOG+ Trial** y **Multifamiliar Trial**.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js 18+ + Express.js |
| Base de datos | PostgreSQL 13+ |
| Frontend | Vue.js 3 (single-file HTML + JS + CSS) |
| Autenticación | express-session + connect-pg-simple |
| Uploads | Multer (máx. 10 MB) |
| Seguridad | bcryptjs |
| Integración opcional | Google Calendar OAuth2 (googleapis) |

---

## Estructura del Proyecto

```
tareas_gestor_v4/
├── CLAUDE.md                      # Este archivo
├── README.md                      # Guía de instalación completa
├── SETUP.md                       # Instrucciones técnicas rápidas
├── ARCHIVOS.md                    # Índice de archivos por rol
├── ESTRUCTURA_ROLES.md            # Definición de roles y permisos
├── SERVIDOR_RED_LOCAL.md          # Config red local (IP: 192.168.0.68)
├── INICIO_RAPIDO.txt              # Arranque en 3 pasos
├── iniciar.bat                    # Script arranque Windows
├── iniciar.sh                     # Script arranque Unix/Mac
│
├── backend/
│   ├── .env                       # Configuración local (NO commitear)
│   ├── .env.example               # Plantilla de variables
│   ├── package.json
│   └── src/
│       ├── app.js                 # Servidor Express + TODOS los endpoints (~2000 líneas)
│       ├── database.js            # Conexión PostgreSQL + todas las queries (~1400 líneas)
│       ├── schema.sql             # Esquema completo de la BD (20+ tablas)
│       └── migrate.js             # Script de migración
│
├── frontend/
│   ├── index.html                 # App Vue.js 3 completa (~3900 líneas)
│   ├── css/style.css              # Estilos responsive (124 KB)
│   ├── js/app.js                  # Lógica Vue + llamadas API (~2650 líneas)
│   └── assets/logos/              # Logos institucionales (SVG + PNG)
│
└── data/
    ├── gestor.json
    └── uploads/
        ├── anuncios/              # Imágenes de anuncios
        ├── evidencias/            # PDFs y evidencias de tareas
        └── presupuestos/          # Documentos de presupuesto
```

---

## Arranque Local

```bash
# 1. Backend
cd backend
npm install
npm start           # http://localhost:3000

# 2. Frontend
# Abrir frontend/index.html directamente en el navegador
# (o usar Live Server en VS Code)
```

Variables de entorno en `backend/.env`:
```
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/nihr_taskhub
PORT=3000
SESSION_SECRET=<secreto>
NODE_ENV=production
```

---

## Base de Datos (PostgreSQL)

**Tablas principales:**
- `usuarios` — 8 roles (ver abajo)
- `tareas` — con seguimiento de evidencias e hitos
- `reuniones` — con actas y asistencia
- `proyectos` — proyectos de investigación
- `mastersheets` + `hitos` + `hito_propuestas` — planificación y cambios
- `presupuestos` + `gastos` — gestión financiera
- `scrum_sesiones` — registro de scrums
- `auditoria` — log completo de actividad
- `notificaciones`, `tablets`, `documentos`, `prestamos`, `reset_tokens`, `google_tokens`

Para inicializar o migrar:
```bash
cd backend && npm run migrate
```

---

## Roles del Sistema

| Rol | Descripción |
|-----|-------------|
| `admin` | Acceso total |
| `gerente` | Gestión general de proyectos |
| `pi` | Investigador principal |
| `responsable_financiero` | Presupuestos y gastos |
| `coordinadora` | Coordinación de tareas y reuniones |
| `becaria` | Becaria de investigación |
| `asistente` | Asistente de proyecto |
| `pasante` | Pasante (acceso limitado) |

---

## Arquitectura — Puntos Clave

- **Monolítica por diseño**: `app.js` contiene todos los endpoints; `database.js` contiene todas las queries. No hay módulos separados por router/controller — es una decisión consciente para MVP.
- **Frontend auto-detección**: `js/app.js` detecta automáticamente si corre en `localhost` o en red local para ajustar la URL del backend.
- **Sesiones en PostgreSQL**: Se usa `connect-pg-simple` para persistir sesiones, no JWT.
- **Google Calendar**: Integración opcional. Requiere `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env`.

---

## Endpoints API — resumen

| Módulo | Endpoints |
|--------|-----------|
| Auth | POST /login, GET /me, POST /logout |
| Tareas | GET/POST /tareas, PUT /tareas/:id — `hitoId` aceptado en POST; recalcula hito automáticamente |
| Reuniones | GET/POST /reuniones, PUT /:id/acta, PUT /:id/asistencia |
| SCRUM | POST /:reunionId/cerrar, GET /sesiones, **GET /sesion-activa/:reunionId** ← milestone-driven |
| Proyectos | GET/POST /proyectos, PUT /:nombre (auto-crea mastersheet al crear) |
| **Mastersheet** | **GET /mastersheet/:proyecto** (retorna MS + hitos) |
| **Hitos** | **GET /hitos?proyecto=X, POST /hitos, PUT /hitos/:id, DELETE /hitos/:id** |
| **Propuestas** | **GET/POST /hitos/:id/propuestas, PUT /hitos/propuestas/:id** |
| **Reportes** | **GET /reportes/:proyecto** (agrega tareas, hitos, finanzas) |
| Presupuestos | GET/POST /presupuestos, PUT /:id |
| Gastos | GET/POST /gastos, PUT /:id |
| Usuarios | GET /config/miembros, POST/PUT/DELETE /usuarios/:email |
| Notificaciones | GET /notificaciones, PUT /:id/leer |
| Auditoría | GET /auditoria |
| Recursos | GET/POST /tablets, /documentos, /prestamos |

*(Endpoints en **negrita** = implementados en abril 2026 como parte del plan de mejora v4)*

---

## Convenciones de Desarrollo

- Los endpoints de API están todos en `backend/src/app.js`. Buscar por `/api/` para encontrarlos.
- Las queries SQL están en `backend/src/database.js`. Las funciones siguen el patrón `getX`, `createX`, `updateX`.
- El frontend es un SPA monolítico en `frontend/index.html` + `frontend/js/app.js`. Vue 3 via CDN (sin build step).
- No existe proceso de build para el frontend. Los cambios en `style.css` y `app.js` se reflejan directamente.

---

## Lo que NO hay (decisiones de MVP)

- Sin tests automatizados
- Sin CI/CD
- Sin Docker
- Sin separación de rutas/controladores (los directorios `config/`, `controllers/`, `middleware/`, `models/`, `routes/` en `backend/src/` no se usan)
- Sin autenticación JWT (solo sesiones)
- Sin build tool en frontend (Vue 3 via CDN)

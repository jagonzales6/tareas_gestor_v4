# 🚀 MVP Gestor de Tareas - Guía de Instalación Local

Esta es la versión local MVP del Gestor de Tareas Profesional (v4). Backend Node.js + Vue.js 3 + Firestore Emulator.

## ⚙️ Requisitos Previos

- **Node.js 18+** - [Descargar](https://nodejs.org/)
- **npm** - Viene con Node.js
- **Java 11+** - Necesario para Firebase Emulator

Verifica las versiones:
```bash
node --version
npm --version
```

---

## 📦 Instalación del Backend

### 1. Abre terminal en la carpeta del backend
```bash
cd "tareas_gestor_cloud/backend"
```

### 2. Instala dependencias
```bash
npm install
```

Esto instalará:
- `express` - Framework web
- `firebase-admin` - Cliente Firestore
- `google-auth-library` - Autenticación Google
- `cors` - Cross-origin requests
- `express-session` - Sesiones locales
- `dotenv` - Variables de entorno
- `nodemon` - Auto-reload en desarrollo

### 3. Verifica el archivo `.env`
El archivo ya está configurado para local:
```
FIREBASE_PROJECT_ID=gestor-tareas-local
FIREBASE_EMULATOR=true
SESSION_SECRET=dev-secret-local-123
NODE_ENV=development
PORT=3000
```

---

## 🚀 Ejecutar la Aplicación

### Opción 1: Modo producción
```bash
npm start
```

### Opción 2: Modo desarrollo (auto-reload)
```bash
npm run dev
```

**Debería ver:**
```
✓ Express server listening on port 3000
✓ Firebase Emulator support enabled
✓ Session middleware configured
```

---

## 🌐 Frontend

### Abre en el navegador:
```
file:///ruta/a/tareas_gestor_cloud/frontend/index.html
```

O usa un servidor HTTP local:
```bash
# En la carpeta frontend
npx http-server
```

Luego abre: `http://localhost:8080/index.html`

---

## 🧪 Credenciales de Prueba

### Opción 1: Login Local (sin servidor)
Usa cualquier email:
- **Email:** `usuario@unifranz.edu`
- **Nombre:** `Usuario Test`
- **Rol:** `investigador` / `admin` / `gerente`

(Se crea sesión en localStorage)

### Opción 2: API REST (con backend)
Backend espera sesiones locales. Primero hace login en la interfaz.

---

## 📋 Endpoints API (Referencia)

### Autenticación
- `POST /api/auth/login` - Crea sesión local
- `POST /api/auth/logout` - Destruye sesión
- `GET /api/auth/me` - Info usuario actual

### Tareas
- `GET /api/tareas` - Lista tareas del usuario
- `POST /api/tareas` - Crear tarea (admin only)
  ```json
  {
    "proyecto": "NIHR",
    "descripcion": "Analizar datos",
    "fechaVencimiento": "2024-03-30",
    "responsables": ["user1@unifranz.edu", "user2@unifranz.edu"],
    "notas": "Urgente"
  }
  ```
- `PUT /api/tareas/:id` - Actualizar tarea
  ```json
  {
    "estado": "Completada",
    "notas": "Completado exitosamente"
  }
  ```

### Reuniones
- `GET /api/reuniones` - Lista reuniones del usuario
- `POST /api/reuniones` - Crear reunión (admin only)
  ```json
  {
    "proyecto": "NIHR",
    "descripcion": "Kick-off meeting",
    "fecha": "2024-03-15",
    "horaInicio": "14:00",
    "horaFin": "15:00",
    "asistentes": ["user1@unifranz.edu"]
  }
  ```

### Configuración
- `GET /api/config/miembros` - Lista activa de miembros
- `GET /api/config/proyectos` - Proyectos disponibles

### Auditoría (Admin only)
- `GET /api/auditoria` - Últimos 100 logs

---

## 🐛 Solución de Problemas

### Error: "Cannot find module 'express'"
```bash
npm install
```

### Error: "Port 3000 already in use"
Cambia el puerto en `.env`:
```
PORT=3001
```

### El frontend no se conecta con el backend
- Verifica que backend esté corriendo en `http://localhost:3000`
- Comprueba que CORS está habilitado (debería estar en app.js)
- Revisa la consola del navegador para errores

### Las tareas/reuniones no aparecen
- Por defecto, Firestore emulator está vacío
- Debes crear datos a través de la interfaz (admin)
- O cargar datos manualmente en Firestore

---

## 📝 Estructura del Proyecto

```
tareas_gestor_cloud/
├── backend/
│   ├── src/
│   │   └── app.js           (Express + API endpoints)
│   ├── .env                 (Configuración local)
│   ├── .env.example         (Template)
│   └── package.json
├── frontend/
│   ├── index.html           (Vue.js app + HTML)
│   ├── css/
│   │   └── style.css        (Estilos)
│   └── js/
│       └── app.js           (Logic + API calls)
└── docs/
    └── README.md            (Este archivo)
```

---

## 🔄 Flujo de Uso

1. **Inicia backend:** `npm start` en carpeta backend
2. **Abre frontend:** En navegador, abre `index.html`
3. **Login:** Usa cualquier email, nombre y rol
4. **Crear:** Botón "Crear Tarea" (solo admin/gerente visible)
5. **Ver:** Tab "Mis Tareas" muestra tus asignaciones
6. **Completar:** Botón "Marcar Completada"
7. **Auditoría:** Tab solo visible si eres admin

---

## 📦 Stack Tecnológico

| Componente | Tecnología |
|-----------|-----------|
| Backend | Node.js 18+, Express.js |
| Frontend | Vue.js 3, HTML5, CSS3 |
| Base de datos | Firestore Emulator (local) |
| Autenticación | Session-based (local) |
| Communication | REST API, JSON |

---

## 🚀 Próximos Pasos (Para Production)

1. **OAuth Institucional:** Cambiar `auth/login` a Google OAuth2
2. **Firestore Real:** Conectar a Google Cloud Firestore (no emulator)
3. **Despliegue:** Google Cloud Run + Cloud Build
4. **Dominio:** Asignar dominio institucional
5. **SSL:** Certificado HTTPS automático

---

## 📞 Soporte

- Revisa los logs de backend (consola)
- Abre DevTools en navegador (F12)
- Verifica que localhost:3000 es accesible
- Comprueba variables de entorno en `.env`

---

**Versión:** v4 MVP Local  
**Última actualización:** 2024  
**Estado:** ✅ Listo para pruebas locales

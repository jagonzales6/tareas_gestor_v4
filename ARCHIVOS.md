# 🚀 MVP Gestor de Tareas - Índice de Archivos

## 📁 Estructura Completa del Proyecto

```
tareas_gestor_cloud/
│
├── 📄 README.md                    ← COMIENZA AQUÍ (guía completa)
├── 📄 SETUP.md                     ← Instrucciones técnicas
├── 🚀 iniciar.bat                  ← EJECUTA EN WINDOWS (doble-click)
├── 🚀 iniciar.sh                   ← EJECUTA EN MAC/LINUX (chmod +x && ./iniciar.sh)
│
├── 📁 backend/                     ← SERVIDOR NODE.JS (puerto 3000)
│   ├── 📄 package.json             ← Dependencias NPM
│   ├── 📄 package-lock.json        ← (Auto-generado)
│   ├── 📄 .env                     ← Variables de entorno (configurado)
│   ├── 📄 .env.example             ← Template
│   └── 📁 src/
│       └── 📄 app.js               ← Main Express server + API endpoints
│
├── 📁 frontend/                    ← INTERFAZ DE USUARIO
│   ├── 📄 index.html               ← App Vue.js (ABRE EN NAVEGADOR)
│   ├── 📁 css/
│   │   └── 📄 style.css            ← Estilos (responsive)
│   └── 📁 js/
│       └── 📄 app.js               ← Logic + API calls
│
└── 📁 docs/
    └── 📄 ARQUITECTURA.md          ← (Opcional - diagrama v4)
```

---

## ⚡ INICIO RÁPIDO (3 pasos)

### Paso 1: Instala Node.js
Descarga de [nodejs.org](https://nodejs.org/) - LTS

```bash
node --version
npm --version
```

### Paso 2: Ejecuta el script de inicio

**Windows:**
```
Doble-click en: iniciar.bat
```

**Mac/Linux:**
```bash
chmod +x iniciar.sh
./iniciar.sh
```

### Paso 3: Abre el frontend

Cuando veas en la consola `✓ Express server listening on port 3000`, abre:

```
file:///ruta/a/tareas_gestor_cloud/frontend/index.html
```

---

## 🔑 Credenciales de Prueba

Cualquier email funciona. Ejemplo:
- **Email:** `usuario@unifranz.edu`
- **Nombre:** `Mi Nombre`
- **Rol:** `investigador` ← Para ver interfaz básica
- **Rol:** `admin` ← Para ver todas las funciones

---

## 🏗️ Descripción de Archivos

### Backend

| Archivo | Descripción |
|---------|-----------|
| `backend/package.json` | Lista de dependencias (express, firebase-admin, etc) |
| `backend/src/app.js` | Express server con todos los endpoints REST |
| `backend/.env` | Configuración local (puerto, emulator, secretos) |

### Frontend

| Archivo | Descripción |
|---------|-----------|
| `frontend/index.html` | Interfaz Vue.js 3 (estructura + HTML) |
| `frontend/css/style.css` | Estilos responsive (login, header, tabs, forms, listas) |
| `frontend/js/app.js` | Logic Vue - API calls, auth, data binding |

### Documentación

| Archivo | Descripción |
|---------|-----------|
| `README.md` | Guía completa (requisitos, instalación, endpoints, troubleshooting) |
| `SETUP.md` | Instrucciones técnicas paso-a-paso |
| `ARCHIVOS.md` | Este archivo (índice y quick-start) |

---

## 🎯 Funcionalidades por Rol

### Investigador / Coordinador
- ✅ Ver mis tareas asignadas
- ✅ Ver mis reuniones
- ✅ Marcar tareas como completadas
- ✅ Ver notas de mis tareas

### Admin / Gerente
- ✅ Todo lo anterior +
- ✅ Crear nuevas tareas (asignadas a miembros)
- ✅ Crear nuevas reuniones
- ✅ Ver todas las tareas (no solo las mías)
- ✅ Ver auditoría (historial de cambios)
- ✅ Acceso a configuración

---

## 📊 Endpoints API Disponibles

### Autenticación
```
POST   /api/auth/login         Login (sesión local)
POST   /api/auth/logout        Logout
GET    /api/auth/me            Info usuario actual
```

### Tareas
```
GET    /api/tareas             Listar tareas del usuario
POST   /api/tareas             Crear tarea (admin only)
PUT    /api/tareas/:id         Actualizar tarea
```

### Reuniones
```
GET    /api/reuniones          Listar reuniones
POST   /api/reuniones          Crear reunión (admin only)
```

### Configuración
```
GET    /api/config/miembros    Lista de miembros activos
GET    /api/config/proyectos   Proyectos disponibles
```

### Auditoría
```
GET    /api/auditoria          Logs de cambios (admin only)
```

---

## 🔧 Troubleshooting

### "No se abre el archivo index.html"
→ Abre manualmente en navegador: `ctrl + o` → selecciona `frontend/index.html`

### "No se conecta con el backend"
→ Verifica en consola del navegador (F12) si hay errores  
→ Comprueba que backend está corriendo: `http://localhost:3000/api/config/proyectos`

### "npm: command not found"
→ Instala Node.js desde https://nodejs.org/

### "Port 3000 already in use"
→ Cambia PORT en `backend/.env` a 3001  
→ Actualiza `app.js` línea con `http://localhost:3000` a `:3001`

---

## 📈 Próximos Pasos (Si quieres mejorar)

1. **Firebase Emulator:** Configurar Firestore local (agora datos persisten)
2. **OAuth Real:** Cambiar login local a Google OAuth institucional
3. **Despliegue:** Publicar en Google Cloud Run
4. **SSL/Dominio:** Agregar certificado HTTPS y dominio
5. **Base de datos:** Conectar a Firestore real en Google Cloud

---

## 💡 Tips

- Usa rol "admin" para probar todas las funciones
- Los datos están en memoria (se limpian al reiniciar backend)
- Abre `backend/src/app.js` para ver cómo funcionan los endpoints
- Abre `frontend/js/app.js` para ver cómo se llama la API
- Presiona `F12` en navegador para ver errores de conexión

---

**v4 MVP Local** | ✅ Listo para pruebas | 🚀 En desarrollo

# 🚀 Gestor de Tareas - Servidor en Red Local

## Configuración para Prueba Piloto

Tu servidor ahora está configurado para funcionar en la **red local** de tu organización.

### 📍 Información de Acceso

- **IP del Servidor**: `192.168.0.68`
- **Puerto**: `3000`
- **URL Local**: http://localhost:3000
- **URL Red Local**: http://192.168.0.68:3000

### 🌐 Cómo Acceder

#### Desde tu PC (localhost)
```
http://localhost:3000
```

#### Desde otras máquinas en la red
```
http://192.168.0.68:3000
```

### 👥 Credenciales de Prueba

**Administrador:**
- Email: `admin@unifranz.edu`
- Nombre: `Admin User`
- Rol: `Administrador`

**Investigadores:**
- Email: `investigador1@unifranz.edu` | Nombre: `Investigador 1`
- Email: `investigador2@unifranz.edu` | Nombre: `Investigador 2`

**Coordinador:**
- Email: `coordinador@unifranz.edu` | Nombre: `Coordinador`

### ✨ Funcionalidades

✅ **Tareas**
- Ver tareas pendientes y completadas
- Crear nuevas tareas (solo admin)
- Asignar tareas a miembros

✅ **Reuniones**
- Ver reuniones programadas
- Crear reuniones (solo admin)
- Asignar asistentes

✅ **Proyectos** (Admin)
- Crear nuevos proyectos
- Asignar miembros a proyectos
- Ver lista de miembros por proyecto

✅ **Auditoría**
- Historial de todas las actividades del sistema

### 🔧 Requisitos en otras máquinas

1. ✅ Conectadas a la **misma red WiFi/LAN**
2. ✅ Navegador moderno (Chrome, Firefox, Edge, Safari)
3. ✅ Acceso a `192.168.0.68:3000`

### 📋 Notas Importantes

- Los datos se almacenan **en memoria** (se pierden al reiniciar el servidor)
- Es un MVP Local para pruebas
- No usar en producción sin base de datos persistente
- El servidor se inicia automáticamente con `npm start` en la carpeta `backend/`

### 🔄 Reiniciar el Servidor

Si necesitas reiniciar:

```bash
cd backend
npm start
```

---

**Fecha de configuración**: 2026-03-28
**Versión**: 1.0.0 MVP

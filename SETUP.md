## Instrucciones de Configuración del Backend

### 1. Instala Node.js (si no lo tienen)

Descarga de [nodejs.org](https://nodejs.org/) - Versión LTS 18+

```bash
node --version
npm --version
```

### 2. Abre terminal en la carpeta `backend`

```bash
cd "tareas_gestor_cloud/backend"
```

### 3. Instala dependencias

```bash
npm install
```

Esto crea la carpeta `node_modules/` con todas las librerías necesarias.

### 4. Inicia el servidor

**Opción A: Producción**
```bash
npm start
```

**Opción B: Desarrollo (auto-reload cuando cambies código)**
```bash
npm run dev
```

### 5. Verifica que funciona

Deberías ver en la consola:
```
✓ Express server listening on port 3000
✓ Firebase Emulator support enabled
✓ Session middleware configured
✓ CORS configured for localhost
```

Luego puedes acceder a:
- Backend running: `http://localhost:3000/api/config/proyectos`

---

## Configuración del Frontend

### 1. Abre `frontend/index.html` en el navegador

Option 1 (Directo):
```
File → Open File → frontend/index.html
```

Option 2 (Servidor HTTP local):
```bash
cd frontend
npx http-server
# Abre http://localhost:8080
```

### 2. Login con credenciales

- Email: `usuario@unifranz.edu`
- Nombre: `Usuario Test`
- Rol: `investigador` (o `admin` para ver todas las funciones)

---

## Próximas Acciones

- ✅ Backend funcionando en puerto 3000
- ✅ Frontend cargando desde archivos locales
- ✅ Auth basada en sesiones locales
- ✅ Firestore Emulator soporte (agregar después)
- ⏳ Crear datos de prueba
- ⏳ Probar todas las funciones

El sistema está listo para uso local. ¡Prueba creando tareas en rol "admin"!

# 📋 Estructura Organizativa del Sistema - v2.0

## 🎯 Roles Disponibles

### 1. **Gerente del Proyecto** (`gerente`)
- **Acceso**: Vista resumida general
- **Permisos**:
  - ✅ Ver resumen de Finanzas e Investigación
  - ✅ Ver hitos del proyecto
  - ✅ Supervisión estratégica
  - ❌ No accede a detalle operativo por tarea

### 2. **PI - Investigador Principal** (`pi`)
- **Acceso**: Vista resumida estratégica
- **Permisos**:
  - ✅ Ver resumen de hitos y progreso general
  - ✅ Seguimiento estratégico
  - ✅ Monitoreo y evaluación
  - ❌ No accede a detalle operativo

### 3. **Responsable Financiero** (`responsable_financiero`)
- **Acceso**: Panel financiero especializado
- **Permisos**:
  - ✅ Crear tareas financieras
  - ✅ Autoasignarse tareas
  - ✅ Subir entregables financieros
  - ✅ Administrar tareas del área financiera
  - ✅ Revisar entregables de pasantes
  - ✅ Ver reportes presupuestarios

### 4. **Coordinadora de Investigación** (`coordinadora`)
- **Acceso**: Vista operativa completa
- **Permisos**:
  - ✅ Ver resumen presupuestario
  - ✅ Ver avance de investigación
  - ✅ Asignar tareas
  - ✅ Dar seguimiento general
  - ✅ Crear proyectos
  - ✅ Gestionar miembros de proyectos

### 5. **Becaria** (`becaria`)
- **Acceso**: Panel personal + supervisión
- **Permisos**:
  - ✅ Registrar su propio avance
  - ✅ Visualizar progreso de pasantes bajo su supervisión
  - ✅ Asignar tareas SOLO a pasantes a su cargo
  - ❌ No ve tableros de otros usuarios

### 6. **Asistente de Investigación** (`asistente`)
- **Acceso**: Panel operativo
- **Permisos**:
  - ✅ Registrar actividades
  - ✅ Recibir tareas asignadas
  - ✅ Ejecutar tareas de ambos trials
  - ✅ Asignar tareas a pasantes bajo su supervisión
  - ✅ Registrar avance

### 7. **Pasante** (`pasante`)
- **Acceso**: Solo su tablero personal
- **Permisos**:
  - ✅ Visualizar sus propias tareas
  - ✅ Ejecutar tareas asignadas
  - ✅ Crear tareas propias para autoseguimiento
  - ❌ No ve tableros de otros usuarios
  - ❌ No ve vistas consolidadas

### 8. **Administrador** (`admin`)
- **Acceso**: Control total
- **Permisos**:
  - ✅ Ver todas las tareas
  - ✅ Gestionar auditoria
  - ✅ Gestionar miembros
  - ✅ Crear proyectos
  - ✅ Acceso completo al sistema

---

## 🏢 Proyectos

### Trial 1: DIALOG+
- **Descripción**: Randomized Clinical Trial DIALOG+
- **Miembros**: A asignar según datos reales

### Trial 2: Multifamiliar
- **Descripción**: Implementation Trial Multifamiliar
- **Miembros**: A asignar según datos reales

### Actividades Transversales
- **Descripción**: Actividades transversales y generales
- **Miembros**: A asignar según datos reales

---

## 👥 Usuarios de Prueba Actuales

| Email | Nombre | Rol | Departamento |
|-------|--------|-----|--------------|
| admin@unifranz.edu | Admin System | admin | Sistema |
| gerente@unifranz.edu | Gerente del Proyecto | gerente | Dirección |
| pi@unifranz.edu | PI - Investigador Principal | pi | Investigación |
| financiero@unifranz.edu | Responsable Financiero | responsable_financiero | Finanzas |
| coordinadora@unifranz.edu | Coordinadora de Investigación | coordinadora | Coordinación |
| becaria1@unifranz.edu | Becaria 1 | becaria | Investigación |
| asistente1@unifranz.edu | Asistente de Investigación 1 | asistente | Investigación |
| asistente2@unifranz.edu | Asistente de Investigación 2 | asistente | Investigación |
| pasante1@unifranz.edu | Pasante 1 | pasante | Investigación |
| pasante2@unifranz.edu | Pasante 2 | pasante | Investigación |

---

## 📊 Relaciones de Supervisión

```
Coordinadora de Investigación
├── Asistente 1
│   ├── Pasante 1
│   └── Pasante 2
├── Asistente 2
├── Becaria 1
```

---

## 📝 Notas

- Cada usuario puede supervisar a otros según su rol
- Los pasantes solo ven su tablero personal
- Los roles de Gerente y PI tienen acceso de solo lectura (informativo)
- El Responsable Financiero tiene acceso especializado al módulo financiero
- Los datos se almacenan en memoria (ideal para MVP)

---

**Última actualización**: 2026-03-28  
**Versión**: 2.0 - Estructura Roles Completa

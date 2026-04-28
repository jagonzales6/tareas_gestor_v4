-- ============================================================================
-- NIHR TaskHub v4 — Esquema SQLite
-- Todos los campos JSON se almacenan como TEXT (JSON.stringify/parse en JS)
-- BOOLEAN se almacena como INTEGER (0/1)
-- ============================================================================

CREATE TABLE IF NOT EXISTS usuarios (
  email                  TEXT PRIMARY KEY,
  nombre                 TEXT NOT NULL,
  password_hash          TEXT NOT NULL,
  rol                    TEXT NOT NULL,
  activo                 INTEGER     DEFAULT 1,
  departamento           TEXT        DEFAULT '',
  proyecto               TEXT,
  supervisora            TEXT,
  equipo                 TEXT,
  equipos                TEXT        DEFAULT '[]',
  es_directiva           INTEGER     DEFAULT 0,
  es_encargado_recursos  INTEGER     DEFAULT 0,
  secciones              TEXT,
  telefono               TEXT        DEFAULT '',
  cargo                  TEXT        DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tareas (
  id                   TEXT PRIMARY KEY,
  proyecto             TEXT NOT NULL,
  descripcion          TEXT NOT NULL,
  estado               TEXT        DEFAULT 'Pendiente',
  fecha_vencimiento    TEXT,
  responsables         TEXT        DEFAULT '[]',
  notas                TEXT        DEFAULT '',
  origen_scrum         INTEGER     DEFAULT 0,
  reunion_origen_id    TEXT,
  creado_por           TEXT NOT NULL,
  fecha_creacion       TEXT        DEFAULT (datetime('now')),
  evidencia            TEXT,
  ultima_actualizacion TEXT,
  tiene_costo          INTEGER     DEFAULT 0,
  costo_monto          REAL,
  costo_descripcion    TEXT        DEFAULT '',
  comprobantes         TEXT        DEFAULT '[]',
  hito_id              TEXT,
  es_critica           INTEGER     DEFAULT 0,
  macrotarea_id        TEXT
);

CREATE TABLE IF NOT EXISTS reuniones (
  id                 TEXT PRIMARY KEY,
  tipo               TEXT        DEFAULT 'nihr',
  modalidad          TEXT        DEFAULT 'reunion',
  tipo_reunion       TEXT        DEFAULT 'especial',
  proyecto           TEXT NOT NULL,
  descripcion        TEXT NOT NULL,
  fecha              TEXT,
  hora_inicio        TEXT        DEFAULT '',
  hora_fin           TEXT        DEFAULT '',
  enlace             TEXT        DEFAULT '',
  asistentes         TEXT        DEFAULT '[]',
  asistencias        TEXT        DEFAULT '{}',
  notas              TEXT        DEFAULT '[]',
  acta               TEXT        DEFAULT '',
  calendar_event_ids TEXT        DEFAULT '{}',
  creado_por         TEXT NOT NULL,
  fecha_creacion     TEXT        DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS proyectos (
  nombre      TEXT PRIMARY KEY,
  descripcion TEXT    DEFAULT '',
  miembros    TEXT    DEFAULT '[]',
  creado_por  TEXT NOT NULL,
  created_at  TEXT
);

CREATE TABLE IF NOT EXISTS anuncios (
  id          TEXT PRIMARY KEY,
  titulo      TEXT NOT NULL,
  contenido   TEXT NOT NULL,
  importante  INTEGER     DEFAULT 0,
  autor       TEXT NOT NULL,
  autor_email TEXT NOT NULL,
  fecha       TEXT,
  creado_en   TEXT        DEFAULT (datetime('now')),
  imagen      TEXT
);

CREATE TABLE IF NOT EXISTS auditoria (
  id        TEXT PRIMARY KEY,
  timestamp TEXT        DEFAULT (datetime('now')),
  usuario   TEXT NOT NULL,
  accion    TEXT NOT NULL,
  detalles  TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS solicitudes_actualizacion (
  id            TEXT PRIMARY KEY,
  email_destino TEXT NOT NULL,
  enviado_por   TEXT,
  mensaje       TEXT        DEFAULT '',
  fecha         TEXT        DEFAULT (datetime('now')),
  completada    INTEGER     DEFAULT 0,
  completada_en TEXT
);

CREATE TABLE IF NOT EXISTS presupuestos (
  id                   TEXT PRIMARY KEY,
  proyecto             TEXT NOT NULL,
  mes                  TEXT NOT NULL,
  descripcion          TEXT        DEFAULT '',
  estado               TEXT        DEFAULT 'borrador',
  items                TEXT        DEFAULT '[]',
  total_solicitado     REAL        DEFAULT 0,
  respaldos            TEXT        DEFAULT '[]',
  comentarios          TEXT        DEFAULT '[]',
  creado_por           TEXT NOT NULL,
  creado_por_nombre    TEXT,
  creado_en            TEXT        DEFAULT (datetime('now')),
  ultima_actualizacion TEXT,
  revisado_por         TEXT,
  revisado_en          TEXT,
  aprobado_por         TEXT,
  aprobado_en          TEXT,
  desembolsado_por     TEXT,
  desembolsado_en      TEXT
);

CREATE TABLE IF NOT EXISTS gastos (
  id                 TEXT PRIMARY KEY,
  presupuesto_id     TEXT NOT NULL,
  tarea_id           TEXT,
  proyecto           TEXT NOT NULL,
  mes                TEXT NOT NULL,
  rubro              TEXT NOT NULL,
  descripcion        TEXT        DEFAULT '',
  monto              REAL        NOT NULL,
  responsable        TEXT NOT NULL,
  responsable_nombre TEXT,
  estado             TEXT        DEFAULT 'pendiente',
  respaldos          TEXT        DEFAULT '[]',
  creado_en          TEXT        DEFAULT (datetime('now')),
  revisado_por       TEXT,
  revisado_en        TEXT
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id         TEXT PRIMARY KEY,
  para       TEXT NOT NULL,
  tipo       TEXT NOT NULL,
  titulo     TEXT NOT NULL,
  mensaje    TEXT NOT NULL,
  leida      INTEGER     DEFAULT 0,
  creada_en  TEXT        DEFAULT (datetime('now')),
  referencia TEXT
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_para ON notificaciones(para);

CREATE TABLE IF NOT EXISTS scrum_sesiones (
  id                   TEXT PRIMARY KEY,
  reunion_id           TEXT NOT NULL,
  titulo               TEXT NOT NULL,
  proyecto             TEXT        DEFAULT '',
  fecha                TEXT,
  asistentes           TEXT        DEFAULT '[]',
  notas                TEXT        DEFAULT '[]',
  hora_inicio          TEXT,
  hora_fin             TEXT,
  duracion_segundos    INTEGER     DEFAULT 0,
  duracion_texto       TEXT        DEFAULT '',
  tareas_asignadas_ids TEXT        DEFAULT '[]',
  cerrado_por          TEXT NOT NULL,
  cerrado_por_nombre   TEXT,
  cerrado_en           TEXT        DEFAULT (datetime('now')),
  historial            TEXT        DEFAULT '[]',
  hitos_revisados      TEXT        DEFAULT '[]',
  acciones_definidas   TEXT        DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS tablets (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  descripcion TEXT    DEFAULT '',
  activo      INTEGER DEFAULT 1,
  creado_en   TEXT        DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documentos (
  id          TEXT PRIMARY KEY,
  carpeta_id  TEXT NOT NULL,
  nombre      TEXT NOT NULL,
  descripcion TEXT    DEFAULT '',
  activo      INTEGER DEFAULT 1,
  creado_en   TEXT        DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prestamos (
  id                           TEXT PRIMARY KEY,
  tipo                         TEXT NOT NULL,
  recurso_id                   TEXT NOT NULL,
  recurso_nombre               TEXT NOT NULL,
  solicitante                  TEXT NOT NULL,
  solicitante_nombre           TEXT,
  motivo                       TEXT        DEFAULT '',
  estado                       TEXT        DEFAULT 'pendiente',
  fecha_solicitud              TEXT        DEFAULT (datetime('now')),
  encargado_entrega            TEXT,
  encargado_entrega_nombre     TEXT,
  fecha_entrega                TEXT,
  detalles_entrega             TEXT        DEFAULT '',
  encargado_devolucion         TEXT,
  encargado_devolucion_nombre  TEXT,
  fecha_devolucion             TEXT,
  detalles_devolucion          TEXT        DEFAULT ''
);

CREATE TABLE IF NOT EXISTS reset_tokens (
  email      TEXT PRIMARY KEY,
  token      TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS google_tokens (
  email  TEXT PRIMARY KEY,
  tokens TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scrum_programas (
  id           TEXT PRIMARY KEY,
  proyecto     TEXT NOT NULL,
  frecuencia   TEXT NOT NULL DEFAULT 'diario',
  hora         TEXT NOT NULL DEFAULT '09:00',
  asistentes   TEXT DEFAULT '[]',
  activo       INTEGER DEFAULT 1,
  fecha_inicio TEXT NOT NULL,
  creado_por   TEXT NOT NULL,
  creado_en    TEXT        DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mastersheets (
  id                   TEXT PRIMARY KEY,
  proyecto             TEXT NOT NULL UNIQUE,
  editores             TEXT        DEFAULT '[]',
  creado_por           TEXT NOT NULL,
  creado_en            TEXT        DEFAULT (datetime('now')),
  ultima_actualizacion TEXT        DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hitos (
  id                    TEXT PRIMARY KEY,
  mastersheet_id        TEXT NOT NULL,
  proyecto              TEXT NOT NULL,
  nombre                TEXT NOT NULL,
  descripcion           TEXT        DEFAULT '',
  fase                  TEXT        DEFAULT '',
  componente            TEXT        DEFAULT '',
  fecha_inicio          TEXT,
  fecha_fin             TEXT,
  fecha_objetivo        TEXT,
  fecha_real            TEXT,
  responsable_principal TEXT,
  estado                TEXT        DEFAULT 'pendiente',
  progreso_calculado    INTEGER     DEFAULT 0,
  es_critico            INTEGER     DEFAULT 0,
  macrotareas           TEXT        DEFAULT '[]',
  notas_editor          TEXT        DEFAULT '[]',
  orden                 INTEGER     DEFAULT 0,
  creado_por            TEXT NOT NULL,
  creado_en             TEXT        DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hitos_mastersheet ON hitos(mastersheet_id);
CREATE INDEX IF NOT EXISTS idx_hitos_proyecto    ON hitos(proyecto);

CREATE TABLE IF NOT EXISTS hito_propuestas (
  id              TEXT PRIMARY KEY,
  hito_id         TEXT NOT NULL,
  mastersheet_id  TEXT NOT NULL,
  proyecto        TEXT NOT NULL,
  propuesto_por   TEXT NOT NULL,
  tipo_cambio     TEXT NOT NULL,
  valor_actual    TEXT,
  valor_propuesto TEXT NOT NULL,
  justificacion   TEXT        DEFAULT '',
  estado          TEXT        DEFAULT 'pendiente',
  revisado_por    TEXT,
  revisado_en     TEXT,
  comentario      TEXT        DEFAULT '',
  creado_en       TEXT        DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_propuestas_hito        ON hito_propuestas(hito_id);
CREATE INDEX IF NOT EXISTS idx_propuestas_mastersheet ON hito_propuestas(mastersheet_id);

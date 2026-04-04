-- ============================================================================
-- NIHR TaskHub v3 — Esquema PostgreSQL
-- ============================================================================

CREATE TABLE IF NOT EXISTS usuarios (
  email                  TEXT PRIMARY KEY,
  nombre                 TEXT NOT NULL,
  password_hash          TEXT NOT NULL,
  rol                    TEXT NOT NULL,
  activo                 BOOLEAN     DEFAULT TRUE,
  departamento           TEXT        DEFAULT '',
  proyecto               TEXT,
  supervisora            TEXT,
  equipo                 TEXT,
  equipos                JSONB       DEFAULT '[]',
  es_directiva           BOOLEAN     DEFAULT FALSE,
  es_encargado_recursos  BOOLEAN     DEFAULT FALSE,
  secciones              JSONB,
  telefono               TEXT        DEFAULT '',
  cargo                  TEXT        DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tareas (
  id                   TEXT PRIMARY KEY,
  proyecto             TEXT NOT NULL,
  descripcion          TEXT NOT NULL,
  estado               TEXT        DEFAULT 'Pendiente',
  fecha_vencimiento    TEXT,
  responsables         JSONB       DEFAULT '[]',
  notas                TEXT        DEFAULT '',
  origen_scrum         BOOLEAN     DEFAULT FALSE,
  reunion_origen_id    TEXT,
  creado_por           TEXT NOT NULL,
  fecha_creacion       TIMESTAMPTZ DEFAULT NOW(),
  evidencia            JSONB,
  ultima_actualizacion TIMESTAMPTZ,
  tiene_costo          BOOLEAN     DEFAULT FALSE,
  costo_monto          NUMERIC,
  costo_descripcion    TEXT        DEFAULT '',
  comprobantes         JSONB       DEFAULT '[]'
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
  asistentes         JSONB       DEFAULT '[]',
  asistencias        JSONB       DEFAULT '{}',
  notas              JSONB       DEFAULT '[]',
  acta               TEXT        DEFAULT '',
  calendar_event_ids JSONB       DEFAULT '{}',
  creado_por         TEXT NOT NULL,
  fecha_creacion     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proyectos (
  nombre      TEXT PRIMARY KEY,
  descripcion TEXT    DEFAULT '',
  miembros    JSONB   DEFAULT '[]',
  creado_por  TEXT NOT NULL,
  created_at  TEXT
);

CREATE TABLE IF NOT EXISTS anuncios (
  id         TEXT PRIMARY KEY,
  titulo     TEXT NOT NULL,
  contenido  TEXT NOT NULL,
  importante BOOLEAN     DEFAULT FALSE,
  autor      TEXT NOT NULL,
  autor_email TEXT NOT NULL,
  fecha      TEXT,
  creado_en  TIMESTAMPTZ DEFAULT NOW(),
  imagen     JSONB
);

CREATE TABLE IF NOT EXISTS auditoria (
  id        TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  usuario   TEXT NOT NULL,
  accion    TEXT NOT NULL,
  detalles  TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS solicitudes_actualizacion (
  id           TEXT PRIMARY KEY,
  email_destino TEXT NOT NULL,
  enviado_por   TEXT,
  mensaje       TEXT        DEFAULT '',
  fecha         TIMESTAMPTZ DEFAULT NOW(),
  completada    BOOLEAN     DEFAULT FALSE,
  completada_en TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS presupuestos (
  id               TEXT PRIMARY KEY,
  proyecto         TEXT NOT NULL,
  mes              TEXT NOT NULL,
  descripcion      TEXT        DEFAULT '',
  estado           TEXT        DEFAULT 'borrador',
  items            JSONB       DEFAULT '[]',
  total_solicitado NUMERIC     DEFAULT 0,
  respaldos        JSONB       DEFAULT '[]',
  comentarios      JSONB       DEFAULT '[]',
  creado_por       TEXT NOT NULL,
  creado_por_nombre TEXT,
  creado_en        TIMESTAMPTZ DEFAULT NOW(),
  ultima_actualizacion TIMESTAMPTZ,
  revisado_por     TEXT,
  revisado_en      TIMESTAMPTZ,
  aprobado_por     TEXT,
  aprobado_en      TIMESTAMPTZ,
  desembolsado_por TEXT,
  desembolsado_en  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS gastos (
  id                TEXT PRIMARY KEY,
  presupuesto_id    TEXT NOT NULL,
  tarea_id          TEXT,
  proyecto          TEXT NOT NULL,
  mes               TEXT NOT NULL,
  rubro             TEXT NOT NULL,
  descripcion       TEXT        DEFAULT '',
  monto             NUMERIC     NOT NULL,
  responsable       TEXT NOT NULL,
  responsable_nombre TEXT,
  estado            TEXT        DEFAULT 'pendiente',
  respaldos         JSONB       DEFAULT '[]',
  creado_en         TIMESTAMPTZ DEFAULT NOW(),
  revisado_por      TEXT,
  revisado_en       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id         TEXT PRIMARY KEY,
  para       TEXT NOT NULL,
  tipo       TEXT NOT NULL,
  titulo     TEXT NOT NULL,
  mensaje    TEXT NOT NULL,
  leida      BOOLEAN     DEFAULT FALSE,
  creada_en  TIMESTAMPTZ DEFAULT NOW(),
  referencia JSONB
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_para ON notificaciones(para);

CREATE TABLE IF NOT EXISTS scrum_sesiones (
  id                   TEXT PRIMARY KEY,
  reunion_id           TEXT NOT NULL,
  titulo               TEXT NOT NULL,
  proyecto             TEXT        DEFAULT '',
  fecha                TEXT,
  asistentes           JSONB       DEFAULT '[]',
  notas                JSONB       DEFAULT '[]',
  hora_inicio          TEXT,
  hora_fin             TEXT,
  duracion_segundos    INTEGER     DEFAULT 0,
  duracion_texto       TEXT        DEFAULT '',
  tareas_asignadas_ids JSONB       DEFAULT '[]',
  cerrado_por          TEXT NOT NULL,
  cerrado_por_nombre   TEXT,
  cerrado_en           TIMESTAMPTZ DEFAULT NOW(),
  historial            JSONB       DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS tablets (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  descripcion TEXT    DEFAULT '',
  activo      BOOLEAN DEFAULT TRUE,
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documentos (
  id          TEXT PRIMARY KEY,
  carpeta_id  TEXT NOT NULL,
  nombre      TEXT NOT NULL,
  descripcion TEXT    DEFAULT '',
  activo      BOOLEAN DEFAULT TRUE,
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prestamos (
  id                       TEXT PRIMARY KEY,
  tipo                     TEXT NOT NULL,
  recurso_id               TEXT NOT NULL,
  recurso_nombre           TEXT NOT NULL,
  solicitante              TEXT NOT NULL,
  solicitante_nombre       TEXT,
  motivo                   TEXT        DEFAULT '',
  estado                   TEXT        DEFAULT 'pendiente',
  fecha_solicitud          TIMESTAMPTZ DEFAULT NOW(),
  encargado_entrega        TEXT,
  encargado_entrega_nombre TEXT,
  fecha_entrega            TIMESTAMPTZ,
  detalles_entrega         TEXT        DEFAULT '',
  encargado_devolucion         TEXT,
  encargado_devolucion_nombre  TEXT,
  fecha_devolucion         TIMESTAMPTZ,
  detalles_devolucion      TEXT        DEFAULT ''
);

CREATE TABLE IF NOT EXISTS reset_tokens (
  email      TEXT PRIMARY KEY,
  token      TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS google_tokens (
  email  TEXT PRIMARY KEY,
  tokens JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS scrum_programas (
  id           TEXT PRIMARY KEY,
  proyecto     TEXT NOT NULL,
  frecuencia   TEXT NOT NULL DEFAULT 'diario',
  hora         TEXT NOT NULL DEFAULT '09:00',
  asistentes   JSONB DEFAULT '[]',
  activo       BOOLEAN DEFAULT TRUE,
  fecha_inicio TEXT NOT NULL,
  creado_por   TEXT NOT NULL,
  creado_en    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MASTERSHEET — Fuente central de verdad por proyecto
-- ============================================================================

CREATE TABLE IF NOT EXISTS mastersheets (
  id          TEXT PRIMARY KEY,
  proyecto    TEXT NOT NULL UNIQUE,
  editores    JSONB       DEFAULT '[]',
  creado_por  TEXT NOT NULL,
  creado_en   TIMESTAMPTZ DEFAULT NOW(),
  ultima_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hitos (
  id                    TEXT PRIMARY KEY,
  mastersheet_id        TEXT NOT NULL,
  proyecto              TEXT NOT NULL,
  nombre                TEXT NOT NULL,
  descripcion           TEXT        DEFAULT '',
  fase                  TEXT        DEFAULT '',
  componente            TEXT        DEFAULT '',
  fecha_objetivo        TEXT,
  fecha_real            TEXT,
  responsable_principal TEXT,
  estado                TEXT        DEFAULT 'pendiente',
  progreso_calculado    INTEGER     DEFAULT 0,
  es_critico            BOOLEAN     DEFAULT FALSE,
  notas_editor          JSONB       DEFAULT '[]',
  orden                 INTEGER     DEFAULT 0,
  creado_por            TEXT NOT NULL,
  creado_en             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hitos_mastersheet ON hitos(mastersheet_id);
CREATE INDEX IF NOT EXISTS idx_hitos_proyecto    ON hitos(proyecto);

CREATE TABLE IF NOT EXISTS hito_propuestas (
  id               TEXT PRIMARY KEY,
  hito_id          TEXT NOT NULL,
  mastersheet_id   TEXT NOT NULL,
  proyecto         TEXT NOT NULL,
  propuesto_por    TEXT NOT NULL,
  tipo_cambio      TEXT NOT NULL,
  valor_actual     TEXT,
  valor_propuesto  TEXT NOT NULL,
  justificacion    TEXT        DEFAULT '',
  estado           TEXT        DEFAULT 'pendiente',
  revisado_por     TEXT,
  revisado_en      TIMESTAMPTZ,
  comentario       TEXT        DEFAULT '',
  creado_en        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_propuestas_hito         ON hito_propuestas(hito_id);
CREATE INDEX IF NOT EXISTS idx_propuestas_mastersheet  ON hito_propuestas(mastersheet_id);

-- ============================================================================
-- Migraciones incrementales (seguras de re-ejecutar)
-- ============================================================================

-- Reuniones
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS enlace TEXT DEFAULT '';
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'nihr';
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS modalidad TEXT DEFAULT 'reunion';
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS tipo_reunion TEXT DEFAULT 'especial';
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS acta TEXT DEFAULT '';
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS calendar_event_ids JSONB DEFAULT '{}';

-- Tareas — nuevos campos para integración con hitos
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS hito_id      TEXT;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS es_critica   BOOLEAN DEFAULT FALSE;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS macrotarea_id TEXT;

-- Tareas — costo y comprobantes financieros
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS tiene_costo       BOOLEAN DEFAULT FALSE;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS costo_monto       NUMERIC;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS costo_descripcion TEXT DEFAULT '';
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS comprobantes      JSONB DEFAULT '[]';

-- Hitos — fechas de inicio/fin y macrotareas
ALTER TABLE hitos ADD COLUMN IF NOT EXISTS fecha_inicio  TEXT;
ALTER TABLE hitos ADD COLUMN IF NOT EXISTS fecha_fin     TEXT;
ALTER TABLE hitos ADD COLUMN IF NOT EXISTS macrotareas   JSONB DEFAULT '[]';

-- Scrum sesiones — guardar hitos revisados y acciones definidas
ALTER TABLE scrum_sesiones ADD COLUMN IF NOT EXISTS hitos_revisados   JSONB DEFAULT '[]';
ALTER TABLE scrum_sesiones ADD COLUMN IF NOT EXISTS acciones_definidas JSONB DEFAULT '[]';

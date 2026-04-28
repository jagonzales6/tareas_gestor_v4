const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const fs       = require('fs');
const path     = require('path');

// ============================================================================
// CONEXIÓN SQLite
// ============================================================================

const DB_PATH = process.env.DATABASE_URL || path.join(__dirname, '../../data/nihr.db');

// Asegurar que el directorio data/ existe
const dbDir = path.dirname(path.resolve(DB_PATH));
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');   // mejor concurrencia lectores/escritor
db.pragma('foreign_keys = ON');

// ============================================================================
// HELPERS
// ============================================================================

// Parsear campo JSON almacenado como TEXT
function j(val, def) {
  if (val == null) return def;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return def; }
}

// Serializar valor a TEXT para guardar en SQLite
const s = (val) => val == null ? null : JSON.stringify(val);

// Convertir INTEGER 0/1 de SQLite a boolean JS
const b = (val) => !!val;

// buildSetClause para UPDATE dinámico con placeholders ?
function buildSetClause(fieldMap, changes) {
  const sets   = [];
  const params = [];
  for (const [key, val] of Object.entries(changes)) {
    const col = fieldMap[key];
    if (col !== undefined) {
      sets.push(`${col} = ?`);
      params.push(val);
    }
  }
  return { sets, params };
}

// ============================================================================
// INICIALIZACIÓN DEL ESQUEMA
// ============================================================================

async function initSchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sqlite.sql'), 'utf8');
  // Ejecutar cada sentencia por separado (better-sqlite3 no acepta múltiples en exec con punto y coma especial)
  db.exec(sql);
  await seedIfEmpty();
  console.log('\n📂 SQLite conectado y esquema listo →', DB_PATH);
}

// ============================================================================
// DATOS INICIALES
// ============================================================================

async function seedIfEmpty() {
  const row = db.prepare('SELECT COUNT(*) AS n FROM usuarios').get();
  if (row.n > 0) return;

  const hash = await bcrypt.hash('Nihr2026!', 10);
  const now  = new Date().toISOString();

  const ROLES_DIR = ['admin', 'gerente', 'pi', 'responsable_financiero', 'coordinadora'];

  const usuarios = [
    { email: 'admin@unifranz.edu',                                          nombre: 'Admin System',                          rol: 'admin',                  departamento: 'Sistema',       proyecto: null, supervisora: null },
    { email: 'gerente@unifranz.edu',                                        nombre: 'Gerente del Proyecto',                  rol: 'gerente',                departamento: 'Dirección',     proyecto: null, supervisora: null },
    { email: 'pi@unifranz.edu',                                             nombre: 'PI - Investigador Principal',            rol: 'pi',                     departamento: 'Investigación', proyecto: null, supervisora: null },
    { email: 'financiero@unifranz.edu',                                     nombre: 'Responsable Financiero',                rol: 'responsable_financiero', departamento: 'Finanzas',      proyecto: null, supervisora: null },
    { email: 'coordinadora@unifranz.edu',                                   nombre: 'Coordinadora de Investigación',         rol: 'coordinadora',           departamento: 'Coordinación',  proyecto: null, supervisora: null },
    { email: 'becaria1@unifranz.edu',                                       nombre: 'Becaria 1',                             rol: 'becaria',                departamento: 'Investigación', proyecto: null, supervisora: null },
    { email: 'proyectoinvest.mauricioalejandro.baspineiro@unifranz.edu.bo', nombre: 'Mauricio Alejandro Baspineiro Aguirre', rol: 'asistente',              departamento: 'Investigación', proyecto: 'Trial 1: DIALOG+',      supervisora: 'coordinadora@unifranz.edu' },
    { email: 'proyectoinvest.luisfelipe.osinaga@unifranz.edu.bo',           nombre: 'Luis Felipe Osinaga Robles',            rol: 'asistente',              departamento: 'Investigación', proyecto: 'Trial 1: DIALOG+',      supervisora: 'coordinadora@unifranz.edu' },
    { email: 'proyectoinvest.janethesther.calatayud@unifranz.edu.bo',       nombre: 'Janeth Esther Calatayud Padilla',       rol: 'asistente',              departamento: 'Investigación', proyecto: 'Trial 1: DIALOG+',      supervisora: 'coordinadora@unifranz.edu' },
    { email: 'proyectoinvest.jorgeignacio.antelo@unifranz.edu.bo',          nombre: 'Jorge Ignacio Antelo Gutiérrez',        rol: 'asistente',              departamento: 'Investigación', proyecto: 'Trial 1: DIALOG+',      supervisora: 'coordinadora@unifranz.edu' },
    { email: 'proyectoinvest.noeliaaida.castro@unifranz.edu.bo',            nombre: 'Noelia Aida Castro Guzmán',             rol: 'asistente',              departamento: 'Investigación', proyecto: 'Trial 2: Multifamiliar', supervisora: 'coordinadora@unifranz.edu' },
    { email: 'proyectoinvest.joelangel.gonzales@unifranz.edu.bo',           nombre: 'Joel Ángel Gonzales Flores',            rol: 'admin',                  departamento: 'TI',            proyecto: null, supervisora: null },
  ];

  const insertU = db.prepare(
    `INSERT INTO usuarios (email,nombre,password_hash,rol,activo,departamento,proyecto,supervisora,equipos,es_directiva,es_encargado_recursos)
     VALUES (?,?,?,?,1,?,?,?,'[]',?,0)`
  );
  for (const u of usuarios) {
    insertU.run(u.email, u.nombre, hash, u.rol, u.departamento, u.proyecto, u.supervisora, ROLES_DIR.includes(u.rol) ? 1 : 0);
  }

  const insertP = db.prepare(
    'INSERT INTO proyectos (nombre,descripcion,miembros,creado_por,created_at) VALUES (?,?,?,?,?)'
  );
  insertP.run('Trial 1: DIALOG+',          'RCT DIALOG - Estudio sobre intervenciones de diálogo',        s(['proyectoinvest.mauricioalejandro.baspineiro@unifranz.edu.bo','proyectoinvest.luisfelipe.osinaga@unifranz.edu.bo','proyectoinvest.janethesther.calatayud@unifranz.edu.bo','proyectoinvest.jorgeignacio.antelo@unifranz.edu.bo','coordinadora@unifranz.edu','pi@unifranz.edu']), 'admin@unifranz.edu', '2026-01-01');
  insertP.run('Trial 2: Multifamiliar',    'IT MULTI - Intervención en contextos multifamiliares',         s(['proyectoinvest.noeliaaida.castro@unifranz.edu.bo','coordinadora@unifranz.edu','pi@unifranz.edu']), 'admin@unifranz.edu', '2026-01-05');
  insertP.run('Actividades Transversales', 'Actividades transversales de investigación y coordinación',     s(['coordinadora@unifranz.edu','pi@unifranz.edu','financiero@unifranz.edu','gerente@unifranz.edu']), 'admin@unifranz.edu', '2026-01-10');

  db.prepare(
    `INSERT INTO tareas (id,proyecto,descripcion,estado,fecha_vencimiento,responsables,notas,origen_scrum,creado_por,fecha_creacion)
     VALUES (?,?,?,'Pendiente','2026-04-15',?,?,0,?,?)`
  ).run('1','NIHR','Revisar documentación del proyecto', s(['proyectoinvest.mauricioalejandro.baspineiro@unifranz.edu.bo']), 'Incluir feedback técnico', 'admin@unifranz.edu', now);

  db.prepare(
    `INSERT INTO reuniones (id,proyecto,descripcion,fecha,hora_inicio,hora_fin,asistentes,creado_por,fecha_creacion)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run('1','NIHR','Kick-off Meeting del Proyecto','2026-04-01','10:00','11:00', s(['coordinadora@unifranz.edu','pi@unifranz.edu']), 'admin@unifranz.edu', now);

  db.prepare(
    `INSERT INTO tablets (id,nombre,descripcion,activo,creado_en) VALUES (?,?,?,1,?)`
  ).run('TAB-001','Tablet Samsung Tab A8 #1','Tablet principal para trabajo de campo', now);
  db.prepare(
    `INSERT INTO tablets (id,nombre,descripcion,activo,creado_en) VALUES (?,?,?,1,?)`
  ).run('TAB-002','Tablet Samsung Tab A8 #2','Tablet de respaldo para entrevistas', now);

  console.log('✅ Datos iniciales cargados. Contraseña por defecto: Nihr2026!');
}

// ============================================================================
// MAPEADORES (fila SQLite → objeto JS)
// ============================================================================

function toUsuario(r) {
  return {
    email:               r.email,
    nombre:              r.nombre,
    password_hash:       r.password_hash,
    rol:                 r.rol,
    activo:              b(r.activo),
    departamento:        r.departamento  || '',
    proyecto:            r.proyecto      || null,
    supervisora:         r.supervisora   || null,
    equipo:              r.equipo        || null,
    equipos:             j(r.equipos, []),
    esDirectiva:         b(r.es_directiva),
    esEncargadoRecursos: b(r.es_encargado_recursos),
    secciones:           j(r.secciones, null),
    telefono:            r.telefono      || '',
    cargo:               r.cargo         || '',
  };
}

function toTarea(r) {
  return {
    id:                  r.id,
    proyecto:            r.proyecto,
    descripcion:         r.descripcion,
    estado:              r.estado,
    fechaVencimiento:    r.fecha_vencimiento   || null,
    responsables:        j(r.responsables, []),
    notas:               r.notas               || '',
    origenScrum:         b(r.origen_scrum),
    reunionOrigenId:     r.reunion_origen_id   || null,
    creadoPor:           r.creado_por,
    fechaCreacion:       r.fecha_creacion,
    evidencia:           j(r.evidencia, null),
    ultimaActualizacion: r.ultima_actualizacion || null,
    hitoId:              r.hito_id             || null,
    esCritica:           b(r.es_critica),
    macrotareaId:        r.macrotarea_id       || null,
    tieneCosto:          b(r.tiene_costo),
    costoMonto:          r.costo_monto != null ? Number(r.costo_monto) : null,
    costoDescripcion:    r.costo_descripcion   || '',
    comprobantes:        j(r.comprobantes, []),
  };
}

function toMastersheet(r) {
  return {
    id:                  r.id,
    proyecto:            r.proyecto,
    editores:            j(r.editores, []),
    creadoPor:           r.creado_por,
    creadoEn:            r.creado_en,
    ultimaActualizacion: r.ultima_actualizacion || null,
  };
}

function toHito(r) {
  return {
    id:                   r.id,
    mastersheetId:        r.mastersheet_id,
    proyecto:             r.proyecto,
    nombre:               r.nombre,
    descripcion:          r.descripcion          || '',
    fechaInicio:          r.fecha_inicio         || null,
    fechaFin:             r.fecha_fin            || r.fecha_objetivo || null,
    fechaReal:            r.fecha_real           || null,
    responsablePrincipal: r.responsable_principal || null,
    estado:               r.estado               || 'pendiente',
    progreso:             r.progreso_calculado   || 0,
    esCritico:            b(r.es_critico),
    macrotareas:          j(r.macrotareas, []),
    notasEditor:          j(r.notas_editor, []),
    orden:                r.orden                || 0,
    creadoPor:            r.creado_por,
    creadoEn:             r.creado_en,
  };
}

function toHitoPropuesta(r) {
  return {
    id:             r.id,
    hitoId:         r.hito_id,
    mastersheetId:  r.mastersheet_id,
    proyecto:       r.proyecto,
    propuestoPor:   r.propuesto_por,
    tipoCambio:     r.tipo_cambio,
    valorActual:    r.valor_actual    || null,
    valorPropuesto: r.valor_propuesto,
    justificacion:  r.justificacion   || '',
    estado:         r.estado          || 'pendiente',
    revisadoPor:    r.revisado_por    || null,
    revisadoEn:     r.revisado_en     || null,
    comentario:     r.comentario      || '',
    creadoEn:       r.creado_en,
  };
}

function toReunion(r) {
  return {
    id:               r.id,
    tipo:             r.tipo,
    modalidad:        r.modalidad,
    tipoReunion:      r.tipo_reunion,
    proyecto:         r.proyecto,
    descripcion:      r.descripcion,
    fecha:            r.fecha            || null,
    horaInicio:       r.hora_inicio      || '',
    horaFin:          r.hora_fin         || '',
    enlace:           r.enlace           || '',
    asistentes:       j(r.asistentes, []),
    asistencias:      j(r.asistencias, {}),
    notas:            j(r.notas, []),
    acta:             r.acta             || '',
    calendarEventIds: j(r.calendar_event_ids, {}),
    creadoPor:        r.creado_por,
    fechaCreacion:    r.fecha_creacion,
  };
}

function toProyecto(r) {
  return {
    nombre:      r.nombre,
    descripcion: r.descripcion || '',
    miembros:    j(r.miembros, []),
    creadoPor:   r.creado_por,
    createdAt:   r.created_at || null,
  };
}

function toAnuncio(r) {
  return {
    id:         r.id,
    titulo:     r.titulo,
    contenido:  r.contenido,
    importante: b(r.importante),
    autor:      r.autor,
    autorEmail: r.autor_email,
    fecha:      r.fecha     || null,
    creadoEn:   r.creado_en,
    imagen:     j(r.imagen, null),
  };
}

function toPresupuesto(r) {
  return {
    id:                  r.id,
    proyecto:            r.proyecto,
    mes:                 r.mes,
    descripcion:         r.descripcion       || '',
    estado:              r.estado,
    items:               j(r.items, []),
    totalSolicitado:     parseFloat(r.total_solicitado) || 0,
    respaldos:           j(r.respaldos, []),
    comentarios:         j(r.comentarios, []),
    creadoPor:           r.creado_por,
    creadoPorNombre:     r.creado_por_nombre || null,
    creadoEn:            r.creado_en,
    ultimaActualizacion: r.ultima_actualizacion || null,
    revisadoPor:         r.revisado_por      || null,
    revisadoEn:          r.revisado_en       || null,
    aprobadoPor:         r.aprobado_por      || null,
    aprobadoEn:          r.aprobado_en       || null,
    desembolsadoPor:     r.desembolsado_por  || null,
    desembolsadoEn:      r.desembolsado_en   || null,
  };
}

function toGasto(r) {
  return {
    id:               r.id,
    presupuestoId:    r.presupuesto_id,
    tareaId:          r.tarea_id          || null,
    proyecto:         r.proyecto,
    mes:              r.mes,
    rubro:            r.rubro,
    descripcion:      r.descripcion       || '',
    monto:            parseFloat(r.monto) || 0,
    responsable:      r.responsable,
    responsableNombre: r.responsable_nombre || null,
    estado:           r.estado,
    respaldos:        j(r.respaldos, []),
    creadoEn:         r.creado_en,
    revisadoPor:      r.revisado_por      || null,
    revisadoEn:       r.revisado_en       || null,
  };
}

function toNotificacion(r) {
  return {
    id:        r.id,
    para:      r.para,
    tipo:      r.tipo,
    titulo:    r.titulo,
    mensaje:   r.mensaje,
    leida:     b(r.leida),
    creadaEn:  r.creada_en,
    referencia: j(r.referencia, null),
  };
}

function toScrumSesion(r) {
  return {
    id:                 r.id,
    reunionId:          r.reunion_id,
    titulo:             r.titulo,
    proyecto:           r.proyecto           || '',
    fecha:              r.fecha              || null,
    asistentes:         j(r.asistentes, []),
    notas:              j(r.notas, []),
    horaInicio:         r.hora_inicio        || null,
    horaFin:            r.hora_fin           || null,
    duracionSegundos:   r.duracion_segundos  || 0,
    duracionTexto:      r.duracion_texto     || '',
    tareasAsignadasIds: j(r.tareas_asignadas_ids, []),
    cerradoPor:         r.cerrado_por,
    cerradoPorNombre:   r.cerrado_por_nombre || null,
    cerradoEn:          r.cerrado_en,
    historial:          j(r.historial, []),
  };
}

function toScrumPrograma(r) {
  return {
    id:          r.id,
    proyecto:    r.proyecto,
    frecuencia:  r.frecuencia,
    hora:        r.hora,
    asistentes:  j(r.asistentes, []),
    activo:      b(r.activo),
    fechaInicio: r.fecha_inicio,
    creadoPor:   r.creado_por,
    creadoEn:    r.creado_en,
  };
}

function toTablet(r) {
  return { id: r.id, nombre: r.nombre, descripcion: r.descripcion || '', activo: b(r.activo), creadoEn: r.creado_en };
}

function toDocumento(r) {
  return { id: r.id, carpetaId: r.carpeta_id, nombre: r.nombre, descripcion: r.descripcion || '', activo: b(r.activo), creadoEn: r.creado_en };
}

function toPrestamo(r) {
  return {
    id:                     r.id,
    tipo:                   r.tipo,
    recursoId:              r.recurso_id,
    recursoNombre:          r.recurso_nombre,
    solicitante:            r.solicitante,
    solicitanteNombre:      r.solicitante_nombre        || null,
    motivo:                 r.motivo                    || '',
    estado:                 r.estado,
    fechaSolicitud:         r.fecha_solicitud,
    encargadoEntrega:       r.encargado_entrega         || null,
    encargadoEntregaNombre: r.encargado_entrega_nombre  || null,
    fechaEntrega:           r.fecha_entrega             || null,
    detallesEntrega:        r.detalles_entrega          || '',
    encargadoDevolucion:        r.encargado_devolucion        || null,
    encargadoDevolucionNombre:  r.encargado_devolucion_nombre || null,
    fechaDevolucion:        r.fecha_devolucion          || null,
    detallesDevolucion:     r.detalles_devolucion       || '',
  };
}

// ============================================================================
// USUARIOS
// ============================================================================

const DIAS_SIN_UPDATE = 5;
function diffDays(a, b) {
  if (!b) return DIAS_SIN_UPDATE;
  return Math.round((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24));
}

async function findUsuario(email) {
  const r = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  return r ? toUsuario(r) : null;
}

async function getUsuariosActivos() {
  const rows = db.prepare('SELECT * FROM usuarios WHERE activo = 1').all();
  return rows.map(r => { const u = toUsuario(r); delete u.password_hash; return u; });
}

async function updatePassword(email, nuevoHash) {
  db.prepare('UPDATE usuarios SET password_hash = ? WHERE email = ?').run(nuevoHash, email);
}

async function updatePerfil(email, datos) {
  const FM = { nombre: 'nombre', telefono: 'telefono', cargo: 'cargo', departamento: 'departamento' };
  const { sets, params } = buildSetClause(FM, datos);
  if (sets.length === 0) return null;
  params.push(email);
  db.prepare(`UPDATE usuarios SET ${sets.join(', ')} WHERE email = ?`).run(...params);
  const r = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!r) return null;
  const u = toUsuario(r); delete u.password_hash; return u;
}

async function updateEquipoUsuario(email, equipo) {
  const equipos = equipo ? [equipo] : [];
  db.prepare('UPDATE usuarios SET equipo=?, equipos=? WHERE email=?').run(equipo || null, s(equipos), email);
  const r = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!r) return null;
  const u = toUsuario(r); delete u.password_hash; return u;
}

async function updateEquiposUsuario(email, equipos) {
  const arr = Array.isArray(equipos) ? equipos : [];
  db.prepare('UPDATE usuarios SET equipos=?, equipo=? WHERE email=?').run(s(arr), arr[0] || null, email);
  const r = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!r) return null;
  const u = toUsuario(r); delete u.password_hash; return u;
}

async function insertUsuario(usuario) {
  const u = usuario;
  db.prepare(
    `INSERT INTO usuarios (email,nombre,password_hash,rol,activo,departamento,proyecto,supervisora,equipo,equipos,es_directiva,es_encargado_recursos,secciones,telefono,cargo)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    u.email, u.nombre, u.password_hash, u.rol,
    u.activo !== undefined ? (u.activo ? 1 : 0) : 1,
    u.departamento || '', u.proyecto || null, u.supervisora || null,
    u.equipo || null, s(u.equipos || []),
    u.esDirectiva ? 1 : 0, u.esEncargadoRecursos ? 1 : 0,
    u.secciones != null ? s(u.secciones) : null,
    u.telefono || '', u.cargo || ''
  );
}

async function updateUsuario(email, changes) {
  const FM = {
    rol: 'rol', nombre: 'nombre', proyecto: 'proyecto', equipo: 'equipo', equipos: 'equipos',
    esDirectiva: 'es_directiva', esEncargadoRecursos: 'es_encargado_recursos',
    secciones: 'secciones', activo: 'activo', password_hash: 'password_hash',
    departamento: 'departamento', supervisora: 'supervisora',
  };
  const normalized = { ...changes };
  if (normalized.equipos    !== undefined) normalized.equipos    = s(normalized.equipos);
  if (normalized.secciones  !== undefined) normalized.secciones  = normalized.secciones != null ? s(normalized.secciones) : null;
  if (normalized.esDirectiva !== undefined) normalized.esDirectiva = normalized.esDirectiva ? 1 : 0;
  if (normalized.esEncargadoRecursos !== undefined) normalized.esEncargadoRecursos = normalized.esEncargadoRecursos ? 1 : 0;
  if (normalized.activo !== undefined) normalized.activo = normalized.activo ? 1 : 0;
  const { sets, params } = buildSetClause(FM, normalized);
  if (sets.length === 0) return null;
  params.push(email);
  db.prepare(`UPDATE usuarios SET ${sets.join(', ')} WHERE email = ?`).run(...params);
  const r = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!r) return null;
  const u = toUsuario(r); delete u.password_hash; return u;
}

async function deleteUsuario(email) {
  db.prepare('DELETE FROM usuarios WHERE email = ?').run(email);
}

async function changeEmailUsuario(oldEmail, newEmail) {
  const doChange = db.transaction(() => {
    const userRow = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(oldEmail);
    if (!userRow) return null;

    db.prepare('UPDATE usuarios SET email = ? WHERE email = ?').run(newEmail, oldEmail);

    // Referencias directas (columnas de texto)
    db.prepare('UPDATE usuarios      SET supervisora  = ? WHERE supervisora   = ?').run(newEmail, oldEmail);
    db.prepare('UPDATE tareas        SET creado_por   = ? WHERE creado_por    = ?').run(newEmail, oldEmail);
    db.prepare('UPDATE reuniones     SET creado_por   = ? WHERE creado_por    = ?').run(newEmail, oldEmail);
    db.prepare('UPDATE proyectos     SET creado_por   = ? WHERE creado_por    = ?').run(newEmail, oldEmail);
    db.prepare('UPDATE prestamos     SET solicitante  = ? WHERE solicitante   = ?').run(newEmail, oldEmail);
    db.prepare('UPDATE notificaciones SET para        = ? WHERE para          = ?').run(newEmail, oldEmail);
    db.prepare('UPDATE solicitudes_actualizacion SET email_destino = ? WHERE email_destino = ?').run(newEmail, oldEmail);

    // Arrays JSON: tareas.responsables
    const tareas = db.prepare('SELECT id, responsables FROM tareas').all();
    const updT = db.prepare('UPDATE tareas SET responsables = ? WHERE id = ?');
    for (const t of tareas) {
      const arr = j(t.responsables, []);
      if (arr.includes(oldEmail)) {
        updT.run(s(arr.map(e => e === oldEmail ? newEmail : e)), t.id);
      }
    }

    // Arrays JSON: reuniones.asistentes
    const reuniones = db.prepare('SELECT id, asistentes FROM reuniones').all();
    const updR = db.prepare('UPDATE reuniones SET asistentes = ? WHERE id = ?');
    for (const r of reuniones) {
      const arr = j(r.asistentes, []);
      if (arr.includes(oldEmail)) {
        updR.run(s(arr.map(e => e === oldEmail ? newEmail : e)), r.id);
      }
    }

    // Arrays JSON: proyectos.miembros
    const proyectos = db.prepare('SELECT nombre, miembros FROM proyectos').all();
    const updP = db.prepare('UPDATE proyectos SET miembros = ? WHERE nombre = ?');
    for (const p of proyectos) {
      const arr = j(p.miembros, []);
      if (arr.includes(oldEmail)) {
        updP.run(s(arr.map(e => e === oldEmail ? newEmail : e)), p.nombre);
      }
    }

    return db.prepare('SELECT * FROM usuarios WHERE email = ?').get(newEmail);
  });

  const row = doChange();
  if (!row) return null;
  const u = toUsuario(row); delete u.password_hash; return u;
}

// ============================================================================
// SOLICITUDES DE ACTUALIZACIÓN
// ============================================================================

async function getSolicitudesPendientes(emailDestino) {
  const rows = db.prepare(
    'SELECT * FROM solicitudes_actualizacion WHERE email_destino=? AND completada=0 ORDER BY fecha'
  ).all(emailDestino);
  return rows.map(r => ({
    id: r.id, emailDestino: r.email_destino, enviadoPor: r.enviado_por,
    mensaje: r.mensaje, fecha: r.fecha, completada: b(r.completada), completadaEn: r.completada_en
  }));
}

async function insertSolicitud(sol) {
  db.prepare(
    'INSERT INTO solicitudes_actualizacion (id,email_destino,enviado_por,mensaje,fecha,completada) VALUES (?,?,?,?,?,0)'
  ).run(sol.id, sol.emailDestino, sol.enviadoPor || null, sol.mensaje || '', sol.fecha || new Date().toISOString());
}

async function completarSolicitud(id) {
  db.prepare(
    'UPDATE solicitudes_actualizacion SET completada=1, completada_en=? WHERE id=?'
  ).run(new Date().toISOString(), id);
}

async function getSolicitudesEnviadas() {
  const rows = db.prepare('SELECT * FROM solicitudes_actualizacion ORDER BY fecha DESC').all();
  return rows.map(r => ({
    id: r.id, emailDestino: r.email_destino, enviadoPor: r.enviado_por,
    mensaje: r.mensaje, fecha: r.fecha, completada: b(r.completada), completadaEn: r.completada_en
  }));
}

// ============================================================================
// TAREAS
// ============================================================================

async function getTareas() {
  const rows = db.prepare('SELECT * FROM tareas ORDER BY fecha_creacion').all();
  const ahora = new Date();
  return rows.map(r => {
    const t = toTarea(r);
    const stale = t.estado !== 'Completada' && t.estado !== 'Cancelada' &&
                  diffDays(ahora, t.ultimaActualizacion) >= DIAS_SIN_UPDATE;
    return { ...t, esCritica: t.esCritica || stale };
  });
}

async function getTarea(id) {
  const r = db.prepare('SELECT * FROM tareas WHERE id = ?').get(id);
  return r ? toTarea(r) : null;
}

async function getTareasConCosto() {
  return db.prepare('SELECT * FROM tareas WHERE tiene_costo = 1 ORDER BY fecha_creacion DESC').all().map(toTarea);
}

async function insertTarea(t) {
  db.prepare(
    `INSERT INTO tareas (id,proyecto,descripcion,estado,fecha_vencimiento,responsables,notas,origen_scrum,reunion_origen_id,creado_por,fecha_creacion,evidencia,ultima_actualizacion,hito_id,es_critica,macrotarea_id,tiene_costo,costo_monto,costo_descripcion,comprobantes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    t.id, t.proyecto, t.descripcion, t.estado || 'Pendiente',
    t.fechaVencimiento || null, s(t.responsables || []),
    t.notas || '', t.origenScrum ? 1 : 0, t.reunionOrigenId || null,
    t.creadoPor, t.fechaCreacion || new Date().toISOString(),
    t.evidencia != null ? s(t.evidencia) : null,
    t.ultimaActualizacion || null,
    t.hitoId || null, t.esCritica ? 1 : 0, t.macrotareaId || null,
    t.tieneCosto ? 1 : 0,
    t.costoMonto != null ? Number(t.costoMonto) : null,
    t.costoDescripcion || '',
    s(t.comprobantes || [])
  );
}

async function updateTarea(id, changes) {
  const FM = {
    estado: 'estado', notas: 'notas', evidencia: 'evidencia',
    ultimaActualizacion: 'ultima_actualizacion', responsables: 'responsables',
    hitoId: 'hito_id', esCritica: 'es_critica',
    descripcion: 'descripcion', fechaVencimiento: 'fecha_vencimiento',
    macrotareaId: 'macrotarea_id',
    tieneCosto: 'tiene_costo', costoMonto: 'costo_monto',
    costoDescripcion: 'costo_descripcion', comprobantes: 'comprobantes',
  };
  const normalized = { ...changes };
  if (normalized.responsables  !== undefined) normalized.responsables  = s(normalized.responsables);
  if (normalized.evidencia      !== undefined) normalized.evidencia      = normalized.evidencia != null ? s(normalized.evidencia) : null;
  if (normalized.comprobantes   !== undefined) normalized.comprobantes   = s(normalized.comprobantes);
  if (normalized.esCritica      !== undefined) normalized.esCritica      = normalized.esCritica ? 1 : 0;
  if (normalized.tieneCosto     !== undefined) normalized.tieneCosto     = normalized.tieneCosto ? 1 : 0;
  const { sets, params } = buildSetClause(FM, normalized);
  if (sets.length === 0) return getTarea(id);
  params.push(id);
  db.prepare(`UPDATE tareas SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return getTarea(id);
}

// ============================================================================
// REUNIONES
// ============================================================================

async function getReuniones() {
  return db.prepare('SELECT * FROM reuniones ORDER BY fecha_creacion').all().map(toReunion);
}

async function getReunion(id) {
  const r = db.prepare('SELECT * FROM reuniones WHERE id = ?').get(id);
  return r ? toReunion(r) : null;
}

async function insertReunion(r) {
  db.prepare(
    `INSERT INTO reuniones (id,tipo,modalidad,tipo_reunion,proyecto,descripcion,fecha,hora_inicio,hora_fin,enlace,asistentes,asistencias,notas,acta,calendar_event_ids,creado_por,fecha_creacion)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    r.id, r.tipo || 'nihr', r.modalidad || 'reunion', r.tipoReunion || 'especial',
    r.proyecto, r.descripcion, r.fecha || null,
    r.horaInicio || '', r.horaFin || '', r.enlace || '',
    s(r.asistentes || []), s(r.asistencias || {}),
    s(r.notas || []), r.acta || '',
    s(r.calendarEventIds || {}),
    r.creadoPor, r.fechaCreacion || new Date().toISOString()
  );
}

async function updateReunion(id, changes) {
  const FM = {
    notas: 'notas', acta: 'acta', asistencias: 'asistencias',
    calendarEventIds: 'calendar_event_ids', enlace: 'enlace',
  };
  const normalized = { ...changes };
  if (normalized.notas            !== undefined) normalized.notas            = s(normalized.notas);
  if (normalized.asistencias      !== undefined) normalized.asistencias      = s(normalized.asistencias);
  if (normalized.calendarEventIds !== undefined) normalized.calendarEventIds = s(normalized.calendarEventIds);
  const { sets, params } = buildSetClause(FM, normalized);
  if (sets.length === 0) return getReunion(id);
  params.push(id);
  db.prepare(`UPDATE reuniones SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return getReunion(id);
}

// ============================================================================
// GOOGLE TOKENS
// ============================================================================

async function storeGoogleTokens(email, tokens) {
  db.prepare(
    'INSERT INTO google_tokens (email,tokens) VALUES (?,?) ON CONFLICT(email) DO UPDATE SET tokens=excluded.tokens'
  ).run(email, s(tokens));
}

async function getGoogleTokens(email) {
  const r = db.prepare('SELECT tokens FROM google_tokens WHERE email=?').get(email);
  return r ? j(r.tokens, null) : null;
}

async function removeGoogleTokens(email) {
  db.prepare('DELETE FROM google_tokens WHERE email=?').run(email);
}

// ============================================================================
// PROYECTOS
// ============================================================================

async function getProyectos() {
  return db.prepare('SELECT * FROM proyectos ORDER BY created_at').all().map(toProyecto);
}

async function getNombresProyectos() {
  return db.prepare('SELECT nombre FROM proyectos ORDER BY created_at').all().map(r => r.nombre);
}

async function findProyecto(nombre) {
  const r = db.prepare('SELECT * FROM proyectos WHERE nombre=?').get(nombre);
  return r ? toProyecto(r) : null;
}

async function insertProyecto(p) {
  db.prepare(
    'INSERT INTO proyectos (nombre,descripcion,miembros,creado_por,created_at) VALUES (?,?,?,?,?)'
  ).run(p.nombre, p.descripcion || '', s(p.miembros || []), p.creadoPor, p.createdAt || new Date().toISOString().split('T')[0]);
}

async function updateMiembrosProyecto(nombre, miembros) {
  db.prepare('UPDATE proyectos SET miembros=? WHERE nombre=?').run(s(miembros), nombre);
  const r = db.prepare('SELECT * FROM proyectos WHERE nombre=?').get(nombre);
  return r ? toProyecto(r) : null;
}

// ============================================================================
// ANUNCIOS
// ============================================================================

async function getAnuncios() {
  return db.prepare('SELECT * FROM anuncios ORDER BY creado_en DESC').all().map(toAnuncio);
}

async function insertAnuncio(a) {
  db.prepare(
    'INSERT INTO anuncios (id,titulo,contenido,importante,autor,autor_email,fecha,creado_en,imagen) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(a.id, a.titulo, a.contenido, a.importante ? 1 : 0, a.autor, a.autorEmail, a.fecha || null, a.creadoEn || new Date().toISOString(), a.imagen != null ? s(a.imagen) : null);
}

async function deleteAnuncio(id) {
  db.prepare('DELETE FROM anuncios WHERE id=?').run(id);
}

async function updateAnuncioImagen(id, imagen) {
  db.prepare('UPDATE anuncios SET imagen=? WHERE id=?').run(imagen != null ? s(imagen) : null, id);
  const r = db.prepare('SELECT * FROM anuncios WHERE id=?').get(id);
  return r ? toAnuncio(r) : null;
}

// ============================================================================
// AUDITORÍA
// ============================================================================

async function insertAuditLog(entry) {
  db.prepare(
    'INSERT INTO auditoria (id,timestamp,usuario,accion,detalles) VALUES (?,?,?,?,?)'
  ).run(entry.id, entry.timestamp || new Date().toISOString(), entry.usuario, entry.accion, entry.detalles || '');
  // Purgar exceso: mantener máximo 500 entradas
  db.prepare(
    `DELETE FROM auditoria WHERE id IN (
       SELECT id FROM auditoria ORDER BY timestamp ASC LIMIT MAX(0, (SELECT COUNT(*) FROM auditoria) - 500)
     )`
  ).run();
}

async function getAuditLogs(limit = 200) {
  return db.prepare('SELECT * FROM auditoria ORDER BY timestamp DESC LIMIT ?').all(limit)
    .map(r => ({ id: r.id, timestamp: r.timestamp, usuario: r.usuario, accion: r.accion, detalles: r.detalles }));
}

// ============================================================================
// PRESUPUESTOS
// ============================================================================

async function getPresupuestos() {
  return db.prepare('SELECT * FROM presupuestos ORDER BY creado_en').all().map(toPresupuesto);
}

async function getPresupuesto(id) {
  const r = db.prepare('SELECT * FROM presupuestos WHERE id=?').get(id);
  return r ? toPresupuesto(r) : null;
}

async function insertPresupuesto(p) {
  db.prepare(
    `INSERT INTO presupuestos (id,proyecto,mes,descripcion,estado,items,total_solicitado,respaldos,comentarios,creado_por,creado_por_nombre,creado_en)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    p.id, p.proyecto, p.mes, p.descripcion || '', p.estado || 'borrador',
    s(p.items || []), p.totalSolicitado || 0, s(p.respaldos || []), s(p.comentarios || []),
    p.creadoPor, p.creadoPorNombre || null, p.creadoEn || new Date().toISOString()
  );
}

async function updatePresupuesto(id, changes) {
  const FM = {
    estado: 'estado', ultimaActualizacion: 'ultima_actualizacion',
    revisadoPor: 'revisado_por', revisadoEn: 'revisado_en',
    aprobadoPor: 'aprobado_por', aprobadoEn: 'aprobado_en',
    desembolsadoPor: 'desembolsado_por', desembolsadoEn: 'desembolsado_en',
    respaldos: 'respaldos', comentarios: 'comentarios',
  };
  const normalized = { ...changes };
  if (normalized.respaldos   !== undefined) normalized.respaldos   = s(normalized.respaldos);
  if (normalized.comentarios !== undefined) normalized.comentarios = s(normalized.comentarios);
  const { sets, params } = buildSetClause(FM, normalized);
  if (sets.length === 0) return getPresupuesto(id);
  params.push(id);
  db.prepare(`UPDATE presupuestos SET ${sets.join(', ')} WHERE id=?`).run(...params);
  return getPresupuesto(id);
}

// ============================================================================
// GASTOS
// ============================================================================

async function getGastos() {
  return db.prepare('SELECT * FROM gastos ORDER BY creado_en').all().map(toGasto);
}

async function getGasto(id) {
  const r = db.prepare('SELECT * FROM gastos WHERE id=?').get(id);
  return r ? toGasto(r) : null;
}

async function insertGasto(g) {
  db.prepare(
    `INSERT INTO gastos (id,presupuesto_id,tarea_id,proyecto,mes,rubro,descripcion,monto,responsable,responsable_nombre,estado,respaldos,creado_en)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    g.id, g.presupuestoId, g.tareaId || null, g.proyecto, g.mes,
    g.rubro, g.descripcion || '', g.monto, g.responsable,
    g.responsableNombre || null, g.estado || 'pendiente',
    s(g.respaldos || []), g.creadoEn || new Date().toISOString()
  );
}

async function updateGasto(id, changes) {
  const FM = { estado: 'estado', revisadoPor: 'revisado_por', revisadoEn: 'revisado_en', respaldos: 'respaldos' };
  const normalized = { ...changes };
  if (normalized.respaldos !== undefined) normalized.respaldos = s(normalized.respaldos);
  const { sets, params } = buildSetClause(FM, normalized);
  if (sets.length === 0) return getGasto(id);
  params.push(id);
  db.prepare(`UPDATE gastos SET ${sets.join(', ')} WHERE id=?`).run(...params);
  return getGasto(id);
}

// ============================================================================
// NOTIFICACIONES
// ============================================================================

async function getNotificaciones(emailPara) {
  return db.prepare('SELECT * FROM notificaciones WHERE para=? ORDER BY creada_en DESC LIMIT 100').all(emailPara).map(toNotificacion);
}

async function insertNotificacion(n) {
  db.prepare(
    'INSERT INTO notificaciones (id,para,tipo,titulo,mensaje,leida,creada_en,referencia) VALUES (?,?,?,?,?,0,?,?)'
  ).run(n.id, n.para, n.tipo, n.titulo || '', n.mensaje || '', n.creadaEn || new Date().toISOString(), n.referencia || null);
  // Purgar exceso por usuario (máx 1000)
  db.prepare(
    `DELETE FROM notificaciones WHERE id IN (
       SELECT id FROM notificaciones WHERE para=? ORDER BY creada_en ASC LIMIT MAX(0, (SELECT COUNT(*) FROM notificaciones WHERE para=?) - 1000)
     )`
  ).run(n.para, n.para);
}

async function marcarNotificacionLeida(id, emailPara) {
  db.prepare('UPDATE notificaciones SET leida=1 WHERE id=? AND para=?').run(id, emailPara);
  const r = db.prepare('SELECT * FROM notificaciones WHERE id=?').get(id);
  return r ? toNotificacion(r) : null;
}

async function marcarTodasLeidas(emailPara) {
  db.prepare('UPDATE notificaciones SET leida=1 WHERE para=?').run(emailPara);
}

// ============================================================================
// SCRUM PROGRAMAS
// ============================================================================

async function getScrumProgramas() {
  return db.prepare('SELECT * FROM scrum_programas ORDER BY creado_en DESC').all().map(toScrumPrograma);
}

async function insertScrumPrograma(p) {
  db.prepare(
    `INSERT INTO scrum_programas (id,proyecto,frecuencia,hora,asistentes,activo,fecha_inicio,creado_por,creado_en)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(p.id, p.proyecto, p.frecuencia, p.hora, s(p.asistentes || []),
    p.activo !== false ? 1 : 0, p.fechaInicio, p.creadoPor, p.creadoEn || new Date().toISOString());
}

async function updateScrumPrograma(id, changes) {
  const FM = { activo: 'activo', hora: 'hora', frecuencia: 'frecuencia', asistentes: 'asistentes' };
  const normalized = { ...changes };
  if (normalized.asistentes !== undefined) normalized.asistentes = s(normalized.asistentes);
  if (normalized.activo     !== undefined) normalized.activo     = normalized.activo ? 1 : 0;
  const { sets, params } = buildSetClause(FM, normalized);
  if (sets.length === 0) return;
  params.push(id);
  db.prepare(`UPDATE scrum_programas SET ${sets.join(', ')} WHERE id=?`).run(...params);
}

async function deleteScrumPrograma(id) {
  db.prepare('DELETE FROM scrum_programas WHERE id=?').run(id);
}

// ============================================================================
// SCRUM SESIONES
// ============================================================================

async function getScrumSesiones() {
  return db.prepare('SELECT * FROM scrum_sesiones ORDER BY cerrado_en').all().map(toScrumSesion);
}

async function getScrumSesion(id) {
  const r = db.prepare('SELECT * FROM scrum_sesiones WHERE id=?').get(id);
  return r ? toScrumSesion(r) : null;
}

async function insertScrumSesion(ss) {
  db.prepare(
    `INSERT INTO scrum_sesiones (id,reunion_id,titulo,proyecto,fecha,asistentes,notas,hora_inicio,hora_fin,duracion_segundos,duracion_texto,tareas_asignadas_ids,cerrado_por,cerrado_por_nombre,cerrado_en,historial)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    ss.id, ss.reunionId, ss.titulo, ss.proyecto || '',
    ss.fecha || null, s(ss.asistentes || []), s(ss.notas || []),
    ss.horaInicio || null, ss.horaFin || null,
    ss.duracionSegundos || 0, ss.duracionTexto || '',
    s(ss.tareasAsignadasIds || []),
    ss.cerradoPor, ss.cerradoPorNombre || null,
    ss.cerradoEn || new Date().toISOString(),
    s(ss.historial || [])
  );
}

async function agregarEventoScrumSesion(id, evento) {
  const row = db.prepare('SELECT historial FROM scrum_sesiones WHERE id=?').get(id);
  if (!row) return null;
  const historial = [...j(row.historial, []), evento];
  db.prepare('UPDATE scrum_sesiones SET historial=? WHERE id=?').run(s(historial), id);
  return getScrumSesion(id);
}

// ============================================================================
// TABLETS
// ============================================================================

async function getTablets() {
  return db.prepare('SELECT * FROM tablets ORDER BY creado_en').all().map(toTablet);
}

async function getTablet(id) {
  const r = db.prepare('SELECT * FROM tablets WHERE id=?').get(id);
  return r ? toTablet(r) : null;
}

async function insertTablet(t) {
  db.prepare(
    'INSERT INTO tablets (id,nombre,descripcion,activo,creado_en) VALUES (?,?,?,?,?)'
  ).run(t.id, t.nombre, t.descripcion || '', t.activo !== false ? 1 : 0, t.creadoEn || new Date().toISOString());
}

async function deleteTablet(id) {
  db.prepare('DELETE FROM tablets WHERE id=?').run(id);
}

// ============================================================================
// DOCUMENTOS
// ============================================================================

async function getDocumentos() {
  return db.prepare('SELECT * FROM documentos ORDER BY creado_en').all().map(toDocumento);
}

async function getDocumento(id) {
  const r = db.prepare('SELECT * FROM documentos WHERE id=?').get(id);
  return r ? toDocumento(r) : null;
}

async function insertDocumento(d) {
  db.prepare(
    'INSERT INTO documentos (id,carpeta_id,nombre,descripcion,activo,creado_en) VALUES (?,?,?,?,?,?)'
  ).run(d.id, d.carpetaId, d.nombre, d.descripcion || '', d.activo !== false ? 1 : 0, d.creadoEn || new Date().toISOString());
}

async function deleteDocumento(id) {
  db.prepare('DELETE FROM documentos WHERE id=?').run(id);
}

// ============================================================================
// PRÉSTAMOS
// ============================================================================

async function getPrestamos() {
  return db.prepare('SELECT * FROM prestamos ORDER BY fecha_solicitud').all().map(toPrestamo);
}

async function getPrestamo(id) {
  const r = db.prepare('SELECT * FROM prestamos WHERE id=?').get(id);
  return r ? toPrestamo(r) : null;
}

async function insertPrestamo(p) {
  db.prepare(
    `INSERT INTO prestamos (id,tipo,recurso_id,recurso_nombre,solicitante,solicitante_nombre,motivo,estado,fecha_solicitud)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(
    p.id, p.tipo, p.recursoId, p.recursoNombre,
    p.solicitante, p.solicitanteNombre || null,
    p.motivo || '', p.estado || 'pendiente',
    p.fechaSolicitud || new Date().toISOString()
  );
}

async function updatePrestamo(id, changes) {
  const FM = {
    estado: 'estado',
    encargadoEntrega: 'encargado_entrega', encargadoEntregaNombre: 'encargado_entrega_nombre',
    fechaEntrega: 'fecha_entrega', detallesEntrega: 'detalles_entrega',
    encargadoDevolucion: 'encargado_devolucion', encargadoDevolucionNombre: 'encargado_devolucion_nombre',
    fechaDevolucion: 'fecha_devolucion', detallesDevolucion: 'detalles_devolucion',
  };
  const { sets, params } = buildSetClause(FM, changes);
  if (sets.length === 0) return getPrestamo(id);
  params.push(id);
  db.prepare(`UPDATE prestamos SET ${sets.join(', ')} WHERE id=?`).run(...params);
  return getPrestamo(id);
}

// ============================================================================
// MASTERSHEETS
// ============================================================================

async function getMastersheets() {
  return db.prepare('SELECT * FROM mastersheets ORDER BY creado_en').all().map(toMastersheet);
}

async function getMastersheet(id) {
  const r = db.prepare('SELECT * FROM mastersheets WHERE id=?').get(id);
  return r ? toMastersheet(r) : null;
}

async function getMastersheetByProyecto(proyecto) {
  const r = db.prepare('SELECT * FROM mastersheets WHERE proyecto=?').get(proyecto);
  return r ? toMastersheet(r) : null;
}

async function insertMastersheet(m) {
  const now = m.creadoEn || new Date().toISOString();
  db.prepare(
    `INSERT INTO mastersheets (id,proyecto,editores,creado_por,creado_en,ultima_actualizacion)
     VALUES (?,?,?,?,?,?)`
  ).run(m.id, m.proyecto, s(m.editores || []), m.creadoPor, now, now);
}

async function updateMastersheetEditores(id, editores) {
  db.prepare('UPDATE mastersheets SET editores=?, ultima_actualizacion=? WHERE id=?').run(s(editores), new Date().toISOString(), id);
  return getMastersheet(id);
}

async function touchMastersheet(id) {
  db.prepare('UPDATE mastersheets SET ultima_actualizacion=? WHERE id=?').run(new Date().toISOString(), id);
}

// ============================================================================
// HITOS
// ============================================================================

async function getHitosByMastersheet(mastersheetId) {
  return db.prepare('SELECT * FROM hitos WHERE mastersheet_id=? ORDER BY orden ASC, creado_en ASC').all(mastersheetId).map(toHito);
}

async function getHitosByProyecto(proyecto) {
  return db.prepare('SELECT * FROM hitos WHERE proyecto=? ORDER BY orden ASC, creado_en ASC').all(proyecto).map(toHito);
}

async function getHito(id) {
  const r = db.prepare('SELECT * FROM hitos WHERE id=?').get(id);
  return r ? toHito(r) : null;
}

async function insertHito(h) {
  const fechaFin = h.fechaFin || null;
  db.prepare(
    `INSERT INTO hitos (id,mastersheet_id,proyecto,nombre,descripcion,fecha_inicio,fecha_fin,fecha_objetivo,fecha_real,responsable_principal,estado,progreso_calculado,es_critico,macrotareas,notas_editor,orden,creado_por,creado_en)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    h.id, h.mastersheetId, h.proyecto, h.nombre, h.descripcion || '',
    h.fechaInicio || null, fechaFin, fechaFin, h.fechaReal || null,
    h.responsablePrincipal || null,
    h.estado || 'pendiente', h.progreso || 0, h.esCritico ? 1 : 0,
    s(h.macrotareas || []), s(h.notasEditor || []),
    h.orden || 0, h.creadoPor, h.creadoEn || new Date().toISOString()
  );
}

async function updateHito(id, changes) {
  const FM = {
    nombre: 'nombre', descripcion: 'descripcion',
    fechaInicio: 'fecha_inicio', fechaFin: 'fecha_fin', fechaReal: 'fecha_real',
    responsablePrincipal: 'responsable_principal',
    estado: 'estado', progreso: 'progreso_calculado',
    esCritico: 'es_critico', macrotareas: 'macrotareas',
    notasEditor: 'notas_editor', orden: 'orden',
  };
  const normalized = { ...changes };
  if (normalized.notasEditor !== undefined) normalized.notasEditor = s(normalized.notasEditor);
  if (normalized.macrotareas !== undefined) normalized.macrotareas = s(normalized.macrotareas);
  if (normalized.esCritico   !== undefined) normalized.esCritico   = normalized.esCritico ? 1 : 0;
  const { sets, params } = buildSetClause(FM, normalized);
  if (sets.length === 0) return getHito(id);
  params.push(id);
  db.prepare(`UPDATE hitos SET ${sets.join(', ')} WHERE id=?`).run(...params);
  return getHito(id);
}

async function deleteHito(id) {
  db.prepare('DELETE FROM hitos WHERE id=?').run(id);
}

async function getTareasByHito(hitoId) {
  return db.prepare('SELECT * FROM tareas WHERE hito_id=? ORDER BY fecha_creacion').all(hitoId).map(toTarea);
}

async function getTareasByProyecto(proyecto) {
  return db.prepare('SELECT * FROM tareas WHERE proyecto=? ORDER BY fecha_creacion').all(proyecto).map(toTarea);
}

async function recalcularProgresoHito(hitoId) {
  const hito   = await getHito(hitoId);
  if (!hito) return null;
  const tareas = await getTareasByHito(hitoId);
  const total  = tareas.length;
  const completadas = tareas.filter(t => t.estado === 'Completada').length;
  const progreso = total === 0 ? 0 : Math.round((completadas / total) * 100);
  const estado   = calcularEstadoHito(hito, tareas, progreso);
  await updateHito(hitoId, { progreso, estado });
  await touchMastersheet(hito.mastersheetId);
  return { progreso, estado };
}

function calcularEstadoHito(hito, tareas, progreso) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  if (progreso === 100 || hito.fechaReal) return 'completado';
  if (!hito.fechaObjetivo) return hito.estado === 'completado' ? 'completado' : 'pendiente';
  const fechaObj = new Date(hito.fechaObjetivo); fechaObj.setHours(0, 0, 0, 0);
  const diasRestantes = Math.round((fechaObj - hoy) / (1000 * 60 * 60 * 24));
  if (diasRestantes < 0) return 'retrasado';
  const tieneBloqueadas = tareas.some(t => t.estado === 'Bloqueada');
  if (diasRestantes <= 7  && progreso < 70) return 'en_riesgo';
  if (diasRestantes <= 14 && tieneBloqueadas) return 'en_riesgo';
  if (tareas.length === 0 && diasRestantes <= 30) return 'en_riesgo';
  if (progreso > 0) return 'en_curso';
  return 'pendiente';
}

// ============================================================================
// HITO PROPUESTAS
// ============================================================================

async function getHitoPropuestasByMastersheet(mastersheetId) {
  return db.prepare('SELECT * FROM hito_propuestas WHERE mastersheet_id=? ORDER BY creado_en DESC').all(mastersheetId).map(toHitoPropuesta);
}

async function getHitoPropuesta(id) {
  const r = db.prepare('SELECT * FROM hito_propuestas WHERE id=?').get(id);
  return r ? toHitoPropuesta(r) : null;
}

async function getPropuestasPendientesByHitoCampo(hitoId, tipoCambio) {
  return db.prepare("SELECT * FROM hito_propuestas WHERE hito_id=? AND tipo_cambio=? AND estado='pendiente'").all(hitoId, tipoCambio).map(toHitoPropuesta);
}

async function insertHitoPropuesta(p) {
  db.prepare(
    `INSERT INTO hito_propuestas (id,hito_id,mastersheet_id,proyecto,propuesto_por,tipo_cambio,valor_actual,valor_propuesto,justificacion,estado,creado_en)
     VALUES (?,?,?,?,?,?,?,?,?,'pendiente',?)`
  ).run(
    p.id, p.hitoId, p.mastersheetId, p.proyecto,
    p.propuestoPor, p.tipoCambio, p.valorActual || null,
    p.valorPropuesto, p.justificacion || '',
    p.creadoEn || new Date().toISOString()
  );
}

async function updateHitoPropuesta(id, changes) {
  const FM = { estado: 'estado', revisadoPor: 'revisado_por', revisadoEn: 'revisado_en', comentario: 'comentario' };
  const { sets, params } = buildSetClause(FM, changes);
  if (sets.length === 0) return getHitoPropuesta(id);
  params.push(id);
  db.prepare(`UPDATE hito_propuestas SET ${sets.join(', ')} WHERE id=?`).run(...params);
  return getHitoPropuesta(id);
}

// ============================================================================
// RESET TOKENS
// ============================================================================

async function addResetToken(email, token, expiresAt) {
  db.prepare(
    'INSERT INTO reset_tokens (email,token,expires_at) VALUES (?,?,?) ON CONFLICT(email) DO UPDATE SET token=excluded.token, expires_at=excluded.expires_at'
  ).run(email, token, expiresAt);
}

async function findResetToken(email, token) {
  const r = db.prepare('SELECT * FROM reset_tokens WHERE email=? AND token=?').get(email, token);
  if (!r) return null;
  if (new Date() > new Date(r.expires_at)) {
    db.prepare('DELETE FROM reset_tokens WHERE email=?').run(email);
    return null;
  }
  return { email: r.email, token: r.token, expiresAt: r.expires_at };
}

async function deleteResetToken(email) {
  db.prepare('DELETE FROM reset_tokens WHERE email=?').run(email);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  bcrypt,
  db,
  initSchema,
  findUsuario,
  getUsuariosActivos,
  updatePassword,
  updatePerfil,
  updateEquipoUsuario,
  updateEquiposUsuario,
  insertUsuario,
  updateUsuario,
  deleteUsuario,
  changeEmailUsuario,
  getSolicitudesPendientes,
  insertSolicitud,
  completarSolicitud,
  getSolicitudesEnviadas,
  getTareas,
  getTarea,
  getTareasConCosto,
  insertTarea,
  updateTarea,
  getReuniones,
  getReunion,
  insertReunion,
  updateReunion,
  storeGoogleTokens,
  getGoogleTokens,
  removeGoogleTokens,
  getProyectos,
  getNombresProyectos,
  findProyecto,
  insertProyecto,
  updateMiembrosProyecto,
  getAnuncios,
  insertAnuncio,
  deleteAnuncio,
  updateAnuncioImagen,
  insertAuditLog,
  getAuditLogs,
  getPresupuestos,
  getPresupuesto,
  insertPresupuesto,
  updatePresupuesto,
  getGastos,
  getGasto,
  insertGasto,
  updateGasto,
  getNotificaciones,
  insertNotificacion,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  getScrumProgramas,
  insertScrumPrograma,
  updateScrumPrograma,
  deleteScrumPrograma,
  getScrumSesiones,
  getScrumSesion,
  insertScrumSesion,
  agregarEventoScrumSesion,
  getTablets,
  getTablet,
  insertTablet,
  deleteTablet,
  getDocumentos,
  getDocumento,
  insertDocumento,
  deleteDocumento,
  getPrestamos,
  getPrestamo,
  insertPrestamo,
  updatePrestamo,
  addResetToken,
  findResetToken,
  deleteResetToken,
  getMastersheets,
  getMastersheet,
  getMastersheetByProyecto,
  insertMastersheet,
  updateMastersheetEditores,
  touchMastersheet,
  getHitosByMastersheet,
  getHitosByProyecto,
  getHito,
  insertHito,
  updateHito,
  deleteHito,
  getTareasByHito,
  getTareasByProyecto,
  recalcularProgresoHito,
  calcularEstadoHito,
  getHitoPropuestasByMastersheet,
  getHitoPropuesta,
  getPropuestasPendientesByHitoCampo,
  insertHitoPropuesta,
  updateHitoPropuesta,
};

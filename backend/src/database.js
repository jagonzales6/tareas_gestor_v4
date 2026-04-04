const { Pool } = require('pg');
const bcrypt    = require('bcryptjs');
const fs        = require('fs');
const path      = require('path');

// ============================================================================
// CONEXIÓN
// ============================================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 25,          // añadir esto
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
//const pool = new Pool({
//  connectionString: process.env.DATABASE_URL,
//  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
//});

// Inicializar esquema al arrancar
async function initSchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  await seedIfEmpty();
  console.log('\n📂 PostgreSQL conectado y esquema listo');
}

// ============================================================================
// MAPEADORES  (fila DB → objeto JS con camelCase)
// ============================================================================

function toUsuario(r) {
  return {
    email:               r.email,
    nombre:              r.nombre,
    password_hash:       r.password_hash,
    rol:                 r.rol,
    activo:              r.activo,
    departamento:        r.departamento  || '',
    proyecto:            r.proyecto      || null,
    supervisora:         r.supervisora   || null,
    equipo:              r.equipo        || null,
    equipos:             r.equipos       || [],
    esDirectiva:         r.es_directiva,
    esEncargadoRecursos: r.es_encargado_recursos,
    secciones:           r.secciones     || null,
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
    responsables:        r.responsables        || [],
    notas:               r.notas               || '',
    origenScrum:         r.origen_scrum,
    reunionOrigenId:     r.reunion_origen_id   || null,
    creadoPor:           r.creado_por,
    fechaCreacion:       r.fecha_creacion,
    evidencia:           r.evidencia           || null,
    ultimaActualizacion: r.ultima_actualizacion || null,
    hitoId:              r.hito_id             || null,
    esCritica:           r.es_critica          || false,
    macrotareaId:        r.macrotarea_id       || null,
    tieneCosto:          r.tiene_costo         || false,
    costoMonto:          r.costo_monto         != null ? Number(r.costo_monto) : null,
    costoDescripcion:    r.costo_descripcion   || '',
    comprobantes:        r.comprobantes        || [],
  };
}

function toMastersheet(r) {
  return {
    id:                  r.id,
    proyecto:            r.proyecto,
    editores:            r.editores            || [],
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
    fechaFin:             r.fecha_fin            || r.fecha_objetivo || null, // compat
    fechaReal:            r.fecha_real           || null,
    responsablePrincipal: r.responsable_principal || null,
    estado:               r.estado               || 'pendiente',
    progreso:             r.progreso_calculado   || 0,
    esCritico:            r.es_critico           || false,
    macrotareas:          r.macrotareas          || [],
    notasEditor:          r.notas_editor         || [],
    orden:                r.orden                || 0,
    creadoPor:            r.creado_por,
    creadoEn:             r.creado_en,
  };
}

function toHitoPropuesta(r) {
  return {
    id:              r.id,
    hitoId:          r.hito_id,
    mastersheetId:   r.mastersheet_id,
    proyecto:        r.proyecto,
    propuestoPor:    r.propuesto_por,
    tipoCambio:      r.tipo_cambio,
    valorActual:     r.valor_actual    || null,
    valorPropuesto:  r.valor_propuesto,
    justificacion:   r.justificacion   || '',
    estado:          r.estado          || 'pendiente',
    revisadoPor:     r.revisado_por    || null,
    revisadoEn:      r.revisado_en     || null,
    comentario:      r.comentario      || '',
    creadoEn:        r.creado_en,
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
    asistentes:       r.asistentes       || [],
    asistencias:      r.asistencias      || {},
    notas:            r.notas            || [],
    acta:             r.acta             || '',
    calendarEventIds: r.calendar_event_ids || {},
    creadoPor:        r.creado_por,
    fechaCreacion:    r.fecha_creacion,
  };
}

function toProyecto(r) {
  return {
    nombre:     r.nombre,
    descripcion: r.descripcion || '',
    miembros:   r.miembros    || [],
    creadoPor:  r.creado_por,
    createdAt:  r.created_at  || null,
  };
}

function toAnuncio(r) {
  return {
    id:        r.id,
    titulo:    r.titulo,
    contenido: r.contenido,
    importante: r.importante,
    autor:     r.autor,
    autorEmail: r.autor_email,
    fecha:     r.fecha     || null,
    creadoEn:  r.creado_en,
    imagen:    r.imagen    || null,
  };
}

function toPresupuesto(r) {
  return {
    id:               r.id,
    proyecto:         r.proyecto,
    mes:              r.mes,
    descripcion:      r.descripcion       || '',
    estado:           r.estado,
    items:            r.items             || [],
    totalSolicitado:  parseFloat(r.total_solicitado) || 0,
    respaldos:        r.respaldos         || [],
    comentarios:      r.comentarios       || [],
    creadoPor:        r.creado_por,
    creadoPorNombre:  r.creado_por_nombre || null,
    creadoEn:         r.creado_en,
    ultimaActualizacion: r.ultima_actualizacion || null,
    revisadoPor:      r.revisado_por      || null,
    revisadoEn:       r.revisado_en       || null,
    aprobadoPor:      r.aprobado_por      || null,
    aprobadoEn:       r.aprobado_en       || null,
    desembolsadoPor:  r.desembolsado_por  || null,
    desembolsadoEn:   r.desembolsado_en   || null,
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
    respaldos:        r.respaldos         || [],
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
    leida:     r.leida,
    creadaEn:  r.creada_en,
    referencia: r.referencia || null,
  };
}

function toScrumSesion(r) {
  return {
    id:                 r.id,
    reunionId:          r.reunion_id,
    titulo:             r.titulo,
    proyecto:           r.proyecto           || '',
    fecha:              r.fecha              || null,
    asistentes:         r.asistentes         || [],
    notas:              r.notas              || [],
    horaInicio:         r.hora_inicio        || null,
    horaFin:            r.hora_fin           || null,
    duracionSegundos:   r.duracion_segundos  || 0,
    duracionTexto:      r.duracion_texto     || '',
    tareasAsignadasIds: r.tareas_asignadas_ids || [],
    cerradoPor:         r.cerrado_por,
    cerradoPorNombre:   r.cerrado_por_nombre || null,
    cerradoEn:          r.cerrado_en,
    historial:          r.historial          || [],
  };
}

function toTablet(r) {
  return { id: r.id, nombre: r.nombre, descripcion: r.descripcion || '', activo: r.activo, creadoEn: r.creado_en };
}

function toDocumento(r) {
  return { id: r.id, carpetaId: r.carpeta_id, nombre: r.nombre, descripcion: r.descripcion || '', activo: r.activo, creadoEn: r.creado_en };
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
// HELPER: UPDATE DINÁMICO
// ============================================================================

function buildSetClause(fieldMap, changes) {
  const sets   = [];
  const params = [];
  let   i      = 1;
  for (const [key, val] of Object.entries(changes)) {
    const col = fieldMap[key];
    if (col !== undefined) {
      sets.push(`${col} = $${i++}`);
      params.push(val);
    }
  }
  return { sets, params, next: i };
}

// ============================================================================
// DATOS INICIALES
// ============================================================================

async function seedIfEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM usuarios');
  if (rows[0].n > 0) return;

  const hash = await bcrypt.hash('Nihr2026!', 10);
  const now  = new Date().toISOString();

  const usuarios = [
    { email: 'admin@unifranz.edu',                                           nombre: 'Admin System',                         rol: 'admin',                  departamento: 'Sistema',       proyecto: null, supervisora: null },
    { email: 'gerente@unifranz.edu',                                         nombre: 'Gerente del Proyecto',                 rol: 'gerente',                departamento: 'Dirección',      proyecto: null, supervisora: null },
    { email: 'pi@unifranz.edu',                                              nombre: 'PI - Investigador Principal',           rol: 'pi',                     departamento: 'Investigación',  proyecto: null, supervisora: null },
    { email: 'financiero@unifranz.edu',                                      nombre: 'Responsable Financiero',               rol: 'responsable_financiero', departamento: 'Finanzas',       proyecto: null, supervisora: null },
    { email: 'coordinadora@unifranz.edu',                                    nombre: 'Coordinadora de Investigación',        rol: 'coordinadora',           departamento: 'Coordinación',   proyecto: null, supervisora: null },
    { email: 'becaria1@unifranz.edu',                                        nombre: 'Becaria 1',                            rol: 'becaria',                departamento: 'Investigación',  proyecto: null, supervisora: null },
    { email: 'proyectoinvest.mauricioalejandro.baspineiro@unifranz.edu.bo',  nombre: 'Mauricio Alejandro Baspineiro Aguirre', rol: 'asistente',             departamento: 'Investigación',  proyecto: 'Trial 1: DIALOG+', supervisora: 'coordinadora@unifranz.edu' },
    { email: 'proyectoinvest.luisfelipe.osinaga@unifranz.edu.bo',            nombre: 'Luis Felipe Osinaga Robles',           rol: 'asistente',              departamento: 'Investigación',  proyecto: 'Trial 1: DIALOG+', supervisora: 'coordinadora@unifranz.edu' },
    { email: 'proyectoinvest.janethesther.calatayud@unifranz.edu.bo',        nombre: 'Janeth Esther Calatayud Padilla',      rol: 'asistente',              departamento: 'Investigación',  proyecto: 'Trial 1: DIALOG+', supervisora: 'coordinadora@unifranz.edu' },
    { email: 'proyectoinvest.jorgeignacio.antelo@unifranz.edu.bo',           nombre: 'Jorge Ignacio Antelo Gutiérrez',       rol: 'asistente',              departamento: 'Investigación',  proyecto: 'Trial 1: DIALOG+', supervisora: 'coordinadora@unifranz.edu' },
    { email: 'proyectoinvest.noeliaaida.castro@unifranz.edu.bo',             nombre: 'Noelia Aida Castro Guzmán',            rol: 'asistente',              departamento: 'Investigación',  proyecto: 'Trial 2: Multifamiliar', supervisora: 'coordinadora@unifranz.edu' },
    { email: 'proyectoinvest.joelangel.gonzales@unifranz.edu.bo',            nombre: 'Joel Ángel Gonzales Flores',           rol: 'admin',                  departamento: 'TI',             proyecto: null, supervisora: null },
  ];

  const ROLES_DIR = ['admin', 'gerente', 'pi', 'responsable_financiero', 'coordinadora'];

  for (const u of usuarios) {
    await pool.query(
      `INSERT INTO usuarios (email, nombre, password_hash, rol, activo, departamento, proyecto, supervisora, equipos, es_directiva, es_encargado_recursos)
       VALUES ($1,$2,$3,$4,true,$5,$6,$7,'[]',$8,false)`,
      [u.email, u.nombre, hash, u.rol, u.departamento, u.proyecto, u.supervisora, ROLES_DIR.includes(u.rol)]
    );
  }

  // Proyectos
  const proyectos = [
    { nombre: 'Trial 1: DIALOG+',          descripcion: 'RCT DIALOG - Estudio sobre intervenciones de diálogo',         miembros: ['proyectoinvest.mauricioalejandro.baspineiro@unifranz.edu.bo','proyectoinvest.luisfelipe.osinaga@unifranz.edu.bo','proyectoinvest.janethesther.calatayud@unifranz.edu.bo','proyectoinvest.jorgeignacio.antelo@unifranz.edu.bo','coordinadora@unifranz.edu','pi@unifranz.edu'], createdAt: '2026-01-01' },
    { nombre: 'Trial 2: Multifamiliar',    descripcion: 'IT MULTI - Intervención en contextos multifamiliares',          miembros: ['proyectoinvest.noeliaaida.castro@unifranz.edu.bo','coordinadora@unifranz.edu','pi@unifranz.edu'], createdAt: '2026-01-05' },
    { nombre: 'Actividades Transversales', descripcion: 'Actividades transversales de investigación y coordinación',      miembros: ['coordinadora@unifranz.edu','pi@unifranz.edu','financiero@unifranz.edu','gerente@unifranz.edu'], createdAt: '2026-01-10' },
  ];
  for (const p of proyectos) {
    await pool.query(
      'INSERT INTO proyectos (nombre, descripcion, miembros, creado_por, created_at) VALUES ($1,$2,$3,$4,$5)',
      [p.nombre, p.descripcion, p.miembros, 'admin@unifranz.edu', p.createdAt]
    );
  }

  // Tarea y reunión de demo
  await pool.query(
    `INSERT INTO tareas (id, proyecto, descripcion, estado, fecha_vencimiento, responsables, notas, origen_scrum, creado_por, fecha_creacion)
     VALUES ($1,$2,$3,'Pendiente','2026-04-15',$4,'Incluir feedback técnico',false,$5,$6)`,
    ['1', 'NIHR', 'Revisar documentación del proyecto', ['proyectoinvest.mauricioalejandro.baspineiro@unifranz.edu.bo'], 'admin@unifranz.edu', now]
  );
  await pool.query(
    `INSERT INTO reuniones (id, proyecto, descripcion, fecha, hora_inicio, hora_fin, asistentes, creado_por, fecha_creacion)
     VALUES ($1,'NIHR','Kick-off Meeting del Proyecto','2026-04-01','10:00','11:00',$2,$3,$4)`,
    ['1', ['coordinadora@unifranz.edu','pi@unifranz.edu'], 'admin@unifranz.edu', now]
  );

  // Tablets
  await pool.query(
    `INSERT INTO tablets (id, nombre, descripcion, activo, creado_en) VALUES
     ('TAB-001','Tablet Samsung Tab A8 #1','Tablet principal para trabajo de campo',true,$1),
     ('TAB-002','Tablet Samsung Tab A8 #2','Tablet de respaldo para entrevistas',true,$1)`,
    [now]
  );

  console.log('✅ Datos iniciales cargados. Contraseña: Nihr2026!');
}

// ============================================================================
// USUARIOS
// ============================================================================

async function findUsuario(email) {
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  return rows[0] ? toUsuario(rows[0]) : null;
}

async function getUsuariosActivos() {
  const { rows } = await pool.query(
    'SELECT email,nombre,rol,activo,departamento,proyecto,supervisora,equipo,equipos,es_directiva,es_encargado_recursos,secciones,telefono,cargo FROM usuarios WHERE activo = true'
  );
  return rows.map(r => ({ ...toUsuario(r), password_hash: undefined }));
}

async function updatePassword(email, nuevoHash) {
  await pool.query('UPDATE usuarios SET password_hash = $1 WHERE email = $2', [nuevoHash, email]);
}

async function updatePerfil(email, datos) {
  const FM = { nombre: 'nombre', telefono: 'telefono', cargo: 'cargo', departamento: 'departamento' };
  const { sets, params, next } = buildSetClause(FM, datos);
  if (sets.length === 0) return null;
  params.push(email);
  const { rows } = await pool.query(
    `UPDATE usuarios SET ${sets.join(', ')} WHERE email = $${next} RETURNING *`,
    params
  );
  if (!rows[0]) return null;
  const u = toUsuario(rows[0]);
  delete u.password_hash;
  return u;
}

async function updateEquipoUsuario(email, equipo) {
  const equipos = equipo ? [equipo] : [];
  const { rows } = await pool.query(
    'UPDATE usuarios SET equipo=$1, equipos=$2 WHERE email=$3 RETURNING *',
    [equipo || null, JSON.stringify(equipos), email]
  );
  if (!rows[0]) return null;
  const u = toUsuario(rows[0]); delete u.password_hash; return u;
}

async function updateEquiposUsuario(email, equipos) {
  const arr = Array.isArray(equipos) ? equipos : [];
  const { rows } = await pool.query(
    'UPDATE usuarios SET equipos=$1, equipo=$2 WHERE email=$3 RETURNING *',
    [JSON.stringify(arr), arr[0] || null, email]
  );
  if (!rows[0]) return null;
  const u = toUsuario(rows[0]); delete u.password_hash; return u;
}

async function insertUsuario(usuario) {
  const u = usuario;
  await pool.query(
    `INSERT INTO usuarios (email,nombre,password_hash,rol,activo,departamento,proyecto,supervisora,equipo,equipos,es_directiva,es_encargado_recursos,secciones,telefono,cargo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      u.email, u.nombre, u.password_hash, u.rol,
      u.activo !== undefined ? u.activo : true,
      u.departamento || '', u.proyecto || null, u.supervisora || null,
      u.equipo || null, JSON.stringify(u.equipos || []),
      u.esDirectiva || false, u.esEncargadoRecursos || false,
      u.secciones != null ? JSON.stringify(u.secciones) : null,
      u.telefono || '', u.cargo || ''
    ]
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
  if (normalized.equipos   !== undefined) normalized.equipos   = JSON.stringify(normalized.equipos);
  if (normalized.secciones !== undefined) normalized.secciones = normalized.secciones != null ? JSON.stringify(normalized.secciones) : null;
  const { sets, params, next } = buildSetClause(FM, normalized);
  if (sets.length === 0) return null;
  params.push(email);
  const { rows } = await pool.query(
    `UPDATE usuarios SET ${sets.join(', ')} WHERE email = $${next} RETURNING *`,
    params
  );
  if (!rows[0]) return null;
  const u = toUsuario(rows[0]); delete u.password_hash; return u;
}

async function deleteUsuario(email) {
  await pool.query('DELETE FROM usuarios WHERE email = $1', [email]);
}

async function changeEmailUsuario(oldEmail, newEmail) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: ur } = await client.query(
      'UPDATE usuarios SET email = $1 WHERE email = $2 RETURNING *', [newEmail, oldEmail]
    );
    if (!ur[0]) { await client.query('ROLLBACK'); return null; }

    // Referencias directas (columnas de texto)
    await client.query("UPDATE usuarios    SET supervisora = $1 WHERE supervisora = $2",   [newEmail, oldEmail]);
    await client.query("UPDATE tareas      SET creado_por  = $1 WHERE creado_por  = $2",   [newEmail, oldEmail]);
    await client.query("UPDATE reuniones   SET creado_por  = $1 WHERE creado_por  = $2",   [newEmail, oldEmail]);
    await client.query("UPDATE proyectos   SET creado_por  = $1 WHERE creado_por  = $2",   [newEmail, oldEmail]);
    await client.query("UPDATE prestamos   SET solicitante = $1 WHERE solicitante = $2",   [newEmail, oldEmail]);
    await client.query("UPDATE notificaciones SET para    = $1 WHERE para         = $2",   [newEmail, oldEmail]);
    await client.query("UPDATE solicitudes_actualizacion SET email_destino=$1 WHERE email_destino=$2", [newEmail, oldEmail]);

    // Arrays JSONB: tareas.responsables
    const { rows: tareasRef } = await client.query(
      "SELECT id, responsables FROM tareas WHERE responsables @> $1::jsonb", [JSON.stringify([oldEmail])]
    );
    for (const t of tareasRef) {
      const updated = (t.responsables || []).map(e => e === oldEmail ? newEmail : e);
      await client.query('UPDATE tareas SET responsables = $1 WHERE id = $2', [updated, t.id]);
    }

    // Arrays JSONB: reuniones.asistentes
    const { rows: reunRef } = await client.query(
      "SELECT id, asistentes FROM reuniones WHERE asistentes @> $1::jsonb", [JSON.stringify([oldEmail])]
    );
    for (const r of reunRef) {
      const updated = (r.asistentes || []).map(e => e === oldEmail ? newEmail : e);
      await client.query('UPDATE reuniones SET asistentes = $1 WHERE id = $2', [updated, r.id]);
    }

    // Arrays JSONB: proyectos.miembros
    const { rows: projRef } = await client.query(
      "SELECT nombre, miembros FROM proyectos WHERE miembros @> $1::jsonb", [JSON.stringify([oldEmail])]
    );
    for (const p of projRef) {
      const updated = (p.miembros || []).map(e => e === oldEmail ? newEmail : e);
      await client.query('UPDATE proyectos SET miembros = $1 WHERE nombre = $2', [updated, p.nombre]);
    }

    await client.query('COMMIT');
    const u = toUsuario(ur[0]); delete u.password_hash; return u;
  } catch (err) {
    await client.query('ROLLBACK'); throw err;
  } finally {
    client.release();
  }
}

// ============================================================================
// SOLICITUDES DE ACTUALIZACIÓN
// ============================================================================

async function getSolicitudesPendientes(emailDestino) {
  const { rows } = await pool.query(
    'SELECT * FROM solicitudes_actualizacion WHERE email_destino=$1 AND completada=false ORDER BY fecha',
    [emailDestino]
  );
  return rows.map(r => ({
    id: r.id, emailDestino: r.email_destino, enviadoPor: r.enviado_por,
    mensaje: r.mensaje, fecha: r.fecha, completada: r.completada, completadaEn: r.completada_en
  }));
}

async function insertSolicitud(s) {
  await pool.query(
    'INSERT INTO solicitudes_actualizacion (id,email_destino,enviado_por,mensaje,fecha,completada) VALUES ($1,$2,$3,$4,$5,false)',
    [s.id, s.emailDestino, s.enviadoPor || null, s.mensaje || '', s.fecha || new Date().toISOString()]
  );
}

async function completarSolicitud(id) {
  await pool.query(
    'UPDATE solicitudes_actualizacion SET completada=true, completada_en=$1 WHERE id=$2',
    [new Date().toISOString(), id]
  );
}

async function getSolicitudesEnviadas() {
  const { rows } = await pool.query(
    'SELECT * FROM solicitudes_actualizacion ORDER BY fecha DESC'
  );
  return rows.map(r => ({
    id: r.id, emailDestino: r.email_destino, enviadoPor: r.enviado_por,
    mensaje: r.mensaje, fecha: r.fecha, completada: r.completada, completadaEn: r.completada_en
  }));
}

// ============================================================================
// TAREAS
// ============================================================================

const DIAS_SIN_UPDATE = 5;

function diffDays(a, b) {
  if (!b) return DIAS_SIN_UPDATE; // sin fecha = siempre stale
  return Math.round((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24));
}

async function getTareas() {
  const { rows } = await pool.query('SELECT * FROM tareas ORDER BY fecha_creacion');
  const ahora = new Date();
  return rows.map(r => {
    const t = toTarea(r);
    const stale = t.estado !== 'Completada' && t.estado !== 'Cancelada' &&
                  diffDays(ahora, t.ultimaActualizacion) >= DIAS_SIN_UPDATE;
    return { ...t, esCritica: t.esCritica || stale };
  });
}

async function getTarea(id) {
  const { rows } = await pool.query('SELECT * FROM tareas WHERE id = $1', [id]);
  return rows[0] ? toTarea(rows[0]) : null;
}

async function getTareasConCosto() {
  const { rows } = await pool.query(
    'SELECT * FROM tareas WHERE tiene_costo = TRUE ORDER BY fecha_creacion DESC'
  );
  return rows.map(toTarea);
}

async function insertTarea(t) {
  await pool.query(
    `INSERT INTO tareas (id,proyecto,descripcion,estado,fecha_vencimiento,responsables,notas,origen_scrum,reunion_origen_id,creado_por,fecha_creacion,evidencia,ultima_actualizacion,hito_id,es_critica,macrotarea_id,tiene_costo,costo_monto,costo_descripcion,comprobantes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [
      t.id, t.proyecto, t.descripcion, t.estado || 'Pendiente',
      t.fechaVencimiento || null, JSON.stringify(t.responsables || []),
      t.notas || '', t.origenScrum || false, t.reunionOrigenId || null,
      t.creadoPor, t.fechaCreacion || new Date().toISOString(),
      t.evidencia != null ? JSON.stringify(t.evidencia) : null,
      t.ultimaActualizacion || null,
      t.hitoId || null,
      t.esCritica || false,
      t.macrotareaId || null,
      t.tieneCosto || false,
      t.costoMonto != null ? Number(t.costoMonto) : null,
      t.costoDescripcion || '',
      JSON.stringify(t.comprobantes || [])
    ]
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
  if (normalized.responsables  !== undefined) normalized.responsables  = JSON.stringify(normalized.responsables);
  if (normalized.evidencia      !== undefined) normalized.evidencia      = normalized.evidencia != null ? JSON.stringify(normalized.evidencia) : null;
  if (normalized.comprobantes   !== undefined) normalized.comprobantes   = JSON.stringify(normalized.comprobantes);
  const { sets, params, next } = buildSetClause(FM, normalized);
  if (sets.length === 0) return getTarea(id);
  params.push(id);
  const { rows } = await pool.query(
    `UPDATE tareas SET ${sets.join(', ')} WHERE id = $${next} RETURNING *`, params
  );
  return rows[0] ? toTarea(rows[0]) : null;
}

// ============================================================================
// REUNIONES
// ============================================================================

async function getReuniones() {
  const { rows } = await pool.query('SELECT * FROM reuniones ORDER BY fecha_creacion');
  return rows.map(toReunion);
}

async function getReunion(id) {
  const { rows } = await pool.query('SELECT * FROM reuniones WHERE id = $1', [id]);
  return rows[0] ? toReunion(rows[0]) : null;
}

async function insertReunion(r) {
  await pool.query(
    `INSERT INTO reuniones (id,tipo,modalidad,tipo_reunion,proyecto,descripcion,fecha,hora_inicio,hora_fin,enlace,asistentes,asistencias,notas,acta,calendar_event_ids,creado_por,fecha_creacion)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [
      r.id, r.tipo || 'nihr', r.modalidad || 'reunion', r.tipoReunion || 'especial',
      r.proyecto, r.descripcion, r.fecha || null,
      r.horaInicio || '', r.horaFin || '',
      r.enlace || '',
      JSON.stringify(r.asistentes || []),
      JSON.stringify(r.asistencias || {}),
      JSON.stringify(r.notas || []),
      r.acta || '',
      JSON.stringify(r.calendarEventIds || {}),
      r.creadoPor, r.fechaCreacion || new Date().toISOString()
    ]
  );
}

async function updateReunion(id, changes) {
  const FM = {
    notas: 'notas', acta: 'acta', asistencias: 'asistencias',
    calendarEventIds: 'calendar_event_ids', enlace: 'enlace',
  };
  const normalized = { ...changes };
  if (normalized.notas            !== undefined) normalized.notas            = JSON.stringify(normalized.notas);
  if (normalized.asistencias      !== undefined) normalized.asistencias      = JSON.stringify(normalized.asistencias);
  if (normalized.calendarEventIds !== undefined) normalized.calendarEventIds = JSON.stringify(normalized.calendarEventIds);
  const { sets, params, next } = buildSetClause(FM, normalized);
  if (sets.length === 0) return getReunion(id);
  params.push(id);
  const { rows } = await pool.query(
    `UPDATE reuniones SET ${sets.join(', ')} WHERE id = $${next} RETURNING *`, params
  );
  return rows[0] ? toReunion(rows[0]) : null;
}

// ============================================================================
// GOOGLE TOKENS
// ============================================================================

async function storeGoogleTokens(email, tokens) {
  await pool.query(
    'INSERT INTO google_tokens (email,tokens) VALUES ($1,$2) ON CONFLICT (email) DO UPDATE SET tokens=$2',
    [email, JSON.stringify(tokens)]
  );
}

async function getGoogleTokens(email) {
  const { rows } = await pool.query('SELECT tokens FROM google_tokens WHERE email=$1', [email]);
  return rows[0] ? rows[0].tokens : null;
}

async function removeGoogleTokens(email) {
  await pool.query('DELETE FROM google_tokens WHERE email=$1', [email]);
}

// ============================================================================
// PROYECTOS
// ============================================================================

async function getProyectos() {
  const { rows } = await pool.query('SELECT * FROM proyectos ORDER BY created_at');
  return rows.map(toProyecto);
}

async function getNombresProyectos() {
  const { rows } = await pool.query('SELECT nombre FROM proyectos ORDER BY created_at');
  return rows.map(r => r.nombre);
}

async function findProyecto(nombre) {
  const { rows } = await pool.query('SELECT * FROM proyectos WHERE nombre=$1', [nombre]);
  return rows[0] ? toProyecto(rows[0]) : null;
}

async function insertProyecto(p) {
  await pool.query(
    'INSERT INTO proyectos (nombre,descripcion,miembros,creado_por,created_at) VALUES ($1,$2,$3,$4,$5)',
    [p.nombre, p.descripcion || '', JSON.stringify(p.miembros || []), p.creadoPor, p.createdAt || new Date().toISOString().split('T')[0]]
  );
}

async function updateMiembrosProyecto(nombre, miembros) {
  const { rows } = await pool.query(
    'UPDATE proyectos SET miembros=$1 WHERE nombre=$2 RETURNING *', [JSON.stringify(miembros), nombre]
  );
  return rows[0] ? toProyecto(rows[0]) : null;
}

// ============================================================================
// ANUNCIOS
// ============================================================================

async function getAnuncios() {
  const { rows } = await pool.query('SELECT * FROM anuncios ORDER BY creado_en DESC');
  return rows.map(toAnuncio);
}

async function insertAnuncio(a) {
  await pool.query(
    'INSERT INTO anuncios (id,titulo,contenido,importante,autor,autor_email,fecha,creado_en,imagen) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [a.id, a.titulo, a.contenido, a.importante || false, a.autor, a.autorEmail, a.fecha || null, a.creadoEn || new Date().toISOString(), a.imagen != null ? JSON.stringify(a.imagen) : null]
  );
}

async function deleteAnuncio(id) {
  await pool.query('DELETE FROM anuncios WHERE id=$1', [id]);
}

async function updateAnuncioImagen(id, imagen) {
  const { rows } = await pool.query(
    'UPDATE anuncios SET imagen=$1 WHERE id=$2 RETURNING *', [imagen != null ? JSON.stringify(imagen) : null, id]
  );
  return rows[0] ? toAnuncio(rows[0]) : null;
}

// ============================================================================
// AUDITORÍA
// ============================================================================

async function insertAuditLog(entry) {
  // Mantener máximo 500 entradas (borrar las más antiguas si supera)
  await pool.query(
    'INSERT INTO auditoria (id,timestamp,usuario,accion,detalles) VALUES ($1,$2,$3,$4,$5)',
    [entry.id, entry.timestamp || new Date().toISOString(), entry.usuario, entry.accion, entry.detalles || '']
  );
  // Purgar exceso
  await pool.query(
    `DELETE FROM auditoria WHERE id IN (
      SELECT id FROM auditoria ORDER BY timestamp ASC
      OFFSET 500
    )`
  );
}

async function getAuditLogs(limit = 200) {
  const { rows } = await pool.query(
    'SELECT * FROM auditoria ORDER BY timestamp DESC LIMIT $1', [limit]
  );
  return rows.map(r => ({ id: r.id, timestamp: r.timestamp, usuario: r.usuario, accion: r.accion, detalles: r.detalles }));
}

// ============================================================================
// PRESUPUESTOS
// ============================================================================

async function getPresupuestos() {
  const { rows } = await pool.query('SELECT * FROM presupuestos ORDER BY creado_en');
  return rows.map(toPresupuesto);
}

async function getPresupuesto(id) {
  const { rows } = await pool.query('SELECT * FROM presupuestos WHERE id=$1', [id]);
  return rows[0] ? toPresupuesto(rows[0]) : null;
}

async function insertPresupuesto(p) {
  await pool.query(
    `INSERT INTO presupuestos (id,proyecto,mes,descripcion,estado,items,total_solicitado,respaldos,comentarios,creado_por,creado_por_nombre,creado_en)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      p.id, p.proyecto, p.mes, p.descripcion || '', p.estado || 'borrador',
      JSON.stringify(p.items || []), p.totalSolicitado || 0, JSON.stringify(p.respaldos || []), JSON.stringify(p.comentarios || []),
      p.creadoPor, p.creadoPorNombre || null, p.creadoEn || new Date().toISOString()
    ]
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
  if (normalized.respaldos   !== undefined) normalized.respaldos   = JSON.stringify(normalized.respaldos);
  if (normalized.comentarios !== undefined) normalized.comentarios = JSON.stringify(normalized.comentarios);
  const { sets, params, next } = buildSetClause(FM, normalized);
  if (sets.length === 0) return getPresupuesto(id);
  params.push(id);
  const { rows } = await pool.query(
    `UPDATE presupuestos SET ${sets.join(', ')} WHERE id=$${next} RETURNING *`, params
  );
  return rows[0] ? toPresupuesto(rows[0]) : null;
}

// ============================================================================
// GASTOS
// ============================================================================

async function getGastos() {
  const { rows } = await pool.query('SELECT * FROM gastos ORDER BY creado_en');
  return rows.map(toGasto);
}

async function getGasto(id) {
  const { rows } = await pool.query('SELECT * FROM gastos WHERE id=$1', [id]);
  return rows[0] ? toGasto(rows[0]) : null;
}

async function insertGasto(g) {
  await pool.query(
    `INSERT INTO gastos (id,presupuesto_id,tarea_id,proyecto,mes,rubro,descripcion,monto,responsable,responsable_nombre,estado,respaldos,creado_en)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      g.id, g.presupuestoId, g.tareaId || null, g.proyecto, g.mes,
      g.rubro, g.descripcion || '', g.monto, g.responsable,
      g.responsableNombre || null, g.estado || 'pendiente',
      JSON.stringify(g.respaldos || []), g.creadoEn || new Date().toISOString()
    ]
  );
}

async function updateGasto(id, changes) {
  const FM = {
    estado: 'estado', revisadoPor: 'revisado_por', revisadoEn: 'revisado_en',
    respaldos: 'respaldos',
  };
  const normalized = { ...changes };
  if (normalized.respaldos !== undefined) normalized.respaldos = JSON.stringify(normalized.respaldos);
  const { sets, params, next } = buildSetClause(FM, normalized);
  if (sets.length === 0) return getGasto(id);
  params.push(id);
  const { rows } = await pool.query(
    `UPDATE gastos SET ${sets.join(', ')} WHERE id=$${next} RETURNING *`, params
  );
  return rows[0] ? toGasto(rows[0]) : null;
}

// ============================================================================
// NOTIFICACIONES
// ============================================================================

async function getNotificaciones(emailPara) {
  const { rows } = await pool.query(
    'SELECT * FROM notificaciones WHERE para=$1 ORDER BY creada_en DESC LIMIT 100', [emailPara]
  );
  return rows.map(toNotificacion);
}

async function insertNotificacion(n) {
  await pool.query(
    'INSERT INTO notificaciones (id,para,tipo,titulo,mensaje,leida,creada_en,referencia) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [n.id, n.para, n.tipo, n.titulo || '', n.mensaje || '', false, n.creadaEn || new Date().toISOString(), n.referencia || null]
  );
  // Purgar exceso (máx 1000 por usuario)
  await pool.query(
    `DELETE FROM notificaciones WHERE id IN (
      SELECT id FROM notificaciones WHERE para=$1 ORDER BY creada_en ASC OFFSET 1000
    )`, [n.para]
  );
}

async function marcarNotificacionLeida(id, emailPara) {
  const { rows } = await pool.query(
    'UPDATE notificaciones SET leida=true WHERE id=$1 AND para=$2 RETURNING *', [id, emailPara]
  );
  return rows[0] ? toNotificacion(rows[0]) : null;
}

async function marcarTodasLeidas(emailPara) {
  await pool.query('UPDATE notificaciones SET leida=true WHERE para=$1', [emailPara]);
}

// ============================================================================
// SCRUM PROGRAMAS (recurrentes)
// ============================================================================

function toScrumPrograma(r) {
  return {
    id:          r.id,
    proyecto:    r.proyecto,
    frecuencia:  r.frecuencia,
    hora:        r.hora,
    asistentes:  r.asistentes  || [],
    activo:      r.activo,
    fechaInicio: r.fecha_inicio,
    creadoPor:   r.creado_por,
    creadoEn:    r.creado_en,
  };
}

async function getScrumProgramas() {
  const { rows } = await pool.query('SELECT * FROM scrum_programas ORDER BY creado_en DESC');
  return rows.map(toScrumPrograma);
}

async function insertScrumPrograma(p) {
  await pool.query(
    `INSERT INTO scrum_programas (id,proyecto,frecuencia,hora,asistentes,activo,fecha_inicio,creado_por,creado_en)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [p.id, p.proyecto, p.frecuencia, p.hora, JSON.stringify(p.asistentes || []),
     p.activo !== false, p.fechaInicio, p.creadoPor, p.creadoEn || new Date().toISOString()]
  );
}

async function updateScrumPrograma(id, changes) {
  const FM = { activo: 'activo', hora: 'hora', frecuencia: 'frecuencia', asistentes: 'asistentes' };
  const normalized = { ...changes };
  if (normalized.asistentes !== undefined) normalized.asistentes = JSON.stringify(normalized.asistentes);
  const { sets, params, next } = buildSetClause(FM, normalized);
  if (sets.length === 0) return null;
  params.push(id);
  await pool.query(`UPDATE scrum_programas SET ${sets.join(', ')} WHERE id=$${next}`, params);
}

async function deleteScrumPrograma(id) {
  await pool.query('DELETE FROM scrum_programas WHERE id=$1', [id]);
}

// ============================================================================
// SCRUM SESIONES
// ============================================================================

async function getScrumSesiones() {
  const { rows } = await pool.query('SELECT * FROM scrum_sesiones ORDER BY cerrado_en');
  return rows.map(toScrumSesion);
}

async function getScrumSesion(id) {
  const { rows } = await pool.query('SELECT * FROM scrum_sesiones WHERE id=$1', [id]);
  return rows[0] ? toScrumSesion(rows[0]) : null;
}

async function insertScrumSesion(s) {
  await pool.query(
    `INSERT INTO scrum_sesiones (id,reunion_id,titulo,proyecto,fecha,asistentes,notas,hora_inicio,hora_fin,duracion_segundos,duracion_texto,tareas_asignadas_ids,cerrado_por,cerrado_por_nombre,cerrado_en,historial)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
      s.id, s.reunionId, s.titulo, s.proyecto || '',
      s.fecha || null, JSON.stringify(s.asistentes || []), JSON.stringify(s.notas || []),
      s.horaInicio || null, s.horaFin || null,
      s.duracionSegundos || 0, s.duracionTexto || '',
      JSON.stringify(s.tareasAsignadasIds || []),
      s.cerradoPor, s.cerradoPorNombre || null,
      s.cerradoEn || new Date().toISOString(),
      JSON.stringify(s.historial || [])
    ]
  );
}

async function agregarEventoScrumSesion(id, evento) {
  const { rows } = await pool.query('SELECT historial FROM scrum_sesiones WHERE id=$1', [id]);
  if (!rows[0]) return null;
  const historial = [...(rows[0].historial || []), evento];
  const { rows: updated } = await pool.query(
    'UPDATE scrum_sesiones SET historial=$1 WHERE id=$2 RETURNING *', [JSON.stringify(historial), id]
  );
  return updated[0] ? toScrumSesion(updated[0]) : null;
}

// ============================================================================
// TABLETS
// ============================================================================

async function getTablets() {
  const { rows } = await pool.query('SELECT * FROM tablets ORDER BY creado_en');
  return rows.map(toTablet);
}

async function getTablet(id) {
  const { rows } = await pool.query('SELECT * FROM tablets WHERE id=$1', [id]);
  return rows[0] ? toTablet(rows[0]) : null;
}

async function insertTablet(t) {
  await pool.query(
    'INSERT INTO tablets (id,nombre,descripcion,activo,creado_en) VALUES ($1,$2,$3,$4,$5)',
    [t.id, t.nombre, t.descripcion || '', t.activo !== false, t.creadoEn || new Date().toISOString()]
  );
}

async function deleteTablet(id) {
  await pool.query('DELETE FROM tablets WHERE id=$1', [id]);
}

// ============================================================================
// DOCUMENTOS
// ============================================================================

async function getDocumentos() {
  const { rows } = await pool.query('SELECT * FROM documentos ORDER BY creado_en');
  return rows.map(toDocumento);
}

async function getDocumento(id) {
  const { rows } = await pool.query('SELECT * FROM documentos WHERE id=$1', [id]);
  return rows[0] ? toDocumento(rows[0]) : null;
}

async function insertDocumento(d) {
  await pool.query(
    'INSERT INTO documentos (id,carpeta_id,nombre,descripcion,activo,creado_en) VALUES ($1,$2,$3,$4,$5,$6)',
    [d.id, d.carpetaId, d.nombre, d.descripcion || '', d.activo !== false, d.creadoEn || new Date().toISOString()]
  );
}

async function deleteDocumento(id) {
  await pool.query('DELETE FROM documentos WHERE id=$1', [id]);
}

// ============================================================================
// PRÉSTAMOS
// ============================================================================

async function getPrestamos() {
  const { rows } = await pool.query('SELECT * FROM prestamos ORDER BY fecha_solicitud');
  return rows.map(toPrestamo);
}

async function getPrestamo(id) {
  const { rows } = await pool.query('SELECT * FROM prestamos WHERE id=$1', [id]);
  return rows[0] ? toPrestamo(rows[0]) : null;
}

async function insertPrestamo(p) {
  await pool.query(
    `INSERT INTO prestamos (id,tipo,recurso_id,recurso_nombre,solicitante,solicitante_nombre,motivo,estado,fecha_solicitud)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      p.id, p.tipo, p.recursoId, p.recursoNombre,
      p.solicitante, p.solicitanteNombre || null,
      p.motivo || '', p.estado || 'pendiente',
      p.fechaSolicitud || new Date().toISOString()
    ]
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
  const { sets, params, next } = buildSetClause(FM, changes);
  if (sets.length === 0) return getPrestamo(id);
  params.push(id);
  const { rows } = await pool.query(
    `UPDATE prestamos SET ${sets.join(', ')} WHERE id=$${next} RETURNING *`, params
  );
  return rows[0] ? toPrestamo(rows[0]) : null;
}

// ============================================================================
// MASTERSHEETS
// ============================================================================

async function getMastersheets() {
  const { rows } = await pool.query('SELECT * FROM mastersheets ORDER BY creado_en');
  return rows.map(toMastersheet);
}

async function getMastersheet(id) {
  const { rows } = await pool.query('SELECT * FROM mastersheets WHERE id=$1', [id]);
  return rows[0] ? toMastersheet(rows[0]) : null;
}

async function getMastersheetByProyecto(proyecto) {
  const { rows } = await pool.query('SELECT * FROM mastersheets WHERE proyecto=$1', [proyecto]);
  return rows[0] ? toMastersheet(rows[0]) : null;
}

async function insertMastersheet(m) {
  await pool.query(
    `INSERT INTO mastersheets (id,proyecto,editores,creado_por,creado_en,ultima_actualizacion)
     VALUES ($1,$2,$3,$4,$5,$5)`,
    [m.id, m.proyecto, JSON.stringify(m.editores || []), m.creadoPor, m.creadoEn || new Date().toISOString()]
  );
}

async function updateMastersheetEditores(id, editores) {
  const { rows } = await pool.query(
    'UPDATE mastersheets SET editores=$1, ultima_actualizacion=NOW() WHERE id=$2 RETURNING *',
    [JSON.stringify(editores), id]
  );
  return rows[0] ? toMastersheet(rows[0]) : null;
}

async function touchMastersheet(id) {
  await pool.query('UPDATE mastersheets SET ultima_actualizacion=NOW() WHERE id=$1', [id]);
}

// ============================================================================
// HITOS
// ============================================================================

async function getHitosByMastersheet(mastersheetId) {
  const { rows } = await pool.query(
    'SELECT * FROM hitos WHERE mastersheet_id=$1 ORDER BY orden ASC, creado_en ASC',
    [mastersheetId]
  );
  return rows.map(toHito);
}

async function getHitosByProyecto(proyecto) {
  const { rows } = await pool.query(
    'SELECT * FROM hitos WHERE proyecto=$1 ORDER BY orden ASC, creado_en ASC',
    [proyecto]
  );
  return rows.map(toHito);
}

async function getHito(id) {
  const { rows } = await pool.query('SELECT * FROM hitos WHERE id=$1', [id]);
  return rows[0] ? toHito(rows[0]) : null;
}

async function insertHito(h) {
  const fechaFin = h.fechaFin || null;
  await pool.query(
    `INSERT INTO hitos (id,mastersheet_id,proyecto,nombre,descripcion,fecha_inicio,fecha_fin,fecha_objetivo,fecha_real,responsable_principal,estado,progreso_calculado,es_critico,macrotareas,notas_editor,orden,creado_por,creado_en)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [
      h.id, h.mastersheetId, h.proyecto, h.nombre, h.descripcion || '',
      h.fechaInicio || null,
      fechaFin,
      fechaFin,           // fecha_objetivo = fecha_fin para compatibilidad
      h.fechaReal || null,
      h.responsablePrincipal || null,
      h.estado || 'pendiente', h.progreso || 0,
      h.esCritico || false,
      JSON.stringify(h.macrotareas || []),
      JSON.stringify(h.notasEditor || []),
      h.orden || 0, h.creadoPor, h.creadoEn || new Date().toISOString()
    ]
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
  if (normalized.notasEditor !== undefined) normalized.notasEditor = JSON.stringify(normalized.notasEditor);
  if (normalized.macrotareas !== undefined) normalized.macrotareas = JSON.stringify(normalized.macrotareas);
  const { sets, params, next } = buildSetClause(FM, normalized);
  if (sets.length === 0) return getHito(id);
  params.push(id);
  const { rows } = await pool.query(
    `UPDATE hitos SET ${sets.join(', ')} WHERE id=$${next} RETURNING *`, params
  );
  return rows[0] ? toHito(rows[0]) : null;
}

async function deleteHito(id) {
  await pool.query('DELETE FROM hitos WHERE id=$1', [id]);
}

async function getTareasByHito(hitoId) {
  const { rows } = await pool.query(
    'SELECT * FROM tareas WHERE hito_id=$1 ORDER BY fecha_creacion',
    [hitoId]
  );
  return rows.map(toTarea);
}

async function getTareasByProyecto(proyecto) {
  const { rows } = await pool.query(
    'SELECT * FROM tareas WHERE proyecto=$1 ORDER BY fecha_creacion',
    [proyecto]
  );
  return rows.map(toTarea);
}

// Recalcula progreso del hito a partir de sus tareas y devuelve el nuevo estado
async function recalcularProgresoHito(hitoId) {
  const hito = await getHito(hitoId);
  if (!hito) return null;
  const tareas = await getTareasByHito(hitoId);
  const total = tareas.length;
  const completadas = tareas.filter(t => t.estado === 'Completada').length;
  const progreso = total === 0 ? 0 : Math.round((completadas / total) * 100);
  const estado = calcularEstadoHito(hito, tareas, progreso);
  await updateHito(hitoId, { progreso, estado });
  await touchMastersheet(hito.mastersheetId);
  return { progreso, estado };
}

function calcularEstadoHito(hito, tareas, progreso) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (progreso === 100 || hito.fechaReal) return 'completado';
  if (!hito.fechaObjetivo) return hito.estado === 'completado' ? 'completado' : 'pendiente';
  const fechaObj = new Date(hito.fechaObjetivo);
  fechaObj.setHours(0, 0, 0, 0);
  const diasRestantes = Math.round((fechaObj - hoy) / (1000 * 60 * 60 * 24));
  if (diasRestantes < 0) return 'retrasado';
  const tieneBloqueadas = tareas.some(t => t.estado === 'Bloqueada');
  if (diasRestantes <= 7 && progreso < 70) return 'en_riesgo';
  if (diasRestantes <= 14 && tieneBloqueadas) return 'en_riesgo';
  if (tareas.length === 0 && diasRestantes <= 30) return 'en_riesgo';
  if (progreso > 0) return 'en_curso';
  return 'pendiente';
}

// ============================================================================
// HITO PROPUESTAS
// ============================================================================

async function getHitoPropuestasByMastersheet(mastersheetId) {
  const { rows } = await pool.query(
    'SELECT * FROM hito_propuestas WHERE mastersheet_id=$1 ORDER BY creado_en DESC',
    [mastersheetId]
  );
  return rows.map(toHitoPropuesta);
}

async function getHitoPropuesta(id) {
  const { rows } = await pool.query('SELECT * FROM hito_propuestas WHERE id=$1', [id]);
  return rows[0] ? toHitoPropuesta(rows[0]) : null;
}

async function getPropuestasPendientesByHitoCampo(hitoId, tipoCambio) {
  const { rows } = await pool.query(
    "SELECT * FROM hito_propuestas WHERE hito_id=$1 AND tipo_cambio=$2 AND estado='pendiente'",
    [hitoId, tipoCambio]
  );
  return rows.map(toHitoPropuesta);
}

async function insertHitoPropuesta(p) {
  await pool.query(
    `INSERT INTO hito_propuestas (id,hito_id,mastersheet_id,proyecto,propuesto_por,tipo_cambio,valor_actual,valor_propuesto,justificacion,estado,creado_en)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pendiente',$10)`,
    [
      p.id, p.hitoId, p.mastersheetId, p.proyecto,
      p.propuestoPor, p.tipoCambio, p.valorActual || null,
      p.valorPropuesto, p.justificacion || '',
      p.creadoEn || new Date().toISOString()
    ]
  );
}

async function updateHitoPropuesta(id, changes) {
  const FM = {
    estado: 'estado', revisadoPor: 'revisado_por',
    revisadoEn: 'revisado_en', comentario: 'comentario',
  };
  const { sets, params, next } = buildSetClause(FM, changes);
  if (sets.length === 0) return getHitoPropuesta(id);
  params.push(id);
  const { rows } = await pool.query(
    `UPDATE hito_propuestas SET ${sets.join(', ')} WHERE id=$${next} RETURNING *`, params
  );
  return rows[0] ? toHitoPropuesta(rows[0]) : null;
}

// ============================================================================
// RESET TOKENS
// ============================================================================

async function addResetToken(email, token, expiresAt) {
  await pool.query(
    'INSERT INTO reset_tokens (email,token,expires_at) VALUES ($1,$2,$3) ON CONFLICT (email) DO UPDATE SET token=$2, expires_at=$3',
    [email, token, expiresAt]
  );
}

async function findResetToken(email, token) {
  const { rows } = await pool.query(
    'SELECT * FROM reset_tokens WHERE email=$1 AND token=$2', [email, token]
  );
  if (!rows[0]) return null;
  if (new Date() > new Date(rows[0].expires_at)) {
    await pool.query('DELETE FROM reset_tokens WHERE email=$1', [email]);
    return null;
  }
  return { email: rows[0].email, token: rows[0].token, expiresAt: rows[0].expires_at };
}

async function deleteResetToken(email) {
  await pool.query('DELETE FROM reset_tokens WHERE email=$1', [email]);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  bcrypt,
  pool,
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

/**
 * migrate.js — Migra datos de gestor.json a PostgreSQL
 *
 * Uso:
 *   node src/migrate.js
 *
 * Requiere DATABASE_URL en .env (o variable de entorno).
 * Ejecutar UNA SOLA VEZ después de configurar PostgreSQL.
 */

require('dotenv').config();
const { Pool }  = require('pg');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'gestor.json');
const SCHEMA  = path.join(__dirname, 'schema.sql');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ No se encontró data/gestor.json. Nada que migrar.');
  process.exit(0);
}

const store = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const pool  = new Pool({ connectionString: process.env.DATABASE_URL });

// Helper: serializa valores JSONB explícitamente para pg
const j = (v) => v == null ? null : JSON.stringify(v);

async function run() {
  const client = await pool.connect();
  try {
    console.log('🔌 Conectado a PostgreSQL');

    // Crear tablas
    const sql = fs.readFileSync(SCHEMA, 'utf8');
    await client.query(sql);
    console.log('✅ Esquema creado/verificado');

    await client.query('BEGIN');

    // ---- USUARIOS ----
    const usuarios = store.usuarios || [];
    console.log(`\n→ Migrando ${usuarios.length} usuarios...`);
    for (const u of usuarios) {
      const ROLES_DIR = ['admin', 'gerente', 'pi', 'responsable_financiero', 'coordinadora'];
      const esDir = u.esDirectiva !== undefined ? u.esDirectiva : ROLES_DIR.includes(u.rol);
      await client.query(
        `INSERT INTO usuarios (email,nombre,password_hash,rol,activo,departamento,proyecto,supervisora,equipo,equipos,es_directiva,es_encargado_recursos,secciones,telefono,cargo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (email) DO UPDATE SET
           nombre=$2, password_hash=$3, rol=$4, activo=$5, departamento=$6,
           proyecto=$7, supervisora=$8, equipo=$9, equipos=$10,
           es_directiva=$11, es_encargado_recursos=$12, secciones=$13, telefono=$14, cargo=$15`,
        [
          u.email, u.nombre, u.password_hash, u.rol,
          u.activo !== false,
          u.departamento || '', u.proyecto || null, u.supervisora || null,
          u.equipo || null,
          j(Array.isArray(u.equipos) ? u.equipos : (u.equipo ? [u.equipo] : [])),
          esDir, !!u.esEncargadoRecursos,
          j(u.secciones || null),
          u.telefono || '', u.cargo || ''
        ]
      );
    }
    console.log(`   ✓ ${usuarios.length} usuarios migrados`);

    // ---- PROYECTOS ----
    const proyectos = store.proyectos || [];
    console.log(`→ Migrando ${proyectos.length} proyectos...`);
    for (const p of proyectos) {
      await client.query(
        `INSERT INTO proyectos (nombre,descripcion,miembros,creado_por,created_at)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (nombre) DO UPDATE SET descripcion=$2, miembros=$3, creado_por=$4, created_at=$5`,
        [p.nombre, p.descripcion || '', j(p.miembros || []), p.creadoPor || 'admin@unifranz.edu', p.createdAt || null]
      );
    }
    console.log(`   ✓ ${proyectos.length} proyectos migrados`);

    // ---- TAREAS ----
    const tareas = store.tareas || [];
    console.log(`→ Migrando ${tareas.length} tareas...`);
    for (const t of tareas) {
      await client.query(
        `INSERT INTO tareas (id,proyecto,descripcion,estado,fecha_vencimiento,responsables,notas,origen_scrum,reunion_origen_id,creado_por,fecha_creacion,evidencia,ultima_actualizacion)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO NOTHING`,
        [
          t.id, t.proyecto, t.descripcion, t.estado || 'Pendiente',
          t.fechaVencimiento || null,
          j(t.responsables || []),
          t.notas || '', t.origenScrum || false, t.reunionOrigenId || null,
          t.creadoPor, t.fechaCreacion || new Date().toISOString(),
          j(t.evidencia || null), t.ultimaActualizacion || null
        ]
      );
    }
    console.log(`   ✓ ${tareas.length} tareas migradas`);

    // ---- REUNIONES ----
    const reuniones = store.reuniones || [];
    console.log(`→ Migrando ${reuniones.length} reuniones...`);
    for (const r of reuniones) {
      await client.query(
        `INSERT INTO reuniones (id,tipo,modalidad,tipo_reunion,proyecto,descripcion,fecha,hora_inicio,hora_fin,asistentes,asistencias,notas,acta,calendar_event_ids,creado_por,fecha_creacion)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.id, r.tipo || 'nihr', r.modalidad || 'reunion', r.tipoReunion || 'especial',
          r.proyecto, r.descripcion, r.fecha || null,
          r.horaInicio || '', r.horaFin || '',
          j(r.asistentes || []), j(r.asistencias || {}),
          j(r.notas || []), r.acta || '',
          j(r.calendarEventIds || {}),
          r.creadoPor, r.fechaCreacion || new Date().toISOString()
        ]
      );
    }
    console.log(`   ✓ ${reuniones.length} reuniones migradas`);

    // ---- ANUNCIOS ----
    const anuncios = store.anuncios || [];
    console.log(`→ Migrando ${anuncios.length} anuncios...`);
    for (const a of anuncios) {
      await client.query(
        `INSERT INTO anuncios (id,titulo,contenido,importante,autor,autor_email,fecha,creado_en,imagen)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO NOTHING`,
        [
          a.id, a.titulo, a.contenido, !!a.importante,
          a.autor || '', a.autorEmail || a.autor || '',
          a.fecha || null, a.creadoEn || new Date().toISOString(),
          a.imagen || null
        ]
      );
    }
    console.log(`   ✓ ${anuncios.length} anuncios migrados`);

    // ---- AUDITORÍA ----
    const auditoria = store.auditoria || [];
    console.log(`→ Migrando ${auditoria.length} entradas de auditoría...`);
    for (const e of auditoria) {
      await client.query(
        `INSERT INTO auditoria (id,timestamp,usuario,accion,detalles)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO NOTHING`,
        [e.id, e.timestamp || new Date().toISOString(), e.usuario, e.accion, e.detalles || '']
      );
    }
    console.log(`   ✓ ${auditoria.length} entradas de auditoría migradas`);

    // ---- PRESUPUESTOS ----
    const presupuestos = store.presupuestos || [];
    console.log(`→ Migrando ${presupuestos.length} presupuestos...`);
    for (const p of presupuestos) {
      await client.query(
        `INSERT INTO presupuestos (id,proyecto,mes,descripcion,estado,items,total_solicitado,respaldos,comentarios,creado_por,creado_por_nombre,creado_en,ultima_actualizacion,revisado_por,revisado_en,aprobado_por,aprobado_en,desembolsado_por,desembolsado_en)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         ON CONFLICT (id) DO NOTHING`,
        [
          p.id, p.proyecto, p.mes, p.descripcion || '', p.estado || 'borrador',
          j(p.items || []), p.totalSolicitado || 0,
          j(p.respaldos || []), j(p.comentarios || []),
          p.creadoPor, p.creadoPorNombre || null,
          p.creadoEn || new Date().toISOString(),
          p.ultimaActualizacion || null,
          p.revisadoPor || null, p.revisadoEn || null,
          p.aprobadoPor || null, p.aprobadoEn || null,
          p.desembolsadoPor || null, p.desembolsadoEn || null
        ]
      );
    }
    console.log(`   ✓ ${presupuestos.length} presupuestos migrados`);

    // ---- GASTOS ----
    const gastos = store.gastos || [];
    console.log(`→ Migrando ${gastos.length} gastos...`);
    for (const g of gastos) {
      await client.query(
        `INSERT INTO gastos (id,presupuesto_id,tarea_id,proyecto,mes,rubro,descripcion,monto,responsable,responsable_nombre,estado,respaldos,creado_en,revisado_por,revisado_en)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (id) DO NOTHING`,
        [
          g.id, g.presupuestoId, g.tareaId || null,
          g.proyecto, g.mes, g.rubro, g.descripcion || '',
          g.monto, g.responsable, g.responsableNombre || null,
          g.estado || 'pendiente', j(g.respaldos || []),
          g.creadoEn || new Date().toISOString(),
          g.revisadoPor || null, g.revisadoEn || null
        ]
      );
    }
    console.log(`   ✓ ${gastos.length} gastos migrados`);

    // ---- NOTIFICACIONES ----
    const notificaciones = store.notificaciones || [];
    console.log(`→ Migrando ${notificaciones.length} notificaciones...`);
    for (const n of notificaciones) {
      await client.query(
        `INSERT INTO notificaciones (id,para,tipo,titulo,mensaje,leida,creada_en,referencia)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO NOTHING`,
        [
          n.id, n.para, n.tipo || 'info',
          n.titulo || n.asunto || '', n.mensaje || '',
          !!n.leida,
          n.creadaEn || n.creadoEn || new Date().toISOString(),
          j(n.referencia || null)
        ]
      );
    }
    console.log(`   ✓ ${notificaciones.length} notificaciones migradas`);

    // ---- SOLICITUDES ACTUALIZACIÓN ----
    const solicitudes = store.solicitudesActualizacion || [];
    console.log(`→ Migrando ${solicitudes.length} solicitudes de actualización...`);
    for (const s of solicitudes) {
      await client.query(
        `INSERT INTO solicitudes_actualizacion (id,email_destino,enviado_por,mensaje,fecha,completada,completada_en)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [
          s.id, s.emailDestino, s.enviadoPor || null,
          s.mensaje || '', s.fecha || new Date().toISOString(),
          !!s.completada, s.completadaEn || null
        ]
      );
    }
    console.log(`   ✓ ${solicitudes.length} solicitudes migradas`);

    // ---- SCRUM SESIONES ----
    const scrum = store.scrumSesiones || [];
    console.log(`→ Migrando ${scrum.length} sesiones SCRUM...`);
    for (const s of scrum) {
      await client.query(
        `INSERT INTO scrum_sesiones (id,reunion_id,titulo,proyecto,fecha,asistentes,notas,hora_inicio,hora_fin,duracion_segundos,duracion_texto,tareas_asignadas_ids,cerrado_por,cerrado_por_nombre,cerrado_en,historial)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING`,
        [
          s.id, s.reunionId, s.titulo, s.proyecto || '',
          s.fecha || null, j(s.asistentes || []), j(s.notas || []),
          s.horaInicio || null, s.horaFin || null,
          s.duracionSegundos || 0, s.duracionTexto || '',
          j(s.tareasAsignadasIds || []),
          s.cerradoPor, s.cerradoPorNombre || null,
          s.cerradoEn || new Date().toISOString(),
          j(s.historial || [])
        ]
      );
    }
    console.log(`   ✓ ${scrum.length} sesiones SCRUM migradas`);

    // ---- TABLETS ----
    const tablets = store.tablets || [];
    console.log(`→ Migrando ${tablets.length} tablets...`);
    for (const t of tablets) {
      await client.query(
        `INSERT INTO tablets (id,nombre,descripcion,activo,creado_en)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, t.nombre, t.descripcion || '', t.activo !== false, t.creadoEn || new Date().toISOString()]
      );
    }
    console.log(`   ✓ ${tablets.length} tablets migradas`);

    // ---- DOCUMENTOS ----
    const documentos = store.documentos || [];
    console.log(`→ Migrando ${documentos.length} documentos...`);
    for (const d of documentos) {
      await client.query(
        `INSERT INTO documentos (id,carpeta_id,nombre,descripcion,activo,creado_en)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        [d.id, d.carpetaId || '', d.nombre, d.descripcion || '', d.activo !== false, d.creadoEn || new Date().toISOString()]
      );
    }
    console.log(`   ✓ ${documentos.length} documentos migrados`);

    // ---- PRÉSTAMOS ----
    const prestamos = store.prestamos || [];
    console.log(`→ Migrando ${prestamos.length} préstamos...`);
    for (const p of prestamos) {
      await client.query(
        `INSERT INTO prestamos (id,tipo,recurso_id,recurso_nombre,solicitante,solicitante_nombre,motivo,estado,fecha_solicitud,encargado_entrega,encargado_entrega_nombre,fecha_entrega,detalles_entrega,encargado_devolucion,encargado_devolucion_nombre,fecha_devolucion,detalles_devolucion)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (id) DO NOTHING`,
        [
          p.id, p.tipo, p.recursoId, p.recursoNombre || p.recursoId,
          p.solicitante, p.solicitanteNombre || null,
          p.motivo || '', p.estado || 'pendiente',
          p.fechaSolicitud || new Date().toISOString(),
          p.encargadoEntrega || null, p.encargadoEntregaNombre || null,
          p.fechaEntrega || null, p.detallesEntrega || '',
          p.encargadoDevolucion || null, p.encargadoDevolucionNombre || null,
          p.fechaDevolucion || null, p.detallesDevolucion || ''
        ]
      );
    }
    console.log(`   ✓ ${prestamos.length} préstamos migrados`);

    // ---- GOOGLE TOKENS ----
    const googleTokens = store.googleTokens || {};
    const gtEntries = Object.entries(googleTokens);
    if (gtEntries.length > 0) {
      console.log(`→ Migrando ${gtEntries.length} tokens de Google...`);
      for (const [email, tokens] of gtEntries) {
        await client.query(
          `INSERT INTO google_tokens (email,tokens) VALUES ($1,$2)
           ON CONFLICT (email) DO UPDATE SET tokens=$2`,
          [email, j(tokens)]
        );
      }
      console.log(`   ✓ ${gtEntries.length} tokens migrados`);
    }

    // ---- RESET TOKENS ----
    const resetTokens = store.resetTokens || [];
    if (resetTokens.length > 0) {
      console.log(`→ Migrando ${resetTokens.length} reset tokens...`);
      for (const t of resetTokens) {
        await client.query(
          `INSERT INTO reset_tokens (email,token,expires_at) VALUES ($1,$2,$3)
           ON CONFLICT (email) DO UPDATE SET token=$2, expires_at=$3`,
          [t.email, t.token, t.expiresAt]
        );
      }
      console.log(`   ✓ ${resetTokens.length} reset tokens migrados`);
    }

    await client.query('COMMIT');
    console.log('\n🎉 Migración completada con éxito');
    console.log('   Puedes iniciar el servidor con: npm start');
    console.log('   Ya no se usará gestor.json — los datos están en PostgreSQL.\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error durante la migración:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();

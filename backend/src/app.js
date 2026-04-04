require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const session    = require('express-session');
const PgSession  = require('connect-pg-simple')(session);
const path       = require('path');
const fs         = require('fs');
const multer     = require('multer');

const {
  bcrypt,
  initSchema,
  findUsuario, getUsuariosActivos, updatePassword,
  getTareas, getTarea, getTareasConCosto, insertTarea, updateTarea,
  getTareasByHito, getTareasByProyecto,
  getReuniones, getReunion, insertReunion, updateReunion,
  getProyectos, getNombresProyectos, findProyecto, insertProyecto, updateMiembrosProyecto,
  insertAuditLog, getAuditLogs,
  getAnuncios, insertAnuncio, deleteAnuncio,
  storeGoogleTokens, getGoogleTokens, removeGoogleTokens,
  updatePerfil, updateEquipoUsuario, updateEquiposUsuario,
  getSolicitudesPendientes, insertSolicitud, completarSolicitud, getSolicitudesEnviadas,
  updateAnuncioImagen,
  getPresupuestos, getPresupuesto, insertPresupuesto, updatePresupuesto,
  getGastos, getGasto, insertGasto, updateGasto,
  getNotificaciones, insertNotificacion, marcarNotificacionLeida, marcarTodasLeidas,
  getScrumProgramas, insertScrumPrograma, updateScrumPrograma, deleteScrumPrograma,
  getScrumSesiones, getScrumSesion, insertScrumSesion, agregarEventoScrumSesion,
  insertUsuario, updateUsuario, deleteUsuario, changeEmailUsuario,
  getTablets, getTablet, insertTablet, deleteTablet,
  getDocumentos, getDocumento, insertDocumento, deleteDocumento,
  getPrestamos, getPrestamo, insertPrestamo, updatePrestamo,
  addResetToken, findResetToken, deleteResetToken,
  getMastersheetByProyecto, insertMastersheet, updateMastersheetEditores,
  getHitosByMastersheet, getHitosByProyecto, getHito, insertHito, updateHito, deleteHito,
  recalcularProgresoHito,
  getHitoPropuestasByMastersheet, getHitoPropuesta,
  getPropuestasPendientesByHitoCampo, insertHitoPropuesta, updateHitoPropuesta,
} = require('./database');

// ============================================================================
// MULTER — SUBIDA DE EVIDENCIAS
// ============================================================================

const UPLOADS_DIR            = path.join(__dirname, '..', '..', 'data', 'uploads', 'evidencias');
const UPLOADS_ANUNCIOS       = path.join(__dirname, '..', '..', 'data', 'uploads', 'anuncios');
const UPLOADS_PRESUPUESTOS   = path.join(__dirname, '..', '..', 'data', 'uploads', 'presupuestos');
const UPLOADS_COMPROBANTES   = path.join(__dirname, '..', '..', 'data', 'uploads', 'comprobantes');
if (!fs.existsSync(UPLOADS_DIR))            fs.mkdirSync(UPLOADS_DIR,            { recursive: true });
if (!fs.existsSync(UPLOADS_ANUNCIOS))       fs.mkdirSync(UPLOADS_ANUNCIOS,       { recursive: true });
if (!fs.existsSync(UPLOADS_PRESUPUESTOS))   fs.mkdirSync(UPLOADS_PRESUPUESTOS,   { recursive: true });
if (!fs.existsSync(UPLOADS_COMPROBANTES))   fs.mkdirSync(UPLOADS_COMPROBANTES,   { recursive: true });

function makeStorage(dir) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    }
  });
}

const uploadMiddleware = multer({
  storage: makeStorage(UPLOADS_DIR),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.docx', '.xlsx', '.txt', '.zip'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido'));
  }
});

const uploadImagen = multer({
  storage: makeStorage(UPLOADS_ANUNCIOS),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Solo se permiten imágenes (JPG, PNG, GIF, WebP)'));
  }
});

const uploadPresupuesto = multer({
  storage: makeStorage(UPLOADS_PRESUPUESTOS),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.docx', '.xlsx', '.txt', '.zip'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido'));
  }
});

const uploadComprobante = multer({
  storage: makeStorage(UPLOADS_COMPROBANTES),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.docx', '.xlsx', '.txt', '.zip'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido'));
  }
});

// ============================================================================
// CONSTANTES DE ROLES
// ============================================================================

const ROLES_DIRECTIVA = ['admin', 'gerente', 'pi', 'responsable_financiero', 'coordinadora'];

// ============================================================================
// GOOGLE OAUTH2 SETUP
// ============================================================================

let oauth2Client = null;
const GOOGLE_CONFIGURED = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);

if (GOOGLE_CONFIGURED) {
  const { google } = require('googleapis');
  oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  console.log('✅ Google OAuth2 configurado');
} else {
  console.log('ℹ️  Google Calendar no configurado (falta GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI en .env)');
}

async function sincronizarEventoCalendar(emailUsuario, reunion) {
  if (!oauth2Client) return null;
  const tokens = await getGoogleTokens(emailUsuario);
  if (!tokens) return null;
  try {
    const { google } = require('googleapis');
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    auth.setCredentials(tokens);
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      const { credentials } = await auth.refreshAccessToken();
      await storeGoogleTokens(emailUsuario, credentials);
      auth.setCredentials(credentials);
    }
    const calendar = google.calendar({ version: 'v3', auth });
    const fechaBase = reunion.fecha || new Date().toISOString().split('T')[0];
    const inicio = reunion.horaInicio
      ? new Date(`${fechaBase}T${reunion.horaInicio}:00`)
      : new Date(`${fechaBase}T09:00:00`);
    const fin = reunion.horaFin
      ? new Date(`${fechaBase}T${reunion.horaFin}:00`)
      : new Date(inicio.getTime() + 60 * 60 * 1000);
    const evento = {
      summary: `[NIHR] ${reunion.descripcion}`,
      description: `Proyecto: ${reunion.proyecto}\nReunión del Centro NIHR LatAm`,
      start: { dateTime: inicio.toISOString(), timeZone: 'America/La_Paz' },
      end:   { dateTime: fin.toISOString(),    timeZone: 'America/La_Paz' },
      colorId: '2',
    };
    const res = await calendar.events.insert({ calendarId: 'primary', resource: evento });
    return res.data.id;
  } catch (err) {
    console.error(`Error sincronizando calendario de ${emailUsuario}:`, err.message);
    return null;
  }
}

const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const isLocal = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
    callback(isLocal ? null : new Error('CORS bloqueado'), isLocal);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../../data/uploads')));

app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'cambiar-este-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, sameSite: 'lax', httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }
}));

// ============================================================================
// AUDITORÍA (fire-and-forget para no bloquear respuestas)
// ============================================================================

const addAuditLog = (usuario, accion, detalles) => {
  insertAuditLog({ id: Date.now().toString(), timestamp: new Date().toISOString(), usuario, accion, detalles })
    .catch(err => console.error('Audit log error:', err.message));
};

// ============================================================================
// HEALTH
// ============================================================================

app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// ============================================================================
// AUTENTICACIÓN
// ============================================================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const user = await findUsuario(email);
    if (!user || !user.activo) return res.status(401).json({ error: 'Email o contraseña incorrectos' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Email o contraseña incorrectos' });

    const usuario = {
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      equipo: user.equipo || null,
      equipos: Array.isArray(user.equipos) ? user.equipos : (user.equipo ? [user.equipo] : []),
      esDirectiva: user.esDirectiva !== undefined ? !!user.esDirectiva : ROLES_DIRECTIVA.includes(user.rol),
      esEncargadoRecursos: !!user.esEncargadoRecursos,
      secciones: user.secciones || null,
      loginTime: new Date().toISOString(),
    };
    req.session.user = usuario;
    addAuditLog(email, 'Login', `Sesión iniciada como ${user.rol}`);

    res.json({ success: true, user: usuario, message: `Bienvenido ${user.nombre}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/logout', (req, res) => {
  if (req.session.user) addAuditLog(req.session.user.email, 'Logout', 'Sesión cerrada');
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
  res.json(req.session.user);
});

app.post('/api/auth/cambiar-password', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const { passwordActual, passwordNuevo } = req.body;
    if (!passwordActual || !passwordNuevo) return res.status(400).json({ error: 'Completa ambas contraseñas' });
    if (passwordNuevo.length < 8) return res.status(400).json({ error: 'Mínimo 8 caracteres' });

    const user = await findUsuario(req.session.user.email);
    const valid = await bcrypt.compare(passwordActual, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    await updatePassword(req.session.user.email, await bcrypt.hash(passwordNuevo, 10));
    addAuditLog(req.session.user.email, 'Cambio Contraseña', 'Contraseña actualizada');
    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/solicitar-recuperacion', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    const user = await findUsuario(email.toLowerCase().trim());
    if (!user || !user.activo) {
      return res.json({ success: true, message: 'Si el correo está registrado, recibirás un código.' });
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await addResetToken(user.email, codigo, expiresAt);
    addAuditLog(user.email, 'Solicitud Recuperación', 'Código de recuperación generado');

    res.json({ success: true, codigo, nombre: user.nombre });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/confirmar-recuperacion', async (req, res) => {
  try {
    const { email, codigo, passwordNuevo } = req.body;
    if (!email || !codigo || !passwordNuevo) return res.status(400).json({ error: 'Todos los campos son requeridos' });
    if (passwordNuevo.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

    const tokenRecord = await findResetToken(email.toLowerCase().trim(), codigo.trim());
    if (!tokenRecord) return res.status(400).json({ error: 'Código inválido o expirado' });

    await updatePassword(email.toLowerCase().trim(), await bcrypt.hash(passwordNuevo, 10));
    await deleteResetToken(email.toLowerCase().trim());
    addAuditLog(email, 'Recuperación Contraseña', 'Contraseña recuperada exitosamente');

    res.json({ success: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (req.session.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede resetear contraseñas' });

    const { email, passwordNuevo } = req.body;
    if (!email || !passwordNuevo) return res.status(400).json({ error: 'Email y nueva contraseña requeridos' });
    if (passwordNuevo.length < 8) return res.status(400).json({ error: 'Mínimo 8 caracteres' });

    if (!await findUsuario(email)) return res.status(404).json({ error: 'Usuario no encontrado' });

    await updatePassword(email, await bcrypt.hash(passwordNuevo, 10));
    addAuditLog(req.session.user.email, 'Reset Contraseña', `Contraseña reseteada para ${email}`);
    res.json({ success: true, message: `Contraseña de ${email} actualizada` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Subir evidencia a una tarea
app.post('/api/tareas/:id/evidencia', uploadMiddleware.single('evidencia'), async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const tarea = await getTarea(req.params.id);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

    const esResponsable = tarea.responsables.includes(req.session.user.email);
    const esAdmin = ['admin', 'gerente', 'coordinadora', 'pi'].includes(req.session.user.rol);
    if (!esResponsable && !esAdmin) return res.status(403).json({ error: 'Sin permiso para esta tarea' });

    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    if (tarea.evidencia?.archivo) {
      const rutaAnterior = path.join(UPLOADS_DIR, tarea.evidencia.archivo);
      if (fs.existsSync(rutaAnterior)) fs.unlinkSync(rutaAnterior);
    }

    const evidencia = {
      nombre: req.file.originalname,
      archivo: req.file.filename,
      url: `/uploads/evidencias/${req.file.filename}`,
      subidoPor: req.session.user.email,
      subidoPorNombre: req.session.user.nombre,
      fecha: new Date().toISOString()
    };

    const actualizada = await updateTarea(req.params.id, { evidencia, ultimaActualizacion: new Date().toISOString() });
    addAuditLog(req.session.user.email, 'Subir Evidencia', `Tarea "${tarea.descripcion}" → ${req.file.originalname}`);
    res.json({ success: true, evidencia, tarea: actualizada });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar evidencia de una tarea
app.delete('/api/tareas/:id/evidencia', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const tarea = await getTarea(req.params.id);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

    const esResponsable = tarea.responsables.includes(req.session.user.email);
    const esAdmin = ['admin', 'gerente', 'coordinadora', 'pi'].includes(req.session.user.rol);
    if (!esResponsable && !esAdmin) return res.status(403).json({ error: 'Sin permiso para esta tarea' });

    if (tarea.evidencia?.archivo) {
      const ruta = path.join(UPLOADS_DIR, tarea.evidencia.archivo);
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    }

    const actualizada = await updateTarea(req.params.id, { evidencia: null, ultimaActualizacion: new Date().toISOString() });
    addAuditLog(req.session.user.email, 'Eliminar Evidencia', `Tarea "${tarea.descripcion}"`);
    res.json({ success: true, tarea: actualizada });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GOOGLE CALENDAR
// ============================================================================

app.get('/api/google/status', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
  if (!GOOGLE_CONFIGURED) return res.json({ configurado: false, conectado: false });
  const tokens = await getGoogleTokens(req.session.user.email);
  res.json({ configurado: true, conectado: !!tokens });
});

app.get('/api/google/auth-url', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
  if (!GOOGLE_CONFIGURED || !oauth2Client) return res.status(503).json({ error: 'Google Calendar no configurado en el servidor' });
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: req.session.user.email,
  });
  res.json({ url });
});

app.get('/api/google/callback', async (req, res) => {
  const { code, state: email, error } = req.query;
  if (error || !code || !email) {
    return res.redirect('/?gc=error');
  }
  try {
    const { tokens } = await oauth2Client.getToken(code);
    await storeGoogleTokens(email, tokens);
    addAuditLog(email, 'Google Calendar', 'Cuenta Google conectada');
    res.redirect('/?gc=1');
  } catch (err) {
    console.error('Error en callback Google:', err.message);
    res.redirect('/?gc=error');
  }
});

app.delete('/api/google/disconnect', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
  await removeGoogleTokens(req.session.user.email);
  addAuditLog(req.session.user.email, 'Google Calendar', 'Cuenta Google desconectada');
  res.json({ success: true });
});

// ============================================================================
// TAREAS
// ============================================================================

app.get('/api/tareas/con-costo', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (!['admin', 'gerente', 'pi', 'responsable_financiero'].includes(req.session.user.rol)) {
      return res.status(403).json({ error: 'Solo finanzas puede ver este reporte' });
    }
    const tareas = await getTareasConCosto();
    res.json(tareas);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/tareas', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const todas = await getTareas();
    const esAdmin = ['admin', 'gerente', 'pi'].includes(req.session.user.rol);
    const resultado = esAdmin ? todas : todas.filter(t => t.responsables.includes(req.session.user.email));
    res.json(resultado);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tareas', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const { proyecto, descripcion, fechaVencimiento, responsables, notas, origenScrum, reunionOrigenId, hitoId, macrotareaId, tieneCosto, costoMonto, costoDescripcion } = req.body;
    if (!proyecto || !descripcion || !responsables || responsables.length === 0) {
      return res.status(400).json({ error: 'Completa: proyecto, descripción y responsables' });
    }
    const esSupervisor = ['admin', 'gerente', 'coordinadora', 'pi'].includes(req.session.user.rol);
    if (!esSupervisor && !origenScrum) {
      if (!responsables.includes(req.session.user.email)) {
        return res.status(403).json({ error: 'Debes incluirte como responsable de la tarea' });
      }
    }
    if (!esSupervisor && origenScrum) {
      const reunion = reunionOrigenId ? await getReunion(reunionOrigenId) : null;
      if (reunion && !reunion.asistentes.includes(req.session.user.email)) {
        return res.status(403).json({ error: 'No eres asistente de esa reunión SCRUM' });
      }
    }
    // Prioridad: heredar criticidad del hito si aplica
    let esCritica = false;
    if (hitoId) {
      const hito = await getHito(hitoId);
      if (hito && hito.esCritico) esCritica = true;
    }
    const accion = origenScrum ? 'Crear Tarea (SCRUM)' : 'Crear Tarea';
    const nuevaTarea = {
      id: Date.now().toString(),
      proyecto, descripcion,
      estado: 'Pendiente',
      fechaVencimiento: fechaVencimiento || null,
      responsables,
      notas: notas || '',
      origenScrum: origenScrum || false,
      reunionOrigenId: reunionOrigenId || null,
      hitoId: hitoId || null,
      macrotareaId: macrotareaId || null,
      esCritica,
      tieneCosto: tieneCosto || false,
      costoMonto: tieneCosto && costoMonto ? Number(costoMonto) : null,
      costoDescripcion: costoDescripcion || '',
      comprobantes: [],
      creadoPor: req.session.user.email,
      fechaCreacion: new Date().toISOString()
    };
    await insertTarea(nuevaTarea);
    if (hitoId) await recalcularProgresoHito(hitoId);
    addAuditLog(req.session.user.email, accion, `"${descripcion}" → ${responsables.join(', ')}`);
    res.json(nuevaTarea);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/tareas/:id', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const tarea = await getTarea(req.params.id);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

    const esResponsable = tarea.responsables.includes(req.session.user.email);
    const esAdmin = ['admin', 'gerente', 'coordinadora', 'pi'].includes(req.session.user.rol);
    if (!esResponsable && !esAdmin) return res.status(403).json({ error: 'Sin permiso para editar esta tarea' });

    const { estado, notas, tieneCosto, costoMonto, costoDescripcion } = req.body;
    const cambios = { ultimaActualizacion: new Date().toISOString() };
    if (estado) { cambios.estado = estado; addAuditLog(req.session.user.email, 'Actualizar Tarea', `"${tarea.descripcion}" → ${estado}`); }
    if (notas !== undefined) cambios.notas = notas;
    if (tieneCosto !== undefined) {
      cambios.tieneCosto = tieneCosto;
      cambios.costoMonto = tieneCosto && costoMonto ? Number(costoMonto) : null;
      cambios.costoDescripcion = costoDescripcion || '';
      if (tieneCosto) addAuditLog(req.session.user.email, 'Registrar Costo Tarea', `"${tarea.descripcion}" — Bs ${costoMonto}`);
    }

    const actualizada = await updateTarea(req.params.id, cambios);
    // Recalcular progreso del hito si la tarea está vinculada a uno
    if (estado && tarea.hitoId) await recalcularProgresoHito(tarea.hitoId);
    res.json({ success: true, tarea: actualizada });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// REUNIONES
// ============================================================================

app.get('/api/reuniones', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const todas = await getReuniones();
    const esAdmin = ['admin', 'gerente'].includes(req.session.user.rol);
    const resultado = esAdmin ? todas : todas.filter(r => r.asistentes.includes(req.session.user.email));
    res.json(resultado);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reuniones', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });

    const esOrganizador = ['admin', 'gerente', 'coordinadora', 'pi'].includes(req.session.user.rol);
    const { proyecto, descripcion, fecha, horaInicio, horaFin, asistentes, tipo, modalidad, tipoReunion } = req.body;

    const esPersonal = tipo === 'personal';
    const esScrum    = modalidad === 'scrum';

    // Miembros de proyecto pueden crear SCRUMs para sus propios proyectos
    if (!esOrganizador && !esPersonal && esScrum && proyecto) {
      const proyectoObj = await findProyecto(proyecto);
      if (!proyectoObj || !proyectoObj.miembros.includes(req.session.user.email)) {
        return res.status(403).json({ error: 'Solo los miembros del proyecto pueden crear SCRUMs' });
      }
    } else if (!esOrganizador && !esPersonal && !esScrum) {
      return res.status(403).json({ error: 'No tienes permiso para crear reuniones NIHR' });
    }

    if (!descripcion) return res.status(400).json({ error: 'La descripción es requerida' });
    if (!esPersonal && (!proyecto || !asistentes || asistentes.length === 0)) {
      return res.status(400).json({ error: 'Completa: proyecto, descripción y asistentes' });
    }

    // Para reuniones personales: siempre incluir al creador + los compañeros seleccionados
    const asistentesFinales = esPersonal
      ? [...new Set([req.session.user.email, ...(Array.isArray(asistentes) ? asistentes : [])])]
      : asistentes;

    const nueva = {
      id: Date.now().toString(),
      tipo: esPersonal ? 'personal' : 'nihr',
      modalidad: modalidad || 'reunion',
      tipoReunion: tipoReunion || 'especial',
      proyecto: proyecto || 'Personal',
      descripcion,
      fecha: fecha || null,
      horaInicio: horaInicio || '',
      horaFin: horaFin || '',
      asistentes: asistentesFinales,
      asistencias: {},
      notas: [],
      acta: '',
      calendarEventIds: {},
      creadoPor: req.session.user.email,
      fechaCreacion: new Date().toISOString()
    };
    await insertReunion(nueva);
    addAuditLog(req.session.user.email, esPersonal ? 'Registrar Reunión Personal' : 'Crear Reunión', `"${descripcion}"`);

    if (GOOGLE_CONFIGURED) {
      for (const email of asistentesFinales) {
        const eventId = await sincronizarEventoCalendar(email, nueva);
        if (eventId) nueva.calendarEventIds[email] = eventId;
      }
      if (Object.keys(nueva.calendarEventIds).length > 0) {
        await updateReunion(nueva.id, { calendarEventIds: nueva.calendarEventIds });
      }
    }

    res.json(nueva);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reuniones/:id/nota', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const reunion = await getReunion(req.params.id);
    if (!reunion) return res.status(404).json({ error: 'Reunión no encontrada' });

    const { texto, tipo } = req.body;
    if (!texto || !texto.trim()) return res.status(400).json({ error: 'El texto es requerido' });
    const tiposValidos = ['nota', 'tarea', 'decision', 'bloqueo'];
    if (tipo && !tiposValidos.includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });

    const nuevaNota = {
      id: Date.now().toString(),
      texto: texto.trim(),
      tipo: tipo || 'nota',
      autor: req.session.user.email,
      autorNombre: req.session.user.nombre || req.session.user.email,
      fecha: new Date().toISOString()
    };
    const notasActuales = Array.isArray(reunion.notas) ? reunion.notas : [];
    const actualizada = await updateReunion(req.params.id, { notas: [...notasActuales, nuevaNota] });
    res.json({ success: true, nota: nuevaNota, reunion: actualizada });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/reuniones/:id/nota/:notaId', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const reunion = await getReunion(req.params.id);
    if (!reunion) return res.status(404).json({ error: 'Reunión no encontrada' });

    const notasActuales = Array.isArray(reunion.notas) ? reunion.notas : [];
    const nota = notasActuales.find(n => n.id === req.params.notaId);
    if (!nota) return res.status(404).json({ error: 'Nota no encontrada' });

    const esAdmin = ['admin', 'gerente', 'coordinadora', 'pi'].includes(req.session.user.rol);
    if (!esAdmin && nota.autor !== req.session.user.email) {
      return res.status(403).json({ error: 'Solo puedes eliminar tus propias notas' });
    }

    const actualizada = await updateReunion(req.params.id, { notas: notasActuales.filter(n => n.id !== req.params.notaId) });
    res.json({ success: true, reunion: actualizada });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/reuniones/:id/acta', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const esOrganizador = ['admin', 'gerente', 'coordinadora', 'pi'].includes(req.session.user.rol);
    if (!esOrganizador) return res.status(403).json({ error: 'Sin permiso para guardar acta' });

    const reunion = await getReunion(req.params.id);
    if (!reunion) return res.status(404).json({ error: 'Reunión no encontrada' });

    const { acta } = req.body;
    const actualizada = await updateReunion(req.params.id, { acta: acta || '' });
    addAuditLog(req.session.user.email, 'Guardar Acta', `Reunión "${reunion.descripcion}"`);
    res.json({ success: true, reunion: actualizada });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/reuniones/:id/asistencia', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const reunion = await getReunion(req.params.id);
    if (!reunion) return res.status(404).json({ error: 'Reunión no encontrada' });

    const email = req.session.user.email;
    if (!reunion.asistentes.includes(email)) {
      return res.status(403).json({ error: 'No eres asistente de esta reunión' });
    }

    const { asistio } = req.body;
    if (typeof asistio !== 'boolean') return res.status(400).json({ error: 'asistio debe ser true o false' });

    const asistencias = { ...(reunion.asistencias || {}), [email]: asistio };
    const actualizada = await updateReunion(req.params.id, { asistencias });
    addAuditLog(email, 'Marcar Asistencia', `Reunión "${reunion.descripcion}": ${asistio ? 'Asistió' : 'No asistió'}`);
    res.json({ success: true, reunion: actualizada });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// SESIONES SCRUM — HISTORIAL PERMANENTE
// ============================================================================

function formatDuracionScrum(segundos) {
  const m = Math.floor((segundos || 0) / 60);
  const s = (segundos || 0) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

app.post('/api/scrum/:reunionId/cerrar', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const reunion = await getReunion(req.params.reunionId);
    if (!reunion) return res.status(404).json({ error: 'Reunión no encontrada' });

    const esSupervisor = ['admin', 'gerente', 'coordinadora', 'pi'].includes(req.session.user.rol);
    if (!esSupervisor && !reunion.asistentes.includes(req.session.user.email)) {
      return res.status(403).json({ error: 'No eres asistente de esta reunión' });
    }

    const { horaInicio, horaFin, duracionSegundos, historial, tareasAsignadasIds } = req.body;

    const sesion = {
      id: `scrum_${Date.now()}`,
      reunionId: reunion.id,
      titulo: reunion.descripcion,
      proyecto: reunion.proyecto || '',
      fecha: reunion.fecha,
      asistentes: reunion.asistentes || [],
      notas: Array.isArray(reunion.notas) ? [...reunion.notas] : [],
      horaInicio: horaInicio || null,
      horaFin: horaFin || null,
      duracionSegundos: duracionSegundos || 0,
      duracionTexto: formatDuracionScrum(duracionSegundos),
      tareasAsignadasIds: Array.isArray(tareasAsignadasIds) ? tareasAsignadasIds : [],
      cerradoPor: req.session.user.email,
      cerradoPorNombre: req.session.user.nombre,
      cerradoEn: new Date().toISOString(),
      historial: Array.isArray(historial) ? historial : [],
    };

    await insertScrumSesion(sesion);
    addAuditLog(req.session.user.email, 'Sesión SCRUM Guardada',
      `"${reunion.descripcion}" · ${sesion.duracionTexto} · ${sesion.notas.length} nota(s)`);
    res.json(sesion);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/scrum/sesiones', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const esSupervisor = ['admin', 'gerente', 'coordinadora', 'pi'].includes(req.session.user.rol);
    let sesiones = await getScrumSesiones();
    if (!esSupervisor) {
      sesiones = sesiones.filter(s =>
        s.asistentes.includes(req.session.user.email) ||
        s.cerradoPor === req.session.user.email
      );
    }
    res.json([...sesiones].reverse());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET sesión activa de una reunión SCRUM — payload milestone-driven
app.get('/api/scrum/sesion-activa/:reunionId', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const reunion = await getReunion(req.params.reunionId);
    if (!reunion) return res.status(404).json({ error: 'Reunión no encontrada' });
    if (reunion.modalidad !== 'scrum') return res.status(400).json({ error: 'La reunión no es un SCRUM' });

    // Hitos del proyecto con sus tareas asociadas
    const hitos = await getHitosByProyecto(reunion.proyecto);
    const hitosConTareas = await Promise.all(
      hitos.map(async h => {
        const tareas = await getTareasByHito(h.id);
        return { ...h, tareas };
      })
    );

    // Tareas del proyecto sin hito asignado (backlog libre)
    const todasTareas = await getTareasByProyecto(reunion.proyecto);
    const sinHito = todasTareas.filter(t => !t.hitoId && t.estado !== 'Completada' && t.estado !== 'Cancelada');

    res.json({
      reunion,
      hitos: hitosConTareas,
      backlogSinHito: sinHito,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// SCRUM PROGRAMAS RECURRENTES
// ============================================================================

const ROLES_SCRUM_ADMIN = ['admin', 'gerente', 'coordinadora', 'pi'];

app.get('/api/scrum/programas', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const programas = await getScrumProgramas();
    res.json(programas);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/scrum/programas', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (!ROLES_SCRUM_ADMIN.includes(req.session.user.rol))
      return res.status(403).json({ error: 'Sin permiso para programar SCRUMs' });

    const { proyecto, frecuencia, hora, asistentes } = req.body;
    if (!proyecto || !hora) return res.status(400).json({ error: 'proyecto y hora son requeridos' });
    if (!['diario', 'dia_por_medio'].includes(frecuencia))
      return res.status(400).json({ error: 'frecuencia debe ser diario o dia_por_medio' });

    const nuevo = {
      id: `prog_${Date.now()}`,
      proyecto,
      frecuencia: frecuencia || 'diario',
      hora,
      asistentes: Array.isArray(asistentes) ? asistentes : [],
      activo: true,
      fechaInicio: new Date().toISOString().split('T')[0],
      creadoPor: req.session.user.email,
      creadoEn: new Date().toISOString(),
    };
    await insertScrumPrograma(nuevo);
    addAuditLog(req.session.user.email, 'Crear Programa SCRUM',
      `${proyecto} · ${frecuencia} · ${hora}`);
    res.json(nuevo);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/scrum/programas/:id/toggle', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (!ROLES_SCRUM_ADMIN.includes(req.session.user.rol))
      return res.status(403).json({ error: 'Sin permiso' });
    const programas = await getScrumProgramas();
    const prog = programas.find(p => p.id === req.params.id);
    if (!prog) return res.status(404).json({ error: 'Programa no encontrado' });
    await updateScrumPrograma(req.params.id, { activo: !prog.activo });
    res.json({ success: true, activo: !prog.activo });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/scrum/programas/:id', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (!ROLES_SCRUM_ADMIN.includes(req.session.user.rol))
      return res.status(403).json({ error: 'Sin permiso' });
    await deleteScrumPrograma(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Genera reuniones SCRUM de hoy según programas activos (idempotente)
app.post('/api/scrum/generar-hoy', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const hoy = new Date().toISOString().split('T')[0];
    const programas = await getScrumProgramas();
    const activos = programas.filter(p => p.activo);
    const todasReuniones = await getReuniones();
    const scrumHoy = todasReuniones.filter(r => r.modalidad === 'scrum' && r.fecha === hoy);

    const creadas = [];
    for (const prog of activos) {
      if (prog.frecuencia === 'dia_por_medio') {
        const inicio = new Date(prog.fechaInicio);
        const hoyDate = new Date(hoy);
        const diff = Math.round((hoyDate - inicio) / (1000 * 60 * 60 * 24));
        if (diff % 2 !== 0) continue;
      }
      const yaExiste = scrumHoy.some(r => r.proyecto === prog.proyecto);
      if (yaExiste) continue;

      const nueva = {
        id: `scrum_auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        tipo: 'nihr', modalidad: 'scrum', tipoReunion: 'especial',
        proyecto: prog.proyecto,
        descripcion: `Daily SCRUM — ${prog.proyecto}`,
        fecha: hoy,
        horaInicio: prog.hora, horaFin: '',
        enlace: '', asistentes: prog.asistentes,
        asistencias: {}, notas: [], acta: '', calendarEventIds: {},
        creadoPor: req.session.user.email,
        fechaCreacion: new Date().toISOString(),
      };
      await insertReunion(nueva);
      creadas.push(nueva);
    }
    res.json({ creadas: creadas.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/scrum/sesiones/:id/evento', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const sesion = await getScrumSesion(req.params.id);
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });

    const esSupervisor = ['admin', 'gerente', 'coordinadora', 'pi'].includes(req.session.user.rol);
    if (!esSupervisor && !sesion.asistentes.includes(req.session.user.email)) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const evento = {
      ts: new Date().toISOString(),
      usuario: req.session.user.email,
      usuarioNombre: req.session.user.nombre,
      accion: req.body.accion || 'Edición',
      detalle: req.body.detalle || '',
    };
    const actualizada = await agregarEventoScrumSesion(req.params.id, evento);
    addAuditLog(req.session.user.email, 'Editar Historial SCRUM',
      `Sesión ${req.params.id}: ${evento.accion}`);
    res.json(actualizada);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// AUDITORÍA
// ============================================================================

app.get('/api/auditoria', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (!['admin', 'gerente'].includes(req.session.user.rol)) return res.status(403).json({ error: 'Sin permiso' });
    res.json(await getAuditLogs(200));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// CONFIGURACIÓN / PROYECTOS
// ============================================================================

app.get('/api/config/miembros', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    res.json(await getUsuariosActivos());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/config/miembros/:email/equipo', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (req.session.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede asignar equipos' });
    const { equipo, equipos } = req.body;
    let actualizado;
    if (Array.isArray(equipos)) {
      actualizado = await updateEquiposUsuario(req.params.email, equipos);
      addAuditLog(req.session.user.email, 'Asignar Equipos', `${req.params.email} → [${equipos.join(', ') || 'ninguno'}]`);
    } else {
      actualizado = await updateEquipoUsuario(req.params.email, equipo || null);
      addAuditLog(req.session.user.email, 'Asignar Equipo', `${req.params.email} → ${equipo || 'sin equipo'}`);
    }
    if (!actualizado) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(actualizado);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/config/proyectos', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    res.json(await getNombresProyectos());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/proyectos', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    res.json(await getProyectos());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/proyectos', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (req.session.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede crear proyectos' });
    const { nombre, descripcion, miembros, editorEmail } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre del proyecto es requerido' });
    if (await findProyecto(nombre)) return res.status(400).json({ error: 'El proyecto ya existe' });

    const miembrosFinales = Array.isArray(miembros) ? miembros : [req.session.user.email];
    const nuevo = { nombre: nombre.trim(), descripcion: descripcion || '', miembros: miembrosFinales, creadoPor: req.session.user.email, createdAt: new Date().toISOString().split('T')[0] };
    await insertProyecto(nuevo);

    // Editor del mastersheet: el designado si está en el equipo, si no el admin creador
    const editorValido = editorEmail && miembrosFinales.includes(editorEmail)
      ? editorEmail : req.session.user.email;
    const editorInicial = [editorValido];
    await insertMastersheet({
      id: `ms_${Date.now()}`,
      proyecto: nuevo.nombre,
      editores: editorInicial,
      creadoPor: req.session.user.email,
      creadoEn: new Date().toISOString(),
    });
    notificarEquipo(editorInicial, 'mastersheet', `Mastersheet listo: ${nuevo.nombre}`, `El proyecto "${nuevo.nombre}" fue creado. Configura los hitos en el Mastersheet.`, { proyecto: nuevo.nombre });

    addAuditLog(req.session.user.email, 'Crear Proyecto', `Nuevo proyecto: ${nombre}`);
    res.json({ success: true, message: `Proyecto "${nombre}" creado`, proyecto: nuevo });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/proyectos/:nombre', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (req.session.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede editar proyectos' });
    const { nombre } = req.params;
    const proyecto = await findProyecto(nombre);
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });
    const { miembros } = req.body;
    if (!Array.isArray(miembros)) return res.status(400).json({ error: 'Miembros debe ser un array' });
    const actualizado = await updateMiembrosProyecto(nombre, miembros);
    addAuditLog(req.session.user.email, 'Editar Proyecto', `Miembros actualizados en "${nombre}": ${miembros.length} miembros`);
    res.json({ success: true, proyecto: actualizado });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/proyectos/:nombre/miembros', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (req.session.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede asignar miembros' });
    const { nombre } = req.params;
    const { miembros } = req.body;
    if (!await findProyecto(nombre)) return res.status(404).json({ error: 'Proyecto no encontrado' });
    if (!Array.isArray(miembros)) return res.status(400).json({ error: 'Miembros debe ser un array' });
    const actualizado = await updateMiembrosProyecto(nombre, miembros);
    addAuditLog(req.session.user.email, 'Asignar Miembros', `${miembros.length} miembros → ${nombre}`);
    res.json({ success: true, proyecto: actualizado });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// MASTERSHEETS + HITOS + PROPUESTAS
// ============================================================================

// Comprueba si el usuario puede EDITAR el mastersheet de un proyecto.
// Solo admin o el editor asignado al proyecto pueden hacerlo.
function puedeEditarMS(user, ms) {
  if (user.rol === 'admin') return true;
  const editores = Array.isArray(ms.editores) ? ms.editores : [];
  return editores.includes(user.email);
}

// GET mastersheet de un proyecto (incluye sus hitos y tareas por hito)
// Acceso: admin/gerente siempre; cualquier miembro del proyecto también
app.get('/api/mastersheet/:proyecto', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });

    const proyectoObj = await findProyecto(req.params.proyecto);
    if (!proyectoObj) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const esAdmin = ['admin', 'gerente'].includes(req.session.user.rol);
    const esMiembro = proyectoObj.miembros.includes(req.session.user.email);
    if (!esAdmin && !esMiembro)
      return res.status(403).json({ error: 'No eres miembro de este proyecto' });

    let ms = await getMastersheetByProyecto(req.params.proyecto);
    if (!ms) {
      await insertMastersheet({
        id: `ms_${Date.now()}`,
        proyecto: req.params.proyecto,
        editores: [],
        creadoPor: req.session.user.email,
        creadoEn: new Date().toISOString(),
      });
      ms = await getMastersheetByProyecto(req.params.proyecto);
    }

    const hitos = await getHitosByMastersheet(ms.id);
    // Incluir tareas de cada hito para que los miembros vean el progreso real
    const hitosConTareas = await Promise.all(
      hitos.map(async h => ({
        ...h,
        tareas: await getTareasByHito(h.id),
      }))
    );

    res.json({ ...ms, hitos: hitosConTareas });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT asignar editor del mastersheet (solo admin)
app.put('/api/mastersheet/:proyecto/editor', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (req.session.user.rol !== 'admin')
      return res.status(403).json({ error: 'Solo admin puede asignar el editor del mastersheet' });

    const { editorEmail } = req.body;
    if (!editorEmail) return res.status(400).json({ error: 'editorEmail es requerido' });

    const miembroProyecto = await findProyecto(req.params.proyecto);
    if (!miembroProyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });
    if (!miembroProyecto.miembros.includes(editorEmail))
      return res.status(400).json({ error: 'El editor debe ser miembro del proyecto' });

    let ms = await getMastersheetByProyecto(req.params.proyecto);
    if (!ms) {
      // Proyecto antiguo sin mastersheet — crearlo ahora
      const nuevoMs = {
        id: `ms_${Date.now()}`,
        proyecto: req.params.proyecto,
        editores: [editorEmail],
        creadoPor: req.session.user.email,
        creadoEn: new Date().toISOString(),
      };
      await insertMastersheet(nuevoMs);
      ms = await getMastersheetByProyecto(req.params.proyecto);
      addAuditLog(req.session.user.email, 'Crear Mastersheet',
        `Mastersheet creado para proyecto existente: ${req.params.proyecto}`);
      return res.json({ success: true, mastersheet: ms });
    }

    const actualizado = await updateMastersheetEditores(ms.id, [editorEmail]);
    addAuditLog(req.session.user.email, 'Asignar Editor Mastersheet',
      `${req.params.proyecto} → ${editorEmail}`);
    res.json({ success: true, mastersheet: actualizado });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET hitos de un proyecto (acceso: admin/gerente o miembro del proyecto)
app.get('/api/hitos', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const { proyecto } = req.query;
    if (!proyecto) return res.status(400).json({ error: 'Se requiere ?proyecto=...' });

    const proyectoObj = await findProyecto(proyecto);
    if (!proyectoObj) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const esAdmin = ['admin', 'gerente'].includes(req.session.user.rol);
    const esMiembro = proyectoObj.miembros.includes(req.session.user.email);
    if (!esAdmin && !esMiembro)
      return res.status(403).json({ error: 'No eres miembro de este proyecto' });

    const hitos = await getHitosByProyecto(proyecto);
    res.json(hitos);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST crear hito
app.post('/api/hitos', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const { proyecto, nombre, descripcion, fechaInicio, fechaFin, responsablePrincipal, esCritico, orden, macrotareas } = req.body;
    if (!proyecto || !nombre) return res.status(400).json({ error: 'proyecto y nombre son requeridos' });

    const ms = await getMastersheetByProyecto(proyecto);
    if (!ms) return res.status(404).json({ error: 'El proyecto no tiene mastersheet' });
    if (!puedeEditarMS(req.session.user, ms))
      return res.status(403).json({ error: 'Solo el editor asignado puede crear hitos' });

    const nuevoHito = {
      id: `h_${Date.now()}`,
      mastersheetId: ms.id,
      proyecto,
      nombre: nombre.trim(),
      descripcion: descripcion || '',
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
      fechaReal: null,
      responsablePrincipal: responsablePrincipal || null,
      estado: 'pendiente',
      progreso: 0,
      esCritico: esCritico || false,
      macrotareas: Array.isArray(macrotareas) ? macrotareas : [],
      notasEditor: [],
      orden: orden || 0,
      creadoPor: req.session.user.email,
      creadoEn: new Date().toISOString(),
    };
    await insertHito(nuevoHito);
    addAuditLog(req.session.user.email, 'Crear Hito', `"${nombre}" → ${proyecto}`);
    res.json(nuevoHito);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT actualizar hito
app.put('/api/hitos/:id', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const hito = await getHito(req.params.id);
    if (!hito) return res.status(404).json({ error: 'Hito no encontrado' });

    const msHito = await getMastersheetByProyecto(hito.proyecto);
    if (!puedeEditarMS(req.session.user, msHito || { editores: [] }))
      return res.status(403).json({ error: 'Solo el editor asignado puede editar hitos' });

    const { nombre, descripcion, fechaInicio, fechaFin, fechaReal,
            responsablePrincipal, esCritico, orden, notasEditor, macrotareas } = req.body;

    const cambios = {};
    if (nombre               !== undefined) cambios.nombre = nombre;
    if (descripcion          !== undefined) cambios.descripcion = descripcion;
    if (fechaInicio          !== undefined) cambios.fechaInicio = fechaInicio;
    if (fechaFin             !== undefined) cambios.fechaFin = fechaFin;
    if (fechaReal            !== undefined) cambios.fechaReal = fechaReal;
    if (responsablePrincipal !== undefined) cambios.responsablePrincipal = responsablePrincipal;
    if (esCritico            !== undefined) cambios.esCritico = esCritico;
    if (orden                !== undefined) cambios.orden = orden;
    if (notasEditor          !== undefined) cambios.notasEditor = notasEditor;
    if (macrotareas          !== undefined) cambios.macrotareas = macrotareas;

    const actualizado = await updateHito(req.params.id, cambios);
    // Recalcular estado desde sus tareas
    await recalcularProgresoHito(req.params.id);
    addAuditLog(req.session.user.email, 'Editar Hito', `"${hito.nombre}" (${hito.proyecto})`);
    res.json({ success: true, hito: actualizado });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE hito (solo si no tiene tareas asociadas)
app.delete('/api/hitos/:id', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (req.session.user.rol !== 'admin')
      return res.status(403).json({ error: 'Solo admin puede eliminar hitos' });

    const hito = await getHito(req.params.id);
    if (!hito) return res.status(404).json({ error: 'Hito no encontrado' });

    const tareas = await getTareasByHito(req.params.id);
    if (tareas.length > 0)
      return res.status(409).json({ error: `No se puede eliminar: tiene ${tareas.length} tarea(s) asociada(s)` });

    await deleteHito(req.params.id);
    addAuditLog(req.session.user.email, 'Eliminar Hito', `"${hito.nombre}" (${hito.proyecto})`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- PROPUESTAS DE CAMBIO ---

// GET propuestas de un hito
app.get('/api/hitos/:id/propuestas', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const hito = await getHito(req.params.id);
    if (!hito) return res.status(404).json({ error: 'Hito no encontrado' });
    const ms = await getMastersheetByProyecto(hito.proyecto);
    const propuestas = ms ? await getHitoPropuestasByMastersheet(ms.id) : [];
    res.json(propuestas.filter(p => p.hitoId === req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST crear propuesta de cambio para un hito
app.post('/api/hitos/:id/propuestas', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const hito = await getHito(req.params.id);
    if (!hito) return res.status(404).json({ error: 'Hito no encontrado' });

    const { tipoCambio, valorPropuesto, justificacion } = req.body;
    if (!tipoCambio || !valorPropuesto)
      return res.status(400).json({ error: 'tipoCambio y valorPropuesto son requeridos' });

    const TIPOS_VALIDOS = ['fechaInicio', 'fechaFin', 'responsable', 'descripcion'];
    if (!TIPOS_VALIDOS.includes(tipoCambio))
      return res.status(400).json({ error: `tipoCambio debe ser uno de: ${TIPOS_VALIDOS.join(', ')}` });

    // Bloquear si ya hay una propuesta pendiente del mismo tipo para este hito
    const pendientes = await getPropuestasPendientesByHitoCampo(req.params.id, tipoCambio);
    if (pendientes.length > 0)
      return res.status(409).json({ error: 'Ya existe una propuesta pendiente de ese tipo para este hito' });

    const ms = await getMastersheetByProyecto(hito.proyecto);
    const valorActual = hito[tipoCambio === 'responsable' ? 'responsablePrincipal' : tipoCambio] || null;

    const nueva = {
      id: `prop_${Date.now()}`,
      hitoId: req.params.id,
      mastersheetId: ms ? ms.id : null,
      proyecto: hito.proyecto,
      propuestoPor: req.session.user.email,
      tipoCambio,
      valorActual,
      valorPropuesto,
      justificacion: justificacion || '',
      creadoEn: new Date().toISOString(),
    };
    await insertHitoPropuesta(nueva);
    addAuditLog(req.session.user.email, 'Propuesta de Cambio',
      `Hito "${hito.nombre}" — ${tipoCambio}: ${valorActual} → ${valorPropuesto}`);
    res.json(nueva);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT aprobar/rechazar propuesta
app.put('/api/hitos/propuestas/:id', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });

    const propuesta = await getHitoPropuesta(req.params.id);
    if (!propuesta) return res.status(404).json({ error: 'Propuesta no encontrada' });
    if (propuesta.estado !== 'pendiente')
      return res.status(409).json({ error: 'La propuesta ya fue revisada' });

    const msProp = await getMastersheetByProyecto(propuesta.proyecto);
    if (!puedeEditarMS(req.session.user, msProp || { editores: [] }))
      return res.status(403).json({ error: 'Solo el editor asignado puede revisar propuestas' });

    const { decision, comentario } = req.body;
    if (!['aprobada', 'rechazada'].includes(decision))
      return res.status(400).json({ error: 'decision debe ser aprobada o rechazada' });

    const ahora = new Date().toISOString();
    const actualizada = await updateHitoPropuesta(req.params.id, {
      estado: decision,
      revisadoPor: req.session.user.email,
      revisadoEn: ahora,
      comentario: comentario || '',
    });

    // Si aprobada, aplicar el cambio al hito
    if (decision === 'aprobada') {
      const campo = propuesta.tipoCambio;
      const campoHito = campo === 'responsable' ? 'responsablePrincipal' : campo;
      await updateHito(propuesta.hitoId, { [campoHito]: propuesta.valorPropuesto });
      await recalcularProgresoHito(propuesta.hitoId);
    }

    addAuditLog(req.session.user.email, `Propuesta ${decision}`,
      `Hito ID ${propuesta.hitoId} — ${propuesta.tipoCambio}`);
    res.json({ success: true, propuesta: actualizada });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// REPORTES
// ============================================================================

app.get('/api/reportes/:proyecto', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (!['admin', 'gerente', 'pi', 'coordinadora'].includes(req.session.user.rol))
      return res.status(403).json({ error: 'Sin permiso para generar reportes' });

    const { proyecto } = req.params;
    const proyectoObj = await findProyecto(proyecto);
    if (!proyectoObj) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const [tareas, reuniones, ms, presupuestos, gastos] = await Promise.all([
      getTareasByProyecto(proyecto),
      getReuniones().then(rs => rs.filter(r => r.proyecto === proyecto)),
      getMastersheetByProyecto(proyecto),
      getPresupuestos().then(ps => ps.filter(p => p.proyecto === proyecto)),
      getGastos().then(gs => gs.filter(g => g.proyecto === proyecto)),
    ]);

    const hitos = ms ? await getHitosByMastersheet(ms.id) : [];

    const totalTareas = tareas.length;
    const completadas = tareas.filter(t => t.estado === 'Completada').length;
    const pendientes  = tareas.filter(t => t.estado === 'Pendiente').length;
    const bloqueadas  = tareas.filter(t => t.estado === 'Bloqueada').length;
    const criticas    = tareas.filter(t => t.esCritica).length;

    const totalHitos   = hitos.length;
    const hitosOk      = hitos.filter(h => h.estado === 'completado').length;
    const hitosRiesgo  = hitos.filter(h => h.estado === 'en_riesgo').length;
    const hitosRetras  = hitos.filter(h => h.estado === 'retrasado').length;
    const progresoMedio = totalHitos === 0 ? 0
      : Math.round(hitos.reduce((s, h) => s + (h.progreso || 0), 0) / totalHitos);

    const totalGastado = gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
    const totalPresupuestado = presupuestos.reduce((s, p) => s + (parseFloat(p.montoTotal) || 0), 0);

    res.json({
      generadoEn: new Date().toISOString(),
      generadoPor: req.session.user.email,
      proyecto,
      tareas: { total: totalTareas, completadas, pendientes, bloqueadas, criticas,
                porcentaje: totalTareas === 0 ? 0 : Math.round(completadas / totalTareas * 100) },
      hitos:  { total: totalHitos, completados: hitosOk, enRiesgo: hitosRiesgo,
                retrasados: hitosRetras, progresoMedio },
      reuniones: { total: reuniones.length },
      finanzas: { presupuestado: totalPresupuestado, gastado: totalGastado,
                  disponible: totalPresupuestado - totalGastado },
      detalleHitos: hitos.map(h => ({
        id: h.id, nombre: h.nombre, estado: h.estado,
        progreso: h.progreso, fechaObjetivo: h.fechaObjetivo,
        esCritico: h.esCritico,
      })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// ANUNCIOS
// ============================================================================

app.get('/api/anuncios', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    res.json(await getAnuncios());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/anuncios', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const userEquipos = req.session.user.equipos || (req.session.user.equipo ? [req.session.user.equipo] : []);
    const puedePubAnuncio = ['admin', 'gerente', 'coordinadora', 'pi'].includes(req.session.user.rol) || userEquipos.includes('comunicacion');
    if (!puedePubAnuncio) {
      return res.status(403).json({ error: 'Sin permiso para publicar anuncios' });
    }
    const { titulo, contenido, importante } = req.body;
    if (!titulo || !contenido) return res.status(400).json({ error: 'Título y contenido requeridos' });

    const anuncio = {
      id: Date.now().toString(),
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      importante: !!importante,
      autor: req.session.user.nombre,
      autorEmail: req.session.user.email,
      fecha: new Date().toISOString().split('T')[0],
      creadoEn: new Date().toISOString()
    };
    await insertAnuncio(anuncio);
    addAuditLog(req.session.user.email, 'Crear Anuncio', `"${titulo}"`);
    res.json(anuncio);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/anuncios/:id', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const userEquiposElim = req.session.user.equipos || (req.session.user.equipo ? [req.session.user.equipo] : []);
    const puedeElimAnuncio = ['admin', 'gerente', 'coordinadora'].includes(req.session.user.rol) || userEquiposElim.includes('comunicacion');
    if (!puedeElimAnuncio) {
      return res.status(403).json({ error: 'Sin permiso para eliminar anuncios' });
    }
    await deleteAnuncio(req.params.id);
    addAuditLog(req.session.user.email, 'Eliminar Anuncio', `id: ${req.params.id}`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/anuncios/:id/imagen', uploadImagen.single('imagen'), async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const userEquiposImg = req.session.user.equipos || (req.session.user.equipo ? [req.session.user.equipo] : []);
    const puedeImgAnuncio = ['admin', 'gerente', 'coordinadora', 'pi'].includes(req.session.user.rol) || userEquiposImg.includes('comunicacion');
    if (!puedeImgAnuncio) return res.status(403).json({ error: 'Sin permiso' });
    if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
    const imagen = { archivo: req.file.filename, url: `/uploads/anuncios/${req.file.filename}` };
    const actualizado = await updateAnuncioImagen(req.params.id, imagen);
    if (!actualizado) return res.status(404).json({ error: 'Anuncio no encontrado' });
    addAuditLog(req.session.user.email, 'Imagen Anuncio', `Anuncio ${req.params.id}`);
    res.json({ success: true, imagen });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// PERFIL DE USUARIO
// ============================================================================

app.get('/api/perfil', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const u = await findUsuario(req.session.user.email);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { password_hash, ...perfil } = u;
    res.json(perfil);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/perfil', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const { nombre, telefono, cargo, departamento, solicitudId } = req.body;
    const actualizado = await updatePerfil(req.session.user.email, { nombre, telefono, cargo, departamento });
    if (!actualizado) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (nombre) req.session.user.nombre = nombre;
    if (solicitudId) await completarSolicitud(solicitudId);
    addAuditLog(req.session.user.email, 'Actualizar Perfil', `Perfil actualizado`);
    res.json({ success: true, perfil: actualizado });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// SOLICITUDES DE ACTUALIZACIÓN DE PERFIL
// ============================================================================

app.get('/api/solicitudes-actualizacion', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const esAdmin = ['admin', 'gerente'].includes(req.session.user.rol);
    if (esAdmin) {
      res.json(await getSolicitudesEnviadas());
    } else {
      res.json(await getSolicitudesPendientes(req.session.user.email));
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/solicitudes-actualizacion', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (!['admin', 'gerente'].includes(req.session.user.rol)) {
      return res.status(403).json({ error: 'Solo admin puede enviar solicitudes' });
    }
    const { destinatarios, mensaje } = req.body;
    if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
      return res.status(400).json({ error: 'Selecciona al menos un destinatario' });
    }
    const creadas = [];
    for (const email of destinatarios) {
      const s = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        emailDestino: email,
        enviadoPor: req.session.user.email,
        mensaje: mensaje || 'Por favor actualiza tu información de perfil.',
        fecha: new Date().toISOString(),
        completada: false,
      };
      await insertSolicitud(s);
      creadas.push(s);
    }
    addAuditLog(req.session.user.email, 'Solicitud Actualización', `Enviada a ${destinatarios.length} miembro(s)`);
    res.json({ success: true, creadas });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// HELPER: NOTIFICAR MIEMBROS DE EQUIPO (fire-and-forget)
// ============================================================================

function notificarEquipo(destinatarios, tipo, titulo, mensaje, referencia) {
  const ts = new Date().toISOString();
  for (const email of destinatarios) {
    insertNotificacion({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      para: email,
      tipo,
      titulo,
      mensaje,
      leida: false,
      creadaEn: ts,
      referencia
    }).catch(err => console.error('Notif error:', err.message));
  }
}

// ============================================================================
// PRESUPUESTOS
// ============================================================================

const ROLES_FINANZAS        = ['admin', 'gerente', 'responsable_financiero', 'pi'];
const ROLES_SIN_PRESUPUESTO = ['pasante', 'becaria'];

function esAccesoFinanzasCompleto(user) {
  const equipos = user.equipos || (user.equipo ? [user.equipo] : []);
  return ROLES_FINANZAS.includes(user.rol) || equipos.includes('Financiero');
}

// POST /api/tareas/:id/comprobantes — subir comprobante y notificar finanzas
app.post('/api/tareas/:id/comprobantes', uploadComprobante.single('comprobante'), async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    const tarea = await getTarea(req.params.id);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

    const esResponsable = tarea.responsables.includes(req.session.user.email);
    const esAdmin = ['admin', 'gerente', 'coordinadora', 'pi'].includes(req.session.user.rol);
    if (!esResponsable && !esAdmin) return res.status(403).json({ error: 'Sin permiso para subir comprobantes' });

    if (!tarea.tieneCosto) return res.status(400).json({ error: 'La tarea no tiene costo registrado' });

    const nuevoComprobante = {
      nombre: req.file.originalname,
      url: `/uploads/comprobantes/${req.file.filename}`,
      subidoPor: req.session.user.email,
      subidoPorNombre: req.session.user.nombre,
      subidoEn: new Date().toISOString(),
    };

    const actualizados = [...(tarea.comprobantes || []), nuevoComprobante];
    await updateTarea(tarea.id, { comprobantes: actualizados, ultimaActualizacion: new Date().toISOString() });

    addAuditLog(req.session.user.email, 'Subir Comprobante', `Tarea "${tarea.descripcion}" — ${req.file.originalname}`);

    // Notificar a todo el sector financiero
    const usuariosActivos = await getUsuariosActivos();
    const financieros = usuariosActivos
      .filter(u => ROLES_FINANZAS.includes(u.rol) || (u.equipos || []).includes('Financiero'))
      .map(u => u.email)
      .filter(e => e !== req.session.user.email);

    notificarEquipo(
      financieros,
      'comprobante_tarea',
      'Nuevo comprobante de gasto',
      `${req.session.user.nombre} subió un comprobante para la tarea "${tarea.descripcion}" (${tarea.proyecto}) — Bs ${tarea.costoMonto ?? '?'}`,
      { tareaId: tarea.id, proyecto: tarea.proyecto, comprobante: nuevoComprobante }
    );

    res.json({ success: true, comprobante: nuevoComprobante, comprobantes: actualizados });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/presupuestos', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (ROLES_SIN_PRESUPUESTO.includes(req.session.user.rol)) return res.status(403).json({ error: 'Sin acceso a presupuestos' });
    const { proyecto, mes, estado } = req.query;
    const esFinanzasCompleto = esAccesoFinanzasCompleto(req.session.user);

    let lista = await getPresupuestos();

    if (!esFinanzasCompleto) {
      const proyectos = await getProyectos();
      const misProyectos = proyectos.filter(p => p.miembros.includes(req.session.user.email)).map(p => p.nombre);
      lista = lista.filter(p => misProyectos.includes(p.proyecto));
    }

    if (proyecto) lista = lista.filter(p => p.proyecto === proyecto);
    if (mes)      lista = lista.filter(p => p.mes === mes);
    if (estado)   lista = lista.filter(p => p.estado === estado);

    res.json(lista.slice().reverse());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/presupuestos/:id', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (ROLES_SIN_PRESUPUESTO.includes(req.session.user.rol)) return res.status(403).json({ error: 'Sin acceso a presupuestos' });
    const presupuesto = await getPresupuesto(req.params.id);
    if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });

    if (!esAccesoFinanzasCompleto(req.session.user)) {
      const proyecto = await findProyecto(presupuesto.proyecto);
      if (!proyecto || !proyecto.miembros.includes(req.session.user.email)) {
        return res.status(403).json({ error: 'Sin acceso a este presupuesto' });
      }
    }
    res.json(presupuesto);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/presupuestos', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (ROLES_SIN_PRESUPUESTO.includes(req.session.user.rol)) return res.status(403).json({ error: 'Sin acceso a presupuestos' });

    const { proyecto, mes, items, totalSolicitado, descripcion } = req.body;
    if (!proyecto || !mes) return res.status(400).json({ error: 'Proyecto y mes son requeridos' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Debe incluir al menos un ítem de presupuesto' });

    const proyectoObj = await findProyecto(proyecto);
    if (!proyectoObj) return res.status(404).json({ error: 'Proyecto no encontrado' });
    if (!esAccesoFinanzasCompleto(req.session.user) && !proyectoObj.miembros.includes(req.session.user.email)) {
      return res.status(403).json({ error: 'Solo los miembros del proyecto pueden crear presupuestos' });
    }

    const presupuestos = await getPresupuestos();
    const duplicado = presupuestos.find(p => p.proyecto === proyecto && p.mes === mes);
    if (duplicado) return res.status(400).json({ error: `Ya existe un presupuesto para ${proyecto} en el mes ${mes}` });

    const hoy = new Date();
    const [anio, mesNum] = mes.split('-').map(Number);
    const mesSolicitado = new Date(anio, mesNum - 1, 1);
    const mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const diasDiferencia = Math.round((mesSolicitado - mesActual) / (1000 * 60 * 60 * 24 * 30));
    if (diasDiferencia < 0) return res.status(400).json({ error: 'No se puede crear presupuesto para meses pasados' });
    if (diasDiferencia > 1) return res.status(400).json({ error: 'Solo se puede presupuestar el mes actual o el siguiente' });
    if (diasDiferencia === 1 && hoy.getDate() > 24) return res.status(400).json({ error: 'El plazo para presupuestar el mes siguiente venció el día 24' });

    const nuevo = {
      id: Date.now().toString(),
      proyecto, mes,
      descripcion: descripcion || '',
      estado: 'borrador',
      items: items.map((it, idx) => ({
        id: `${Date.now()}-${idx}`,
        rubro: it.rubro || 'General',
        descripcion: it.descripcion || '',
        monto: Number(it.monto) || 0
      })),
      totalSolicitado: Number(totalSolicitado) || items.reduce((s, i) => s + (Number(i.monto) || 0), 0),
      respaldos: [],
      comentarios: [],
      creadoPor: req.session.user.email,
      creadoPorNombre: req.session.user.nombre,
      creadoEn: new Date().toISOString(),
      revisadoPor: null, revisadoEn: null,
      aprobadoPor: null, aprobadoEn: null,
    };
    await insertPresupuesto(nuevo);
    addAuditLog(req.session.user.email, 'Crear Presupuesto', `Proyecto "${proyecto}" mes ${mes} — Bs ${nuevo.totalSolicitado}`);

    const otrosMiembros = proyectoObj.miembros.filter(e => e !== req.session.user.email);
    const usuariosActivos = await getUsuariosActivos();
    const financieros = usuariosActivos
      .filter(u => ROLES_FINANZAS.includes(u.rol) || (u.equipos || []).includes('Financiero'))
      .map(u => u.email);
    const destinatarios = [...new Set([...otrosMiembros, ...financieros])];
    notificarEquipo(
      destinatarios,
      'presupuesto_creado',
      `Nuevo presupuesto: ${proyecto}`,
      `${req.session.user.nombre} creó el presupuesto de ${mes} para "${proyecto}" — Bs ${nuevo.totalSolicitado.toLocaleString()}`,
      { tipo: 'presupuesto', id: nuevo.id }
    );

    res.json(nuevo);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/presupuestos/:id/estado', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const presupuesto = await getPresupuesto(req.params.id);
    if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });

    const { estado, comentario } = req.body;
    const estadosValidos = ['borrador', 'revision', 'aprobado', 'desembolsado', 'ejecucion'];
    if (!estadosValidos.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

    if (ROLES_SIN_PRESUPUESTO.includes(req.session.user.rol)) return res.status(403).json({ error: 'Sin acceso a presupuestos' });
    const esFinanzasCompleto = esAccesoFinanzasCompleto(req.session.user);
    const esCreador = presupuesto.creadoPor === req.session.user.email;
    const proyectoObj = await findProyecto(presupuesto.proyecto);
    const esMiembro = proyectoObj && proyectoObj.miembros.includes(req.session.user.email);

    const transiciones = {
      borrador:     { revision: esFinanzasCompleto || esCreador || esMiembro },
      revision:     { aprobado: esFinanzasCompleto, borrador: esFinanzasCompleto },
      aprobado:     { desembolsado: esFinanzasCompleto },
      desembolsado: { ejecucion: esFinanzasCompleto || esMiembro },
      ejecucion:    {}
    };
    if (!transiciones[presupuesto.estado]?.[estado]) {
      return res.status(403).json({ error: `No puedes cambiar de "${presupuesto.estado}" a "${estado}"` });
    }

    const cambios = { estado, ultimaActualizacion: new Date().toISOString() };
    if (estado === 'revision')     { cambios.revisadoPor = req.session.user.email; cambios.revisadoEn = new Date().toISOString(); }
    if (estado === 'aprobado')     { cambios.aprobadoPor = req.session.user.email; cambios.aprobadoEn = new Date().toISOString(); }
    if (estado === 'desembolsado') { cambios.desembolsadoPor = req.session.user.email; cambios.desembolsadoEn = new Date().toISOString(); }

    if (comentario) {
      cambios.comentarios = [
        ...(presupuesto.comentarios || []),
        { id: Date.now().toString(), autor: req.session.user.email, autorNombre: req.session.user.nombre, texto: comentario, fecha: new Date().toISOString(), estadoCambio: estado }
      ];
    }

    const actualizado = await updatePresupuesto(req.params.id, cambios);
    addAuditLog(req.session.user.email, 'Cambiar Estado Presupuesto', `"${presupuesto.proyecto}" ${presupuesto.mes} → ${estado}`);

    const destinatarios = proyectoObj ? proyectoObj.miembros.filter(e => e !== req.session.user.email) : [];
    const etiquetas = { revision: 'en revisión', aprobado: 'aprobado', borrador: 'devuelto a borrador', desembolsado: 'desembolsado', ejecucion: 'en ejecución' };
    notificarEquipo(
      destinatarios,
      'presupuesto_estado',
      `Presupuesto ${etiquetas[estado] || estado}: ${presupuesto.proyecto}`,
      `El presupuesto ${presupuesto.mes} de "${presupuesto.proyecto}" fue marcado como ${etiquetas[estado] || estado} por ${req.session.user.nombre}`,
      { tipo: 'presupuesto', id: presupuesto.id }
    );

    res.json({ success: true, presupuesto: actualizado });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/presupuestos/:id/respaldo', uploadPresupuesto.single('respaldo'), async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const presupuesto = await getPresupuesto(req.params.id);
    if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });

    if (ROLES_SIN_PRESUPUESTO.includes(req.session.user.rol)) return res.status(403).json({ error: 'Sin acceso a presupuestos' });
    const proyectoObj = await findProyecto(presupuesto.proyecto);
    if (!esAccesoFinanzasCompleto(req.session.user) && (!proyectoObj || !proyectoObj.miembros.includes(req.session.user.email))) {
      return res.status(403).json({ error: 'Sin permiso para subir respaldos a este presupuesto' });
    }
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    const respaldo = {
      id: Date.now().toString(),
      nombre: req.file.originalname,
      archivo: req.file.filename,
      url: `/uploads/presupuestos/${req.file.filename}`,
      subidoPor: req.session.user.email,
      subidoPorNombre: req.session.user.nombre,
      fecha: new Date().toISOString()
    };
    const actualizado = await updatePresupuesto(req.params.id, { respaldos: [...(presupuesto.respaldos || []), respaldo] });
    addAuditLog(req.session.user.email, 'Respaldo Presupuesto', `"${presupuesto.proyecto}" ← ${req.file.originalname}`);
    res.json({ success: true, respaldo, presupuesto: actualizado });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/presupuestos/:id/respaldo/:respaldoId', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const presupuesto = await getPresupuesto(req.params.id);
    if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });

    if (ROLES_SIN_PRESUPUESTO.includes(req.session.user.rol)) return res.status(403).json({ error: 'Sin acceso a presupuestos' });
    const proyectoObjDel = await findProyecto(presupuesto.proyecto);
    if (!esAccesoFinanzasCompleto(req.session.user) && (!proyectoObjDel || !proyectoObjDel.miembros.includes(req.session.user.email))) {
      return res.status(403).json({ error: 'Sin permiso' });
    }

    const respaldo = (presupuesto.respaldos || []).find(r => r.id === req.params.respaldoId);
    if (respaldo) {
      const ruta = path.join(UPLOADS_PRESUPUESTOS, respaldo.archivo);
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    }
    const actualizado = await updatePresupuesto(req.params.id, {
      respaldos: (presupuesto.respaldos || []).filter(r => r.id !== req.params.respaldoId)
    });
    res.json({ success: true, presupuesto: actualizado });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// GASTOS
// ============================================================================

app.get('/api/gastos', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (ROLES_SIN_PRESUPUESTO.includes(req.session.user.rol)) return res.status(403).json({ error: 'Sin acceso a gastos' });
    const { proyecto, mes, rubro, responsable, estado, presupuestoId } = req.query;

    let lista = await getGastos();

    if (!esAccesoFinanzasCompleto(req.session.user)) {
      const proyectos = await getProyectos();
      const misProyectos = proyectos.filter(p => p.miembros.includes(req.session.user.email)).map(p => p.nombre);
      lista = lista.filter(g => misProyectos.includes(g.proyecto));
    }

    if (proyecto)      lista = lista.filter(g => g.proyecto === proyecto);
    if (mes)           lista = lista.filter(g => g.mes === mes);
    if (rubro)         lista = lista.filter(g => g.rubro === rubro);
    if (responsable)   lista = lista.filter(g => g.responsable === responsable);
    if (estado)        lista = lista.filter(g => g.estado === estado);
    if (presupuestoId) lista = lista.filter(g => g.presupuestoId === presupuestoId);

    res.json(lista.slice().reverse());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/gastos', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const { presupuestoId, tareaId, rubro, descripcion, monto, mes } = req.body;
    if (!presupuestoId || !rubro || !monto) return res.status(400).json({ error: 'presupuestoId, rubro y monto son requeridos' });

    const presupuesto = await getPresupuesto(presupuestoId);
    if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });

    if (!['aprobado', 'desembolsado', 'ejecucion'].includes(presupuesto.estado)) {
      return res.status(400).json({ error: 'Solo se puede registrar gastos en presupuestos aprobados o en ejecución' });
    }

    const proyectoObj = await findProyecto(presupuesto.proyecto);
    const esFinanzas = ROLES_FINANZAS.includes(req.session.user.rol);
    if (!esFinanzas && (!proyectoObj || !proyectoObj.miembros.includes(req.session.user.email))) {
      return res.status(403).json({ error: 'Solo los miembros del proyecto pueden registrar gastos' });
    }

    const nuevo = {
      id: Date.now().toString(),
      presupuestoId,
      tareaId: tareaId || null,
      proyecto: presupuesto.proyecto,
      mes: mes || presupuesto.mes,
      rubro,
      descripcion: descripcion || '',
      monto: Number(monto),
      responsable: req.session.user.email,
      responsableNombre: req.session.user.nombre,
      estado: 'pendiente',
      respaldos: [],
      creadoEn: new Date().toISOString()
    };
    await insertGasto(nuevo);
    addAuditLog(req.session.user.email, 'Registrar Gasto', `"${presupuesto.proyecto}" — ${rubro} Bs ${monto}`);
    res.json(nuevo);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/gastos/:id/estado', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (!ROLES_FINANZAS.includes(req.session.user.rol)) return res.status(403).json({ error: 'Solo finanzas puede cambiar el estado de gastos' });

    const gasto = await getGasto(req.params.id);
    if (!gasto) return res.status(404).json({ error: 'Gasto no encontrado' });

    const { estado } = req.body;
    if (!['pendiente', 'aprobado', 'rechazado'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

    const actualizado = await updateGasto(req.params.id, { estado, revisadoPor: req.session.user.email, revisadoEn: new Date().toISOString() });
    addAuditLog(req.session.user.email, 'Estado Gasto', `Gasto ${req.params.id} → ${estado}`);
    res.json({ success: true, gasto: actualizado });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/gastos/:id/respaldo', uploadPresupuesto.single('respaldo'), async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const gasto = await getGasto(req.params.id);
    if (!gasto) return res.status(404).json({ error: 'Gasto no encontrado' });

    const esResponsable = gasto.responsable === req.session.user.email;
    const esFinanzas = ROLES_FINANZAS.includes(req.session.user.rol);
    if (!esResponsable && !esFinanzas) return res.status(403).json({ error: 'Sin permiso' });
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    const respaldo = {
      id: Date.now().toString(),
      nombre: req.file.originalname,
      archivo: req.file.filename,
      url: `/uploads/presupuestos/${req.file.filename}`,
      subidoPor: req.session.user.email,
      fecha: new Date().toISOString()
    };
    const actualizado = await updateGasto(req.params.id, { respaldos: [...(gasto.respaldos || []), respaldo] });
    addAuditLog(req.session.user.email, 'Respaldo Gasto', `Gasto ${req.params.id} ← ${req.file.originalname}`);
    res.json({ success: true, respaldo, gasto: actualizado });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/gastos/:id/respaldo/:respaldoId', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const gasto = await getGasto(req.params.id);
    if (!gasto) return res.status(404).json({ error: 'Gasto no encontrado' });

    const esResponsable = gasto.responsable === req.session.user.email;
    const esFinanzas = ROLES_FINANZAS.includes(req.session.user.rol);
    if (!esResponsable && !esFinanzas) return res.status(403).json({ error: 'Sin permiso' });

    const respaldo = (gasto.respaldos || []).find(r => r.id === req.params.respaldoId);
    if (respaldo) {
      const ruta = path.join(UPLOADS_PRESUPUESTOS, respaldo.archivo);
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    }
    const actualizado = await updateGasto(req.params.id, {
      respaldos: (gasto.respaldos || []).filter(r => r.id !== req.params.respaldoId)
    });
    res.json({ success: true, gasto: actualizado });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// NOTIFICACIONES
// ============================================================================

app.get('/api/notificaciones', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    res.json(await getNotificaciones(req.session.user.email));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/notificaciones/:id/leer', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const n = await marcarNotificacionLeida(req.params.id, req.session.user.email);
    if (!n) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/notificaciones/leer-todas', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    await marcarTodasLeidas(req.session.user.email);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// RECURSOS — TABLETS, DOCUMENTOS, PRÉSTAMOS
// ============================================================================

function esEncargadoOAdmin(req) {
  return req.session.user && (req.session.user.esEncargadoRecursos || req.session.user.rol === 'admin');
}

app.get('/api/recursos/tablets', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const tablets = await getTablets();
    res.json(tablets.filter(t => t.activo));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/recursos/tablets', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (!esEncargadoOAdmin(req)) return res.status(403).json({ error: 'Solo encargados de recursos o admin pueden gestionar el catálogo' });
    const { id, nombre, descripcion } = req.body;
    if (!id || !nombre) return res.status(400).json({ error: 'ID y nombre son requeridos' });
    if (await getTablet(id.trim().toUpperCase())) return res.status(400).json({ error: 'Ya existe una tablet con ese ID' });
    const tablet = { id: id.trim().toUpperCase(), nombre: nombre.trim(), descripcion: descripcion || '', activo: true, creadoEn: new Date().toISOString() };
    await insertTablet(tablet);
    addAuditLog(req.session.user.email, 'Crear Tablet', `ID: ${tablet.id} — ${nombre}`);
    res.json(tablet);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/recursos/tablets/:id', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (!esEncargadoOAdmin(req)) return res.status(403).json({ error: 'Solo encargados de recursos o admin pueden gestionar el catálogo' });
    const prestamos = await getPrestamos();
    const prestadaActiva = prestamos.find(p => p.tipo === 'tablet' && p.recursoId === req.params.id && p.estado === 'prestado');
    if (prestadaActiva) return res.status(400).json({ error: 'No se puede eliminar: tablet actualmente prestada' });
    await deleteTablet(req.params.id);
    addAuditLog(req.session.user.email, 'Eliminar Tablet', `ID: ${req.params.id}`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/recursos/documentos', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const { q } = req.query;
    let docs = (await getDocumentos()).filter(d => d.activo);
    if (q) {
      const query = q.toLowerCase();
      docs = docs.filter(d =>
        d.nombre.toLowerCase().includes(query) ||
        d.carpetaId.toLowerCase().includes(query) ||
        (d.descripcion || '').toLowerCase().includes(query)
      );
    }
    res.json(docs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/recursos/documentos', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (!esEncargadoOAdmin(req)) return res.status(403).json({ error: 'Solo encargados de recursos o admin pueden gestionar el catálogo' });
    const { carpetaId, nombre, descripcion } = req.body;
    if (!carpetaId || !nombre) return res.status(400).json({ error: 'ID de carpeta y nombre son requeridos' });
    const doc = { id: Date.now().toString(), carpetaId: carpetaId.trim(), nombre: nombre.trim(), descripcion: descripcion || '', activo: true, creadoEn: new Date().toISOString() };
    await insertDocumento(doc);
    addAuditLog(req.session.user.email, 'Crear Documento', `Carpeta: ${carpetaId} — ${nombre}`);
    res.json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/recursos/documentos/:id', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (!esEncargadoOAdmin(req)) return res.status(403).json({ error: 'Solo encargados de recursos o admin pueden gestionar el catálogo' });
    await deleteDocumento(req.params.id);
    addAuditLog(req.session.user.email, 'Eliminar Documento', `ID: ${req.params.id}`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/recursos/prestamos', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    let lista = await getPrestamos();
    if (!esEncargadoOAdmin(req)) {
      lista = lista.filter(p => p.solicitante === req.session.user.email);
    }
    res.json([...lista].reverse());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/recursos/prestamos', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });

    if (!esEncargadoOAdmin(req)) {
      const proyectos = await getProyectos();
      const esMiembro = proyectos.some(p => Array.isArray(p.miembros) && p.miembros.includes(req.session.user.email));
      if (!esMiembro) return res.status(403).json({ error: 'Solo los miembros de un proyecto pueden solicitar préstamos' });
    }

    const { tipo, recursoId, recursoNombre, motivo } = req.body;
    if (!tipo || !recursoId) return res.status(400).json({ error: 'Tipo y recurso son requeridos' });
    if (!['tablet', 'documento'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });

    if (tipo === 'tablet' && !await getTablet(recursoId)) return res.status(404).json({ error: 'Tablet no encontrada' });
    if (tipo === 'documento' && !await getDocumento(recursoId)) return res.status(404).json({ error: 'Documento no encontrado' });

    const prestamos = await getPrestamos();
    const prestadoActivo = prestamos.find(p => p.tipo === tipo && p.recursoId === recursoId && p.estado === 'prestado');
    if (prestadoActivo) return res.status(400).json({ error: 'Este recurso ya está prestado actualmente' });

    const solicitudPendiente = prestamos.find(p =>
      p.tipo === tipo && p.recursoId === recursoId && p.estado === 'pendiente'
    );
    if (solicitudPendiente) return res.status(400).json({ error: 'Ya existe una solicitud pendiente para este recurso' });

    const nuevo = {
      id: Date.now().toString(),
      tipo, recursoId,
      recursoNombre: recursoNombre || recursoId,
      solicitante: req.session.user.email,
      solicitanteNombre: req.session.user.nombre,
      motivo: motivo || '',
      estado: 'pendiente',
      fechaSolicitud: new Date().toISOString(),
    };
    await insertPrestamo(nuevo);

    const usuariosActivos = await getUsuariosActivos();
    const encargados = usuariosActivos.filter(u => u.esEncargadoRecursos || u.rol === 'admin');
    notificarEquipo(
      encargados.map(u => u.email),
      'recurso',
      'Nueva solicitud de préstamo',
      `${req.session.user.nombre} solicita: ${nuevo.recursoNombre} (${tipo})`,
      { prestamoId: nuevo.id }
    );

    addAuditLog(req.session.user.email, 'Solicitud Préstamo', `${tipo}: ${nuevo.recursoNombre}`);
    res.json(nuevo);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/recursos/prestamos/:id/entregar', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (!esEncargadoOAdmin(req)) return res.status(403).json({ error: 'Solo encargados pueden entregar recursos' });

    const prestamo = await getPrestamo(req.params.id);
    if (!prestamo) return res.status(404).json({ error: 'Préstamo no encontrado' });
    if (prestamo.estado !== 'pendiente') return res.status(400).json({ error: 'Solo se pueden entregar solicitudes pendientes' });

    const { detalles } = req.body;
    const actualizado = await updatePrestamo(req.params.id, {
      estado: 'prestado',
      encargadoEntrega: req.session.user.email,
      encargadoEntregaNombre: req.session.user.nombre,
      fechaEntrega: new Date().toISOString(),
      detallesEntrega: detalles || '',
    });

    notificarEquipo(
      [prestamo.solicitante],
      'recurso',
      'Recurso entregado — eres responsable',
      `Tu solicitud de "${prestamo.recursoNombre}" fue aprobada y entregada. Eres responsable hasta la devolución.`,
      { prestamoId: prestamo.id }
    );

    addAuditLog(req.session.user.email, 'Entrega Recurso', `${prestamo.tipo}: ${prestamo.recursoNombre} → ${prestamo.solicitanteNombre}`);
    res.json(actualizado);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/recursos/prestamos/:id/devolver', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (!esEncargadoOAdmin(req)) return res.status(403).json({ error: 'Solo encargados pueden registrar devoluciones' });

    const prestamo = await getPrestamo(req.params.id);
    if (!prestamo) return res.status(404).json({ error: 'Préstamo no encontrado' });
    if (prestamo.estado !== 'prestado') return res.status(400).json({ error: 'Solo se pueden devolver recursos en estado prestado' });

    const { detalles } = req.body;
    const actualizado = await updatePrestamo(req.params.id, {
      estado: 'devuelto',
      encargadoDevolucion: req.session.user.email,
      encargadoDevolucionNombre: req.session.user.nombre,
      fechaDevolucion: new Date().toISOString(),
      detallesDevolucion: detalles || '',
    });

    addAuditLog(req.session.user.email, 'Devolución Recurso', `${prestamo.tipo}: ${prestamo.recursoNombre} ← ${prestamo.solicitanteNombre}`);
    res.json(actualizado);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/recursos/prestamos/:id/rechazar', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (!esEncargadoOAdmin(req)) return res.status(403).json({ error: 'Solo encargados pueden rechazar solicitudes' });

    const prestamo = await getPrestamo(req.params.id);
    if (!prestamo) return res.status(404).json({ error: 'Préstamo no encontrado' });
    if (prestamo.estado !== 'pendiente') return res.status(400).json({ error: 'Solo se pueden rechazar solicitudes pendientes' });

    const { detalles } = req.body;
    const actualizado = await updatePrestamo(req.params.id, {
      estado: 'rechazado',
      encargadoEntrega: req.session.user.email,
      encargadoEntregaNombre: req.session.user.nombre,
      fechaEntrega: new Date().toISOString(),
      detallesEntrega: detalles || '',
    });

    notificarEquipo(
      [prestamo.solicitante],
      'recurso',
      'Solicitud de préstamo rechazada',
      `Tu solicitud de "${prestamo.recursoNombre}" fue rechazada.${detalles ? ' Motivo: ' + detalles : ''}`,
      { prestamoId: prestamo.id }
    );

    addAuditLog(req.session.user.email, 'Rechazar Solicitud', `${prestamo.tipo}: ${prestamo.recursoNombre}`);
    res.json(actualizado);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// ADMIN — GESTIÓN DE USUARIOS
// ============================================================================

app.post('/api/admin/usuarios', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (req.session.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede crear usuarios' });

    const { email, nombre, rol, departamento, proyecto, supervisora, password, secciones, esEncargadoRecursos } = req.body;
    if (!email || !nombre || !rol || !password) return res.status(400).json({ error: 'Email, nombre, rol y contraseña son requeridos' });
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    if (await findUsuario(email.trim().toLowerCase())) return res.status(400).json({ error: 'Ya existe un usuario con ese correo' });

    const rolesValidos = ['admin', 'gerente', 'pi', 'responsable_financiero', 'coordinadora', 'becaria', 'asistente', 'pasante'];
    if (!rolesValidos.includes(rol)) return res.status(400).json({ error: 'Rol inválido' });

    const hash = await bcrypt.hash(password, 10);
    const nuevo = {
      email: email.trim().toLowerCase(),
      nombre: nombre.trim(),
      rol,
      activo: true,
      departamento: departamento || '',
      proyecto: proyecto || null,
      supervisora: supervisora || null,
      password_hash: hash,
      secciones: Array.isArray(secciones) ? secciones : null,
      esEncargadoRecursos: !!esEncargadoRecursos,
    };
    await insertUsuario(nuevo);
    addAuditLog(req.session.user.email, 'Crear Usuario', `${nuevo.email} (${rol})`);
    const { password_hash, ...rest } = nuevo;
    res.json({ success: true, usuario: rest });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/usuarios/:email', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (req.session.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede editar usuarios' });

    const rolesValidos = ['admin', 'gerente', 'pi', 'responsable_financiero', 'coordinadora', 'becaria', 'asistente', 'pasante'];
    const { rol, proyecto, equipo, equipos, esDirectiva, nombre, newEmail, secciones, esEncargadoRecursos } = req.body;

    const cambios = {};
    if (rol !== undefined) {
      if (!rolesValidos.includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
      cambios.rol = rol;
    }
    if (nombre !== undefined && nombre.trim()) cambios.nombre = nombre.trim();
    if (proyecto !== undefined) cambios.proyecto = proyecto || null;
    if (equipo !== undefined) cambios.equipo = equipo || null;
    if (equipos !== undefined) {
      cambios.equipos = Array.isArray(equipos) ? equipos : [];
      cambios.equipo = cambios.equipos[0] || null;
    }
    if (esDirectiva !== undefined) cambios.esDirectiva = !!esDirectiva;
    if (secciones !== undefined) cambios.secciones = Array.isArray(secciones) ? secciones : null;
    if (esEncargadoRecursos !== undefined) {
      if (esEncargadoRecursos) {
        const emailActualLocal = req.params.email;
        const usuariosActivos = await getUsuariosActivos();
        const encargadosActuales = usuariosActivos.filter(u => u.esEncargadoRecursos && u.email !== emailActualLocal);
        if (encargadosActuales.length >= 2) return res.status(400).json({ error: 'Solo se permiten 2 encargados de recursos.' });
      }
      cambios.esEncargadoRecursos = !!esEncargadoRecursos;
    }

    const emailActual = req.params.email;

    if (newEmail && newEmail.trim() && newEmail.trim() !== emailActual) {
      const usuariosActivos = await getUsuariosActivos();
      if (usuariosActivos.find(u => u.email === newEmail.trim())) {
        return res.status(400).json({ error: 'Ese correo ya está registrado' });
      }
      const actualizado = await changeEmailUsuario(emailActual, newEmail.trim());
      if (!actualizado) return res.status(404).json({ error: 'Usuario no encontrado' });
      if (Object.keys(cambios).length > 0) await updateUsuario(newEmail.trim(), cambios);
      addAuditLog(req.session.user.email, 'Editar Usuario', `${emailActual} → email=${newEmail.trim()}, ${Object.entries(cambios).map(([k,v])=>`${k}=${v}`).join(', ')}`);
      return res.json({ success: true });
    }

    const actualizado = await updateUsuario(emailActual, cambios);
    if (!actualizado) return res.status(404).json({ error: 'Usuario no encontrado' });

    const detalles = Object.entries(cambios).map(([k, v]) => `${k}=${v}`).join(', ');
    addAuditLog(req.session.user.email, 'Editar Usuario', `${emailActual}: ${detalles}`);
    res.json({ success: true, usuario: actualizado });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/usuarios/:email', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (req.session.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede eliminar usuarios' });
    const email = req.params.email;
    if (email === req.session.user.email) return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    const u = await findUsuario(email);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    const proyectos = await getProyectos();
    for (const p of proyectos) {
      if (p.miembros.includes(email)) {
        await updateMiembrosProyecto(p.nombre, p.miembros.filter(e => e !== email));
      }
    }
    await deleteUsuario(email);
    addAuditLog(req.session.user.email, 'Eliminar Usuario', email);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/usuarios/:email/password', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (req.session.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede resetear contraseñas' });
    const { password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    const hash = await bcrypt.hash(password, 10);
    await updatePassword(req.params.email, hash);
    addAuditLog(req.session.user.email, 'Reset Contraseña', req.params.email);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/usuarios/:email/encargado', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (req.session.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede asignar encargados' });
    const { esEncargadoRecursos } = req.body;

    if (esEncargadoRecursos) {
      const usuariosActivos = await getUsuariosActivos();
      const encargadosActuales = usuariosActivos.filter(u => u.esEncargadoRecursos && u.email !== req.params.email);
      if (encargadosActuales.length >= 2) {
        return res.status(400).json({ error: 'Solo se permiten 2 encargados de recursos. Quita uno primero.' });
      }
    }

    const actualizado = await updateUsuario(req.params.email, { esEncargadoRecursos: !!esEncargadoRecursos });
    if (!actualizado) return res.status(404).json({ error: 'Usuario no encontrado' });
    addAuditLog(req.session.user.email, 'Asignar Encargado', `${req.params.email} encargado=${esEncargadoRecursos}`);
    res.json(actualizado);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/usuarios/:email/proyectos', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (req.session.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede asignar proyectos' });
    const { proyectos } = req.body;
    if (!Array.isArray(proyectos)) return res.status(400).json({ error: 'proyectos debe ser un array' });
    const email = req.params.email;
    if (!await findUsuario(email)) return res.status(404).json({ error: 'Usuario no encontrado' });
    const todosProyectos = await getProyectos();
    for (const p of todosProyectos) {
      const debeEstar = proyectos.includes(p.nombre);
      const estaActual = p.miembros.includes(email);
      if (debeEstar && !estaActual) {
        await updateMiembrosProyecto(p.nombre, [...p.miembros, email]);
      } else if (!debeEstar && estaActual) {
        await updateMiembrosProyecto(p.nombre, p.miembros.filter(e => e !== email));
      }
    }
    await updateUsuario(email, { proyecto: proyectos[0] || null });
    addAuditLog(req.session.user.email, 'Asignar Proyectos', `${email} → [${proyectos.join(', ') || 'ninguno'}]`);
    res.json({ success: true, proyectos });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/usuarios/:email/secciones', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (req.session.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede modificar secciones' });
    const { secciones } = req.body;
    const actualizado = await updateUsuario(req.params.email, { secciones: Array.isArray(secciones) ? secciones : null });
    if (!actualizado) return res.status(404).json({ error: 'Usuario no encontrado' });
    addAuditLog(req.session.user.email, 'Actualizar Secciones', `${req.params.email}`);
    res.json(actualizado);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// CORRECCIÓN DE TEXTO — LanguageTool
// ============================================================================

app.post('/api/utils/corregir', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
  const { texto } = req.body;
  if (!texto?.trim()) return res.json({ texto: texto || '', nCorreciones: 0 });

  const https = require('https');
  const postData = new URLSearchParams({ text: texto, language: 'es' }).toString();

  const opciones = {
    hostname: 'api.languagetool.org',
    path: '/v2/check',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'Accept': 'application/json',
    },
    timeout: 9000,
  };

  const ltReq = https.request(opciones, (ltRes) => {
    let data = '';
    ltRes.on('data', chunk => data += chunk);
    ltRes.on('end', () => {
      try {
        const resultado = JSON.parse(data);
        const matches = (resultado.matches || []).filter(m => m.replacements?.length > 0);
        let textoCorregido = texto;
        [...matches].sort((a, b) => b.offset - a.offset).forEach(m => {
          const r = m.replacements[0].value;
          textoCorregido = textoCorregido.substring(0, m.offset) + r + textoCorregido.substring(m.offset + m.length);
        });
        res.json({ texto: textoCorregido, nCorreciones: matches.length });
      } catch {
        res.json({ texto, nCorreciones: 0 });
      }
    });
  });

  ltReq.on('error', () => res.json({ texto, nCorreciones: 0 }));
  ltReq.on('timeout', () => { ltReq.destroy(); res.json({ texto, nCorreciones: 0 }); });
  ltReq.write(postData);
  ltReq.end();
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ============================================================================
// INICIO
// ============================================================================

const PORT = process.env.PORT || 3000;

initSchema()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      const nets = require('os').networkInterfaces();
      let ipLocal = 'tu-ip-local';
      for (const iface of Object.values(nets).flat()) {
        if (iface.family === 'IPv4' && !iface.internal) { ipLocal = iface.address; break; }
      }

      console.log('\n╔════════════════════════════════════════════╗');
      console.log('║  SERVIDOR INICIADO                         ║');
      console.log('╚════════════════════════════════════════════╝\n');
      console.log(`  Local:      http://localhost:${PORT}`);
      console.log(`  Red local:  http://${ipLocal}:${PORT}  ← comparte esta URL\n`);
      console.log(`  Base de datos: PostgreSQL\n`);
    });
  })
  .catch(err => {
    console.error('❌ Error al conectar con PostgreSQL:', err.message);
    console.error('   Verifica DATABASE_URL en .env');
    process.exit(1);
  });

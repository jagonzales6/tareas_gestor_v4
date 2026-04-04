const { createApp } = Vue;

// Detectar automáticamente el host del backend
const HOSTNAME = window.location.hostname && window.location.hostname.trim() !== ''
  ? window.location.hostname
  : 'localhost';
const API_PORT = '3000';
const API_URL = `http://${HOSTNAME}:${API_PORT}/api`;

console.log(`🔗 Conectando a backend en: ${HOSTNAME}:${API_PORT}`);
console.log(`📡 API URL: ${API_URL}`);

const app = createApp({
  data() {
    return {
      cargando: true,
      autenticado: false,
      usuario: null,
      menuAbierto: false,
      esMobile: window.innerWidth <= 1024,
      institutionalBrand: {
        src: 'assets/logos/institutional-logos-v2.png',
        alt: 'Franja institucional de logos del Centro NIHR LatAm y socios',
        fallback: false
      },
      // Forms
      email: '',
      password: '',

      // UI
      tab: 'inicio',
      proyectoFiltro: null,
      auditSearch: '',
      auditActionFilter: '',
      memberSearchProyecto: '',
      memberSearchEdicion: '',
      memberSearchTarea: '',

      // Datos
      tareas: [],
      reuniones: [],
      miembros: [],
      proyectos: [],
      proyectosDetalle: [],
      auditoria: [],
      anuncios: [],

      // Hitos / Mastersheet
      mastersheet: null,
      hitos: [],
      propuestas: [],
      reporte: null,
      formularioHito: {
        nombre: '', descripcion: '',
        fechaInicio: '', fechaFin: '',
        responsablePrincipal: '', esCritico: false, orden: 0,
        macrotareas: []   // [{ id, nombre, responsable }]
      },
      nuevaMacrotarea: { nombre: '', responsable: '' },
      hitoEditando: null,
      mostrarFormHito: false,
      mostrarFormPropuesta: false,
      formularioPropuesta: { tipoCambio: 'fecha_objetivo', valorPropuesto: '', justificacion: '' },
      propuestaHitoId: null,
      hitoFiltroEstado: 'todos',
      nuevoEditorEmail: '',

      // Dashboard - anuncios
      mostrarFormAnuncio: false,
      nuevoAnuncio: { titulo: '', contenido: '', importante: false, archivoImagen: null },

      // Gestionar miembros
      miembrosSeleccionados: [],
      memberSearchGestion: '',
      memberSearchEquipo: '',
      filtroEquipoGestion: '',
      mensajeSolicitud: '',
      solicitudesEnviadas: [],
      mostrarFormSolicitud: false,

      // Perfil propio (solicitudes pendientes)
      solicitudesPendientes: [],
      formularioPerfil: { nombre: '', telefono: '', cargo: '', departamento: '' },
      mostrarFormPerfil: false,
      solicitudActivaId: null,

      // Formularios
      formularioTarea: {
        proyecto: '',
        descripcion: '',
        fechaVencimiento: '',
        responsables: [],
        notas: '',
        hitoId: '',
        macrotareaId: '',
        tieneCosto: false,
        costoMonto: '',
        costoDescripcion: ''
      },
      costoEnEdicion: {},           // { [tareaId]: { monto: '', descripcion: '' } }
      hitosDelProyectoTarea: [],   // hitos del proyecto seleccionado en form tarea
      formularioReunion: {
        proyecto: '',
        descripcion: '',
        fecha: '',
        horaInicio: '',
        horaFin: '',
        asistentes: [],
        modalidad: 'reunion',
        tipoReunion: 'especial'
      },
      formularioProyecto: {
        nombre: '',
        descripcion: '',
        miembros: [],
        editorMastersheet: ''
      },

      // Registrar tarea propia (miembros)
      formularioTareaPropia: {
        proyecto: '',
        descripcion: '',
        fechaVencimiento: '',
        notas: '',
        coResponsables: [],   // otros miembros que participaron
        archivoEvidencia: null,
        tieneCosto: false,
        costoMonto: '',
        costoDescripcion: '',
        archivoComprobante: null
      },
      memberSearchTareaPropia: '',

      // Google Calendar
      googleCalendarConfigurado: false,
      googleCalendarConectado: false,

      // Registrar reunión propia (todos los usuarios)
      formularioReunionPropia: {
        descripcion: '',
        fecha: '',
        horaInicio: '',
        horaFin: '',
        modalidad: 'presencial',
        enlace: '',
        asistentes: [],
      },
      memberSearchReunionPropia: '',

      // Asignar tarea desde panel SCRUM
      scrumTareaForm: {
        reunionId: null,
        proyecto: '',
        descripcion: '',
        responsables: [],
        fechaVencimiento: ''
      },
      scrumTareaAbierta: null,   // id de reunión con el subform abierto

      // Notas de reuniones
      reunionNotaForm: { reunionId: null, texto: '', tipo: 'nota' },
      reunionActaForm: { reunionId: null, texto: '' },
      reunionExpandida: null,   // id de la reunión con panel de notas abierto
      scrumActivo: null,        // id de la reunión con panel SCRUM abierto
      scrumTimer: { activo: false, segundos: 0, interval: null, horaInicio: null, horaFin: null },
      scrumSesiones: [],        // historial permanente de sesiones guardadas
      scrumHistorialActivo: [], // eventos acumulados de la sesión en curso
      scrumTareasActivo: [],    // IDs de tareas asignadas en la sesión en curso
      scrumSesionExpandida: null, // id de sesión del historial con detalle abierto
      // Crear SCRUM rápido desde la tab SCRUM
      mostrarFormCrearScrum: false,
      formularioCrearScrum: { proyecto: '', fecha: '', horaInicio: '', horaFin: '', asistentes: [] },
      memberSearchCrearScrum: '',
      // Programas SCRUM recurrentes
      scrumProgramas: [],
      mostrarFormPrograma: false,
      formularioPrograma: { proyecto: '', frecuencia: 'diario', hora: '09:00', asistentes: [] },
      memberSearchPrograma: '',

      // Editar proyecto existente (admin)
      proyectoEditando: null,
      formularioEditarProyecto: { miembros: [], editorMastersheet: '' },

      // ── PRESUPUESTOS ──────────────────────────────────────────────────────
      presupuestos: [],
      gastos: [],
      notificaciones: [],
      presupuestoExpandido: null,       // id del presupuesto con detalle abierto
      gastoRegistrandoEn: null,         // presupuestoId con form de gasto abierto

      // Corrección de texto
      _ltObserver: null,

      // Filtros vista finanzas
      filtroFinProyecto:    '',
      filtroFinMes:         '',
      filtroFinRubro:       '',
      filtroFinResponsable: '',
      filtroFinEstado:      '',
      filtroFinTabla:       'gastos',   // 'gastos' | 'presupuestos' | 'tareas-costo'
      tareasConCosto:       [],
      filtroTCProyecto:     '',
      filtroTCResponsable:  '',

      // Formulario nuevo presupuesto
      formularioPresupuesto: {
        proyecto:         '',
        mes:              '',
        descripcion:      '',
        items:            [{ rubro: '', descripcion: '', monto: '' }]
      },
      mostrarFormPresupuesto: false,

      // Formulario nuevo gasto
      formularioGasto: {
        presupuestoId: '',
        tareaId:       '',
        rubro:         '',
        descripcion:   '',
        monto:         ''
      },

      // Polling handle para notificaciones
      _notifPollId: null,

      // ── RECURSOS — PRÉSTAMOS ──────────────────────────────────────────────
      subTabRecursos: 'solicitar',
      prestamos: [],
      tablets: [],
      documentos: [],
      documentosBusqueda: [],
      busquedaDocumento: '',
      filtroEstadoPrestamo: 'todos',

      formularioSolicitud: { tipo: 'tablet', recursoId: '', recursoNombre: '', motivo: '' },

      prestamoAccionId: null,
      prestamoAccionTipo: null,   // 'entregar' | 'devolver' | 'rechazar'
      detallesAccionPrestamo: '',

      mostrarFormTablet: false,
      formularioTablet: { id: '', nombre: '', descripcion: '' },
      mostrarFormDocumento: false,
      formularioDocumento: { carpetaId: '', nombre: '', descripcion: '' },

      // ── ADMIN PERFIL UNIFICADO (crear / editar) ───────────────────────────
      mostrarFormPerfil: false,
      formularioPerfil: {
        _edicion: false, _emailOriginal: '',
        nombre: '', email: '', rol: 'asistente', password: '',
        equipos: [], proyectosAsignados: [],
        esDirectiva: false, secciones: [], esEncargadoRecursos: false,
      },
      equiposDisponibles: ['Comunicación', 'Campo', 'Análisis de Datos', 'Administrativo', 'Financiero', 'TI', 'Comité de Ética'],
      seccionesDisponibles: ['tareas', 'reuniones', 'scrum', 'registrar-tarea', 'registrar-reunion', 'reportes', 'presupuesto', 'finanzas', 'recursos'],

      // Recuperar contraseña (pantalla de login)
      vistaLogin: 'login', // 'login' | 'recuperar-paso1' | 'recuperar-paso2'
      recuperarEmail: '',
      recuperarCodigo: '',
      recuperarCodigoObtenido: '',
      recuperarNombre: '',
      recuperarPasswordNuevo: '',
      recuperarPasswordConfirm: '',

      // Cambiar contraseña (usuario autenticado)
      mostrarModalCambiarPassword: false,
      cambiarPassActual: '',
      cambiarPassNuevo: '',
      cambiarPassConfirm: '',
    };
  },

  computed: {
    reunionesScrum() {
      return this.reuniones.filter(r => r.modalidad === 'scrum');
    },
    puedePublicarAnuncios() {
      if (!this.usuario) return false;
      const equipos = this.usuario.equipos || (this.usuario.equipo ? [this.usuario.equipo] : []);
      return ['admin', 'gerente', 'coordinadora', 'pi'].includes(this.usuario.rol) || equipos.includes('comunicacion');
    },
    tareasPendientes() {
      const pendientes = this.tareas.filter(t => t.estado === 'Pendiente');
      if (this.proyectoFiltro) return pendientes.filter(t => t.proyecto === this.proyectoFiltro);
      return pendientes;
    },
    tareasCompletadas() {
      return this.tareas.filter(t => t.estado === 'Completada');
    },
    // Dashboard: tareas pendientes del usuario (máx 6)
    tareasPendientesResumen() {
      return this.tareas.filter(t => t.estado === 'Pendiente').slice(0, 6);
    },
    // Reuniones recientes (últimos 7 días) donde el usuario ya fue incluido por un compañero
    reunionesRecientesCompartidas() {
      if (!this.usuario) return [];
      const hace7dias = new Date();
      hace7dias.setDate(hace7dias.getDate() - 7);
      return this.reuniones
        .filter(r => r.creadoPor !== this.usuario.email &&
                     r.asistentes && r.asistentes.includes(this.usuario.email) &&
                     new Date(r.fechaCreacion) >= hace7dias)
        .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
        .slice(0, 5);
    },
    // Tareas recientes (últimos 7 días) donde el usuario fue incluido por un compañero
    tareasRecientesCompartidas() {
      if (!this.usuario) return [];
      const hace7dias = new Date();
      hace7dias.setDate(hace7dias.getDate() - 7);
      return this.tareas
        .filter(t => t.creadoPor !== this.usuario.email &&
                     t.responsables && t.responsables.includes(this.usuario.email) &&
                     new Date(t.fechaCreacion) >= hace7dias)
        .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
        .slice(0, 5);
    },
    // Dashboard: proyectos donde el usuario es miembro
    misProyectos() {
      if (!this.usuario) return [];
      const esAdmin = ['admin', 'gerente'].includes(this.usuario.rol);
      if (esAdmin) return this.proyectosDetalle;
      return this.proyectosDetalle.filter(p =>
        p.miembros && p.miembros.includes(this.usuario.email)
      );
    },
    // Dashboard: reuniones con fecha >= hoy (máx 5)
    reunionesProximas() {
      const hoy = new Date().toISOString().split('T')[0];
      return this.reuniones
        .filter(r => r.fecha && r.fecha >= hoy)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(0, 5);
    },
    // Fecha legible para la bienvenida
    fechaHoy() {
      return new Date().toLocaleDateString('es-BO', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    },
    pageTitle() {
      const titulos = {
        inicio: 'Inicio',
        tareas: 'Mis Tareas',
        reuniones: 'Mis Reuniones',
        'registrar-tarea': 'Registrar Tarea',
        'crear-tarea': 'Nueva Tarea',
        'crear-reunion': 'Nueva Reunión',
        proyectos: 'Proyectos',
        auditoria: 'Auditoría',
        miembros: 'Gestionar Miembros',
        resumen: 'Resumen General',
        hitos: 'Hitos',
        reportes: 'Reportes',
        presupuesto: 'Presupuestos',
        finanzas: 'Control de Gastos',
        notificaciones: 'Notificaciones',
        recursos: 'Préstamos de Recursos',
      };
      return titulos[this.tab] || 'Panel';
    },

    puedeEditarHitos() {
      if (!this.usuario || !this.mastersheet) return false;
      if (this.usuario.rol === 'admin') return true;
      return Array.isArray(this.mastersheet.editores) &&
             this.mastersheet.editores.includes(this.usuario.email);
    },

    puedeVerRecursos() {
      if (!this.usuario) return false;
      if (this.usuario.rol === 'admin' || this.usuario.esEncargadoRecursos) return true;
      // Solo miembros de al menos un proyecto pueden solicitar préstamos
      return this.proyectosDetalle.some(p => p.miembros && p.miembros.includes(this.usuario.email));
    },

    esEncargadoOAdmin() {
      return !!(this.usuario?.esEncargadoRecursos || this.usuario?.rol === 'admin');
    },

    misSolicitudesPrestamos() {
      return this.prestamos.filter(p => p.solicitante === this.usuario?.email);
    },

    prestamosParaGestionar() {
      return this.prestamos;
    },

    prestamosFiltradosGestion() {
      if (this.filtroEstadoPrestamo === 'todos') return this.prestamos;
      return this.prestamos.filter(p => p.estado === this.filtroEstadoPrestamo);
    },
    rolFormateado() {
      if (!this.usuario?.rol) return '';
      return this.usuario.rol
        .split('_')
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
    },
    miembrosFiltradosProyecto() {
      const query = this.memberSearchProyecto.trim().toLowerCase();
      if (!query) return this.miembros;
      return this.miembros.filter(miembro =>
        miembro.nombre.toLowerCase().includes(query) ||
        miembro.email.toLowerCase().includes(query)
      );
    },
    miembrosFiltradosEdicion() {
      const query = this.memberSearchEdicion.trim().toLowerCase();
      if (!query) return this.miembros;
      return this.miembros.filter(miembro =>
        miembro.nombre.toLowerCase().includes(query) ||
        miembro.email.toLowerCase().includes(query)
      );
    },
    miembrosFiltradosTarea() {
      const query = this.memberSearchTarea.trim().toLowerCase();
      if (!query) return this.miembros;
      return this.miembros.filter(miembro =>
        miembro.nombre.toLowerCase().includes(query) ||
        miembro.email.toLowerCase().includes(query)
      );
    },
    // Miembros para la tarea propia (excluye al usuario actual ya que se añade automáticamente)
    miembrosFiltradosTareaPropia() {
      const query = this.memberSearchTareaPropia.trim().toLowerCase();
      const lista = this.miembros.filter(m => m.email !== this.usuario?.email);
      if (!query) return lista;
      return lista.filter(m =>
        m.nombre.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query)
      );
    },
    miembrosFiltradosReunionPropia() {
      const query = this.memberSearchReunionPropia.trim().toLowerCase();
      const lista = this.miembros.filter(m => m.email !== this.usuario?.email);
      if (!query) return lista;
      return lista.filter(m =>
        m.nombre.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query)
      );
    },
    miembrosFiltradosCrearScrum() {
      const query = this.memberSearchCrearScrum.trim().toLowerCase();
      const proyectoDetalle = this.proyectosDetalle.find(p => p.nombre === this.formularioCrearScrum.proyecto);
      const base = proyectoDetalle
        ? this.miembros.filter(m => proyectoDetalle.miembros.includes(m.email))
        : this.miembros;
      if (!query) return base;
      return base.filter(m =>
        m.nombre.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query)
      );
    },
    miembrosFiltradosPrograma() {
      const query = this.memberSearchPrograma.trim().toLowerCase();
      // Filtra por miembros del proyecto seleccionado si hay uno
      const proyectoDetalle = this.proyectosDetalle.find(p => p.nombre === this.formularioPrograma.proyecto);
      const base = proyectoDetalle
        ? this.miembros.filter(m => proyectoDetalle.miembros.includes(m.email))
        : this.miembros;
      if (!query) return base;
      return base.filter(m =>
        m.nombre.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query)
      );
    },
    proyectoSeleccionadoDetalle() {
      if (!this.formularioTarea.proyecto) return null;
      return this.proyectosDetalle.find(proyecto => proyecto.nombre === this.formularioTarea.proyecto) || null;
    },
    tareasProyectoSeleccionado() {
      if (!this.formularioTarea.proyecto) return 0;
      return this.tareas.filter(tarea => tarea.proyecto === this.formularioTarea.proyecto).length;
    },
    responsablesSeleccionadosTarea() {
      return this.formularioTarea.responsables
        .map(email => this.obtenerMiembro(email) || { nombre: email, email })
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    },
    resumenFechaVencimientoTarea() {
      if (!this.formularioTarea.fechaVencimiento) return 'Sin definir';
      return this.formatearFechaProyecto(this.formularioTarea.fechaVencimiento);
    },
    proximoMiercoles() {
      const hoy = new Date();
      const dia = hoy.getDay(); // 0=dom, 3=mie
      const diasFalta = (3 - dia + 7) % 7 || 7; // si hoy es miercoles, el proximo
      const mie = new Date(hoy);
      mie.setDate(hoy.getDate() + diasFalta);
      return mie.toISOString().split('T')[0];
    },
    accionesAuditoria() {
      return [...new Set(this.auditoria.map(log => log.accion).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    },
    auditoriaFiltrada() {
      const search = this.auditSearch.trim().toLowerCase();
      return this.auditoria.filter(log => {
        const matchesSearch = !search || [log.usuario, log.accion, log.detalles, log.timestamp]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(search));
        const matchesAction = !this.auditActionFilter || log.accion === this.auditActionFilter;
        return matchesSearch && matchesAction;
      });
    },
    totalUsuariosAuditoria() {
      return new Set(this.auditoria.map(log => log.usuario).filter(Boolean)).size;
    },
    totalRegistrosHoy() {
      const hoy = new Date().toISOString().slice(0, 10);
      return this.auditoria.filter(log => String(log.timestamp || '').startsWith(hoy)).length;
    },
    miembrosFiltradosEquipoGestion() {
      let lista = this.miembros;
      const q = this.memberSearchEquipo.trim().toLowerCase();
      if (q) lista = lista.filter(m =>
        m.nombre.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      );
      const f = this.filtroEquipoGestion;
      if (f === '__directiva__') {
        lista = lista.filter(m => this.esDirectivaMiembro(m));
      } else if (f.startsWith('proy:')) {
        const pNombre = f.slice(5);
        lista = lista.filter(m => this.proyectosDeUsuario(m.email).includes(pNombre));
      } else if (f.startsWith('eq:')) {
        const eqNombre = f.slice(3);
        lista = lista.filter(m => (m.equipos || []).includes(eqNombre));
      }
      return lista;
    },
    miembrosFiltradosGestion() {
      const q = this.memberSearchGestion.trim().toLowerCase();
      if (!q) return this.miembros;
      return this.miembros.filter(m =>
        m.nombre.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      );
    },

    // ── PRESUPUESTOS ──────────────────────────────────────────────────────
    notificacionesNoLeidas() {
      return this.notificaciones.filter(n => !n.leida).length;
    },
    mesActual() {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },
    mesSiguiente() {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },
    puedeCrearPresupuestoSiguiente() {
      return new Date().getDate() <= 24;
    },
    puedeVerPresupuesto() {
      if (!this.usuario) return false;
      if (['pasante', 'becaria'].includes(this.usuario.rol)) return false;
      return true;
    },
    esEquipoFinanciero() {
      if (!this.usuario) return false;
      const equipos = this.usuario.equipos || (this.usuario.equipo ? [this.usuario.equipo] : []);
      return equipos.includes('Financiero');
    },
    misPresupuestos() {
      if (!this.usuario) return [];
      if (['pasante', 'becaria'].includes(this.usuario.rol)) return []; // sin acceso
      const esFinanzasCompleto = ['admin', 'gerente', 'responsable_financiero', 'pi'].includes(this.usuario.rol)
        || this.esEquipoFinanciero;
      if (esFinanzasCompleto) return this.presupuestos;
      // coordinadora y asistente: solo sus proyectos
      const misProyectosNombres = this.misProyectos.map(p => p.nombre);
      return this.presupuestos.filter(p => misProyectosNombres.includes(p.proyecto));
    },
    rubrosPresupuesto() {
      return ['Recursos Humanos', 'Material e Insumos', 'Equipamiento', 'Viajes y Transporte', 'Servicios Profesionales', 'Comunicación', 'Capacitación', 'Otros'];
    },
    gastosFiltrados() {
      let lista = this.gastos;
      if (this.filtroFinProyecto)    lista = lista.filter(g => g.proyecto === this.filtroFinProyecto);
      if (this.filtroFinMes)         lista = lista.filter(g => g.mes === this.filtroFinMes);
      if (this.filtroFinRubro)       lista = lista.filter(g => g.rubro === this.filtroFinRubro);
      if (this.filtroFinResponsable) lista = lista.filter(g => g.responsable === this.filtroFinResponsable);
      if (this.filtroFinEstado)      lista = lista.filter(g => g.estado === this.filtroFinEstado);
      return lista;
    },
    presupuestosFiltrados() {
      let lista = this.presupuestos;
      if (this.filtroFinProyecto) lista = lista.filter(p => p.proyecto === this.filtroFinProyecto);
      if (this.filtroFinMes)      lista = lista.filter(p => p.mes === this.filtroFinMes);
      if (this.filtroFinEstado)   lista = lista.filter(p => p.estado === this.filtroFinEstado);
      return lista;
    },
    totalGastosFiltrados() {
      return this.gastosFiltrados.reduce((s, g) => s + (Number(g.monto) || 0), 0);
    },
    proyectosConPresupuesto() {
      return [...new Set(this.presupuestos.map(p => p.proyecto))];
    },
    mesesConActividad() {
      const meses = [...new Set([...this.presupuestos.map(p => p.mes), ...this.gastos.map(g => g.mes)])].filter(Boolean).sort().reverse();
      return meses;
    },
    rubrosConGasto() {
      return [...new Set(this.gastos.map(g => g.rubro))].filter(Boolean).sort();
    },
    tareasConCostoFiltradas() {
      let lista = this.tareasConCosto;
      if (this.filtroTCProyecto)    lista = lista.filter(t => t.proyecto === this.filtroTCProyecto);
      if (this.filtroTCResponsable) lista = lista.filter(t => t.responsables.includes(this.filtroTCResponsable));
      return lista;
    },
    totalTareasConCosto() {
      return this.tareasConCostoFiltradas.reduce((s, t) => s + (Number(t.costoMonto) || 0), 0);
    }
  },

  watch: {
    tab(val) {
      if (this.esMobile) this.menuAbierto = false;
      if (val === 'scrum') {
        this.cargarScrumProgramas();
        this.generarScrumHoy();
      }
    }
  },

  methods: {
    toggleMenu() {
      if (!this.esMobile) return;
      this.menuAbierto = !this.menuAbierto;
    },

    closeMenu() {
      this.menuAbierto = false;
    },

    onResize() {
      this.esMobile = window.innerWidth <= 1024;
      if (!this.esMobile) this.menuAbierto = false;
    },

    seleccionarTodosMiembrosProyecto() {
      this.formularioProyecto.miembros = this.miembros.map(miembro => miembro.email);
    },

    limpiarMiembrosProyecto() {
      this.formularioProyecto.miembros = [];
    },

    seleccionarTodosMiembrosEdicion() {
      this.formularioEditarProyecto.miembros = this.miembros.map(miembro => miembro.email);
    },

    limpiarMiembrosEdicion() {
      this.formularioEditarProyecto.miembros = [];
    },

    seleccionarTodosResponsablesTarea() {
      this.formularioTarea.responsables = this.miembros.map(miembro => miembro.email);
    },

    limpiarResponsablesTarea() {
      this.formularioTarea.responsables = [];
    },

    obtenerMiembro(email) {
      return this.miembros.find(miembro => miembro.email === email) || null;
    },

    nombreMiembro(email) {
      return this.obtenerMiembro(email)?.nombre || email;
    },

    inicialesMiembro(email) {
      const referencia = this.nombreMiembro(email);
      return referencia
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(parte => parte.charAt(0).toUpperCase())
        .join('');
    },

    formatearFechaProyecto(fecha) {
      if (!fecha) return 'Sin fecha';
      const base = String(fecha).includes('T') ? new Date(fecha) : new Date(`${fecha}T12:00:00`);
      if (Number.isNaN(base.getTime())) return fecha;
      return base.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    formatearFechaAuditoria(fecha) {
      if (!fecha) return '--';
      const base = new Date(fecha);
      if (Number.isNaN(base.getTime())) return fecha;
      return base.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    formatearHoraAuditoria(fecha) {
      if (!fecha) return '--';
      const base = new Date(fecha);
      if (Number.isNaN(base.getTime())) return '--';
      return base.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    },

    claseAccionAuditoria(accion = '') {
      const valor = accion.toLowerCase();
      if (valor.includes('iniciada') || valor.includes('crear') || valor.includes('asignar')) return 'audit-badge-success';
      if (valor.includes('editar') || valor.includes('actualizar')) return 'audit-badge-info';
      if (valor.includes('cerrada') || valor.includes('eliminar')) return 'audit-badge-danger';
      return 'audit-badge-neutral';
    },

    // ========================================================================
    // AUTENTICACIÓN
    // ========================================================================

    async loginLocal() {
      if (!this.email || !this.password) {
        alert('Completa email y contraseña');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: this.email, password: this.password })
        });

        if (response.ok) {
          const data = await response.json();
          this.usuario = data.user;
          localStorage.setItem('usuario', JSON.stringify(this.usuario));
          this.autenticado = true;
          this.tab = 'inicio';
          this.password = '';

          this.cargarMiembros();
          this.cargarProyectos();
          this.cargarTareas();
          this.cargarReuniones();
          this.cargarAnuncios();
          this.verificarGoogleCalendar();
          this.cargarSolicitudes();
          this.cargarScrumSesiones();
          this.cargarTablets();
          this.cargarDocumentos();
          if (this.puedeVerRecursos) this.cargarPrestamos();

          if (this.usuario.rol === 'admin') {
            this.cargarAuditoria();
          }
        } else {
          const error = await response.json();
          alert(error.error || 'Error al iniciar sesión');
        }
      } catch (error) {
        alert('Error de conexión: ' + error.message);
        console.error(error);
      }
    },

    async logout() {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (error) {
        console.error('Error en logout:', error);
      }

      localStorage.removeItem('usuario');
      this.usuario = null;
      this.autenticado = false;
      this.tab = 'inicio';
      this.vistaLogin = 'login';
    },

    async solicitarRecuperacion() {
      if (!this.recuperarEmail) { alert('Ingresa tu correo electrónico'); return; }
      try {
        const res = await fetch(`${API_URL}/auth/solicitar-recuperacion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: this.recuperarEmail })
        });
        const data = await res.json();
        if (res.ok && data.success && data.codigo) {
          this.recuperarCodigoObtenido = data.codigo;
          this.recuperarNombre = data.nombre || '';
          this.vistaLogin = 'recuperar-paso2';
        } else {
          alert(data.error || 'Error al solicitar recuperación');
        }
      } catch (e) { alert('Error de conexión: ' + e.message); }
    },

    async confirmarRecuperacion() {
      if (!this.recuperarCodigo || !this.recuperarPasswordNuevo || !this.recuperarPasswordConfirm) {
        alert('Completa todos los campos'); return;
      }
      if (this.recuperarPasswordNuevo !== this.recuperarPasswordConfirm) {
        alert('Las contraseñas no coinciden'); return;
      }
      if (this.recuperarPasswordNuevo.length < 8) {
        alert('La contraseña debe tener al menos 8 caracteres'); return;
      }
      try {
        const res = await fetch(`${API_URL}/auth/confirmar-recuperacion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: this.recuperarEmail,
            codigo: this.recuperarCodigo,
            passwordNuevo: this.recuperarPasswordNuevo
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alert('¡Contraseña actualizada! Ya puedes iniciar sesión.');
          this.vistaLogin = 'login';
          this.recuperarEmail = '';
          this.recuperarCodigo = '';
          this.recuperarCodigoObtenido = '';
          this.recuperarNombre = '';
          this.recuperarPasswordNuevo = '';
          this.recuperarPasswordConfirm = '';
        } else {
          alert(data.error || 'Error al confirmar recuperación');
        }
      } catch (e) { alert('Error de conexión: ' + e.message); }
    },

    async cambiarPassword() {
      if (!this.cambiarPassActual || !this.cambiarPassNuevo || !this.cambiarPassConfirm) {
        alert('Completa todos los campos'); return;
      }
      if (this.cambiarPassNuevo !== this.cambiarPassConfirm) {
        alert('Las contraseñas nuevas no coinciden'); return;
      }
      if (this.cambiarPassNuevo.length < 8) {
        alert('La contraseña debe tener al menos 8 caracteres'); return;
      }
      try {
        const res = await fetch(`${API_URL}/auth/cambiar-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ passwordActual: this.cambiarPassActual, passwordNuevo: this.cambiarPassNuevo })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alert('¡Contraseña actualizada exitosamente!');
          this.mostrarModalCambiarPassword = false;
          this.cambiarPassActual = '';
          this.cambiarPassNuevo = '';
          this.cambiarPassConfirm = '';
        } else {
          alert(data.error || 'Error al cambiar contraseña');
        }
      } catch (e) { alert('Error de conexión: ' + e.message); }
    },

    // ========================================================================
    // CARGA DE DATOS
    // ========================================================================

    async cargarTareas() {
      try {
        const response = await fetch(`${API_URL}/tareas`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          this.tareas = await response.json();
          console.log('✓ Tareas cargadas:', this.tareas.length);
        } else if (response.status === 401) {
          this.logout();
        }
      } catch (error) {
        console.error('Error cargar tareas:', error);
      }
    },

    async cargarReuniones() {
      try {
        const response = await fetch(`${API_URL}/reuniones`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          this.reuniones = await response.json();
          console.log('✓ Reuniones cargadas:', this.reuniones.length);
        }
      } catch (error) {
        console.error('Error cargar reuniones:', error);
      }
    },

    async cargarMiembros() {
      try {
        const response = await fetch(`${API_URL}/config/miembros`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          this.miembros = await response.json();
          console.log('✓ Miembros cargados:', this.miembros.length);
        }
      } catch (error) {
        console.error('Error cargar miembros:', error);
      }
    },

    async cargarProyectos() {
      try {
        // Cargar nombres de proyectos para selects
        const response = await fetch(`${API_URL}/config/proyectos`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          this.proyectos = await response.json();
          console.log('✓ Proyectos cargados:', this.proyectos);
        }

        // Cargar proyectos con detalles (incluyendo miembros)
        const responseDetalle = await fetch(`${API_URL}/proyectos`, {
          credentials: 'include'
        });

        if (responseDetalle.ok) {
          this.proyectosDetalle = await responseDetalle.json();
          console.log('✓ Proyectos detalle cargados:', this.proyectosDetalle);
        }
      } catch (error) {
        console.error('Error cargar proyectos:', error);
      }
    },

    async cargarAnuncios() {
      try {
        const r = await fetch(`${API_URL}/anuncios`, { credentials: 'include' });
        if (r.ok) this.anuncios = await r.json();
      } catch (e) { console.error('Error cargar anuncios:', e); }
    },

    async cargarSolicitudes() {
      try {
        const r = await fetch(`${API_URL}/solicitudes-actualizacion`, { credentials: 'include' });
        if (!r.ok) return;
        const data = await r.json();
        const esAdmin = ['admin', 'gerente'].includes(this.usuario?.rol);
        if (esAdmin) {
          this.solicitudesEnviadas = data;
        } else {
          this.solicitudesPendientes = data;
          if (data.length > 0 && !this.mostrarFormPerfil) {
            const sol = data[0];
            this.solicitudActivaId = sol.id;
            // Pre-rellenar con datos actuales
            this.formularioPerfil = {
              nombre: this.usuario.nombre || '',
              telefono: this.usuario.telefono || '',
              cargo: this.usuario.cargo || '',
              departamento: this.usuario.departamento || ''
            };
            this.mostrarFormPerfil = true;
          }
        }
      } catch (e) { console.error('Error cargar solicitudes:', e); }
    },

    async cargarAuditoria() {
      try {
        const response = await fetch(`${API_URL}/auditoria`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          this.auditoria = await response.json();
          console.log('✓ Auditoría cargada:', this.auditoria.length);
        }
      } catch (error) {
        console.error('Error cargar auditoría:', error);
      }
    },

    // ========================================================================
    // CREAR ITEMS
    // ========================================================================

    // ========================================================================
    // DASHBOARD
    // ========================================================================

    irAProyecto(nombre) {
      this.proyectoFiltro = nombre;
      this.tab = 'tareas';
    },

    estaVencida(fecha) {
      if (!fecha) return false;
      return fecha < new Date().toISOString().split('T')[0];
    },

    diaReunion(fecha) {
      if (!fecha) return '--';
      return new Date(fecha + 'T12:00:00').getDate();
    },

    mesReunion(fecha) {
      if (!fecha) return '';
      return new Date(fecha + 'T12:00:00').toLocaleDateString('es-BO', { month: 'short' }).toUpperCase();
    },

    async crearAnuncio() {
      try {
        const { titulo, contenido, importante, archivoImagen } = this.nuevoAnuncio;
        const r = await fetch(`${API_URL}/anuncios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ titulo, contenido, importante })
        });
        if (r.ok) {
          const anuncio = await r.json();
          // Si hay imagen, subirla al anuncio recién creado
          if (archivoImagen) await this.subirImagenAnuncio(anuncio.id, archivoImagen);
          this.nuevoAnuncio = { titulo: '', contenido: '', importante: false, archivoImagen: null };
          const imgInput = document.getElementById('anuncio-imagen-input');
          if (imgInput) imgInput.value = '';
          this.mostrarFormAnuncio = false;
          await this.cargarAnuncios();
        } else {
          const err = await r.json();
          alert(err.error);
        }
      } catch (e) { alert('Error: ' + e.message); }
    },

    async eliminarAnuncio(id) {
      if (!confirm('¿Eliminar este anuncio?')) return;
      try {
        const r = await fetch(`${API_URL}/anuncios/${id}`, {
          method: 'DELETE', credentials: 'include'
        });
        if (r.ok) await this.cargarAnuncios();
      } catch (e) { alert('Error: ' + e.message); }
    },

    // ========================================================================
    // CREAR ITEMS
    // ========================================================================

    async crearTarea() {
      try {
        const { proyecto, descripcion, fechaVencimiento, responsables, notas, hitoId, macrotareaId, tieneCosto, costoMonto, costoDescripcion } = this.formularioTarea;

        if (!proyecto || !descripcion || responsables.length === 0) {
          alert('⚠️ Completa los campos requeridos');
          return;
        }
        if (tieneCosto && (!costoMonto || Number(costoMonto) <= 0)) {
          alert('⚠️ Ingresa un monto válido para el costo');
          return;
        }

        const response = await fetch(`${API_URL}/tareas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            proyecto, descripcion, fechaVencimiento, responsables, notas,
            hitoId: hitoId || null,
            macrotareaId: macrotareaId || null,
            tieneCosto,
            costoMonto: tieneCosto ? Number(costoMonto) : null,
            costoDescripcion: tieneCosto ? costoDescripcion : '',
          })
        });

        if (response.ok) {
          alert('✅ Tarea creada exitosamente');
          this.formularioTarea = {
            proyecto: '', descripcion: '', fechaVencimiento: '',
            responsables: [], notas: '', hitoId: '', macrotareaId: '',
            tieneCosto: false, costoMonto: '', costoDescripcion: ''
          };
          this.hitosDelProyectoTarea = [];
          this.memberSearchTarea = '';

          // Recargar tareas
          await this.cargarTareas();
        } else {
          const error = await response.json();
          alert('❌ Error: ' + error.error);
        }
      } catch (error) {
        alert('❌ Error: ' + error.message);
        console.error(error);
      }
    },

    async crearReunion() {
      try {
        const { proyecto, descripcion, fecha, horaInicio, horaFin, asistentes, modalidad, tipoReunion } = this.formularioReunion;

        if (!proyecto || !descripcion || asistentes.length === 0) {
          alert('⚠️ Completa los campos requeridos');
          return;
        }

        const response = await fetch(`${API_URL}/reuniones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ proyecto, descripcion, fecha, horaInicio, horaFin, asistentes, modalidad, tipoReunion })
        });

        if (response.ok) {
          alert('✅ Reunión creada exitosamente');
          this.formularioReunion = {
            proyecto: '', descripcion: '', fecha: '', horaInicio: '', horaFin: '',
            asistentes: [], modalidad: 'reunion', tipoReunion: 'especial'
          };
          await this.cargarReuniones();
        } else {
          const error = await response.json();
          alert('❌ Error: ' + error.error);
        }
      } catch (error) {
        alert('❌ Error: ' + error.message);
        console.error(error);
      }
    },

    async crearProyecto() {
      try {
        const { nombre, descripcion, miembros, editorMastersheet } = this.formularioProyecto;

        if (!nombre) {
          alert('⚠️ Ingresa el nombre del proyecto');
          return;
        }

        if (miembros.length === 0) {
          alert('⚠️ Selecciona al menos un miembro');
          return;
        }

        if (!editorMastersheet) {
          alert('⚠️ Designa un administrador del Mastersheet');
          return;
        }

        const response = await fetch(`${API_URL}/proyectos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            nombre: nombre.trim(),
            descripcion: (descripcion || '').trim(),
            miembros,
            editorEmail: editorMastersheet
          })
        });

        if (response.ok) {
          const data = await response.json();
          alert('✅ ' + data.message);

          // Limpiar formulario
          this.formularioProyecto = {
            nombre: '',
            descripcion: '',
            miembros: [],
            editorMastersheet: ''
          };
          this.memberSearchProyecto = '';

          // Recargar proyectos
          await this.cargarProyectos();
        } else {
          const error = await response.json();
          alert('❌ Error: ' + error.error);
        }
      } catch (error) {
        alert('❌ Error: ' + error.message);
        console.error(error);
      }
    },

    // ========================================================================
    // ACTUALIZAR ITEMS
    // ========================================================================

    capturarEvidenciaPropia(evento) {
      this.formularioTareaPropia.archivoEvidencia = evento.target.files[0] || null;
    },

    async registrarTareaPropia() {
      try {
        const { proyecto, descripcion, fechaVencimiento, notas, coResponsables, archivoEvidencia, tieneCosto, costoMonto, costoDescripcion, archivoComprobante } = this.formularioTareaPropia;
        if (!proyecto || !descripcion) {
          alert('Completa proyecto y descripción');
          return;
        }
        if (tieneCosto && (!costoMonto || Number(costoMonto) <= 0)) {
          alert('⚠️ Ingresa un monto válido para el costo');
          return;
        }

        // El usuario actual siempre se incluye + los co-responsables elegidos
        const responsables = [this.usuario.email, ...coResponsables.filter(e => e !== this.usuario.email)];

        const response = await fetch(`${API_URL}/tareas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            proyecto, descripcion, fechaVencimiento, responsables, notas,
            tieneCosto,
            costoMonto: tieneCosto ? Number(costoMonto) : null,
            costoDescripcion: tieneCosto ? costoDescripcion : ''
          })
        });

        if (!response.ok) {
          const error = await response.json();
          alert('Error: ' + error.error);
          return;
        }

        const tareaCreada = await response.json();

        // Si hay evidencia, subirla inmediatamente
        if (archivoEvidencia) {
          const form = new FormData();
          form.append('evidencia', archivoEvidencia);
          await fetch(`${API_URL}/tareas/${tareaCreada.id}/evidencia`, {
            method: 'POST',
            credentials: 'include',
            body: form
          });
        }

        // Si hay comprobante, subirlo (esto también notificará a finanzas)
        if (tieneCosto && archivoComprobante) {
          const formComp = new FormData();
          formComp.append('comprobante', archivoComprobante);
          await fetch(`${API_URL}/tareas/${tareaCreada.id}/comprobantes`, {
            method: 'POST',
            credentials: 'include',
            body: formComp
          });
        }

        const msg = tieneCosto && archivoComprobante
          ? ' con costo y comprobante (sector financiero notificado)'
          : tieneCosto ? ' con costo registrado' : archivoEvidencia ? ' con evidencia' : '';
        alert('✅ Tarea registrada exitosamente' + msg);
        this.formularioTareaPropia = { proyecto: '', descripcion: '', fechaVencimiento: '', notas: '', coResponsables: [], archivoEvidencia: null, tieneCosto: false, costoMonto: '', costoDescripcion: '', archivoComprobante: null };
        this.memberSearchTareaPropia = '';
        // Limpiar inputs file
        const inputFile = document.getElementById('ev-propia');
        if (inputFile) inputFile.value = '';
        const inputComp = document.getElementById('comp-propia');
        if (inputComp) inputComp.value = '';
        await this.cargarTareas();
      } catch (error) {
        alert('Error: ' + error.message);
      }
    },

    async editarProyecto(proyecto) {
      this.proyectoEditando = proyecto;
      this.memberSearchEdicion = '';
      // Cargar el editor actual del mastersheet
      let editorActual = '';
      try {
        const r = await fetch(`${API_URL}/mastersheet/${encodeURIComponent(proyecto.nombre)}`, { credentials: 'include' });
        if (r.ok) {
          const ms = await r.json();
          editorActual = (ms.editores && ms.editores[0]) || '';
        }
      } catch (_) { /* sin mastersheet aún */ }
      this.formularioEditarProyecto = { miembros: [...proyecto.miembros], editorMastersheet: editorActual };
    },

    cancelarEdicionProyecto() {
      this.proyectoEditando = null;
      this.memberSearchEdicion = '';
      this.formularioEditarProyecto = { miembros: [], editorMastersheet: '' };
    },

    async guardarEdicionProyecto() {
      try {
        const nombre = this.proyectoEditando.nombre;
        const { miembros, editorMastersheet } = this.formularioEditarProyecto;

        if (!editorMastersheet) {
          alert('⚠️ Designa un administrador del Mastersheet');
          return;
        }

        // 1) Guardar miembros
        const response = await fetch(`${API_URL}/proyectos/${encodeURIComponent(nombre)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ miembros })
        });
        if (!response.ok) {
          const error = await response.json();
          alert('Error: ' + error.error);
          return;
        }

        // 2) Actualizar editor del mastersheet
        const rEditor = await fetch(`${API_URL}/mastersheet/${encodeURIComponent(nombre)}/editor`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ editorEmail: editorMastersheet })
        });
        if (!rEditor.ok) {
          const err = await rEditor.json();
          alert('Miembros guardados, pero error al asignar editor: ' + err.error);
        } else {
          alert('✅ Proyecto actualizado');
        }

        this.proyectoEditando = null;
        this.memberSearchEdicion = '';
        this.formularioEditarProyecto = { miembros: [], editorMastersheet: '' };
        await this.cargarProyectos();
      } catch (error) {
        alert('Error: ' + error.message);
      }
    },

    async marcarCompleta(tareaId) {
      try {
        const response = await fetch(`${API_URL}/tareas/${tareaId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            estado: 'Completada'
          })
        });

        if (response.ok) {
          alert('✅ Tarea marcada como completada');
          await this.cargarTareas();
        } else {
          const error = await response.json();
          alert('❌ Error: ' + error.error);
        }
      } catch (error) {
        alert('❌ Error: ' + error.message);
        console.error(error);
      }
    },

    // ========================================================================
    // IMAGEN DE ANUNCIOS
    // ========================================================================

    capturarImagenAnuncio(evento) {
      this.nuevoAnuncio.archivoImagen = evento.target.files[0] || null;
    },

    async subirImagenAnuncio(anuncioId, archivo) {
      if (!archivo) return;
      const form = new FormData();
      form.append('imagen', archivo);
      try {
        await fetch(`${API_URL}/anuncios/${anuncioId}/imagen`, {
          method: 'POST', credentials: 'include', body: form
        });
      } catch (e) { console.error('Error subiendo imagen:', e); }
    },

    // ========================================================================
    // PERFIL PROPIO
    // ========================================================================

    async actualizarPerfil() {
      try {
        const r = await fetch(`${API_URL}/perfil`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ...this.formularioPerfil, solicitudId: this.solicitudActivaId })
        });
        if (r.ok) {
          const data = await r.json();
          // Actualizar usuario en localStorage y estado
          this.usuario = { ...this.usuario, ...data.perfil };
          localStorage.setItem('usuario', JSON.stringify(this.usuario));
          this.mostrarFormPerfil = false;
          this.solicitudesPendientes = [];
          alert('✅ Perfil actualizado correctamente');
        } else {
          const err = await r.json();
          alert('Error: ' + err.error);
        }
      } catch (e) { alert('Error: ' + e.message); }
    },

    // ========================================================================
    // GESTIONAR MIEMBROS — enviar solicitud de actualización
    // ========================================================================

    toggleSeleccionMiembro(email) {
      const idx = this.miembrosSeleccionados.indexOf(email);
      if (idx === -1) this.miembrosSeleccionados.push(email);
      else this.miembrosSeleccionados.splice(idx, 1);
    },

    seleccionarTodosMiembros() {
      this.miembrosSeleccionados = this.miembros.map(m => m.email);
    },

    limpiarSeleccionMiembros() {
      this.miembrosSeleccionados = [];
    },

    async asignarEquipo(email, equipo) {
      try {
        const r = await fetch(`${API_URL}/config/miembros/${encodeURIComponent(email)}/equipo`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ equipo: equipo || null })
        });
        if (r.ok) {
          await this.cargarMiembros();
        } else {
          const err = await r.json();
          alert('Error: ' + err.error);
        }
      } catch (e) { alert('Error: ' + e.message); }
    },

    async enviarSolicitudActualizacion() {
      if (this.miembrosSeleccionados.length === 0) {
        alert('Selecciona al menos un miembro');
        return;
      }
      try {
        const r = await fetch(`${API_URL}/solicitudes-actualizacion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            destinatarios: this.miembrosSeleccionados,
            mensaje: this.mensajeSolicitud || 'Por favor actualiza tu información de perfil.'
          })
        });
        if (r.ok) {
          alert(`✅ Formulario enviado a ${this.miembrosSeleccionados.length} miembro(s)`);
          this.miembrosSeleccionados = [];
          this.mensajeSolicitud = '';
          this.mostrarFormSolicitud = false;
          await this.cargarSolicitudes();
        } else {
          const err = await r.json();
          alert('Error: ' + err.error);
        }
      } catch (e) { alert('Error: ' + e.message); }
    },

    // ========================================================================
    // EVIDENCIA DE TAREAS
    // ========================================================================

    iconoEvidencia(nombre) {
      const ext = (nombre || '').split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'fas fa-image';
      if (ext === 'pdf') return 'fas fa-file-pdf';
      if (['docx', 'doc'].includes(ext)) return 'fas fa-file-word';
      if (['xlsx', 'xls'].includes(ext)) return 'fas fa-file-excel';
      if (ext === 'zip') return 'fas fa-file-archive';
      return 'fas fa-file';
    },

    async subirEvidencia(tareaId, evento) {
      const archivo = evento.target.files[0];
      if (!archivo) return;

      const form = new FormData();
      form.append('evidencia', archivo);

      try {
        const r = await fetch(`${API_URL}/tareas/${tareaId}/evidencia`, {
          method: 'POST',
          credentials: 'include',
          body: form
        });

        if (r.ok) {
          await this.cargarTareas();
          // Limpiar el input
          evento.target.value = '';
        } else {
          const err = await r.json();
          alert('❌ Error: ' + err.error);
        }
      } catch (e) {
        alert('❌ Error al subir el archivo: ' + e.message);
      }
    },

    abrirFormCosto(tareaId) {
      this.costoEnEdicion = { ...this.costoEnEdicion, [tareaId]: { monto: '', descripcion: '' } };
    },

    cancelarCosto(tareaId) {
      const copia = { ...this.costoEnEdicion };
      delete copia[tareaId];
      this.costoEnEdicion = copia;
    },

    async guardarCostoTarea(tareaId) {
      const form = this.costoEnEdicion[tareaId];
      if (!form || !form.monto || Number(form.monto) <= 0) {
        alert('⚠️ Ingresa un monto válido');
        return;
      }
      try {
        const r = await fetch(`${API_URL}/tareas/${tareaId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            tieneCosto: true,
            costoMonto: Number(form.monto),
            costoDescripcion: form.descripcion || ''
          })
        });
        if (r.ok) {
          this.cancelarCosto(tareaId);
          await this.cargarTareas();
        } else {
          const err = await r.json();
          alert('❌ Error: ' + err.error);
        }
      } catch (e) {
        alert('❌ Error: ' + e.message);
      }
    },

    async subirComprobante(tareaId, evento) {
      const archivo = evento.target.files[0];
      if (!archivo) return;

      const form = new FormData();
      form.append('comprobante', archivo);

      try {
        const r = await fetch(`${API_URL}/tareas/${tareaId}/comprobantes`, {
          method: 'POST',
          credentials: 'include',
          body: form
        });

        if (r.ok) {
          await this.cargarTareas();
          evento.target.value = '';
          alert('✅ Comprobante subido. El sector financiero ha sido notificado.');
        } else {
          const err = await r.json();
          alert('❌ Error: ' + err.error);
        }
      } catch (e) {
        alert('❌ Error al subir el comprobante: ' + e.message);
      }
    },

    async eliminarEvidencia(tareaId) {
      if (!confirm('¿Eliminar la evidencia de esta tarea?')) return;
      try {
        const r = await fetch(`${API_URL}/tareas/${tareaId}/evidencia`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (r.ok) {
          await this.cargarTareas();
        } else {
          const err = await r.json();
          alert('❌ Error: ' + err.error);
        }
      } catch (e) {
        alert('❌ Error: ' + e.message);
      }
    },

    // ========================================================================
    // GOOGLE CALENDAR
    // ========================================================================

    async verificarGoogleCalendar() {
      try {
        const r = await fetch(`${API_URL}/google/status`, { credentials: 'include' });
        if (r.ok) {
          const data = await r.json();
          this.googleCalendarConfigurado = data.configurado;
          this.googleCalendarConectado = data.conectado;
        }
      } catch (e) { /* silencioso */ }
    },

    async conectarGoogleCalendar() {
      try {
        const r = await fetch(`${API_URL}/google/auth-url`, { credentials: 'include' });
        if (r.ok) {
          const data = await r.json();
          window.location.href = data.url;
        } else {
          const err = await r.json();
          alert('Error: ' + err.error);
        }
      } catch (e) { alert('Error de conexión: ' + e.message); }
    },

    async desconectarGoogleCalendar() {
      if (!confirm('¿Desconectar tu Google Calendar?')) return;
      try {
        const r = await fetch(`${API_URL}/google/disconnect`, {
          method: 'DELETE', credentials: 'include'
        });
        if (r.ok) {
          this.googleCalendarConectado = false;
          alert('Google Calendar desconectado');
        }
      } catch (e) { alert('Error: ' + e.message); }
    },

    // ========================================================================
    // ASISTENCIA A REUNIONES
    // ========================================================================

    asistenciaUsuario(reunion) {
      if (!this.usuario || !reunion.asistencias) return null;
      const val = reunion.asistencias[this.usuario.email];
      if (val === true) return true;
      if (val === false) return false;
      return null; // no marcado aún
    },

    reunionPasada(reunion) {
      if (!reunion.fecha) return false;
      return reunion.fecha < new Date().toISOString().split('T')[0];
    },

    async marcarAsistencia(reunionId, asistio) {
      try {
        const r = await fetch(`${API_URL}/reuniones/${reunionId}/asistencia`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ asistio })
        });
        if (r.ok) {
          await this.cargarReuniones();
        } else {
          const err = await r.json();
          alert('Error: ' + err.error);
        }
      } catch (e) { alert('Error: ' + e.message); }
    },

    // ========================================================================
    // REGISTRAR REUNIÓN PROPIA
    // ========================================================================

    async crearReunionPropia() {
      try {
        const { descripcion, fecha, horaInicio, horaFin, modalidad, enlace, asistentes } = this.formularioReunionPropia;
        if (!descripcion) {
          alert('⚠️ Escribe la descripción de la reunión');
          return;
        }
        const r = await fetch(`${API_URL}/reuniones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            tipo: 'personal', modalidad: modalidad || 'presencial', tipoReunion: 'especial',
            proyecto: 'General', descripcion, fecha, horaInicio, horaFin,
            enlace: modalidad === 'virtual' ? (enlace || '') : '',
            asistentes
          })
        });
        if (r.ok) {
          this.formularioReunionPropia = { descripcion: '', fecha: '', horaInicio: '', horaFin: '', modalidad: 'presencial', enlace: '', asistentes: [] };
          this.memberSearchReunionPropia = '';
          await this.cargarReuniones();
          alert('✅ Reunión registrada' + (this.googleCalendarConectado ? ' y añadida a tu Google Calendar' : ''));
        } else {
          const err = await r.json();
          alert('❌ Error: ' + err.error);
        }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    // ========================================================================
    // TIPO REUNIÓN — auto-fecha miércoles
    // ========================================================================

    onTipoReunionChange(formulario) {
      if (formulario.tipoReunion === 'general') {
        formulario.fecha = this.proximoMiercoles;
      }
    },

    // ========================================================================
    // NOTAS DE REUNIÓN
    // ========================================================================

    toggleNotasReunion(reunionId) {
      if (this.reunionExpandida === reunionId) {
        this.reunionExpandida = null;
        this.reunionNotaForm = { reunionId: null, texto: '', tipo: 'nota' };
      } else {
        this.reunionExpandida = reunionId;
        this.reunionNotaForm = { reunionId, texto: '', tipo: 'nota' };
        // Cargar acta existente si la hay
        const r = this.reuniones.find(x => x.id === reunionId);
        if (r) this.reunionActaForm = { reunionId, texto: r.acta || '' };
      }
    },

    async agregarNota() {
      const { reunionId, texto, tipo } = this.reunionNotaForm;
      if (!texto.trim()) { alert('Escribe el texto de la nota'); return; }
      try {
        const r = await fetch(`${API_URL}/reuniones/${reunionId}/nota`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ texto, tipo })
        });
        if (r.ok) {
          // Registrar en historial SCRUM si la nota pertenece al SCRUM activo
          if (this.scrumActivo && reunionId === this.scrumActivo) {
            const tipoLabel = { nota: 'Nota', tarea: 'Tarea', decision: 'Decisión' }[tipo] || tipo;
            this.registrarEventoScrum('Nota agregada', `[${tipoLabel}] ${texto}`);
          }
          this.reunionNotaForm.texto = '';
          await this.cargarReuniones();
        } else {
          const err = await r.json();
          alert('Error: ' + err.error);
        }
      } catch (e) { alert('Error: ' + e.message); }
    },

    async eliminarNota(reunionId, notaId) {
      if (!confirm('¿Eliminar esta nota?')) return;
      try {
        const r = await fetch(`${API_URL}/reuniones/${reunionId}/nota/${notaId}`, {
          method: 'DELETE', credentials: 'include'
        });
        if (r.ok) await this.cargarReuniones();
        else { const err = await r.json(); alert('Error: ' + err.error); }
      } catch (e) { alert('Error: ' + e.message); }
    },

    async guardarActa() {
      const { reunionId, texto } = this.reunionActaForm;
      try {
        const r = await fetch(`${API_URL}/reuniones/${reunionId}/acta`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ acta: texto })
        });
        if (r.ok) {
          await this.cargarReuniones();
          alert('✅ Acta guardada');
        } else {
          const err = await r.json();
          alert('Error: ' + err.error);
        }
      } catch (e) { alert('Error: ' + e.message); }
    },

    // ========================================================================
    // PANEL SCRUM Y CRONÓMETRO
    // ========================================================================

    toggleScrumPanel(reunionId) {
      if (this.scrumActivo === reunionId) {
        this.scrumActivo = null;
        this.scrumTareaAbierta = null;
        this.detenerScrumTimer();
        this.scrumHistorialActivo = [];
        this.scrumTareasActivo = [];
      } else {
        this.scrumActivo = reunionId;
        this.scrumTimer = { activo: false, segundos: 0, interval: null, horaInicio: null, horaFin: null };
        this.scrumHistorialActivo = [];
        this.scrumTareasActivo = [];
        // Pre-cargar el proyecto de la reunión en el formulario de tarea
        const reunion = this.reuniones.find(r => r.id === reunionId);
        if (reunion) {
          this.scrumTareaForm = {
            reunionId,
            proyecto: reunion.proyecto || '',
            descripcion: '',
            responsables: [],
            fechaVencimiento: ''
          };
        }
      }
    },

    abrirScrumTareaForm(reunionId) {
      this.scrumTareaAbierta = this.scrumTareaAbierta === reunionId ? null : reunionId;
    },

    async crearTareaDesdeScrum(reunion) {
      const { reunionId, proyecto, descripcion, responsables, fechaVencimiento } = this.scrumTareaForm;
      if (!proyecto) { alert('⚠️ Selecciona el proyecto'); return; }
      if (!descripcion.trim()) { alert('⚠️ Escribe la descripción de la tarea'); return; }
      if (!responsables.length) { alert('⚠️ Asigna al menos un responsable'); return; }
      try {
        const r = await fetch(`${API_URL}/tareas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            proyecto, descripcion, responsables, fechaVencimiento,
            notas: `Asignada en SCRUM: ${reunion.descripcion}`,
            origenScrum: true,
            reunionOrigenId: reunionId
          })
        });
        if (r.ok) {
          const tareaCreada = await r.json();
          this.scrumTareasActivo.push(tareaCreada.id);
          const nombresResp = responsables.map(e => this.nombreMiembro(e)).join(', ');
          this.registrarEventoScrum('Tarea asignada', `"${descripcion}" → ${nombresResp}`);
          this.scrumTareaForm.descripcion = '';
          this.scrumTareaForm.responsables = [];
          this.scrumTareaForm.fechaVencimiento = '';
          this.scrumTareaAbierta = null;
          await this.cargarTareas();
          alert('✅ Tarea asignada desde SCRUM');
        } else {
          const err = await r.json();
          alert('❌ Error: ' + err.error);
        }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    iniciarScrumTimer() {
      if (this.scrumTimer.activo) return;
      if (this.scrumTimer.segundos === 0) {
        this.scrumTimer.horaInicio = new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
        this.scrumTimer.horaFin = null;
        this.registrarEventoScrum('Sesión iniciada', `Hora de inicio: ${this.scrumTimer.horaInicio}`);
      }
      this.scrumTimer.activo = true;
      this.scrumTimer.interval = setInterval(() => {
        this.scrumTimer.segundos++;
      }, 1000);
    },

    pausarScrumTimer() {
      this.scrumTimer.activo = false;
      clearInterval(this.scrumTimer.interval);
      this.scrumTimer.interval = null;
    },

    finalizarScrumTimer() {
      if (this.scrumTimer.segundos > 0) {
        this.scrumTimer.horaFin = new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
      }
      this.pausarScrumTimer();
    },

    detenerScrumTimer() {
      this.pausarScrumTimer();
      this.scrumTimer.segundos = 0;
      this.scrumTimer.horaInicio = null;
      this.scrumTimer.horaFin = null;
    },

    formatScrumTimer() {
      const total = this.scrumTimer.segundos;
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    },

    registrarEventoScrum(accion, detalle) {
      this.scrumHistorialActivo.push({
        ts: new Date().toISOString(),
        usuario: this.usuario?.email || '',
        usuarioNombre: this.usuario?.nombre || '',
        accion,
        detalle: detalle || '',
      });
    },

    async cerrarSesionScrum(reunion) {
      if (!confirm(`¿Cerrar y guardar esta sesión SCRUM?\nQuedará registrada en el historial con todas las notas y eventos.`)) return;
      if (this.scrumTimer.activo) this.finalizarScrumTimer();
      const horaFinReal = this.scrumTimer.horaFin ||
        new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
      this.registrarEventoScrum('Sesión cerrada',
        `Duración: ${this.formatScrumTimer()} · Fin: ${horaFinReal}`);
      try {
        const r = await fetch(`${API_URL}/scrum/${reunion.id}/cerrar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            horaInicio: this.scrumTimer.horaInicio,
            horaFin: horaFinReal,
            duracionSegundos: this.scrumTimer.segundos,
            historial: this.scrumHistorialActivo,
            tareasAsignadasIds: this.scrumTareasActivo,
          }),
        });
        if (r.ok) {
          const sesion = await r.json();
          this.scrumSesiones.unshift(sesion);
          this.scrumActivo = null;
          this.scrumHistorialActivo = [];
          this.scrumTareasActivo = [];
          this.detenerScrumTimer();
          alert('✅ Sesión SCRUM guardada en el historial.');
        } else {
          const err = await r.json();
          alert('Error: ' + err.error);
        }
      } catch (e) { alert('Error: ' + e.message); }
    },

    async cargarScrumSesiones() {
      try {
        const r = await fetch(`${API_URL}/scrum/sesiones`, { credentials: 'include' });
        if (r.ok) this.scrumSesiones = await r.json();
      } catch (e) { console.error('Error cargando sesiones SCRUM:', e); }
    },

    async cargarScrumProgramas() {
      try {
        const r = await fetch(`${API_URL}/scrum/programas`, { credentials: 'include' });
        if (r.ok) this.scrumProgramas = await r.json();
      } catch (e) { console.error('Error cargando programas SCRUM:', e); }
    },

    async generarScrumHoy() {
      try {
        await fetch(`${API_URL}/scrum/generar-hoy`, { method: 'POST', credentials: 'include' });
        await this.cargarReuniones();
      } catch (e) { console.error('Error generando SCRUMs de hoy:', e); }
    },

    onProyectoCrearScrumChange() {
      const pd = this.proyectosDetalle.find(p => p.nombre === this.formularioCrearScrum.proyecto);
      this.formularioCrearScrum.asistentes = pd ? [...pd.miembros] : [];
      this.memberSearchCrearScrum = '';
    },

    async crearScrumRapido() {
      const { proyecto, fecha, horaInicio, horaFin, asistentes } = this.formularioCrearScrum;
      if (!proyecto) { alert('⚠️ Selecciona un proyecto'); return; }
      if (asistentes.length === 0) { alert('⚠️ Selecciona al menos un participante'); return; }
      try {
        const r = await fetch(`${API_URL}/reuniones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            tipo: 'nihr', modalidad: 'scrum', tipoReunion: 'especial',
            proyecto,
            descripcion: `Daily SCRUM — ${proyecto}`,
            fecha: fecha || new Date().toISOString().split('T')[0],
            horaInicio: horaInicio || '',
            horaFin: horaFin || '',
            enlace: '',
            asistentes,
          }),
        });
        if (r.ok) {
          this.formularioCrearScrum = { proyecto: '', fecha: '', horaInicio: '', horaFin: '', asistentes: [] };
          this.memberSearchCrearScrum = '';
          this.mostrarFormCrearScrum = false;
          await this.cargarReuniones();
          alert('✅ Sesión SCRUM creada');
        } else {
          const err = await r.json();
          alert('❌ Error: ' + err.error);
        }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    onProyectoProgramaChange() {
      // Auto-popula asistentes con los miembros del proyecto seleccionado
      const proyectoDetalle = this.proyectosDetalle.find(p => p.nombre === this.formularioPrograma.proyecto);
      if (proyectoDetalle) {
        this.formularioPrograma.asistentes = [...proyectoDetalle.miembros];
      } else {
        this.formularioPrograma.asistentes = [];
      }
      this.memberSearchPrograma = '';
    },

    async crearScrumPrograma() {
      const { proyecto, frecuencia, hora, asistentes } = this.formularioPrograma;
      if (!proyecto || !hora) { alert('⚠️ Selecciona proyecto y hora'); return; }
      if (asistentes.length === 0) { alert('⚠️ Selecciona al menos un participante'); return; }
      try {
        const r = await fetch(`${API_URL}/scrum/programas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ proyecto, frecuencia, hora, asistentes }),
        });
        if (r.ok) {
          this.formularioPrograma = { proyecto: '', frecuencia: 'diario', hora: '09:00', asistentes: [] };
          this.memberSearchPrograma = '';
          this.mostrarFormPrograma = false;
          await this.cargarScrumProgramas();
          await this.generarScrumHoy();
          alert('✅ Programa SCRUM creado. Se generó la sesión de hoy si corresponde.');
        } else {
          const err = await r.json();
          alert('❌ Error: ' + err.error);
        }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    async toggleScrumPrograma(id) {
      try {
        await fetch(`${API_URL}/scrum/programas/${id}/toggle`, { method: 'PUT', credentials: 'include' });
        await this.cargarScrumProgramas();
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    async eliminarScrumPrograma(id) {
      if (!confirm('¿Eliminar este programa SCRUM? No afecta las sesiones ya creadas.')) return;
      try {
        await fetch(`${API_URL}/scrum/programas/${id}`, { method: 'DELETE', credentials: 'include' });
        await this.cargarScrumProgramas();
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    tareasParaScrum(reunion) {
      if (!reunion || !reunion.proyecto) return [];
      const asistentesSet = new Set(reunion.asistentes || []);
      return this.tareas
        .filter(t =>
          t.proyecto === reunion.proyecto &&
          Array.isArray(t.responsables) &&
          t.responsables.some(r => asistentesSet.has(r))
        )
        .sort((a, b) => {
          if (a.estado === 'Completada' && b.estado !== 'Completada') return 1;
          if (a.estado !== 'Completada' && b.estado === 'Completada') return -1;
          return 0;
        });
    },

    formatFechaSesion(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    },

    iconoEventoScrum(accion) {
      const mapa = {
        'Sesión iniciada': 'fas fa-play-circle',
        'Sesión cerrada': 'fas fa-flag-checkered',
        'Nota agregada': 'fas fa-sticky-note',
        'Tarea asignada': 'fas fa-tasks',
      };
      return mapa[accion] || 'fas fa-circle';
    },

    // ========================================================================
    // CORRECCIÓN DE TEXTO GLOBAL
    // ========================================================================

    inicializarCorreccionGlobal() {
      const procesarElemento = (el) => {
        if (!el || !el.tagName) return;
        const tag = el.tagName;
        const tipo = (el.getAttribute('type') || '').toLowerCase();

        // Solo inputs de texto y textareas; excluir date, email, file, etc.
        const esTexto = tag === 'TEXTAREA' ||
          (tag === 'INPUT' && (tipo === 'text' || tipo === ''));
        if (!esTexto) return;

        // Activar spellcheck del navegador (subrayado rojo nativo)
        el.setAttribute('spellcheck', 'true');
      };

      const escanear = (raiz = document) => {
        raiz.querySelectorAll('input, textarea').forEach(procesarElemento);
      };

      // Escaneo inicial + cuando Vue actualiza el DOM
      escanear();

      const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
              procesarElemento(node);
            } else {
              node.querySelectorAll?.('input, textarea').forEach(procesarElemento);
            }
          });
        });
      });

      observer.observe(document.getElementById('app') || document.body, {
        childList: true,
        subtree: true,
      });

      this._ltObserver = observer;
    },

    etiquetaNota(tipo) {
      return { nota: 'Nota', tarea: 'Tarea', decision: 'Decisión', bloqueo: 'Bloqueo' }[tipo] || 'Nota';
    },

    iconoNota(tipo) {
      return { nota: 'fas fa-sticky-note', tarea: 'fas fa-tasks', decision: 'fas fa-gavel', bloqueo: 'fas fa-ban' }[tipo] || 'fas fa-sticky-note';
    },

    // ========================================================================
    // PRESUPUESTOS
    // ========================================================================

    async cargarPresupuestos() {
      try {
        const r = await fetch(`${API_URL}/presupuestos`, { credentials: 'include' });
        if (r.ok) this.presupuestos = await r.json();
      } catch (e) { console.error('Error cargando presupuestos:', e); }
    },

    async cargarGastos() {
      try {
        const r = await fetch(`${API_URL}/gastos`, { credentials: 'include' });
        if (r.ok) this.gastos = await r.json();
      } catch (e) { console.error('Error cargando gastos:', e); }
    },

    async cargarTareasConCosto() {
      try {
        const r = await fetch(`${API_URL}/tareas/con-costo`, { credentials: 'include' });
        if (r.ok) this.tareasConCosto = await r.json();
      } catch (e) { console.error('Error cargando tareas con costo:', e); }
    },

    async cargarNotificaciones() {
      try {
        const r = await fetch(`${API_URL}/notificaciones`, { credentials: 'include' });
        if (r.ok) this.notificaciones = await r.json();
      } catch (e) { /* silencioso */ }
    },

    agregarItemPresupuesto() {
      this.formularioPresupuesto.items.push({ rubro: '', descripcion: '', monto: '' });
    },

    quitarItemPresupuesto(idx) {
      if (this.formularioPresupuesto.items.length > 1) {
        this.formularioPresupuesto.items.splice(idx, 1);
      }
    },

    totalFormularioPresupuesto() {
      return this.formularioPresupuesto.items.reduce((s, it) => s + (Number(it.monto) || 0), 0);
    },

    async crearPresupuesto() {
      const { proyecto, mes, descripcion, items } = this.formularioPresupuesto;
      if (!proyecto) { alert('⚠️ Selecciona el proyecto'); return; }
      if (!mes)      { alert('⚠️ Selecciona el mes'); return; }
      const itemsValidos = items.filter(it => it.rubro && Number(it.monto) > 0);
      if (itemsValidos.length === 0) { alert('⚠️ Agrega al menos un ítem con rubro y monto'); return; }

      try {
        const r = await fetch(`${API_URL}/presupuestos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ proyecto, mes, descripcion, items: itemsValidos, totalSolicitado: itemsValidos.reduce((s, i) => s + Number(i.monto), 0) })
        });
        if (r.ok) {
          this.mostrarFormPresupuesto = false;
          this.formularioPresupuesto = { proyecto: '', mes: '', descripcion: '', items: [{ rubro: '', descripcion: '', monto: '' }] };
          await this.cargarPresupuestos();
          alert('✅ Presupuesto creado. Se notificó al equipo y al área financiera.');
        } else {
          const err = await r.json();
          alert('❌ Error: ' + err.error);
        }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    async cambiarEstadoPresupuesto(presupuestoId, estado, comentario) {
      try {
        const r = await fetch(`${API_URL}/presupuestos/${presupuestoId}/estado`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ estado, comentario: comentario || '' })
        });
        if (r.ok) {
          await this.cargarPresupuestos();
        } else {
          const err = await r.json();
          alert('❌ Error: ' + err.error);
        }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    async subirRespaldoPresupuesto(presupuestoId, evento) {
      const archivo = evento.target.files[0];
      if (!archivo) return;
      const form = new FormData();
      form.append('respaldo', archivo);
      try {
        const r = await fetch(`${API_URL}/presupuestos/${presupuestoId}/respaldo`, {
          method: 'POST', credentials: 'include', body: form
        });
        if (r.ok) {
          await this.cargarPresupuestos();
          evento.target.value = '';
        } else {
          const err = await r.json();
          alert('❌ Error: ' + err.error);
        }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    async eliminarRespaldoPresupuesto(presupuestoId, respaldoId) {
      if (!confirm('¿Eliminar este respaldo?')) return;
      try {
        const r = await fetch(`${API_URL}/presupuestos/${presupuestoId}/respaldo/${respaldoId}`, {
          method: 'DELETE', credentials: 'include'
        });
        if (r.ok) await this.cargarPresupuestos();
        else { const err = await r.json(); alert('❌ Error: ' + err.error); }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    async registrarGasto() {
      const { presupuestoId, tareaId, rubro, descripcion, monto } = this.formularioGasto;
      if (!presupuestoId) { alert('⚠️ Selecciona un presupuesto'); return; }
      if (!rubro)         { alert('⚠️ Selecciona el rubro'); return; }
      if (!monto || Number(monto) <= 0) { alert('⚠️ Ingresa un monto válido'); return; }
      try {
        const r = await fetch(`${API_URL}/gastos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ presupuestoId, tareaId: tareaId || null, rubro, descripcion, monto: Number(monto) })
        });
        if (r.ok) {
          this.formularioGasto = { presupuestoId: '', tareaId: '', rubro: '', descripcion: '', monto: '' };
          this.gastoRegistrandoEn = null;
          await this.cargarGastos();
          alert('✅ Gasto registrado');
        } else {
          const err = await r.json();
          alert('❌ Error: ' + err.error);
        }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    async cambiarEstadoGasto(gastoId, estado) {
      try {
        const r = await fetch(`${API_URL}/gastos/${gastoId}/estado`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ estado })
        });
        if (r.ok) await this.cargarGastos();
        else { const err = await r.json(); alert('❌ Error: ' + err.error); }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    async subirRespaldoGasto(gastoId, evento) {
      const archivo = evento.target.files[0];
      if (!archivo) return;
      const form = new FormData();
      form.append('respaldo', archivo);
      try {
        const r = await fetch(`${API_URL}/gastos/${gastoId}/respaldo`, {
          method: 'POST', credentials: 'include', body: form
        });
        if (r.ok) { await this.cargarGastos(); evento.target.value = ''; }
        else { const err = await r.json(); alert('❌ Error: ' + err.error); }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    async eliminarRespaldoGasto(gastoId, respaldoId) {
      if (!confirm('¿Eliminar este respaldo?')) return;
      try {
        const r = await fetch(`${API_URL}/gastos/${gastoId}/respaldo/${respaldoId}`, {
          method: 'DELETE', credentials: 'include'
        });
        if (r.ok) await this.cargarGastos();
        else { const err = await r.json(); alert('❌ Error: ' + err.error); }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    async marcarTodasNotificacionesLeidas() {
      try {
        await fetch(`${API_URL}/notificaciones/leer-todas`, { method: 'PUT', credentials: 'include' });
        await this.cargarNotificaciones();
      } catch (e) { /* silencioso */ }
    },

    async marcarNotificacionLeida(id) {
      try {
        await fetch(`${API_URL}/notificaciones/${id}/leer`, { method: 'PUT', credentials: 'include' });
        const n = this.notificaciones.find(x => x.id === id);
        if (n) n.leida = true;
      } catch (e) { /* silencioso */ }
    },

    etiquetaEstado(estado) {
      return { borrador: 'Borrador', revision: 'En Revisión', aprobado: 'Aprobado', desembolsado: 'Desembolsado', ejecucion: 'En Ejecución' }[estado] || estado;
    },

    colorEstado(estado) {
      return { borrador: 'estado-borrador', revision: 'estado-revision', aprobado: 'estado-aprobado', desembolsado: 'estado-desembolsado', ejecucion: 'estado-ejecucion' }[estado] || '';
    },

    colorEstadoGasto(estado) {
      return { pendiente: 'estado-borrador', aprobado: 'estado-aprobado', rechazado: 'estado-danger' }[estado] || '';
    },

    formatMes(mes) {
      if (!mes) return '';
      const [anio, m] = mes.split('-');
      const nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      return `${nombres[parseInt(m, 10) - 1]} ${anio}`;
    },

    presupuestoDelProyecto(proyecto, mes) {
      return this.presupuestos.find(p => p.proyecto === proyecto && p.mes === mes) || null;
    },

    gastosDelPresupuesto(presupuestoId) {
      return this.gastos.filter(g => g.presupuestoId === presupuestoId);
    },

    totalEjecutadoPresupuesto(presupuestoId) {
      return this.gastosDelPresupuesto(presupuestoId).filter(g => g.estado !== 'rechazado').reduce((s, g) => s + (Number(g.monto) || 0), 0);
    },

    porcentajeEjecutado(presupuesto) {
      if (!presupuesto.totalSolicitado) return 0;
      return Math.min(100, Math.round((this.totalEjecutadoPresupuesto(presupuesto.id) / presupuesto.totalSolicitado) * 100));
    },

    abrirFormGasto(presupuestoId) {
      this.gastoRegistrandoEn = presupuestoId;
      this.formularioGasto = { presupuestoId, tareaId: '', rubro: '', descripcion: '', monto: '' };
    },

    // ========================================================================
    // RECURSOS — TABLETS, DOCUMENTOS, PRÉSTAMOS
    // ========================================================================

    async cargarTablets() {
      try {
        const r = await fetch(`${API_URL}/recursos/tablets`, { credentials: 'include' });
        if (r.ok) this.tablets = await r.json();
      } catch (e) { /* silencioso */ }
    },

    async cargarDocumentos() {
      try {
        const r = await fetch(`${API_URL}/recursos/documentos`, { credentials: 'include' });
        if (r.ok) this.documentos = await r.json();
      } catch (e) { /* silencioso */ }
    },

    async buscarDocumentos() {
      if (!this.busquedaDocumento.trim()) { this.documentosBusqueda = []; return; }
      try {
        const q = encodeURIComponent(this.busquedaDocumento.trim());
        const r = await fetch(`${API_URL}/recursos/documentos?q=${q}`, { credentials: 'include' });
        if (r.ok) this.documentosBusqueda = await r.json();
      } catch (e) { /* silencioso */ }
    },

    async cargarPrestamos() {
      try {
        const r = await fetch(`${API_URL}/recursos/prestamos`, { credentials: 'include' });
        if (r.ok) this.prestamos = await r.json();
      } catch (e) { /* silencioso */ }
    },

    onSelectTablet() {
      const t = this.tablets.find(t => t.id === this.formularioSolicitud.recursoId);
      this.formularioSolicitud.recursoNombre = t ? `${t.id} — ${t.nombre}` : this.formularioSolicitud.recursoId;
    },

    seleccionarDocumento(doc) {
      this.formularioSolicitud.recursoId = doc.id;
      this.formularioSolicitud.recursoNombre = `${doc.carpetaId} — ${doc.nombre}`;
    },

    tabletEstaEnPrestamo(tabletId) {
      return this.prestamos.some(p => p.tipo === 'tablet' && p.recursoId === tabletId && p.estado === 'prestado');
    },

    documentoEstaEnPrestamo(docId) {
      return this.prestamos.some(p => p.tipo === 'documento' && p.recursoId === docId && p.estado === 'prestado');
    },

    async crearSolicitudPrestamo() {
      if (!this.formularioSolicitud.recursoId) { alert('Selecciona un recurso'); return; }
      try {
        const r = await fetch(`${API_URL}/recursos/prestamos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(this.formularioSolicitud)
        });
        if (r.ok) {
          alert('✅ Solicitud enviada. Los encargados serán notificados.');
          this.formularioSolicitud = { tipo: 'tablet', recursoId: '', recursoNombre: '', motivo: '' };
          this.busquedaDocumento = '';
          this.documentosBusqueda = [];
          this.subTabRecursos = 'mis-solicitudes';
          await this.cargarPrestamos();
        } else {
          const err = await r.json();
          alert('❌ ' + err.error);
        }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    abrirAccionPrestamo(id, tipo) {
      this.prestamoAccionId = id;
      this.prestamoAccionTipo = tipo;
      this.detallesAccionPrestamo = '';
    },

    async confirmarAccionPrestamo() {
      if (!this.prestamoAccionId || !this.prestamoAccionTipo) return;
      const rutas = { entregar: 'entregar', devolver: 'devolver', rechazar: 'rechazar' };
      const etiquetas = { entregar: 'entrega registrada', devolver: 'devolución registrada', rechazar: 'solicitud rechazada' };
      try {
        const r = await fetch(`${API_URL}/recursos/prestamos/${this.prestamoAccionId}/${rutas[this.prestamoAccionTipo]}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ detalles: this.detallesAccionPrestamo })
        });
        if (r.ok) {
          alert(`✅ ${etiquetas[this.prestamoAccionTipo].charAt(0).toUpperCase() + etiquetas[this.prestamoAccionTipo].slice(1)} correctamente.`);
          this.prestamoAccionId = null;
          this.prestamoAccionTipo = null;
          this.detallesAccionPrestamo = '';
          await this.cargarPrestamos();
          await this.cargarNotificaciones();
        } else {
          const err = await r.json();
          alert('❌ ' + err.error);
        }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    async crearTablet() {
      if (!this.formularioTablet.id || !this.formularioTablet.nombre) { alert('ID y nombre son requeridos'); return; }
      try {
        const r = await fetch(`${API_URL}/recursos/tablets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(this.formularioTablet)
        });
        if (r.ok) {
          this.formularioTablet = { id: '', nombre: '', descripcion: '' };
          this.mostrarFormTablet = false;
          await this.cargarTablets();
          await this.cargarPrestamos();
        } else {
          const err = await r.json();
          alert('❌ ' + err.error);
        }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    async eliminarTablet(id) {
      if (!confirm(`¿Eliminar la tablet ${id}?`)) return;
      try {
        const r = await fetch(`${API_URL}/recursos/tablets/${id}`, { method: 'DELETE', credentials: 'include' });
        if (r.ok) await this.cargarTablets();
        else { const err = await r.json(); alert('❌ ' + err.error); }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    async crearDocumento() {
      if (!this.formularioDocumento.carpetaId || !this.formularioDocumento.nombre) { alert('ID de carpeta y nombre son requeridos'); return; }
      try {
        const r = await fetch(`${API_URL}/recursos/documentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(this.formularioDocumento)
        });
        if (r.ok) {
          this.formularioDocumento = { carpetaId: '', nombre: '', descripcion: '' };
          this.mostrarFormDocumento = false;
          await this.cargarDocumentos();
        } else {
          const err = await r.json();
          alert('❌ ' + err.error);
        }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    async eliminarDocumento(id) {
      if (!confirm('¿Eliminar este documento?')) return;
      try {
        const r = await fetch(`${API_URL}/recursos/documentos/${id}`, { method: 'DELETE', credentials: 'include' });
        if (r.ok) await this.cargarDocumentos();
        else { const err = await r.json(); alert('❌ ' + err.error); }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    colorEstadoPrestamo(estado) {
      return { pendiente: 'estado-borrador', prestado: 'estado-revision', devuelto: 'estado-aprobado', rechazado: 'estado-danger' }[estado] || '';
    },

    etiquetaEstadoPrestamo(estado) {
      return { pendiente: 'Pendiente', prestado: 'Prestado', devuelto: 'Devuelto', rechazado: 'Rechazado' }[estado] || estado;
    },

    // ========================================================================
    // ADMIN — GESTIÓN DE USUARIOS
    // ========================================================================

    esDirectivaRol(rol, usuario) {
      if (usuario && usuario.esDirectiva !== undefined) return !!usuario.esDirectiva;
      return ['admin', 'gerente', 'pi', 'responsable_financiero', 'coordinadora'].includes(rol);
    },
    esDirectivaMiembro(m) {
      if (m.esDirectiva !== undefined) return !!m.esDirectiva;
      return this.esDirectivaRol(m.rol);
    },

    proyectosDeUsuario(email) {
      return (this.proyectosDetalle || [])
        .filter(p => p.miembros && p.miembros.includes(email))
        .map(p => p.nombre);
    },

    async toggleEquipo(email, equiposActuales, equipo, agregar) {
      const nuevos = agregar
        ? [...new Set([...equiposActuales, equipo])]
        : equiposActuales.filter(e => e !== equipo);
      try {
        const r = await fetch(`${API_URL}/config/miembros/${encodeURIComponent(email)}/equipo`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ equipos: nuevos }),
        });
        if (r.ok) await this.cargarMiembros();
        else { const err = await r.json(); alert('❌ ' + err.error); }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    abrirCrearPerfil() {
      this.formularioPerfil = {
        _edicion: false, _emailOriginal: '',
        nombre: '', email: '', rol: 'asistente', password: '',
        equipos: [], proyectosAsignados: [],
        esDirectiva: false, secciones: [], esEncargadoRecursos: false,
      };
      this.mostrarFormPerfil = true;
      this.mostrarFormSolicitud = false;
    },

    abrirEditarPerfil(m) {
      const secciones = Array.isArray(m.secciones) ? [...m.secciones] : [];
      // Si es encargado, asegurar que 'recursos' esté en sus secciones
      if (m.esEncargadoRecursos && !secciones.includes('recursos')) secciones.push('recursos');
      this.formularioPerfil = {
        _edicion: true,
        _emailOriginal: m.email,
        nombre: m.nombre || '',
        email: m.email || '',
        rol: m.rol || 'asistente',
        password: '',
        equipos: Array.isArray(m.equipos) ? [...m.equipos] : [],
        proyectosAsignados: this.proyectosDeUsuario(m.email),
        esDirectiva: m.esDirectiva !== undefined ? m.esDirectiva : this.esDirectivaRol(m.rol),
        secciones,
        esEncargadoRecursos: !!m.esEncargadoRecursos,
      };
      this.mostrarFormPerfil = true;
      this.mostrarFormSolicitud = false;
    },

    async _errResp(r) {
      try { const j = await r.json(); return j.error || `Error ${r.status}`; }
      catch { return `Error ${r.status} — reinicia el servidor backend`; }
    },

    async guardarPerfil() {
      const f = this.formularioPerfil;
      if (!f.nombre?.trim() || !f.email?.trim() || !f.rol) {
        alert('Completa nombre, correo y rol'); return;
      }
      if (!f._edicion && (!f.password || f.password.length < 8)) {
        alert('La contraseña inicial debe tener al menos 8 caracteres'); return;
      }
      if (f._edicion && f.password && f.password.length < 8) {
        alert('La contraseña debe tener al menos 8 caracteres'); return;
      }
      try {
        if (f._edicion) {
          const emailOriginal = f._emailOriginal;
          const nuevoEmail = f.email.trim();
          const emailCambio = nuevoEmail !== emailOriginal ? nuevoEmail : null;
          const payload = {
            nombre: f.nombre.trim(),
            rol: f.rol,
            equipos: f.equipos,
            esDirectiva: f.esDirectiva,
            secciones: f.secciones.length > 0 ? f.secciones : null,
            esEncargadoRecursos: f.esEncargadoRecursos,
          };
          if (emailCambio) payload.newEmail = emailCambio;
          const r1 = await fetch(`${API_URL}/admin/usuarios/${encodeURIComponent(emailOriginal)}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify(payload),
          });
          if (!r1.ok) { alert('❌ ' + await this._errResp(r1)); return; }
          const emailFinal = emailCambio || emailOriginal;
          if (f.password?.trim()) {
            const rp = await fetch(`${API_URL}/admin/usuarios/${encodeURIComponent(emailFinal)}/password`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
              body: JSON.stringify({ password: f.password }),
            });
            if (!rp.ok) { alert('❌ ' + await this._errResp(rp)); return; }
          }
          const r2 = await fetch(`${API_URL}/admin/usuarios/${encodeURIComponent(emailFinal)}/proyectos`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ proyectos: f.proyectosAsignados }),
          });
          if (!r2.ok) { alert('❌ ' + await this._errResp(r2)); return; }
        } else {
          const r = await fetch(`${API_URL}/admin/usuarios`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({
              email: f.email.trim().toLowerCase(),
              nombre: f.nombre.trim(), rol: f.rol, password: f.password,
              secciones: f.secciones.length > 0 ? f.secciones : null,
              esEncargadoRecursos: f.esEncargadoRecursos,
            }),
          });
          if (!r.ok) { alert('❌ ' + await this._errResp(r)); return; }
          const emailNuevo = f.email.trim().toLowerCase();
          await fetch(`${API_URL}/admin/usuarios/${encodeURIComponent(emailNuevo)}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ equipos: f.equipos, esDirectiva: f.esDirectiva }),
          });
          await fetch(`${API_URL}/admin/usuarios/${encodeURIComponent(emailNuevo)}/proyectos`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ proyectos: f.proyectosAsignados }),
          });
        }
        this.mostrarFormPerfil = false;
        await this.cargarMiembros();
        await this.cargarProyectos();
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    async toggleEncargadoRecursos(email, valor) {
      try {
        const r = await fetch(`${API_URL}/admin/usuarios/${encodeURIComponent(email)}/encargado`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ esEncargadoRecursos: valor })
        });
        if (r.ok) {
          await this.cargarMiembros();
        } else {
          const err = await r.json();
          alert('❌ ' + err.error);
        }
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    async eliminarPerfil(email) {
      if (!confirm(`¿Eliminar el perfil de "${email}"? Esta acción no se puede deshacer.`)) return;
      try {
        const r = await fetch(`${API_URL}/admin/usuarios/${encodeURIComponent(email)}`, {
          method: 'DELETE', credentials: 'include',
        });
        if (!r.ok) { alert('❌ ' + await this._errResp(r)); return; }
        this.mostrarFormPerfil = false;
        await this.cargarMiembros();
        await this.cargarProyectos();
      } catch (e) { alert('❌ Error: ' + e.message); }
    },

    onToggleEncargadoRecursos() {
      const secciones = this.formularioPerfil.secciones;
      if (this.formularioPerfil.esEncargadoRecursos) {
        if (!secciones.includes('recursos')) secciones.push('recursos');
      } else {
        const idx = secciones.indexOf('recursos');
        if (idx !== -1) secciones.splice(idx, 1);
      }
    },

    toggleSeccionPerfil(sec) {
      const idx = this.formularioPerfil.secciones.indexOf(sec);
      if (idx === -1) this.formularioPerfil.secciones.push(sec);
      else this.formularioPerfil.secciones.splice(idx, 1);
    },

    etiquetaSeccion(sec) {
      const etiquetas = {
        'tareas': 'Tareas', 'reuniones': 'Reuniones', 'scrum': 'SCRUM',
        'registrar-tarea': 'Registrar Tarea', 'registrar-reunion': 'Registrar Reunión',
        'reportes': 'Reportes', 'presupuesto': 'Presupuesto', 'finanzas': 'Finanzas',
        'recursos': 'Préstamos'
      };
      return etiquetas[sec] || sec;
    },

    // ========================================================================
    // HITOS / MASTERSHEET
    // ========================================================================

    async asignarEditor() {
      if (!this.nuevoEditorEmail || !this.mastersheet) return;
      try {
        const r = await fetch(`${API_URL}/mastersheet/${encodeURIComponent(this.mastersheet.proyecto)}/editor`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ editorEmail: this.nuevoEditorEmail }),
        });
        if (r.ok) {
          const data = await r.json();
          this.mastersheet = { ...this.mastersheet, editores: data.mastersheet.editores };
          this.nuevoEditorEmail = '';
          const nombre = this.miembros.find(m => m.email === data.mastersheet.editores[0])?.nombre || data.mastersheet.editores[0];
          alert(`✅ Editor asignado: ${nombre}`);
        } else {
          const e = await r.json(); alert('Error: ' + e.error);
        }
      } catch (e) { alert('Error: ' + e.message); }
    },

    async cargarHitos(proyecto) {
      const proyectoFinal = proyecto || (this.misProyectos && this.misProyectos[0]?.nombre);
      if (!proyectoFinal) return;
      if (!this.proyectoFiltro) this.proyectoFiltro = proyectoFinal;
      try {
        // El endpoint mastersheet ya devuelve hitos + tareas embebidas
        const msRes = await fetch(`${API_URL}/mastersheet/${encodeURIComponent(proyectoFinal)}`, { credentials: 'include' });
        if (msRes.ok) {
          const ms = await msRes.json();
          this.mastersheet = ms;
          this.hitos = ms.hitos || [];
        }
      } catch (e) { console.error('Error cargando hitos:', e); }
    },

    async crearHito() {
      const { nombre, descripcion, fechaInicio, fechaFin, responsablePrincipal, esCritico, orden, macrotareas } = this.formularioHito;
      if (!nombre) { alert('⚠️ El nombre del hito es requerido'); return; }
      const proyecto = this.proyectoFiltro || (this.misProyectos[0] && this.misProyectos[0].nombre);
      if (!proyecto) { alert('⚠️ Selecciona un proyecto primero'); return; }
      try {
        const r = await fetch(`${API_URL}/hitos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ proyecto, nombre, descripcion, fechaInicio, fechaFin, responsablePrincipal, esCritico, orden, macrotareas }),
        });
        if (r.ok) {
          this.mostrarFormHito = false;
          this.formularioHito = { nombre: '', descripcion: '', fechaInicio: '', fechaFin: '', responsablePrincipal: '', esCritico: false, orden: 0, macrotareas: [] };
          this.nuevaMacrotarea = { nombre: '', responsable: '' };
          await this.cargarHitos(proyecto);
        } else {
          const e = await r.json(); alert('Error: ' + e.error);
        }
      } catch (e) { alert('Error: ' + e.message); }
    },

    editarHito(hito) {
      this.hitoEditando = { ...hito, macrotareas: hito.macrotareas ? [...hito.macrotareas] : [] };
      this.nuevaMacrotarea = { nombre: '', responsable: '' };
      this.mostrarFormHito = true;
    },

    agregarMacrotarea(form) {
      if (!this.nuevaMacrotarea.nombre.trim()) return;
      const lista = form === 'editar' ? this.hitoEditando.macrotareas : this.formularioHito.macrotareas;
      lista.push({
        id: `mt_${Date.now()}`,
        nombre: this.nuevaMacrotarea.nombre.trim(),
        responsable: this.nuevaMacrotarea.responsable || null,
      });
      this.nuevaMacrotarea = { nombre: '', responsable: '' };
    },

    quitarMacrotarea(form, idx) {
      const lista = form === 'editar' ? this.hitoEditando.macrotareas : this.formularioHito.macrotareas;
      lista.splice(idx, 1);
    },

    async guardarHito() {
      if (!this.hitoEditando) return;
      try {
        const r = await fetch(`${API_URL}/hitos/${this.hitoEditando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(this.hitoEditando),
        });
        if (r.ok) {
          this.hitoEditando = null;
          this.mostrarFormHito = false;
          await this.cargarHitos(this.proyectoFiltro || this.mastersheet?.proyecto);
        } else {
          const e = await r.json(); alert('Error: ' + e.error);
        }
      } catch (e) { alert('Error: ' + e.message); }
    },

    async eliminarHito(hito) {
      if (!confirm(`¿Eliminar el hito "${hito.nombre}"? Esta acción no se puede deshacer.`)) return;
      try {
        const r = await fetch(`${API_URL}/hitos/${hito.id}`, { method: 'DELETE', credentials: 'include' });
        if (r.ok) {
          await this.cargarHitos(this.proyectoFiltro || hito.proyecto);
        } else {
          const e = await r.json(); alert('Error: ' + e.error);
        }
      } catch (e) { alert('Error: ' + e.message); }
    },

    abrirFormPropuesta(hitoId) {
      this.propuestaHitoId = hitoId;
      this.formularioPropuesta = { tipoCambio: 'fecha_objetivo', valorPropuesto: '', justificacion: '' };
      this.mostrarFormPropuesta = true;
    },

    async enviarPropuesta() {
      const { tipoCambio, valorPropuesto, justificacion } = this.formularioPropuesta;
      if (!valorPropuesto) { alert('⚠️ Ingresa el valor propuesto'); return; }
      try {
        const r = await fetch(`${API_URL}/hitos/${this.propuestaHitoId}/propuestas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ tipoCambio, valorPropuesto, justificacion }),
        });
        if (r.ok) {
          this.mostrarFormPropuesta = false;
          alert('✅ Propuesta enviada');
        } else {
          const e = await r.json(); alert('Error: ' + e.error);
        }
      } catch (e) { alert('Error: ' + e.message); }
    },

    async revisarPropuesta(propuestaId, decision) {
      const comentario = decision === 'rechazada' ? prompt('Motivo del rechazo (opcional):') || '' : '';
      try {
        const r = await fetch(`${API_URL}/hitos/propuestas/${propuestaId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ decision, comentario }),
        });
        if (r.ok) {
          await this.cargarHitos(this.proyectoFiltro || this.mastersheet?.proyecto);
        } else {
          const e = await r.json(); alert('Error: ' + e.error);
        }
      } catch (e) { alert('Error: ' + e.message); }
    },

    async cargarReporte(proyecto) {
      if (!proyecto) return;
      try {
        const r = await fetch(`${API_URL}/reportes/${encodeURIComponent(proyecto)}`, { credentials: 'include' });
        if (r.ok) this.reporte = await r.json();
      } catch (e) { console.error('Error cargando reporte:', e); }
    },

    estadoHitoBadge(estado) {
      const m = {
        'completado': 'badge-success',
        'en_curso':   'badge-info',
        'en_riesgo':  'badge-warning',
        'retrasado':  'badge-danger',
        'pendiente':  'badge-secondary',
      };
      return m[estado] || 'badge-secondary';
    },

    hitosFiltered() {
      if (this.hitoFiltroEstado === 'todos') return this.hitos;
      return this.hitos.filter(h => h.estado === this.hitoFiltroEstado);
    },

    async onProyectoTareaChange() {
      const proyecto = this.formularioTarea.proyecto;
      this.formularioTarea.hitoId = '';
      this.formularioTarea.macrotareaId = '';
      this.hitosDelProyectoTarea = [];
      if (!proyecto) return;
      try {
        const r = await fetch(`${API_URL}/hitos?proyecto=${encodeURIComponent(proyecto)}`, { credentials: 'include' });
        if (r.ok) this.hitosDelProyectoTarea = await r.json();
      } catch (_) {}
    },

    macrotareasDelHitoSeleccionado() {
      if (!this.formularioTarea.hitoId) return [];
      const hito = this.hitosDelProyectoTarea.find(h => h.id === this.formularioTarea.hitoId);
      return hito?.macrotareas || [];
    },

  },

  beforeUnmount() {
    window.removeEventListener('resize', this.onResize);
    if (this._notifPollId) clearInterval(this._notifPollId);
  },

  mounted() {
    window.addEventListener('resize', this.onResize);
    this.onResize();

    // Verificar si hay sesión guardada
    const usuarioGuardado = localStorage.getItem('usuario');
    
    if (usuarioGuardado) {
      try {
        this.usuario = JSON.parse(usuarioGuardado);
        this.autenticado = true;
        this.email = this.usuario.email;
        this.nombre = this.usuario.nombre;
        this.rol = this.usuario.rol;

        // Cargar datos
        this.cargarMiembros();
        this.cargarProyectos();
        this.cargarTareas();
        this.cargarReuniones();
        this.cargarAnuncios();
        this.verificarGoogleCalendar();
        this.cargarSolicitudes();
        this.cargarPresupuestos();
        this.cargarScrumSesiones();
        this.cargarScrumProgramas();
        this.cargarGastos();
        if (['admin','gerente','pi','responsable_financiero'].includes(this.usuario.rol)) this.cargarTareasConCosto();
        this.cargarNotificaciones();
        this.cargarTablets();
        this.cargarDocumentos();
        if (this.puedeVerRecursos) this.cargarPrestamos();

        // Polling de notificaciones cada 30 segundos
        this._notifPollId = setInterval(() => this.cargarNotificaciones(), 30000);

        if (this.usuario.rol === 'admin') {
          this.cargarAuditoria();
        }

        // Verificar si viene de conectar Google Calendar
        const params = new URLSearchParams(window.location.search);
        if (params.get('gc') === '1') {
          this.googleCalendarConectado = true;
          alert('✅ Google Calendar conectado exitosamente');
          window.history.replaceState({}, '', '/');
        } else if (params.get('gc') === 'error') {
          alert('❌ Error al conectar Google Calendar. Intenta de nuevo.');
          window.history.replaceState({}, '', '/');
        }
      } catch (e) {
        localStorage.removeItem('usuario');
      }
    }

    this.cargando = false;
    this.inicializarCorreccionGlobal();
    console.log('✓ App inicializada');
    
    // Intentar contactar con backend
    fetch(`${API_URL.split('/api')[0]}/health`)
      .then(r => r.json())
      .then(() => console.log('✓ Backend disponible'))
      .catch(() => console.warn('⚠️ Backend no disponible'));
  }
});

app.mount('#app');

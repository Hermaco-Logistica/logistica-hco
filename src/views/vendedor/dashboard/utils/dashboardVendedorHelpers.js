import { normalizarBusqueda } from '../../../../utils/normalizers';
import { clasificarSolicitud } from '../../../../utils/clasificarSolicitud';

/** Clasifica la prórroga en relación con el usuario que consulta el dashboard. */
export const clasificarProrroga = (solicitud, usuarioActualId, usuarioActualEmail) => {
  const prorroga = solicitud?.prorrogaCliente;
  if (!prorroga) return 'sin';

  const esPropia = prorroga.vendedorId === usuarioActualId
    || String(prorroga.vendedorEmail || solicitud.vendedorEmail || '').toLowerCase() === usuarioActualEmail;

  return esPropia ? 'propias' : 'otros';
};

/** Aplica los filtros del listado conservando las reglas por rol y fecha. */
export const filtrarSolicitudesDashboard = ({
  solicitudes,
  role,
  usuarioActualId,
  usuarioActualEmail,
  filterEstado,
  filterResultado,
  filterVendedor,
  filterProrroga,
  fechaInicio,
  fechaFin,
  searchTerm
}) => solicitudes.filter((solicitud) => {
  if (role === 'vendedor' && solicitud.vendedorId !== usuarioActualId) return false;
  if (filterEstado && solicitud.estado !== filterEstado) return false;
  if (filterResultado && (solicitud.resultado || clasificarSolicitud(solicitud.productos, solicitud.estado).resultado) !== filterResultado) return false;
  if (role !== 'vendedor' && filterVendedor && solicitud.vendedorNombre !== filterVendedor) return false;
  if (role === 'gerente' && filterProrroga && clasificarProrroga(solicitud, usuarioActualId, usuarioActualEmail) !== filterProrroga) return false;

  if (solicitud.fechaS) {
    const fechaSDate = solicitud.fechaS.toDate ? solicitud.fechaS.toDate() : new Date(solicitud.fechaS);
    const fechaComparacion = new Date(fechaSDate.getFullYear(), fechaSDate.getMonth(), fechaSDate.getDate());

    if (fechaInicio) {
      const inicio = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate());
      if (fechaComparacion < inicio) return false;
    }
    if (fechaFin) {
      const fin = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate());
      if (fechaComparacion > fin) return false;
    }
  } else if (fechaInicio || fechaFin) {
    return false;
  }

  if (searchTerm) {
    const termino = normalizarBusqueda(searchTerm);
    if (termino) {
      const coincideCorrelativo = normalizarBusqueda(solicitud.correlativo).includes(termino);
      const coincideCliente = normalizarBusqueda(solicitud.cliente).includes(termino);
      const coincideProducto = solicitud.productos?.some((producto) => (
        normalizarBusqueda(producto.desc).includes(termino)
        || normalizarBusqueda(producto.marca).includes(termino)
      ));

      if (!coincideCorrelativo && !coincideCliente && !coincideProducto) return false;
    }
  }

  return true;
});

/** Ordena por fecha de solicitud, admitiendo Timestamp y fechas serializadas. */
export const ordenarSolicitudesPorFecha = (solicitudes) => [...solicitudes].sort((a, b) => {
  const obtenerMilisegundos = (valor) => {
    if (!valor) return 0;
    if (typeof valor === 'object') {
      if (typeof valor.toDate === 'function') {
        try { return valor.toDate().getTime(); } catch { return 0; }
      }
      if (typeof valor.seconds === 'number') return valor.seconds * 1000;
    }
    const milisegundos = Date.parse(valor);
    return Number.isNaN(milisegundos) ? 0 : milisegundos;
  };

  return obtenerMilisegundos(b.fechaS) - obtenerMilisegundos(a.fechaS);
});

/** Devuelve las celdas del calendario mensual, incluyendo espacios iniciales. */
export const obtenerDiasDelMes = (mesActual) => {
  const anio = mesActual.getFullYear();
  const mes = mesActual.getMonth();
  const primerDiaSemana = new Date(anio, mes, 1).getDay();
  const totalDias = new Date(anio, mes + 1, 0).getDate();
  const dias = Array(primerDiaSemana).fill(null);

  for (let dia = 1; dia <= totalDias; dia += 1) dias.push(new Date(anio, mes, dia));
  return dias;
};

/** Presenta la selección actual del filtro de fecha. */
export const formatearRangoFechas = (fechaInicio, fechaFin) => {
  if (!fechaInicio) return 'Elegir Rango / Día';
  const opciones = { day: '2-digit', month: 'short' };
  const inicio = fechaInicio.toLocaleDateString('es-ES', opciones);
  return fechaFin ? `${inicio} - ${fechaFin.toLocaleDateString('es-ES', opciones)}` : inicio;
};

/** Formatea timestamps de Firestore y valores Date para las filas del dashboard. */
export const formatFechaHora = (timestamp) => {
  if (!timestamp?.toDate) return '---';
  return new Intl.DateTimeFormat('es-SV', {
    dateStyle: 'short',
    timeStyle: 'short',
    hour12: false,
    timeZone: 'America/El_Salvador'
  }).format(timestamp.toDate());
};

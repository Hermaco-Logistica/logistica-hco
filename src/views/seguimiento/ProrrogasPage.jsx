import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock3, Filter, History, Search, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { responderProrrogaCliente } from '../../utils/responderProrrogaCliente';
import { ModalRespuestaProrroga } from '../../components/seguimiento/ModalRespuestaProrroga';
import { ProrrogaRegistro } from './components/ProrrogaRegistro';
import { agruparRegistrosProrroga } from './utils/agruparRegistrosProrroga';
import { obtenerCierreEventoSeguimiento } from '../../utils/cicloSeguimiento';
import '../../components/seguimiento/seguimiento.css';
import './prorrogas.css';

const obtenerFecha = (fecha) => {
  if (!fecha) return null;
  if (typeof fecha.toDate === 'function') return fecha.toDate();
  const valor = fecha instanceof Date ? fecha : new Date(fecha);
  return Number.isNaN(valor.getTime()) ? null : valor;
};

const fechaParaInput = (fecha) => {
  const valor = obtenerFecha(fecha);
  if (!valor) return '';
  return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
};

const rangoMesActual = () => {
  const hoy = new Date();
  return {
    desde: fechaParaInput(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
    hasta: fechaParaInput(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0))
  };
};

const obtenerHistorialSolicitud = (solicitud) => {
  const historial = solicitud?.prorrogaCliente?.historial;
  if (Array.isArray(historial) && historial.length > 0) return historial;
  return solicitud?.prorrogaCliente ? [solicitud.prorrogaCliente] : [];
};

const obtenerHistorialRevisionItem = (seguimiento) => {
  if (Array.isArray(seguimiento?.historial) && seguimiento.historial.length > 0) {
    return seguimiento.historial;
  }
  if (!seguimiento?.fechaRevision) return [];
  return [{
    numero: Number(seguimiento.cantidadRevisiones || 1),
    fechaRevision: seguimiento.fechaRevision,
    fechaInicioRevision: seguimiento.fechaInicioRevision || seguimiento.fechaRevision,
    fechaVencimientoRevision: seguimiento.fechaVencimientoRevision,
    diasExtension: null,
    comentario: seguimiento.comentario || '',
    registradoPor: seguimiento.registradoPor || ''
  }];
};

const normalizarBusqueda = (valor) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const obtenerTextoSolicitud = (solicitud) => {
  const productos = Array.isArray(solicitud.productos) ? solicitud.productos : [];
  const textos = [
    solicitud.correlativo,
    solicitud.cliente,
    solicitud.nombreCliente,
    solicitud.vendedor,
    solicitud.vendedorNombre,
    solicitud.vendedorEmail,
    solicitud.tipo,
    solicitud.estado,
    solicitud.motivoVentaPerdida?.nombre,
    solicitud.motivoVentaPerdida?.comentario,
    ...productos.flatMap((item) => [
      item.descripcion,
      item.producto,
      item.nombre,
      item.marca,
      item.codigo,
      item.sku,
      item.estadoItem,
      item.motivoEstadoItem,
      item.seguimientoCliente?.comentario,
      ...(item.seguimientoCliente?.historial || []).map((evento) => evento.comentario)
    ]),
    ...obtenerHistorialSolicitud(solicitud).flatMap((prorroga) => [
      prorroga.motivo,
      prorroga.comentario,
      prorroga.vendedorEmail,
      prorroga.vendedorNombre
    ])
  ];
  return normalizarBusqueda(textos.filter(Boolean).join(' '));
};

export const ProrrogasPage = ({ solicitudes = [], role, userEmail = auth.currentUser?.email || '' }) => {
  const navigate = useNavigate();
  const [pestana, setPestana] = useState('pendientes');
  const [paginacion, setPaginacion] = useState({ clave: '', pagina: 1 });
  const [filtroGerencia, setFiltroGerencia] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [rangoFecha, setRangoFecha] = useState(rangoMesActual);
  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState(false);
  const [respuesta, setRespuesta] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    const tabSeleccionada = document.getElementById(`tab-prorroga-${pestana}`);
    tabSeleccionada?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [pestana]);

  const puedeResponder = role === 'comprador';
  const esVendedor = role === 'vendedor';
  const esGerencia = role === 'gerente' || role === 'administrador';
  const emailNorm = String(userEmail || '').trim().toLowerCase();
  const rangoPredeterminado = rangoMesActual();

  const filtrosActivosCount = Number(filtroGerencia !== 'todas')
    + Number(rangoFecha.desde !== rangoPredeterminado.desde || rangoFecha.hasta !== rangoPredeterminado.hasta);

  const textoRangoFecha = !rangoFecha.desde && !rangoFecha.hasta
    ? 'Todas las fechas'
    : rangoFecha.desde === rangoPredeterminado.desde && rangoFecha.hasta === rangoPredeterminado.hasta
      ? 'Mes actual'
      : `${rangoFecha.desde || 'Inicio'} — ${rangoFecha.hasta || 'Hoy'}`;

  const terminoBusqueda = normalizarBusqueda(busqueda);

  const registros = useMemo(() => solicitudes.filter((solicitud) => (
    !terminoBusqueda || obtenerTextoSolicitud(solicitud).includes(terminoBusqueda)
  )).flatMap((solicitud) => {
    const prorrogas = obtenerHistorialSolicitud(solicitud).map((prorroga, indice) => ({
      tipo: 'prorroga',
      solicitud,
      prorroga,
      cierre: obtenerCierreEventoSeguimiento(solicitud, { tipo: 'prorroga', prorroga }),
      fechaEvento: prorroga.fechaSolicitud,
      clave: `prorroga-${solicitud.id}-${prorroga.ronda || indice}-${indice}`
    }));
    const revisiones = (solicitud.productos || []).flatMap((item, indiceItem) => (
      obtenerHistorialRevisionItem(item.seguimientoCliente).map((revision, indiceRevision) => ({
        tipo: 'revision',
        solicitud,
        revision,
        item,
        indiceItem,
        cierre: obtenerCierreEventoSeguimiento(solicitud, { tipo: 'revision', indiceItem }),
        fechaEvento: revision.fechaRevision,
        clave: `revision-${solicitud.id}-${indiceItem}-${revision.numero || indiceRevision}-${indiceRevision}`
      }))
    ));
    return [...prorrogas, ...revisiones];
  }).filter(({ solicitud }) => {
    if (esVendedor) {
      return solicitud.vendedorId === auth.currentUser?.uid
        || String(solicitud.vendedorEmail || '').toLowerCase() === emailNorm;
    }
    return true;
  }).filter(({ prorroga, solicitud }) => {
    if (!esGerencia || filtroGerencia === 'todas') return true;
    const propia = String(prorroga?.vendedorEmail || solicitud.vendedorEmail || '').toLowerCase() === emailNorm;
    return filtroGerencia === 'propias' ? propia : !propia;
  }).filter(({ fechaEvento }) => {
    const fecha = fechaParaInput(fechaEvento);
    if (!fecha) return false;
    return (!rangoFecha.desde || fecha >= rangoFecha.desde)
      && (!rangoFecha.hasta || fecha <= rangoFecha.hasta);
  }).sort((a, b) => (
    (obtenerFecha(b.fechaEvento)?.getTime() || 0)
    - (obtenerFecha(a.fechaEvento)?.getTime() || 0)
  )), [solicitudes, esVendedor, esGerencia, filtroGerencia, emailNorm, rangoFecha, terminoBusqueda]);

  const pendientes = agruparRegistrosProrroga(registros.filter(({ tipo, prorroga, cierre }) => (
    tipo === 'prorroga' && prorroga.estado === 'pendiente' && !cierre?.cerrado
  )));
  const revisiones = agruparRegistrosProrroga(registros.filter(({ tipo, cierre }) => (
    tipo === 'revision' && !cierre?.cerrado
  )));
  const historial = agruparRegistrosProrroga(registros.filter(({ tipo, prorroga, cierre }) => (
    (tipo === 'prorroga' && (prorroga.estado !== 'pendiente' || cierre?.cerrado))
    || (tipo === 'revision' && cierre?.cerrado)
  )));
  const todasLasSolicitudes = agruparRegistrosProrroga(registros);
  const visibles = pestana === 'pendientes' ? pendientes
    : pestana === 'revisiones' ? revisiones
      : pestana === 'historial' ? historial : todasLasSolicitudes;

  const claveFiltros = `${pestana}|${filtroGerencia}|${rangoFecha.desde}|${rangoFecha.hasta}|${terminoBusqueda}`;
  const paginaActual = paginacion.clave === claveFiltros ? paginacion.pagina : 1;
  const elementosPorPagina = 10;
  const totalPaginas = Math.max(1, Math.ceil(visibles.length / elementosPorPagina));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const inicioPagina = (paginaSegura - 1) * elementosPorPagina;
  const prorrogasPagina = visibles.slice(inicioPagina, inicioPagina + elementosPorPagina);

  const abrirSolicitud = (solicitud) => {
    if (solicitud.tipo !== 'Pedido Manual') return navigate(`/vendedor/detalle/${solicitud.id}`);
    // Compras evalúa la prórroga en su propia vista de revisión del pedido.
    return navigate(role === 'comprador'
      ? `/compras/revision-pedido/${solicitud.id}`
      : `/vendedor/pedido-manual/${solicitud.id}`);
  };

  const responderProrroga = async (comentario) => {
    if (!respuesta) return;
    setGuardando(true);
    try {
      const { solicitud, prorroga, accion } = respuesta;
      await responderProrrogaCliente({
        solicitud,
        prorroga,
        accion,
        comentario,
        respondidoPor: auth.currentUser?.email || ''
      });
      setRespuesta(null);
    } catch (error) {
      console.error('Error respondiendo prórroga:', error);
      alert(error.message || 'No se pudo registrar la respuesta a la prórroga.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="prorrogas-page animate-in fade-in duration-500 mx-auto max-w-7xl space-y-5 pb-8">
      {/* Cabecera y KPIs (A) */}
      <header className="prorrogas-header">
        <div className="prorrogas-header__intro">
          <h1 className="prorrogas-title">
            Prórrogas<span className="prorrogas-title__dot">.</span>
          </h1>
          <p className="prorrogas-subtitle">
            Prórrogas pendientes, decisiones atendidas y constancia de las solicitudes mantenidas en revisión.
          </p>
        </div>

        {/* Tarjeta única con 3 celdas */}
        <div className="prorrogas-kpis">
          <div className="prorrogas-kpi-cell">
            <span className="prorrogas-kpi-label">
              <span className="prorrogas-kpi-dot prorrogas-kpi-dot--amber" aria-hidden="true" />
              Por atender
            </span>
            <strong className="prorrogas-kpi-value">{pendientes.length}</strong>
          </div>
          <div className="prorrogas-kpi-cell">
            <span className="prorrogas-kpi-label">
              <span className="prorrogas-kpi-dot prorrogas-kpi-dot--blue" aria-hidden="true" />
              Revisiones
            </span>
            <strong className="prorrogas-kpi-value">{revisiones.length}</strong>
          </div>
          <div className="prorrogas-kpi-cell">
            <span className="prorrogas-kpi-label">
              <span className="prorrogas-kpi-dot prorrogas-kpi-dot--green" aria-hidden="true" />
              Atendidas
            </span>
            <strong className="prorrogas-kpi-value">{historial.length}</strong>
          </div>
        </div>
      </header>

      {/* Un solo contenedor para Filtros + Tabs + Tabla (B) */}
      <div className="@container/prorrogas prorrogas-box w-full min-w-0">
        {/* Sección 1: Barra de Filtros */}
        <div className="prorrogas-filters">
          {/* Versión móvil (< 768px) */}
          <div className="md:hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-[var(--detalle-text-subtle)]">Fecha de actividad</span>
                <span className="mt-0.5 block truncate text-[12px] font-bold text-[var(--detalle-text)]">{textoRangoFecha}</span>
              </div>
              <button
                type="button"
                onClick={() => setMostrarFiltrosMobile((visible) => !visible)}
                className={`prorrogas-btn-secondary ${filtrosActivosCount > 0 ? 'border-[var(--detalle-accent-info)] text-[var(--detalle-accent-info)]' : ''}`}
              >
                <Filter size={13} /> Filtros{filtrosActivosCount > 0 ? ` (${filtrosActivosCount})` : ''}
                {mostrarFiltrosMobile ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {filtrosActivosCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setRangoFecha(rangoMesActual()); setFiltroGerencia('todas'); }}
                  aria-label="Restablecer filtros"
                  className="prorrogas-btn-secondary !w-9 !px-0"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {mostrarFiltrosMobile && (
              <div className="mt-3 grid gap-2.5 border-t border-[var(--detalle-border)] pt-3 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-2">
                  <label className="prorrogas-filter-field">
                    <span className="prorrogas-filter-label">Desde</span>
                    <input
                      type="date"
                      value={rangoFecha.desde}
                      max={rangoFecha.hasta || undefined}
                      onChange={(event) => setRangoFecha((actual) => ({ ...actual, desde: event.target.value }))}
                      className="prorrogas-input"
                    />
                  </label>
                  <label className="prorrogas-filter-field">
                    <span className="prorrogas-filter-label">Hasta</span>
                    <input
                      type="date"
                      value={rangoFecha.hasta}
                      min={rangoFecha.desde || undefined}
                      onChange={(event) => setRangoFecha((actual) => ({ ...actual, hasta: event.target.value }))}
                      className="prorrogas-input"
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRangoFecha(rangoMesActual())}
                    className="prorrogas-btn-secondary flex-1"
                  >
                    Mes actual
                  </button>
                  <button
                    type="button"
                    onClick={() => setRangoFecha({ desde: '', hasta: '' })}
                    className="prorrogas-btn-secondary flex-1"
                  >
                    Todas las fechas
                  </button>
                </div>
                {esGerencia && (
                  <div className="border-t border-[var(--detalle-border)] pt-2">
                    <span className="mb-1.5 block text-[11px] font-semibold text-[var(--detalle-text-subtle)]">Vendedor</span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        ['todas', 'Todos'],
                        ['propias', 'Propias'],
                        ['otros', 'Otros']
                      ].map(([valor, etiqueta]) => (
                        <button
                          key={valor}
                          type="button"
                          onClick={() => setFiltroGerencia(valor)}
                          className={`prorrogas-segmented-btn ${filtroGerencia === valor ? 'prorrogas-segmented-btn--active' : ''}`}
                        >
                          {etiqueta}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Versión desktop (>= 768px) */}
          <div className="hidden md:flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="prorrogas-filter-field">
                <span className="prorrogas-filter-label">Fecha desde</span>
                <input
                  type="date"
                  value={rangoFecha.desde}
                  max={rangoFecha.hasta || undefined}
                  onChange={(event) => setRangoFecha((actual) => ({ ...actual, desde: event.target.value }))}
                  className="prorrogas-input"
                />
              </label>

              <label className="prorrogas-filter-field">
                <span className="prorrogas-filter-label">Fecha hasta</span>
                <input
                  type="date"
                  value={rangoFecha.hasta}
                  min={rangoFecha.desde || undefined}
                  onChange={(event) => setRangoFecha((actual) => ({ ...actual, hasta: event.target.value }))}
                  className="prorrogas-input"
                />
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRangoFecha(rangoMesActual())}
                  className="prorrogas-btn-secondary"
                >
                  Mes actual
                </button>
                <button
                  type="button"
                  onClick={() => setRangoFecha({ desde: '', hasta: '' })}
                  className="prorrogas-btn-secondary"
                >
                  Todas las fechas
                </button>
              </div>
            </div>

            {esGerencia && (
              <div className="flex items-center gap-2">
                <span className="prorrogas-filter-label">Vendedor:</span>
                <div className="prorrogas-segmented">
                  {[
                    ['todas', 'Todos'],
                    ['propias', 'Propias'],
                    ['otros', 'Otros']
                  ].map(([valor, etiqueta]) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setFiltroGerencia(valor)}
                      className={`prorrogas-segmented-btn ${filtroGerencia === valor ? 'prorrogas-segmented-btn--active' : ''}`}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="prorrogas-search-section">
          <label className="prorrogas-search-label" htmlFor="prorrogas-search-input">
            Buscar solicitudes e ítems
          </label>
          <div className="prorrogas-search">
            <Search size={17} aria-hidden="true" />
            <input
              id="prorrogas-search-input"
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Correlativo, cliente, vendedor, ítem o marca"
              aria-label="Buscar por correlativo, cliente, vendedor o ítem"
            />
            {busqueda && (
              <button type="button" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Sección 2: Tabs estilo subrayado */}
        <div className="prorrogas-tabs-container">
          <nav className="prorrogas-tabs" aria-label="Vista de prórrogas" tabIndex={0}>
            {[
              ['pendientes', 'Pendientes', pendientes.length],
              ['revisiones', 'Mantener en revisión', revisiones.length],
              ['historial', 'Historial atendido', historial.length],
              ['todas', 'Todas', registros.length]
            ].map(([valor, etiqueta, total]) => (
              <button
                key={valor}
                id={`tab-prorroga-${valor}`}
                type="button"
                onClick={() => setPestana(valor)}
                className={`prorrogas-tab ${pestana === valor ? 'prorrogas-tab--active' : ''}`}
              >
                <span>{etiqueta}</span>
                <span className="prorrogas-tab-count">({total})</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Sección 3: Contenido / Tabla */}
        {visibles.length === 0 ? (
          <div className="px-6 py-14 text-center">
            {pestana === 'pendientes' ? (
              <Clock3 size={24} className="mx-auto text-[var(--detalle-border-strong)]" />
            ) : (
              <History size={24} className="mx-auto text-[var(--detalle-border-strong)]" />
            )}
            <p className="mt-3 text-[13px] font-semibold text-[var(--detalle-text-muted)]">
              {terminoBusqueda
                ? `No hay registros que coincidan con “${busqueda.trim()}”.`
                : pestana === 'pendientes'
                ? 'No hay prórrogas pendientes.'
                : pestana === 'revisiones'
                  ? 'No hay registros de solicitudes mantenidas en revisión en este período.'
                  : 'Todavía no hay prórrogas en el historial.'}
            </p>
          </div>
        ) : (
          <>
            {/* Móvil: Tarjetas */}
            <div className="prorrogas-mobile-list">
              {prorrogasPagina.map((record) => (
                <ProrrogaRegistro
                  key={record.clave}
                  record={record}
                  view="mobile"
                  puedeResponder={puedeResponder}
                  onAtender={abrirSolicitud}
                  onResponder={(solicitud, prorroga, accion) => setRespuesta({ solicitud, prorroga, accion })}
                />
              ))}
            </div>

            {/* Desktop: Tabla 5 columnas fijas */}
            {/* 57rem (912px): los mínimos de columnas suman 910px (190 + 140 + 180 + 200 + 200). */}
            <div className="prorrogas-desktop-table overflow-x-auto">
              <table className="prorrogas-table">
                <thead className="prorrogas-thead">
                  <tr>
                    <th style={{ width: '22%' }}>Solicitud</th>
                    <th style={{ width: '15%' }}>Estado</th>
                    <th style={{ width: '24%' }}>Motivo</th>
                    <th style={{ width: '22%' }}>Plazo</th>
                    <th style={{ width: '17%', textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody className="prorrogas-tbody">
                  {prorrogasPagina.map((record) => (
                    <ProrrogaRegistro
                      key={record.clave}
                      record={record}
                      view="desktop"
                      puedeResponder={puedeResponder}
                      onAtender={abrirSolicitud}
                      onResponder={(solicitud, prorroga, accion) => setRespuesta({ solicitud, prorroga, accion })}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Paginación Sobria (D) */}
      {totalPaginas > 1 && (
        <nav className="prorrogas-pagination" aria-label="Paginación de prórrogas">
          <p className="prorrogas-pagination-text">
            Página {paginaSegura} de {totalPaginas} · {inicioPagina + 1}–{Math.min(inicioPagina + elementosPorPagina, visibles.length)} de {visibles.length} registros
          </p>
          <div className="prorrogas-pagination-controls">
            <button
              type="button"
              onClick={() => setPaginacion({ clave: claveFiltros, pagina: Math.max(1, paginaSegura - 1) })}
              disabled={paginaSegura === 1}
              className="prorrogas-pagination-btn"
              aria-label="Página anterior"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <button
              type="button"
              onClick={() => setPaginacion({ clave: claveFiltros, pagina: Math.min(totalPaginas, paginaSegura + 1) })}
              disabled={paginaSegura === totalPaginas}
              className="prorrogas-pagination-btn"
              aria-label="Página siguiente"
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        </nav>
      )}

      <ModalRespuestaProrroga
        key={respuesta ? `${respuesta.solicitud.id}-${respuesta.prorroga.ronda}-${respuesta.accion}` : 'sin-respuesta'}
        solicitud={respuesta?.prorroga}
        solicitudBase={respuesta?.solicitud}
        accion={respuesta?.accion}
        guardando={guardando}
        onClose={() => setRespuesta(null)}
        onConfirmar={responderProrroga}
      />
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { CalendarClock, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock3, Filter, History, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { responderProrrogaCliente } from '../../utils/responderProrrogaCliente';
import { ModalRespuestaProrroga } from '../../components/seguimiento/ModalRespuestaProrroga';
import { ProrrogaRegistro } from './components/ProrrogaRegistro';
import { agruparRegistrosProrroga } from './utils/agruparRegistrosProrroga';
import '../../components/seguimiento/seguimiento.css';

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

export const ProrrogasPage = ({ solicitudes = [], role, userEmail = auth.currentUser?.email || '' }) => {
  const navigate = useNavigate();
  const [pestana, setPestana] = useState('pendientes');
  const [paginacion, setPaginacion] = useState({ clave: '', pagina: 1 });
  const [filtroGerencia, setFiltroGerencia] = useState('todas');
  const [rangoFecha, setRangoFecha] = useState(rangoMesActual);
  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState(false);
  const [respuesta, setRespuesta] = useState(null);
  const [guardando, setGuardando] = useState(false);
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

  const registros = useMemo(() => solicitudes.flatMap((solicitud) => {
    const prorrogas = obtenerHistorialSolicitud(solicitud).map((prorroga, indice) => ({
      tipo: 'prorroga',
      solicitud,
      prorroga,
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
  )), [solicitudes, esVendedor, esGerencia, filtroGerencia, emailNorm, rangoFecha]);

  const pendientes = agruparRegistrosProrroga(registros.filter(({ tipo, prorroga }) => tipo === 'prorroga' && prorroga.estado === 'pendiente'));
  const revisiones = agruparRegistrosProrroga(registros.filter(({ tipo }) => tipo === 'revision'));
  const historial = agruparRegistrosProrroga(registros.filter(({ tipo, prorroga }) => tipo === 'prorroga' && prorroga.estado !== 'pendiente'));
  const todasLasSolicitudes = agruparRegistrosProrroga(registros);
  const visibles = pestana === 'pendientes' ? pendientes
    : pestana === 'revisiones' ? revisiones
      : pestana === 'historial' ? historial : todasLasSolicitudes;
  const claveFiltros = `${pestana}|${filtroGerencia}|${rangoFecha.desde}|${rangoFecha.hasta}`;
  const paginaActual = paginacion.clave === claveFiltros ? paginacion.pagina : 1;
  const elementosPorPagina = 10;
  const totalPaginas = Math.max(1, Math.ceil(visibles.length / elementosPorPagina));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const inicioPagina = (paginaSegura - 1) * elementosPorPagina;
  const prorrogasPagina = visibles.slice(inicioPagina, inicioPagina + elementosPorPagina);

  const abrirSolicitud = (solicitud) => navigate(
    solicitud.tipo === 'Pedido Manual'
      ? `/vendedor/pedido-manual/${solicitud.id}`
      : `/vendedor/detalle/${solicitud.id}`
  );

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
      alert('No se pudo registrar la respuesta a la prórroga.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 mx-auto max-w-7xl space-y-5 pb-8">
      <header className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-800 sm:text-4xl">Prórrogas <span className="text-emerald-500">.</span></h1>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:text-[11px]">
            Prórrogas pendientes, decisiones atendidas y constancia de las solicitudes mantenidas en revisión.
          </p>
        </div>
        <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-[27rem]">
          <div className="rounded-xl border border-slate-200 border-t-2 border-t-sky-600 bg-white px-3 py-2.5 shadow-xs">
            <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Por atender</span>
            <strong className="mt-0.5 block text-xl font-black leading-none text-slate-800 tabular-nums">{pendientes.length}</strong>
          </div>
          <div className="rounded-xl border border-slate-200 border-t-2 border-t-amber-500 bg-white px-3 py-2.5 shadow-xs">
            <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Revisiones</span>
            <strong className="mt-0.5 block text-xl font-black leading-none text-slate-800 tabular-nums">{revisiones.length}</strong>
          </div>
          <div className="rounded-xl border border-slate-200 border-t-2 border-t-emerald-600 bg-white px-3 py-2.5 shadow-xs">
            <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Prórrogas atendidas</span>
            <strong className="mt-0.5 block text-xl font-black leading-none text-slate-800 tabular-nums">{historial.length}</strong>
          </div>
        </div>
      </header>

      <section className="md:hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs" aria-label="Filtros móviles de prórrogas">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Fecha de actividad</span>
            <span className="mt-0.5 block truncate text-xs font-bold text-slate-700">{textoRangoFecha}</span>
          </div>
          <button type="button" onClick={() => setMostrarFiltrosMobile((visible) => !visible)} className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors ${filtrosActivosCount > 0 ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
            <Filter size={14} /> Filtros{filtrosActivosCount > 0 ? ` (${filtrosActivosCount})` : ''}
            {mostrarFiltrosMobile ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {filtrosActivosCount > 0 && (
            <button type="button" onClick={() => { setRangoFecha(rangoMesActual()); setFiltroGerencia('todas'); }} aria-label="Restablecer filtros" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600">
              <Trash2 size={14} />
            </button>
          )}
        </div>
        {mostrarFiltrosMobile && (
          <div className="mt-3 grid animate-in gap-2.5 border-t border-slate-100 pt-3 fade-in duration-200">
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Desde
                <input type="date" value={rangoFecha.desde} max={rangoFecha.hasta || undefined} onChange={(event) => setRangoFecha((actual) => ({ ...actual, desde: event.target.value }))} className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-700 outline-none focus:border-slate-400" />
              </label>
              <label className="grid gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Hasta
                <input type="date" value={rangoFecha.hasta} min={rangoFecha.desde || undefined} onChange={(event) => setRangoFecha((actual) => ({ ...actual, hasta: event.target.value }))} className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-700 outline-none focus:border-slate-400" />
              </label>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRangoFecha(rangoMesActual())} className="min-h-10 flex-1 rounded-xl bg-slate-900 px-3 text-[10px] font-black uppercase tracking-wide text-white">Mes actual</button>
              <button type="button" onClick={() => setRangoFecha({ desde: '', hasta: '' })} className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-wide text-slate-600">Todas las fechas</button>
            </div>
            {esGerencia && (
              <div className="border-t border-slate-100 pt-2">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-widest text-slate-400">Vendedor</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    ['todas', 'Todos'],
                    ['propias', 'Propias'],
                    ['otros', 'Otros']
                  ].map(([valor, etiqueta]) => (
                    <button key={valor} type="button" onClick={() => setFiltroGerencia(valor)} className={`min-h-9 rounded-lg border px-2 text-[9px] font-black uppercase tracking-wide ${filtroGerencia === valor ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{etiqueta}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:block" aria-label="Filtros de prórrogas">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <label className="grid gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
            Fecha desde
            <input type="date" value={rangoFecha.desde} max={rangoFecha.hasta || undefined} onChange={(event) => setRangoFecha((actual) => ({ ...actual, desde: event.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition-colors focus:border-slate-400 focus:bg-white" />
          </label>
          <label className="grid gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
            Fecha hasta
            <input type="date" value={rangoFecha.hasta} min={rangoFecha.desde || undefined} onChange={(event) => setRangoFecha((actual) => ({ ...actual, hasta: event.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition-colors focus:border-slate-400 focus:bg-white" />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1">
            <button type="button" onClick={() => setRangoFecha(rangoMesActual())} className="min-h-10 flex-1 rounded-xl bg-slate-900 px-4 text-[10px] font-black uppercase tracking-wider text-white transition-colors hover:bg-slate-800 sm:flex-none">Mes actual</button>
            <button type="button" onClick={() => setRangoFecha({ desde: '', hasta: '' })} className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-[10px] font-black uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-50 sm:flex-none">Todas las fechas</button>
          </div>
        </div>
        {esGerencia && (
          <div className="mt-3 hidden flex-wrap items-center gap-2 border-t border-slate-100 pt-3 md:flex">
            <span className="mr-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Vendedor</span>
            {[
              ['todas', 'Todos'],
              ['propias', 'Propias'],
              ['otros', 'Otros vendedores']
            ].map(([valor, etiqueta]) => (
              <button key={valor} type="button" onClick={() => setFiltroGerencia(valor)} className={`min-h-9 rounded-lg border px-3 text-[10px] font-black uppercase tracking-wide transition-colors ${filtroGerencia === valor ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                {etiqueta}
              </button>
            ))}
          </div>
        )}
      </section>

      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs" aria-label="Vista de prórrogas">
        {[
          ['pendientes', 'Pendientes', pendientes.length],
          ['revisiones', 'Mantener en revisión', revisiones.length],
          ['historial', 'Historial atendido', historial.length],
          ['todas', 'Todas', registros.length]
        ].map(([valor, etiqueta, total]) => (
          <button key={valor} type="button" onClick={() => setPestana(valor)} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[9px] font-black uppercase tracking-wide transition-colors sm:px-4 sm:text-[10px] ${pestana === valor ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
            {etiqueta} <span className={`rounded-md px-1.5 py-0.5 text-[9px] tabular-nums ${pestana === valor ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>{total}</span>
          </button>
        ))}
      </nav>

      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-xs">
          {pestana === 'pendientes' ? <Clock3 size={22} className="mx-auto text-slate-300" /> : <History size={22} className="mx-auto text-slate-300" />}
          <p className="mt-3 text-sm font-bold text-slate-600">
            {pestana === 'pendientes' ? 'No hay prórrogas pendientes.'
              : pestana === 'revisiones' ? 'No hay registros de solicitudes mantenidas en revisión en este período.'
                : 'Todavía no hay prórrogas en el historial.'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3.5 md:hidden">
            {prorrogasPagina.map((record) => <ProrrogaRegistro key={record.clave} record={record} view="mobile" puedeResponder={puedeResponder} onAtender={abrirSolicitud} onResponder={(solicitud, prorroga, accion) => setRespuesta({ solicitud, prorroga, accion })} />)}
          </div>
          <div className="tf-surface-panel hidden overflow-x-auto rounded-2xl border border-slate-200 shadow-xs md:block">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead className="tf-table-head-dark text-[9px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-3">Referencia / Cliente</th>
                  <th className="px-4 py-3">Vendedor / Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Motivo / Ítem</th>
                  <th className="px-4 py-3">Plazo / Fecha</th>
                  <th className="px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {prorrogasPagina.map((record) => <ProrrogaRegistro key={record.clave} record={record} view="desktop" puedeResponder={puedeResponder} onAtender={abrirSolicitud} onResponder={(solicitud, prorroga, accion) => setRespuesta({ solicitud, prorroga, accion })} />)}
              </tbody>
            </table>
          </div>
        </>
      )}

      {totalPaginas > 1 && (
        <nav className="flex flex-col items-center gap-3 rounded-2xl bg-slate-900 p-4 text-white shadow-sm sm:flex-row sm:justify-between sm:px-6" aria-label="Paginación de prórrogas">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-300 sm:order-2">
            Página {paginaSegura} de {totalPaginas} · {inicioPagina + 1}–{Math.min(inicioPagina + elementosPorPagina, visibles.length)} de {visibles.length} registros
          </p>
          <div className="flex w-full items-center justify-between gap-3 sm:order-1 sm:w-auto">
            <button
              type="button"
              onClick={() => setPaginacion({ clave: claveFiltros, pagina: Math.max(1, paginaSegura - 1) })}
              disabled={paginaSegura === 1}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl bg-slate-800 px-4 text-[10px] font-black uppercase tracking-wider transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              type="button"
              onClick={() => setPaginacion({ clave: claveFiltros, pagina: Math.min(totalPaginas, paginaSegura + 1) })}
              disabled={paginaSegura === totalPaginas}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl bg-slate-800 px-4 text-[10px] font-black uppercase tracking-wider transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
              aria-label="Página siguiente"
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </nav>
      )}

      <ModalRespuestaProrroga key={respuesta ? `${respuesta.solicitud.id}-${respuesta.prorroga.ronda}-${respuesta.accion}` : 'sin-respuesta'} solicitud={respuesta?.prorroga} solicitudBase={respuesta?.solicitud} accion={respuesta?.accion} guardando={guardando} onClose={() => setRespuesta(null)} onConfirmar={responderProrroga} />
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CalendarClock, Clock3, X } from 'lucide-react';
import { obtenerResumenSeguimientoCliente, ESTADOS_SEGUIMIENTO_CLIENTE } from '../../utils/seguimientoCliente';
import './seguimiento.css';

const ETIQUETAS = {
  cierre_requerido: 'Cierre requerido',
  prorroga_disponible: 'Prórroga disponible',
  vencido: 'Seguimiento vencido',
  prorroga_pendiente: 'Prórroga pendiente',
  seis_horas: 'Vence en menos de 6 horas',
  un_dia: 'Vence en 1 día hábil',
  dos_dias: 'Vence en 2 días hábiles'
};

const obtenerFecha = (fecha) => {
  if (!fecha) return null;
  if (typeof fecha.toDate === 'function') return fecha.toDate();
  const resultado = fecha instanceof Date ? fecha : new Date(fecha);
  return Number.isNaN(resultado.getTime()) ? null : resultado;
};

const formatearFecha = (fecha) => {
  const resultado = obtenerFecha(fecha);
  return resultado ? new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeZone: 'America/El_Salvador' }).format(resultado) : 'Sin fecha';
};

export const ModalSeguimientoSolicitudes = ({ solicitudes = [], isOpen = false, onClose, onAtender }) => {
  const [pestana, setPestana] = useState('seguimiento');

  const solicitudesConResumen = useMemo(() => solicitudes
    .map((solicitud) => ({ solicitud, resumen: obtenerResumenSeguimientoCliente(solicitud) }))
    .filter(({ resumen }) => Boolean(resumen.nivelAviso)), [solicitudes]);

  if (!isOpen) return null;

  const pendientesSeguimiento = solicitudesConResumen.filter(({ resumen }) => (
    resumen.estado !== ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO
  ));
  const cierresRequeridos = solicitudesConResumen.filter(({ resumen }) => (
    resumen.estado === ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO
  ));
  const solicitudesVisibles = pestana === 'cierre' ? cierresRequeridos : pendientesSeguimiento;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-xs sm:p-5">
      <section className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2 text-slate-900"><CalendarClock size={19} className="text-amber-600" /><h2 className="text-sm font-black uppercase tracking-wider">Seguimiento de solicitudes</h2></div>
            <p className="mt-1 text-xs text-slate-500">Atiende las solicitudes próximas a vencer y cierra las que agotaron sus plazos.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar"><X size={18} /></button>
        </header>

        <nav className="flex border-b border-slate-100 px-5 sm:px-6" aria-label="Tipo de seguimiento">
          <button type="button" onClick={() => setPestana('seguimiento')} className={`border-b-2 px-1 py-3 text-[11px] font-black uppercase tracking-wide ${pestana === 'seguimiento' ? 'border-amber-500 text-amber-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
            Por vencer / seguimiento <span className="ml-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px]">{pendientesSeguimiento.length}</span>
          </button>
          <button type="button" onClick={() => setPestana('cierre')} className={`ml-5 border-b-2 px-1 py-3 text-[11px] font-black uppercase tracking-wide ${pestana === 'cierre' ? 'border-rose-500 text-rose-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
            Cierre requerido <span className="ml-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px]">{cierresRequeridos.length}</span>
          </button>
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {solicitudesVisibles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center text-xs font-semibold text-slate-400">No hay solicitudes en esta pestaña.</div>
          ) : (
            <div className="space-y-2">
              {solicitudesVisibles.map(({ solicitud, resumen }) => {
                const esCierre = resumen.estado === ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO;
                return (
                  <div key={solicitud.id} className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ${esCierre ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><span className="truncate text-xs font-black text-slate-800">{solicitud.correlativo || 'Solicitud sin referencia'}</span><span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase ${esCierre ? 'border-rose-200 text-rose-700' : 'border-amber-200 text-amber-700'}`}>{ETIQUETAS[resumen.nivelAviso] || 'Revisar solicitud'}</span></div>
                      <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">{solicitud.cliente || 'Cliente sin nombre'} · {solicitud.vendedorNombre || solicitud.vendedorEmail || 'Vendedor'}</p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500"><Clock3 size={11} /> {esCierre ? `${resumen.diasVencidos} días vencidos` : `Vigencia: ${resumen.diasValidez} días · vence ${formatearFecha(resumen.fechaAlertaInicial)}`}</p>
                      <div className="seguimiento-prorroga">
                        <span>Restante:</span> <strong>{esCierre ? `${resumen.diasVencidos} días vencidos` : `${resumen.diasRestantes} días hábiles`}</strong>
                        <span>·</span>
                        <span>Hasta:</span> <strong>{formatearFecha(resumen.fechaAlertaInicial)}</strong>
                      </div>
                    </div>
                    <button type="button" onClick={() => onAtender(solicitud)} className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white ${esCierre ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-800 hover:bg-slate-900'}`}><span>Atender</span><ArrowRight size={13} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <footer className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-[10px] font-semibold text-slate-400 sm:px-6"><AlertCircle size={13} /> Las solicitudes de cierre deben resolverse como pedido o venta perdida.</footer>
      </section>
    </div>
  );
};

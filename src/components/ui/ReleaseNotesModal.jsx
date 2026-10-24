import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const acentosPorRol = {
  comprador: '#3b82f6',
  vendedor: '#8b5cf6',
  gerente: '#10b981',
  administrador: '#b45366',
};

const mensajeGerenciaAdministracion = 'Si una solicitud o alguno de sus ítems permanece más de 5 días sin seguimiento, debes reportarlo como venta perdida e indicar el motivo y comentario. Además, Análisis y Estadísticas ya incluye las ventas perdidas en sus reportes.';

const mensajesPorRol = {
  vendedor: 'A partir de ahora, reporta como venta perdida las solicitudes o los ítems que permanezcan más de 5 días sin seguimiento. Podrás indicar el motivo y agregar un comentario para dejar constancia de cada caso.',
  comprador: 'Ahora las solicitudes y los ítems pueden identificarse como ventas perdidas, con su motivo y comentario. En Análisis y Estadísticas, los reportes también incluyen esta información.',
  gerente: mensajeGerenciaAdministracion,
  administrador: mensajeGerenciaAdministracion,
};

export const ReleaseNotesModal = ({ role, onConfirm }) => {
  const accent = acentosPorRol[role] || '#64748b';
  const mensaje = mensajesPorRol[role] || mensajesPorRol.vendedor;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-notes-title"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="h-1" style={{ backgroundColor: accent }} />
        <div className="px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex items-start gap-3.5">
            <CheckCircle2 size={21} className="mt-0.5 shrink-0" style={{ color: accent }} aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Novedad del sistema</p>
              <h1 id="release-notes-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                Cambios en Ventas Perdidas
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">{mensaje}</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onConfirm}
              autoFocus
              className="min-h-10 min-w-28 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-slate-200"
              style={{ backgroundColor: accent }}
            >
              OK
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

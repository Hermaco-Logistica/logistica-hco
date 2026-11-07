import React, { useRef } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { FiltroSegmentado } from './FiltroSegmentado';
import { claseCampo, claseFila, claseIcono } from './estilosCampo';
import { centrarEnCuerpo } from './centrarEnCuerpo';
import { useCapaAtras } from './capasAtras';
import { ContextoFiltros, useFilaAcordeon, useModoFiltro } from './contexto';
import { aVista, derivarAcceso, rangoMesActualISO } from './rangosFecha';

const ACCESOS = [
  { value: 'mes', label: 'Mes actual' },
  { value: 'todas', label: 'Todas las fechas' },
  { value: 'personalizado', label: 'Personalizado' }
];

const textoRango = (valor, acceso) => {
  if (acceso === 'todas') return 'Todas las fechas';
  if (acceso === 'mes') return 'Mes actual';
  return `${aVista(valor.desde) || 'Inicio'} — ${aVista(valor.hasta) || 'Hoy'}`;
};

/**
 * Filtro de fechas en modo "nativo": dos <input type="date"> (el selector del navegador) con el estilo de campo. `value` es
 * { desde, hasta } en ISO y `onChange(rango)` recibe el rango completo en el mismo formato: no cambia ni la lógica ni el formato de la
 * vista. `porDefecto` es el rango "sin filtro" (por defecto, el mes actual): si el valor se aparta de él el campo usa el estado
 * "seleccionado". Los accesos rápidos (Mes actual, Todas las fechas, Personalizado) son un FiltroSegmentado cuyo valor se deriva
 * del rango; "Personalizado" solo enfoca el campo "desde". El modo calendario (FiltroFechaCampo + FiltroFechasContenedor) no cambia.
 *   - escritorio: accesos + un solo campo compuesto ("01/11/2026 → 30/11/2026");
 *   - hoja móvil: fila "Fecha" que se despliega en línea (acordeón: una fila abierta a la vez) con accesos y los dos campos.
 */
export const FiltroFechas = ({ value, onChange, porDefecto, etiqueta = 'Fecha', ariaLabel = 'Filtrar por fecha', className = '' }) => {
  const enHoja = useModoFiltro() === 'hoja';
  const fila = useFilaAcordeon();
  const filaRef = useRef(null);
  const desdeRef = useRef(null);
  useCapaAtras(enHoja && fila.abierto, () => fila.abrir(false));
  const mes = rangoMesActualISO();
  const base = porDefecto || mes;
  const acceso = derivarAcceso(value, mes);
  const seleccionado = value.desde !== base.desde || value.hasta !== base.hasta;

  const elegirAcceso = (valor) => {
    if (valor === 'mes') onChange({ ...mes });
    else if (valor === 'todas') onChange({ desde: '', hasta: '' });
    else if (desdeRef.current) {
      desdeRef.current.focus();
      if (typeof desdeRef.current.showPicker === 'function') { try { desdeRef.current.showPicker(); } catch { /* sin gesto de usuario */ } }
    }
  };
  const entradaDesde = (clases) => (
    <input
      ref={desdeRef}
      type="date"
      aria-label="Fecha desde"
      value={value.desde}
      max={value.hasta || undefined}
      onChange={(e) => onChange({ ...value, desde: e.target.value })}
      className={clases}
    />
  );
  const entradaHasta = (clases) => (
    <input
      type="date"
      aria-label="Fecha hasta"
      value={value.hasta}
      min={value.desde || undefined}
      onChange={(e) => onChange({ ...value, hasta: e.target.value })}
      className={clases}
    />
  );

  if (enHoja) {
    const abrirYCentrar = () => {
      fila.abrir(true);
      requestAnimationFrame(() => requestAnimationFrame(() => centrarEnCuerpo(filaRef.current, fila.alturaCuerpoFinal ? fila.alturaCuerpoFinal() : undefined)));
    };
    return (
      <div ref={filaRef} data-fila-acordeon className={`${claseFila(seleccionado)} ${className}`}>
        <button
          type="button"
          aria-expanded={fila.abierto}
          aria-label={ariaLabel}
          onClick={() => { if (fila.abierto) fila.abrir(false); else abrirYCentrar(); }}
          className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-4 text-left text-sm outline-none focus-visible:bg-surface-muted"
        >
          <span className={`shrink-0 font-medium ${seleccionado ? 'text-filtro-texto' : 'text-slate-700'}`}>{etiqueta}</span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className={`truncate ${seleccionado ? 'font-semibold text-filtro-texto' : 'text-slate-500'}`}>{textoRango(value, acceso)}</span>
            <ChevronDown size={16} aria-hidden="true" className={`shrink-0 transition-transform ${fila.abierto ? 'rotate-180' : ''} ${claseIcono(seleccionado)}`} />
          </span>
        </button>
        <div className="filtro-acordeon" data-acordeon-panel data-abierto={fila.abierto} inert={!fila.abierto} aria-hidden={!fila.abierto}>
          <div className="min-h-0 overflow-hidden">
            <div className="space-y-2 px-4 pb-4 pt-1">
              <ContextoFiltros.Provider value="barra">
                <FiltroSegmentado ariaLabel={`${ariaLabel}: accesos rápidos`} opciones={ACCESOS} value={acceso} onChange={elegirAcceso} className="w-full [&>button]:flex-1" />
              </ContextoFiltros.Provider>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-slate-500">Desde</span>
                  <span className={`${claseCampo({ seleccionado })} h-11 px-3`}>{entradaDesde('h-full w-full min-w-0 bg-transparent text-sm font-medium outline-none')}</span>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-slate-500">Hasta</span>
                  <span className={`${claseCampo({ seleccionado })} h-11 px-3`}>{entradaHasta('h-full w-full min-w-0 bg-transparent text-sm font-medium outline-none')}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-peso="3" className={`flex min-w-0 flex-wrap items-center gap-2 ${className}`}>
      <FiltroSegmentado ariaLabel={`${ariaLabel}: accesos rápidos`} opciones={ACCESOS} value={acceso} onChange={elegirAcceso} className="shrink-0" />
      <div className={`${claseCampo({ seleccionado })} min-w-[15rem] flex-1 gap-1 px-3`}>
        <Calendar size={14} aria-hidden="true" className={`shrink-0 ${claseIcono(seleccionado)}`} />
        {entradaDesde('h-full min-w-0 flex-1 bg-transparent text-xs font-medium outline-none')}
        <span aria-hidden="true" className={`shrink-0 ${claseIcono(seleccionado)}`}>→</span>
        {entradaHasta('h-full min-w-0 flex-1 bg-transparent text-xs font-medium outline-none')}
      </div>
    </div>
  );
};

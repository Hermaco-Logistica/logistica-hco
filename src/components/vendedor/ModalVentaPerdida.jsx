import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { registrarVentaPerdida } from '../../services/ventasPerdidasService';
import { useMotivosVentaPerdida } from '../../hooks/useMotivosVentaPerdida';
import { 
  CATEGORIAS_VENTA_PERDIDA, 
  COMENTARIO_VENTA_PERDIDA_MIN 
} from '../../constants/motivosVentaPerdidaData';
import { auth } from '../../firebase';

export const ModalVentaPerdida = ({
  isOpen,
  onClose,
  solicitud,
  itemsSeleccionados = null,
  onExito,
  onConfirmarStaged
}) => {
  const { motivos, loading: loadingMotivos } = useMotivosVentaPerdida();
  const [motivoSeleccionado, setMotivoSeleccionado] = useState(null);
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const textareaRef = useRef(null);
  const seccionComentarioRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMotivoSeleccionado(null);
      setComentario('');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen || !solicitud) return null;

  const longComentario = String(comentario || '').trim().length;
  // Comentario explicativo obligatorio con mínimo de 15 caracteres tras trim
  const esComentarioValido = longComentario >= COMENTARIO_VENTA_PERDIDA_MIN;
  const puedeGuardar = Boolean(motivoSeleccionado && esComentarioValido && !guardando);

  const cantItems = Array.isArray(itemsSeleccionados) ? itemsSeleccionados.length : 0;
  const esPorItems = cantItems > 0;

  const handleSeleccionarMotivo = (m) => {
    setMotivoSeleccionado(m);
  };

  const handleGuardar = async () => {
    if (!puedeGuardar) return;

    if (onConfirmarStaged) {
      onConfirmarStaged({
        motivo: motivoSeleccionado,
        comentario,
        itemsSeleccionados: esPorItems ? itemsSeleccionados : null
      });
      onClose();
      return;
    }

    try {
      setGuardando(true);
      setErrorMsg('');

      const usuarioActual = auth.currentUser;
      await registrarVentaPerdida({
        solicitud,
        motivo: motivoSeleccionado,
        comentario,
        usuario: usuarioActual,
        itemsSeleccionados: esPorItems ? itemsSeleccionados : null
      });

      if (onExito) {
        onExito();
      }
      onClose();
    } catch (err) {
      console.error('[ModalVentaPerdida] Error:', err);
      setErrorMsg(err.message || 'Error al registrar venta perdida.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        
        {/* Cabecera */}
        <div className="bg-slate-900 px-5 sm:px-7 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-mono font-bold uppercase bg-slate-800 border border-slate-700 text-slate-300">
                {esPorItems ? `Cierre (${cantItems} ítem${cantItems > 1 ? 's' : ''})` : 'Cierre Total'}
              </span>
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight">
                Registrar Venta Perdida
              </h2>
            </div>
            <p className="text-slate-400 text-xs mt-0.5 font-medium">
              Ref: <span className="font-mono text-slate-200 font-bold">{solicitud.correlativo || 'S/N'}</span> • {solicitud.cliente || 'Cliente no especificado'}
              {esPorItems && <span className="text-amber-400 font-semibold ml-2">({cantItems} producto(s) seleccionado(s))</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={guardando}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-800 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {loadingMotivos ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="animate-spin text-slate-700" size={24} />
              <span className="text-xs font-semibold uppercase tracking-wider">Cargando catálogo...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Selecciona el motivo de pérdida:
              </div>

              {CATEGORIAS_VENTA_PERDIDA.map((cat) => {
                const motivosCat = motivos.filter(m => m.categoria === cat);
                if (motivosCat.length === 0) return null;

                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
                      {cat}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {motivosCat.map((m) => {
                        const esSeleccionado = motivoSeleccionado?.codigo === m.codigo;
                        const hayOtroSeleccionado = Boolean(motivoSeleccionado && !esSeleccionado);

                        return (
                          <div
                            key={m.codigo}
                            onClick={() => handleSeleccionarMotivo(m)}
                            className={`p-2.5 rounded-md border text-left cursor-pointer transition-all duration-200 flex items-start gap-2.5 ${
                              esSeleccionado
                                ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-[1.01] -translate-y-0.5 z-10 ring-1 ring-slate-900'
                                : hayOtroSeleccionado
                                  ? 'bg-white border-slate-200 text-slate-600 opacity-40 hover:opacity-85 hover:border-slate-300'
                                  : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="motivoVentaPerdida"
                              checked={esSeleccionado}
                              onChange={() => handleSeleccionarMotivo(m)}
                              className="mt-1 text-slate-900 focus:ring-slate-500 shrink-0 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className={`text-xs font-bold leading-tight ${esSeleccionado ? 'text-white' : 'text-slate-800'}`}>
                                  {m.nombre}
                                </span>
                              </div>
                              {m.descripcion && (
                                <p className={`text-[11px] mt-0.5 leading-snug font-medium line-clamp-2 ${
                                  esSeleccionado ? 'text-slate-300' : 'text-slate-500'
                                }`}>
                                  {m.descripcion}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Comentario con contador y validación mínima de 15 caracteres */}
              {motivoSeleccionado && (
                <div
                  ref={seccionComentarioRef}
                  className="pt-3 border-t border-slate-200 space-y-1.5 animate-in fade-in slide-in-from-top-3 duration-200"
                >
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Comentario explicativo <span className="text-rose-600 font-bold">* Obligatorio</span>
                    </label>
                    <span className={`text-[11px] font-mono font-bold ${
                      esComentarioValido ? 'text-emerald-700' : 'text-slate-400'
                    }`}>
                      {longComentario} / {COMENTARIO_VENTA_PERDIDA_MIN} mínimo
                    </span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    rows={3}
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder={motivoSeleccionado.placeholderComentario || 'Explica detalladamente la causa de la pérdida (mínimo 15 caracteres)...'}
                    className={`w-full text-xs font-medium p-3 rounded-md border bg-white transition-all shadow-xs focus:outline-none focus:ring-2 ${
                      longComentario > 0 && !esComentarioValido
                        ? 'border-amber-400 focus:ring-amber-500'
                        : 'border-slate-300 focus:ring-slate-900'
                    }`}
                  />
                  {!esComentarioValido && (
                    <p className="text-[11px] text-amber-700 font-medium">
                      {longComentario === 0
                        ? `Ingresa al menos ${COMENTARIO_VENTA_PERDIDA_MIN} caracteres para habilitar el guardado.`
                        : `Faltan ${COMENTARIO_VENTA_PERDIDA_MIN - longComentario} caracteres para cumplir el mínimo requerido.`}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-6 bg-white border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-3.5 py-2 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={!puedeGuardar}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer disabled:cursor-not-allowed"
          >
            {guardando ? (
              <>
                <Loader2 className="animate-spin" size={13} />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Check size={13} />
                <span>{onConfirmarStaged ? 'Confirmar Selección' : 'Confirmar Venta Perdida'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

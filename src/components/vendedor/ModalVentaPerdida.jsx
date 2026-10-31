import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Check, Loader2, TrendingDown } from 'lucide-react';
import { Modal, ModalAreaTexto, ModalBoton, ModalCallout, ModalCuerpo, ModalEncabezado, ModalPie } from '../Modal';
import { registrarVentaPerdida } from '../../services/ventasPerdidasService';
import { useMotivosVentaPerdida } from '../../hooks/useMotivosVentaPerdida';
import { 
  CATEGORIAS_VENTA_PERDIDA, 
  COMENTARIO_VENTA_PERDIDA_MIN 
} from '../../constants/motivosVentaPerdidaData';
import { auth } from '../../firebase';
import { enviarEvento } from '../../emails';

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
      const resultado = await registrarVentaPerdida({
        solicitud,
        motivo: motivoSeleccionado,
        comentario,
        usuario: usuarioActual,
        itemsSeleccionados: esPorItems ? itemsSeleccionados : null
      });

      // Aviso a Compras (ver src/emails). No bloquea ni falla el registro si el correo no sale.
      enviarEvento('venta_perdida', {
        solicitud,
        items: (resultado.indicesAfectados || []).map((indice) => ({
          ...solicitud.productos?.[indice],
          motivoVentaPerdida: { nombre: motivoSeleccionado.nombre, comentario: comentario.trim() }
        })),
        registradoPor: usuarioActual?.email || ''
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

  const titulo = 'Registrar venta perdida';

  return (
    <Modal etiqueta={titulo} ancho="xl" onCerrar={onClose} bloqueado={guardando}>
      <ModalEncabezado
        titulo={titulo}
        subtitulo={`${solicitud.cliente || 'Cliente no especificado'}${esPorItems ? ` · ${cantItems} producto(s)` : ''}`}
        referencia={`${solicitud.correlativo || 'S/N'} · ${esPorItems ? `Cierre (${cantItems} ítem${cantItems > 1 ? 's' : ''})` : 'Cierre total'}`}
        icono={TrendingDown}
        tono="peligro"
        onCerrar={onClose}
        cerrarDeshabilitado={guardando}
      />

        {/* Cuerpo */}
      <ModalCuerpo>
          {errorMsg && <ModalCallout tono="peligro" icono={AlertCircle} role="alert">{errorMsg}</ModalCallout>}

          {loadingMotivos ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="animate-spin text-slate-700" size={24} />
              <span className="text-[13.5px]">Cargando catálogo...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[13px] font-medium text-neutral-500">Selecciona el motivo de pérdida</p>

              {CATEGORIAS_VENTA_PERDIDA.map((cat) => {
                const motivosCat = motivos.filter(m => m.categoria === cat);
                if (motivosCat.length === 0) return null;

                return (
                  <div key={cat} className="space-y-1.5">
                    <p className="text-[13px] font-medium text-neutral-500">{cat}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {motivosCat.map((m) => {
                        const esSeleccionado = motivoSeleccionado?.codigo === m.codigo;
                        const hayOtroSeleccionado = Boolean(motivoSeleccionado && !esSeleccionado);

                        return (
                          <div
                            key={m.codigo}
                            onClick={() => handleSeleccionarMotivo(m)}
                            className={`flex cursor-pointer items-start gap-2.5 rounded-[14px] p-3.5 text-left transition-colors duration-150 ${
                              esSeleccionado
                                ? 'bg-rose-100 ring-2 ring-rose-500/40'
                                : hayOtroSeleccionado
                                  ? 'bg-neutral-100 opacity-50 hover:opacity-90'
                                  : 'bg-neutral-100 hover:bg-neutral-200/70'
                            }`}
                          >
                            <input
                              type="radio"
                              name="motivoVentaPerdida"
                              checked={esSeleccionado}
                              onChange={() => handleSeleccionarMotivo(m)}
                              className="mt-1 shrink-0 cursor-pointer accent-rose-700"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-[14.5px] font-semibold leading-tight text-neutral-900">
                                  {m.nombre}
                                </span>
                              </div>
                              {m.descripcion && (
                                <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-neutral-500">
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
                <div ref={seccionComentarioRef} className="animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="comentario-venta-perdida" className="text-[13px] font-medium text-neutral-500">
                      Comentario explicativo (obligatorio)
                    </label>
                    <span className={`text-xs ${esComentarioValido ? 'text-emerald-700' : 'text-neutral-400'}`}>
                      {longComentario} / {COMENTARIO_VENTA_PERDIDA_MIN} mínimo
                    </span>
                  </div>
                  <ModalAreaTexto
                    id="comentario-venta-perdida"
                    ref={textareaRef}
                    tono="peligro"
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder={motivoSeleccionado.placeholderComentario || 'Explica detalladamente la causa de la pérdida (mínimo 15 caracteres)...'}
                    error={longComentario > 0 && !esComentarioValido}
                    mensajeError={`Faltan ${COMENTARIO_VENTA_PERDIDA_MIN - longComentario} caracteres para cumplir el mínimo requerido.`}
                    ayuda={!esComentarioValido && longComentario === 0 ? `Ingresa al menos ${COMENTARIO_VENTA_PERDIDA_MIN} caracteres para habilitar el guardado.` : undefined}
                  />
                </div>
              )}
            </div>
          )}
      </ModalCuerpo>

      <ModalPie>
        <ModalBoton onClick={onClose} disabled={guardando}>Cancelar</ModalBoton>
        <ModalBoton variante="peligro" icono={guardando ? Loader2 : Check} onClick={handleGuardar} disabled={!puedeGuardar}>
          {guardando ? 'Guardando...' : onConfirmarStaged ? 'Confirmar selección' : 'Confirmar venta perdida'}
        </ModalBoton>
      </ModalPie>
    </Modal>
  );
};

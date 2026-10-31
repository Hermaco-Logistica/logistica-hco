import React, { useEffect, useState } from 'react';
import { Ban, MessageSquareText, ShieldAlert } from 'lucide-react';
import { Modal, ModalBoton, ModalCallout, ModalCuerpo, ModalDetalle, ModalEncabezado, ModalPie } from './Modal';
import { esMotivoGenerico, buscarMotivoDecisionMensajes } from '../utils/decisionItemHelpers';

export const MotivoAnulacionModal = ({ movimiento, movimientos = [], onClose }) => {
  const [motivosResueltos, setMotivosResueltos] = useState({});

  useEffect(() => {
    if (!movimiento && movimientos.length === 0) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [movimiento, movimientos, onClose]);

  const registros = movimientos.length > 0 ? movimientos : movimiento ? [movimiento] : [];

  useEffect(() => {
    if (registros.length === 0) return undefined;
    let cancelado = false;

    registros.forEach(async (reg, index) => {
      const key = `${reg.idMov || reg.producto}-${index}`;
      const motivoActual = reg.motivoAnulacion?.toString().trim();
      if (!esMotivoGenerico(motivoActual)) return;

      const solId = reg.rfqId || reg.solicitudOriginal?.id;
      if (!solId) return;

      let itemId = reg.idxProducto;
      if (itemId === undefined && reg.idMov) {
        const parts = reg.idMov.split('-');
        const lastPart = parts[parts.length - 1];
        if (!isNaN(Number(lastPart))) itemId = Number(lastPart);
      }
      if (itemId === undefined) itemId = index;

      const tipo = (reg.estadoItem === 'Denegado' || reg.estado === 'Denegado')
        ? 'denegacion'
        : ((reg.estadoItem === 'Cancelado' || reg.estadoItem === 'Rechazado') ? 'rechazo' : 'anulacion');

      const mensajeEventoId = reg.itemOriginal?.negociacion?.ultimoCambio?.mensajeEventoId;
      const fechaEvento = reg.itemOriginal?.negociacion?.ultimoCambio?.en;

      try {
        const res = await buscarMotivoDecisionMensajes({
          solicitudId: solId,
          itemId,
          tipoDecision: tipo,
          mensajeEventoId,
          fechaEvento
        });

        if (res && res.texto && !cancelado) {
          setMotivosResueltos(prev => ({
            ...prev,
            [key]: res.texto
          }));
        }
      } catch (e) {
        console.error('Error buscando motivo en MotivoAnulacionModal:', e);
      }
    });

    return () => { cancelado = true; };
  }, [registros]);

  if (registros.length === 0) return null;

  const principal = registros[0];
  const esDenegado = principal.estado === 'Denegado' || principal.estadoItem === 'Denegado';
  const etiquetaMotivo = esDenegado ? 'Motivo de denegación' : 'Motivo de anulación';

  return (
    <Modal etiqueta={etiquetaMotivo} onCerrar={onClose} ancho="lg">
      <ModalEncabezado
        titulo={etiquetaMotivo}
        subtitulo={`Control de estados · ${registros.length > 1 ? `${registros.length} ítems` : principal.producto}`}
        referencia={principal.correlativo}
        icono={esDenegado ? ShieldAlert : Ban}
        tono={esDenegado ? 'aviso' : 'peligro'}
        onCerrar={onClose}
      />

      <ModalCuerpo>
        <div className="space-y-2">
          {registros.map((registro, index) => {
            const key = `${registro.idMov || registro.producto}-${index}`;
            const motivo = motivosResueltos[key] || registro.motivoAnulacion?.toString().trim() || 'No se registró un motivo.';
            return (
              <article key={key} className="space-y-3 rounded-[14px] bg-neutral-100 p-3.5">
                <ModalDetalle datos={[
                  { etiqueta: 'SKU', valor: registro.sku || registro.codigo || registro.codigoProducto || 'N/D' },
                  { etiqueta: 'Descripción', valor: registro.producto || 'N/D' },
                  { etiqueta: 'Marca', valor: registro.marca || 'N/D' }
                ]} />
                <div>
                  <p className="mb-2 text-[13px] font-medium text-neutral-500">{etiquetaMotivo}</p>
                  <ModalCallout tono={esDenegado ? 'aviso' : 'peligro'} icono={MessageSquareText}>
                    <span className="whitespace-pre-wrap break-words">{motivo}</span>
                  </ModalCallout>
                </div>
              </article>
            );
          })}
        </div>
        <ModalDetalle datos={[{ etiqueta: 'Cliente', valor: principal.cliente || 'N/D' }]} />
      </ModalCuerpo>

      <ModalPie>
        <ModalBoton variante="primario" tono="neutral" onClick={onClose}>Cerrar</ModalBoton>
      </ModalPie>
    </Modal>
  );
};

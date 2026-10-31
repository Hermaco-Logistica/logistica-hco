import React, { useEffect, useMemo, useState } from 'react';
import { XCircle, ShieldAlert, Ban, MessageSquareText } from 'lucide-react';
import { tonoDe } from '../../../utils/etiquetas';
import { 
  formatearFechaDecision, 
  esMotivoGenerico, 
  buscarMotivoDecisionMensajes 
} from '../../../utils/decisionItemHelpers';
import { Etiqueta } from '../../Etiqueta';
import { Modal, ModalBoton, ModalCallout, ModalCuerpo, ModalDetalle, ModalEncabezado, ModalPie } from '../../Modal';

/**
 * Modal exclusivo para consultar motivos de decisiones operativas en ítems:
 * - Oferta Rechazada por el Vendedor
 * - Ítem Denegado por Compras
 * - Ítem Anulado
 * 
 * Soporta ítem individual o lista de múltiples decisiones de una solicitud.
 * Si el motivo guardado en el ítem es genérico o vacío (común en órdenes previas),
 * consulta asíncronamente el mensaje de texto asociado al evento en Firestore.
 * Completamente separado del modal de Venta Perdida (control comercial).
 */
export const ModalConsultaDecisionItem = ({ isOpen = true, onClose, data }) => {
  const activo = Boolean(isOpen && data);
  const [itemsResueltos, setItemsResueltos] = useState([]);
  const [fuenteItemsResueltos, setFuenteItemsResueltos] = useState(null);

  const baseItems = useMemo(() => (
    Array.isArray(data?.items) && data.items.length > 0
      ? data.items
      : (data ? [data] : [])
  ), [data]);
  const solicitudId = data?.solicitudId || baseItems[0]?.solicitudId;
  const necesitanBusqueda = useMemo(
    () => baseItems.some(item => esMotivoGenerico(item.motivo) && (item.solicitudId || solicitudId)),
    [baseItems, solicitudId]
  );
  const cargandoMotivos = Boolean(activo && necesitanBusqueda && fuenteItemsResueltos !== data);

  useEffect(() => {
    if (!activo || !data) {
      return undefined;
    }

    if (!necesitanBusqueda) return undefined;

    let cancelado = false;

    Promise.all(
      baseItems.map(async (item) => {
        const solId = item.solicitudId || solicitudId;
        if (!esMotivoGenerico(item.motivo) || !solId) return item;

        try {
          const resultado = await buscarMotivoDecisionMensajes({
            solicitudId: solId,
            itemId: item.itemId,
            tipoDecision: item.tipoDecision,
            mensajeEventoId: item.mensajeEventoId,
            fechaEvento: item.fechaEvento || item.fecha
          });

          if (!resultado || !resultado.texto) return item;

          return {
            ...item,
            motivo: resultado.texto,
            registradoPor: resultado.autor
              ? `${resultado.autor} (${item.tipoDecision === 'denegacion' ? 'Compras' : 'Vendedor'})`
              : item.registradoPor,
            fecha: resultado.fecha || item.fecha
          };
        } catch {
          return item;
        }
      })
    ).then((actualizados) => {
      if (!cancelado) {
        setItemsResueltos(actualizados);
        setFuenteItemsResueltos(data);
      }
    }).catch(() => {
      if (!cancelado) setFuenteItemsResueltos(data);
    });

    return () => {
      cancelado = true;
    };
  }, [activo, data, necesitanBusqueda, solicitudId, baseItems]);

  if (!activo) return null;

  const itemsList = itemsResueltos.length > 0
    && fuenteItemsResueltos === data
    ? itemsResueltos
    : (Array.isArray(data.items) && data.items.length > 0 ? data.items : [data]);

  const esMultiple = itemsList.length > 1;
  const primerItem = itemsList[0] || {};
  const correlativo = data.correlativo || primerItem.correlativo || 'S/N';
  const cliente = data.cliente || primerItem.cliente || '';

  const tipoPrincipal = primerItem.tipoDecision || 'rechazo';

  // Configuración visual de la cabecera según el tipo principal de decisión
  let headerIcon = XCircle;
  let tono = 'peligro';
  let headerTag = 'Negociación de oferta';
  let headerTitle = esMultiple
    ? `Decisiones de ítems (${itemsList.length} ítems)`
    : (primerItem.tituloModal || 'Motivo de la decisión');

  if (tipoPrincipal === 'denegacion') {
    headerIcon = ShieldAlert;
    tono = 'aviso';
    headerTag = 'Revisión de Compras';
    if (esMultiple) headerTitle = `Ítems denegados (${itemsList.length} ítems)`;
  } else if (tipoPrincipal === 'anulacion') {
    headerIcon = Ban;
    tono = 'neutral';
    headerTag = 'Anulación de ítem';
    if (esMultiple) headerTitle = `Ítems anulados (${itemsList.length} ítems)`;
  }

  return (
    <Modal etiqueta={headerTitle} onCerrar={onClose} ancho="lg">
      <ModalEncabezado
        titulo={headerTitle}
        subtitulo={`${headerTag}${cliente ? ` · ${cliente}` : ''}`}
        referencia={correlativo}
        icono={headerIcon}
        tono={tono}
        onCerrar={onClose}
      />

      <ModalCuerpo className="space-y-2">
        {itemsList.map((item, idx) => {
          const itemTipo = item.tipoDecision || 'rechazo';
          const itemTono = tonoDe('decision', itemTipo === 'denegacion' || itemTipo === 'anulacion' ? itemTipo : 'rechazo');
          const tonoMotivo = itemTipo === 'denegacion' ? 'aviso' : itemTipo === 'anulacion' ? 'neutral' : 'peligro';

          return (
            <article key={idx} className="space-y-3 rounded-[14px] bg-neutral-100 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] text-neutral-500">{esMultiple ? `Ítem ${idx + 1}` : 'Producto'}</p>
                  {item.sku && <p className="font-mono text-[13.5px] font-semibold text-neutral-900">SKU {item.sku}</p>}
                  <p className="break-words text-[14.5px] leading-snug text-neutral-900">{item.producto}</p>
                  {item.marca && item.marca !== 'N/A' && <p className="mt-0.5 text-[12.5px] text-neutral-500">Marca: {item.marca}</p>}
                </div>
                <Etiqueta tono={itemTono} className="shrink-0">{item.badgeLabel}</Etiqueta>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-neutral-500">{item.labelMotivo || 'Motivo'}</p>
                  {cargandoMotivos && esMotivoGenerico(item.motivo) && (
                    <span className="animate-pulse text-xs text-neutral-400">Buscando motivo en historial...</span>
                  )}
                </div>
                <ModalCallout tono={tonoMotivo} icono={MessageSquareText}>
                  <span className="whitespace-pre-wrap break-words">{item.motivo}</span>
                </ModalCallout>
              </div>

              <ModalDetalle datos={[
                { etiqueta: 'Registrado por', valor: item.registradoPor || 'Usuario' },
                { etiqueta: 'Fecha', valor: formatearFechaDecision(item.fecha) }
              ]} />
            </article>
          );
        })}
      </ModalCuerpo>

      <ModalPie>
        <ModalBoton variante="primario" tono="neutral" onClick={onClose}>Cerrar</ModalBoton>
      </ModalPie>
    </Modal>
  );
};

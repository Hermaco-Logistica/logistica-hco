import React from 'react';
import { MessageSquareText, TrendingDown } from 'lucide-react';
import { Modal, ModalBoton, ModalCallout, ModalCuerpo, ModalDetalle, ModalEncabezado, ModalPie } from '../Modal';
import { normalizarItemVentaPerdida, formatearFechaVentaPerdida } from '../../utils/ventasPerdidasHelpers';
import { Etiqueta } from '../../components/Etiqueta';

/**
 * Modal exclusivo para consultar motivos de Venta Perdida (control comercial y CRM).
 * Muestra el catálogo oficial, categorías y comentarios explicativos comerciales.
 */
export const ModalConsultaVentaPerdida = ({ isOpen = true, onClose, data }) => {
  const activo = Boolean(isOpen && data);
  if (!activo) return null;

  const itemsList = Array.isArray(data.items) && data.items.length > 0
    ? data.items
    : [data];

  const esMultiple = itemsList.length > 1;
  const primerItem = itemsList[0] || {};
  const correlativo = data.correlativo || primerItem.correlativo || 'S/N';
  const cliente = data.cliente || primerItem.cliente || '';

  const headerTitle = esMultiple 
    ? `Motivos de Venta Perdida (${itemsList.length} ítems)` 
    : 'Motivo de Venta Perdida';

  return (
    <Modal etiqueta={headerTitle} onCerrar={onClose} ancho="lg">
      <ModalEncabezado
        titulo={headerTitle}
        subtitulo={`Control comercial${cliente ? ` · ${cliente}` : ''}`}
        referencia={correlativo}
        icono={TrendingDown}
        tono="peligro"
        onCerrar={onClose}
      >
        {data.esPendiente && <div className="mt-2"><Etiqueta tono="aviso">Pendiente de enviar</Etiqueta></div>}
      </ModalEncabezado>

      <ModalCuerpo className="space-y-2">
        {itemsList.map((rawItem, idx) => {
          const item = normalizarItemVentaPerdida({
            item: rawItem,
            solicitud: data,
            staged: rawItem.staged || (data.esPendiente ? data : null),
            fallbackIndex: idx
          });
          const comTexto = item.comentario;

          return (
            <article key={idx} className="space-y-3 rounded-[14px] bg-neutral-100 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] text-neutral-500">{esMultiple ? `Ítem ${idx + 1}` : 'Producto'}</p>
                  {item.sku && <p className="font-mono text-[13.5px] font-semibold text-neutral-900">SKU {item.sku}</p>}
                  <p className="break-words text-[14.5px] leading-snug text-neutral-900">{item.producto}</p>
                  {item.marca && item.marca !== 'N/A' && <p className="mt-0.5 text-[12.5px] text-neutral-500">Marca: {item.marca}</p>}
                </div>
                <Etiqueta tono="peligro" className="shrink-0">Venta perdida</Etiqueta>
              </div>

              <div>
                <p className="mb-2 text-[13px] font-medium text-neutral-500">
                  Motivo registrado{item.categoria && item.categoria !== 'General' ? ` (${item.categoria})` : ''}
                </p>
                <ModalCallout tono="peligro" icono={TrendingDown}>{item.motivoNombre}</ModalCallout>
              </div>

              <div>
                <p className="mb-2 text-[13px] font-medium text-neutral-500">Comentario del vendedor</p>
                <ModalCallout tono="neutral" icono={MessageSquareText}>
                  <span className="whitespace-pre-wrap break-words">{comTexto || 'El vendedor no dejó comentario.'}</span>
                </ModalCallout>
              </div>

              <ModalDetalle datos={[
                { etiqueta: 'Registrado por', valor: item.registradoPor || 'Usuario' },
                { etiqueta: 'Fecha', valor: formatearFechaVentaPerdida(item.fecha) }
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

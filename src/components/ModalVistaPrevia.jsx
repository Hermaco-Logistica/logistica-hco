import React from 'react';
import { FileText, Printer } from 'lucide-react';
import { Modal, ModalBoton, ModalCuerpo, ModalEncabezado, ModalPie } from './Modal';

/**
 * Vista previa de un documento imprimible. El contenido va dentro de #cotizacion-print-area,
 * que es el área que `onImprimir` copia al iframe de impresión.
 */
export const ModalVistaPrevia = ({ titulo = 'Vista previa de cotización', referencia, onImprimir, onCerrar, children }) => (
  <Modal etiqueta={titulo} variante="hoja" ancho="completo" onCerrar={onCerrar}>
    <ModalEncabezado titulo={titulo} subtitulo="Documento oficial" referencia={referencia} icono={FileText} tono="neutral" onCerrar={onCerrar} />
    <ModalCuerpo className="bg-white">
      <div id="cotizacion-print-area" className="overflow-x-auto">{children}</div>
    </ModalCuerpo>
    <ModalPie>
      <ModalBoton onClick={onCerrar}>Cerrar</ModalBoton>
      <ModalBoton variante="primario" tono="exito" icono={Printer} onClick={onImprimir}>Imprimir / PDF</ModalBoton>
    </ModalPie>
  </Modal>
);

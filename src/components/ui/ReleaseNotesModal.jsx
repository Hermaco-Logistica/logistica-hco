import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Modal, ModalBoton, ModalCuerpo, ModalEncabezado, ModalPie } from '../Modal';

const tonosPorRol = {
  comprador: 'azul',
  vendedor: 'violeta',
  gerente: 'exito',
  administrador: 'aviso',
};

const mensajeGerenciaAdministracion = 'Si una solicitud o alguno de sus ítems permanece más de 5 días sin seguimiento, debes reportarlo como venta perdida e indicar el motivo y comentario. Además, Análisis y Estadísticas ya incluye las ventas perdidas en sus reportes.';

const mensajesPorRol = {
  vendedor: 'A partir de ahora, reporta como venta perdida las solicitudes o los ítems que permanezcan más de 5 días sin seguimiento. Podrás indicar el motivo y agregar un comentario para dejar constancia de cada caso.',
  comprador: 'Ahora las solicitudes y los ítems pueden identificarse como ventas perdidas, con su motivo y comentario. En Análisis y Estadísticas, los reportes también incluyen esta información.',
  gerente: mensajeGerenciaAdministracion,
  administrador: mensajeGerenciaAdministracion,
};

export const ReleaseNotesModal = ({ role, onConfirm }) => {
  const tono = tonosPorRol[role] || 'neutral';
  const mensaje = mensajesPorRol[role] || mensajesPorRol.vendedor;

  return (
    <Modal etiqueta="Cambios en Ventas Perdidas" capa="aviso" ancho="lg" cerrarConEscape={false} cerrarAlClicFuera={false}>
      <ModalEncabezado titulo="Cambios en Ventas Perdidas" subtitulo="Novedad del sistema" icono={CheckCircle2} tono={tono} />
      <ModalCuerpo>
        <p className="text-[15px] leading-[1.45] text-neutral-600">{mensaje}</p>
      </ModalCuerpo>
      <ModalPie>
        <ModalBoton variante="primario" tono={tono} autoFocus onClick={onConfirm}>OK</ModalBoton>
      </ModalPie>
    </Modal>
  );
};

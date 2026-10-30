import React from 'react';
import { ModalVentaPerdida } from '../../../components/vendedor/ModalVentaPerdida';
import { ModalConsultaVentaPerdida } from '../../../components/vendedor/ModalConsultaVentaPerdida';
import { ModalConsultaDecisionItem } from '../../../components/pedidos/negociacion/ModalConsultaDecisionItem';
import { ModalPlanSeguimientoCliente } from '../../../components/seguimiento/ModalPlanSeguimientoCliente';

export const DetalleRFQModales = ({
  id,
  rfq,
  modalVentaPerdidaOpen,
  setModalVentaPerdidaOpen,
  itemsVentaPerdidaSeleccionados,
  setItemsVentaPerdidaSeleccionados,
  handleConfirmarVentaPerdidaStaged,
  handleVentaPerdidaExito,
  consultaVentaPerdidaData,
  setConsultaVentaPerdidaData,
  consultaDecisionData,
  setConsultaDecisionData,
  modalSeguimientoClienteOpen,
  setModalSeguimientoClienteOpen,
  planSeguimientoCliente,
  handleConfirmarPlanSeguimiento,
  guardandoSeguimientoCliente,
  diasValidezSeguimiento
}) => (
  <>
    <ModalVentaPerdida
      isOpen={modalVentaPerdidaOpen}
      onClose={() => {
        setModalVentaPerdidaOpen(false);
        setItemsVentaPerdidaSeleccionados(null);
      }}
      solicitud={{ id, ...rfq }}
      itemsSeleccionados={itemsVentaPerdidaSeleccionados}
      onConfirmarStaged={handleConfirmarVentaPerdidaStaged}
      onExito={handleVentaPerdidaExito}
    />

    <ModalConsultaVentaPerdida
      isOpen={consultaVentaPerdidaData !== null}
      onClose={() => setConsultaVentaPerdidaData(null)}
      data={consultaVentaPerdidaData}
    />

    <ModalConsultaDecisionItem
      isOpen={consultaDecisionData !== null}
      onClose={() => setConsultaDecisionData(null)}
      data={consultaDecisionData}
    />

    <ModalPlanSeguimientoCliente
      key={modalSeguimientoClienteOpen ? 'seguimiento-abierto' : 'seguimiento-cerrado'}
      isOpen={modalSeguimientoClienteOpen}
      onClose={() => setModalSeguimientoClienteOpen(false)}
      onConfirmar={handleConfirmarPlanSeguimiento}
      plan={planSeguimientoCliente}
      diasValidez={diasValidezSeguimiento}
      guardando={guardandoSeguimientoCliente}
    />
  </>
);

export default DetalleRFQModales;

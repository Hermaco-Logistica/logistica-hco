import React from 'react';
import { ModalVentaPerdida } from '../../../components/vendedor/ModalVentaPerdida';
import { ModalConsultaVentaPerdida } from '../../../components/vendedor/ModalConsultaVentaPerdida';
import { ModalConsultaDecisionItem } from '../../../components/pedidos/negociacion/ModalConsultaDecisionItem';

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
  setConsultaDecisionData
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
  </>
);

export default DetalleRFQModales;

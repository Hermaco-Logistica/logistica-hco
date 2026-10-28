import React from 'react';
import { ModalVentaPerdida } from '../../../components/vendedor/ModalVentaPerdida';
import { ModalConsultaVentaPerdida } from '../../../components/vendedor/ModalConsultaVentaPerdida';
import { ModalConsultaDecisionItem } from '../../../components/pedidos/negociacion/ModalConsultaDecisionItem';
import { ModalSeguimientoCliente } from '../../../components/seguimiento/ModalSeguimientoCliente';

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
  itemsSeguimientoCliente,
  itemsProrrogaCliente,
  handleConfirmarSeguimientoCliente,
  guardandoSeguimientoCliente,
  diasValidezSeguimiento,
  resumenSeguimientoCliente,
  handleAbrirSolicitudProrroga,
  handleConfirmarSolicitudProrroga,
  guardandoProrrogaCliente
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

    <ModalSeguimientoCliente
      key={modalSeguimientoClienteOpen ? 'seguimiento-abierto' : 'seguimiento-cerrado'}
      isOpen={modalSeguimientoClienteOpen}
      onClose={() => setModalSeguimientoClienteOpen(false)}
      onConfirmar={handleConfirmarSeguimientoCliente}
      onSolicitarProrroga={handleConfirmarSolicitudProrroga}
      onPrepararProrroga={handleAbrirSolicitudProrroga}
      cantidadItems={itemsSeguimientoCliente.length}
      diasValidez={diasValidezSeguimiento}
      fechasLimiteRevision={resumenSeguimientoCliente.detalles.filter(({ index }) => itemsSeguimientoCliente.includes(index)).map(({ fechaAlertaInicial }) => fechaAlertaInicial)}
      fechasLimiteProrroga={resumenSeguimientoCliente.detalles.filter(({ index }) => itemsProrrogaCliente.includes(index)).map(({ fechaAlertaInicial }) => fechaAlertaInicial)}
      revisionesUsadas={resumenSeguimientoCliente.revisionesUsadas}
      maxRevisiones={resumenSeguimientoCliente.maxRevisiones}
      permiteMantenerRevision={resumenSeguimientoCliente.puedeMantenerRevision}
      mostrarSolicitudProrroga={resumenSeguimientoCliente.puedeSolicitarProrroga}
      pendiente={resumenSeguimientoCliente.prorrogaPendiente}
      guardando={guardandoSeguimientoCliente}
      guardandoProrroga={guardandoProrrogaCliente}
    />
  </>
);

export default DetalleRFQModales;

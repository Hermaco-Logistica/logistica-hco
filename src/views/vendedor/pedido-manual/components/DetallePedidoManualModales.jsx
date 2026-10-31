import React from 'react';
import { XCircle } from 'lucide-react';
import { ModalMotivo } from '../../../../components/Modal';
import { ModalVentaPerdida } from '../../../../components/vendedor/ModalVentaPerdida';
import { ModalConsultaVentaPerdida } from '../../../../components/vendedor/ModalConsultaVentaPerdida';
import { ModalConsultaDecisionItem } from '../../../../components/pedidos/negociacion/ModalConsultaDecisionItem';
import { ModalPlanSeguimientoCliente } from '../../../../components/seguimiento/ModalPlanSeguimientoCliente';
import { obtenerDiasValidez } from '../../../../utils/cotizacionesEstancadasHelpers';

/** Recibe estados y handlers del detalle; concentra únicamente sus modales. */
export const DetallePedidoManualModales = ({ id, navigate, modalVentaPerdidaOpen, setModalVentaPerdidaOpen, itemsVentaPerdidaSeleccionados, setItemsVentaPerdidaSeleccionados, setItemsSeleccionados, consultaVentaPerdidaData, setConsultaVentaPerdidaData, consultaDecisionData, setConsultaDecisionData, modalSeguimientoClienteOpen, setModalSeguimientoClienteOpen, planSeguimientoCliente, guardandoSeguimientoCliente, modalRechazar, setModalRechazar, handleConfirmarRechazo, solicitudBase, handleConfirmarPlanSeguimiento, handleConfirmarVentaPerdidaStaged }) => (
  <>
      {/* Modal de seguimiento del cliente: revisión y prórroga por pasos */}
      <ModalPlanSeguimientoCliente
        key={modalSeguimientoClienteOpen ? 'seguimiento-abierto' : 'seguimiento-cerrado'}
        isOpen={modalSeguimientoClienteOpen}
        onClose={() => setModalSeguimientoClienteOpen(false)}
        onConfirmar={handleConfirmarPlanSeguimiento}
        plan={planSeguimientoCliente}
        diasValidez={obtenerDiasValidez(solicitudBase)}
        guardando={guardandoSeguimientoCliente}
      />

      {/* Modal de Registro de Venta Perdida */}
      <ModalVentaPerdida
        isOpen={modalVentaPerdidaOpen}
        onClose={() => {
          setModalVentaPerdidaOpen(false);
          setItemsVentaPerdidaSeleccionados(null);
          setItemsSeleccionados({});
        }}
        solicitud={{ id, ...solicitudBase }}
        itemsSeleccionados={itemsVentaPerdidaSeleccionados}
        onConfirmarStaged={handleConfirmarVentaPerdidaStaged}
        onExito={() => {
          setModalVentaPerdidaOpen(false);
          setItemsVentaPerdidaSeleccionados(null);
          setItemsSeleccionados({});
          navigate('/vendedor');
        }}
      />

      {/* Modal de Consulta de Motivo de Venta Perdida (Comercial) */}
      <ModalConsultaVentaPerdida
        isOpen={consultaVentaPerdidaData !== null}
        onClose={() => setConsultaVentaPerdidaData(null)}
        data={consultaVentaPerdidaData}
      />

      {/* Modal de Consulta de Decisión de Ítem (Rechazo, Denegación, Anulación) */}
      <ModalConsultaDecisionItem
        isOpen={consultaDecisionData !== null}
        onClose={() => setConsultaDecisionData(null)}
        data={consultaDecisionData}
      />

      {/* Modal Rechazar Oferta de Compras */}
      {modalRechazar.open && (
        <ModalMotivo
          titulo="Rechazar oferta de Compras"
          subtitulo="Esta información quedará registrada en el historial de negociación."
          icono={XCircle}
          etiquetaCampo="Motivo del rechazo"
          placeholder="Motivo del rechazo (obligatorio)"
          valor={modalRechazar.motivo}
          onCambiar={(motivo) => setModalRechazar(prev => ({ ...prev, motivo }))}
          textoConfirmar="Confirmar rechazo"
          onConfirmar={handleConfirmarRechazo}
          onCancelar={() => setModalRechazar({ open: false, index: null, versionEsperada: null, motivo: '' })}
        />
      )}
  </>
 );

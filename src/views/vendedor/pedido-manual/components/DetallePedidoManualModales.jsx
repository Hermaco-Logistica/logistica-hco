import React from 'react';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-2">Rechazar Oferta de Compras</h3>
            <p className="text-sm text-slate-500 mb-4 leading-snug">
              Ingresa el motivo del rechazo de la oferta de Compras. Esta información quedará registrada en el historial de negociación.
            </p>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all resize-none text-sm font-medium h-24 mb-4 outline-none"
              placeholder="Motivo del rechazo (obligatorio)..."
              value={modalRechazar.motivo}
              onChange={e => setModalRechazar(prev => ({ ...prev, motivo: e.target.value }))}
              autoFocus
            />
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setModalRechazar({ open: false, index: null, versionEsperada: null, motivo: '' })}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleConfirmarRechazo}
                disabled={!modalRechazar.motivo.trim()}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm cursor-pointer shadow-sm"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
  </>
 );

import { useState } from 'react';
import { doc, Timestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  obtenerDiasValidez,
  obtenerFechaLimiteSeguimientoItem
} from '../utils/cotizacionesEstancadasHelpers';
import {
  calcularPlanSeguimiento,
  crearPropsSeguimientoItem,
  crearSeguimientoEnRevision,
  describirPlanSeguimiento,
  obtenerResumenSeguimientoCliente
} from '../utils/seguimientoCliente';
import { crearSolicitudProrroga } from '../utils/prorrogasCliente';

const PLAN_VACIO = { revision: [], prorroga: [], excluidos: [], hayEleccion: false };

/** Gestiona revisión y prórrogas del cliente (RFQ o Pedido Manual) en un solo flujo por pasos. */
export const useSeguimientoSolicitud = ({
  id,
  solicitud,
  productos,
  indicesSeleccionados,
  indicesVentaPerdidaPendientes = [],
  puedeGestionar,
  setItemsSeleccionados
}) => {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [planModal, setPlanModal] = useState(PLAN_VACIO);
  const [guardando, setGuardando] = useState(false);

  const resumenBase = obtenerResumenSeguimientoCliente(solicitud, productos);
  const indicesExcluidos = new Set(indicesVentaPerdidaPendientes);
  const resumen = {
    ...resumenBase,
    indicesRevisionDisponible: resumenBase.indicesRevisionDisponible.filter((indice) => !indicesExcluidos.has(indice)),
    indicesProrrogaDisponible: resumenBase.indicesProrrogaDisponible.filter((indice) => !indicesExcluidos.has(indice))
  };
  resumen.puedeMantenerRevision = resumen.indicesRevisionDisponible.length > 0;
  resumen.puedeSolicitarProrroga = resumen.indicesProrrogaDisponible.length > 0 && !resumen.prorrogaPendiente;

  const seleccionadosActivos = indicesSeleccionados.filter((indice) => !indicesExcluidos.has(indice));
  const planActual = calcularPlanSeguimiento(resumen, seleccionadosActivos);
  const planDescrito = describirPlanSeguimiento(planModal, productos, resumen.detalles);

  const hayRevision = planActual.revision.length > 0;
  const hayProrroga = planActual.prorroga.length > 0;
  // Sin selección el botón aplica a todos los elegibles; no muestra conteo para no simular una preselección.
  const accionBanner = {
    disponible: Boolean(puedeGestionar) && (hayRevision || hayProrroga),
    etiqueta: hayRevision && hayProrroga ? 'Gestionar seguimiento' : hayRevision ? 'Mantener en revisión' : 'Solicitar prórroga',
    cantidad: planActual.hayEleccion ? planActual.revision.length + planActual.prorroga.length : null
  };

  /** Props de SeguimientoItemCondicion para un ítem de la solicitud. */
  const obtenerPropsItem = (item, indice) => crearPropsSeguimientoItem(resumen, solicitud, item, indice);

  const abrirSeguimiento = () => {
    if (!puedeGestionar) return;
    console.info('[SeguimientoPedidoManual] abrir seguimiento', { solicitudId: id, seleccionados: seleccionadosActivos, plan: planActual });
    if (!planActual.revision.length && !planActual.prorroga.length) {
      const { excluidos } = describirPlanSeguimiento(planActual, productos, resumen.detalles);
      window.alert(excluidos.length
        ? `Los ítems seleccionados no están disponibles para seguimiento:\n${excluidos.map(({ etiqueta, motivo }) => `• ${etiqueta}: ${motivo}`).join('\n')}`
        : 'No hay ítems disponibles para revisión ni prórroga.');
      return;
    }
    setPlanModal(planActual);
    setModalAbierto(true);
  };

  /** Registra la revisión y/o la solicitud de prórroga en una sola escritura para no dejar el pedido a medias. */
  const confirmarPlan = async ({ comentario = '', prorroga = null }) => {
    if (!puedeGestionar) return;
    setGuardando(true);
    try {
      const cambios = {};
      if (planModal.revision.length > 0) {
        const productosActualizados = [...productos];
        planModal.revision.forEach((indice) => {
          const producto = productosActualizados[indice];
          if (!producto) return;
          productosActualizados[indice] = {
            ...producto,
            seguimientoCliente: crearSeguimientoEnRevision({
              comentario,
              usuarioEmail: auth.currentUser?.email || '',
              fechaLimiteActual: obtenerFechaLimiteSeguimientoItem(producto, solicitud, indice),
              diasExtension: obtenerDiasValidez(solicitud),
              revisionesPrevias: producto.seguimientoCliente?.cantidadRevisiones,
              seguimientoPrevio: producto.seguimientoCliente
            })
          };
        });
        cambios.productos = productosActualizados;
      }
      if (planModal.prorroga.length > 0 && prorroga) {
        cambios.prorrogaCliente = crearSolicitudProrroga({
          solicitud: { ...solicitud, id },
          indicesItems: planModal.prorroga,
          diasSolicitados: prorroga.diasSolicitados,
          motivo: prorroga.motivo,
          usuarioEmail: auth.currentUser?.email || '',
          usuarioUid: auth.currentUser?.uid || '',
          fechaSolicitud: Timestamp.now(),
          ronda: Number(solicitud?.prorrogaCliente?.ronda || 0) + 1
        });
      }
      if (Object.keys(cambios).length === 0) return;

      console.info('[SeguimientoPedidoManual] confirmar plan', {
        solicitudId: id,
        revision: planModal.revision,
        prorroga: planModal.prorroga
      });
      await updateDoc(doc(db, 'solicitudes', id), cambios);
      setModalAbierto(false);
      setPlanModal(PLAN_VACIO);
      setItemsSeleccionados({});
    } catch (error) {
      console.error('Error registrando seguimiento del cliente:', error);
      alert('No se pudo registrar el seguimiento del cliente.');
    } finally {
      setGuardando(false);
    }
  };

  return {
    modalAbierto,
    setModalAbierto,
    planModal: planDescrito,
    planActual,
    accionBanner,
    obtenerPropsItem,
    guardando,
    resumen,
    abrirSeguimiento,
    confirmarPlan
  };
};

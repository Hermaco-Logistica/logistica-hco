import { parseDate } from './comun';
import { obtenerDetalleDecisionExportable } from './decisionExportable';

/**
 * Aplana una lista de solicitudes en movimientos individuales por ítem/producto
 * @param {Array} solicitudes 
 * @param {Array} ordenesCompra 
 * @returns {Array} Lista plana de movimientos
 */
export function extraerTodosLosMovimientos(solicitudes = [], ordenesCompra = []) {
  const mapFechasOC = {};
  const mapFobConfirmado = {};
  if (Array.isArray(ordenesCompra)) {
    ordenesCompra.forEach((oc) => {
      const num = oc.numeroOC || oc.numero || oc.ocRef;
      if (num && oc.fechaCreacion) {
        mapFechasOC[num.toString().trim()] = oc.fechaCreacion;
      }

      if (Array.isArray(oc.items)) {
        oc.items.forEach((item) => {
          if (item.idRFQ && item.indexOriginal !== undefined && item.indexOriginal !== null) {
            const key = `${item.idRFQ}-${item.indexOriginal}`;
            mapFobConfirmado[key] = item.fobConfirmado ?? item.fobReal ?? item.fob ?? null;
          }
        });
      }
    });
  }

  const list = [];
  const IVA_TASA = 0.13;

  solicitudes.forEach((s) => {
    const clienteNombre = (s.cliente || 'Consumidor Final').trim();
    const productosLista = Array.isArray(s.productos) && s.productos.length > 0
      ? s.productos
      : [{ desc: 'Sin productos detallados', cant: 1 }];

    productosLista.forEach((p, idx) => {
      const fobConfirmado = mapFobConfirmado[`${s.id}-${idx}`];
      const descProducto = (p.desc || p.descripcion || 'Sin descripción').trim().toUpperCase();
      const marcaProducto = (p.marca || '').trim();

      let modNormalizada = 'No asignada';
      const modRaw = (p.modalidad || s.modalidad || '').toString().trim();
      if (modRaw === 'A' || modRaw.toLowerCase().includes('aére') || modRaw.toLowerCase().includes('aere')) {
        modNormalizada = 'Aéreo';
      } else if (modRaw === 'M' || modRaw.toLowerCase().includes('marít') || modRaw.toLowerCase().includes('marit')) {
        modNormalizada = 'Marítimo';
      }

      const unidades = Number(p.cant || p.cantidad || 1);

      let precioUnitario = Number(p.precioUnitario || p.precio || 0);
      if (!precioUnitario && p.fob) {
        const fobVal = Number(p.fob || 0);
        if (modNormalizada === 'Aéreo') {
          const factorA = Number(p.factorA || s.factorA || 1);
          const fva = Number(p.fva || 1.25);
          precioUnitario = Number(p.ventaA || p.precioAereo || (fobVal * factorA * fva));
        } else if (modNormalizada === 'Marítimo') {
          const factorM = Number(p.factorM || s.factorM || 1);
          const fvm = Number(p.fvm || 1.25);
          precioUnitario = Number(p.ventaM || p.precioMaritimo || (fobVal * factorM * fvm));
        } else if (p.subtotal && unidades > 0) {
          precioUnitario = Number(p.subtotal) / unidades;
        } else {
          precioUnitario = fobVal;
        }
      }

      let valorNeto = Number(p.subtotal || 0);
      if (!valorNeto && precioUnitario > 0) {
        valorNeto = precioUnitario * unidades;
      }
      const totalConIva = valorNeto > 0 ? valorNeto * (1 + IVA_TASA) : 0;

      const ocRef = p.numOC || p.ocRef || p.numeroOC || s.numeroOC || s.linkOC || '';
      let estadoItem = p.estadoItem;
      if (estadoItem === 'Pedido Parcial' || estadoItem === 'Comprado') {
        estadoItem = 'Pedido';
      } else if (!estadoItem) {
        if (s.estado === 'Pedido' || s.estado === 'Comprado') {
          estadoItem = 'Pedido';
        } else if (s.estado === 'Pedido Parcial') {
          const tienePrecio = Number(p.fob || p.precioUnitario || 0) > 0;
          estadoItem = tienePrecio ? 'Cotizado' : 'Pendiente';
        } else {
          estadoItem = s.estado || 'Pendiente';
        }
      }

      const fechaSol = s.fechaS || s.fechaCreacion || null;
      const tienePrecio = Number(p.fob || p.precioUnitario || 0) > 0 || ['Cotizado', 'Cotizado Parcial', 'Pedido', 'Pedido Parcial', 'Comprado'].includes(estadoItem);
      const fechaResp = p.fechaCotizacion || (tienePrecio ? (s.fechaCotizacion || s.fechaS) : null);
      const fechaOC = p.fechaOC || (ocRef ? mapFechasOC[ocRef.toString().trim()] : null);
      const hayVentaPerdidaPorItem = productosLista.some((producto) => (
        producto?.estadoItem === 'Venta Perdida' || Boolean(producto?.motivoVentaPerdida)
      ));
      const aplicaMotivoGlobal = !hayVentaPerdidaPorItem && (
        s.estado === 'Venta Perdida' || Boolean(s.motivoVentaPerdida)
      );
      const detalleDecision = obtenerDetalleDecisionExportable(p, s, idx, { aplicarMotivoGlobal: aplicaMotivoGlobal });

      list.push({
        idMov: `${s.id}-${idx}`,
        rfqId: s.id,
        correlativo: s.correlativo || 'S/N',
        producto: descProducto,
        sku: String(p.codigo || p.sku || '').trim(),
        marca: marcaProducto,
        cliente: clienteNombre,
        vendedor: s.vendedorNombre || 'Sin asignar',
        fechaSol,
        fechaResp,
        fechaOC,
        fechaPrincipal: fechaResp || fechaSol,
        unidades,
        modalidad: modNormalizada,
        precioUnitario,
        valorNeto,
        totalConIva,
        ocRef,
        estado: estadoItem,
        idxProducto: idx,
        motivoAnulacion: p.motivoAnulacion || p.motivoEstadoItem || p.motivoDenegacion || p.motivoRechazo || '',
        detalleDecision,
        // GestionOC muestra ordenesCompra.items[].fobConfirmado.
        // Prioridad: FOB confirmado de la OC, FOB real persistido y FOB cotizado.
        fob: Number(fobConfirmado ?? p.fobReal ?? p.fob ?? 0),
        itemOriginal: p,
        solicitudOriginal: s
      });
    });
  });

  list.sort((a, b) => {
    const dateA = parseDate(a.fechaPrincipal)?.getTime() || 0;
    const dateB = parseDate(b.fechaPrincipal)?.getTime() || 0;
    return dateB - dateA;
  });

  return list;
}

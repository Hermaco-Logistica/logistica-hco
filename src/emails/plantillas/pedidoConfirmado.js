import { aviso, boton, cita, cuadriculaDatos, etiquetaCorreo, etiquetaDeDominio, layout, subtitulo, tabla } from '../html/bloques';
import { urlSolicitud } from '../html/enlaces';
import { descripcionItem, esc, fechaHora, moneda } from '../html/texto';

const esPedido = (item) => item.estadoItem === 'Pedido' || item.estadoItem === 'Comprado';
const esVentaPerdida = (item) => item.estadoItem === 'Venta Perdida' || Boolean(item.motivoVentaPerdida);

const urlOrden = (valor) => {
  const texto = String(valor || '').trim();
  const minuscula = texto.toLowerCase();
  if (minuscula.startsWith('http://') || minuscula.startsWith('https://')) return texto;
  if (minuscula.startsWith('www.')) return `https://${texto}`;
  return '';
};

/** Estado de un ítem dentro del pedido, con su detalle. Devuelve HTML ya escapado. */
const estadoDeItem = (p) => {
  if (p.estadoItem === 'Anulado') {
    return `${etiquetaDeDominio('estadoItem', 'Anulado')}${p.motivoAnulacion ? `<div style="margin-top:4px;font-size:11px;color:#be123c;">${esc(p.motivoAnulacion)}</div>` : ''}`;
  }
  if (esVentaPerdida(p)) {
    const motivo = p.motivoVentaPerdida && typeof p.motivoVentaPerdida === 'object' ? p.motivoVentaPerdida : {};
    const nombre = motivo.nombre || motivo.motivoNombre || p.motivoNombre || p.motivoCodigo || 'No especificado';
    const comentario = motivo.comentario || p.comentarioVentaPerdida || '';
    const fecha = motivo.fecha ? fechaHora(motivo.fecha) : '';
    return `${etiquetaDeDominio('estadoItem', 'Venta Perdida')}
      <div style="margin-top:6px;font-size:11px;color:#7c2d12;"><strong>Motivo:</strong> ${esc(nombre)}</div>
      ${comentario ? `<div style="margin-top:2px;font-size:11px;color:#7c2d12;"><strong>Comentario:</strong> ${esc(comentario)}</div>` : ''}
      ${motivo.registradoPor ? `<div style="margin-top:2px;font-size:11px;color:#9a3412;">Registrado por ${esc(motivo.registradoPor)}${fecha && fecha !== '---' ? ` · ${esc(fecha)}` : ''}</div>` : ''}`;
  }
  if (esPedido(p)) {
    const confirmado = p.fechaConfirmacion ? fechaHora(p.fechaConfirmacion) : '';
    const detalleOC = p.estadoItem === 'Comprado' && p.numOC ? `OC ${p.numOC}` : 'Confirmado';
    return `${etiquetaCorreo(detalleOC, 'exito')}${confirmado && confirmado !== '---' ? `<div style="margin-top:4px;font-size:11px;color:#64748b;">${esc(confirmado)}</div>` : ''}`;
  }
  if (p.enConsulta || p.estadoItem === 'En consulta') return etiquetaCorreo('En consulta con proveedor', 'info');
  return etiquetaCorreo('Pendiente de confirmación', 'aviso');
};

/** Aviso a Compras de un pedido generado por el vendedor (completo o parcial), con anulaciones y ventas perdidas. */
export const pedidoConfirmado = ({ pedido, solicitud = null }) => {
  const productos = pedido.productos || [];
  const esParcial = Boolean(pedido.esPedidoParcial);
  const anulados = productos.filter((p) => p.estadoItem === 'Anulado');
  const ventasPerdidas = productos.filter(esVentaPerdida);
  const pedidos = productos.filter(esPedido);
  const cantidad = pedidos.reduce((acc, p) => acc + (Number(p.cantidad) || Number(p.cant) || 0), 0);
  const monto = pedidos.reduce((acc, p) => acc + (Number(p.subtotal) || 0), 0);

  const ordenUrl = urlOrden(pedido.linkOC);
  const bloqueOrden = pedido.linkOC
    ? `<div style="font-size:13px;margin-bottom:6px;"><strong>Orden de compra:</strong> ${ordenUrl ? `<a href="${esc(ordenUrl)}" style="color:#2563eb;font-weight:600;">Abrir documento</a>` : esc(pedido.linkOC)}</div>`
    : '';

  const filas = productos.map((p) => {
    const fuePedido = esPedido(p);
    return [
      `<strong>${esc(descripcionItem(p).toUpperCase())}</strong><div style="font-size:11px;color:#64748b;">Marca: ${esc(p.marca || 'N/A')}${p.diasPrometidos ? ` · Entrega: ${esc(p.diasPrometidos)} d. háb.` : ''}</div><div style="margin-top:6px;">${estadoDeItem(p)}</div>`,
      `<strong>${esc(p.cantidad || p.cant)}</strong>`,
      fuePedido && p.modalidad ? etiquetaDeDominio('modalidad', p.modalidad) : '<span style="color:#94a3b8;">—</span>',
      fuePedido ? moneda(p.precioUnitario || p.precio) : '<span style="color:#94a3b8;">—</span>',
      fuePedido ? `<strong>${moneda(p.subtotal || ((p.precioUnitario || p.precio || 0) * (p.cantidad || p.cant)))}</strong>` : '<span style="color:#94a3b8;">—</span>'
    ];
  });

  return layout({
    categoria: 'Notificación de pedido',
    titulo: `${pedido.tipoSolicitud === 'Pedido Manual' ? 'Pedido manual' : 'RFQ'}: ${pedido.correlativoRFQ}`,
    acento: esParcial ? 'info' : 'exito',
    etiquetas: [
      etiquetaDeDominio('estadoSolicitud', esParcial ? 'Pedido Parcial' : 'Pedido', { rol: 'comprador' }),
      anulados.length ? etiquetaCorreo(`${anulados.length} ${anulados.length === 1 ? 'anulado' : 'anulados'}`, 'peligro') : '',
      ventasPerdidas.length ? etiquetaCorreo(`${ventasPerdidas.length} ${ventasPerdidas.length === 1 ? 'venta perdida' : 'ventas perdidas'}`, 'naranja') : ''
    ],
    cuerpo: `
      ${cuadriculaDatos([
        { rotulo: 'Cliente', valor: esc(pedido.cliente) },
        { rotulo: 'Vendedor', valor: esc(pedido.vendedorNombre), detalle: esc(pedido.vendedorEmail) },
        { rotulo: 'Cobertura del pedido', valor: `${pedidos.length} de ${productos.length - anulados.length} ítems activos`, detalle: `${cantidad} piezas` },
        { rotulo: 'Monto confirmado', valor: moneda(monto) }
      ])}
      ${(pedido.linkOC || pedido.notasPedido) ? `<div style="margin:16px 0;padding:12px 16px;background-color:#f1f5f9;border-radius:10px;">${bloqueOrden}${pedido.notasPedido ? cita({ titulo: 'Comentarios del vendedor', texto: pedido.notasPedido }) : ''}</div>` : ''}
      ${ventasPerdidas.length ? aviso({ tono: 'naranja', titulo: `${ventasPerdidas.length} ${ventasPerdidas.length === 1 ? 'ítem marcado como venta perdida' : 'ítems marcados como ventas perdidas'}`, html: 'El motivo y el comentario del vendedor aparecen en cada ítem.' }) : ''}
      ${subtitulo('Detalle de la solicitud y fechas de confirmación')}
      ${tabla({
        columnas: [{ titulo: 'Ítem / estado' }, { titulo: 'Cant.', alinear: 'center' }, { titulo: 'Modalidad', alinear: 'center' }, { titulo: 'Unitario', alinear: 'right' }, { titulo: 'Subtotal', alinear: 'right' }],
        filas,
        fondoFila: (i) => {
          const p = productos[i];
          if (p.estadoItem === 'Anulado') return '#fff1f2';
          if (esVentaPerdida(p)) return '#fff7ed';
          if (p.estadoItem === 'Comprado' || p.numOC) return '#f0fdf4';
          return i % 2 === 0 ? '#ffffff' : '#f8fafc';
        }
      })}
      ${boton({ texto: 'Ir al sitio', url: urlSolicitud(solicitud || { id: pedido.solicitudId, tipo: pedido.tipoSolicitud }) })}`
  });
};

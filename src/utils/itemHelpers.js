export const itemPedidoConfirmado = (item) => {
  if (!item) return false;
  const isPedidoOrComprado = item.estadoItem === 'Pedido' || item.estadoItem === 'Comprado';
  if (!isPedidoOrComprado) return false;
  
  if (!item.negociacion) return true; // Legacy document
  return item.pedidoGenerado === true; // New flow
};

export const calcularFechaEstimada = (dias) => {
  if (!dias || isNaN(parseInt(dias))) return 'Pendiente';
  let fecha = new Date();
  let diasRestantes = parseInt(dias);
  while (diasRestantes > 0) {
    fecha.setDate(fecha.getDate() + 1);
    if (fecha.getDay() !== 0 && fecha.getDay() !== 6) diasRestantes--;
  }
  return fecha.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/El_Salvador' });
};

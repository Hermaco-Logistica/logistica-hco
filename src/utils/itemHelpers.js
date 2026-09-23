export const itemPedidoConfirmado = (item) => {
  if (!item) return false;
  const isPedidoOrComprado = item.estadoItem === 'Pedido' || item.estadoItem === 'Comprado';
  if (!isPedidoOrComprado) return false;
  
  if (!item.negociacion) return true; // Legacy document
  return item.pedidoGenerado === true; // New flow
};

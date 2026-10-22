export const crearContextoProducto = ({
  producto,
  indice,
  rfq,
  ventasPerdidasPendientes,
  seleccionados,
  esItemYaPedido,
  esItemVentaPerdida,
  esItemDenegado,
  esItemAnulado
}) => {
  const fobVal = Number(producto?.fob || 0);
  const estaCotizado = fobVal > 0;
  const yaFuePedido = esItemYaPedido(producto);
  const stagedVP = Boolean(ventasPerdidasPendientes[indice]);
  const fueVentaPerdida = esItemVentaPerdida(producto, indice);
  const fueDenegado = esItemDenegado(producto);
  const estaAnulado = esItemAnulado(producto);
  const ventaA = fobVal * (producto?.factorA || rfq?.factorA || 1) * (producto?.fva || 1.30);
  const ventaM = fobVal * (producto?.factorM || rfq?.factorM || 1.08) * (producto?.fvm || 1.25);

  return {
    fobVal,
    estaCotizado,
    yaFuePedido,
    stagedVP,
    fueVentaPerdida,
    fueDenegado,
    estaAnulado,
    ventaA,
    ventaM,
    isSelected: Boolean(seleccionados[indice])
  };
};

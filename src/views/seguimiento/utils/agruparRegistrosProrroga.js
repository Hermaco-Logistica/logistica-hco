const obtenerTiempo = (valor) => {
  if (!valor) return 0;
  if (typeof valor.toDate === 'function') return valor.toDate().getTime();
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? 0 : fecha.getTime();
};

const obtenerIndicesEvento = (evento) => evento.tipo === 'revision'
  ? [evento.indiceItem]
  : (Array.isArray(evento.prorroga?.indicesItems) ? evento.prorroga.indicesItems : []);

/** Consolida el historial por solicitud y conserva los eventos para sus conteos. */
export function agruparRegistrosProrroga(registros) {
  const grupos = new Map();

  registros.forEach((evento) => {
    const id = evento.solicitud?.id;
    if (!id) return;
    if (!grupos.has(id)) grupos.set(id, []);
    grupos.get(id).push(evento);
  });

  return [...grupos.entries()].map(([solicitudId, eventos]) => {
    const ordenados = [...eventos].sort((a, b) => obtenerTiempo(b.fechaEvento) - obtenerTiempo(a.fechaEvento));
    const pendiente = ordenados.find((evento) => evento.tipo === 'prorroga' && evento.prorroga?.estado === 'pendiente');
    const principal = pendiente || ordenados[0];
    const totalItems = Array.isArray(principal.solicitud.productos) ? principal.solicitud.productos.length : 0;
    const indicesAfectados = new Set(ordenados.flatMap(obtenerIndicesEvento)
      .map(Number)
      .filter((indice) => Number.isInteger(indice) && indice >= 0 && indice < totalItems));

    return {
      ...principal,
      clave: `solicitud-${solicitudId}`,
      eventos: ordenados,
      fechaEvento: ordenados[0]?.fechaEvento || principal.fechaEvento,
      cobertura: {
        itemsAfectados: indicesAfectados.size,
        totalItems,
        completa: totalItems > 0 && indicesAfectados.size >= totalItems,
        indices: [...indicesAfectados].sort((a, b) => a - b)
      },
      cantidadRevisiones: ordenados.filter((evento) => evento.tipo === 'revision').length,
      cantidadProrrogas: ordenados.filter((evento) => evento.tipo === 'prorroga').length
    };
  }).sort((a, b) => obtenerTiempo(b.fechaEvento) - obtenerTiempo(a.fechaEvento));
}

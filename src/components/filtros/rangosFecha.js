const dos = (n) => String(n).padStart(2, '0');
export const aISO = (fecha) => `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
export const aVista = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

/** Rango del mes en curso en ISO (AAAA-MM-DD), el mismo formato que guarda la vista. */
export const rangoMesActualISO = () => {
  const hoy = new Date();
  return { desde: aISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: aISO(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)) };
};

/** Acceso rápido que corresponde a un rango: se DERIVA del valor (no hay estado propio). */
export const derivarAcceso = (valor, mes = rangoMesActualISO()) => {
  if (!valor.desde && !valor.hasta) return 'todas';
  if (valor.desde === mes.desde && valor.hasta === mes.hasta) return 'mes';
  return 'personalizado';
};

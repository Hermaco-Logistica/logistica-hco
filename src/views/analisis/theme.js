/**
 * Utilidad de diseño y tokens de tema por Rol para el módulo de Análisis.
 * Garantiza un diseño sobrio, minimalista y empresarial, alineado a las
 * variables CSS del proyecto y la paleta propia de cada rol.
 */

export const ROLE_THEMES = {
  comprador: {
    key: 'comprador',
    label: 'Compras & Logística',
    brandHex: '#2563eb',
    textAccent: 'text-blue-600',
    textAccentHover: 'hover:text-blue-700',
    bgSubtle: 'bg-blue-50/70',
    bgBadge: 'bg-blue-50 text-blue-700 border-blue-200/80',
    borderAccent: 'border-blue-200',
    activeTab: 'bg-slate-900 text-white shadow-xs',
    activePeriod: 'bg-blue-600 text-white shadow-xs',
    kpiRing: 'group-hover:border-blue-300',
    redirectorHover: 'hover:text-blue-600 hover:border-blue-300',
    flujoEstados: {
      pendiente: {
        color: 'bg-amber-500',
        barBg: 'bg-amber-100/70',
        textColor: 'text-amber-700',
        iconBg: 'bg-amber-50 text-amber-600 border-amber-200/80',
        barGradient: 'from-amber-500 to-amber-600',
        subGradient: 'from-amber-400 to-amber-500',
        badge: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dot: 'bg-amber-500'
      },
      cotizadas: {
        color: 'bg-blue-600',
        barBg: 'bg-blue-100/70',
        textColor: 'text-blue-700',
        iconBg: 'bg-blue-50 text-blue-600 border-blue-200/80',
        barGradient: 'from-blue-600 to-indigo-600',
        subGradient: 'from-blue-400 to-indigo-400',
        badge: 'bg-blue-50 text-blue-700 border-blue-200/80',
        dot: 'bg-blue-600'
      },
      pedidos: {
        color: 'bg-emerald-600',
        barBg: 'bg-emerald-100/70',
        textColor: 'text-emerald-700',
        iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
        barGradient: 'from-emerald-500 to-teal-600',
        subGradient: 'from-emerald-400 to-teal-400',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dot: 'bg-emerald-600'
      }
    }
  },
  vendedor: {
    key: 'vendedor',
    label: 'Ventas Comercial',
    brandHex: '#7c3aed',
    textAccent: 'text-purple-600',
    textAccentHover: 'hover:text-purple-700',
    bgSubtle: 'bg-purple-50/70',
    bgBadge: 'bg-purple-50 text-purple-700 border-purple-200/80',
    borderAccent: 'border-purple-200',
    activeTab: 'bg-slate-900 text-white shadow-xs',
    activePeriod: 'bg-purple-600 text-white shadow-xs',
    kpiRing: 'group-hover:border-purple-300',
    redirectorHover: 'hover:text-purple-600 hover:border-purple-300',
    flujoEstados: {
      pendiente: {
        color: 'bg-amber-500',
        barBg: 'bg-amber-100/70',
        textColor: 'text-amber-700',
        iconBg: 'bg-amber-50 text-amber-600 border-amber-200/80',
        barGradient: 'from-amber-500 to-amber-600',
        subGradient: 'from-amber-400 to-amber-500',
        badge: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dot: 'bg-amber-500'
      },
      cotizadas: {
        color: 'bg-purple-600',
        barBg: 'bg-purple-100/70',
        textColor: 'text-purple-700',
        iconBg: 'bg-purple-50 text-purple-600 border-purple-200/80',
        barGradient: 'from-purple-600 to-indigo-600',
        subGradient: 'from-purple-400 to-indigo-400',
        badge: 'bg-purple-50 text-purple-700 border-purple-200/80',
        dot: 'bg-purple-600'
      },
      pedidos: {
        color: 'bg-emerald-600',
        barBg: 'bg-emerald-100/70',
        textColor: 'text-emerald-700',
        iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
        barGradient: 'from-emerald-500 to-teal-600',
        subGradient: 'from-emerald-400 to-teal-400',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dot: 'bg-emerald-600'
      }
    }
  },
  gerente: {
    key: 'gerente',
    label: 'Gerencia General',
    brandHex: '#059669',
    textAccent: 'text-emerald-600',
    textAccentHover: 'hover:text-emerald-700',
    bgSubtle: 'bg-emerald-50/70',
    bgBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    borderAccent: 'border-emerald-200',
    activeTab: 'bg-slate-900 text-white shadow-xs',
    activePeriod: 'bg-emerald-600 text-white shadow-xs',
    kpiRing: 'group-hover:border-emerald-300',
    redirectorHover: 'hover:text-emerald-600 hover:border-emerald-300',
    flujoEstados: {
      pendiente: {
        color: 'bg-amber-500',
        barBg: 'bg-amber-100/70',
        textColor: 'text-amber-700',
        iconBg: 'bg-amber-50 text-amber-600 border-amber-200/80',
        barGradient: 'from-amber-500 to-amber-600',
        subGradient: 'from-amber-400 to-amber-500',
        badge: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dot: 'bg-amber-500'
      },
      cotizadas: {
        color: 'bg-teal-600',
        barBg: 'bg-teal-100/70',
        textColor: 'text-teal-700',
        iconBg: 'bg-teal-50 text-teal-600 border-teal-200/80',
        barGradient: 'from-teal-600 to-cyan-600',
        subGradient: 'from-teal-400 to-cyan-400',
        badge: 'bg-teal-50 text-teal-800 border-teal-200/80',
        dot: 'bg-teal-600'
      },
      pedidos: {
        color: 'bg-emerald-600',
        barBg: 'bg-emerald-100/70',
        textColor: 'text-emerald-700',
        iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        barGradient: 'from-emerald-600 to-teal-600',
        subGradient: 'from-emerald-400 to-teal-400',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dot: 'bg-emerald-600'
      }
    }
  },
  administrador: {
    key: 'administrador',
    label: 'Administración',
    brandHex: '#9f1239',
    textAccent: 'text-rose-700',
    textAccentHover: 'hover:text-rose-800',
    bgSubtle: 'bg-rose-50/70',
    bgBadge: 'bg-rose-50 text-rose-700 border-rose-200/80',
    borderAccent: 'border-rose-200',
    activeTab: 'bg-slate-900 text-white shadow-xs',
    activePeriod: 'bg-rose-700 text-white shadow-xs',
    kpiRing: 'group-hover:border-rose-300',
    redirectorHover: 'hover:text-rose-700 hover:border-rose-300',
    flujoEstados: {
      pendiente: {
        color: 'bg-amber-500',
        barBg: 'bg-amber-100/70',
        textColor: 'text-amber-700',
        iconBg: 'bg-amber-50 text-amber-600 border-amber-200/80',
        barGradient: 'from-amber-500 to-amber-600',
        subGradient: 'from-amber-400 to-amber-500',
        badge: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dot: 'bg-amber-500'
      },
      cotizadas: {
        color: 'bg-rose-600',
        barBg: 'bg-rose-100/70',
        textColor: 'text-rose-700',
        iconBg: 'bg-rose-50 text-rose-600 border-rose-200/80',
        barGradient: 'from-rose-600 to-pink-600',
        subGradient: 'from-rose-400 to-pink-400',
        badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
        dot: 'bg-rose-600'
      },
      pedidos: {
        color: 'bg-emerald-600',
        barBg: 'bg-emerald-100/70',
        textColor: 'text-emerald-700',
        iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
        barGradient: 'from-emerald-500 to-teal-600',
        subGradient: 'from-emerald-400 to-teal-400',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dot: 'bg-emerald-600'
      }
    }
  },
  default: {
    key: 'default',
    label: 'Análisis Operativo',
    brandHex: '#0f172a',
    textAccent: 'text-slate-800',
    textAccentHover: 'hover:text-slate-900',
    bgSubtle: 'bg-slate-50',
    bgBadge: 'bg-slate-100 text-slate-700 border-slate-200/80',
    borderAccent: 'border-slate-200',
    activeTab: 'bg-slate-900 text-white shadow-xs',
    activePeriod: 'bg-slate-900 text-white shadow-xs',
    kpiRing: 'group-hover:border-slate-400',
    redirectorHover: 'hover:text-slate-900 hover:border-slate-300',
    flujoEstados: {
      pendiente: {
        color: 'bg-amber-500',
        barBg: 'bg-amber-100/70',
        textColor: 'text-amber-700',
        iconBg: 'bg-amber-50 text-amber-600 border-amber-200/80',
        barGradient: 'from-amber-500 to-amber-600',
        subGradient: 'from-amber-400 to-amber-500',
        badge: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dot: 'bg-amber-500'
      },
      cotizadas: {
        color: 'bg-slate-600',
        barBg: 'bg-slate-200/70',
        textColor: 'text-slate-700',
        iconBg: 'bg-sky-50 text-sky-600 border-sky-200/80',
        barGradient: 'from-sky-500 to-blue-600',
        subGradient: 'from-sky-400 to-blue-400',
        badge: 'bg-slate-100 text-slate-700 border-slate-200/80',
        dot: 'bg-slate-600'
      },
      pedidos: {
        color: 'bg-emerald-600',
        barBg: 'bg-emerald-100/70',
        textColor: 'text-emerald-700',
        iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
        barGradient: 'from-emerald-500 to-teal-600',
        subGradient: 'from-emerald-400 to-teal-400',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dot: 'bg-emerald-600'
      }
    }
  }
};

export const getRoleTheme = (role) => {
  return ROLE_THEMES[role] || ROLE_THEMES.default;
};

/**
 * Formatea el tiempo promedio de respuesta entre creación y cotización.
 * Si es menor a 1 día (< 24 horas), muestra horas o minutos con indicación de alta agilidad.
 *
 * @param {number|null} diasNum - Tiempo promedio en días (número flotante)
 * @returns {object} { valor, unidad, subtexto, etiqueta, badgeClase, esRapido, textoCorto }
 */
export const formatearTiempoRespuesta = (diasNum) => {
  if (diasNum === null || diasNum === undefined || isNaN(diasNum) || diasNum < 0) {
    return {
      valor: '---',
      unidad: '',
      subtexto: 'Sin cotizaciones con fecha',
      etiqueta: null,
      badgeClase: '',
      esRapido: false,
      textoCorto: '---'
    };
  }

  const totalHoras = diasNum * 24;

  // Menos de 1 hora (< 60 minutos)
  if (totalHoras < 1) {
    const minutos = Math.max(1, Math.round(totalHoras * 60));
    return {
      valor: `${minutos}`,
      unidad: minutos === 1 ? 'minuto' : 'minutos',
      subtexto: 'Atención inmediata',
      etiqueta: 'Inmediato (< 1h)',
      badgeClase: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      esRapido: true,
      textoCorto: `${minutos}m`
    };
  }

  // Menos de 24 horas (< 1 día) -> Mismo día
  if (diasNum < 1) {
    const horas = totalHoras < 10 ? totalHoras.toFixed(1) : Math.round(totalHoras).toString();
    return {
      valor: horas,
      unidad: Number(horas) === 1 ? 'hora' : 'horas',
      subtexto: 'Respuesta en el mismo día',
      etiqueta: 'Mismo día (< 24h)',
      badgeClase: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      esRapido: true,
      textoCorto: `${horas}h`
    };
  }

  // 1 día o más
  const dias = diasNum.toFixed(1);
  const esRapido = Number(dias) <= 2.0;
  return {
    valor: dias,
    unidad: Number(dias) === 1 ? 'día' : 'días',
    etiqueta: esRapido ? 'Buen ritmo (≤ 2d)' : null,
    badgeClase: esRapido ? 'bg-blue-50 text-blue-700 border-blue-200/80' : 'bg-slate-100 text-slate-600 border-slate-200',
    esRapido,
    textoCorto: `${dias}d`
  };
};

/**
 * Formatea el tiempo promedio de cierre comercial (fechaCotizacion → fechaPedido/fechaOC).
 * Representa el tiempo real que tarda el vendedor / cliente en concretar el pedido tras ser cotizado.
 * 
 * @param {number|null} diasNum - Tiempo en días (puede ser fraccionario)
 * @returns {object} { valor, unidad, subtexto, etiqueta, badgeClase, esRapido, textoCorto }
 */
export const formatearTiempoCierre = (diasNum) => {
  if (diasNum === null || diasNum === undefined || isNaN(diasNum) || diasNum < 0) {
    return {
      valor: '---',
      unidad: '',
      subtexto: 'Sin pedidos con fecha de cierre',
      etiqueta: null,
      badgeClase: '',
      esRapido: false,
      textoCorto: '---'
    };
  }

  const totalHoras = diasNum * 24;

  // Menos de 1 hora (< 60 minutos)
  if (totalHoras < 1) {
    const minutos = Math.max(1, Math.round(totalHoras * 60));
    return {
      valor: `${minutos}`,
      unidad: minutos === 1 ? 'minuto' : 'minutos',
      subtexto: 'Cierre inmediato',
      etiqueta: 'Inmediato (< 1h)',
      badgeClase: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      esRapido: true,
      textoCorto: `${minutos}m`
    };
  }

  // Menos de 24 horas (< 1 día) -> Mismo día
  if (diasNum < 1) {
    const horas = totalHoras < 10 ? totalHoras.toFixed(1) : Math.round(totalHoras).toString();
    return {
      valor: horas,
      unidad: Number(horas) === 1 ? 'hora' : 'horas',
      subtexto: 'Cierre en el mismo día',
      etiqueta: 'Mismo día (< 24h)',
      badgeClase: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      esRapido: true,
      textoCorto: `${horas}h`
    };
  }

  // 1 día o más
  const dias = diasNum.toFixed(1);
  const esRapido = Number(dias) <= 3.0;
  return {
    valor: dias,
    unidad: Number(dias) === 1 ? 'día' : 'días',
    subtexto: 'Promedio cotización → pedido',
    etiqueta: esRapido ? 'Cierre ágil (≤ 3d)' : null,
    badgeClase: esRapido ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' : 'bg-slate-100 text-slate-600 border-slate-200',
    esRapido,
    textoCorto: `${dias}d`
  };
};

/**
 * Evalúa si una solicitud o ítem se considera 'Ganada' (Pedido o Comprado).
/**
 * Evalúa si una solicitud o ítem se considera 'Ganada' (Criterio estricto: Pedido o Comprado al 100%).
 * Los pedidos parciales se identifican claramente como parciales y no se consideran ganadas completas.
 * 
 * @param {object|string} itemOEstado - Objeto solicitud/movimiento o string de estado
 * @returns {object} { esGanada, esParcial, label, badgeClase, textClase }
 */
export const evaluarEstadoGanada = (itemOEstado) => {
  let estado = '';

  if (typeof itemOEstado === 'string') {
    estado = itemOEstado;
  } else if (itemOEstado && typeof itemOEstado === 'object') {
    // Si es un ítem de producto individual en una tabla de movimientos/historial
    if (itemOEstado.itemOriginal || itemOEstado.estadoItem) {
      const p = itemOEstado.itemOriginal || {};
      const estadoItem = (p.estadoItem || itemOEstado.estadoItem || '').trim();
      const estadoSolicitud = (itemOEstado.solicitudOriginal?.estado || itemOEstado.estado || '').trim();
      
      // 1. Si el ítem individual explícitamente fue pedido o comprado -> GANADA
      if (estadoItem === 'Pedido' || estadoItem === 'Comprado') {
        estado = 'Pedido';
      }
      // 2. Si la solicitud entera fue Pedido o Comprado
      else if (estadoSolicitud === 'Pedido' || estadoSolicitud === 'Comprado') {
        if (estadoItem && estadoItem !== 'Pedido' && estadoItem !== 'Comprado') {
          estado = estadoItem;
        } else {
          estado = 'Pedido';
        }
      }
      // 3. Si la solicitud entera es Pedido Parcial y este ítem NO fue pedido -> Cotizado o Pendiente
      else if (estadoSolicitud === 'Pedido Parcial') {
        const tienePrecio = Number(p.fob || p.precioUnitario || itemOEstado.precioUnitario || 0) > 0;
        estado = (estadoItem && estadoItem !== 'Pedido Parcial') 
          ? estadoItem 
          : (tienePrecio ? 'Cotizado' : 'Pendiente');
      } else {
        estado = estadoItem || estadoSolicitud || 'Pendiente';
      }
    } else {
      // Es una solicitud / RFQ completa
      estado = itemOEstado.estado || '';
    }
  }

  const est = (estado || '').trim();

  // 1. Ganada completa (100% Pedido o Comprado)
  if (est === 'Pedido' || est === 'Comprado') {
    return {
      esGanada: true,
      esParcial: false,
      label: 'Ganada',
      badgeClase: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      textClase: 'text-emerald-700'
    };
  }

  // 2. Pedido Parcial (RFQ con compra parcial a nivel de solicitud)
  if (est === 'Pedido Parcial') {
    return {
      esGanada: false,
      esParcial: true,
      label: 'Pedido Parcial',
      badgeClase: 'bg-sky-50 text-sky-700 border-sky-200/80',
      textClase: 'text-sky-700'
    };
  }

  // 3. Ítem individual que no fue comprado en una solicitud con pedido parcial
  if (est === 'No Comprado' || est === 'No Comprado (Parcial)') {
    return {
      esGanada: false,
      esParcial: true,
      label: 'No Comprado',
      badgeClase: 'bg-slate-100 text-slate-500 border-slate-200/80',
      textClase: 'text-slate-500'
    };
  }

  // 4. Cotizado / Cotizado Parcial
  if (est === 'Cotizado' || est === 'Cotizado Parcial' || est === 'Parcial') {
    return {
      esGanada: false,
      esParcial: false,
      label: 'Cotizada',
      badgeClase: 'bg-blue-50 text-blue-700 border-blue-200/80',
      textClase: 'text-blue-700'
    };
  }

  // 5. Pendiente
  return {
    esGanada: false,
    esParcial: false,
    label: est || 'Pendiente',
    badgeClase: 'bg-amber-50 text-amber-700 border-amber-200/80',
    textClase: 'text-amber-700'
  };
};



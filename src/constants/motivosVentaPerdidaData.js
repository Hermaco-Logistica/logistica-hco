/**
 * Catálogo de 20 motivos iniciales de ventas perdidas clasificados por categoría
 */

export const COMENTARIO_VENTA_PERDIDA_MIN = 15;

export const MOTIVOS_VENTA_PERDIDA_SEED = [
  // Precio y competencia
  {
    codigo: 'PRECIO_ELEVADO',
    categoria: 'Precio y competencia',
    nombre: 'Precio muy elevado',
    descripcion: 'El cliente consideró el precio cotizado demasiado alto frente a lo que esperaba pagar o a otras ofertas.',
    requiereComentario: false,
    activo: true,
    orden: 10
  },
  {
    codigo: 'PRECIO_VOLUMEN',
    categoria: 'Precio y competencia',
    nombre: 'Precio no competitivo en volumen',
    descripcion: 'No se logró precio especial para compras grandes.',
    requiereComentario: false,
    activo: true,
    orden: 20
  },
  {
    codigo: 'MARCA_ECONOMICA',
    categoria: 'Precio y competencia',
    nombre: 'Compraron una marca más económica',
    descripcion: 'El cliente cambió a una marca de menor precio, aunque se le ofreció la solicitada.',
    requiereComentario: true,
    placeholderComentario: 'Indica qué marca compró el cliente...',
    activo: true,
    orden: 30
  },
  {
    codigo: 'ENCONTRO_LOCAL',
    categoria: 'Precio y competencia',
    nombre: 'Cliente lo encontró localmente',
    descripcion: 'El cliente consiguió el producto en un proveedor cercano o inmediato y prefirió la disponibilidad antes que esperar.',
    requiereComentario: true,
    placeholderComentario: 'Indica dónde o con qué proveedor local lo encontró...',
    activo: true,
    orden: 40
  },
  {
    codigo: 'CREDITO_NO_ACEPTADO',
    categoria: 'Precio y competencia',
    nombre: 'Condiciones de crédito no aceptadas',
    descripcion: 'Plazo, límite de crédito o forma de pago no cumplían lo que el cliente necesitaba.',
    requiereComentario: false,
    activo: true,
    orden: 50
  },

  // Producto y especificaciones
  {
    codigo: 'PRODUCTO_NO_MANEJADO',
    categoria: 'Producto y especificaciones',
    nombre: 'Producto no manejado',
    descripcion: 'El cliente pide algo que la empresa no vende ni importa.',
    requiereComentario: false,
    activo: true,
    orden: 60
  },
  {
    codigo: 'MARCA_NO_DISPONIBLE',
    categoria: 'Producto y especificaciones',
    nombre: 'Marca o modelo no disponible',
    descripcion: 'El cliente quería una marca o modelo específico que no se tiene.',
    requiereComentario: false,
    activo: true,
    orden: 70
  },
  {
    codigo: 'ESPECIFICACION_NO_CUMPLE',
    categoria: 'Producto y especificaciones',
    nombre: 'Especificación técnica no cumple',
    descripcion: 'Medidas, capacidad, norma o características no coinciden con lo requerido.',
    requiereComentario: false,
    activo: true,
    orden: 80
  },
  {
    codigo: 'SIN_SUSTITUTO',
    categoria: 'Producto y especificaciones',
    nombre: 'Sin alternativa/sustituto aceptable',
    descripcion: 'Se ofreció un equivalente y el cliente lo rechazó.',
    requiereComentario: false,
    activo: true,
    orden: 90
  },

  // Tiempos
  {
    codigo: 'ENTREGA_TARDADA',
    categoria: 'Tiempos',
    nombre: 'Tiempo de entrega tardado',
    descripcion: 'El cliente necesitaba el producto antes de lo que se podía entregar.',
    requiereComentario: false,
    activo: true,
    orden: 100
  },
  {
    codigo: 'COTIZACION_TARDE',
    categoria: 'Tiempos',
    nombre: 'Cotización presentada tarde',
    descripcion: 'Se respondió fuera de tiempo y el cliente compró en otro lado.',
    requiereComentario: false,
    activo: true,
    orden: 110
  },

  // Atención y proceso interno
  {
    codigo: 'SIN_SEGUIMIENTO',
    categoria: 'Atención y proceso interno',
    nombre: 'Falta de seguimiento',
    descripcion: 'La cotización no se retomó con el cliente a tiempo.',
    requiereComentario: false,
    activo: true,
    orden: 120
  },
  {
    codigo: 'MALA_ATENCION',
    categoria: 'Atención y proceso interno',
    nombre: 'Mala atención/servicio',
    descripcion: 'Experiencia negativa en el trato.',
    requiereComentario: false,
    activo: true,
    orden: 130
  },
  {
    codigo: 'SIN_ASESORIA',
    categoria: 'Atención y proceso interno',
    nombre: 'Falta de asesoría técnica',
    descripcion: 'No se pudo orientar al cliente sobre qué producto necesitaba.',
    requiereComentario: false,
    activo: true,
    orden: 140
  },
  {
    codigo: 'ERROR_COTIZACION',
    categoria: 'Atención y proceso interno',
    nombre: 'Error en cotización/precio',
    descripcion: 'Se cotizó mal o con datos desactualizados.',
    requiereComentario: false,
    activo: true,
    orden: 150
  },

  // Situación del cliente
  {
    codigo: 'SOLO_COTIZABA',
    categoria: 'Situación del cliente',
    nombre: 'Cliente solo cotizaba',
    descripcion: 'No tenía intención real de compra inmediata.',
    requiereComentario: false,
    activo: true,
    orden: 160
  },
  {
    codigo: 'PROYECTO_CANCELADO',
    categoria: 'Situación del cliente',
    nombre: 'Proyecto cancelado o pospuesto',
    descripcion: 'El cliente suspendió la obra o necesidad.',
    requiereComentario: false,
    activo: true,
    orden: 170
  },
  {
    codigo: 'SIN_RESPUESTA',
    categoria: 'Situación del cliente',
    nombre: 'Cliente no respondió',
    descripcion: 'Dejó de contestar tras la cotización.',
    requiereComentario: false,
    activo: true,
    orden: 180
  },
  {
    codigo: 'CAMBIO_REQUERIMIENTO',
    categoria: 'Situación del cliente',
    nombre: 'Cambio de requerimiento',
    descripcion: 'La necesidad original cambió.',
    requiereComentario: false,
    activo: true,
    orden: 190
  },

  // Otros
  {
    codigo: 'OTRO',
    categoria: 'Otros',
    nombre: 'Otro motivo',
    descripcion: 'Cualquier causa no listada.',
    requiereComentario: true,
    placeholderComentario: 'Explica detalladamente la causa de la pérdida...',
    activo: true,
    orden: 200
  }
];

export const CATEGORIAS_VENTA_PERDIDA = [
  'Precio y competencia',
  'Producto y especificaciones',
  'Tiempos',
  'Atención y proceso interno',
  'Situación del cliente',
  'Otros'
];

// Configuración de destinatarios y copias (CC) para notificaciones por correo
export const emailConfig = {
  // Configuración de notificaciones cuando el comprador termina una cotización (parcial o completa)
  cotizacionFinalizada: {
    // Destinatarios principales (TO)
    to: [
      "compras@hermaco.net"
    ],
    // En copia (CC)
    cc: [
      "logisticahco@hermaco.net"
    ]
  },

  // Configuración de notificaciones cuando el vendedor genera una Nueva RFQ
  nuevaRFQ: {
    to: [
      "compras@hermaco.net"
    ],
    cc: [
      "logisticahco@hermaco.net"
    ]
  },
  // Configuración de notificaciones cuando el vendedor genera un pedido
  pedidoGenerado: {
    // Destinatarios principales (TO)
    to: [
      "compras@hermaco.net"
    ],
    // En copia (CC)
    cc: [
      "logisticahco@hermaco.net"
    ]
  }
};

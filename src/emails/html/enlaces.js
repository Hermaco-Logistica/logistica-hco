import { rutaEnlaceSolicitud } from '../../utils/rutasSolicitud';

const origen = () => (typeof window !== 'undefined' ? window.location.origin : '');

/**
 * Enlace "Ir al sitio" de una solicitud. Es el mismo para todos los destinatarios: la aplicación lo resuelve
 * según el rol de quien lo abre (ver views/IrASolicitud.jsx), y quien no tenga permiso verá un aviso de acceso.
 */
export const urlSolicitud = (solicitud) => (solicitud?.id && origen() ? `${origen()}${rutaEnlaceSolicitud(solicitud.id)}` : '');

export const urlPedidos = () => (origen() ? `${origen()}/pedidos` : '');

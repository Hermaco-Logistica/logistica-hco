/**
 * Configuración central de la API
 */

export const USE_BFF = true;

// En producción usa el mismo dominio (Netlify)
// En local usa Netlify Dev
export const API_BASE_URL =
  window?.location?.hostname === 'localhost'
    ? '' // Netlify Dev local
    : ''; // Vacío = mismo dominio donde está desplegado

// Business ID por defecto
export const DEFAULT_BUSINESS_ID = 3;

// Endpoints de la API
export const API_ENDPOINTS = {
  LOGIN: '/api/login',
  VENTAS: '/api/ventas',
  INVENTARIO: '/api/inventario',
  KARDEX: '/api/kardex',
  // VFP Inventory Bridge (ZSistemas) — proxeado por bridge-proxy.js
  BRIDGE_BUSCAR: '/api/bridge/api/productos/buscar',
};

// Timeout para las peticiones (en milisegundos)
export const API_TIMEOUT = 30000; // 30 segundos

// Configuración de headers por defecto
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

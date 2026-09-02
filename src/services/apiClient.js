import { API_BASE_URL, API_TIMEOUT, DEFAULT_HEADERS, USE_BFF } from './apiConfig';

// 🔒 Sanitizar inputs del usuario (prevenir XSS básico)
function sanitizeValue(value) {
  if (typeof value === 'string') {
    return value
      .replace(/[<>]/g, '') // Eliminar < y >
      .trim()
      .slice(0, 5000); // Límite de longitud razonable
  }
  return value; // ⚠️ Faltaba el return para valores no-string
}

// 🔒 Sanitizar objetos recursivamente
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeObject(item));
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  return sanitizeValue(obj);
}

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = API_TIMEOUT;
    this.logoutFunction = null; // Función para manejar expiración de sesión
    this.sessionTerminated = false; // Evitar múltiples disparos y llamadas extra
  }

  // Método para registrar la función de logout
  setLogoutFunction(logoutFn) {
    this.logoutFunction = logoutFn;
  }

  // Permite reanudar llamadas normales después de un login exitoso
  resetSessionGuard() {
    this.sessionTerminated = false;
  }

  getHeaders() {
    return { ...DEFAULT_HEADERS };
  }

  async _fetch(url, options) {
    // Si la sesión ya fue marcada como expirada, no seguir golpeando la API
    if (this.sessionTerminated) {
      try {
        const u = typeof url === 'string' ? url : String(url);
        // Permitir solo el endpoint de logout para limpiar sesión en backend
        const allow = (
          u.includes('/api/logout') ||
          u.includes('/.netlify/functions/logout') ||
          // Permitir login para poder recuperar sesión
          u.includes('/api/login') ||
          u.includes('/.netlify/functions/findex-login') ||
          // Permitir /me para chequeos de estado mínimos
          u.includes('/.netlify/functions/me')
        );
        if (!allow) {
          throw new Error('La sesión expiró. Inicia sesión nuevamente');
        }
      } catch {
        throw new Error('La sesión expiró. Inicia sesión nuevamente');
      }
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    try {
      const fetchOptions = {
        ...options,
        signal: controller.signal,
      };
      if (USE_BFF) {
        fetchOptions.credentials = 'include';
      }
      // Pequeña lógica de reintentos para 429 (rate limit)
      const maxRetries = 2;
      let attempt = 0;
      // Guardar original por si necesitamos recrear opciones (ya son inmutables para fetch)
      while (true) {
        const res = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          if (!ct.includes('application/json')) return null;
          return await res.json();
        }

        // Manejo específico 429: esperar y reintentar hasta maxRetries
        if (res.status === 429 && attempt < maxRetries) {
          attempt++;
          // Usar Retry-After si viene, sino backoff exponencial simple
          const retryAfter = res.headers.get('retry-after');
          let waitMs = 800 * attempt;
          if (retryAfter) {
            const secs = Number(retryAfter);
            if (!Number.isNaN(secs) && secs > 0) {
              waitMs = secs * 1000;
            }
          }
          await new Promise(r => setTimeout(r, waitMs));
          // Reiniciar timeout por el nuevo intento
          clearTimeout(timeoutId);
          // Nuevo controller por cada intento
          const newController = new AbortController();
          options.signal = newController.signal;
          // resetear timeout para el próximo intento (no necesitamos guardar el id)
          setTimeout(() => newController.abort(), this.timeout);
          // Reasignar para limpiar en próximas iteraciones o salidas
          controller.abort = newController.abort.bind(newController);
          // NOTA: no podemos reasignar timeoutId const. A falta de un ref, seguimos y dejamos que se limpie por GC.
          // Continuar loop para reintentar
          continue;
        }

        const err = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        try {
          const data = await res.json();
          if (data?.message) err.message = data.message;
        } catch (error) { void error; }
        
        if (res.status === 401 && !url.includes('/api/login') && !url.includes('auto-findex-login')) {
          try {
            console.log('Detectado 401. Intentando auto-login transparente...');
            await this.tryRefreshAndRetry();
            console.log('Auto-login exitoso, reintentando llamada a', url);
            
            const retryRes = await fetch(url, fetchOptions);
            if (retryRes.ok) {
               const ct = retryRes.headers.get('content-type') || '';
               if (!ct.includes('application/json')) return null;
               return await retryRes.json();
            }
          } catch (refreshErr) {
             throw err; 
          }
        }
        
        throw err;
      }
    } catch (e) {
      clearTimeout(timeoutId);
      return this.handleError(e, url);
    }
  }

  async handleError(error, endpoint) {
    // Reducir ruido en consola: log detallado solo en desarrollo
    try {
      const isProd = import.meta.env.PROD;
      if (!isProd) {
        console.error(`API Error [${endpoint}]:`, error);
      }
    } catch (error) { void error; }
    if (error.name === 'AbortError') {
      throw new Error('La petición ha excedido el tiempo de espera');
    }
    if (error.status === 401) {
      // No tratar 401 del login como sesión expirada - son credenciales incorrectas
      const isLoginEndpoint = typeof endpoint === 'string' && 
        (endpoint.includes('/api/login') || endpoint.includes('/.netlify/functions/findex-login'));
      
      if (!isLoginEndpoint) {
        await this.triggerSessionExpired();
        throw new Error('No autenticado. Inicia sesión nuevamente');
      }
      // Para login, mantener el error original (credenciales incorrectas)
      throw error;
    }
    if (error.status === 403) throw new Error('No tienes permisos para realizar esta acción');
    if (error.status === 404) throw new Error('Recurso no encontrado');
    if (error.status === 502) throw new Error('Servidor en mantenimiento o no disponible (502). Intenta más tarde');
    if (error.status >= 500) throw new Error('Error del servidor. Intenta más tarde');
    throw error;
  }

  async triggerSessionExpired() {
    if (this.sessionTerminated) return;
    this.sessionTerminated = true;
    if (this.logoutFunction) {
      try {
        console.log('Autenticación expirada. Cerrando sesión automáticamente...');
        await this.logoutFunction();
      } catch (error) { void error; }
    }
  }

  async tryRefreshAndRetry() {
    try {
      const { auth } = await import('../firebase');
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No Firebase user');
      
      const idToken = await currentUser.getIdToken();
      const response = await fetch('/.netlify/functions/auto-findex-login', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Auto-login failed');
      
      this.resetSessionGuard();
      if (this.onFindexAuthSuccess) this.onFindexAuthSuccess();
      return true;
    } catch (err) {
      console.warn('Auto-login falló:', err);
      if (this.onFindexAuthFailure) this.onFindexAuthFailure();
      throw new Error('Las credenciales de Findex han expirado o son incorrectas.');
    }
  }

  async get(endpoint, params = {}) {
    // Construir URL absoluta siempre. En prod this.baseURL puede ser '' y new URL('/path') falla.
    const base = this.baseURL || (typeof window !== 'undefined' ? window.location.origin : '');
    const urlObj = new URL(endpoint, base);
    Object.keys(params || {}).forEach((k) => {
      const v = params[k];
      if (v !== undefined && v !== null) {
        urlObj.searchParams.append(k, sanitizeValue(String(v)));
      }
    });
    return await this._fetch(urlObj.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });
  }

  async post(endpoint, body = {}) {
    const sanitizedBody = sanitizeObject(body);
    const base = this.baseURL || (typeof window !== 'undefined' ? window.location.origin : '');
    const url = new URL(endpoint, base);
    return await this._fetch(url.toString(), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(sanitizedBody),
    });
  }

  async put(endpoint, body = {}) {
    const sanitizedBody = sanitizeObject(body);
    const base = this.baseURL || (typeof window !== 'undefined' ? window.location.origin : '');
    const url = new URL(endpoint, base);
    return await this._fetch(url.toString(), {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(sanitizedBody),
    });
  }

  async delete(endpoint) {
    const base = this.baseURL || (typeof window !== 'undefined' ? window.location.origin : '');
    const url = new URL(endpoint, base);
    return await this._fetch(url.toString(), {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }
}

export const apiClient = new ApiClient();

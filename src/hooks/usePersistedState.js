import { useState, useEffect } from "react";

/**
 * Igual que useState, pero persiste el valor en localStorage.
 * @param {string} key  - Clave unica en localStorage
 * @param {*} defaultValue - Valor inicial si no hay nada guardado
 */
export function usePersistedState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // localStorage lleno o deshabilitado
    }
  }, [key, state]);

  return [state, setState];
}

/**
 * Igual que useState, pero persiste el valor en sessionStorage.
 * Se mantiene activo durante la sesión de navegación en la pestaña.
 * @param {string} key - Clave única en sessionStorage
 * @param {*} defaultValue - Valor inicial si no hay nada guardado
 */
export function useSessionState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = sessionStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      if (state === undefined) {
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, JSON.stringify(state));
      }
    } catch {
      // sessionStorage lleno o deshabilitado
    }
  }, [key, state]);

  return [state, setState];
}

// Almacén en memoria volátil de la SPA (solo persiste entre rutas, se limpia al recargar o cerrar pestaña)
const memoryStore = new Map();

/**
 * Igual que useState, pero persiste el valor en la memoria de la SPA (RAM de JS).
 * Se mantiene al navegar entre rutas (ej. lista <-> detalle), pero se reinicia
 * limpiamente a su valor inicial al recargar la página (F5) o cerrar la pestaña.
 * @param {string} key - Clave única en el store en memoria
 * @param {*} defaultValue - Valor inicial si no hay nada guardado en memoria
 */
export function useMemoryState(key, defaultValue) {
  const [state, setState] = useState(() => {
    return memoryStore.has(key) ? memoryStore.get(key) : defaultValue;
  });

  useEffect(() => {
    if (state === undefined) {
      memoryStore.delete(key);
    } else {
      memoryStore.set(key, state);
    }
  }, [key, state]);

  return [state, setState];
}

export function clearMemoryStore(prefix) {
  if (!prefix) {
    memoryStore.clear();
    return;
  }
  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix)) {
      memoryStore.delete(key);
    }
  }
}

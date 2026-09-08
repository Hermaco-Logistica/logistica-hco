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

import { useCallback, useState } from 'react';

const EMPTY_MAP = Object.freeze({});

/** Keeps per-item UI state isolated when the detail route changes request ID. */
export const useSolicitudScopedMap = (solicitudId) => {
  const [entry, setEntry] = useState(() => ({ solicitudId, value: EMPTY_MAP }));
  const value = entry.solicitudId === solicitudId ? entry.value : EMPTY_MAP;

  const setValue = useCallback((nextValue) => {
    setEntry((current) => {
      const currentValue = current.solicitudId === solicitudId ? current.value : EMPTY_MAP;
      const resolvedValue = typeof nextValue === 'function' ? nextValue(currentValue) : nextValue;
      return { solicitudId, value: resolvedValue };
    });
  }, [solicitudId]);

  return [value, setValue];
};

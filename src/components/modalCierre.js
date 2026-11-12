import { createContext, useContext } from 'react';

/** Cierra el modal con su animación de salida: `const cerrar = useCerrarModal()` dentro del contenido de un <Modal>. */
export const ContextoCierreModal = createContext(null);
export const useCerrarModal = () => useContext(ContextoCierreModal);

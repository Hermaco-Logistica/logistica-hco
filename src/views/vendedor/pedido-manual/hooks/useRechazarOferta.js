import { useState } from 'react';

/** Maneja la confirmación del rechazo de una oferta de Compras. */
export const useRechazarOferta = ({ puedeResponder, actions, setItemsSeleccionados }) => {
  const [modalRechazar, setModalRechazar] = useState({
    open: false,
    index: null,
    versionEsperada: null,
    motivo: ''
  });

  const handleAbrirModalRechazar = (index, versionEsperada) => {
    setModalRechazar({ open: true, index, versionEsperada, motivo: '' });
  };

  const handleConfirmarRechazo = () => {
    if (!puedeResponder || !modalRechazar.motivo.trim()) return;

    const { index, versionEsperada, motivo } = modalRechazar;
    actions.rechazar(index, versionEsperada, motivo.trim());

    if (index !== null) {
      setItemsSeleccionados((actuales) => {
        const siguientes = { ...actuales };
        delete siguientes[index];
        return siguientes;
      });
    }

    setModalRechazar({ open: false, index: null, versionEsperada: null, motivo: '' });
  };

  return { modalRechazar, setModalRechazar, handleAbrirModalRechazar, handleConfirmarRechazo };
};

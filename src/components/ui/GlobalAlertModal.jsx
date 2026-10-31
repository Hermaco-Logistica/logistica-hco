import React, { useState, useEffect, useCallback } from 'react';
import { Info } from 'lucide-react';
import { Modal, ModalBoton, ModalCuerpo, ModalEncabezado, ModalPie } from '../Modal';

// onClose callback: ejecutado únicamente cuando el usuario presiona OK.
// Esto permite que el código que llama a alert() encadene un navigate()
// que solo ocurre tras confirmación explícita, evitando doble-envío.
let _resolveAlert = null;

export const showAlert = (msg) =>
  new Promise((resolve) => {
    _resolveAlert = resolve;
    window.alert(msg);
  });

export const GlobalAlertModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [onClose, setOnClose] = useState(null);

  useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (msg, closeCb) => {
      setMessage(String(msg ?? ''));
      setOnClose(() => closeCb || null);
      setIsOpen(true);
      // Si hay un resolver pendiente de showAlert, no lo resolvemos aquí;
      // se resuelve al presionar OK.
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (_resolveAlert) {
      const cb = _resolveAlert;
      _resolveAlert = null;
      cb();
    }
    if (typeof onClose === 'function') {
      onClose();
      setOnClose(null);
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <Modal etiqueta="Aviso" ancho="sm" capa="aviso" onCerrar={handleClose}>
      <ModalEncabezado titulo="Aviso" icono={Info} tono="exito" />
      <ModalCuerpo>
        <p className="break-words text-[15px] leading-[1.45] text-neutral-900">{message}</p>
      </ModalCuerpo>
      <ModalPie>
        <ModalBoton variante="primario" tono="exito" autoFocus onClick={handleClose}>OK</ModalBoton>
      </ModalPie>
    </Modal>
  );
};

import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { auth } from '../../firebase';
import { responderProrrogaCliente } from '../../utils/responderProrrogaCliente';
import { ModalRespuestaProrroga } from './ModalRespuestaProrroga';

export const AccionesRespuestaProrroga = ({ solicitud, prorroga, role, compacto = false }) => {
  const [accion, setAccion] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  if (role !== 'comprador' || auth.currentUser == null || prorroga?.estado !== 'pendiente') return null;

  const confirmar = async (comentario) => {
    setGuardando(true);
    setError('');
    try {
      await responderProrrogaCliente({
        solicitud,
        prorroga,
        accion,
        comentario,
        respondidoPor: auth.currentUser?.email || ''
      });
      setAccion(null);
    } catch (e) {
      console.error('Error respondiendo prórroga:', e);
      setError(e.message || 'No se pudo registrar la respuesta a la prórroga.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${compacto ? '' : 'mt-4'}`}>
        <button type="button" onClick={() => setAccion('aprobada')} className="detalle-button detalle-button--primary" style={{ borderColor: 'var(--detalle-accent-success)', background: 'var(--detalle-accent-success)', color: 'white' }}>
          <Check size={13} /> Aprobar
        </button>
        <button type="button" onClick={() => setAccion('rechazada')} className="detalle-button detalle-button--danger" style={{ borderColor: 'var(--detalle-accent-danger)', color: 'var(--detalle-accent-danger)' }}>
          <X size={13} /> Rechazar
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{error}</p>}
      <ModalRespuestaProrroga
        key={accion || 'sin-accion'}
        solicitud={accion ? prorroga : null}
        accion={accion}
        guardando={guardando}
        onClose={() => !guardando && setAccion(null)}
        onConfirmar={confirmar}
      />
    </>
  );
};

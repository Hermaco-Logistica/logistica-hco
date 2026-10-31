import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { rutaParaSolicitud } from '../utils/rutasSolicitud';

/**
 * Destino del botón "Ir al sitio" de los correos (/ir/solicitud/:id).
 * Lee la solicitud (las reglas de Firestore deciden si esta persona puede verla) y la lleva a la vista de su rol.
 */
export const IrASolicitud = ({ role }) => {
  const { id } = useParams();
  const [estado, setEstado] = useState({ cargando: true, ruta: null, error: null });

  useEffect(() => {
    let cancelado = false;
    getDoc(doc(db, 'solicitudes', id))
      .then((snapshot) => {
        if (cancelado) return;
        if (!snapshot.exists()) return setEstado({ cargando: false, ruta: null, error: 'inexistente' });
        setEstado({ cargando: false, ruta: rutaParaSolicitud({ role, solicitud: { ...snapshot.data(), id } }), error: null });
      })
      .catch((error) => {
        if (!cancelado) setEstado({ cargando: false, ruta: null, error: error?.code === 'permission-denied' ? 'sin_permiso' : 'inexistente' });
      });
    return () => { cancelado = true; };
  }, [id, role]);

  if (estado.ruta) return <Navigate to={estado.ruta} replace />;

  if (estado.cargando) {
    return <div className="py-24 text-center text-xs font-semibold text-slate-400 animate-pulse">Abriendo solicitud…</div>;
  }

  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-lg font-bold text-slate-800">
        {estado.error === 'sin_permiso' ? 'No tienes acceso a esta solicitud' : 'No encontramos esta solicitud'}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        {estado.error === 'sin_permiso'
          ? 'Solo puede verla su vendedor, Compras y la gerencia. Si crees que debería poder abrirla, consulta con tu administrador.'
          : 'Puede que se haya eliminado o que el enlace esté incompleto.'}
      </p>
      <Link to="/" className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white">
        Ir al inicio
      </Link>
    </div>
  );
};

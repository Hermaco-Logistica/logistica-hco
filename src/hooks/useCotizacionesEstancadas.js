import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { filtrarCotizacionesEstancadas, esRolBloqueable } from '../utils/cotizacionesEstancadasHelpers';

export function useCotizacionesEstancadas({ solicitudes = null, role = null, diasLimite = null } = {}) {
  const [solicitudesDirectas, setSolicitudesDirectas] = useState([]);
  const [loading, setLoading] = useState(!solicitudes);

  const currentUser = auth.currentUser;
  const userEmail = currentUser?.email || '';

  // Escuchar Firestore solo si no recibimos solicitudes por props
  useEffect(() => {
    if (solicitudes !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    if (!userEmail) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Consulta específica para cotizaciones de este usuario
    const q = query(
      collection(db, 'solicitudes'),
      where('vendedorEmail', '==', userEmail),
      where('estado', 'in', ['Cotizado', 'Pedido Parcial', 'Cotizado Parcial'])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSolicitudesDirectas(docs);
        setLoading(false);
      },
      (error) => {
        console.error('[useCotizacionesEstancadas] Error al consultar Firestore:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [solicitudes, userEmail]);

  const listaBase = solicitudes !== null ? solicitudes : solicitudesDirectas;

  const cotizacionesEstancadas = useMemo(() => {
    return filtrarCotizacionesEstancadas(listaBase, userEmail, { diasLimite });
  }, [listaBase, userEmail, diasLimite]);

  // Regla de negocio A1: Solo 'vendedor' y 'gerente' están sujetos a bloqueo (administrador y comprador exentos)
  const tieneBloqueo = esRolBloqueable(role) && cotizacionesEstancadas.length > 0;

  return {
    cotizacionesEstancadas,
    tieneBloqueo,
    loading,
    totalEstancadas: cotizacionesEstancadas.length
  };
}

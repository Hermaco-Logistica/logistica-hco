import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { MOTIVOS_VENTA_PERDIDA_SEED } from '../constants/motivosVentaPerdidaData';

/**
 * Hook para consultar el catálogo de motivos de venta perdida desde Firestore.
 * Lee motivos activos y ordenados por orden/categoría.
 * Si la colección está vacía o no hay conexión, utiliza el catálogo local como respaldo.
 */
export function useMotivosVentaPerdida() {
  const [motivos, setMotivos] = useState(MOTIVOS_VENTA_PERDIDA_SEED.filter(m => m.activo));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function cargarMotivos() {
      try {
        const q = query(
          collection(db, 'motivosVentaPerdida'),
          where('activo', '==', true)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          const docs = snap.docs.map(d => ({
            codigo: d.id,
            ...d.data()
          }));

          // Ordenar por categoría y luego por orden ascendente
          docs.sort((a, b) => (a.orden || 999) - (b.orden || 999));

          if (isMounted) {
            setMotivos(docs);
            setLoading(false);
          }
          return;
        }
      } catch (err) {
        console.info('[useMotivosVentaPerdida] Nota: usando catálogo local como respaldo:', err.message);
      }

      if (isMounted) {
        setMotivos(MOTIVOS_VENTA_PERDIDA_SEED.filter(m => m.activo));
        setLoading(false);
      }
    }

    cargarMotivos();

    return () => {
      isMounted = false;
    };
  }, []);

  return { motivos, loading };
}

import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';

export const useMensajesResumen = (solicitudId, productos, currentUserRol) => {
  const [conteos, setConteos] = useState({});
  const [noLeidos, setNoLeidos] = useState({});
  const [pendientes, setPendientes] = useState({});

  useEffect(() => {
    if (!solicitudId) return;

    const unsub = onSnapshot(collection(db, `solicitudes/${solicitudId}/mensajes`), (snap) => {
      const counts = {};
      const unreads = {};
      const pendingProps = {};
      const currentUserUid = auth.currentUser?.uid;
      
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.itemId === undefined) return;
        
        // Ocultar del resumen mensajes no notificados por la otra parte
        if (data.sinNotificar && data.autor?.rol && currentUserRol && data.autor.rol !== currentUserRol) {
          return;
        }

        const itemId = data.itemId;
        counts[itemId] = (counts[itemId] || 0) + 1;
        
        // Contar como no leído si no estamos en 'leidoPor' y no fuimos nosotros los autores
        if (currentUserUid && data.autor?.uid !== currentUserUid) {
          if (!data.leidoPor || !data.leidoPor.includes(currentUserUid)) {
            unreads[itemId] = (unreads[itemId] || 0) + 1;
          }
        }
        
        if (data.tipo === 'propuesta' && data.estadoPropuesta === 'pendiente') {
          pendingProps[itemId] = true;
        }
      });

      // Añadir legados (los legados NO se marcan como no leídos, pues son históricos)
      if (productos) {
        productos.forEach((p, idx) => {
          let legacyCount = 0;
          
          const hasLegacyVend = snap.docs.some(d => d.id === 'legacy-synth-vend' && d.data().itemId === idx);
          const hasLegacyComp = snap.docs.some(d => d.id === 'legacy-synth-comp' && d.data().itemId === idx);

          if (p.comentarioVendedorItem && !hasLegacyVend) legacyCount++;
          if ((p.estadoItem === 'Cotizado' || p.comentarioCompras) && !hasLegacyComp) {
            legacyCount++;
            if (p.estadoItem === 'Cotizado') {
              pendingProps[idx] = true;
            }
          }
          
          if (legacyCount > 0) {
            counts[idx] = (counts[idx] || 0) + legacyCount;
          }
        });
      }

      setConteos(counts);
      setNoLeidos(unreads);
      setPendientes(pendingProps);
    });

    return () => unsub();
  }, [solicitudId, productos, currentUserRol]);

  return { conteos, noLeidos, pendientes };
};

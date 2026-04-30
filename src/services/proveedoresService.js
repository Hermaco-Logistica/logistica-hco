import { addDoc, collection, getDocs, limit, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';

const PROVEEDORES_COLLECTION = 'proveedores';

export function normalizarNombreProveedor(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toUpperCase();
}

export async function buscarProveedoresGuardados(texto) {
  const termino = normalizarNombreProveedor(texto);
  if (termino.length < 2) return [];

  const q = query(
    collection(db, PROVEEDORES_COLLECTION),
    where('nombreUpper', '>=', termino),
    where('nombreUpper', '<=', `${termino}\uf8ff`),
    limit(8)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function guardarProveedorSiNoExiste(nombreProveedor, user) {
  const nombreUpper = normalizarNombreProveedor(nombreProveedor);
  if (!nombreUpper) return null;

  const existeQ = query(
    collection(db, PROVEEDORES_COLLECTION),
    where('nombreUpper', '==', nombreUpper),
    limit(1)
  );

  const existeSnap = await getDocs(existeQ);

  if (existeSnap.empty) {
    const ref = await addDoc(collection(db, PROVEEDORES_COLLECTION), {
      nombre: nombreUpper,
      nombreUpper,
      createdAt: serverTimestamp(),
      lastUsedAt: serverTimestamp(),
      createdByUid: user?.uid || null,
      createdByEmail: user?.email || null,
    });

    return { id: ref.id, nombre: nombreUpper, creado: true };
  }

  const docRef = existeSnap.docs[0].ref;
  await updateDoc(docRef, {
    lastUsedAt: serverTimestamp(),
    lastUsedByUid: user?.uid || null,
    lastUsedByEmail: user?.email || null,
  });

  return { id: docRef.id, nombre: nombreUpper, creado: false };
}

import { addDoc, collection, getDocs, limit, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';

const MARCAS_COLLECTION = 'marcas';

export function normalizarNombreMarca(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toUpperCase();
}

export async function buscarMarcasGuardadas(texto) {
  const termino = normalizarNombreMarca(texto);
  if (termino.length < 2) return [];

  const q = query(
    collection(db, MARCAS_COLLECTION),
    where('nombreUpper', '>=', termino),
    where('nombreUpper', '<=', `${termino}\uf8ff`),
    limit(25)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function guardarMarcaSiNoExiste(nombreMarca, user) {
  const nombreUpper = normalizarNombreMarca(nombreMarca);
  if (!nombreUpper) return null;

  const existeQ = query(
    collection(db, MARCAS_COLLECTION),
    where('nombreUpper', '==', nombreUpper),
    limit(1)
  );

  const existeSnap = await getDocs(existeQ);

  if (existeSnap.empty) {
    const ref = await addDoc(collection(db, MARCAS_COLLECTION), {
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

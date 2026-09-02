import { apiClient } from "./apiClient";
import { db, auth } from "../firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { guardarMarcaSiNoExiste, normalizarNombreMarca } from "./marcasService";

export async function buscarProductos(queryTexto) {
  if (!queryTexto || queryTexto.length < 2) return [];

  const queryLimpia = queryTexto.trim().toUpperCase();

  // 1. Findex
  const normalizedQuery = queryLimpia
    .replace(/[^A-Z0-9]+/g, '%')
    .replace(/([A-Z])([0-9])/g, '$1%$2')
    .replace(/([0-9])([A-Z])/g, '$1%$2')
    .replace(/%+/g, '%');

  let findexItems = [];
  try {
    const response = await apiClient.get('/.netlify/functions/findex-proxy/api/inventario', {
      business_id: 3,
      search: normalizedQuery
    });
    
    const items = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
    findexItems = items.slice(0, 15).map(item => ({
      id: item.SKU,
      s: item.SKU,
      n: item.PRODUCTO || 'SIN PRODUCTO',
      m: item.MARCA || 'SIN MARCA',
      c: item.CATEGORIA || '',
      local: false
    }));
  } catch (error) {
    console.error("Error buscando productos en Findex:", error);
  }

  // 2. Firebase (Catálogo Local)
  let localItems = [];
  try {
    const skuIndexQuery = queryLimpia.replace(/[^A-Z0-9]/g, '');
    if (skuIndexQuery.length >= 2) {
      const q = query(
        collection(db, 'productos'),
        where('skuIndex', '>=', skuIndexQuery),
        where('skuIndex', '<=', skuIndexQuery + '\uf8ff')
      );
      const snap = await getDocs(q);
      localItems = snap.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: 'local_' + docSnap.id,
          s: data.sku,
          n: data.producto,
          m: data.marca || 'SIN MARCA',
          c: 'MANUAL',
          local: true
        };
      });
    }
  } catch (error) {
    console.error("Error buscando en Firebase local:", error);
  }

  // Combinar (Findex primero), quitar duplicados por SKU
  const combined = [...findexItems, ...localItems];
  const unique = Array.from(new Map(combined.map(item => [item.s.toUpperCase(), item])).values());
  
  return unique.slice(0, 15);
}

export async function guardarProductoLocal(sku, producto, marca) {
  const skuLimpio = sku.trim().toUpperCase();
  const skuIndex = skuLimpio.replace(/[^A-Z0-9]/g, '');
  const docId = skuIndex || skuLimpio.replace(/\//g, '-');
  const docRef = doc(db, 'productos', docId);
  
  const marcaLimpia = marca ? marca.trim().toUpperCase() : '';

  await setDoc(docRef, {
    sku: skuLimpio,
    skuIndex,
    producto: producto.trim().toUpperCase(),
    marca: marcaLimpia,
    createdAt: new Date()
  });

  // Guardar la marca inmediatamente en Firebase si fue ingresada y no existía
  if (marcaLimpia) {
    try {
      const marcaNormalizada = normalizarNombreMarca(marcaLimpia);
      if (marcaNormalizada) {
        await guardarMarcaSiNoExiste(marcaNormalizada, auth?.currentUser);
      }
    } catch (err) {
      console.error("Error guardando marca desde el catálogo local:", err);
    }
  }
  
  return { 
    s: skuLimpio, 
    n: producto.trim().toUpperCase(), 
    m: marcaLimpia, 
    local: true 
  };
}

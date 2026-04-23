import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Box, ShoppingBag, Plus, Info, CheckCircle2, Factory, Hash, DollarSign } from 'lucide-react';

export const ConsolidarCompras = () => {
  const [items, setItems] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [datosOC, setDatosOC] = useState({
    numeroOC: '',
    proveedor: '',
    notas: ''
  });

  useEffect(() => {
    const q = query(collection(db, "solicitudes"));
    const unsubscribe = onSnapshot(q, (snap) => {
      let temporal = [];
      snap.docs.forEach(docSnap => {
        const rfq = docSnap.data();
        if (rfq.productos) {
          rfq.productos.forEach((prod, index) => {
            // Solo items que el vendedor marcó como pedido pero no tienen OC asignada
            if (prod.estadoItem === 'Pedido' && !prod.numOC) {
              temporal.push({
                ...prod,
                idRFQ: docSnap.id,
                indexOriginal: index,
                cliente: rfq.cliente,
                correlativo: rfq.correlativo
              });
            }
          });
        }
      });
      setItems(temporal);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleSeleccion = (item) => {
    const idUnico = `${item.idRFQ}-${item.indexOriginal}`;
    const existe = seleccionados.find(i => `${i.idRFQ}-${i.indexOriginal}` === idUnico);
    if (existe) {
      setSeleccionados(seleccionados.filter(i => `${i.idRFQ}-${i.indexOriginal}` !== idUnico));
    } else {
      // Al seleccionar, inicializamos el fobConfirmado con el fob que venía de la cotización
      setSeleccionados([...seleccionados, { ...item, fobConfirmado: item.fob || 0 }]);
    }
  };

  const actualizarFobConfirmado = (idRFQ, index, valor) => {
    setSeleccionados(prev => prev.map(i => 
      (i.idRFQ === idRFQ && i.indexOriginal === index) 
      ? { ...i, fobConfirmado: Number(valor) } 
      : i
    ));
  };

  const handleCrearOrdenCompra = async () => {
    if (!datosOC.numeroOC || !datosOC.proveedor) return alert("Faltan datos de la OC");
    if (seleccionados.length === 0) return alert("No hay ítems seleccionados");

    try {
      const ocRef = await addDoc(collection(db, "ordenesCompra"), {
        ...datosOC,
        items: seleccionados,
        estado: 'Pedido',
        tracking: '',
        fechaCreacion: serverTimestamp()
      });

      for (const item of seleccionados) {
        const rfqRef = doc(db, "solicitudes", item.idRFQ);
        const q = await getDocs(query(collection(db, "solicitudes"))); // Para obtener data fresca
        const rfqDoc = q.docs.find(d => d.id === item.idRFQ).data();
        
        const nuevosProductos = [...rfqDoc.productos];
        nuevosProductos[item.indexOriginal] = {
          ...nuevosProductos[item.indexOriginal],
          estadoItem: 'Comprado',
          numOC: datosOC.numeroOC,
          proveedorReal: datosOC.proveedor,
          fobReal: item.fobConfirmado
        };

        await updateDoc(rfqRef, { productos: nuevosProductos });
      }

      alert("Orden de Compra Generada");
      setSeleccionados([]);
      setDatosOC({ numeroOC: '', proveedor: '', notas: '' });
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-slate-400 animate-pulse uppercase tracking-[0.3em]">Cargando Consolidación...</div>;

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 italic uppercase tracking-tighter">Consolidación de Compras</h1>
        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">Asignación de Proveedores y Costos Reales</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item, idx) => {
            const isSel = seleccionados.find(i => i.idRFQ === item.idRFQ && i.indexOriginal === item.indexOriginal);
            return (
              <div 
                key={idx} 
                className={`p-5 rounded-[1.5rem] border-2 transition-all flex justify-between items-center ${
                  isSel ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white'
                }`}
              >
                <div className="flex gap-4 items-center">
                  <button onClick={() => toggleSeleccion(item)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSel ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200'}`}>
                    <Plus size={14} />
                  </button>
                  <div>
                    <p className="font-black text-xs uppercase text-slate-800">{item.descripcion}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Ref: {item.correlativo} | Cliente: {item.cliente}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {isSel && (
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Confirmar FOB</span>
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 mt-1">
                        <span className="text-emerald-500 font-black text-xs">$</span>
                        <input 
                          type="number" 
                          className="w-20 outline-none font-black text-xs text-slate-700 bg-transparent"
                          defaultValue={item.fob}
                          onChange={(e) => actualizarFobConfirmado(item.idRFQ, item.indexOriginal, e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                  <div className="text-right min-w-[80px]">
                    <span className="block font-black text-lg text-slate-800">{item.cantidad}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase">{item.modalidad}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl sticky top-8">
            <h2 className="text-white font-black uppercase italic text-lg mb-6 flex items-center gap-2">
              <ShoppingBag className="text-emerald-400" /> Detalle de Compra
            </h2>
            <div className="space-y-4">
              <input 
                type="text" placeholder="NÚMERO DE OC"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white text-xs font-bold outline-none focus:border-emerald-500"
                onChange={(e) => setDatosOC({...datosOC, numeroOC: e.target.value.toUpperCase()})}
              />
              <input 
                type="text" placeholder="PROVEEDOR"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white text-xs font-bold outline-none focus:border-emerald-500"
                onChange={(e) => setDatosOC({...datosOC, proveedor: e.target.value.toUpperCase()})}
              />
              <button 
                onClick={handleCrearOrdenCompra}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs mt-4"
              >
                Generar Orden de Compra
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
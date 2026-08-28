import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { Box, ShoppingBag, Plus, Info, CheckCircle2, Factory, Hash, DollarSign } from 'lucide-react';
import {
  buscarProveedoresGuardados,
  guardarProveedorSiNoExiste,
  normalizarNombreProveedor,
} from '../../services/proveedoresService';

export const ConsolidarCompras = () => {
  const [items, setItems] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [datosOC, setDatosOC] = useState({
    numeroOC: '',
    proveedor: '',
    notas: ''
  });
  const [sugerenciasProveedor, setSugerenciasProveedor] = useState([]);
  const [indiceSugerenciaProveedor, setIndiceSugerenciaProveedor] = useState(-1);
  const [buscandoProveedor, setBuscandoProveedor] = useState(false);
  const [errorProveedor, setErrorProveedor] = useState('');
  const [mostrarSugerenciasProveedor, setMostrarSugerenciasProveedor] = useState(false);
  const debounceProveedorRef = useRef(null);

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

  useEffect(() => {
    const termino = normalizarNombreProveedor(datosOC.proveedor);

    if (debounceProveedorRef.current) clearTimeout(debounceProveedorRef.current);

    if (termino.length < 2) {
      setSugerenciasProveedor([]);
      setIndiceSugerenciaProveedor(-1);
      setBuscandoProveedor(false);
      setErrorProveedor('');
      return;
    }

    debounceProveedorRef.current = setTimeout(async () => {
      try {
        setBuscandoProveedor(true);
        setErrorProveedor('');
        const resultados = await buscarProveedoresGuardados(termino);
        setSugerenciasProveedor(resultados);
        setIndiceSugerenciaProveedor(resultados.length > 0 ? 0 : -1);
      } catch (error) {
        setErrorProveedor('No se pudo buscar proveedores guardados.');
        setSugerenciasProveedor([]);
        setIndiceSugerenciaProveedor(-1);
      } finally {
        setBuscandoProveedor(false);
      }
    }, 280);

    return () => {
      if (debounceProveedorRef.current) clearTimeout(debounceProveedorRef.current);
    };
  }, [datosOC.proveedor]);

  const seleccionarSugerenciaProveedor = (nombre) => {
    setDatosOC((prev) => ({ ...prev, proveedor: nombre || '' }));
    setMostrarSugerenciasProveedor(false);
    setIndiceSugerenciaProveedor(-1);
  };

  const manejarTeclasProveedor = (e) => {
    if (!mostrarSugerenciasProveedor || buscandoProveedor || sugerenciasProveedor.length === 0) {
      if (e.key === 'Escape') {
        setMostrarSugerenciasProveedor(false);
        setIndiceSugerenciaProveedor(-1);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceSugerenciaProveedor((prev) => {
        const base = prev < 0 ? 0 : prev;
        return Math.min(base + 1, sugerenciasProveedor.length - 1);
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceSugerenciaProveedor((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
      return;
    }

    if (e.key === 'Enter') {
      if (indiceSugerenciaProveedor >= 0 && indiceSugerenciaProveedor < sugerenciasProveedor.length) {
        e.preventDefault();
        seleccionarSugerenciaProveedor(sugerenciasProveedor[indiceSugerenciaProveedor].nombre || '');
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setMostrarSugerenciasProveedor(false);
      setIndiceSugerenciaProveedor(-1);
    }
  };

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
      await guardarProveedorSiNoExiste(datosOC.proveedor, auth.currentUser);
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
              <div className="relative">
                <input
                  type="text"
                  placeholder="PROVEEDOR"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white text-xs font-bold outline-none focus:border-emerald-500"
                  value={datosOC.proveedor}
                  onKeyDown={manejarTeclasProveedor}
                  onFocus={() => {
                    setMostrarSugerenciasProveedor(true);
                    if (sugerenciasProveedor.length > 0 && indiceSugerenciaProveedor < 0) {
                      setIndiceSugerenciaProveedor(0);
                    }
                  }}
                  onBlur={() =>
                    setTimeout(() => {
                      setMostrarSugerenciasProveedor(false);
                      setIndiceSugerenciaProveedor(-1);
                    }, 120)
                  }
                  onChange={(e) => setDatosOC({ ...datosOC, proveedor: e.target.value.toUpperCase() })}
                />

                {mostrarSugerenciasProveedor && datosOC.proveedor.trim().length >= 2 && (
                  <div className="absolute z-20 mt-2 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
                    {buscandoProveedor && (
                      <div className="px-4 py-3 text-[10px] font-bold text-slate-400">Buscando proveedores guardados...</div>
                    )}

                    {!buscandoProveedor && !errorProveedor && sugerenciasProveedor.length === 0 && (
                      <div className="px-4 py-3 text-[10px] font-bold text-slate-400">No hay coincidencias. Se guardara como nuevo.</div>
                    )}

                    {!buscandoProveedor && errorProveedor && (
                      <div className="px-4 py-3 text-[10px] font-bold text-rose-400">{errorProveedor}</div>
                    )}

                    {!buscandoProveedor && sugerenciasProveedor.map((s, idx) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`w-full text-left px-4 py-3 border-b last:border-b-0 border-slate-800 ${
                          idx === indiceSugerenciaProveedor ? 'bg-slate-800' : 'hover:bg-slate-800'
                        }`}
                        onMouseEnter={() => setIndiceSugerenciaProveedor(idx)}
                        onMouseDown={() => {
                          seleccionarSugerenciaProveedor(s.nombre || '');
                        }}
                      >
                        <p className="text-[11px] font-black text-slate-200 uppercase">{s.nombre}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
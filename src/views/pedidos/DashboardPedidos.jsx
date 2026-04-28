import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  CheckSquare, Square, Link as LinkIcon, 
  ChevronDown, Package, DollarSign, Hash, ClipboardCheck, 
  Activity, Clock, Calendar, Truck
} from 'lucide-react';

export const DashboardPedidos = ({ role }) => {
  const [itemsPedidos, setItemsPedidos] = useState([]);
  const [ordenesExistentes, setOrdenesExistentes] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [showAsignador, setShowAsignador] = useState(false);
  const [nuevaOC, setNuevaOC] = useState({ numero: '', proveedor: '' });
  const formatFechaHora = (value) => {
    if (!value) return '---';
    let dateValue = null;
    if (typeof value.toDate === 'function') {
      dateValue = value.toDate();
    } else if (typeof value.seconds === 'number') {
      dateValue = new Date(value.seconds * 1000);
    } else if (value instanceof Date) {
      dateValue = value;
    }

    if (!dateValue) return '---';
    return new Intl.DateTimeFormat('es-SV', {
      dateStyle: 'short',
      timeStyle: 'short',
      hour12: false,
      timeZone: 'America/El_Salvador'
    }).format(dateValue);
  };

  useEffect(() => {
    const unsubOCs = onSnapshot(collection(db, "ordenesCompra"), (snap) => {
      setOrdenesExistentes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubSolicitudes = onSnapshot(collection(db, "solicitudes"), (snap) => {
      let tempItems = [];
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.productos && (data.estado === 'Pedido' || data.estado === 'Comprado')) {
          data.productos.forEach((p, idx) => {
            if (p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado') {
              tempItems.push({
                ...p,
                idRFQ: d.id,
                indexOriginal: idx,
                correlativo: data.correlativo || 'S/N',
                cliente: data.cliente,
                fobReal: p.fobReal || p.fob || 0,
                fechaCompromiso: p.fechaCompromiso, 
                diasPrometidos: p.diasPrometidos
              });
            }
          });
        }
      });
      setItemsPedidos(tempItems);
    });

    return () => { unsubOCs(); unsubSolicitudes(); };
  }, []);

  const toggleSeleccion = (uId) => {
    setSeleccionados(prev => prev.includes(uId) ? prev.filter(i => i !== uId) : [...prev, uId]);
  };

  const handleFobChange = (uId, valor) => {
    setItemsPedidos(prev => prev.map(item => 
      `${item.idRFQ}-${item.indexOriginal}` === uId ? { ...item, fobReal: valor } : item
    ));
  };

  const calcularCountdown = (fechaCompromiso, estadoLogistico) => {
    if (estadoLogistico === 'Recibido' || estadoLogistico === 'Entregado') return { dias: 0, label: 'COMPLETADO', color: 'text-emerald-500' };
    if (!fechaCompromiso) return { dias: '-', label: 'SIN FECHA', color: 'text-slate-300' };

    const hoy = new Date();
    const [dia, mes, anio] = fechaCompromiso.split('/');
    const compromiso = new Date(`${anio}-${mes}-${dia}`);
    const diferenciaMs = compromiso - hoy;
    const diasRestantes = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) return { dias: Math.abs(diasRestantes), label: 'RETRASO DÍAS', color: 'text-red-500' };
    return { dias: diasRestantes, label: 'DÍAS RESTANTES', color: 'text-blue-500' };
  };

  const getInfoOC = (numOC) => {
    const oc = ordenesExistentes.find(o => o.numeroOC === numOC);
    if (!oc) return { label: 'Por Procesar', color: 'bg-amber-100 text-amber-600', prov: 'Pendiente', mod: '-', rawEstado: 'Pendiente' };

    const ultimaMod = oc.ultimaActualizacion ? formatFechaHora(oc.ultimaActualizacion) : 'Sin cambios';
    const estados = {
      'Pedido': { label: 'OC Generada', color: 'bg-blue-100 text-blue-600' },
      'En Tránsito': { label: 'En Tránsito', color: 'bg-purple-100 text-purple-600' },
      'Recibido': { label: 'Recibido (Almacén)', color: 'bg-emerald-100 text-emerald-600' },
      'Entregado': { label: 'Entregado Cliente', color: 'bg-slate-900 text-white' }
    };

    return { ...(estados[oc.estado] || { label: oc.estado, color: 'bg-slate-100' }), prov: oc.proveedor, mod: ultimaMod, rawEstado: oc.estado };
  };

  const procesarAsignacion = async (ocExistente = null) => {
    const itemsAProcesar = itemsPedidos.filter(item => 
      seleccionados.includes(`${item.idRFQ}-${item.indexOriginal}`)
    );

    if (itemsAProcesar.length === 0) return alert("Selecciona ítems");
    const numOC = ocExistente ? ocExistente.numeroOC : nuevaOC.numero;
    const provOC = ocExistente ? ocExistente.proveedor : nuevaOC.proveedor;
    if (!numOC || !provOC) return alert("Faltan datos de la OC");

    try {
      const itemsFormateados = itemsAProcesar.map(i => ({
        descripcion: i.descripcion || i.desc,
        cantidad: i.cantidad || i.cant,
        fobConfirmado: Number(i.fobReal),
        idRFQ: i.idRFQ,
        indexOriginal: i.indexOriginal
      }));

      if (!ocExistente) {
        await addDoc(collection(db, "ordenesCompra"), {
          numeroOC: numOC, proveedor: provOC, estado: 'Pedido', fechaCreacion: serverTimestamp(), items: itemsFormateados
        });
      } else {
        const ocRef = doc(db, "ordenesCompra", ocExistente.id);
        await updateDoc(ocRef, {
          items: [...(ocExistente.items || []), ...itemsFormateados]
        });
      }

      for (const item of itemsAProcesar) {
        const rfqRef = doc(db, "solicitudes", item.idRFQ);
        const rfqSnap = await getDoc(rfqRef);
        if (rfqSnap.exists()) {
          const productosActualizados = [...rfqSnap.data().productos];
          productosActualizados[item.indexOriginal] = {
            ...productosActualizados[item.indexOriginal],
            estadoItem: 'Comprado',
            numOC: numOC,
            fobReal: Number(item.fobReal)
          };
          await updateDoc(rfqRef, { productos: productosActualizados });
        }
      }

      alert(`Éxito: Items vinculados a la OC ${numOC}`);
      setSeleccionados([]);
      setShowAsignador(false);
    } catch (error) { console.error(error); }
  };

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-800 italic uppercase tracking-tighter">
            Seguimiento de Pedidos <span className="text-emerald-500">.</span>
          </h1>
          <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.3em]">
            Vista: {role === 'vendedor' ? 'Ventas y Tiempos' : 'Compras y Logística'}
          </p>
        </div>
        {role === 'comprador' && seleccionados.length > 0 && (
           <button onClick={() => setShowAsignador(!showAsignador)} className="bg-emerald-500 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 flex items-center gap-3">
             <LinkIcon size={16} /> Vincular Selección ({seleccionados.length})
           </button>
        )}
      </div>

      {showAsignador && (
        <div className="mb-8 bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border-4 border-emerald-500/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <p className="text-emerald-400 font-black text-[10px] uppercase">Nueva OC</p>
              <div className="flex gap-4">
                <input type="text" placeholder="N° OC" className="flex-1 bg-slate-800 border-none p-4 rounded-xl text-white text-xs font-bold" onChange={(e) => setNuevaOC({...nuevaOC, numero: e.target.value.toUpperCase()})} />
                <input type="text" placeholder="PROVEEDOR" className="flex-1 bg-slate-800 border-none p-4 rounded-xl text-white text-xs font-bold" onChange={(e) => setNuevaOC({...nuevaOC, proveedor: e.target.value.toUpperCase()})} />
              </div>
              <button onClick={() => procesarAsignacion()} className="w-full bg-emerald-500 text-white py-4 rounded-xl font-black text-[10px] uppercase">Crear y Vincular</button>
            </div>
            <div className="space-y-4 border-l border-slate-800 pl-12">
              <p className="text-blue-400 font-black text-[10px] uppercase">Agregar a Existente</p>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                {ordenesExistentes.map(oc => (
                  <button key={oc.id} onClick={() => procesarAsignacion(oc)} className="w-full bg-slate-800 hover:bg-blue-600 text-white p-4 rounded-xl text-left text-[10px] font-black uppercase flex justify-between">
                    <span>{oc.numeroOC} — {oc.proveedor}</span>
                    <ChevronDown size={14} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-900 text-[9px] text-slate-400 font-black uppercase tracking-[0.15em]">
              <th className="p-6 text-center w-14">Sel</th>
              <th className="p-6 text-left">Ítem / Referencia</th>
              <th className="p-6 text-center">Cant.</th>
              <th className="p-6 text-right">Venta (Unit/Total)</th>
              {role === 'comprador' && <th className="p-6 text-center bg-slate-800">Costo FOB Real</th>}
              {role === 'comprador' && <th className="p-6 text-left bg-slate-800">Proveedor</th>}
              <th className="p-6 text-center">Prometido</th>
              <th className="p-6 text-center">Countdown</th>
              <th className="p-6 text-left">Estado Logístico</th>
              <th className="p-6 text-center">OC Ref.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {itemsPedidos.map((item) => {
              const uId = `${item.idRFQ}-${item.indexOriginal}`;
              const ocInfo = getInfoOC(item.numOC);
              const timer = calcularCountdown(item.fechaCompromiso, ocInfo.rawEstado);
              const ventaTotal = (item.precio || 0) * (item.cantidad || 0);

              return (
                <tr key={uId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-6 text-center">
                    {role === 'comprador' && !item.numOC ? (
                      <button onClick={() => toggleSeleccion(uId)} className={seleccionados.includes(uId) ? 'text-emerald-500' : 'text-slate-200'}>
                        {seleccionados.includes(uId) ? <CheckSquare size={22} fill="currentColor" /> : <Square size={22} />}
                      </button>
                    ) : <ClipboardCheck size={20} className="text-slate-200 mx-auto" />}
                  </td>
                  <td className="p-6">
                    <p className="text-[9px] font-black text-blue-500 flex items-center gap-1 uppercase mb-1">
                      <Hash size={10}/> {item.correlativo} — {item.cliente}
                    </p>
                    <p className="text-[11px] font-black text-slate-800 uppercase leading-tight">{item.descripcion || item.desc}</p>
                  </td>
                  <td className="p-6 text-center font-black text-xs text-slate-400">{item.cantidad || item.cant}</td>
                  <td className="p-6 text-right whitespace-nowrap">
                    <p className="text-[11px] font-black text-slate-800">${Number(item.precio || 0).toFixed(2)}</p>
                    <p className="text-[9px] font-bold text-emerald-500 uppercase">Total: ${ventaTotal.toFixed(2)}</p>
                  </td>
                  {role === 'comprador' && (
                    <td className="p-6 bg-slate-50/50">
                      <div className="flex items-center gap-1 border-2 border-slate-200 rounded-lg p-1 bg-white">
                        <span className="text-[9px] font-bold text-slate-400">$</span>
                        <input type="number" value={item.fobReal} disabled={!!item.numOC} onChange={(e) => handleFobChange(uId, e.target.value)} className="w-16 text-[11px] font-black outline-none bg-transparent" />
                      </div>
                    </td>
                  )}
                  {role === 'comprador' && (
                    <td className="p-6 bg-slate-50/50">
                      <p className="text-[10px] font-black text-slate-600 uppercase italic">{ocInfo.prov}</p>
                    </td>
                  )}
                  <td className="p-6 text-center">
                    <p className="text-[10px] font-black text-slate-700">{item.fechaCompromiso || 'N/A'}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{item.diasPrometidos} d.h. aceptados</p>
                  </td>
                  <td className="p-6 text-center">
                    <div className={`flex flex-col items-center ${timer.color}`}>
                      <span className="text-lg font-black leading-none">{timer.dias}</span>
                      <span className="text-[7px] font-black uppercase tracking-tighter">{timer.label}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className={`inline-flex flex-col px-3 py-1.5 rounded-xl border ${ocInfo.color} border-current bg-opacity-10 w-full max-w-[140px]`}>
                      <span className="text-[9px] font-black uppercase text-center">{ocInfo.label}</span>
                      <span className="text-[7px] font-bold opacity-70 text-center mt-0.5 tracking-tighter">MOD: {ocInfo.mod}</span>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    {item.numOC ? (
                      <span className="bg-slate-100 text-slate-800 text-[10px] font-black px-2 py-1 rounded border border-slate-200">
                        {item.numOC}
                      </span>
                    ) : <span className="text-slate-200 italic text-[9px]">PENDIENTE</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ChevronLeft, Clock, Tag, Calendar, CheckCircle2, ShoppingCart, Link as LinkIcon, AlertCircle } from 'lucide-react';

export const DetalleRFQVendedor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enviandoPedido, setEnviandoPedido] = useState(false);

  const [seleccionados, setSeleccionados] = useState({});
  const [modalidades, setModalidades] = useState({});
  const [linkOC, setLinkOC] = useState('');
  const [notasPedido, setNotasPedido] = useState('');

  // Función para calcular fecha omitiendo fines de semana
  const obtenerFechaEstimada = (dias) => {
    if (!dias || isNaN(parseInt(dias))) return 'Pendiente';
    let fecha = new Date();
    let diasRestantes = parseInt(dias);
    while (diasRestantes > 0) {
      fecha.setDate(fecha.getDate() + 1);
      if (fecha.getDay() !== 0 && fecha.getDay() !== 6) diasRestantes--;
    }
    return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  };

  useEffect(() => {
    const fetchRFQ = async () => {
      try {
        const docRef = doc(db, "solicitudes", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRfq({ id: docSnap.id, ...data });
          
          const selInit = {};
          const modInit = {};
          data.productos.forEach((p, idx) => {
            if (Number(p.fob) > 0) {
              selInit[idx] = false;
              modInit[idx] = 'A';
            }
          });
          setSeleccionados(selInit);
          setModalidades(modInit);
        } else {
          navigate('/vendedor');
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRFQ();
  }, [id, navigate]);

  const handleCrearPedido = async () => {
    const indicesSeleccionados = Object.keys(seleccionados).filter(idx => seleccionados[idx]);
    if (indicesSeleccionados.length === 0) return alert("Selecciona productos para el pedido.");
    if (!linkOC) return alert("Ingresa el link de la Orden de Compra.");

    setEnviandoPedido(true);
    try {
      const productosActualizadosParaRFQ = [...rfq.productos];
      const productosParaPedido = indicesSeleccionados.map(idx => {
        const p = rfq.productos[idx];
        const mod = modalidades[idx];
        const factor = mod === 'A' ? (rfq.factorA || 1) : 1.08;
        const margen = mod === 'A' ? (p.fva || 1.3) : (p.fvm || 1.25);
        const precioVenta = p.fob * factor * margen;
        const diasHabiles = mod === 'A' ? p.entregaA : p.entregaM;

        const itemData = {
          descripcion: p.descripcion || p.desc,
          marca: p.marca || 'N/A',
          cantidad: p.cant,
          precioUnitario: precioVenta,
          subtotal: precioVenta * p.cant,
          modalidad: mod === 'A' ? 'Aéreo' : 'Marítimo',
          diasPrometidos: parseInt(diasHabiles),
          fechaCompromiso: obtenerFechaEstimada(diasHabiles),
          estadoItem: 'Pedido',
          fob: p.fob
        };

        productosActualizadosParaRFQ[idx] = { ...p, ...itemData, precio: precioVenta };
        return itemData;
      });

      await addDoc(collection(db, "pedidos"), {
        idCotizacion: rfq.id,
        correlativoRFQ: rfq.correlativo,
        cliente: rfq.cliente,
        vendedorNombre: rfq.vendedorNombre,
        productos: productosParaPedido,
        linkOC,
        notasPedido,
        fechaCreacion: serverTimestamp(),
        estadoGeneral: 'Procesando'
      });

      await updateDoc(doc(db, "solicitudes", id), {
        estado: 'Pedido',
        productos: productosActualizadosParaRFQ,
        linkOC,
        fechaPedido: serverTimestamp()
      });

      alert("Pedido generado con éxito.");
      navigate('/vendedor'); 
    } catch (error) {
      console.error(error);
      alert("Error al procesar pedido.");
    } finally {
      setEnviandoPedido(false);
    }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center font-black text-slate-400 animate-pulse uppercase tracking-widest">
      Cargando Detalle de Cotización...
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/vendedor')} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-800 italic uppercase tracking-tighter">Detalle de Cotización</h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Ref: {rfq?.correlativo} — Cliente: {rfq?.cliente}</p>
          </div>
        </div>
        {rfq?.estado?.includes('Parcial') && (
          <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-2 animate-bounce">
            <AlertCircle size={14} /> Cotización Parcial
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden mb-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
              <th className="p-5 text-center w-16">Pedir</th>
              <th className="p-5 w-48">Producto / Marca</th>
              <th className="p-5 text-center">Cant.</th>
              <th className="p-5 text-center bg-emerald-800">Venta Aéreo</th>
              <th className="p-5 text-center bg-blue-800">Venta Marítimo</th>
              <th className="p-5 text-center">Elegir Modalidad</th>
              <th className="p-5">Tiempos y Entrega</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {rfq?.productos?.map((p, idx) => {
              const fobVal = Number(p.fob || 0);
              const estaCotizado = fobVal > 0;
              const ventaA = fobVal * (rfq.factorA || 1) * (p.fva || 1.30);
              const ventaM = fobVal * 1.08 * (p.fvm || 1.25);

              return (
                <tr key={idx} className={`${seleccionados[idx] ? 'bg-slate-50' : 'bg-white'} hover:bg-slate-50/50 transition-colors ${!estaCotizado ? 'opacity-60 bg-slate-50/30' : ''}`}>
                  <td className="p-5 text-center">
                    {estaCotizado ? (
                      <button 
                        onClick={() => setSeleccionados(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-all ${seleccionados[idx] ? 'bg-emerald-500 text-white shadow-lg' : 'border-2 border-slate-200 text-slate-200 hover:border-slate-400'}`}
                      ><CheckCircle2 size={20} /></button>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-300"><Clock size={16} /></div>
                    )}
                  </td>
                  <td className="p-5">
                    <div className="font-black text-slate-800 uppercase leading-tight">{p.descripcion || p.desc}</div>
                    <div className="flex items-center gap-1 mt-1 text-blue-600 font-bold italic text-[10px]"><Tag size={10} /> {p.marca || 'N/A'}</div>
                    {!estaCotizado && <span className="text-[8px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-black uppercase mt-2 inline-block">Pendiente de Costeo</span>}
                  </td>
                  <td className="p-5 text-center font-black text-slate-400 text-lg">{p.cant}</td>
                  <td className="p-5 text-center bg-emerald-50/30">
                    {estaCotizado ? <><div className="text-emerald-700 font-black text-base">${ventaA.toFixed(2)}</div><div className="text-[9px] text-emerald-500 font-bold uppercase">Total: ${(ventaA * p.cant).toFixed(2)}</div></> : <span className="text-slate-300 italic font-bold">---</span>}
                  </td>
                  <td className="p-5 text-center bg-blue-50/30">
                    {estaCotizado ? <><div className="text-blue-700 font-black text-base">${ventaM.toFixed(2)}</div><div className="text-[9px] text-blue-500 font-bold uppercase">Total: ${(ventaM * p.cant).toFixed(2)}</div></> : <span className="text-slate-300 italic font-bold">---</span>}
                  </td>
                  <td className="p-5 text-center">
                    {seleccionados[idx] ? (
                      <select value={modalidades[idx]} onChange={(e) => setModalidades(prev => ({ ...prev, [idx]: e.target.value }))} className="bg-slate-100 border-none rounded-lg p-2 font-black text-[10px] uppercase text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer">
                        <option value="A">Aéreo</option><option value="M">Marítimo</option>
                      </select>
                    ) : <span className="text-slate-300 italic text-[10px]">{estaCotizado ? 'Elegir para pedir' : 'Esperando'}</span>}
                  </td>
                  <td className="p-5">
                    {estaCotizado ? (
                      <div className="space-y-2">
                        <div className="flex flex-col">
                           <span className="text-[9px] font-black text-emerald-600 uppercase">Aéreo</span>
                           <span className="font-bold text-slate-700">{p.entregaA} d.h. <span className="text-slate-400 font-medium ml-1">({obtenerFechaEstimada(p.entregaA)})</span></span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[9px] font-black text-blue-600 uppercase">Marítimo</span>
                           <span className="font-bold text-slate-700">{p.entregaM} d.h. <span className="text-slate-400 font-medium ml-1">({obtenerFechaEstimada(p.entregaM)})</span></span>
                        </div>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
          <h2 className="text-sm font-black text-slate-800 uppercase mb-6 flex items-center gap-2"><LinkIcon size={18} className="text-emerald-500" /> Documentación</h2>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 italic">Enlace a Orden de Compra</label>
              <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all font-bold" placeholder="https://..." value={linkOC} onChange={(e) => setLinkOC(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 italic">Comentarios del Pedido</label>
              <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all font-bold" rows="3" placeholder="Notas adicionales para compras/logística..." value={notasPedido} onChange={(e) => setNotasPedido(e.target.value)} />
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-between">
          <div className="text-white space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Items en este pedido</span>
              <span className="text-xl font-black">{Object.values(seleccionados).filter(v => v).length}</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1 italic">Inversión Total Cliente</p>
              <p className="text-4xl font-black text-emerald-400">
                ${Object.keys(seleccionados).reduce((acc, idx) => { 
                  if (!seleccionados[idx]) return acc; 
                  const p = rfq.productos[idx]; 
                  const mod = modalidades[idx]; 
                  const factor = mod === 'A' ? (rfq.factorA || 1) : 1.08; 
                  const margen = mod === 'A' ? (p.fva || 1.3) : (p.fvm || 1.25); 
                  return acc + (p.fob * factor * margen * p.cant); 
                }, 0).toFixed(2)}
              </p>
            </div>
          </div>
          <button 
            onClick={handleCrearPedido} 
            disabled={enviandoPedido} 
            className="w-full mt-8 bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <ShoppingCart size={20} /> 
            {enviandoPedido ? 'GENERANDO...' : 'CONFIRMAR Y ENVIAR PEDIDO'}
          </button>
        </div>
      </div>
    </div>
  );
};
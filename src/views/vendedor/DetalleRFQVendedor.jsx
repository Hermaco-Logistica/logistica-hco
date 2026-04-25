import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ChevronLeft, Clock, Tag, MessageSquare, Calendar, CheckCircle2, ShoppingCart, Link as LinkIcon } from 'lucide-react';

export const DetalleRFQVendedor = ({ canGenerarPedido = true }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enviandoPedido, setEnviandoPedido] = useState(false);

  // Estados para la conversión a pedido
  const [seleccionados, setSeleccionados] = useState({}); // { index: true/false }
  const [modalidades, setModalidades] = useState({}); // { index: 'A' o 'M' }
  const [linkOC, setLinkOC] = useState('');
  const [notasPedido, setNotasPedido] = useState('');

  // --- Función para calcular fecha estimada (Salta fines de semana) ---
  const obtenerFechaEstimada = (dias) => {
    if (!dias || isNaN(parseInt(dias))) return 'N/A';
    let fecha = new Date();
    let diasRestantes = parseInt(dias);
    while (diasRestantes > 0) {
      fecha.setDate(fecha.getDate() + 1);
      if (fecha.getDay() !== 0 && fecha.getDay() !== 6) {
        diasRestantes--;
      }
    }
    return fecha.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  useEffect(() => {
    const fetchRFQ = async () => {
      try {
        const docRef = doc(db, "solicitudes", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRfq({ id: docSnap.id, ...data });
          
          // Inicializar selección y modalidades por defecto
          const selInit = {};
          const modInit = {};
          data.productos.forEach((p, idx) => {
            if (p.selected) {
              selInit[idx] = false;
              modInit[idx] = 'A'; // Defecto Aéreo para el pedido
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
    
    if (indicesSeleccionados.length === 0) return alert("Debes seleccionar al menos un producto para el pedido.");
    if (!linkOC) return alert("Por favor, ingresa el link de la Orden de Compra del cliente.");

    setEnviandoPedido(true);
    try {
      // 1. Preparar productos para la nueva colección 'pedidos' y para actualizar 'solicitudes'
      const productosActualizadosParaRFQ = [...rfq.productos];
      
      const productosParaPedido = indicesSeleccionados.map(idx => {
        const p = rfq.productos[idx];
        const mod = modalidades[idx];
        const factor = mod === 'A' ? (rfq.factorA || 1) : (rfq.factorM || 1.08);
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
          estadoItem: 'Pedido', // Crucial para el dashboard de pedidos
          fob: p.fob // Mantener el costo para compras
        };

        // Actualizamos el array que irá de vuelta a la solicitud original
        productosActualizadosParaRFQ[idx] = {
          ...p,
          ...itemData,
          precio: precioVenta // Aseguramos que el campo 'precio' exista para el dashboard
        };

        return itemData;
      });

      // 2. Crear el documento en la colección de Pedidos (Histórico/Logística)
      await addDoc(collection(db, "pedidos"), {
        idCotizacion: rfq.id,
        correlativoRFQ: rfq.correlativo,
        cliente: rfq.cliente,
        vendedorNombre: rfq.vendedorNombre,
        vendedorId: rfq.vendedorId,
        vendedorEmail: rfq.vendedorEmail,
        productos: productosParaPedido,
        linkOC: linkOC,
        notasPedido: notasPedido,
        fechaCreacion: serverTimestamp(),
        estadoGeneral: 'Procesando'
      });

      // 3. ACTUALIZACIÓN CRÍTICA: Actualizar la solicitud original
      // Cambiamos el estado global a 'Pedido' y actualizamos los productos con sus estados individuales
      const rfqRef = doc(db, "solicitudes", id);
      await updateDoc(rfqRef, {
        estado: 'Pedido',
        productos: productosActualizadosParaRFQ,
        linkOC: linkOC,
        fechaPedido: serverTimestamp()
      });

      alert("Pedido enviado a Compras correctamente.");
      navigate('/vendedor'); 
    } catch (error) {
      console.error(error);
      alert("Error al procesar el pedido.");
    } finally {
      setEnviandoPedido(false);
    }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center font-black text-slate-400 animate-pulse uppercase tracking-[0.3em]">
      Cargando Detalle...
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/vendedor')}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-800 italic uppercase tracking-tighter">Detalle de Cotización</h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">
              Ref: {rfq?.correlativo} — Cliente: {rfq?.cliente}
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de Resultados y Selección */}
      <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden mb-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
              <th className="p-5 text-center w-16 italic">Pedir</th>
              <th className="p-5 w-48">Producto / Marca</th>
              <th className="p-5 text-center">Cant.</th>
              <th className="p-5 text-center bg-emerald-800">Venta Aéreo</th>
              <th className="p-5 text-center bg-blue-800">Venta Marítimo</th>
              <th className="p-5 text-center">Elegir Modalidad</th>
              <th className="p-5">Tiempos de Entrega</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {rfq?.productos?.map((p, idx) => {
              if (!p.selected) return null;
              
              const ventaA = p.fob * (rfq.factorA || 1) * (p.fva || 1.30);
              const ventaM = p.fob * (rfq.factorM || 1.08) * (p.fvm || 1.25);

              return (
                <tr key={idx} className={`${seleccionados[idx] ? 'bg-slate-50' : 'bg-white'} hover:bg-slate-50/50 transition-colors`}>
                  <td className="p-5 text-center">
                    <button 
                      onClick={() => setSeleccionados(prev => ({ ...prev, [idx]: !prev[idx] }))}
                      className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-all ${
                        seleccionados[idx] ? 'bg-emerald-500 text-white shadow-lg' : 'border-2 border-slate-200 text-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <CheckCircle2 size={20} />
                    </button>
                  </td>
                  <td className="p-5">
                    <div className="font-black text-slate-800 uppercase leading-tight">{p.descripcion || p.desc}</div>
                    <div className="flex items-center gap-1 mt-1 text-blue-600 font-bold italic text-[10px]">
                      <Tag size={10} /> {p.marca || 'Sin marca'}
                    </div>
                  </td>
                  <td className="p-5 text-center font-black text-slate-400 text-lg">
                    {p.cant}
                  </td>
                  
                  {/* Aéreo */}
                  <td className="p-5 text-center bg-emerald-50/30">
                    <div className="text-emerald-700 font-black text-base">${ventaA.toFixed(2)}</div>
                    <div className="text-[9px] text-emerald-500 font-bold uppercase mt-1">Total: ${(ventaA * p.cant).toFixed(2)}</div>
                  </td>

                  {/* Marítimo */}
                  <td className="p-5 text-center bg-blue-50/30">
                    <div className="text-blue-700 font-black text-base">${ventaM.toFixed(2)}</div>
                    <div className="text-[9px] text-blue-500 font-bold uppercase mt-1">Total: ${(ventaM * p.cant).toFixed(2)}</div>
                  </td>

                  {/* Selector de Modalidad para Pedido */}
                  <td className="p-5 text-center">
                    {seleccionados[idx] ? (
                      <select 
                        value={modalidades[idx]} 
                        onChange={(e) => setModalidades(prev => ({ ...prev, [idx]: e.target.value }))}
                        className="bg-slate-100 border-none rounded-lg p-2 font-black text-[10px] uppercase text-slate-600 outline-none ring-2 ring-transparent focus:ring-emerald-500 transition-all cursor-pointer"
                      >
                        <option value="A">Enviar por Aéreo</option>
                        <option value="M">Enviar por Marítimo</option>
                      </select>
                    ) : (
                      <span className="text-slate-300 italic text-[10px]">No seleccionado</span>
                    )}
                  </td>

                  {/* Tiempos de Entrega + Fechas Estimadas */}
                  <td className="p-5">
                    <div className="space-y-3">
                      <div className="flex flex-col gap-0.5 border-l-2 border-emerald-500 pl-2">
                        <div className="flex items-center gap-2 font-bold text-slate-700">
                          <Clock size={12} className="text-emerald-500" /> {p.entregaA} d.h.
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-slate-400 font-bold uppercase">
                          <Calendar size={10} /> Est: {obtenerFechaEstimada(p.entregaA)}
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 border-l-2 border-blue-500 pl-2">
                        <div className="flex items-center gap-2 font-bold text-slate-700">
                          <Clock size={12} className="text-blue-500" /> {p.entregaM} d.h.
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-slate-400 font-bold uppercase">
                          <Calendar size={10} /> Est: {obtenerFechaEstimada(p.entregaM)}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Panel Final de Confirmación */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
          <h2 className="text-sm font-black text-slate-800 uppercase mb-6 flex items-center gap-2">
            <LinkIcon size={18} className="text-emerald-500" /> Documentación de Respaldo
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 italic">Enlace a Orden de Compra Cliente Externo</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all font-bold"
                placeholder="https://ejemplo.com/orden-de-compra-pdf"
                value={linkOC}
                onChange={(e) => setLinkOC(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 italic">Comentarios para Compras</label>
              <textarea 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all font-bold"
                rows="3"
                placeholder="Indica cualquier detalle relevante sobre el envío o empaque..."
                value={notasPedido}
                onChange={(e) => setNotasPedido(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-between">
          <div className="text-white space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Partidas Seleccionadas</span>
              <span className="text-xl font-black">{Object.values(seleccionados).filter(v => v).length}</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1 italic">Total del Pedido</p>
                <p className="text-4xl font-black text-emerald-400">
                  ${Object.keys(seleccionados).reduce((acc, idx) => {
                    if (!seleccionados[idx]) return acc;
                    const p = rfq.productos[idx];
                    const mod = modalidades[idx];
                    const factor = mod === 'A' ? (rfq.factorA || 1) : (rfq.factorM || 1.08);
                    const margen = mod === 'A' ? (p.fva || 1.3) : (p.fvm || 1.25);
                    return acc + (p.fob * factor * margen * p.cant);
                  }, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleCrearPedido}
            disabled={enviandoPedido || !canGenerarPedido}
            className="w-full mt-8 bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={20} />
            {canGenerarPedido ? (enviandoPedido ? 'PROCESANDO...' : 'CONFIRMAR Y GENERAR PEDIDO') : 'SOLO VISUALIZACION'}
          </button>
        </div>
      </div>
    </div>
  );
};
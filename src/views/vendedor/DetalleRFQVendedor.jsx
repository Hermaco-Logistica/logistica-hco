import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, collection, addDoc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { ChevronLeft, Clock, Tag, Calendar, CheckCircle2, ShoppingCart, Link as LinkIcon, AlertCircle, Printer, X } from 'lucide-react';
import CotizacionDocumento from '../../components/CotizacionDocumento';
import { generarPlantillaNuevoPedido } from '../../utils/emailTemplates';
import { emailConfig } from '../../config/emailConfig';

export const DetalleRFQVendedor = ({ canGenerarPedido = true }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [verPreview, setVerPreview] = useState(false);

  const [seleccionados, setSeleccionados] = useState({});
  const [modalidades, setModalidades] = useState({});
  const [linkOC, setLinkOC] = useState('');
  const [notasPedido, setNotasPedido] = useState('');

  const esItemYaPedido = (p) => {
    if (!p) return false;
    if (p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado') return true;
    if (p.modalidad && (Number(p.precioUnitario || 0) > 0 || Number(p.precio || 0) > 0 || !!p.fechaConfirmacion)) return true;
    return false;
  };

  const hayItemsPendientesDePedir = rfq?.productos?.some(p => Number(p.fob || 0) > 0 && !esItemYaPedido(p));
  const pedidoYaCreado = (rfq?.estado === 'Pedido' || rfq?.estado === 'Comprado') || (rfq?.estado === 'Pedido Parcial' && !hayItemsPendientesDePedir);
  const puedeConfirmarPedido = canGenerarPedido && hayItemsPendientesDePedir;
  const productosDelPedido = pedidoYaCreado
    ? (rfq?.productos || [])
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => esItemYaPedido(item))
    : Object.keys(seleccionados)
        .filter((idx) => seleccionados[idx])
        .map((idx) => ({ item: rfq?.productos?.[Number(idx)], idx: Number(idx) }))
        .filter(({ item }) => Boolean(item));

  const getModalidadSeleccionada = (idx, item = null) => {
    if (pedidoYaCreado) {
      const modalidadGuardada = item?.modalidad;
      if (modalidadGuardada === 'Aéreo') return 'A';
      if (modalidadGuardada === 'Marítimo') return 'M';
      return '';
    }

    return modalidades[idx] || '';
  };

  const getTextoModalidad = (idx, item = null) => {
    const mod = getModalidadSeleccionada(idx, item);
    if (mod === 'A') return 'Aéreo';
    if (mod === 'M') return 'Marítimo';
    return 'No seleccionada';
  };

  const getSubtotalItem = (item, idx) => {
    const mod = getModalidadSeleccionada(idx, item);
    if (pedidoYaCreado && Number(item?.subtotal) > 0) {
      return Number(item.subtotal || 0);
    }

    const factor = mod === 'A'
      ? (item?.factorA || rfq?.factorA || 1)
      : (item?.factorM || rfq?.factorM || 1.08);
    const margen = mod === 'A' ? (item?.fva || 1.3) : (item?.fvm || 1.25);
    return Number(item?.fob || 0) * factor * margen * Number(item?.cant || 0);
  };

  const desgloseVendedor = productosDelPedido.reduce((acc, registro) => {
    const subVal = getSubtotalItem(registro.item, registro.idx);
    const mod = getModalidadSeleccionada(registro.idx, registro.item);

    if (mod === 'A') acc.aereo += subVal;
    else if (mod === 'M') acc.maritimo += subVal;
    return acc;
  }, { aereo: 0, maritimo: 0 });

  const totalPedidoActual = desgloseVendedor.aereo + desgloseVendedor.maritimo;

  // Función para calcular fecha omitiendo fines de semana
  const obtenerFechaEstimada = (dias) => {
    if (!dias || isNaN(parseInt(dias))) return 'Pendiente';
    let fecha = new Date();
    let diasRestantes = parseInt(dias);
    while (diasRestantes > 0) {
      fecha.setDate(fecha.getDate() + 1);
      if (fecha.getDay() !== 0 && fecha.getDay() !== 6) diasRestantes--;
    }
    return fecha.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', timeZone: 'America/El_Salvador' });
  };

  useEffect(() => {
    const docRef = doc(db, "solicitudes", id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // PROTECCIÓN DE RUTA: Si es vendedor, verificar que sea el dueño
        const email = auth.currentUser?.email || '';
        const esVendedor = !email.toLowerCase().match(/admin|gerente|compras/);
        if (esVendedor && data.vendedorId !== auth.currentUser?.uid) {
          alert('Acceso Denegado: Esta solicitud pertenece a otro vendedor.');
          navigate('/vendedor');
          return;
        }

        setRfq({ id: docSnap.id, ...data });
        if (data.linkOC) setLinkOC(data.linkOC);
        if (data.notasPedido) setNotasPedido(data.notasPedido);
        
        const selInit = {};
        const modInit = {};
        data.productos.forEach((p, idx) => {
          if (Number(p.fob) > 0 && !esItemYaPedido(p)) {
            selInit[idx] = false;
            modInit[idx] = 'A';
          }
        });
        // Solo resetear si no había selecciones previas para no borrar el progreso del usuario
        setSeleccionados(prev => Object.keys(prev).length ? prev : selInit);
        setModalidades(prev => Object.keys(prev).length ? prev : modInit);
      } else {
        alert("Solicitud no encontrada.");
        navigate('/vendedor');
      }
      setLoading(false);
    }, (error) => {
      console.error("Error obteniendo RFQ:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, navigate]);

  const handleCrearPedido = async () => {
    if (!puedeConfirmarPedido) {
      alert('Este pedido ya fue generado y no puede confirmarse de nuevo.');
      return;
    }
    const indicesSeleccionados = Object.keys(seleccionados).filter(idx => seleccionados[idx]);
    if (indicesSeleccionados.length === 0) return alert("Selecciona productos para el pedido.");

    setEnviandoPedido(true);
    try {
      const productosActualizadosParaRFQ = [...rfq.productos];
      const productosParaPedido = indicesSeleccionados.map(idx => {
        const p = rfq.productos[idx];
        const mod = modalidades[idx];
        const factor = mod === 'A'
          ? (p.factorA || rfq.factorA || 1)
          : (p.factorM || rfq.factorM || 1.08);
        const margen = mod === 'A' ? (p.fva || 1.3) : (p.fvm || 1.25);
        const precioVenta = p.fob * factor * margen;
        const diasHabiles = mod === 'A' ? p.entregaA : p.entregaM;

        const ahoraTimestamp = new Date();
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
          fechaConfirmacion: p.fechaConfirmacion || ahoraTimestamp,
          fob: p.fob
        };

        productosActualizadosParaRFQ[idx] = { ...p, ...itemData, precio: precioVenta };
        return itemData;
      });

      const valorLinkOC = linkOC || rfq?.linkOC || "";
      const valorNotasPedido = notasPedido || rfq?.notasPedido || "";

      await addDoc(collection(db, "pedidos"), {
        idCotizacion: rfq.id,
        correlativoRFQ: rfq.correlativo,
        cliente: rfq.cliente,
        vendedorNombre: rfq.vendedorNombre,
        productos: productosParaPedido,
        linkOC: valorLinkOC,
        notasPedido: valorNotasPedido,
        fechaCreacion: serverTimestamp(),
        estadoGeneral: 'Procesando'
      });

      const todosLosItemsPedidos = productosActualizadosParaRFQ.every(p => esItemYaPedido(p));
      const estadoNuevoSolicitud = todosLosItemsPedidos ? 'Pedido' : 'Pedido Parcial';

      await updateDoc(doc(db, "solicitudes", id), {
        estado: estadoNuevoSolicitud,
        productos: productosActualizadosParaRFQ,
        linkOC: valorLinkOC,
        notasPedido: valorNotasPedido,
        fechaPedido: serverTimestamp(),
        pedidoEmailEnviado: false
      });

      // --- LÓGICA DE CORREO AUTOMÁTICO AL CREAR PEDIDO ---
      const productosCotizadosCount = rfq.productos.filter(p => Number(p.fob || 0) > 0 || p.precio > 0).length;
      // El estado posterior a la selección determina el tipo del correo. Así,
      // al confirmar los últimos ítems el aviso siempre dice pedido completo.
      const esPedidoParcial = estadoNuevoSolicitud === 'Pedido Parcial';

      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      const vendedorEmail = auth.currentUser?.email || rfq.vendedorEmail || '';
      const vendedorNombre = auth.currentUser?.displayName || rfq.vendedorNombre || vendedorEmail.split('@')[0];

      const senderFrom = isLocal ? 'rvides@hermaco.net <rvides@hermaco.net>' : `${vendedorNombre} <${vendedorEmail}>`;
      const replyToEmail = isLocal ? 'rvides@hermaco.net' : vendedorEmail;
      const destinatarioTo = isLocal ? ["rvides@hermaco.net"] : (emailConfig.pedidoGenerado?.to?.filter(Boolean).length ? emailConfig.pedidoGenerado.to : ["compras@hermaco.net"]);
      const ccEmails = isLocal 
        ? ["rvides@hermaco.net"]
        : [
            vendedorEmail,
            ...(emailConfig.nuevaRFQ?.cc || ["chernandez@hermaco.net", "fsalinas@hermaco.net", "oventura@hermaco.net"])
          ];

      const orderDataForEmail = {
        correlativoRFQ: rfq.correlativo,
        cliente: rfq.cliente,
        vendedorNombre,
        vendedorEmail,
        esPedidoParcial,
        totalItemsCotizacion: productosCotizadosCount,
        productos: productosActualizadosParaRFQ,
        linkOC: linkOC || "",
        notasPedido: notasPedido || ""
      };

      const htmlBody = generarPlantillaNuevoPedido(orderDataForEmail);
      const tipoTag = esPedidoParcial ? 'Parcial' : 'Completo';

      try {
        const mailRes = await fetch('/.netlify/functions/send-email-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: senderFrom,
            replyTo: replyToEmail,
            to: destinatarioTo,
            cc: ccEmails,
            subject: `Nuevo Pedido ${tipoTag}: ${rfq.correlativo} - ${rfq.cliente}`,
            bodyHtml: htmlBody
          })
        });

        if (!mailRes.ok) throw new Error('Fallo al enviar correo de pedido');
        await updateDoc(doc(db, 'solicitudes', id), { pedidoEmailEnviado: true });
      } catch (e) {
        console.error("Error enviando correo de pedido:", e);
      }

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
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Ref: {rfq?.correlativo} — Cliente: {rfq?.cliente} {rfq?.validez && `— Validez: ${rfq.validez}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {rfq?.estado !== 'Pendiente' && (
            <button 
              onClick={() => setVerPreview(true)}
              className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10 cursor-pointer"
            >
              <Printer size={12} /> Ver Cotización / Imprimir
            </button>
          )}
          {rfq?.estado?.includes('Parcial') && (
            <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-2 animate-bounce">
              <AlertCircle size={14} /> Cotización Parcial
            </div>
          )}
          {pedidoYaCreado && (
            <div className="bg-emerald-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-2">
              <CheckCircle2 size={14} /> Pedido ya generado
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-4xl shadow-2xl border border-slate-200 overflow-hidden mb-8">
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
              const yaFuePedido = esItemYaPedido(p);
              const ventaA = fobVal * (p.factorA || rfq.factorA || 1) * (p.fva || 1.30);
              const ventaM = fobVal * (p.factorM || rfq.factorM || 1.08) * (p.fvm || 1.25);

              return (
                <tr key={idx} className={`${seleccionados[idx] ? 'bg-slate-50' : (yaFuePedido ? 'bg-emerald-50/20' : 'bg-white')} hover:bg-slate-50/50 transition-colors ${!estaCotizado ? 'opacity-60 bg-slate-50/30' : ''}`}>
                  <td className="p-5 text-center">
                    {yaFuePedido ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-sm" title="Ítem ya pedido previamente">
                        <CheckCircle2 size={18} />
                      </div>
                    ) : estaCotizado ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!puedeConfirmarPedido) return;
                          setSeleccionados(prev => ({ ...prev, [idx]: !prev[idx] }));
                        }}
                        disabled={!puedeConfirmarPedido}
                        className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-all ${seleccionados[idx] ? 'bg-emerald-500 text-white shadow-lg' : 'border-2 border-slate-200 text-slate-200 hover:border-slate-400'} ${!puedeConfirmarPedido ? 'opacity-40 cursor-not-allowed' : ''}`}
                      ><CheckCircle2 size={20} /></button>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-300"><Clock size={16} /></div>
                    )}
                  </td>
                  <td className="p-5">
                    <div className="font-black text-slate-800 uppercase leading-tight">{p.descripcion || p.desc}</div>
                    <div className="flex items-center gap-1 mt-1 text-blue-600 font-bold italic text-[10px]"><Tag size={10} /> {p.marca || 'N/A'}</div>
                    {yaFuePedido ? (
                      <span className="text-[8px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black uppercase mt-2 inline-block">
                        ✓ Pedido Confirmado ({p.modalidad || 'Aéreo'})
                      </span>
                    ) : !estaCotizado && (
                      (p.enConsulta || p.estadoItem === 'En consulta') ? (
                        <span className="text-[8px] bg-amber-500 text-white px-2.5 py-0.5 rounded-full font-black uppercase mt-2 inline-flex items-center gap-1 shadow-sm">
                          💬 En Consulta con Proveedor
                        </span>
                      ) : (
                        <span className="text-[8px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-black uppercase mt-2 inline-block">
                          Pendiente de Costeo
                        </span>
                      )
                    )}
                  </td>
                  <td className="p-5 text-center font-black text-slate-400 text-lg">{p.cant}</td>
                  <td className="p-5 text-center bg-emerald-50/30">
                    {estaCotizado ? <><div className="text-emerald-700 font-black text-base">${ventaA.toFixed(2)}</div><div className="text-[9px] text-emerald-500 font-bold uppercase">Total: ${(ventaA * p.cant).toFixed(2)}</div></> : <span className="text-slate-300 italic font-bold">---</span>}
                  </td>
                  <td className="p-5 text-center bg-blue-50/30">
                    {estaCotizado ? <><div className="text-blue-700 font-black text-base">${ventaM.toFixed(2)}</div><div className="text-[9px] text-blue-500 font-bold uppercase">Total: ${(ventaM * p.cant).toFixed(2)}</div></> : <span className="text-slate-300 italic font-bold">---</span>}
                  </td>
                  <td className="p-5 text-center">
                    {yaFuePedido ? (
                      <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        {p.modalidad || 'Aéreo'}
                      </span>
                    ) : seleccionados[idx] ? (
                      <select
                        value={modalidades[idx]}
                        onChange={(e) => setModalidades(prev => ({ ...prev, [idx]: e.target.value }))}
                        disabled={!puedeConfirmarPedido}
                        className="bg-slate-100 border-none rounded-lg p-2 font-black text-[10px] uppercase text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
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
              <input
                type="text"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all font-bold"
                placeholder="https://..."
                value={linkOC}
                onChange={(e) => setLinkOC(e.target.value)}
                disabled={!puedeConfirmarPedido}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 italic">Comentarios del Pedido</label>
              <textarea
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all font-bold"
                rows="3"
                placeholder="Notas adicionales para compras/logística..."
                value={notasPedido}
                onChange={(e) => setNotasPedido(e.target.value)}
                disabled={!puedeConfirmarPedido}
              />
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-between">
          <div className="text-white space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {pedidoYaCreado ? 'Resumen del pedido' : 'Items en este pedido'}
              </span>
              <span className="text-xl font-black">
                {pedidoYaCreado ? productosDelPedido.length : Object.values(seleccionados).filter(v => v).length}
              </span>
            </div>
             <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1 italic">
                {pedidoYaCreado ? 'Total del pedido generado' : 'Inversión Total Cliente'}
              </p>
              <p className="text-4xl font-black text-emerald-400">
                ${totalPedidoActual.toFixed(2)}
              </p>
              <div className="mt-3 space-y-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-3 border-t border-slate-800">
                <div className="flex justify-between">
                    <span>Aéreo:</span>
                  <span className="text-white">${desgloseVendedor.aereo.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Marítimo:</span>
                  <span className="text-white">${desgloseVendedor.maritimo.toFixed(2)}</span>
                </div>
              </div>
            </div>
            {pedidoYaCreado && (
              <div className="pt-2 space-y-2 text-[11px] font-bold text-slate-300 uppercase tracking-widest">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span>Pedido generado</span>
                  <span className="text-emerald-400">Sí</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span>Ref. OC Cliente/Vendedor</span>
                  <span className="text-white normal-case tracking-normal">{linkOC || rfq?.linkOC || 'No registrada'}</span>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <div className="mb-2 text-slate-500">Modalidad por ítem</div>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {productosDelPedido.map((registro) => (
                      <div key={`${registro.item?.descripcion || registro.item?.desc || registro.idx}-${registro.idx}`} className="flex justify-between gap-3 text-white normal-case tracking-normal">
                        <span className="truncate text-slate-200">{registro.item?.descripcion || registro.item?.desc || `Ítem ${registro.idx + 1}`}</span>
                        <span className={`shrink-0 font-black ${getTextoModalidad(registro.idx, registro.item) === 'Aéreo' ? 'text-emerald-400' : getTextoModalidad(registro.idx, registro.item) === 'Marítimo' ? 'text-blue-400' : 'text-slate-400'}`}>
                          {getTextoModalidad(registro.idx, registro.item)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={handleCrearPedido}
            disabled={enviandoPedido || !puedeConfirmarPedido}
            className="w-full mt-8 bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={20} />
            {puedeConfirmarPedido
              ? (enviandoPedido ? 'GENERANDO...' : 'CONFIRMAR Y ENVIAR PEDIDO')
              : (pedidoYaCreado ? 'PEDIDO YA GENERADO' : 'SOLO VISUALIZACION')}
          </button>
          
          {pedidoYaCreado && (
            <div className="mt-4 bg-slate-100 border-2 border-slate-200 rounded-xl p-4 text-center animate-in fade-in zoom-in duration-300">
              <span className="text-slate-700 font-black text-xs uppercase tracking-widest">
                OC Compras Asignada: {[...new Set((rfq?.productos || []).filter(p => p.numOC).map(p => p.numOC))].join(', ') || 'Pendiente'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Vista Previa y Exportación */}
      {verPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-100 rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 px-8 py-5 flex items-center justify-between text-white">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento Oficial</p>
                <h3 className="text-lg font-black tracking-tight uppercase">Vista Previa de Cotización</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const printContent = document.getElementById('cotizacion-print-area').innerHTML;
                    const iframe = document.createElement('iframe');
                    iframe.style.position = 'fixed';
                    iframe.style.right = '0';
                    iframe.style.bottom = '0';
                    iframe.style.width = '0';
                    iframe.style.height = '0';
                    iframe.style.border = '0';
                    document.body.appendChild(iframe);
                    const doc = iframe.contentWindow.document;
                    doc.write('<html><head><title>Cotizacion_' + (rfq?.correlativo || 'Documento') + '</title>');
                    document.querySelectorAll('link[rel="stylesheet"], style').forEach((styleNode) => {
                      doc.write(styleNode.outerHTML);
                    });
                    doc.write('</head><body class="bg-white p-8">');
                    doc.write(printContent);
                    doc.write('</body></html>');
                    doc.close();
                    setTimeout(() => {
                      iframe.contentWindow.focus();
                      iframe.contentWindow.print();
                      document.body.removeChild(iframe);
                    }, 500);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Printer size={14} /> Imprimir / PDF
                </button>
                <button
                  type="button"
                  onClick={() => setVerPreview(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2.5 rounded-full transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-slate-50">
              <div id="cotizacion-print-area" className="bg-white shadow-sm rounded-3xl p-1">
                <CotizacionDocumento cotizacionData={rfq} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

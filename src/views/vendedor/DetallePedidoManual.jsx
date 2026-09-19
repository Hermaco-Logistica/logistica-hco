import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, collection, addDoc, serverTimestamp, updateDoc, onSnapshot, getDocs, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { 
  ChevronLeft, CheckCircle2, AlertCircle, X,
  Clock, Package, MessageSquare, Square, CheckSquare, Send
} from 'lucide-react';

import { emailConfig } from '../../config/emailConfig';
import { HiloComentariosItem } from '../../components/hilos/HiloComentariosItem';
import { useMensajesResumen } from '../../hooks/useMensajesResumen';
import { sintetizarMensajesLegados } from '../../hooks/useHiloItem';
import { DetallePedidoMobileCard } from '../../components/pedidos/DetallePedidoMobileCard';

export const DetallePedidoManual = ({ canGenerarPedido = true, soloPropiasParaPedido = false, role }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [seleccionados, setSeleccionados] = useState({});
  const [hiloAbierto, setHiloAbierto] = useState(null);
  const [modalidades, setModalidades] = useState({});

  const esItemYaPedido = (p) => p && (p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado');
  const esItemDenegado = (p) => p && (p.estadoItem === 'Denegado' || p.estadoItem === 'Cancelado' || p.estadoItem === 'Rechazado');
  
  const hayItemsPendientesDePedir = pedido?.productos?.some(p => p.estadoItem === 'Cotizado' && !esItemYaPedido(p) && !esItemDenegado(p));
  const _pedidoYaCreado = pedido?.estado === 'Pedido' || pedido?.estado === 'Comprado';
  const esPropietario = (pedido?.vendedorId && pedido.vendedorId === auth.currentUser?.uid) ||
    (pedido?.vendedorEmail && auth.currentUser?.email && pedido.vendedorEmail.toLowerCase() === auth.currentUser.email.toLowerCase());
  
  const puedeConfirmarPedido = canGenerarPedido && (!soloPropiasParaPedido || esPropietario) && hayItemsPendientesDePedir;

  // Ir al inicio al entrar a la vista
  useEffect(() => { (document.querySelector('main') || window).scrollTo({ top: 0, behavior: 'instant' }); }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "solicitudes", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const email = auth.currentUser?.email || '';
        const puedeVerCualquierSolicitud = role === 'gerente' || role === 'administrador' || role === 'comprador' ||
          Boolean(email.toLowerCase().match(/admin|gerente|compras/));
        const esDuenio = (data.vendedorId === auth.currentUser?.uid) ||
          (data.vendedorEmail?.toLowerCase() === email.toLowerCase());

        if (!puedeVerCualquierSolicitud && !esDuenio) {
          alert('Acceso Denegado.');
          navigate('/vendedor');
          return;
        }

        setPedido({ id: docSnap.id, ...data });
        
        const selInit = {};
        data.productos.forEach((p, idx) => {
          if (p.estadoItem === 'Cotizado' && !esItemYaPedido(p) && !esItemDenegado(p)) {
            selInit[idx] = false;
          }
        });
        setSeleccionados(prev => Object.keys(prev).length ? prev : selInit);
      } else {
        alert("Pedido no encontrado.");
        navigate('/vendedor');
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id, navigate, role]);



  const handleCrearPedido = async () => {
    const indices = Object.keys(seleccionados).filter(idx => seleccionados[idx]);
    if (!indices.length) return alert("Selecciona ítems devueltos para confirmar pedido.");

    setEnviando(true);
    try {
      const prodsAct = [...pedido.productos];
      const paraPedido = indices.map(idx => {
        const p = pedido.productos[idx];
        const itemData = {
          descripcion: p.descripcion || p.desc,
          marca: p.marca || 'N/A',
          cantidad: p.cant,
          precioUnitario: Number(p.fob || 0),
          subtotal: Number(p.fob || 0) * p.cant,
          modalidad: modalidades[idx] || p.modalidad || 'Aéreo',
          diasPrometidos: parseInt(p.fechaCompromiso) || 0,
          fechaCompromiso: p.fechaCompromiso || 'Pendiente',
          estadoItem: 'Pedido',
          fechaConfirmacion: new Date(),
          fob: p.fob
        };
        prodsAct[idx] = { ...p, ...itemData };
        return itemData;
      });

      await addDoc(collection(db, "pedidos"), {
        idCotizacion: pedido.id,
        correlativoRFQ: pedido.correlativo,
        cliente: pedido.cliente,
        vendedorNombre: pedido.vendedorNombre,
        productos: paraPedido,
        linkOC: pedido.linkOC || "",
        notasPedido: pedido.notasPedido || "",
        fechaCreacion: serverTimestamp(),
        estadoGeneral: 'Procesando'
      });

      const todosPedidos = prodsAct.every(p => esItemYaPedido(p) || esItemDenegado(p));
      const estadoNuevo = todosPedidos ? 'Pedido' : 'Pedido Parcial';

      await updateDoc(doc(db, "solicitudes", id), {
        estado: estadoNuevo,
        productos: prodsAct,
        fechaPedido: serverTimestamp(),
        pedidoEmailEnviado: false
      });

      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const vendedorEmail = auth.currentUser?.email || pedido.vendedorEmail || '';
      const vendedorNombre = auth.currentUser?.displayName || pedido.vendedorNombre || vendedorEmail.split('@')[0];
      const senderFrom = isLocal ? 'rvides@hermaco.net <rvides@hermaco.net>' : `${vendedorNombre} <${vendedorEmail}>`;
      const destinatarioTo = isLocal ? ["rvides@hermaco.net"] : (emailConfig.pedidoGenerado?.to || ["compras@hermaco.net"]);
      
      const qMensajes = query(collection(db, `solicitudes/${id}/mensajes`), orderBy("createdAt", "asc"));
      const snapMensajes = await getDocs(qMensajes);
      const todosMensajesDB = snapMensajes.docs.map(d => d.data());

      const formatearFechaHora = (ts) => {
        if (!ts) return '';
        try {
          const d = ts.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
          if (isNaN(d.getTime())) return '';
          return d.toLocaleDateString('es-HN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch {
          return '';
        }
      };

      let detallesHtml = '';
      prodsAct.forEach((p, idx) => {
        if (!seleccionados[idx]) return;

        const mensajesItemDB = todosMensajesDB.filter(m => m.itemId === idx);
        const mensajesItem = sintetizarMensajesLegados(p, idx, mensajesItemDB);
        
        let historialHtml = '';
        if (mensajesItem.length > 0) {
          historialHtml = '<div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0;">';
          historialHtml += '<div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">Historial de correspondencia</div>';
          
          mensajesItem.forEach(m => {
            const autorNombre = m.autor?.nombre || 'Usuario';
            const rolTexto = m.autor?.rol ? ` (${m.autor.rol.charAt(0).toUpperCase() + m.autor.rol.slice(1)})` : '';
            const fechaStr = formatearFechaHora(m.createdAt);

            if (m.tipo === 'texto') {
              historialHtml += `
                <div style="margin-bottom: 10px; background-color: #f8fafc; border-left: 3px solid #cbd5e1; padding: 10px 14px; border-radius: 0 4px 4px 0;">
                  <div style="font-size: 11px; color: #64748b; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #edf2f7;">
                    <strong style="color: #1e293b;">De:</strong> ${autorNombre}${rolTexto}${fechaStr ? ` &nbsp;|&nbsp; <span>${fechaStr}</span>` : ''}
                  </div>
                  <div style="font-size: 12px; color: #334155; line-height: 1.5;">
                    ${m.texto}
                  </div>
                </div>
              `;
            } else if (m.tipo === 'propuesta') {
              const precioPropuesto = Number(m.precioPropuesto || 0);
              const precioAnterior = Number(m.precioAnterior || 0);
              const tienePrecioAnterior = precioAnterior > 0 && precioAnterior !== precioPropuesto;
              const modalidadPropuesta = m.modalidad || '';
              const modalidadAnterior = m.modalidadAnterior || '';
              const hayModalidadCambio = modalidadPropuesta && modalidadAnterior && modalidadAnterior !== modalidadPropuesta;
              const tiempoEntregaPropuesto = m.tiempoEntrega || '';
              const tiempoEntregaAnterior = m.tiempoEntregaAnterior || '';
              const hayTiempoCambio = tiempoEntregaPropuesto && tiempoEntregaAnterior && tiempoEntregaAnterior !== tiempoEntregaPropuesto;

              historialHtml += `
                <div style="margin-bottom: 10px; background-color: #f8fafc; border-left: 3px solid #94a3b8; padding: 10px 14px; border-radius: 0 4px 4px 0;">
                  <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #edf2f7;">
                    <strong style="color: #1e293b;">De:</strong> ${autorNombre}${rolTexto}${fechaStr ? ` &nbsp;|&nbsp; <span>${fechaStr}</span>` : ''}
                    <span style="float: right; font-size: 10px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; font-weight: 600;">Propuesta de ajuste</span>
                  </div>
                  <div style="font-size: 12px; color: #334155; line-height: 1.5;">
                    <table style="font-size: 12px; color: #334155; border-collapse: collapse; margin-bottom: 4px;">
                      ${tienePrecioAnterior ? `
                      <tr>
                        <td style="padding: 1px 12px 1px 0; color: #64748b;">Precio anterior:</td>
                        <td style="padding: 1px 0; color: #94a3b8; text-decoration: line-through;">$${precioAnterior.toFixed(2)}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding: 1px 12px 1px 0; color: #64748b;">Precio propuesto:</td>
                        <td style="padding: 1px 0;"><strong>$${precioPropuesto.toFixed(2)}</strong></td>
                      </tr>
                      ${tiempoEntregaPropuesto ? `
                      <tr>
                        <td style="padding: 1px 12px 1px 0; color: #64748b;">Tiempo de entrega:</td>
                        <td style="padding: 1px 0;">
                          ${hayTiempoCambio ? `<span style="text-decoration: line-through; color: #94a3b8; margin-right: 6px;">${!isNaN(tiempoEntregaAnterior) ? `${tiempoEntregaAnterior} días` : tiempoEntregaAnterior}</span>` : ''}
                          <strong>${!isNaN(tiempoEntregaPropuesto) ? `${tiempoEntregaPropuesto} días` : tiempoEntregaPropuesto}</strong>
                        </td>
                      </tr>` : ''}
                      ${modalidadPropuesta ? `
                      <tr>
                        <td style="padding: 1px 12px 1px 0; color: #64748b;">Modalidad:</td>
                        <td style="padding: 1px 0;">
                          ${hayModalidadCambio ? `<span style="text-decoration: line-through; color: #94a3b8; margin-right: 6px;">${modalidadAnterior}</span>` : ''}
                          <strong>${modalidadPropuesta}</strong>
                        </td>
                      </tr>` : ''}
                    </table>
                    ${m.texto ? `<div style="margin-top: 6px; font-size: 12px; color: #475569; font-style: italic;">"${m.texto}"</div>` : ''}
                  </div>
                </div>
              `;
            } else if (m.tipo === 'aceptacion') {
              historialHtml += `
                <div style="margin-bottom: 10px; background-color: #f8fafc; border-left: 3px solid #64748b; padding: 10px 14px; border-radius: 0 4px 4px 0;">
                  <div style="font-size: 11px; color: #64748b; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #edf2f7;">
                    <strong style="color: #1e293b;">De:</strong> ${autorNombre}${rolTexto}${fechaStr ? ` &nbsp;|&nbsp; <span>${fechaStr}</span>` : ''}
                  </div>
                  <div style="font-size: 12px; color: #1e293b; line-height: 1.5;">
                    ✓ <strong>Aceptación:</strong> Se aceptaron los términos y condiciones propuestos.
                  </div>
                </div>
              `;
            }
          });
          historialHtml += '</div>';
        }

        const fobAcordado = Number(p.fob || 0);
        const fobPrevioItem = p.fobAnterior !== undefined ? Number(p.fobAnterior) : (p.precioAnterior !== undefined ? Number(p.precioAnterior) : fobAcordado);
        const hayDiferencia = fobPrevioItem > 0 && fobPrevioItem !== fobAcordado;

        detallesHtml += `
          <div style="margin-bottom: 15px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background-color: #ffffff;">
            <table style="width: 100%; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 12px 15px; border-collapse: collapse;">
              <tr>
                <td style="font-size: 13px; font-weight: bold; color: #0f172a;">${p.descripcion} (x${p.cant})</td>
                <td style="text-align: right;">
                  <span style="color: #475569; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; letter-spacing: 0.5px;">PEDIDO</span>
                </td>
              </tr>
            </table>
            <div style="padding: 15px;">
              <table style="width: 100%; font-size: 12px; color: #334155; border-collapse: collapse;">
                <tr>
                  <td style="padding: 0 20px 0 0;">
                    ${hayDiferencia ? `
                      <span style="color: #64748b; margin-right: 4px;">Precio anterior:</span><span style="text-decoration: line-through; color: #94a3b8; margin-right: 8px;">$${fobPrevioItem.toFixed(2)}</span>
                      <strong>Precio acordado:</strong> <strong>$${fobAcordado.toFixed(2)}</strong>
                    ` : `
                      <strong>Precio acordado:</strong> $${fobAcordado.toFixed(2)}
                    `}
                  </td>
                  <td style="padding: 0 20px 0 0;"><strong>T. Entrega:</strong> ${p.fechaCompromiso || 'Pendiente'}</td>
                  <td style="padding: 0;"><strong>Modalidad:</strong> ${p.modalidad || 'Aéreo'}</td>
                </tr>
              </table>
              ${historialHtml}
            </div>
          </div>
        `;
      });

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #334155; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background-color: #ffffff;">
          <div style="padding: 20px; text-align: center; border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
            <p style="margin: 0; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">Sistema Logística Hermaco</p>
            <h2 style="color: #0f172a; margin: 8px 0 0; font-size: 18px; font-weight: bold; letter-spacing: -0.5px;">Pedido Manual Confirmado</h2>
          </div>
          <div style="padding: 20px;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>Vendedor:</strong> ${vendedorNombre}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Correlativo:</strong> ${pedido.correlativo}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Cliente:</strong> ${pedido.cliente}</p>
            
            <h3 style="margin-top: 24px; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-weight: bold; letter-spacing: 0.5px;">Detalle de Ítems e Historial</h3>
            <div style="margin-top: 16px;">
              ${detallesHtml}
            </div>
          </div>
        </div>
      `;

      try {
        const mailRes = await fetch('/.netlify/functions/send-email-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: senderFrom,
            replyTo: vendedorEmail,
            to: destinatarioTo,
            subject: `Nuevo Pedido Manual Confirmado: ${pedido.correlativo} - ${pedido.cliente}`,
            bodyHtml: htmlBody
          })
        });
        if (mailRes.ok) await updateDoc(doc(db, 'solicitudes', id), { pedidoEmailEnviado: true });
      } catch (e) {
        console.error("Error email:", e);
      }

      alert("Pedido confirmado.");
      navigate('/pedidos');
    } catch (e) {
      console.error(e);
      alert("Error al procesar.");
    } finally {
      setEnviando(false);
    }
  };

  const { conteos, noLeidos, pendientes } = useMensajesResumen(pedido?.id, pedido?.productos);

  if (loading) return <div className="p-8 text-center text-slate-400 font-black animate-pulse">CARGANDO...</div>;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-0 pb-36 md:pb-24 animate-in fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="shrink-0 p-2 hover:bg-slate-200 rounded-full transition-colors">
          <ChevronLeft size={22} />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-black text-slate-800 uppercase italic leading-tight">Detalle Pedido Manual</h1>
          <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest truncate">{pedido?.correlativo} - {pedido?.cliente}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">

        {/* Vista móvil: tarjetas */}
        <div className="md:hidden divide-y divide-slate-100">
          {pedido?.productos?.map((p, idx) => (
            <DetallePedidoMobileCard
              key={idx}
              p={p}
              idx={idx}
              pedido={pedido}
              esItemYaPedido={esItemYaPedido}
              esItemDenegado={esItemDenegado}
              seleccionados={seleccionados}
              setSeleccionados={setSeleccionados}
              modalidades={modalidades}
              setModalidades={setModalidades}
              conteos={conteos}
              noLeidos={noLeidos}
              puedeConfirmarPedido={puedeConfirmarPedido}
              hiloAbierto={hiloAbierto}
              setHiloAbierto={setHiloAbierto}
              currentUser={{ ...auth.currentUser, rol: role }}
              esPropietario={esPropietario}
            />
          ))}
        </div>

        {/* Vista escritorio: tabla */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left min-w-[820px]">
            <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="p-4 text-center w-16">Pedir</th>
                <th className="p-4">Descripción / Marca</th>
                <th className="p-4 text-center">Cant</th>
                <th className="p-4">Tiempo Entrega</th>
                <th className="p-4 text-center w-24">Precio (OC)</th>
                <th className="p-4 text-center">Subtotal</th>
                <th className="p-4 text-center">Modalidad</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 w-32 text-center">Mensajes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {pedido?.productos?.map((p, idx) => {
                const yaFuePedido = esItemYaPedido(p);
                const fueDenegado = esItemDenegado(p);
                const fueDevuelto = p.estadoItem === 'Cotizado';
                const fob = Number(p.fob || 0);
                const msgCount = conteos[idx] || 0;
                const unreadCount = noLeidos[idx] || 0;
                const _tienePropuesta = pendientes[idx];
                return (
                  <React.Fragment key={idx}>
                    <tr className={seleccionados[idx] ? 'bg-slate-50' : (yaFuePedido ? 'bg-emerald-50/20' : fueDenegado ? 'bg-rose-50/20' : 'bg-white')}>
                      <td className="p-4 text-center">
                        {yaFuePedido ? (
                          <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                        ) : fueDenegado ? (
                          <X size={16} className="text-rose-500 mx-auto" />
                        ) : fueDevuelto ? (
                          <button onClick={() => setSeleccionados(prev => ({ ...prev, [idx]: !prev[idx] }))} disabled={!puedeConfirmarPedido} className={`mx-auto ${seleccionados[idx] ? 'text-emerald-500' : 'text-slate-300'}`}>
                            {seleccionados[idx] ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                        ) : (
                          <Clock size={14} className="text-slate-300 mx-auto" />
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-black text-slate-800 uppercase">{p.descripcion || p.desc}</div>
                        <div className="text-[10px] text-blue-600 font-bold uppercase">{p.marca}</div>
                      </td>
                      <td className="p-4 text-center font-black text-slate-400 text-lg">{p.cant}</td>
                      <td className="p-4 font-bold text-slate-600">{p.fechaCompromiso || p.tiempoEntrega || '---'}</td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className={`font-black ${fueDevuelto ? 'text-amber-600' : 'text-emerald-700'}`}>${fob.toFixed(2)}</span>
                          {fueDevuelto && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mt-1" title="Propuesta pendiente en el hilo" />}
                        </div>
                      </td>
                      <td className="p-4 text-center font-black text-slate-700">${(fob * p.cant).toFixed(2)}</td>
                      <td className="p-4 text-center">
                        {yaFuePedido ? (
                          <span className="text-xs font-black text-slate-600 bg-slate-100 px-2 py-1 rounded">{p.modalidad || 'Aéreo'}</span>
                        ) : fueDevuelto && seleccionados[idx] ? (
                          <select value={modalidades[idx] || p.modalidad || 'Aéreo'} onChange={(e) => setModalidades(prev => ({ ...prev, [idx]: e.target.value }))} className="bg-slate-100 border-none rounded-lg p-1.5 font-black text-[10px] uppercase text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer">
                            <option value="Aéreo">Aéreo</option>
                            <option value="Marítimo">Marítimo</option>
                          </select>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 italic">{p.modalidad || 'Aéreo'}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {yaFuePedido ? (
                          <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-black uppercase">Aprobado</span>
                        ) : fueDenegado ? (
                          <span className="text-[9px] bg-rose-100 text-rose-700 px-2 py-1 rounded font-black uppercase">Denegado</span>
                        ) : fueDevuelto ? (
                          <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-black uppercase">Ajuste de Compras</span>
                        ) : (
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-black uppercase">En Revisión</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {esPropietario && (
                          <button onClick={() => setHiloAbierto(hiloAbierto === idx ? null : idx)} className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase transition-colors relative ${hiloAbierto === idx ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`} aria-expanded={hiloAbierto === idx} aria-label={`Ver conversación, ${msgCount} mensajes`}>
                            <MessageSquare size={14} className={msgCount === 0 ? 'opacity-50' : ''} />
                            <span className={msgCount === 0 ? 'opacity-50' : ''}>Mensajes</span>
                            {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm">{unreadCount}</span>}
                          </button>
                        )}
                      </td>
                    </tr>
                    {hiloAbierto === idx && (
                      <tr className="bg-slate-50">
                        <td colSpan={9} className="p-0">
                          <HiloComentariosItem
                            solicitudId={pedido.id}
                            itemId={idx}
                            productoActual={p}
                            currentUser={{ ...auth.currentUser, rol: role }}
                            todosLosProductos={pedido.productos}
                            onClose={() => setHiloAbierto(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {puedeConfirmarPedido && Object.values(seleccionados).some(v => v) && (
        <div className="fixed bottom-[80px] md:bottom-8 left-0 right-0 px-4 md:px-8 z-40 flex justify-center pointer-events-none">
          <button
            onClick={handleCrearPedido}
            disabled={enviando}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-black uppercase tracking-widest rounded-2xl transition-all text-sm shadow-[0_8px_30px_rgb(16,185,129,0.3)] hover:shadow-[0_8px_40px_rgb(16,185,129,0.5)] active:scale-[0.98] pointer-events-auto flex items-center justify-center gap-2"
          >
            {enviando ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>PROCESANDO...</span>
              </>
            ) : (
              'CONFIRMAR ÍTEMS DEVUELTOS'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

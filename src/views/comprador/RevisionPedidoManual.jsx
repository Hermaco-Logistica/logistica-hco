import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Loader2, ArrowLeft, Check, X, ArrowLeftRight, MessageSquare } from 'lucide-react';
import { StickyActionBar } from '../../components/mobile';
import { HiloComentariosItem } from '../../components/hilos/HiloComentariosItem';
import { useMensajesResumen } from '../../hooks/useMensajesResumen';
import { sintetizarMensajesLegados } from '../../hooks/useHiloItem';
import { RevisionPedidoMobileCard } from '../../components/pedidos/RevisionPedidoMobileCard';

export const RevisionPedidoManual = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [originalProductos, setOriginalProductos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comentariosComprador, setComentariosComprador] = useState('');
  const [hiloAbierto, setHiloAbierto] = useState(null);

  const { conteos, noLeidos } = useMensajesResumen(pedido?.id, pedido?.productos);

  const todosAprobadosOriginal = Boolean(
    originalProductos &&
    originalProductos.length > 0 &&
    originalProductos.every(p => p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado' || p.estadoItem === 'Denegado' || p.estadoItem === 'Cancelado' || p.estadoItem === 'Rechazado')
  );

  // Ir al inicio al entrar a la vista
  useEffect(() => { (document.querySelector('main') || window).scrollTo({ top: 0, behavior: 'instant' }); }, []);

  useEffect(() => {
    const fetchPedido = async () => {
      try {
        const docRef = doc(db, 'solicitudes', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPedido({ id: docSnap.id, ...data });
          setOriginalProductos(JSON.parse(JSON.stringify(data.productos)));
          if (data.comentariosComprador) {
            setComentariosComprador(data.comentariosComprador);
          }
        } else {
          alert('No se encontró el pedido.');
          navigate('/compras');
        }
      } catch (error) {
        console.error('Error fetching pedido:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPedido();
  }, [id, navigate]);

  const handleFieldChange = (index, field, value) => {
    if (todosAprobadosOriginal) return;
    const updatedProductos = [...pedido.productos];
    updatedProductos[index][field] = value;
    setPedido({ ...pedido, productos: updatedProductos });
  };

  const calcularEstadoGlobal = (productosActualizados) => {
    const todosAprobados = productosActualizados.every(p => p.estadoItem === 'Pedido');
    const todosDenegados = productosActualizados.every(p => p.estadoItem === 'Denegado');
    const todosProcesados = productosActualizados.every(p => p.estadoItem === 'Pedido' || p.estadoItem === 'Denegado');
    const algunDevuelto = productosActualizados.some(p => p.estadoItem === 'Cotizado');
    
    if (todosAprobados) return 'Pedido';
    if (todosDenegados) return 'Denegado';
    if (todosProcesados) return 'Pedido';
    if (algunDevuelto) return 'Cotizado Parcial';
    
    return 'Enviado a Compras';
  };

  const guardarCambios = async () => {
    if (todosAprobadosOriginal) {
      alert('Este pedido ya se encuentra completamente aprobado y finalizado.');
      return;
    }

    const hayPendientes = pedido.productos.some(p => p.estadoItem === 'Pendiente');
    const confirmMsg = hayPendientes 
      ? '¿Estás seguro de guardar los cambios? Los ítems pendientes se mantendrán sin procesar.' 
      : '¿Estás seguro de guardar los cambios del pedido?';

    if (!window.confirm(confirmMsg)) return;

    setSaving(true);
    try {
      const docRef = doc(db, 'solicitudes', id);
      
      const nuevoEstadoGlobal = calcularEstadoGlobal(pedido.productos);

      const updatedData = {
        estado: nuevoEstadoGlobal,
        comentariosComprador: comentariosComprador.trim(),
        productos: pedido.productos.map((p, idx) => {
          const fobActual = Number(p.fob || 0);
          const fobPrevio = originalProductos?.[idx]?.fob !== undefined
            ? Number(originalProductos[idx].fob)
            : (p.fobAnterior !== undefined ? Number(p.fobAnterior) : fobActual);
          return {
            ...p,
            fob: fobActual,
            fobAnterior: fobPrevio !== fobActual ? fobPrevio : (p.fobAnterior !== undefined ? Number(p.fobAnterior) : fobActual),
            modalidad: p.modalidad || 'Aéreo',
            comentarioCompras: p.comentarioCompras || ''
          };
        })
      };
      
      // Solo generar pedido en la colección 'pedidos' para los ítems recién aprobados en esta acción
      const productosParaPedido = pedido.productos
        .map((p, idx) => ({ p, idx }))
        .filter(({ p, idx }) => p.estadoItem === 'Pedido' && originalProductos?.[idx]?.estadoItem !== 'Pedido')
        .map(({ p }) => {
          const precioVenta = Number(p.fob || 0);
          return {
            descripcion: p.descripcion || p.desc,
            marca: p.marca || 'N/A',
            cantidad: p.cant,
            precioUnitario: precioVenta,
            subtotal: precioVenta * p.cant,
            modalidad: p.modalidad || 'Aéreo',
            diasPrometidos: parseInt(p.fechaCompromiso) || 0,
            fechaCompromiso: p.fechaCompromiso || 'Pendiente',
            estadoItem: 'Pedido',
            fechaConfirmacion: new Date(),
            fob: p.fob
          };
        });

      if (productosParaPedido.length > 0) {
        await addDoc(collection(db, 'pedidos'), {
          idCotizacion: id,
          correlativoRFQ: pedido.correlativo,
          cliente: pedido.cliente,
          vendedorNombre: pedido.vendedorNombre,
          productos: productosParaPedido,
          linkOC: pedido.linkOC || '',
          notasPedido: pedido.notasPedido || '',
          fechaCreacion: serverTimestamp(),
          estadoGeneral: 'Procesando'
        });
      }

      await updateDoc(docRef, updatedData);

      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const vendedorEmail = pedido.vendedorEmail;
      const destinatarioTo = isLocal ? ['rvides@hermaco.net'] : [vendedorEmail];
      const ccEmails = isLocal ? [] : ['compras@hermaco.net'];
      
      const itemsModificados = pedido.productos.filter(p => p.estadoItem !== 'Pendiente');
      const _resumenAcciones = {
        aprobados: itemsModificados.filter(p => p.estadoItem === 'Pedido').length,
        devueltos: itemsModificados.filter(p => p.estadoItem === 'Cotizado').length,
        denegados: itemsModificados.filter(p => p.estadoItem === 'Denegado').length
      };

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
      pedido.productos.forEach((p, idx) => {
        if (p.estadoItem === 'Pendiente') return;

        const fobActual = Number(p.fob || 0);
        const fobPrevio = originalProductos?.[idx]?.fob !== undefined
          ? Number(originalProductos[idx].fob)
          : (p.fobAnterior !== undefined ? Number(p.fobAnterior) : fobActual);
        const hayCambioPrecio = fobPrevio > 0 && fobPrevio !== fobActual;

        const productoParaSintesis = {
          ...p,
          fob: fobActual,
          fobAnterior: fobPrevio
        };

        const mensajesItemDB = todosMensajesDB.filter(m => m.itemId === idx);
        const mensajesItem = sintetizarMensajesLegados(productoParaSintesis, idx, mensajesItemDB);
        
        let estadoLabel = 'Modificado';
        if (p.estadoItem === 'Pedido') { estadoLabel = 'APROBADO'; }
        if (p.estadoItem === 'Cotizado') { estadoLabel = 'NUEVA OFERTA'; }
        if (p.estadoItem === 'Denegado') { estadoLabel = 'DENEGADO'; }

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

        detallesHtml += `
          <div style="margin-bottom: 15px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background-color: #ffffff;">
            <table style="width: 100%; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 12px 15px; border-collapse: collapse;">
              <tr>
                <td style="font-size: 13px; font-weight: bold; color: #0f172a;">${p.descripcion} (x${p.cant})</td>
                <td style="text-align: right;">
                  <span style="color: #475569; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; letter-spacing: 0.5px;">${estadoLabel}</span>
                </td>
              </tr>
            </table>
            <div style="padding: 15px;">
              <table style="width: 100%; font-size: 12px; color: #334155; border-collapse: collapse;">
                <tr>
                  <td style="padding: 0 20px 0 0;">
                    ${hayCambioPrecio ? `
                      <span style="color: #64748b; margin-right: 4px;">Precio anterior:</span><span style="text-decoration: line-through; color: #94a3b8; margin-right: 8px;">$${fobPrevio.toFixed(2)}</span>
                      <strong>Nuevo precio:</strong> <strong>$${fobActual.toFixed(2)}</strong>
                    ` : `
                      <strong>Precio actual:</strong> $${fobActual.toFixed(2)}
                    `}
                  </td>
                  <td style="padding: 0 20px 0 0;"><strong>T. Entrega:</strong> ${p.fechaCompromiso || p.tiempoEntrega || 'No definido'}</td>
                  <td style="padding: 0;"><strong>Modalidad:</strong> ${p.modalidad || 'Aéreo'}</td>
                </tr>
              </table>
              ${historialHtml}
            </div>
          </div>
        `;
      });

      const emailBody = `
        <div style="font-family: Arial, sans-serif; color: #334155; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background-color: #ffffff;">
          <div style="padding: 20px; text-align: center; border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
            <h2 style="color: #0f172a; margin: 0; font-size: 18px; font-weight: bold; letter-spacing: -0.5px;">Actualización de Pedido Manual</h2>
          </div>
          <div style="padding: 20px;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>Correlativo:</strong> ${pedido.correlativo}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Cliente:</strong> ${pedido.cliente}</p>
            ${comentariosComprador.trim() ? `<div style="margin-top: 16px; padding: 12px 16px; border-left: 3px solid #cbd5e1; background:#f8fafc; color:#334155; font-size: 13px;"><strong>Comentarios de Compras:</strong><br/><span style="color:#475569;">${comentariosComprador.trim()}</span></div>` : ''}
            
            <h3 style="margin-top: 24px; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-weight: bold; letter-spacing: 0.5px;">Detalle de Modificaciones</h3>
            <div style="margin-top: 16px;">
              ${detallesHtml}
            </div>
          </div>
        </div>
      `;

      try {
        await fetch('/.netlify/functions/send-email-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Compras Hermaco <compras@hermaco.net>',
            replyTo: 'compras@hermaco.net',
            to: destinatarioTo,
            cc: ccEmails,
            subject: `Actualización Pedido Manual: ${pedido.correlativo} - ${pedido.cliente}`,
            bodyHtml: emailBody
          })
        });
      } catch (e) {
        console.error('Error enviando email:', e);
      }
      alert('Cambios guardados correctamente.');
      navigate('/pedidos');
    } catch (error) {
      console.error('Error guardando cambios:', error);
      alert('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (!pedido) return null;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-0 pb-32 animate-in fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/compras')} className="shrink-0 p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={22} className="text-slate-600" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-black text-slate-800 uppercase italic leading-tight">Revisión de Pedido Manual</h1>
          <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest truncate">{pedido.correlativo} - {pedido.cliente}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Detalles del Vendedor</h3>
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Vendedor:</span>
              <p className="font-bold text-slate-700">{pedido.vendedorNombre}</p>
            </div>
            {pedido.comentariosVendedor && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Notas:</span>
                <p className="text-sm font-medium text-slate-600 bg-slate-50 p-3 rounded-xl mt-1">{pedido.comentariosVendedor}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Tus Comentarios</h3>
          <textarea
            value={comentariosComprador}
            onChange={(e) => setComentariosComprador(e.target.value)}
            disabled={todosAprobadosOriginal}
            placeholder="Observaciones de compras..."
            className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-sm font-medium resize-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-4 bg-slate-900">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ítems del Pedido</span>
        </div>

        {/* Vista móvil: tarjetas */}
        <div className="md:hidden divide-y divide-slate-100">
          {pedido.productos.map((p, idx) => (
            <RevisionPedidoMobileCard
              key={idx}
              p={p}
              idx={idx}
              pedido={pedido}
              originalProductos={originalProductos}
              handleFieldChange={handleFieldChange}
              conteos={conteos}
              noLeidos={noLeidos}
              hiloAbierto={hiloAbierto}
              setHiloAbierto={setHiloAbierto}
            />
          ))}
        </div>

        {/* Vista escritorio: tabla */}
        <div className="hidden md:block overflow-x-auto p-4">
          <table className="w-full text-left min-w-[900px]">
            <thead className="text-[10px] uppercase font-black tracking-widest text-slate-400">
              <tr>
                <th className="p-3">Descripción</th>
                <th className="p-3">Marca</th>
                <th className="p-3 text-center">Cant</th>
                <th className="p-3 w-32">Precio (Venta OC)</th>
                <th className="p-3 w-40">Tiempo Entrega</th>
                <th className="p-3 w-32">Modalidad</th>
                <th className="p-3 w-32 text-center">Mensajes</th>
                <th className="p-3 w-48 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pedido.productos.map((p, idx) => {
                const isProcesado = p.estadoItem !== 'Pendiente';
                const msgCount = conteos[idx] || 0;
                const unreadCount = noLeidos[idx] || 0;
                let bgClass = 'hover:bg-slate-50';
                if (p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado') bgClass = 'bg-emerald-50';
                else if (p.estadoItem === 'Cotizado') bgClass = 'bg-amber-50';
                else if (p.estadoItem === 'Denegado') bgClass = 'bg-rose-50';
                return (
                  <React.Fragment key={idx}>
                    <tr className={`transition-colors ${bgClass}`}>
                      <td className="p-3 font-bold text-sm uppercase text-slate-700">{p.descripcion}</td>
                      <td className="p-3 font-bold text-sm uppercase text-slate-700">{p.marca}</td>
                      <td className="p-3 text-center font-black text-slate-700">{p.cant}</td>
                      <td className="p-3">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                          <input type="number" value={p.fob || ''} onChange={(e) => handleFieldChange(idx, 'fob', e.target.value)} className="w-full pl-7 p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-slate-700" disabled={isProcesado} />
                        </div>
                      </td>
                      <td className="p-3">
                        <input type="text" value={p.fechaCompromiso || ''} onChange={(e) => handleFieldChange(idx, 'fechaCompromiso', e.target.value)} placeholder="Ej: 5 días" className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-slate-700 text-sm" disabled={isProcesado} />
                      </td>
                      <td className="p-3">
                        {isProcesado ? (
                          <span className="text-xs font-black text-slate-600 bg-slate-100 px-2 py-1 rounded">{p.modalidad || 'Aéreo'}</span>
                        ) : (
                          <select value={p.modalidad || 'Aéreo'} onChange={(e) => handleFieldChange(idx, 'modalidad', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-slate-700 text-sm cursor-pointer">
                            <option value="Aéreo">Aéreo</option>
                            <option value="Marítimo">Marítimo</option>
                          </select>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => setHiloAbierto(hiloAbierto === idx ? null : idx)} className={`relative inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase transition-colors ${hiloAbierto === idx ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} aria-label={`Ver conversación, ${msgCount} mensajes`}>
                          <MessageSquare size={14} className={msgCount === 0 ? 'opacity-50' : ''} />
                          <span className={msgCount === 0 ? 'opacity-50' : ''}>Mensajes</span>
                          {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm">{unreadCount}</span>}
                        </button>
                      </td>
                      <td className="p-3">
                        {!isProcesado ? (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleFieldChange(idx, 'estadoItem', 'Pedido')} className="p-2 bg-slate-100 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors" title="Aprobar"><Check size={16} /></button>
                            <button onClick={() => handleFieldChange(idx, 'estadoItem', 'Cotizado')} className="p-2 bg-slate-100 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors" title="Devolver con ajuste"><ArrowLeftRight size={16} /></button>
                            <button onClick={() => handleFieldChange(idx, 'estadoItem', 'Denegado')} className="p-2 bg-slate-100 text-rose-700 hover:bg-rose-100 rounded-lg transition-colors" title="Denegar"><X size={16} /></button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${(p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado') ? 'text-emerald-700' : p.estadoItem === 'Cotizado' ? 'text-amber-700' : 'text-rose-700'}`}>
                              {(p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado') ? 'Aprobado' : (p.estadoItem === 'Cotizado' ? 'Devuelto' : p.estadoItem === 'Denegado' ? 'Denegado' : p.estadoItem)}
                            </span>
                            {!(originalProductos && (originalProductos[idx].estadoItem === 'Pedido' || originalProductos[idx].estadoItem === 'Comprado' || originalProductos[idx].estadoItem === 'Denegado')) && (
                              <button onClick={() => handleFieldChange(idx, 'estadoItem', 'Pendiente')} className="text-[10px] text-slate-400 hover:text-slate-700 underline font-bold">Deshacer</button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    {hiloAbierto === idx && (
                      <tr className="bg-slate-50">
                        <td colSpan={8} className="p-0">
                          <HiloComentariosItem
                            solicitudId={pedido.id}
                            itemId={idx}
                            productoActual={p}
                            currentUser={{ ...auth.currentUser, rol: 'comprador' }}
                            todosLosProductos={pedido.productos}
                            onClose={() => setHiloAbierto(null)}
                            onPrecioAceptado={(nuevoFob) => handleFieldChange(idx, 'fob', nuevoFob)}
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

      <StickyActionBar
        className="mt-6"
        primaryAction={
          <button 
            onClick={guardarCambios}
            disabled={saving || todosAprobadosOriginal}
            className={`w-full py-4 px-6 rounded-2xl font-black text-white uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-2 ${
              todosAprobadosOriginal 
                ? 'bg-slate-400 cursor-not-allowed opacity-80' 
                : 'bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50'
            }`}
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : todosAprobadosOriginal ? (
              <>
                <Check size={18} />
                Pedido Finalizado
              </>
            ) : (
              <>
                <Check size={18} />
                Guardar Cambios
              </>
            )}
          </button>
        }
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, collection, addDoc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { 
  ChevronLeft, ChevronDown, Clock, Tag, CheckCircle2, ShoppingCart, Link as LinkIcon, 
  AlertCircle, Printer, X, Paperclip, FileText, Trash2,
  Plane, Ship, MessageSquare, Calendar, CheckSquare, Square, Package
} from 'lucide-react';
import CotizacionDocumento from '../../components/CotizacionDocumento';
import { generarPlantillaNuevoPedido } from '../../utils/emailTemplates';
import { emailConfig } from '../../config/emailConfig';
import { StickyActionBar } from '../../components/mobile';

export const DetalleRFQVendedor = ({ canGenerarPedido = true, soloPropiasParaPedido = false, role }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [mensajePedido, setMensajePedido] = useState('');
  const [verPreview, setVerPreview] = useState(false);

  const [seleccionados, setSeleccionados] = useState({});
  const [modalidades, setModalidades] = useState({});
  const [linkOC, setLinkOC] = useState('');
  const [notasPedido, setNotasPedido] = useState('');
  // Adjuntos múltiples: [{ archivo: File, nombre: string, tipo: string }]
  const [archivosAdjuntos, setArchivosAdjuntos] = useState([]);
  const [documentacionOpen, setDocumentacionOpen] = useState(false);
  const [modalidadesOpen, setModalidadesOpen] = useState(false);

  const esItemYaPedido = (p) => {
    if (!p) return false;
    if (p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado') return true;
    if (p.modalidad && (Number(p.precioUnitario || 0) > 0 || Number(p.precio || 0) > 0 || !!p.fechaConfirmacion)) return true;
    return false;
  };

  const hayItemsPendientesDePedir = rfq?.productos?.some(p => Number(p.fob || 0) > 0 && !esItemYaPedido(p));
  const pedidoYaCreado = (rfq?.estado === 'Pedido' || rfq?.estado === 'Comprado') || (rfq?.estado === 'Pedido Parcial' && !hayItemsPendientesDePedir);
  const esPropietarioDeRFQ = (rfq?.vendedorId && rfq.vendedorId === auth.currentUser?.uid) ||
    (rfq?.vendedorEmail && auth.currentUser?.email && rfq.vendedorEmail.toLowerCase() === auth.currentUser.email.toLowerCase());
  const puedeConfirmarPedido = canGenerarPedido && (!soloPropiasParaPedido || esPropietarioDeRFQ) && hayItemsPendientesDePedir;
  const totalItemsSeleccionables = rfq?.productos?.filter(p => Number(p.fob || 0) > 0 && !esItemYaPedido(p)).length ?? 0;
  const totalItemsSeleccionados = Object.values(seleccionados).filter(Boolean).length;
  const seraParcial = puedeConfirmarPedido && totalItemsSeleccionados > 0 && totalItemsSeleccionados < totalItemsSeleccionables;
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
        
        // PROTECCIÓN DE RUTA: Solo los vendedores tienen restringido ver solicitudes de otros
        const email = auth.currentUser?.email || '';
        const puedeVerCualquierSolicitud = role === 'gerente' || role === 'administrador' || role === 'comprador' ||
          Boolean(email.toLowerCase().match(/admin|gerente|compras/));

        const esDuenio = (data.vendedorId && data.vendedorId === auth.currentUser?.uid) ||
          (data.vendedorEmail && auth.currentUser?.email && data.vendedorEmail.toLowerCase() === auth.currentUser.email.toLowerCase());

        if (!puedeVerCualquierSolicitud && !esDuenio) {
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
        navigate(role === 'comprador' ? '/compras' : '/vendedor');
      }
      setLoading(false);
    }, (error) => {
      console.error("Error obteniendo RFQ:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, navigate, role]);

  // ── Adjuntos múltiples directo a correo, sin límite en frontend ──────────
  const handleAdjuntarArchivos = (event) => {
    const nuevos = Array.from(event.target.files || []);
    event.target.value = '';
    if (!nuevos.length) return;
    setArchivosAdjuntos(prev => [
      ...prev,
      ...nuevos.map(f => ({ archivo: f, nombre: f.name, tipo: f.type || 'application/octet-stream' }))
    ]);
  };

  const handleEliminarArchivo = (index) => {
    setArchivosAdjuntos(prev => prev.filter((_, i) => i !== index));
  };

  const prepararAdjuntosParaCorreo = async () => {
    if (!archivosAdjuntos.length) return undefined;
    return Promise.all(
      archivosAdjuntos.map(({ archivo, nombre }) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ content: String(reader.result || '').split(',')[1] || '', nombre });
          reader.onerror = reject;
          reader.readAsDataURL(archivo);
        })
      )
    );
  };
  // ─────────────────────────────────────────────────────────────────────────

  const handleCrearPedido = async () => {
    if (!puedeConfirmarPedido) {
      alert('Este pedido ya fue generado y no puede confirmarse de nuevo.');
      return;
    }
    const indicesSeleccionados = Object.keys(seleccionados).filter(idx => seleccionados[idx]);
    if (indicesSeleccionados.length === 0) return alert("Selecciona productos para el pedido.");

    setEnviandoPedido(true);
    setMensajePedido('Creando pedido...');
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

      setMensajePedido('Actualizando solicitud...');
      await updateDoc(doc(db, "solicitudes", id), {
        estado: estadoNuevoSolicitud,
        productos: productosActualizadosParaRFQ,
        linkOC: valorLinkOC,
        notasPedido: valorNotasPedido,
        fechaPedido: serverTimestamp(),
        pedidoEmailEnviado: false,
        tieneAdjuntos: archivosAdjuntos.length > 0,
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
        notasPedido: notasPedido || "",
      };

      const htmlBody = generarPlantillaNuevoPedido(orderDataForEmail);
      const tipoTag = esPedidoParcial ? 'Parcial' : 'Completo';

      if (archivosAdjuntos.length > 0) {
        setMensajePedido(`Procesando ${archivosAdjuntos.length} adjunto(s)...`);
      }
      const attachments = await prepararAdjuntosParaCorreo();

      setMensajePedido('Enviando correo...');
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
            bodyHtml: htmlBody,
            attachments,
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
      setMensajePedido('');
    }
  };

  const handleVolver = () => {
    navigate(role === 'comprador' ? '/compras' : '/vendedor');
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center font-black text-slate-400 animate-pulse uppercase tracking-widest">
      Cargando Detalle de Cotización...
    </div>
  );

  const itemsCotizadosCount = rfq?.productos?.filter(p => Number(p.fob || 0) > 0).length || 0;
  const totalProductosCount = rfq?.productos?.length || 0;
  const totalGeneralA = rfq?.productos?.reduce((acc, p) => {
    const fob = Number(p.fob || 0);
    if (fob <= 0) return acc;
    return acc + fob * (p.factorA || rfq?.factorA || 1) * (p.fva || 1.30) * Number(p.cant || 1);
  }, 0) || 0;
  const totalGeneralM = rfq?.productos?.reduce((acc, p) => {
    const fob = Number(p.fob || 0);
    if (fob <= 0) return acc;
    return acc + fob * (p.factorM || rfq?.factorM || 1.08) * (p.fvm || 1.25) * Number(p.cant || 1);
  }, 0) || 0;

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-52 md:pb-20">
      <div className="flex flex-row items-center justify-between gap-4 mb-4 md:mb-8">
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={handleVolver} className="p-1.5 md:p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600 shrink-0">
            <ChevronLeft size={24} className="hidden md:block" />
            <ChevronLeft size={20} className="md:hidden" />
          </button>
          <div>
            <h1 className="text-xl md:text-3xl font-black text-slate-800 italic uppercase tracking-tighter leading-none md:leading-normal">
              <span className="hidden md:inline">Detalle de Cotización</span>
              <span className="md:hidden">Cotización</span>
            </h1>
            <p className="text-slate-500 font-bold text-[10px] md:text-xs uppercase tracking-widest hidden md:block">
              Ref: {rfq?.correlativo} — Cliente: {rfq?.cliente} {rfq?.validez && `— Validez: ${rfq.validez}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {rfq?.estado !== 'Pendiente' && (
            <button 
              onClick={() => setVerPreview(true)}
              className="bg-slate-900 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 md:px-4 py-2 md:py-2.5 rounded-full hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10 cursor-pointer"
            >
              <Printer size={12} /> <span className="hidden md:inline">Ver Cotización / Imprimir</span><span className="md:hidden">Exportar</span>
            </button>
          )}
          {rfq?.estado?.includes('Parcial') && (
            <div className="bg-blue-600 text-white px-2 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5">
              <AlertCircle size={14} /> <span className="hidden md:inline">Cotización Parcial</span>
            </div>
          )}
          {pedidoYaCreado && (
            <div className="bg-emerald-600 text-white px-2 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5">
              <CheckCircle2 size={14} /> <span className="hidden md:inline">Pedido ya generado</span>
            </div>
          )}
        </div>
      </div>

      {/* Resumen Móvil (< md): Metadatos y Totales Cotizados */}
      <div className="md:hidden bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm mb-4 space-y-3">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-black text-base text-slate-900 tracking-tight">
              {rfq?.correlativo || '---'}
            </span>
            <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
              {itemsCotizadosCount} de {totalProductosCount} cotizados
            </span>
          </div>
          <p className="text-xs font-bold text-blue-700 uppercase mt-0.5">
            {rfq?.cliente || 'Sin cliente'}
          </p>
          {rfq?.validez && (
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Validez oferta: <strong className="text-slate-600">{rfq.validez}</strong>
            </p>
          )}
        </div>

        {totalGeneralA > 0 || totalGeneralM > 0 ? (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <div className="bg-emerald-50/60 rounded-xl p-2.5 border border-emerald-100 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Plane size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black text-emerald-600 uppercase block leading-none">Total Aéreo</span>
                <span className="font-mono font-black text-xs text-slate-900 tracking-tight block mt-0.5">
                  ${totalGeneralA.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="bg-blue-50/60 rounded-xl p-2.5 border border-blue-100 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Ship size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black text-blue-600 uppercase block leading-none">Total Marítimo</span>
                <span className="font-mono font-black text-xs text-slate-900 tracking-tight block mt-0.5">
                  ${totalGeneralM.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {!puedeConfirmarPedido && !pedidoYaCreado && (
        <div className="mb-4 md:mb-6 bg-blue-50/80 border border-blue-200/80 text-blue-900 rounded-xl md:rounded-2xl p-3 md:p-4 flex flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-blue-500 shrink-0" />
            <span className="hidden md:inline">
              <strong>Modo de solo lectura:</strong> Esta solicitud pertenece a <u>{rfq?.vendedorNombre || rfq?.vendedorEmail || 'otro vendedor'}</u>. Puedes revisar y auditar la cotización, pero solo el vendedor asignado puede confirmar y enviar el pedido.
            </span>
            <span className="md:hidden font-bold uppercase tracking-tight">
              Modo Solo Lectura
            </span>
          </div>
          <span className="text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-md bg-blue-100 text-blue-800 uppercase tracking-widest shrink-0 font-mono">
            Auditando
          </span>
        </div>
      )}

      {/* Vista Móvil (< md): Tarjetas de Productos */}
      <div className="md:hidden space-y-3.5 mb-8">
        {rfq?.productos?.map((p, idx) => {
          const fobVal = Number(p.fob || 0);
          const estaCotizado = fobVal > 0;
          const yaFuePedido = esItemYaPedido(p);
          const ventaA = fobVal * (p.factorA || rfq.factorA || 1) * (p.fva || 1.30);
          const ventaM = fobVal * (p.factorM || rfq.factorM || 1.08) * (p.fvm || 1.25);
          const isSelected = Boolean(seleccionados[idx]);

          return (
            <div
              key={idx}
              className={`bg-white rounded-2xl p-4 border transition-all relative touch-manipulation active:scale-[0.98] ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                  : yaFuePedido
                  ? 'border-emerald-200 shadow-sm'
                  : 'border-slate-100 hover:shadow-md hover:border-slate-200'
              } ${!estaCotizado ? 'opacity-70' : ''}`}
            >
              {/* Header: Checkbox (Izq) y Status (Der) */}
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {yaFuePedido ? (
                    <div className="w-6 h-6 rounded bg-emerald-500 text-white flex items-center justify-center shadow-xs" title="Ítem ya pedido">
                      <CheckCircle2 size={14} />
                    </div>
                  ) : estaCotizado ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!puedeConfirmarPedido) return;
                        setSeleccionados(prev => ({ ...prev, [idx]: !prev[idx] }));
                      }}
                      disabled={!puedeConfirmarPedido}
                      className={`w-6 h-6 rounded flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                      } ${!puedeConfirmarPedido ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                    </button>
                  ) : (
                    <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-300">
                      <Clock size={14} />
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {yaFuePedido ? (
                    <span className={`inline-flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest border ${(!p.modalidad || p.modalidad === 'Aéreo') ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-blue-50 text-blue-700 border-blue-200/60'}`}>
                      <CheckCircle2 size={12} className={(!p.modalidad || p.modalidad === 'Aéreo') ? 'text-emerald-500' : 'text-blue-500'} />
                      <span>Confirmado</span>
                      <span className={`border-l pl-1.5 flex items-center ${(!p.modalidad || p.modalidad === 'Aéreo') ? 'border-emerald-200/80' : 'border-blue-200/80'}`}>
                        {(!p.modalidad || p.modalidad === 'Aéreo') ? <Plane size={12} /> : <Ship size={12} />}
                      </span>
                    </span>
                  ) : !estaCotizado && (
                    (p.enConsulta || p.estadoItem === 'En consulta') ? (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-full font-black uppercase tracking-wide">
                        <MessageSquare size={10} className="shrink-0" />
                        <span>En Consulta</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-slate-50 text-slate-500 border border-slate-200/60 px-2 py-0.5 rounded-full font-black uppercase tracking-wide">
                        <Clock size={10} className="shrink-0" />
                        <span>Pendiente</span>
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Body: Product Details */}
              <div className="mb-3 pr-2">
                <h4 className="font-black text-sm text-slate-800 uppercase leading-snug line-clamp-2">
                  {p.descripcion || p.desc}
                </h4>
                <div className="flex items-center gap-1.5 mt-1.5 text-[10px]">
                  <span className="font-mono font-black text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    x{p.cant}
                  </span>
                  {p.marca && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="font-bold text-blue-700 uppercase truncate italic flex items-center gap-1">
                        <Tag size={10} /> {p.marca}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {estaCotizado && (
                <div className="pt-3 border-t border-slate-50 space-y-3">
                  {/* Precios Aéreo y Marítimo en grid de 2 columnas */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50/40 rounded-xl p-2.5 border border-emerald-100/60 flex flex-col justify-between h-full">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-700 uppercase">
                          <Plane size={11} className="text-emerald-500" /> Aéreo
                        </div>
                        <div className="text-[9px] text-emerald-600/70 font-bold flex items-center gap-1">
                          <Clock size={9}/> {p.entregaA} d
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-black text-emerald-950 leading-none">
                          ${(ventaA * p.cant).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[8px] font-bold text-emerald-700/60 uppercase mt-0.5">
                          ${ventaA.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ud
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50/40 rounded-xl p-2.5 border border-blue-100/60 flex flex-col justify-between h-full">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-700 uppercase">
                          <Ship size={11} className="text-blue-500" /> Marítimo
                        </div>
                        <div className="text-[9px] text-blue-600/70 font-bold flex items-center gap-1">
                          <Clock size={9}/> {p.entregaM} d
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-black text-blue-950 leading-none">
                          ${(ventaM * p.cant).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[8px] font-bold text-blue-700/60 uppercase mt-0.5">
                          ${ventaM.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ud
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Selector de Modalidad si está seleccionado */}
                  {isSelected && !yaFuePedido && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 mt-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Package size={12} className="text-slate-400" />
                        Modalidad:
                      </label>
                      <select
                        value={modalidades[idx]}
                        onChange={(e) => setModalidades(prev => ({ ...prev, [idx]: e.target.value }))}
                        disabled={!puedeConfirmarPedido}
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-black text-[10px] uppercase text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer shadow-xs"
                      >
                        <option value="A">Aéreo</option>
                        <option value="M">Marítimo</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Vista Escritorio (>= md): Tabla tradicional */}
      <div className="hidden md:block bg-white rounded-4xl shadow-2xl border border-slate-200 overflow-hidden mb-8">
        <div className="overflow-x-auto">
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
                        <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-sm" title="Ítem ya pedido previamente">
                          <CheckCircle2 size={16} />
                        </div>
                      ) : estaCotizado ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!puedeConfirmarPedido) return;
                            setSeleccionados(prev => ({ ...prev, [idx]: !prev[idx] }));
                          }}
                          disabled={!puedeConfirmarPedido}
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center mx-auto transition-all ${
                            seleccionados[idx]
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                              : 'border-slate-300 text-transparent hover:border-slate-400'
                          } ${!puedeConfirmarPedido ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center mx-auto text-slate-300">
                          <Clock size={14} />
                        </div>
                      )}
                    </td>
                    <td className="p-5">
                      <div className="font-black text-slate-800 uppercase leading-tight">{p.descripcion || p.desc}</div>
                      <div className="flex items-center gap-1 mt-1 text-blue-600 font-bold italic text-[10px]"><Tag size={10} /> {p.marca || 'N/A'}</div>
                      {yaFuePedido ? (
                        <span className={`inline-flex items-center gap-1.5 text-[8px] px-2 py-0.5 rounded-full font-black uppercase mt-2 tracking-widest ${(!p.modalidad || p.modalidad === 'Aéreo') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-blue-50 text-blue-700 border border-blue-200/60'}`}>
                          <CheckCircle2 size={10} className={(!p.modalidad || p.modalidad === 'Aéreo') ? 'text-emerald-500' : 'text-blue-500'} />
                          <span>Confirmado</span>
                          <span className={`border-l pl-1.5 flex items-center ${(!p.modalidad || p.modalidad === 'Aéreo') ? 'border-emerald-200/80' : 'border-blue-200/80'}`}>
                            {(!p.modalidad || p.modalidad === 'Aéreo') ? <Plane size={10} /> : <Ship size={10} />}
                          </span>
                        </span>
                      ) : !estaCotizado && (
                        (p.enConsulta || p.estadoItem === 'En consulta') ? (
                          <span className="inline-flex items-center gap-1 text-[8px] bg-amber-500 text-white px-2.5 py-0.5 rounded-full font-black uppercase mt-2 shadow-sm">
                            <MessageSquare size={10} />
                            <span>En Consulta con Proveedor</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[8px] bg-amber-100 text-amber-600 px-2.5 py-0.5 rounded-full font-black uppercase mt-2">
                            <Clock size={10} />
                            <span>Pendiente de Costeo</span>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <div className="bg-white rounded-2xl sm:rounded-[2.5rem] border border-slate-200 shadow-sm sm:shadow-xl overflow-hidden transition-all duration-300 self-start">
          <button 
            type="button" 
            onClick={() => setDocumentacionOpen(!documentacionOpen)}
            className="w-full p-4 sm:p-8 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors cursor-pointer text-left focus:outline-none"
          >
            <h2 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
              <LinkIcon size={18} className="text-emerald-500" /> Documentación Extra
            </h2>
            <div className={`transform transition-transform duration-300 text-slate-400 ${documentacionOpen ? 'rotate-180' : ''}`}>
              <ChevronDown size={20} />
            </div>
          </button>
          
          <div className={`grid transition-all duration-300 ease-in-out ${documentacionOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <div className="p-4 sm:p-8 pt-0 space-y-4 border-t border-slate-100 mt-2">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 italic">Enlace a Orden de Compra</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3.5 sm:p-4 text-base md:text-sm outline-none focus:border-emerald-500 transition-all font-bold text-slate-700"
                    placeholder="https://..."
                    value={linkOC}
                    onChange={(e) => setLinkOC(e.target.value)}
                    disabled={!puedeConfirmarPedido}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 italic">Comentarios del Pedido</label>
                  <textarea
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3.5 sm:p-4 text-base md:text-sm outline-none focus:border-emerald-500 transition-all font-bold text-slate-700"
                    rows="3"
                    placeholder="Notas adicionales para compras/logística..."
                    value={notasPedido}
                    onChange={(e) => setNotasPedido(e.target.value)}
                    disabled={!puedeConfirmarPedido}
                  />
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 italic">
                    Archivos Adjuntos
                    {archivosAdjuntos.length > 0 && (
                      <span className="ml-2 bg-emerald-500 text-white rounded-full px-1.5 py-0.5 text-[9px]">{archivosAdjuntos.length}</span>
                    )}
                  </label>
                  <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-wide transition-colors ${!puedeConfirmarPedido ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-emerald-600'}`}>
                    <Paperclip size={14} />
                    Adjuntar archivos
                    <input type="file" multiple className="sr-only" disabled={!puedeConfirmarPedido} onChange={handleAdjuntarArchivos} />
                  </label>
                  {archivosAdjuntos.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {archivosAdjuntos.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <FileText size={13} className="shrink-0 text-slate-400" />
                          <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{f.nombre}</span>
                          <span className="shrink-0 text-[9px] text-slate-400 font-bold">{(f.archivo.size / 1024).toFixed(0)} KB</span>
                          <button type="button" onClick={() => handleEliminarArchivo(i)} className="shrink-0 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {seraParcial && (
                    <p className="mt-2 text-[9px] font-bold text-amber-500 uppercase tracking-wide leading-relaxed">
                      ⚠ Pedido parcial — los adjuntos se envían solo en este correo y no quedan guardados en la solicitud.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className={`bg-white p-4 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-200 shadow-sm sm:shadow-xl flex-col justify-between ${puedeConfirmarPedido ? 'hidden md:flex' : 'flex'} self-start`}>
          <div className="flex-1">
            {/* Header del Resumen */}
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {pedidoYaCreado ? 'Resumen del pedido' : 'Items Seleccionados'}
              </span>
              <span className="text-lg font-black bg-slate-100 px-3 py-1 rounded-full text-slate-700">
                {pedidoYaCreado ? productosDelPedido.length : Object.values(seleccionados).filter(v => v).length}
              </span>
            </div>

            {/* Gran Total */}
            <div className="mb-6">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 italic">
                {pedidoYaCreado ? 'Total del pedido generado' : 'Inversión Total Cliente'}
              </p>
              <p className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight">
                ${totalPedidoActual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* Desglose Aéreo / Marítimo */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/80">
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Aéreo</span>
                <span className="font-mono text-sm font-black text-emerald-900">${desgloseVendedor.aereo.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100/80">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mb-1">Marítimo</span>
                <span className="font-mono text-sm font-black text-blue-900">${desgloseVendedor.maritimo.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {pedidoYaCreado && (
              <div className="space-y-4">
                {/* Meta data del pedido */}
                <div className="bg-slate-50/50 rounded-xl p-4 text-[10px] font-black uppercase tracking-widest space-y-3 border border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Estado</span>
                    <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md">Generado</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Ref. OC Cliente</span>
                    <span className="text-slate-700 normal-case font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{linkOC || rfq?.linkOC || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                    <span className="text-slate-400">OC Compras (Hermaco)</span>
                    <span className="text-blue-700 normal-case font-mono bg-blue-100 px-2.5 py-1 rounded-md">
                      {[...new Set((rfq?.productos || []).filter(p => p.numOC).map(p => p.numOC))].join(', ') || 'Pendiente'}
                    </span>
                  </div>
                </div>

                {/* Modalidad por ítem */}
                {/* Modalidad por ítem */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <button 
                    type="button"
                    onClick={() => setModalidadesOpen(!modalidadesOpen)}
                    className="w-full p-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors focus:outline-none"
                  >
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Modalidad por ítem</span>
                    <div className={`transform transition-transform duration-300 text-slate-400 ${modalidadesOpen ? 'rotate-180' : ''}`}>
                      <ChevronDown size={16} />
                    </div>
                  </button>
                  <div className={`grid transition-all duration-300 ease-in-out ${modalidadesOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <div className="p-1 border-t border-slate-200 bg-white max-h-48 overflow-y-auto">
                        {productosDelPedido.map((registro, i) => (
                          <div key={`${registro.idx}-${i}`} className="flex justify-between items-center gap-3 p-2 hover:bg-slate-50 transition-colors rounded-lg border-b border-slate-50 last:border-0">
                            <span className="truncate text-xs font-bold text-slate-700 normal-case">{registro.item?.descripcion || registro.item?.desc || `Ítem ${registro.idx + 1}`}</span>
                            <span className={`shrink-0 text-[9px] font-black uppercase px-2 py-1 rounded-md ${getTextoModalidad(registro.idx, registro.item) === 'Aéreo' ? 'bg-emerald-100 text-emerald-700' : getTextoModalidad(registro.idx, registro.item) === 'Marítimo' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                              {getTextoModalidad(registro.idx, registro.item)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={handleCrearPedido}
            disabled={enviandoPedido || !puedeConfirmarPedido}
            className="w-full mt-8 bg-emerald-500 hover:bg-emerald-600 text-white py-4 sm:py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={20} />
            {puedeConfirmarPedido
              ? (enviandoPedido ? (mensajePedido || 'GENERANDO...') : 'CONFIRMAR Y ENVIAR PEDIDO')
              : (pedidoYaCreado ? 'PEDIDO YA GENERADO' : 'SOLO VISUALIZACION')}
          </button>
        </div>
      </div>

      {/* Barra fija inferior en Móvil para confirmar pedido */}
      {puedeConfirmarPedido && (
        <div className="md:hidden">
          <StickyActionBar
            summary={
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                  {totalItemsSeleccionados} de {totalItemsSeleccionables} seleccionados
                </div>
                <div className="text-base font-black text-slate-900">
                  ${totalPedidoActual.toFixed(2)}
                </div>
              </div>
            }
            primaryAction={
              <button
                type="button"
                onClick={handleCrearPedido}
                disabled={enviandoPedido || totalItemsSeleccionados === 0}
                className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50 whitespace-nowrap"
              >
                <ShoppingCart size={16} />
                <span>{enviandoPedido ? (mensajePedido || 'Generando...') : 'Confirmar'}</span>
              </button>
            }
          />
        </div>
      )}

      {/* Modal de Vista Previa y Exportación */}
      {verPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-100 rounded-2xl sm:rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
            <div className="bg-slate-900 px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between text-white">
              <div>
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento Oficial</p>
                <h3 className="text-sm sm:text-lg font-black tracking-tight uppercase">Vista Previa de Cotización</h3>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
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
                  className="bg-emerald-500 hover:bg-emerald-600 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer min-h-[38px] sm:min-h-0"
                >
                  <Printer size={14} /> <span className="hidden xs:inline">Imprimir / </span>PDF
                </button>
                <button
                  type="button"
                  onClick={() => setVerPreview(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 sm:p-2.5 rounded-full transition-all cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center touch-manipulation"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-2 sm:p-8 overflow-y-auto flex-1 bg-slate-50">
              <div id="cotizacion-print-area" className="bg-white shadow-sm rounded-2xl sm:rounded-3xl p-1 overflow-x-auto">
                <CotizacionDocumento cotizacionData={rfq} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

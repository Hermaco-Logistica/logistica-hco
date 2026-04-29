import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  CheckSquare, Square, Link as LinkIcon, 
  ChevronDown, Package, DollarSign, Hash, ClipboardCheck, 
  Activity, Clock, Calendar, Truck, MapPin
} from 'lucide-react';
import { EventIcon, getStatusConfig, getStatusLabel } from '../../utils/trackingUi';

export const DashboardPedidos = ({ role }) => {
  const [itemsPedidos, setItemsPedidos] = useState([]);
  const [ordenesExistentes, setOrdenesExistentes] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [showAsignador, setShowAsignador] = useState(false);
  const [nuevaOC, setNuevaOC] = useState({ numero: '', proveedor: '' });
  const [trackingModal, setTrackingModal] = useState({
    open: false,
    loading: false,
    error: '',
    data: null,
    trackingNumber: '',
    rfqLabel: '',
  });

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

  const getLatestEvent = (payload) => {
    const events = Array.isArray(payload?.events) ? payload.events : [];
    if (!events.length) return null;
    return [...events].sort((a, b) => {
      const timeA = Date.parse(a?.timestamp || '') || 0;
      const timeB = Date.parse(b?.timestamp || '') || 0;
      return timeB - timeA;
    })[0];
  };

  const openTrackingModal = async (trackingNumber, rfqLabel) => {
    if (!trackingNumber) {
      setTrackingModal({
        open: true,
        loading: false,
        error: 'No hay tracking asociado',
        data: null,
        trackingNumber: '',
        rfqLabel,
      });
      return;
    }

    setTrackingModal({
      open: true,
      loading: true,
      error: '',
      data: null,
      trackingNumber,
      rfqLabel,
    });

    try {
      const cacheRef = doc(db, 'tracking_cache', trackingNumber);
      const cacheSnap = await getDoc(cacheRef);
      if (!cacheSnap.exists()) {
        setTrackingModal({
          open: true,
          loading: false,
          error: 'Sin respuesta de tracking guardada',
          data: null,
          trackingNumber,
          rfqLabel,
        });
        return;
      }

      const cacheData = cacheSnap.data();
      setTrackingModal({
        open: true,
        loading: false,
        error: '',
        data: cacheData?.payload || null,
        trackingNumber,
        rfqLabel,
      });
    } catch (error) {
      setTrackingModal({
        open: true,
        loading: false,
        error: 'No fue posible cargar el tracking',
        data: null,
        trackingNumber,
        rfqLabel,
      });
    }
  };

  const calcularCountdown = (fechaCompromiso, estadoLogistico) => {
    if (estadoLogistico === 'Recibido' || estadoLogistico === 'Entregado') return { dias: 0, label: 'COMPLETADO', color: 'text-emerald-500' };
    if (!fechaCompromiso || typeof fechaCompromiso !== 'string' || !fechaCompromiso.includes('/')) return { dias: '-', label: 'SIN FECHA', color: 'text-slate-300' };

    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const partes = fechaCompromiso.split('/');
      let dia, mes, anio;

      if (partes.length === 2) {
        // Soporte para formato DD/MM (asume año actual)
        dia = parseInt(partes[0], 10);
        mes = parseInt(partes[1], 10);
        anio = hoy.getFullYear();
      } else if (partes.length === 3) {
        // Soporte para formato DD/MM/YYYY
        dia = parseInt(partes[0], 10);
        mes = parseInt(partes[1], 10);
        anio = parseInt(partes[2], 10);
        if (anio < 100) anio += 2000;
      } else {
        return { dias: '!', label: 'FORMATO ERR', color: 'text-red-400' };
      }

      const compromiso = new Date(anio, mes - 1, dia);
      compromiso.setHours(0, 0, 0, 0);

      if (isNaN(compromiso.getTime())) return { dias: '!', label: 'FECHA INVÁLIDA', color: 'text-red-400' };

      const diferenciaMs = compromiso.getTime() - hoy.getTime();
      const diasRestantes = Math.round(diferenciaMs / (1000 * 60 * 60 * 24));

      if (diasRestantes < 0) return { dias: Math.abs(diasRestantes), label: 'RETRASO DÍAS', color: 'text-red-500' };
      return { dias: diasRestantes, label: 'DÍAS RESTANTES', color: 'text-blue-500' };
    } catch (e) {
      return { dias: '?', label: 'ERROR', color: 'text-red-500' };
    }
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
              const ocDetalle = ordenesExistentes.find(o => o.numeroOC === item.numOC);
              const trackingNumber = ocDetalle?.tracking || '';
              const rfqLabel = `# ${item.correlativo} — ${item.cliente}`;
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
                    <button
                      type="button"
                      onClick={() => openTrackingModal(trackingNumber, rfqLabel)}
                      disabled={!trackingNumber}
                      title={trackingNumber ? 'Ver detalle de tracking' : 'Sin tracking asociado'}
                      className={`inline-flex flex-col px-3 py-1.5 rounded-xl border ${ocInfo.color} border-current bg-opacity-10 w-full max-w-[140px] ${trackingNumber ? 'hover:opacity-90' : 'cursor-not-allowed opacity-60'}`}
                    >
                      <span className="text-[9px] font-black uppercase text-center">{ocInfo.label}</span>
                      <span className="text-[7px] font-bold opacity-70 text-center mt-0.5 tracking-tighter">MOD: {ocInfo.mod}</span>
                    </button>
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

      {trackingModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Detalle de tracking</p>
                <p className="text-sm font-black text-slate-800">
                  {role === 'comprador'
                    ? (trackingModal.trackingNumber || '--')
                    : (trackingModal.rfqLabel || '--')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTrackingModal({
                  open: false,
                  loading: false,
                  error: '',
                  data: null,
                  trackingNumber: '',
                  rfqLabel: '',
                })}
                className="text-xs font-black uppercase text-slate-400 hover:text-slate-800"
              >
                Cerrar
              </button>
            </div>

            <div className="p-6">
              {trackingModal.loading && (
                <p className="text-xs font-black text-slate-400 uppercase">Cargando...</p>
              )}

              {!trackingModal.loading && trackingModal.error && (
                <p className="text-xs font-black text-rose-600 uppercase">{trackingModal.error}</p>
              )}

              {!trackingModal.loading && trackingModal.data && (() => {
                const latestEvent = getLatestEvent(trackingModal.data);
                const eventCode = latestEvent?.status || latestEvent?.statusCode;
                const label = getStatusLabel(eventCode);
                const statusCfg = getStatusConfig(eventCode);
                const location = latestEvent?.location?.address?.addressLocality;
                const country = latestEvent?.location?.address?.countryCode;
                const locacion = [location, country].filter(Boolean).join(' - ') || '--';

                return (
                  <div className={`rounded-2xl border ${statusCfg.card} p-4`}>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-xl border border-slate-100">
                        <EventIcon code={eventCode} size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-xs font-black text-slate-800 uppercase">
                            {latestEvent?.description || 'Sin detalle'}
                          </p>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${statusCfg.badge}`}>
                            {label}
                          </span>
                        </div>
                        <div className="mt-2 text-[10px] font-bold text-slate-500 flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin size={11} /> {locacion}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {latestEvent?.timestamp ? formatFechaHora(new Date(latestEvent.timestamp)) : '--'}
                          </span>
                        </div>
                        <p className="mt-2 text-[9px] font-bold text-slate-400 uppercase">Codigo DHL: {eventCode || '--'}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
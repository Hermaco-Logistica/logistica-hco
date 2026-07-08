import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc, query, where } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { 
  CheckSquare, Square, Link as LinkIcon, 
  ChevronDown, Package, DollarSign, Hash, ClipboardCheck, 
  Activity, Calendar, Truck
} from 'lucide-react';
import { ShipmentTrackerCompact } from '../../components/ShipmentTracker';
import { consultarTrackingStatus, trackingStatusEnabled } from '../../services/trackingStatusService';
import {
  buscarProveedoresGuardados,
  guardarProveedorSiNoExiste,
  normalizarNombreProveedor,
} from '../../services/proveedoresService';

export const DashboardPedidos = ({ role }) => {
  const [itemsPedidos, setItemsPedidos] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [ordenesExistentes, setOrdenesExistentes] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [showAsignador, setShowAsignador] = useState(false);
  const [nuevaOC, setNuevaOC] = useState({ numero: '', proveedor: '' });
  const [sugerenciasProveedor, setSugerenciasProveedor] = useState([]);
  const [indiceSugerenciaProveedor, setIndiceSugerenciaProveedor] = useState(-1);
  const [buscandoProveedor, setBuscandoProveedor] = useState(false);
  const [errorProveedor, setErrorProveedor] = useState('');
  const [mostrarSugerenciasProveedor, setMostrarSugerenciasProveedor] = useState(false);
  const debounceProveedorRef = useRef(null);
  const [trackingModal, setTrackingModal] = useState({
    open: false,
    loading: false,
    error: '',
    data: null,
    trackingNumber: '',
    rfqLabel: '',
  });
  const [trackingNotice, setTrackingNotice] = useState('');

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

    const solicitudesQuery = role === 'vendedor'
      ? query(collection(db, "solicitudes"), where("vendedorId", "==", auth.currentUser?.uid || ''))
      : collection(db, "solicitudes");

    const unsubSolicitudes = onSnapshot(solicitudesQuery, (snap) => {
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
                fechaPedido: data.fechaPedido || null,
                fechaReferencia: data.fechaPedido || data.fechaCreacion || data.fechaCotizacion || null,
                fobReal: p.fobReal || p.fob || 0,
                fechaCompromiso: p.fechaCompromiso, 
                diasPrometidos: p.diasPrometidos
              });
            }
          });
        }
      });
      tempItems.sort((a, b) => {
        const getMs = (val) => {
          if (!val) return 0;
          if (typeof val === 'object') {
            if (typeof val.toDate === 'function') {
              try { return val.toDate().getTime(); } catch(e) {}
            }
            if (typeof val.seconds === 'number') {
              return val.seconds * 1000;
            }
          }
          const ms = Date.parse(val);
          return isNaN(ms) ? 0 : ms;
        };
        return getMs(b.fechaReferencia) - getMs(a.fechaReferencia);
      });
      setItemsPedidos(tempItems);
      setCurrentPage(1);
    });

    return () => { unsubOCs(); unsubSolicitudes(); };
  }, [role, auth.currentUser?.uid]);

  useEffect(() => {
    const termino = normalizarNombreProveedor(nuevaOC.proveedor);

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
  }, [nuevaOC.proveedor]);

  const seleccionarSugerenciaProveedor = (nombre) => {
    setNuevaOC((prev) => ({ ...prev, proveedor: nombre || '' }));
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

  const toggleSeleccion = (uId) => {
    setSeleccionados(prev => prev.includes(uId) ? prev.filter(i => i !== uId) : [...prev, uId]);
  };

  const handleFobChange = (uId, valor) => {
    setItemsPedidos(prev => prev.map(item => 
      `${item.idRFQ}-${item.indexOriginal}` === uId ? { ...item, fobReal: valor } : item
    ));
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
      setTrackingNotice('');
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
    setTrackingNotice('');

    try {
      if (role === 'vendedor' && trackingStatusEnabled) {
        const freshData = await consultarTrackingStatus(trackingNumber);
        setTrackingModal({
          open: true,
          loading: false,
          error: '',
          data: freshData || null,
          trackingNumber,
          rfqLabel,
        });
        if (freshData?.rateLimited) {
          setTrackingNotice('Mostrando ultimo dato guardado. Podras actualizar en unos minutos.');
        } else if (freshData?.stale) {
          setTrackingNotice('Actualizando, mostrando ultimo dato guardado.');
        }
        return;
      }

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
        setTrackingNotice('');
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
      setTrackingNotice('');
    } catch (error) {
      setTrackingModal({
        open: true,
        loading: false,
        error: 'No fue posible cargar el tracking',
        data: null,
        trackingNumber,
        rfqLabel,
      });
      setTrackingNotice('');
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
      await guardarProveedorSiNoExiste(provOC, auth.currentUser);
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

  const itemsPerPage = 10;
  const totalPages = Math.ceil(itemsPedidos.length / itemsPerPage);
  const paginatedItems = itemsPedidos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="PROVEEDOR"
                    className="w-full bg-slate-800 border-none p-4 rounded-xl text-white text-xs font-bold"
                    value={nuevaOC.proveedor}
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
                    onChange={(e) => setNuevaOC({ ...nuevaOC, proveedor: e.target.value.toUpperCase() })}
                  />

                  {mostrarSugerenciasProveedor && nuevaOC.proveedor.trim().length >= 2 && (
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
              <th className="p-6 text-center">Confirmado</th>
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
            {paginatedItems.map((item) => {
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
                  <td className="p-6 text-center">
                    <span className="text-[10px] font-bold text-slate-500">
                      {formatFechaHora(item.fechaPedido) || '--'}
                    </span>
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

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 px-6 py-4 bg-slate-900 rounded-[1.5rem] text-white">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all"
          >
            Anterior
          </button>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
            Página {currentPage} de {totalPages} ({itemsPedidos.length} ítems)
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all"
          >
            Siguiente
          </button>
        </div>
      )}

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
              {trackingNotice && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold uppercase text-amber-700">
                  {trackingNotice}
                </div>
              )}
              {trackingModal.loading && (
                <p className="text-xs font-black text-slate-400 uppercase">Cargando...</p>
              )}

              {!trackingModal.loading && trackingModal.error && (
                <p className="text-xs font-black text-rose-600 uppercase">{trackingModal.error}</p>
              )}

              {!trackingModal.loading && trackingModal.data && (
                <ShipmentTrackerCompact shipmentData={trackingModal.data} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
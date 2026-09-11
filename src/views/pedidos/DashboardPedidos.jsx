import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc, query, where } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { 
  CheckSquare, Square, Link as LinkIcon, 
  ChevronDown, ChevronUp, ChevronRight, Package, DollarSign, Hash, ClipboardCheck, 
  Activity, Calendar, Truck, Trash2, Filter, Clock
} from 'lucide-react';
import { MobileListCard, MobileBadge } from '../../components/mobile';
import { TrackingModal } from '../../components/TrackingModal';
import { consultarTrackingStatus, trackingStatusEnabled } from '../../services/trackingStatusService';
import {
  buscarProveedoresGuardados,
  guardarProveedorSiNoExiste,
  normalizarNombreProveedor,
} from '../../services/proveedoresService';
import { normalizarBusqueda } from '../../utils/normalizers';
import { usePersistedState } from '../../hooks/usePersistedState';
import { generarPlantillaOCAsignada } from '../../utils/emailTemplates';
import { interpretarEstadoLogistico } from '../../utils/interpretarEstadoLogistico';

export const DashboardPedidos = ({ role }) => {
  const puedeVerNumeroGuia = role === 'comprador' || role === 'administrador';
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

  // Estados para filtros (persistidos en localStorage)
  const [searchItemRef, setSearchItemRef] = usePersistedState('dp_searchItemRef', '');
  const [filterProveedor, setFilterProveedor] = usePersistedState('dp_filterProveedor', '');
  const [filterEstadoLogistico, setFilterEstadoLogistico] = usePersistedState('dp_filterEstadoLogistico', '');
  const [searchOCRef, setSearchOCRef] = usePersistedState('dp_searchOCRef', '');
  const [sortCompra, setSortCompra] = usePersistedState('dp_sortCompra', '');
  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState(false);

  // Estados del calendario popover de fecha confirmado
  const [fechaConfirmadoInicio, setFechaConfirmadoInicio] = useState(null);
  const [fechaConfirmadoFin, setFechaConfirmadoFin] = useState(null);
  const [mostrarCalendarioConfirmado, setMostrarCalendarioConfirmado] = useState(false);
  const [mesActualConfirmado, setMesActualConfirmado] = useState(new Date());
  const refCalendarioConfirmado = useRef(null);

  // Cerrar popover al hacer clic fuera
  useEffect(() => {
    const clickFuera = (e) => {
      if (refCalendarioConfirmado.current && !refCalendarioConfirmado.current.contains(e.target)) {
        setMostrarCalendarioConfirmado(false);
      }
    };
    document.addEventListener('mousedown', clickFuera);
    return () => document.removeEventListener('mousedown', clickFuera);
  }, []);

  const handleSortCycle = () => {
    setSortCompra((current) => {
      if (current === '') return 'comprado_first';
      if (current === 'comprado_first') return 'pendiente_first';
      return '';
    });
  };

  const getSortIcon = () => {
    if (sortCompra === 'comprado_first') return ' ↑(Ord)';
    if (sortCompra === 'pendiente_first') return ' ↓(Pend)';
    return ' ↕';
  };

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
        if (data.productos && (data.estado === 'Pedido' || data.estado === 'Pedido Parcial' || data.estado === 'Comprado')) {
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
                diasPrometidos: p.diasPrometidos,
                vendedorEmail: data.vendedorEmail || '',
                vendedorNombre: data.vendedorNombre || '',
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
              try { return val.toDate().getTime(); } catch { return 0; }
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
    });

    return () => { unsubOCs(); unsubSolicitudes(); };
  }, [role]);

  useEffect(() => {
    const termino = normalizarNombreProveedor(nuevaOC.proveedor);

    if (debounceProveedorRef.current) clearTimeout(debounceProveedorRef.current);

    if (termino.length < 2) {
      debounceProveedorRef.current = setTimeout(() => {
        setSugerenciasProveedor([]);
        setIndiceSugerenciaProveedor(-1);
        setBuscandoProveedor(false);
        setErrorProveedor('');
      }, 0);
      return;
    }

    debounceProveedorRef.current = setTimeout(async () => {
      try {
        setBuscandoProveedor(true);
        setErrorProveedor('');
        const resultados = await buscarProveedoresGuardados(termino);
        setSugerenciasProveedor(resultados);
        setIndiceSugerenciaProveedor(resultados.length > 0 ? 0 : -1);
      } catch {
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

  const openTrackingModal = async (trackingNumber, rfqLabel, ocId = null, estadoActual = 'Pedido', fechaCambioManual = null) => {
    const cleanNumber = String(trackingNumber || '').trim().toUpperCase();
    if (!cleanNumber) {
      setTrackingModal({
        open: true,
        loading: false,
        error: 'No hay tracking asociado',
        data: null,
        trackingNumber: '',
        rfqLabel,
        ocEstado: estadoActual,
        fechaUltimoEstado: fechaCambioManual,
      });
      setTrackingNotice('');
      return;
    }

    setTrackingModal({
      open: true,
      loading: true,
      error: '',
      data: null,
      trackingNumber: cleanNumber,
      rfqLabel,
      ocEstado: estadoActual,
      fechaUltimoEstado: fechaCambioManual,
    });
    setTrackingNotice('');

    try {
      let freshData = null;
      if (trackingStatusEnabled) {
        freshData = await consultarTrackingStatus(cleanNumber);
      } else {
        const cacheRef = doc(db, 'tracking_cache', cleanNumber);
        const cacheSnap = await getDoc(cacheRef);
        if (cacheSnap.exists()) {
          freshData = cacheSnap.data()?.payload || null;
        }
      }

      setTrackingModal({
        open: true,
        loading: false,
        error: freshData ? '' : 'Sin respuesta de tracking guardada',
        data: freshData,
        trackingNumber: cleanNumber,
        rfqLabel,
        ocEstado: estadoActual,
        fechaUltimoEstado: fechaCambioManual,
      });

      if (freshData?.rateLimited) {
        setTrackingNotice('Mostrando ultimo dato guardado. Podras actualizar en unos minutos.');
      } else if (freshData?.stale) {
        setTrackingNotice('Actualizando, mostrando ultimo dato guardado.');
      }

      if (freshData && ocId) {
        const estadoNuevo = interpretarEstadoLogistico(freshData, estadoActual);
        if (estadoNuevo !== estadoActual) {
          await updateDoc(doc(db, 'ordenesCompra', ocId), {
            estado: estadoNuevo,
            ultimaActualizacion: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      console.error("Error consultando tracking en modal:", err);
      // Fallback a Firestore directo en caso de error
      try {
        const cacheRef = doc(db, 'tracking_cache', cleanNumber);
        const cacheSnap = await getDoc(cacheRef);
        if (cacheSnap.exists()) {
          const fallbackData = cacheSnap.data()?.payload || null;
          setTrackingModal({
            open: true,
            loading: false,
            error: '',
            data: fallbackData,
            trackingNumber: cleanNumber,
            rfqLabel,
            ocEstado: estadoActual,
            fechaUltimoEstado: fechaCambioManual,
          });
          if (fallbackData && ocId) {
            const estadoNuevo = interpretarEstadoLogistico(fallbackData, estadoActual);
            if (estadoNuevo !== estadoActual) {
              await updateDoc(doc(db, 'ordenesCompra', ocId), {
                estado: estadoNuevo,
                ultimaActualizacion: serverTimestamp(),
              });
            }
          }
          return;
        }
      } catch { /* ignorado */ }

      setTrackingModal({
        open: true,
        loading: false,
        error: 'No se pudo obtener la informacion de tracking',
        data: null,
        trackingNumber: cleanNumber,
        rfqLabel,
        ocEstado: estadoActual,
        fechaUltimoEstado: fechaCambioManual,
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
    } catch {
      return { dias: '?', label: 'ERROR', color: 'text-red-500' };
    }
  };

  const getInfoOC = (numOC) => {
    const oc = ordenesExistentes.find(o => o.numeroOC === numOC);
    if (!oc) {
      return {
        label: 'Por Procesar',
        prov: 'Pendiente',
        mod: '-',
        rawEstado: 'Pendiente',
        dotColor: 'bg-slate-300',
        activeClass: 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80',
        disabledClass: 'bg-slate-50/50 border-slate-200/60 text-slate-400',
      };
    }

    const fechaMod = oc.fechaUltimoEstado || oc.ultimaActualizacion;
    const ultimaMod = fechaMod ? formatFechaHora(fechaMod) : 'Sin cambios';
    const configEstados = {
      'Pedido': {
        label: 'OC Generada',
        dotColor: 'bg-blue-500',
        activeClass: 'bg-blue-50/60 border-blue-200/70 text-blue-700 hover:bg-blue-100/80 hover:border-blue-300 shadow-xs shadow-blue-500/5',
        disabledClass: 'bg-slate-50/60 border-slate-200/70 text-slate-400',
      },
      'Tránsito': {
        label: 'En Tránsito',
        dotColor: 'bg-indigo-500',
        activeClass: 'bg-indigo-50/60 border-indigo-200/70 text-indigo-700 hover:bg-indigo-100/80 hover:border-indigo-300 shadow-xs shadow-indigo-500/5',
        disabledClass: 'bg-slate-50/60 border-slate-200/70 text-slate-400',
      },
      'En Tránsito': {
        label: 'En Tránsito',
        dotColor: 'bg-indigo-500',
        activeClass: 'bg-indigo-50/60 border-indigo-200/70 text-indigo-700 hover:bg-indigo-100/80 hover:border-indigo-300 shadow-xs shadow-indigo-500/5',
        disabledClass: 'bg-slate-50/60 border-slate-200/70 text-slate-400',
      },
      'Aduana': {
        label: 'En Aduana',
        dotColor: 'bg-amber-500',
        activeClass: 'bg-amber-50/60 border-amber-200/70 text-amber-700 hover:bg-amber-100/80 hover:border-amber-300 shadow-xs shadow-amber-500/5',
        disabledClass: 'bg-slate-50/60 border-slate-200/70 text-slate-400',
      },
      'Recibido': {
        label: 'Recibido (Almacén)',
        dotColor: 'bg-emerald-500',
        activeClass: 'bg-emerald-50/60 border-emerald-200/70 text-emerald-700 hover:bg-emerald-100/80 hover:border-emerald-300 shadow-xs shadow-emerald-500/5',
        disabledClass: 'bg-slate-50/60 border-slate-200/70 text-slate-400',
      },
      'Entregado': {
        label: 'Entregado Cliente',
        dotColor: 'bg-slate-900',
        activeClass: 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800 shadow-xs shadow-slate-900/10',
        disabledClass: 'bg-slate-100 border-slate-200 text-slate-400',
      },
    };

    const cfg = configEstados[oc.estado] || {
      label: oc.estado || 'Actualización',
      dotColor: 'bg-slate-400',
      activeClass: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100',
      disabledClass: 'bg-slate-50/50 border-slate-200 text-slate-400',
    };

    return {
      ...cfg,
      color: cfg.activeClass,
      prov: oc.proveedor,
      mod: ultimaMod,
      rawEstado: oc.estado,
    };
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
            fobReal: Number(item.fobReal),
            fechaOC: serverTimestamp()
          };
          await updateDoc(rfqRef, { productos: productosActualizados });
        }
      }

      // ── Correos por vendedor ──────────────────────────────────────────────
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const CC_FIJOS = ['compras@hermaco.net', 'chernandez@hermaco.net', 'fsalinas@hermaco.net', 'oventura@hermaco.net'];

      // Agrupar items por vendedorEmail
      const porVendedor = itemsAProcesar.reduce((acc, item) => {
        const email = item.vendedorEmail || 'sin-email';
        if (!acc[email]) acc[email] = { nombre: item.vendedorNombre || email.split('@')[0], items: [] };
        acc[email].items.push(item);
        return acc;
      }, {});

      await Promise.allSettled(
        Object.entries(porVendedor).map(async ([vendEmail, { items: itemsV }]) => {
          const to = isLocal ? ['rvides@hermaco.net'] : [vendEmail].filter(Boolean);
          const cc = isLocal ? ['rvides@hermaco.net'] : CC_FIJOS;
          if (!to.length || to[0] === 'sin-email') return;

          try {
            await fetch('/.netlify/functions/send-email-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: isLocal ? 'rvides@hermaco.net <rvides@hermaco.net>' : 'compras@hermaco.net <compras@hermaco.net>',
                to,
                cc,
                subject: `OC Asignada ${numOC} — Tus productos ya tienen orden de compra`,
                bodyHtml: generarPlantillaOCAsignada({ numOC, itemsVendedor: itemsV }),
              }),
            });
          } catch (e) {
            console.error(`Error enviando correo a ${vendEmail}:`, e);
          }
        })
      );
      // ─────────────────────────────────────────────────────────────────────

      alert(`Éxito: Items vinculados a la OC ${numOC}`);
      setSeleccionados([]);
      setShowAsignador(false);
    } catch (error) { console.error(error); }
  };

  // Helpers para obtener proveedores y estados lógicos únicos disponibles
  const proveedoresDisponibles = Array.from(new Set(itemsPedidos.map(item => {
    const ocInfo = getInfoOC(item.numOC);
    return ocInfo.prov;
  }).filter(p => p && p !== 'Pendiente')));

  const estadosLogicosDisponibles = ['Por Procesar', 'OC Generada', 'En Tránsito', 'En Aduana', 'Recibido (Almacén)', 'Entregado Cliente'];

  // Calendario popover helpers
  const handleSelectDiaConfirmado = (diaDate) => {
    setCurrentPage(1);
    if (!fechaConfirmadoInicio || (fechaConfirmadoInicio && fechaConfirmadoFin)) {
      setFechaConfirmadoInicio(diaDate);
      setFechaConfirmadoFin(null);
    } else if (fechaConfirmadoInicio && !fechaConfirmadoFin) {
      if (diaDate < fechaConfirmadoInicio) {
        setFechaConfirmadoInicio(diaDate);
      } else {
        setFechaConfirmadoFin(diaDate);
        setMostrarCalendarioConfirmado(false);
      }
    }
  };

  const getDiasDelMesConfirmado = () => {
    const año = mesActualConfirmado.getFullYear();
    const mes = mesActualConfirmado.getMonth();
    const primerDiaSemana = new Date(año, mes, 1).getDay();
    const totalDias = new Date(año, mes + 1, 0).getDate();
    const dias = [];
    for (let i = 0; i < primerDiaSemana; i++) dias.push(null);
    for (let i = 1; i <= totalDias; i++) dias.push(new Date(año, mes, i));
    return dias;
  };

  const cambiarMesConfirmado = (offset) => {
    setMesActualConfirmado(new Date(mesActualConfirmado.getFullYear(), mesActualConfirmado.getMonth() + offset, 1));
  };

  const formattedRangoConfirmadoText = () => {
    if (!fechaConfirmadoInicio) return 'Elegir Rango / Día';
    const opt = { day: '2-digit', month: 'short' };
    const iniStr = fechaConfirmadoInicio.toLocaleDateString('es-ES', opt);
    if (!fechaConfirmadoFin) return iniStr;
    return `${iniStr} - ${fechaConfirmadoFin.toLocaleDateString('es-ES', opt)}`;
  };

  // Filtrado de items
  const filteredItems = itemsPedidos.filter(item => {
    const ocInfo = getInfoOC(item.numOC);

    // Buscar Item / Referencia / Cliente
    if (searchItemRef) {
      const termNormalized = normalizarBusqueda(searchItemRef);
      if (termNormalized) {
        const matchDesc = normalizarBusqueda(item.descripcion || item.desc).includes(termNormalized);
        const matchCorrelativo = normalizarBusqueda(item.correlativo).includes(termNormalized);
        const matchCliente = normalizarBusqueda(item.cliente).includes(termNormalized);
        const matchMarca = normalizarBusqueda(item.marca).includes(termNormalized);
        if (!matchDesc && !matchCorrelativo && !matchCliente && !matchMarca) return false;
      }
    }

    // Filtrar por proveedor
    if (filterProveedor && ocInfo.prov !== filterProveedor) return false;

    // Filtrar por estado logístico
    if (filterEstadoLogistico && ocInfo.label !== filterEstadoLogistico) return false;

    // Buscar OC Ref
    if (searchOCRef) {
      const term = searchOCRef.toLowerCase();
      const matchOC = (item.numOC || '').toLowerCase().includes(term);
      if (!matchOC) return false;
    }

    // Rango de Fecha Confirmado (fechaPedido)
    if (fechaConfirmadoInicio || fechaConfirmadoFin) {
      if (!item.fechaPedido) return false;
      const dateConfirmado = item.fechaPedido.toDate ? item.fechaPedido.toDate() : new Date(item.fechaPedido);
      const dComp = new Date(dateConfirmado.getFullYear(), dateConfirmado.getMonth(), dateConfirmado.getDate());

      if (fechaConfirmadoInicio) {
        const dIni = new Date(fechaConfirmadoInicio.getFullYear(), fechaConfirmadoInicio.getMonth(), fechaConfirmadoInicio.getDate());
        if (dComp < dIni) return false;
      }
      if (fechaConfirmadoFin) {
        const dFin = new Date(fechaConfirmadoFin.getFullYear(), fechaConfirmadoFin.getMonth(), fechaConfirmadoFin.getDate());
        if (dComp > dFin) return false;
      }
    }

    return true;
  });

  if (sortCompra === 'comprado_first') {
    filteredItems.sort((a, b) => (!!b.numOC) - (!!a.numOC));
  } else if (sortCompra === 'pendiente_first') {
    filteredItems.sort((a, b) => (!!a.numOC) - (!!b.numOC));
  }

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

  const filtrosActivosCount = [
    searchOCRef,
    filterProveedor,
    filterEstadoLogistico,
    (fechaConfirmadoInicio || fechaConfirmadoFin)
  ].filter(Boolean).length;

  return (
    <div className="max-w-400 mx-auto animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-800 italic uppercase tracking-tighter">
            Seguimiento de Pedidos <span className="text-emerald-500">.</span>
          </h1>
          <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.3em]">
            Vista: {role === 'vendedor' ? 'Ventas y Tiempos' : 'Compras y Logística'}
          </p>
        </div>
        {role === 'comprador' && seleccionados.length > 0 && (
           <button 
             onClick={() => setShowAsignador(!showAsignador)} 
             className="hidden md:flex justify-center bg-emerald-500 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 items-center gap-3 active:scale-95 transition-all cursor-pointer"
           >
             <LinkIcon size={16} /> Vincular Selección ({seleccionados.length})
           </button>
        )}
      </div>

      {/* BARRA DE FILTROS MÓVIL (visible en < md) */}
      <div className="md:hidden bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="Buscar ítem, ref, cliente..." 
              value={searchItemRef}
              onChange={(e) => { setSearchItemRef(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-slate-400 text-slate-700"
            />
          </div>
          <button
            type="button"
            onClick={() => setMostrarFiltrosMobile(!mostrarFiltrosMobile)}
            className={`flex items-center gap-1 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
              filtrosActivosCount > 0 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <Filter size={14} />
            <span>Filtros{filtrosActivosCount > 0 ? ` (${filtrosActivosCount})` : ''}</span>
            {mostrarFiltrosMobile ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {(searchItemRef || filtrosActivosCount > 0) && (
            <button
              onClick={() => {
                setSearchItemRef('');
                setFilterProveedor('');
                setFilterEstadoLogistico('');
                setSearchOCRef('');
                setFechaConfirmadoInicio(null);
                setFechaConfirmadoFin(null);
                setSortCompra('');
                setCurrentPage(1);
              }}
              title="Limpiar filtros"
              className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {mostrarFiltrosMobile && (
          <div className="pt-3 border-t border-slate-100 space-y-2.5 animate-in fade-in duration-200">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Buscar por N° OC</label>
              <input 
                type="text" 
                placeholder="N° de OC..." 
                value={searchOCRef}
                onChange={(e) => { setSearchOCRef(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700"
              />
            </div>
            {(role === 'comprador' || role === 'administrador') && (
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Proveedor</label>
                <select 
                  value={filterProveedor} 
                  onChange={(e) => { setFilterProveedor(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="">TODOS LOS PROVEEDORES</option>
                  {proveedoresDisponibles.map(prov => (
                    <option key={prov} value={prov}>{prov.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Estado Logístico</label>
              <select 
                value={filterEstadoLogistico} 
                onChange={(e) => { setFilterEstadoLogistico(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="">TODOS LOS ESTADOS</option>
                {estadosLogicosDisponibles.map(est => (
                  <option key={est} value={est}>{est.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Fecha Confirmado</label>
              <div 
                className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold cursor-pointer text-slate-700" 
                onClick={() => setMostrarCalendarioConfirmado(!mostrarCalendarioConfirmado)}
              >
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <span className="truncate flex-1 select-none">{formattedRangoConfirmadoText()}</span>
                {(fechaConfirmadoInicio || fechaConfirmadoFin) && (
                  <button onClick={(e) => { e.stopPropagation(); setFechaConfirmadoInicio(null); setFechaConfirmadoFin(null); setCurrentPage(1); }} className="hover:text-red-500 font-bold p-0.5">&times;</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PANEL DE FILTROS DESKTOP (visible en >= md) */}
      <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 mb-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Buscar (Ítem / Ref / Cliente)</label>
          <input 
            type="text" 
            placeholder="Escribe para buscar..." 
            value={searchItemRef}
            onChange={(e) => { setSearchItemRef(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none focus:border-slate-300 transition-all text-slate-700"
          />
        </div>
        {(role === 'comprador' || role === 'administrador') && (
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Proveedor</label>
            <select 
              value={filterProveedor} 
              onChange={(e) => { setFilterProveedor(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none focus:border-slate-300 transition-all text-slate-700 cursor-pointer"
            >
              <option value="">TODOS LOS PROVEEDORES</option>
              {proveedoresDisponibles.map(prov => (
                <option key={prov} value={prov}>{prov.toUpperCase()}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Estado Logístico</label>
          <select 
            value={filterEstadoLogistico} 
            onChange={(e) => { setFilterEstadoLogistico(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none focus:border-slate-300 transition-all text-slate-700 cursor-pointer"
          >
            <option value="">TODOS LOS ESTADOS</option>
            {estadosLogicosDisponibles.map(est => (
              <option key={est} value={est}>{est.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Buscar por N° OC</label>
          <input 
            type="text" 
            placeholder="N° de OC..." 
            value={searchOCRef}
            onChange={(e) => { setSearchOCRef(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none focus:border-slate-300 transition-all text-slate-700"
          />
        </div>

        {/* Rango de Fecha Confirmación Calendario Popover */}
        <div className="relative" ref={refCalendarioConfirmado}>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Fecha Confirmado</label>
          <div className="flex items-center gap-1 bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold cursor-pointer text-slate-700" onClick={() => setMostrarCalendarioConfirmado(!mostrarCalendarioConfirmado)}>
            <Calendar size={14} className="text-slate-400 shrink-0" />
            <span className="truncate flex-1 select-none">{formattedRangoConfirmadoText()}</span>
            {(fechaConfirmadoInicio || fechaConfirmadoFin) && (
              <button onClick={(e) => { e.stopPropagation(); setFechaConfirmadoInicio(null); setFechaConfirmadoFin(null); setCurrentPage(1); }} className="hover:text-red-500 font-bold p-0.5">&times;</button>
            )}
          </div>

          {mostrarCalendarioConfirmado && (
            <div className="absolute right-0 mt-2 z-30 bg-white border border-slate-200 shadow-2xl rounded-3xl p-5 w-72 animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between mb-4">
                <button type="button" onClick={() => cambiarMesConfirmado(-1)} className="hover:bg-slate-100 p-1.5 rounded-lg font-black text-slate-600">&lt;</button>
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  {mesActualConfirmado.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
                <button type="button" onClick={() => cambiarMesConfirmado(1)} className="hover:bg-slate-100 p-1.5 rounded-lg font-black text-slate-600">&gt;</button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-slate-400 mb-2">
                <span>D</span><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {getDiasDelMesConfirmado().map((dia, idx) => {
                  if (!dia) return <div key={`empty-c-${idx}`} />;
                  const timestampDia = dia.getTime();
                  const isInicio = fechaConfirmadoInicio && timestampDia === fechaConfirmadoInicio.getTime();
                  const isFin = fechaConfirmadoFin && timestampDia === fechaConfirmadoFin.getTime();
                  const isRango = fechaConfirmadoInicio && fechaConfirmadoFin && timestampDia > fechaConfirmadoInicio.getTime() && timestampDia < fechaConfirmadoFin.getTime();

                  let bgClass = 'hover:bg-slate-100 text-slate-700';
                  if (isInicio || isFin) bgClass = 'bg-slate-900 text-white rounded-full font-black';
                  if (isRango) bgClass = 'bg-slate-100 text-slate-900 rounded-none';

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectDiaConfirmado(dia)}
                      className={`text-center py-1 text-[11px] font-bold rounded-full transition-all ${bgClass}`}
                    >
                      {dia.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-end w-fit pb-1">
          <button
            onClick={() => {
              setSearchItemRef('');
              setFilterProveedor('');
              setFilterEstadoLogistico('');
              setSearchOCRef('');
              setFechaConfirmadoInicio(null);
              setFechaConfirmadoFin(null);
              setSortCompra('');
              setCurrentPage(1);
            }}
            title="Limpiar filtros"
            className="flex items-center justify-center bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl w-10 h-10 border border-slate-100 transition-all cursor-pointer shadow-sm"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* ASIGNADOR DE OC RESPONSIVO (DESKTOP) */}
      {showAsignador && (
        <div className="hidden md:block mb-6 bg-slate-900 rounded-3xl p-8 shadow-2xl border-4 border-emerald-500/20">
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-4">
              <p className="text-emerald-400 font-black text-[10px] uppercase">Nueva OC</p>
              <div className="flex gap-3">
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
                    <div className="absolute z-20 mt-2 w-full max-h-56 overflow-y-auto scrollbar-hide rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
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
              <button onClick={() => procesarAsignacion()} className="w-full bg-emerald-500 text-white py-3.5 rounded-xl font-black text-xs uppercase cursor-pointer active:scale-95 transition-all">Crear y Vincular</button>
            </div>
            <div className="space-y-4 border-l border-slate-800 pl-12">
              <p className="text-blue-400 font-black text-[10px] uppercase">Agregar a Existente</p>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto scrollbar-hide">
                {ordenesExistentes.map(oc => (
                  <button key={oc.id} onClick={() => procesarAsignacion(oc)} className="w-full bg-slate-800 hover:bg-blue-600 text-white p-3.5 rounded-xl text-left text-[10px] font-black uppercase flex justify-between cursor-pointer transition-colors">
                    <span>{oc.numeroOC} — {oc.proveedor}</span>
                    <ChevronDown size={14} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA MÓVIL: TARJETAS MINIMALISTAS (< md) */}
      <div className="space-y-2.5 md:hidden mb-6">
        {paginatedItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-400 font-bold text-xs border border-slate-200">
            No se encontraron pedidos con los filtros aplicados.
          </div>
        ) : (
          paginatedItems.map((item) => {
            const uId = `${item.idRFQ}-${item.indexOriginal}`;
            const ocInfo = getInfoOC(item.numOC);
            const ocDetalle = ordenesExistentes.find(o => o.numeroOC === item.numOC);
            const trackingNumber = ocDetalle?.tracking || item.tracking || item.numTracking || '';
            const rfqLabel = `# ${item.correlativo} — ${item.cliente}`;
            const timer = calcularCountdown(item.fechaCompromiso, ocInfo.rawEstado);
            const ventaTotal = (item.precio || 0) * (item.cantidad || 0);
            const isSelected = seleccionados.includes(uId);

            return (
              <div
                key={uId}
                onClick={() => {
                  if (role === 'comprador' && !item.numOC) toggleSeleccion(uId);
                }}
                className={`bg-white rounded-2xl p-4 border transition-all shadow-sm active:scale-[0.98] touch-manipulation relative ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                    : 'border-slate-100 hover:shadow-md hover:border-slate-200'
                }`}
              >
                {/* Header: Checkbox + Correlativo (Izq) y Estado (Der) */}
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {role === 'comprador' && !item.numOC && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSeleccion(uId); }}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                        }`}
                        aria-label="Seleccionar ítem para orden de compra"
                      >
                        {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                      </button>
                    )}
                    <span className="font-mono font-bold text-[11px] text-slate-400 tracking-wider">
                      #{item.correlativo}
                    </span>
                  </div>
                  <MobileBadge estado={ocInfo.rawEstado || 'Por Procesar'} label={ocInfo.rawEstado === 'Recibido' ? 'Recibido' : ocInfo.label} size="xs" className="shadow-xs" />
                </div>

                {/* Body: Item, Cliente y Marca */}
                <div className="mb-3 pr-2">
                  <h3 className="font-black text-slate-800 text-sm uppercase leading-tight line-clamp-2">
                    {item.descripcion || item.desc}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                    <span className="font-bold text-blue-700 uppercase truncate">{item.cliente}</span>
                    {item.marca && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="font-bold text-slate-500 uppercase truncate">{item.marca}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Resumen de venta y cantidades */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <Package size={13} className="text-slate-500" />
                    <span className="font-mono font-black text-[11px] text-slate-700">{item.cantidad || item.cant} {((item.cantidad || item.cant) === 1) ? 'ud' : 'uds'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-50/50 px-2 py-1 rounded-md border border-emerald-100/50">
                    <DollarSign size={13} className="text-emerald-500" />
                    <span className="font-mono font-black text-[11px] text-emerald-900">${ventaTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Footer: OC y Countdown */}
                <div className="flex items-end justify-between pt-3 border-t border-slate-50">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    {item.numOC && (
                      <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                        <Hash size={10} /> OC: <span className="font-mono">{item.numOC}</span>
                      </span>
                    )}
                  </div>
                  
                  {item.fechaCompromiso && (
                    <div className="shrink-0 ml-2">
                      <span className={`text-[9px] font-bold uppercase flex items-center gap-1.5 ${timer.color.includes('rose') ? 'text-rose-600' : timer.color.includes('amber') ? 'text-amber-600' : 'text-slate-400'}`}>
                        <Calendar size={10} /> {timer.dias} {timer.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Botón Principal de Tracking (Grande y temático) */}
                {trackingNumber && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openTrackingModal(trackingNumber, rfqLabel, ocDetalle?.id, ocDetalle?.estado, ocDetalle?.fechaUltimoEstado);
                      }}
                      className={`w-full flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl shadow-xs border transition-all cursor-pointer active:scale-[0.98] touch-manipulation text-white font-black uppercase tracking-widest text-[10px] ${
                        role === 'vendedor' ? 'bg-violet-500 hover:bg-violet-600 border-violet-600 shadow-violet-500/20' :
                        role === 'gerente' ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 shadow-emerald-500/20' :
                        role === 'administrador' ? 'bg-rose-500 hover:bg-rose-600 border-rose-600 shadow-rose-500/20' :
                        'bg-blue-500 hover:bg-blue-600 border-blue-600 shadow-blue-500/20'
                      }`}
                      title="Consultar rastreo logístico"
                    >
                      <Truck size={14} className="group-hover:scale-110 transition-transform" />
                      <span>Rastrear</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* VISTA DESKTOP: TABLA CLÁSICA (hidden en < md, visible en >= md) */}
      <div className="hidden md:block bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-x-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-900 text-[9px] text-slate-400 font-black uppercase tracking-[0.15em]">
              <th 
                className="p-6 text-center w-14 cursor-pointer select-none hover:bg-slate-800 hover:text-white transition-colors"
                onClick={handleSortCycle}
                title="Ciclar ordenamiento (Ordenados / Pendientes / Sin ordenar)"
              >
                Sel{getSortIcon()}
              </th>
              <th className="p-6 text-left">Ítem / Referencia</th>
              <th className="p-6 text-center">Confirmado</th>
              <th className="p-6 text-center">Cant.</th>
              <th className="p-6 text-right">Venta (Unit/Total)</th>
              {(role === 'comprador' || role === 'administrador') && <th className="p-6 text-center bg-slate-800">Costo FOB Real</th>}
              {(role === 'comprador' || role === 'administrador') && <th className="p-6 text-left bg-slate-800">Proveedor</th>}
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
              const trackingNumber = ocDetalle?.tracking || item.tracking || item.numTracking || '';
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
                  {(role === 'comprador' || role === 'administrador') && (
                    <td className="p-6 bg-slate-50/50">
                      <div className="flex items-center gap-1 border-2 border-slate-200 rounded-lg p-1 bg-white">
                        <span className="text-[9px] font-bold text-slate-400">$</span>
                        <input type="number" value={item.fobReal} disabled={!!item.numOC} onChange={(e) => handleFobChange(uId, e.target.value)} className="w-16 text-[11px] font-black outline-none bg-transparent" />
                      </div>
                    </td>
                  )}
                  {(role === 'comprador' || role === 'administrador') && (
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
                    {trackingNumber ? (
                      <button
                        type="button"
                        onClick={() => openTrackingModal(trackingNumber, rfqLabel, ocDetalle?.id, ocDetalle?.estado, ocDetalle?.fechaUltimoEstado)}
                        title={puedeVerNumeroGuia ? `Guía: ${trackingNumber} • Ver tracking` : 'Ver seguimiento logístico'}
                        className={`group relative flex items-center justify-between gap-2.5 px-3 py-2 rounded-2xl border transition-all duration-200 w-full max-w-[155px] cursor-pointer hover:-translate-y-0.5 active:translate-y-0 text-left ${ocInfo.activeClass}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ocInfo.dotColor} group-hover:scale-125 transition-transform`} />
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-tight truncate leading-tight">
                              {ocInfo.label}
                            </p>
                            <p className="text-[7.5px] font-bold opacity-60 uppercase tracking-tighter truncate mt-0.5">
                              {ocInfo.mod}
                            </p>
                          </div>
                        </div>
                        <Truck size={12} className="shrink-0 opacity-40 group-hover:opacity-90 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ) : (
                      <div
                        title={ocInfo.mod !== 'Sin cambios' ? `Último cambio: ${ocInfo.mod}` : 'Sin tracking'}
                        className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all w-full max-w-[155px] select-none cursor-default ${ocInfo.disabledClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ocInfo.dotColor}`} />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-tight truncate leading-tight">
                            {ocInfo.label}
                          </p>
                          <p className="text-[7.5px] font-bold opacity-60 uppercase tracking-tighter truncate mt-0.5">
                            {ocInfo.mod !== 'Sin cambios' ? ocInfo.mod : 'Sin tracking'}
                          </p>
                        </div>
                      </div>
                    )}
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
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-6 p-4 sm:px-6 bg-slate-900 rounded-2xl sm:rounded-3xl text-white select-none">
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <button
              onClick={() => setCurrentPage(Math.max(safeCurrentPage - 1, 1))}
              disabled={safeCurrentPage === 1}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer"
            >
              Anterior
            </button>
            <span className="sm:hidden text-[11px] font-bold text-slate-300">
              {safeCurrentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(safeCurrentPage + 1, totalPages))}
              disabled={safeCurrentPage === totalPages}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer"
            >
              Siguiente
            </button>
          </div>
          <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-widest text-slate-300">
            Página {safeCurrentPage} de {totalPages} ({filteredItems.length} ítems)
          </span>
        </div>
      )}
      {/* FAB y Modal Asignador para Mobile */}
      {role === 'comprador' && seleccionados.length > 0 && (
        <div className="md:hidden fixed bottom-24 left-0 right-0 z-50 px-4 flex justify-center animate-in slide-in-from-bottom-5 pointer-events-none">
          <button
            onClick={() => setShowAsignador(true)}
            className="pointer-events-auto bg-emerald-500 text-white rounded-full px-6 py-3.5 shadow-2xl shadow-emerald-500/30 flex items-center gap-3 font-black text-xs uppercase tracking-widest active:scale-95 transition-transform"
          >
            <LinkIcon size={18} />
            Vincular Selección ({seleccionados.length})
          </button>
        </div>
      )}

      {/* Modal Asignador Mobile */}
      {role === 'comprador' && showAsignador && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm p-0 animate-in fade-in">
          <div className="bg-slate-900 w-full rounded-t-3xl border-t-2 border-emerald-500/30 p-6 flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-10 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <LinkIcon size={16} className="text-emerald-500" />
                Vincular {seleccionados.length} {seleccionados.length === 1 ? 'ítem' : 'ítems'}
              </h3>
              <button onClick={() => setShowAsignador(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="overflow-y-auto scrollbar-hide flex-1 pb-4 space-y-6">
              <div className="space-y-4">
                <p className="text-emerald-400 font-black text-[10px] uppercase">Nueva OC</p>
                <div className="flex flex-col gap-3">
                  <input type="text" placeholder="N° OC" className="bg-slate-800 border-none p-4 rounded-xl text-white text-xs font-bold" onChange={(e) => setNuevaOC({...nuevaOC, numero: e.target.value.toUpperCase()})} />
                  <div className="relative">
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
                      <div className="absolute z-20 mt-2 w-full max-h-48 overflow-y-auto scrollbar-hide rounded-xl border border-slate-700 bg-slate-800 shadow-xl">
                        {buscandoProveedor && (
                          <div className="px-4 py-3 text-[10px] font-bold text-slate-400">Buscando proveedores guardados...</div>
                        )}
                        {!buscandoProveedor && !errorProveedor && sugerenciasProveedor.length === 0 && (
                          <div className="px-4 py-3 text-[10px] font-bold text-slate-400">No hay coincidencias. Se guardará como nuevo.</div>
                        )}
                        {!buscandoProveedor && errorProveedor && (
                          <div className="px-4 py-3 text-[10px] font-bold text-rose-400">{errorProveedor}</div>
                        )}
                        {!buscandoProveedor && sugerenciasProveedor.map((s, idx) => (
                          <button
                            key={s.id}
                            type="button"
                            className={`w-full text-left px-4 py-3 border-b last:border-b-0 border-slate-700 ${
                              idx === indiceSugerenciaProveedor ? 'bg-slate-700' : 'hover:bg-slate-700'
                            }`}
                            onMouseDown={() => seleccionarSugerenciaProveedor(s.nombre || '')}
                          >
                            <p className="text-[11px] font-black text-slate-200 uppercase">{s.nombre}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => procesarAsignacion()} className="w-full bg-emerald-500 text-white py-4 rounded-xl font-black text-xs uppercase cursor-pointer active:scale-95 transition-all">Crear y Vincular</button>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-800">
                <p className="text-blue-400 font-black text-[10px] uppercase">Agregar a OC Existente</p>
                <div className="grid grid-cols-1 gap-2 pb-4">
                  {ordenesExistentes.map(oc => (
                    <button key={oc.id} onClick={() => procesarAsignacion(oc)} className="w-full bg-slate-800 hover:bg-blue-600 text-white p-4 rounded-xl text-left text-[10px] font-black uppercase flex justify-between items-center cursor-pointer transition-colors group">
                      <span className="truncate pr-2">{oc.numeroOC} — {oc.proveedor}</span>
                      <ChevronRight size={14} className="shrink-0 text-slate-500 group-hover:text-white" />
                    </button>
                  ))}
                  {ordenesExistentes.length === 0 && (
                    <p className="text-slate-500 text-[10px] font-bold text-center py-4">No hay OC generadas activas</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <TrackingModal
        open={trackingModal.open}
        onClose={() => setTrackingModal(prev => ({ ...prev, open: false }))}
        data={trackingModal.data}
        loading={trackingModal.loading}
        error={trackingModal.error}
        notice={trackingNotice}
        trackingNumber={trackingModal.trackingNumber}
        rfqLabel={trackingModal.rfqLabel}
        estadoActual={trackingModal.ocEstado || 'Pedido'}
        fechaUltimoEstado={trackingModal.fechaUltimoEstado}
        role={role}
      />
    </div>
  );
};
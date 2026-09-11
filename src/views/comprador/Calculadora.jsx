import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import CotizacionDocumento from '../../components/CotizacionDocumento';
import { pdf } from '@react-pdf/renderer';
import CotizacionPDF from '../../components/CotizacionPDF';
import { HelpCircle, Info, ChevronDown, ChevronUp, Tag, Plane, Ship, Receipt, Calculator, Sliders, X, Check } from 'lucide-react';
import { useDHLCalculator } from '../../hooks/useDHLCalculator';

export const Calculadora = ({ onGuardar }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReadOnlyMode = searchParams.get('readOnly') === 'true' || searchParams.get('mode') === 'view';
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const esSolicitudCerrada = rfq?.estado === 'Cotizado' || rfq?.estado === 'Pedido';
  const esSoloLectura = isReadOnlyMode || esSolicitudCerrada;

  const [items, setItems] = useState([]);
  const [flete, setFlete] = useState(0);
  
  // Nuevos Gastos
  const [tramiteAduanal, setTramiteAduanal] = useState(0);
  const [scan, setScan] = useState(0);
  const [adimex, setAdimex] = useState(0);
  const [manejos, setManejos] = useState(0);
  const [seguro, setSeguro] = useState(0);
  const [entregaLocal, setEntregaLocal] = useState(0);
  const [otrosGastos, setOtrosGastos] = useState(0);

  // Aduana Aéreo es ahora la suma de los gastos adicionales
  const aduana = useMemo(() => {
    return Number(tramiteAduanal) + Number(scan) + Number(adimex) + Number(manejos) + Number(seguro) + Number(entregaLocal) + Number(otrosGastos);
  }, [tramiteAduanal, scan, adimex, manejos, seguro, entregaLocal, otrosGastos]);

  const [guardando, setGuardando] = useState(false);
  const [factorM, setFactorM] = useState(1.07);

  // Estados del cotizador DHL Belgium / QS USA
  const [dhlWeight, setDhlWeight] = useState('');
  const [qsWeight, setQsWeight] = useState('');
  const [activeProvider, setActiveProvider] = useState(null);
  const [appliedProvider, setAppliedProvider] = useState(null);
  const [mostrarPicard, setMostrarPicard] = useState(false);
  const [fletePicard, setFletePicard] = useState('');
  const [aduanaPicard, setAduanaPicard] = useState('');
  const [costosPicardExpandidos, setCostosPicardExpandidos] = useState(false);
  const [cotizadorExpandido, setCotizadorExpandido] = useState(false);
  const [gastosExpandidos, setGastosExpandidos] = useState(false);
  const [factoresExpandidos, setFactoresExpandidos] = useState(false);
  const [modalGastosMobile, setModalGastosMobile] = useState(false);
  const [modalCotizadorMobile, setModalCotizadorMobile] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(null);
  const toggleItemActive = (idx) => {
    setActiveItemIndex(prev => (prev === idx ? null : idx));
  };
  const cotizadorRef = useRef(null);
  const factoresRef = useRef(null);
  const costosPicardRef = useRef(null);

  // Selecciona un courier y expande el cotizador para ver el detalle
  const seleccionarProvider = (provider) => {
    setActiveProvider(provider);
    setCotizadorExpandido(true);
  };

  // Si el usuario hace click fuera del cotizador, lo plegamos de vuelta
  useEffect(() => {
    if (!cotizadorExpandido) return;
    const handleClickOutside = (event) => {
      if (cotizadorRef.current && !cotizadorRef.current.contains(event.target)) {
        setCotizadorExpandido(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [cotizadorExpandido]);

  useEffect(() => {
    if (!factoresExpandidos) return;
    const handleClickOutside = (event) => {
      if (factoresRef.current && !factoresRef.current.contains(event.target)) {
        setFactoresExpandidos(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [factoresExpandidos]);

  useEffect(() => {
    if (!costosPicardExpandidos) return;
    const handleClickOutside = (event) => {
      if (costosPicardRef.current && !costosPicardRef.current.contains(event.target)) {
        setCostosPicardExpandidos(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [costosPicardExpandidos]);
  
  const dhlZoneId = useMemo(() => {
    const country = rfq?.paisDestino || rfq?.pais || rfq?.destino || 'El Salvador';
    return country.toLowerCase().includes('salvador') ? '13' : '14';
  }, [rfq]);

  const { rates, config } = useDHLCalculator(dhlZoneId);

  const dhlResults = useMemo(() => {
    const weight = parseFloat(dhlWeight) || 0;
    if (weight <= 0 || !Array.isArray(rates) || rates.length === 0) {
      return { chargeableWeight: 0, totalEur: 0, totalUsd: 0 };
    }

    // 1. Chargeable Weight exacto (Fórmula I22 de Excel)
    const exactChargeable = weight * (0.0003 * weight + 1);

    // 2. Réplica exacta de VLOOKUP(exactChargeable, A:E, col, 1)
    // Busca el tramo más cercano que sea <= exactChargeable
    let entry = rates[0];
    for (let i = 0; i < rates.length; i++) {
      if (rates[i].w <= exactChargeable) {
        entry = rates[i];
      } else {
        break; // Como la lista está ordenada, al pasar el valor nos detenemos
      }
    }

    const totalEur = entry?.final || 0;
    const totalUsd = totalEur * (config?.skfMonthlyRate || 1.186447);

    return {
      chargeableWeight: exactChargeable,
      totalEur,
      totalUsd,
    };
  }, [dhlWeight, rates, config]);

  const qsResults = useMemo(() => {
    const weightLbs = parseFloat(qsWeight) || 0;
    if (weightLbs <= 0) {
      return { totalUsd: 0 };
    }

    const totalUsd = weightLbs > 10 ? weightLbs * 2.80 : 10.00;

    return {
      totalUsd
    };
  }, [qsWeight]);

  useEffect(() => {
    const fetchRFQ = async () => {
      try {
        const docRef = doc(db, "solicitudes", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setRfq(data);
          
          // Inicializamos items respetando valores previos si existen
          setItems((data.productos || []).map(p => ({
            ...p,
            fob: p.fob || 0,
            fva: p.fva || 1.30,
            fvm: p.fvm || 1.25,
            fobPicard: p.fobPicard || '',
            costoPicardManual: p.costoPicardManual || '',
            entregaA: p.entregaA || '',
            entregaM: p.entregaM || '',
            notas: p.notas || '',
            marca: p.marca || '',
            // Por defecto, si no tiene precio, lo seleccionamos para editar
            selected: Number(p.fob) <= 0 
          })));

          setFlete(data.fleteAereo || 0);
          setFletePicard(data.fleteAereoPicard ?? '');
          setAduanaPicard(data.aduanaAereaPicard ?? '');

          const legacyAduana = data.aduanaAerea || 0;
          const loadedOtros = data.otrosGastos || 0;
          const hasNewFields = data.tramiteAduanal || data.scan || data.adimex || data.manejos || data.seguro || data.entregaLocal || data.otrosGastos;

          setTramiteAduanal(data.tramiteAduanal || 0);
          setScan(data.scan || 0);
          setAdimex(data.adimex || 0);
          setManejos(data.manejos || 0);
          setSeguro(data.seguro || 0);
          setEntregaLocal(data.entregaLocal || 0);
          
          if (!hasNewFields && legacyAduana > 0) {
            setOtrosGastos(legacyAduana);
          } else {
            setOtrosGastos(loadedOtros);
          }

          setFactorM(data.factorM || 1.07);
        } else {
          navigate('/compras');
        }
      } catch (error) {
        console.error("Error cargando RFQ:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRFQ();
  }, [id, navigate]);

  // La cotización es parcial si todavía queda algún ítem con FOB 0 en el array total
  const tienePendientesGlobales = items.some(p => Number(p.fob) <= 0);
  const esAvanceParcial = rfq?.estado === 'Cotizado Parcial' || rfq?.estado === 'Pedido Parcial';

  const factoresAereosFijados = useMemo(() => {
    const grupos = new Map();

    items.forEach((p) => {
      const factor = Number(p.factorA);
      if (Number(p.fob || 0) <= 0 || !Number.isFinite(factor) || factor <= 0) return;

      const clave = factor.toFixed(2);
      const grupo = grupos.get(clave) || { factor: clave, cantidad: 0 };
      grupo.cantidad += 1;
      grupos.set(clave, grupo);
    });

    return Array.from(grupos.values());
  }, [items]);

  const mostrarFactoresAereosFijados = factoresAereosFijados.length > 0 && (
    esAvanceParcial || factoresAereosFijados.length > 1
  );

  const factorA = useMemo(() => {
    const seleccionados = items.filter(p => p.selected);
    const totalFobPartida = seleccionados.reduce((acc, p) => acc + (Number(p.fob || 0) * p.cant), 0);
    if (totalFobPartida > 0) {
      return (totalFobPartida + Number(flete) + aduana) / totalFobPartida;
    }
    return 0;
  }, [flete, aduana, items]);

  const updateItem = (idx, campo, valor) => {
    if (esSoloLectura) return;
    const nuevos = [...items];
    nuevos[idx][campo] = valor;
    setItems(nuevos);
  };

  const handleNumericInput = (setValue) => (e) => {
    const val = e.target.value;
    if (val === '' || (/^\d*\.?\d*$/.test(val) && parseFloat(val) >= 0)) {
      setValue(val);
    }
  };

  const handleTableNumericInput = (idx, campo, valor) => {
    if (esSoloLectura) return;
    if (valor === '' || (/^\d*\.?\d*$/.test(valor) && parseFloat(valor) >= 0)) {
      const nuevos = [...items];
      nuevos[idx][campo] = valor;
      if (campo === 'fob' && Number(valor) > 0) {
        nuevos[idx].enConsulta = false;
      }
      setItems(nuevos);
    }
  };

  const handleTableIntegerInput = (idx, campo, valor) => {
    if (valor === '' || /^\d+$/.test(valor)) {
      updateItem(idx, campo, valor);
    }
  };

  const ejecutarGuardado = async () => {
    if (guardando || esSolicitudCerrada) return;
    setGuardando(true);
    
    // Procesamos todos los ítems para no perder los que no estaban seleccionados
    const itemsFinales = items.map(p => {
      const esPedidoPrevio = p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado';
      const tieneFob = Number(p.fob || 0) > 0;
      const esEnConsulta = !tieneFob && !!p.enConsulta;
      const nuevoEstado = esPedidoPrevio ? p.estadoItem : (tieneFob ? 'Cotizado' : (esEnConsulta ? 'En consulta' : 'Pendiente'));
      
      const estaCotizado = nuevoEstado === 'Cotizado' || nuevoEstado === 'Pedido' || nuevoEstado === 'Comprado';
      
      return {
        ...p,
        enConsulta: esEnConsulta,
        estadoItem: nuevoEstado,
        factorA: estaCotizado ? (p.factorA || factorA) : null,
        factorM: estaCotizado ? (p.factorM || factorM) : null
      };
    });

    let pdfBase64 = '';
    try {
      const doc = <CotizacionPDF cotizacionData={{
        ...rfq,
        productos: itemsFinales.filter(p => p.estadoItem === 'Cotizado' || p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado' || Number(p.fob) > 0 || p.enConsulta || p.estadoItem === 'En consulta'),
        factorA,
        factorM
      }} />;
      const asPdf = pdf();
      asPdf.updateContainer(doc);
      const blob = await asPdf.toBlob();
      
      const reader = new FileReader();
      pdfBase64 = await new Promise((resolve, reject) => {
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          resolve(reader.result.split(',')[1]);
        };
        reader.onerror = reject;
      });
    } catch (e) {
      console.error("Error al generar PDF nativo:", e);
    }

    const exito = await onGuardar(itemsFinales, factorA, factorM, flete, aduana, tramiteAduanal, scan, adimex, manejos, seguro, entregaLocal, otrosGastos, fletePicard, aduanaPicard, pdfBase64);
    setGuardando(false);
    if (exito) {
      navigate('/compras');
    }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center font-black text-slate-400 animate-pulse uppercase tracking-widest">
      Cargando Calculadora de Márgenes...
    </div>
  );

  return (
    <div className="max-w-[99%] mx-auto animate-in fade-in duration-500 pb-52 md:pb-28">
      {/* Panel de Control de Costos (Separado en móvil, unificado en desktop) */}
      <div className="mb-4 md:mb-6 flex flex-col gap-4 md:gap-5 xl:flex-row xl:items-center xl:gap-8 md:bg-white md:p-5 md:rounded-2xl md:shadow-sm md:border md:border-slate-200">
        <div className="flex-1 min-w-0 px-1 md:px-0">
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight italic">Calculadora de Márgenes</h2>
          <div className="flex flex-wrap items-center gap-1.5 text-xs uppercase font-bold text-slate-500 mt-0.5">
            <span className="font-mono text-slate-800">{rfq?.correlativo}</span>
            <span>—</span>
            <span className="truncate max-w-[190px] sm:max-w-xs md:max-w-md" title={rfq?.cliente}>{rfq?.cliente}</span>
            {rfq?.validez && (
              <span className="text-[10px] text-slate-400 block sm:inline w-full sm:w-auto mt-0.5 sm:mt-0">
                <span className="hidden sm:inline"> — </span>Validez: {rfq.validez}
              </span>
            )}
          </div>
        </div>

        {/* MÓVIL (< md): Cinturón limpio de parámetros globales */}
        <div className="md:hidden w-full bg-slate-100 p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          {/* Fila superior: 4 tarjetas con fondo blanco limpio */}
          <div className="grid grid-cols-2 gap-2">
            {/* Tarjeta 1: Flete Aéreo ($) */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
              <div className="flex items-center justify-between text-slate-500">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Plane size={14} className="text-blue-600 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-tight truncate">Flete Aéreo</span>
                </div>
                <span className="text-[9px] font-bold text-slate-400">$</span>
              </div>
              <div className="mt-1.5 min-w-0">
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  disabled={esSoloLectura}
                  placeholder="0.00"
                  className="w-full font-mono font-black text-slate-800 text-sm sm:text-base outline-none bg-transparent disabled:opacity-70 truncate" 
                  value={flete} 
                  onChange={(e) => {
                    handleNumericInput(setFlete)(e);
                    setAppliedProvider(null);
                  }} 
                  onFocus={(e) => e.target.select()}
                />
              </div>
            </div>

            {/* Tarjeta 2: Aduana Aérea ($) */}
            <button
              type="button"
              onClick={() => setModalGastosMobile(true)}
              className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between text-left hover:border-emerald-400 hover:bg-emerald-50/20 transition-all cursor-pointer touch-manipulation"
            >
              <div className="flex items-center justify-between text-slate-500">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Receipt size={14} className="text-emerald-600 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-tight truncate">Aduana</span>
                </div>
                <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Editar</span>
              </div>
              <div className="mt-1.5 font-mono font-black text-emerald-700 text-sm sm:text-base truncate">
                ${aduana.toFixed(2)}
              </div>
            </button>

            {/* Tarjeta 3: Factor Aéreo (Fondo blanco, icono de avión) */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Plane size={14} className="text-emerald-600 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-tight truncate">Fact. Aéreo</span>
                </div>
              </div>
              <div className="mt-1.5">
                {!mostrarFactoresAereosFijados ? (
                  <span className="font-mono font-black text-emerald-800 text-sm sm:text-base truncate block">
                    {factorA.toFixed(2)}
                  </span>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {factoresAereosFijados.map(({ factor, cantidad }) => (
                      <span key={factor} className="inline-flex items-center justify-between gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-1 rounded border border-emerald-100 uppercase">
                        <span>FA {factor}</span>
                        <span className="text-emerald-600/80 bg-white px-1 rounded-sm border border-emerald-100 shadow-2xs">x{cantidad}</span>
                      </span>
                    ))}
                    {!esSoloLectura && tienePendientesGlobales && (
                      <span className="inline-flex items-center justify-between gap-1 text-[9px] font-black text-blue-700 bg-blue-50 px-1.5 py-1 rounded border border-blue-100 uppercase">
                        <span>Nuevos</span>
                        <span className="text-blue-600/80 bg-white px-1 rounded-sm border border-blue-100 shadow-2xs">FA {factorA.toFixed(2)}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tarjeta 4: Factor Marítimo (Fondo blanco, input amplio) */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/20 transition-all">
              <div className="flex items-center justify-between text-slate-500">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Ship size={14} className="text-sky-600 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-tight truncate">Fact. Marítimo</span>
                </div>
              </div>
              <div className="mt-1.5 min-w-0">
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  disabled={esSoloLectura}
                  className="w-full font-mono font-black text-sky-800 text-sm sm:text-base outline-none bg-transparent disabled:opacity-70 truncate" 
                  value={factorM} 
                  onChange={handleNumericInput(setFactorM)} 
                  onFocus={(e) => e.target.select()}
                />
              </div>
            </div>
          </div>

          {/* Fila inferior: Accesos directos a Desglose Aduana y Cotizador DHL / QS */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setModalGastosMobile(true)}
              className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-black flex items-center justify-center gap-2 border border-slate-200 shadow-2xs transition-colors touch-manipulation cursor-pointer"
            >
              <Receipt size={14} className="text-emerald-600 shrink-0" />
              <span>Desglose Aduana</span>
            </button>
            <button
              type="button"
              onClick={() => setModalCotizadorMobile(true)}
              className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-blue-700 text-[11px] font-black flex items-center justify-center gap-2 border border-blue-200 shadow-2xs transition-colors touch-manipulation cursor-pointer"
            >
              <Calculator size={14} className="text-blue-600 shrink-0" />
              <span>Cotizar Flete</span>
            </button>
          </div>
        </div>

        {/* ESCRITORIO (>= md): Bloques tradicionales */}
        <div className="hidden md:flex w-full gap-4 bg-slate-900 p-4 rounded-xl shadow-lg shadow-slate-200 sm:w-auto shrink-0">
          <div className="flex flex-col">
            <label className="text-[9px] font-black text-slate-400 uppercase">Flete Aéreo ($)</label>
            <input 
              type="number" 
              min="0"
              disabled={esSoloLectura}
              className="bg-transparent font-bold text-white outline-none w-20 text-lg border-b border-slate-700 focus:border-emerald-500 disabled:opacity-70" 
              value={flete} 
              onChange={(e) => {
                handleNumericInput(setFlete)(e);
                setAppliedProvider(null);
              }} 
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div className="flex flex-col border-l border-slate-700 pl-4 relative group cursor-help">
            <label className="text-[9px] font-black text-slate-400 uppercase">Aduana Aéreo ($)</label>
            <div className="font-bold text-emerald-400 text-lg mt-1">
              {aduana.toFixed(2)}
            </div>
            {/* Tooltip */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none shadow-xl border border-slate-700 font-bold uppercase tracking-wide">
              Suma de gastos adicionales
            </div>
          </div>
        </div>

        <div className="hidden md:flex w-full flex-wrap gap-4 xl:w-auto xl:flex-nowrap shrink-0">
          <div className="min-w-60 flex-1 text-right px-5 py-2 bg-emerald-50 rounded-xl border border-emerald-100 xl:flex-none">
            <span className="text-[9px] block text-emerald-600 font-black uppercase tracking-widest">Factor Aéreo Aplicado</span>
            {!mostrarFactoresAereosFijados ? (
              <span className="text-2xl font-black text-emerald-700">{factorA.toFixed(2)}</span>
            ) : (
              <div ref={factoresRef} className="relative mt-1">
                <button
                  type="button"
                  onClick={() => setFactoresExpandidos(prev => !prev)}
                  className="border-b border-emerald-300 pb-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700 transition-colors hover:border-emerald-600 hover:text-emerald-900"
                >
                  {factoresExpandidos ? 'Cerrar' : 'Ver más'}
                </button>
                {factoresExpandidos && (
                  <div className="absolute right-0 top-full z-50 mt-2 flex w-72 max-w-[calc(100vw-3rem)] flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Factores aplicados</span>
                {factoresAereosFijados.map(({ factor, cantidad }) => (
                  <span key={factor} className="flex items-center justify-between rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
                    {factor} · {cantidad} {cantidad === 1 ? 'ítem' : 'ítems'}
                  </span>
                ))}
                {!esSoloLectura && tienePendientesGlobales && (
                  <span className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
                    Pendientes: {factorA.toFixed(2)}
                  </span>
                )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="text-right px-5 py-2 bg-blue-50 rounded-xl border border-blue-100 flex flex-col items-end">
            <span className="text-[9px] block text-blue-600 font-black uppercase tracking-widest">Factor Marítimo Aplicado</span>
            <input 
              type="number" 
              step="0.01"
              min="0"
              disabled={esSoloLectura}
              className="bg-transparent font-black text-blue-700 outline-none w-16 text-2xl text-right border-b border-transparent focus:border-blue-500 disabled:opacity-70" 
              value={factorM} 
              onChange={handleNumericInput(setFactorM)} 
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>
      </div>
      {/* Gastos Adicionales Aéreos (Desktop) */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 mb-4 md:mb-6 overflow-hidden">
        <div
          className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-100 flex items-center justify-between cursor-pointer select-none"
          onClick={() => setGastosExpandidos(prev => !prev)}
        >
          <div>
            <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-wide">Gastos Adicionales Aéreos</h3>
            <p className="text-[10px] md:text-[11px] text-slate-400 font-semibold mt-0.5">Trámite, Scan, Adimex, Manejos, Seguro, Entrega Local, Otros</p>
          </div>
          <span className={`w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 transition-transform duration-200 ${gastosExpandidos ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </div>
        <div className={`transition-all duration-300 ease-in-out origin-top ${gastosExpandidos ? 'grid-rows-[1fr] opacity-100 scale-100' : 'grid-rows-[0fr] opacity-0 scale-95'} grid`}>
          <div className="overflow-hidden">
            <div className="p-3.5 md:p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 md:gap-4 bg-slate-50">
              <div className="flex flex-col">
                <label className="text-[9px] font-black text-slate-500 uppercase mb-1">Trámite Aduanal</label>
                <input type="number" min="0" disabled={esSoloLectura} className="p-2 border border-slate-200 rounded-lg font-bold text-base md:text-sm bg-white text-slate-700 outline-none focus:border-emerald-500 disabled:bg-slate-100 disabled:opacity-70" value={tramiteAduanal} onChange={handleNumericInput(setTramiteAduanal)} onFocus={(e) => e.target.select()} />
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] font-black text-slate-500 uppercase mb-1">Scan</label>
                <input type="number" min="0" disabled={esSoloLectura} className="p-2 border border-slate-200 rounded-lg font-bold text-base md:text-sm bg-white text-slate-700 outline-none focus:border-emerald-500 disabled:bg-slate-100 disabled:opacity-70" value={scan} onChange={handleNumericInput(setScan)} onFocus={(e) => e.target.select()} />
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] font-black text-slate-500 uppercase mb-1">Adimex</label>
                <input type="number" min="0" disabled={esSoloLectura} className="p-2 border border-slate-200 rounded-lg font-bold text-base md:text-sm bg-white text-slate-700 outline-none focus:border-emerald-500 disabled:bg-slate-100 disabled:opacity-70" value={adimex} onChange={handleNumericInput(setAdimex)} onFocus={(e) => e.target.select()} />
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] font-black text-slate-500 uppercase mb-1">Manejos</label>
                <input type="number" min="0" disabled={esSoloLectura} className="p-2 border border-slate-200 rounded-lg font-bold text-base md:text-sm bg-white text-slate-700 outline-none focus:border-emerald-500 disabled:bg-slate-100 disabled:opacity-70" value={manejos} onChange={handleNumericInput(setManejos)} onFocus={(e) => e.target.select()} />
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] font-black text-slate-500 uppercase mb-1">Seguro</label>
                <input type="number" min="0" disabled={esSoloLectura} className="p-2 border border-slate-200 rounded-lg font-bold text-base md:text-sm bg-white text-slate-700 outline-none focus:border-emerald-500 disabled:bg-slate-100 disabled:opacity-70" value={seguro} onChange={handleNumericInput(setSeguro)} onFocus={(e) => e.target.select()} />
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] font-black text-slate-500 uppercase mb-1">Entrega Local</label>
                <input type="number" min="0" disabled={esSoloLectura} className="p-2 border border-slate-200 rounded-lg font-bold text-base md:text-sm bg-white text-slate-700 outline-none focus:border-emerald-500 disabled:bg-slate-100 disabled:opacity-70" value={entregaLocal} onChange={handleNumericInput(setEntregaLocal)} onFocus={(e) => e.target.select()} />
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] font-black text-slate-500 uppercase mb-1">Otros</label>
                <input type="number" min="0" disabled={esSoloLectura} className="p-2 border border-slate-200 rounded-lg font-bold text-base md:text-sm bg-white text-slate-700 outline-none focus:border-emerald-500 disabled:bg-slate-100 disabled:opacity-70" value={otrosGastos} onChange={handleNumericInput(setOtrosGastos)} onFocus={(e) => e.target.select()} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cotizador de Flete Internacional (Desktop) */}
      <div ref={cotizadorRef} className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 mb-4 md:mb-6 overflow-hidden">
        <div
          className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 cursor-pointer select-none"
          onClick={() => setCotizadorExpandido(prev => !prev)}
        >
          <div>
            <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-wide">Cotizador de Flete Internacional</h3>
            <p className="text-[10px] md:text-[11px] text-slate-400 font-semibold mt-0.5">Calcula el costo con cada courier y aplica el resultado como Flete Aéreo</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[9px] block text-slate-400 font-black uppercase tracking-widest">Fuente activa</span>
              <span className="text-xs font-black text-blue-600 uppercase">
                {activeProvider === 'dhl' ? 'DHL Express Bélgica' : activeProvider === 'qs' ? 'QS USA' : 'Ninguna'}
              </span>
            </div>
            <span className={`w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 transition-transform duration-200 ${cotizadorExpandido ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </div>
        </div>

        {/* Vista plegada en desktop: resumen compacto de lo ya calculado */}
        <div className={`hidden md:grid transition-all duration-300 ease-in-out origin-top ${!cotizadorExpandido ? 'grid-rows-[1fr] opacity-100 scale-100' : 'grid-rows-[0fr] opacity-0 scale-95'}`}>
        <div className="overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            <button
              type="button"
              onClick={() => seleccionarProvider('dhl')}
              className={`p-4 flex items-center gap-3 text-left transition-colors ${activeProvider === 'dhl' ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
            >
              <div className="w-8 h-8 rounded-lg border flex items-center justify-center overflow-hidden bg-white border-slate-200 shrink-0">
                <img src="/dhl.svg" alt="DHL" className="w-7 h-auto object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-slate-700 uppercase truncate">DHL Express Bélgica</p>
                <p className="text-[9px] text-slate-400 font-semibold">Peso volumétrico (kg)</p>
              </div>
              <div className="text-right shrink-0">
                <span className="block text-[8px] text-slate-400 font-black uppercase">Costo estimado</span>
                <span className="text-sm font-black text-slate-800">${dhlResults.totalUsd ? dhlResults.totalUsd.toFixed(2) : '0.00'}</span>
              </div>
              {activeProvider === 'dhl' && (
                <span className="bg-blue-600 text-white text-[7px] font-black uppercase px-1.5 py-1 rounded-full shrink-0">En uso</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => seleccionarProvider('qs')}
              className={`p-4 flex items-center gap-3 text-left transition-colors ${activeProvider === 'qs' ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
            >
              <div className="w-8 h-8 rounded-lg border flex items-center justify-center overflow-hidden bg-white border-slate-200 shrink-0">
                <img src="/quickshipping.png" alt="QS" className="w-7 h-auto object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-slate-700 uppercase truncate">QS USA</p>
                <p className="text-[9px] text-slate-400 font-semibold">Tarifa por libra, mínimo $10.00</p>
              </div>
              <div className="text-right shrink-0">
                <span className="block text-[8px] text-slate-400 font-black uppercase">Costo estimado</span>
                <span className="text-sm font-black text-slate-800">${qsResults.totalUsd ? qsResults.totalUsd.toFixed(2) : '0.00'}</span>
              </div>
              {activeProvider === 'qs' && (
                <span className="bg-blue-600 text-white text-[7px] font-black uppercase px-1.5 py-1 rounded-full shrink-0">En uso</span>
              )}
            </button>
          </div>
        </div>
        </div>

        {/* Vista expandida: detalle completo de ambos couriers */}
        <div className={`grid transition-all duration-300 ease-in-out origin-top ${cotizadorExpandido ? 'grid-rows-[1fr] opacity-100 scale-100' : 'grid-rows-[0fr] opacity-0 scale-95'}`}>
        <div className="overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">

          {/* Cotizador DHL Belgium */}
          <div className={`p-4 md:p-6 transition-all duration-200 ${activeProvider === 'dhl' ? 'bg-blue-50 ring-2 ring-inset ring-blue-200' : 'bg-slate-100/80 hover:bg-slate-100'}`}>
            <div
              className="flex items-center gap-3 mb-5 cursor-pointer group"
              onClick={() => seleccionarProvider('dhl')}
              role="radio"
              aria-checked={activeProvider === 'dhl'}
              tabIndex={0}
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${activeProvider === 'dhl' ? 'border-blue-600' : 'border-slate-300 group-hover:border-slate-400'}`}>
                {activeProvider === 'dhl' && <span className="w-2 h-2 rounded-full bg-blue-600" />}
              </span>
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center overflow-hidden shrink-0 transition-colors ${activeProvider === 'dhl' ? 'bg-white border-slate-200' : 'bg-slate-200/70 border-slate-200'}`}>
                <img src="/dhl.svg" alt="DHL" className="w-8 h-auto object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-xs font-black uppercase tracking-wide ${activeProvider === 'dhl' ? 'text-slate-800' : 'text-slate-400'}`}>DHL Express Bélgica</h4>
                <p className={`text-[10px] font-semibold ${activeProvider === 'dhl' ? 'text-slate-400' : 'text-slate-400/70'}`}>Tarifa por peso volumétrico (kg)</p>
              </div>
              {activeProvider === 'dhl' && (
                <span className="bg-blue-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded-full shrink-0">En uso</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex flex-col">
                <label className={`text-[10px] font-black uppercase mb-1 ${activeProvider === 'dhl' ? 'text-slate-500' : 'text-slate-400'}`}>Peso base (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`p-2.5 border rounded-lg font-bold outline-none text-sm transition-shadow ${activeProvider === 'dhl' ? 'bg-white border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10' : 'bg-white/60 border-slate-200 text-slate-500'}`}
                  value={dhlWeight}
                  onChange={handleNumericInput(setDhlWeight)}
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="flex flex-col">
                <label className={`text-[10px] font-black uppercase mb-1 ${activeProvider === 'dhl' ? 'text-slate-500' : 'text-slate-400'}`}>Zona DHL</label>
                <div className={`p-2.5 border rounded-lg font-bold text-sm flex items-center justify-between h-9.5 ${activeProvider === 'dhl' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/60 border-slate-200 text-slate-400'}`}>
                  <span>Zona {dhlZoneId}</span>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wide">Auto</span>
                </div>
              </div>
            </div>

            <div className={`rounded-xl border p-3.5 flex items-center gap-4 ${activeProvider === 'dhl' ? 'bg-white border-slate-200' : 'bg-white/50 border-slate-200'}`}>
              <div className="flex-1">
                <span className="text-[9px] block text-slate-400 font-black uppercase tracking-wide">Facturable</span>
                <span className={`text-sm font-black ${activeProvider === 'dhl' ? 'text-slate-700' : 'text-slate-400'}`}>{dhlResults.chargeableWeight ? Number(dhlResults.chargeableWeight).toFixed(2) : "0.00"} kg</span>
              </div>
              <div className="flex-1 text-right">
                <span className="text-[9px] block text-slate-400 font-black uppercase tracking-wide">Costo estimado</span>
                <span className={`text-lg font-black ${activeProvider === 'dhl' ? 'text-slate-900' : 'text-slate-400'}`}>${dhlResults.totalUsd ? dhlResults.totalUsd.toFixed(2) : "0.00"}</span>
              </div>
              <button
                type="button"
                disabled={!(dhlResults.totalUsd > 0)}
                onClick={() => {
                  setFlete(Number(dhlResults.totalUsd.toFixed(2)));
                  setAppliedProvider('dhl');
                }}
                className={`${appliedProvider === 'dhl' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-[10px] font-black px-4 py-2.5 rounded-lg uppercase tracking-wide transition-colors shrink-0`}
                title="Aplicar como Flete Aéreo"
              >
                {appliedProvider === 'dhl' ? 'Aplicado' : 'Aplicar'}
              </button>
            </div>
          </div>

          {/* Cotizador QS USA */}
          <div className={`p-6 transition-all duration-200 ${activeProvider === 'qs' ? 'bg-blue-50 ring-2 ring-inset ring-blue-200' : 'bg-slate-100/80 hover:bg-slate-100'}`}>
            <div
              className="flex items-center gap-3 mb-5 cursor-pointer group"
              onClick={() => seleccionarProvider('qs')}
              role="radio"
              aria-checked={activeProvider === 'qs'}
              tabIndex={0}
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${activeProvider === 'qs' ? 'border-blue-600' : 'border-slate-300 group-hover:border-slate-400'}`}>
                {activeProvider === 'qs' && <span className="w-2 h-2 rounded-full bg-blue-600" />}
              </span>
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center overflow-hidden shrink-0 transition-colors ${activeProvider === 'qs' ? 'bg-white border-slate-200' : 'bg-slate-200/70 border-slate-200'}`}>
                <img src="/quickshipping.png" alt="QS" className="w-8 h-auto object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-xs font-black uppercase tracking-wide ${activeProvider === 'qs' ? 'text-slate-800' : 'text-slate-400'}`}>QS USA</h4>
                <p className={`text-[10px] font-semibold ${activeProvider === 'qs' ? 'text-slate-400' : 'text-slate-400/70'}`}>Tarifa por libra, mínimo $10.00</p>
              </div>
              {activeProvider === 'qs' && (
                <span className="bg-blue-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded-full shrink-0">En uso</span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 mb-3">
              <div className="flex flex-col max-w-[calc(50%-0.375rem)]">
                <label className={`text-[10px] font-black uppercase mb-1 ${activeProvider === 'qs' ? 'text-slate-500' : 'text-slate-400'}`}>Peso base (lbs)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`p-2.5 border rounded-lg font-bold outline-none text-sm transition-shadow ${activeProvider === 'qs' ? 'bg-white border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10' : 'bg-white/60 border-slate-200 text-slate-500'}`}
                  value={qsWeight}
                  onChange={handleNumericInput(setQsWeight)}
                  onFocus={(e) => e.target.select()}
                />
              </div>
            </div>

            <div className={`rounded-xl border p-3.5 flex items-center gap-4 ${activeProvider === 'qs' ? 'bg-white border-slate-200' : 'bg-white/50 border-slate-200'}`}>
              <div className="flex-1">
                <span className="text-[9px] block text-slate-400 font-black uppercase tracking-wide">Tarifa aplicada</span>
                <span className={`text-sm font-black ${activeProvider === 'qs' ? 'text-slate-700' : 'text-slate-400'}`}>{parseFloat(qsWeight) > 10 ? '$2.80 / lb' : 'Mínimo fijo'}</span>
              </div>
              <div className="flex-1 text-right">
                <span className="text-[9px] block text-slate-400 font-black uppercase tracking-wide">Costo estimado</span>
                <span className={`text-lg font-black ${activeProvider === 'qs' ? 'text-slate-900' : 'text-slate-400'}`}>${qsResults.totalUsd ? qsResults.totalUsd.toFixed(2) : "0.00"}</span>
              </div>
              <button
                type="button"
                disabled={!(qsResults.totalUsd > 0)}
                onClick={() => {
                  setFlete(Number(qsResults.totalUsd.toFixed(2)));
                  setAppliedProvider('qs');
                }}
                className={`${appliedProvider === 'qs' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-[10px] font-black px-4 py-2.5 rounded-lg uppercase tracking-wide transition-colors shrink-0`}
                title="Aplicar como Flete Aéreo"
              >
                {appliedProvider === 'qs' ? 'Aplicado' : 'Aplicar'}
              </button>
            </div>
          </div>

        </div>
        </div>
        </div>
      </div>

      {/* Cabecera de Tabla con Toggle Picard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 mt-2">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Productos de la Solicitud</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {mostrarPicard && (
            <div ref={costosPicardRef} className={`relative overflow-hidden rounded-xl border transition-all duration-300 ease-out ${costosPicardExpandidos ? 'w-[18.5rem] border-amber-300 bg-amber-50 shadow-sm' : 'w-32 border-amber-200 bg-amber-50/70'}`}>
              {!costosPicardExpandidos ? (
                <button type="button" onClick={() => setCostosPicardExpandidos(true)} className="w-full px-3 py-2 text-[9px] font-black uppercase tracking-wide text-amber-700 transition-colors hover:bg-amber-100">
                  Otros Gastos Picard
                </button>
              ) : (
                <div className="flex items-end gap-2 p-2 animate-in fade-in zoom-in-95 duration-200">
                  <label className="min-w-0 flex-1 text-[8px] font-black uppercase tracking-wide text-amber-700">
                    Flete Aéreo ($)
                    <input type="number" min="0" step="0.01" disabled={esSoloLectura} value={fletePicard} placeholder="0.00" onChange={handleNumericInput(setFletePicard)} onFocus={(e) => e.target.select()} onKeyDown={(e) => { if (e.key === 'Enter' && fletePicard !== '' && aduanaPicard !== '') setCostosPicardExpandidos(false); }} className="mt-1 w-full border-b border-amber-300 bg-transparent py-1 text-sm font-black text-amber-800 outline-none focus:border-amber-600 disabled:opacity-70" />
                  </label>
                  <label className="min-w-0 flex-1 text-[8px] font-black uppercase tracking-wide text-amber-700">
                    Aduana Aérea ($)
                    <input type="number" min="0" step="0.01" disabled={esSoloLectura} value={aduanaPicard} placeholder="0.00" onChange={handleNumericInput(setAduanaPicard)} onFocus={(e) => e.target.select()} onKeyDown={(e) => { if (e.key === 'Enter' && fletePicard !== '' && aduanaPicard !== '') setCostosPicardExpandidos(false); }} className="mt-1 w-full border-b border-amber-300 bg-transparent py-1 text-sm font-black text-amber-800 outline-none focus:border-amber-600 disabled:opacity-70" />
                  </label>
                </div>
              )}
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-100 hover:bg-slate-200/80 px-3 sm:px-4 py-2 rounded-xl border border-slate-200 transition-colors">
            <input
              type="checkbox"
              checked={mostrarPicard}
              onChange={(e) => setMostrarPicard(e.target.checked)}
              className="w-4 h-4 accent-blue-600 cursor-pointer"
            />
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide">Mostrar Comparativa Picard (SKF)</span>
          </label>
        </div>
      </div>

      {/* Vista Móvil (< md): Tarjetas de Productos */}
      <div className="md:hidden space-y-4 mb-8">
        {items.map((p, idx) => {
          const currentFob = Number(p.fob || 0);
          const isSelected = p.selected;
          const fAereo = p.factorA || factorA;
          const landedA = currentFob * fAereo;
          const ventaA = landedA * Number(p.fva);
          const rentaA = ventaA > 0 ? ((ventaA - landedA) / ventaA) * 100 : 0;
          
          const fMaritimo = p.factorM || factorM;
          const landedM = currentFob * fMaritimo;
          const ventaM = landedM * Number(p.fvm);
          const rentaM = ventaM > 0 ? ((ventaM - landedM) / ventaM) * 100 : 0;

          const esSKF = p.marca?.toUpperCase() === 'SKF';
          const fobPicard = Number(p.fobPicard || 0);
          const totalFobPicard = items.reduce((acc, item) => {
            const esPicardComparable = item.selected && item.marca?.toUpperCase() === 'SKF';
            return esPicardComparable ? acc + (Number(item.fobPicard || 0) * Number(item.cant || 0)) : acc;
          }, 0);
          const factorPicard = totalFobPicard > 0
            ? (totalFobPicard + Number(fletePicard || 0) + Number(aduanaPicard || 0)) / totalFobPicard
            : 0;
          const costoEfectivo = fobPicard * factorPicard;
          const fvPicard = costoEfectivo > 0 ? (ventaA / costoEfectivo) : 0;

          const picardEsMejor = esSKF && fobPicard > 0 && fvPicard > Number(p.fva);
          const esPedidoPrevio = p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado' || (!!p.modalidad && Number(p.precioUnitario || 0) > 0);
          const isRowDisabled = esSoloLectura || esPedidoPrevio;
          const isActive = activeItemIndex === idx;

          return (
            <div
              key={idx}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isActive
                  ? 'bg-white border-emerald-400 shadow-md ring-2 ring-emerald-500/10'
                  : isSelected
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-50 border-slate-200/80 opacity-70'
              }`}
            >
              {/* Encabezado del Producto: Producto Principal (SKU) */}
              <div className="p-4 bg-white flex flex-col gap-3">
                {/* Checkbox y Status */}
                <div className="flex items-start justify-between">
                  <label className="flex items-center justify-center w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isRowDisabled}
                      onChange={(e) => {
                        updateItem(idx, 'selected', e.target.checked);
                        if (e.target.checked) setActiveItemIndex(idx);
                      }}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer disabled:opacity-50"
                    />
                  </label>
                  
                  {esPedidoPrevio && (
                    <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wide border bg-emerald-50 text-emerald-700 border-emerald-200/60">
                      <Check size={10} className="text-emerald-500" />
                      <span>Pedido</span>
                    </span>
                  )}
                </div>

                {/* Info del Producto (SKU Principal) */}
                <div className="pr-2">
                  <h4 className="font-black text-sm text-slate-800 uppercase leading-snug break-words line-clamp-2">
                    {p.desc || p.descripcion || 'Sin descripción'}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] flex-wrap">
                    <span className="font-mono font-black text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      x{p.cant}
                    </span>
                    {p.marca && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="font-bold text-blue-700 uppercase truncate italic">
                          {p.marca}
                        </span>
                      </>
                    )}
                    {Number(p.factorA) > 0 && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded uppercase truncate" title="Factor Aéreo fijado en cotización previa">
                          FA {Number(p.factorA).toFixed(2)} fijado
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Input FOB Unitario destacado y espacioso */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between mt-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
                    FOB Unitario
                  </span>
                  <div className="flex items-center bg-white border border-slate-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 rounded-lg px-2.5 py-1 transition-all shadow-xs">
                    <span className="text-xs font-bold text-slate-400 mr-1">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={isRowDisabled}
                      placeholder="0.00"
                      className="w-20 text-right font-mono font-black text-sm text-emerald-700 bg-transparent outline-none disabled:opacity-70"
                      value={p.fob}
                      onFocus={(e) => {
                        e.target.select();
                        setActiveItemIndex(idx);
                      }}
                      onChange={(e) => {
                        handleTableNumericInput(idx, 'fob', e.target.value);
                        setActiveItemIndex(idx);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Fila Financiera: Aéreo vs Marítimo en bloques limpios y con jerarquía */}
              <div className="px-3 pb-3 pt-1 grid grid-cols-2 gap-2.5 bg-white border-t border-slate-100">
                {/* Modalidad Aérea */}
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Plane size={13} className="text-emerald-600 shrink-0" />
                      <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wide">Aéreo</span>
                    </div>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${rentaA < 20 ? 'bg-red-100 text-red-700' : 'bg-emerald-200/70 text-emerald-800'}`}>
                      {rentaA > 0 ? `${rentaA.toFixed(0)}%` : '0%'}
                    </span>
                  </div>

                  <div className="text-sm sm:text-base font-black text-emerald-900 font-mono truncate">
                    {ventaA > 0 ? `$${ventaA.toFixed(2)}` : '—'}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 text-[10px]">
                    <span className="font-bold text-emerald-700/80">Factor Venta</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isRowDisabled}
                        className="w-12 text-center font-mono font-bold text-xs bg-white border border-emerald-300 rounded-md py-0.5 text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-70"
                        value={p.fva}
                        onFocus={(e) => {
                          e.target.select();
                          setActiveItemIndex(idx);
                        }}
                        onChange={(e) => {
                          handleTableNumericInput(idx, 'fva', e.target.value);
                          setActiveItemIndex(idx);
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Modalidad Marítima */}
                <div className="bg-sky-50/60 border border-sky-200/80 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Ship size={13} className="text-sky-600 shrink-0" />
                      <span className="text-[10px] font-black text-sky-900 uppercase tracking-wide">Marítimo</span>
                    </div>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${rentaM < 15 ? 'bg-red-100 text-red-700' : 'bg-sky-200/70 text-sky-800'}`}>
                      {rentaM > 0 ? `${rentaM.toFixed(0)}%` : '0%'}
                    </span>
                  </div>

                  <div className="text-sm sm:text-base font-black text-sky-900 font-mono truncate">
                    {ventaM > 0 ? `$${ventaM.toFixed(2)}` : '—'}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-sky-200/60 text-[10px]">
                    <span className="font-bold text-sky-700/80">Factor Venta</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isRowDisabled}
                        className="w-12 text-center font-mono font-bold text-xs bg-white border border-sky-300 rounded-md py-0.5 text-slate-800 outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-70"
                        value={p.fvm}
                        onFocus={(e) => {
                          e.target.select();
                          setActiveItemIndex(idx);
                        }}
                        onChange={(e) => {
                          handleTableNumericInput(idx, 'fvm', e.target.value);
                          setActiveItemIndex(idx);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fila de Utilidades / Toggle detalles */}
              <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {!esPedidoPrevio && (
                    <label className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer select-none ${
                      p.enConsulta ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-slate-500'
                    }`}>
                      <input
                        type="checkbox"
                        checked={!!p.enConsulta}
                        disabled={isRowDisabled}
                        onChange={(e) => {
                          updateItem(idx, 'enConsulta', e.target.checked);
                          setActiveItemIndex(idx);
                        }}
                        className="w-3.5 h-3.5 accent-amber-600 rounded cursor-pointer"
                      />
                      <HelpCircle size={11} className="text-amber-500 shrink-0" />
                      <span>En consulta</span>
                    </label>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => toggleItemActive(idx)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
                >
                  <span>{isActive ? 'Ocultar detalle' : 'Ver detalle'}</span>
                  {isActive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* Subpanel expandible de detalles (se abre automáticamente al manipular el ítem) */}
              {isActive && (
                <div className="p-3.5 bg-slate-50/90 border-t border-slate-200 space-y-3">
                  {/* Comparativa Picard (SKF) rediseñada con espacio amplio y sin solapamiento */}
                  {mostrarPicard && esSKF && (
                    <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Tag size={13} className="text-amber-700 shrink-0" />
                          <span className="text-[11px] font-black text-amber-900 uppercase tracking-wide">
                            Comparativa Picard (SKF)
                          </span>
                        </div>
                        {picardEsMejor && (
                          <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-tight">
                            Mejor Margen
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        {/* Input FOB Picard */}
                        <div className="bg-white border border-amber-200 rounded-lg p-2.5 shadow-2xs">
                          <span className="block text-[9px] font-bold text-slate-500 uppercase">FOB Picard ($)</span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs font-bold text-amber-700">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              disabled={isRowDisabled}
                              className="w-full font-mono font-black text-sm text-amber-800 outline-none bg-transparent"
                              value={p.fobPicard || ''}
                              placeholder="0.00"
                              onChange={(e) => handleTableNumericInput(idx, 'fobPicard', e.target.value)}
                              onFocus={(e) => {
                                e.target.select();
                                setActiveItemIndex(idx);
                              }}
                            />
                          </div>
                        </div>

                        {/* Costo Efectivo */}
                        <div className="bg-white border border-amber-200 rounded-lg p-2.5 shadow-2xs">
                          <span className="block text-[9px] font-bold text-slate-500 uppercase">Costo Landed</span>
                          <span className="block font-mono font-black text-sm text-amber-900 mt-1 truncate">
                            {costoEfectivo > 0 ? `$${costoEfectivo.toFixed(2)}` : '—'}
                          </span>
                        </div>

                        {/* Factor Venta Picard */}
                        <div className="bg-white border border-amber-200 rounded-lg p-2.5 shadow-2xs">
                          <span className="block text-[9px] font-bold text-slate-500 uppercase">Factor Venta</span>
                          <span className="block font-mono font-black text-sm text-amber-900 mt-1 truncate">
                            {fvPicard > 0 ? fvPicard.toFixed(2) : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tiempos de Entrega */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Entrega Aéreo</label>
                      <input
                        type="text"
                        disabled={isRowDisabled}
                        className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 outline-none focus:border-emerald-500"
                        placeholder="Ej: 10 d.h."
                        value={p.entregaA}
                        onChange={(e) => handleTableIntegerInput(idx, 'entregaA', e.target.value)}
                        onFocus={(e) => {
                          e.target.select();
                          setActiveItemIndex(idx);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Entrega Marítimo</label>
                      <input
                        type="text"
                        disabled={isRowDisabled}
                        className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 outline-none focus:border-sky-500"
                        placeholder="Ej: 45 d.h."
                        value={p.entregaM}
                        onChange={(e) => handleTableIntegerInput(idx, 'entregaM', e.target.value)}
                        onFocus={(e) => {
                          e.target.select();
                          setActiveItemIndex(idx);
                        }}
                      />
                    </div>
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Notas del Repuesto</label>
                    <textarea
                      disabled={isRowDisabled}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none bg-white text-slate-800 disabled:bg-slate-100 disabled:opacity-70 focus:border-emerald-500"
                      rows="2"
                      value={p.notas}
                      onChange={(e) => updateItem(idx, 'notas', e.target.value)}
                      onFocus={() => setActiveItemIndex(idx)}
                      placeholder="Observaciones de la pieza o cotización..."
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Vista Escritorio (>= md): Tabla de Productos tradicional */}
      <div className="hidden md:block bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-slate-800 text-white text-[9px] uppercase font-bold">
              <tr>
                <th className="p-3 w-10 text-center">Sel</th>
                <th className="p-3 w-48">Producto / Marca</th>
                <th className="p-3 w-12 text-center">Cant</th>
                {mostrarPicard ? (
                  <>
                    <th className="p-3 w-20 text-center bg-slate-900/40">FOB SKF</th>
                    <th className="p-3 w-24 text-center bg-emerald-900/40 font-black text-emerald-400">Venta (A)</th>
                    <th className="p-3 w-20 text-center bg-emerald-900/40">Costo SKF</th>
                    <th className="p-3 w-20 text-center bg-emerald-900/60">FV SKF</th>
                    <th className="p-3 w-20 text-center bg-amber-900/30 font-black text-amber-400">FOB Picard</th>
                    <th className="p-3 w-20 text-center bg-amber-900/40 font-black text-amber-400">Costo Picard</th>
                    <th className="p-3 w-20 text-center bg-amber-900/50 font-black text-amber-400">FV Picard</th>
                  </>
                ) : (
                  <>
                    <th className="p-3 w-20 text-center">FOB Unit</th>
                    <th className="p-3 w-24 text-center bg-emerald-900/40 font-black text-emerald-400">Venta (A)</th>
                    <th className="p-3 w-16 text-center bg-emerald-900/60">% Renta</th>
                  </>
                )}
                <th className="p-3 w-24 text-center bg-blue-900/40 font-black text-blue-400">Venta (M)</th>
                <th className="p-3 w-16 text-center bg-blue-900/60">% Renta</th>
                <th className="p-3 w-32">Entrega (A/M)</th>
                <th className="p-3 w-32">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {items.map((p, idx) => {
                const currentFob = Number(p.fob || 0);
                const isSelected = p.selected;
                
                const fAereo = p.factorA || factorA;
                const landedA = currentFob * fAereo;
                const ventaA = landedA * Number(p.fva);
                const rentaA = ventaA > 0 ? ((ventaA - landedA) / ventaA) * 100 : 0;
                
                const fMaritimo = p.factorM || factorM;
                const landedM = currentFob * fMaritimo;
                const ventaM = landedM * Number(p.fvm);
                const rentaM = ventaM > 0 ? ((ventaM - landedM) / ventaM) * 100 : 0;

                const esSKF = p.marca?.toUpperCase() === 'SKF';
                const fobPicard = Number(p.fobPicard || 0);
                const totalFobPicard = items.reduce((acc, item) => {
                  const esPicardComparable = item.selected && item.marca?.toUpperCase() === 'SKF';
                  return esPicardComparable ? acc + (Number(item.fobPicard || 0) * Number(item.cant || 0)) : acc;
                }, 0);
                const factorPicard = totalFobPicard > 0
                  ? (totalFobPicard + Number(fletePicard || 0) + Number(aduanaPicard || 0)) / totalFobPicard
                  : 0;
                const costoEfectivo = fobPicard * factorPicard;
                const fvPicard = costoEfectivo > 0 ? (ventaA / costoEfectivo) : 0;

                const picardEsMejor = esSKF && fobPicard > 0 && fvPicard > Number(p.fva);
                const skfEsMejor = esSKF && fobPicard > 0 && Number(p.fva) >= fvPicard;
                const esPedidoPrevio = p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado' || (!!p.modalidad && Number(p.precioUnitario || 0) > 0);
                const isRowDisabled = esSoloLectura || esPedidoPrevio;

                return (
                  <tr key={idx} className={`${isSelected ? (esPedidoPrevio ? 'bg-emerald-50/20' : 'bg-white') : 'bg-slate-50 opacity-60'} hover:bg-slate-50/50 transition-all`}>
                    <td className="p-2 text-center">
                      <input type="checkbox" checked={isSelected} 
                             disabled={isRowDisabled}
                             onChange={(e) => updateItem(idx, 'selected', e.target.checked)}
                             className="w-4 h-4 accent-emerald-500 cursor-pointer disabled:opacity-50" />
                    </td>
                    <td className="p-2">
                      <input type="text" className="font-bold text-slate-800 w-full outline-none bg-transparent uppercase disabled:opacity-80" 
                             disabled={isRowDisabled}
                             value={p.desc || p.descripcion} onChange={(e) => updateItem(idx, 'desc', e.target.value)}
                             onFocus={(e) => e.target.select()} />
                      <input type="text" className="text-[10px] text-blue-600 w-full outline-none bg-transparent italic font-bold disabled:opacity-80" 
                             disabled={isRowDisabled}
                             value={p.marca} onChange={(e) => updateItem(idx, 'marca', e.target.value)} placeholder="Indicar marca..."
                             onFocus={(e) => e.target.select()} />
                      {esPedidoPrevio ? (
                        <div className="mt-1">
                          <span className={`inline-flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest ${(!p.modalidad || p.modalidad === 'Aéreo') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-blue-50 text-blue-700 border border-blue-200/60'}`}>
                            <Check size={12} className={(!p.modalidad || p.modalidad === 'Aéreo') ? 'text-emerald-500' : 'text-blue-500'} />
                            <span>Confirmado</span>
                            <span className={`border-l pl-1.5 flex items-center ${(!p.modalidad || p.modalidad === 'Aéreo') ? 'border-emerald-200/80' : 'border-blue-200/80'}`}>
                              {(!p.modalidad || p.modalidad === 'Aéreo') ? <Plane size={12} /> : <Ship size={12} />}
                            </span>
                          </span>
                        </div>
                      ) : !isRowDisabled ? (
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <label className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-medium transition-colors cursor-pointer select-none ${
                            p.enConsulta
                              ? 'bg-slate-100 border-slate-300 text-slate-700 font-semibold'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500'
                          }`}>
                            <input
                              type="checkbox"
                              checked={!!p.enConsulta}
                              onChange={(e) => updateItem(idx, 'enConsulta', e.target.checked)}
                              className="w-3 h-3 accent-slate-700 rounded cursor-pointer"
                            />
                            <HelpCircle className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>En consulta</span>
                          </label>
                          {p.enConsulta && (
                            <span className="inline-flex items-center gap-1 text-[8px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-tight">
                              Sin precio (Consulta a proveedor)
                            </span>
                          )}
                        </div>
                      ) : (
                        p.enConsulta && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[8px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-tight">
                              <HelpCircle className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              En consulta con proveedor
                            </span>
                          </div>
                        )
                      )}
                      {Number(p.factorA) > 0 && (
                        <span className="mt-2 inline-flex border-l-2 border-emerald-400 pl-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          FA {Number(p.factorA).toFixed(2)} fijado
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-center font-bold">{p.cant}</td>
                    {mostrarPicard ? (
                      <>
                        {/* FOB SKF */}
                         <td className="p-2 bg-slate-50/20 text-center">
                          <input type="number" min="0" disabled={isRowDisabled} className="w-full p-1 border rounded text-center font-bold text-emerald-600 bg-white disabled:bg-slate-100 disabled:opacity-70" 
                                 value={p.fob} onChange={(e) => handleTableNumericInput(idx, 'fob', e.target.value)}
                                 onFocus={(e) => e.target.select()} />
                         </td>
                         {/* Venta (A) */}
                         <td className="p-2 text-center bg-emerald-50/20">
                           <div className="font-black text-emerald-600 text-sm">{ventaA > 0 ? `$${ventaA.toFixed(2)}` : '—'}</div>
                           <div className="flex items-center justify-center gap-1 text-[9px] mt-1">
                             <span className="text-slate-400 font-bold italic">FVA:</span>
                             <input type="number" step="0.01" min="0" disabled={isRowDisabled} className="w-8 border-b outline-none text-center bg-transparent font-bold disabled:opacity-70" value={p.fva} onChange={(e) => handleTableNumericInput(idx, 'fva', e.target.value)} onFocus={(e) => e.target.select()} />
                           </div>
                         </td>
                         {/* Costo SKF */}
                        <td className="p-2 text-center bg-emerald-50/10 font-bold text-slate-700">
                          {landedA > 0 ? `$${landedA.toFixed(2)}` : '—'}
                        </td>
                        {/* Factor Venta SKF */}
                        <td className={`p-2 text-center transition-colors ${skfEsMejor ? 'bg-emerald-100 border-x-2 border-emerald-500 text-emerald-700 font-bold' : 'bg-emerald-50/20 text-slate-700'}`}>
                           <input type="number" step="0.01" min="0" disabled={isRowDisabled} className="w-8 border-b outline-none text-center bg-transparent font-bold disabled:opacity-70" 
                                  value={p.fva} onChange={(e) => handleTableNumericInput(idx, 'fva', e.target.value)}
                                  onFocus={(e) => e.target.select()} />
                           {skfEsMejor && <div className="text-[7px] text-emerald-600 font-black uppercase mt-0.5 tracking-tighter">★ Mejor Margen</div>}
                        </td>
                        {/* FOB Picard */}
                        <td className="p-2 bg-amber-50/10 text-center">
                          {esSKF ? (
                            <input 
                              type="number" 
                              min="0" 
                              disabled={isRowDisabled}
                              className="w-full p-1 border rounded text-center font-bold text-amber-600 bg-white disabled:bg-slate-100 disabled:opacity-70" 
                              value={p.fobPicard || ''} 
                              onChange={(e) => handleTableNumericInput(idx, 'fobPicard', e.target.value)}
                              onFocus={(e) => e.target.select()}
                            />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        {/* Costo Picard */}
                        <td className="p-2 text-center bg-amber-50/20">
                          {esSKF ? (
                            <span className="font-black text-amber-700">{costoEfectivo > 0 ? `$${costoEfectivo.toFixed(2)}` : '—'}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        {/* FV Picard */}
                        <td className={`p-2 text-center transition-colors ${picardEsMejor ? 'bg-emerald-100 border-x-2 border-emerald-500 font-black text-emerald-700' : 'bg-amber-100/30 text-slate-700'}`}>
                          {esSKF && fvPicard > 0 ? (
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-black">{fvPicard.toFixed(2)}</span>
                              {picardEsMejor && <span className="text-[7px] text-emerald-600 font-bold mt-0.5 uppercase tracking-tighter">★ Mejor Margen</span>}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        {/* FOB Unit */}
                        <td className="p-2">
                          <input type="number" min="0" disabled={isRowDisabled} className="w-full p-1 border rounded text-center font-bold text-emerald-600 bg-white disabled:bg-slate-100 disabled:opacity-70" 
                                 value={p.fob} onChange={(e) => handleTableNumericInput(idx, 'fob', e.target.value)}
                                 onFocus={(e) => e.target.select()} />
                        </td>
                        {/* Venta (A) */}
                        <td className="p-2 text-center bg-emerald-50/20">
                           <div className="font-black text-emerald-600 text-sm">{ventaA > 0 ? `$${ventaA.toFixed(2)}` : '—'}</div>
                           <div className="flex items-center justify-center gap-1 text-[9px] mt-1">
                              <span className="text-slate-400 font-bold italic">FVA:</span>
                              <input type="number" step="0.01" min="0" disabled={isRowDisabled} className="w-8 border-b outline-none text-center bg-transparent font-bold disabled:opacity-70" 
                                     value={p.fva} onChange={(e) => handleTableNumericInput(idx, 'fva', e.target.value)}
                                     onFocus={(e) => e.target.select()} />
                           </div>
                        </td>
                        {/* % Renta */}
                        <td className="p-2 text-center bg-emerald-100/30">
                          <span className={`font-bold px-2 py-1 rounded-md ${rentaA < 20 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                              {rentaA > 0 ? `${rentaA.toFixed(0)}%` : '0%'}
                          </span>
                        </td>
                      </>
                    )}

                    <td className="p-2 text-center bg-blue-50/20">
                       <div className="font-black text-blue-600 text-sm">{ventaM > 0 ? `$${ventaM.toFixed(2)}` : '—'}</div>
                       <div className="flex items-center justify-center gap-1 text-[9px] mt-1">
                          <span className="text-slate-400 font-bold italic">FVM:</span>
                          <input type="number" step="0.01" min="0" disabled={isRowDisabled} className="w-8 border-b outline-none text-center bg-transparent font-bold disabled:opacity-70" 
                                 value={p.fvm} onChange={(e) => handleTableNumericInput(idx, 'fvm', e.target.value)}
                                 onFocus={(e) => e.target.select()} />
                       </div>
                    </td>
                    <td className="p-2 text-center bg-blue-100/30">
                      <span className={`font-bold px-2 py-1 rounded-md ${rentaM < 15 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'}`}>
                          {rentaM > 0 ? `${rentaM.toFixed(0)}%` : '0%'}
                      </span>
                    </td>

                    <td className="p-2">
                      <div className="flex flex-col gap-1">
                          <input type="text" disabled={isRowDisabled} className="text-[9px] border-b outline-none bg-transparent disabled:opacity-70" placeholder="Aéreo: 10 d.h." 
                                 value={p.entregaA} onChange={(e) => handleTableIntegerInput(idx, 'entregaA', e.target.value)}
                                 onFocus={(e) => e.target.select()} />
                          <input type="text" disabled={isRowDisabled} className="text-[9px] border-b outline-none bg-transparent disabled:opacity-70" placeholder="Marít: 45 d.h." 
                                 value={p.entregaM} onChange={(e) => handleTableIntegerInput(idx, 'entregaM', e.target.value)}
                                 onFocus={(e) => e.target.select()} />
                      </div>
                    </td>
                    <td className="p-2">
                      <textarea disabled={isRowDisabled} className="w-full text-[9px] border rounded p-1 h-10 outline-none bg-transparent disabled:bg-slate-100 disabled:opacity-70" 
                                value={p.notas} onChange={(e) => updateItem(idx, 'notas', e.target.value)} placeholder="Notas..."></textarea>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACCIONES INFERIORES RESPONSIVAS */}
      <div 
        className="fixed inset-x-0 bottom-[calc(3.75rem+max(0.5rem,env(safe-area-inset-bottom,0.5rem)))] md:bottom-0 bg-white/95 backdrop-blur-md p-2.5 sm:p-3 md:p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-2.5 sm:gap-3 z-30 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] md:pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))]"
      >
        <div className="flex items-center gap-2 min-w-0">
          {tienePendientesGlobales && (
            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 text-[10px] font-black uppercase truncate">
              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Ítems sin precio: Se guardará COTIZACIÓN PARCIAL.</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6">
          {(() => {
            const totals = items.reduce((acc, p) => {
              if (!p.selected) return acc;
              const currentFob = Number(p.fob || 0);
              const fA = p.factorA || factorA;
              const landedA = currentFob * fA;
              const ventaA = landedA * Number(p.fva || 1.30);
              
              const landedM = currentFob * (p.factorM || factorM);
              const ventaM = landedM * Number(p.fvm || 1.25);
              
              acc.aereo += ventaA * Number(p.cant || 0);
              acc.maritimo += ventaM * Number(p.cant || 0);
              return acc;
            }, { aereo: 0, maritimo: 0 });

            const tAconIva = totals.aereo * 1.13;
            const tMconIva = totals.maritimo * 1.13;

            return (
              <div className="flex gap-3 sm:gap-4 border-r border-slate-200 pr-3 sm:pr-6 text-xs font-bold uppercase text-slate-500">
                <div className="text-right">
                  <span className="block text-[8px] font-black text-slate-400">Aéreo (+IVA)</span>
                  <span className="text-xs sm:text-sm font-black text-blue-600">${tAconIva.toFixed(2)}</span>
                </div>
                <div className="text-right border-l border-slate-100 pl-3 sm:pl-4">
                  <span className="block text-[8px] font-black text-slate-400">Marítimo (+IVA)</span>
                  <span className="text-xs sm:text-sm font-black text-teal-600">${tMconIva.toFixed(2)}</span>
                </div>
              </div>
            );
          })()}

          {esSoloLectura ? (
            <button 
              onClick={() => navigate('/compras')} 
              className="bg-slate-900 hover:bg-emerald-600 text-white px-6 sm:px-10 py-2.5 sm:py-3 rounded-xl font-black transition-all text-xs uppercase tracking-wider shadow-lg shrink-0"
            >
              Volver
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => navigate('/compras')} className="hidden sm:inline text-slate-400 hover:text-slate-600 font-bold transition-colors text-xs px-2">Descartar</button>
              <button 
                onClick={ejecutarGuardado}
                className={`${
                  tienePendientesGlobales ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-emerald-600'
                } text-white px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl font-black transition-all flex flex-col items-center justify-center leading-none shadow-lg text-xs uppercase tracking-wide shrink-0`}
              >
                <span>{tienePendientesGlobales ? 'Guardar Parcial' : 'Finalizar y Enviar'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Sheet: Gastos Adicionales Aéreos */}
      {modalGastosMobile && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
          <div 
            className="fixed inset-0" 
            onClick={() => setModalGastosMobile(false)} 
            aria-hidden="true" 
          />
          <div className="relative bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 pb-[max(1rem,env(safe-area-inset-bottom,1rem))]">
            {/* Handle visual */}
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Gastos Adicionales</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Total Aduana: ${aduana.toFixed(2)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalGastosMobile(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Fields */}
            <div className="p-5 overflow-y-auto space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1">Trámite Aduanal</label>
                  <input type="number" min="0" disabled={esSoloLectura} className="p-2.5 border border-slate-200 rounded-xl font-bold text-sm bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-emerald-500 disabled:opacity-70" value={tramiteAduanal} onChange={handleNumericInput(setTramiteAduanal)} onFocus={(e) => e.target.select()} />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1">Scan</label>
                  <input type="number" min="0" disabled={esSoloLectura} className="p-2.5 border border-slate-200 rounded-xl font-bold text-sm bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-emerald-500 disabled:opacity-70" value={scan} onChange={handleNumericInput(setScan)} onFocus={(e) => e.target.select()} />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1">Adimex</label>
                  <input type="number" min="0" disabled={esSoloLectura} className="p-2.5 border border-slate-200 rounded-xl font-bold text-sm bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-emerald-500 disabled:opacity-70" value={adimex} onChange={handleNumericInput(setAdimex)} onFocus={(e) => e.target.select()} />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1">Manejos</label>
                  <input type="number" min="0" disabled={esSoloLectura} className="p-2.5 border border-slate-200 rounded-xl font-bold text-sm bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-emerald-500 disabled:opacity-70" value={manejos} onChange={handleNumericInput(setManejos)} onFocus={(e) => e.target.select()} />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1">Seguro</label>
                  <input type="number" min="0" disabled={esSoloLectura} className="p-2.5 border border-slate-200 rounded-xl font-bold text-sm bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-emerald-500 disabled:opacity-70" value={seguro} onChange={handleNumericInput(setSeguro)} onFocus={(e) => e.target.select()} />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1">Entrega Local</label>
                  <input type="number" min="0" disabled={esSoloLectura} className="p-2.5 border border-slate-200 rounded-xl font-bold text-sm bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-emerald-500 disabled:opacity-70" value={entregaLocal} onChange={handleNumericInput(setEntregaLocal)} onFocus={(e) => e.target.select()} />
                </div>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-black text-slate-500 uppercase mb-1">Otros Gastos</label>
                <input type="number" min="0" disabled={esSoloLectura} className="p-2.5 border border-slate-200 rounded-xl font-bold text-sm bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-emerald-500 disabled:opacity-70" value={otrosGastos} onChange={handleNumericInput(setOtrosGastos)} onFocus={(e) => e.target.select()} />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setModalGastosMobile(false)}
                  className="w-full bg-slate-900 text-white font-black py-3 rounded-xl uppercase tracking-wide text-xs shadow-md hover:bg-slate-800 transition-colors"
                >
                  Listo (Aduana: ${aduana.toFixed(2)})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Sheet: Cotizador de Flete Internacional */}
      {modalCotizadorMobile && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
          <div 
            className="fixed inset-0" 
            onClick={() => setModalCotizadorMobile(false)} 
            aria-hidden="true" 
          />
          <div className="relative bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 pb-[max(1rem,env(safe-area-inset-bottom,1rem))]">
            {/* Handle visual */}
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calculator size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Cotizador de Flete</h3>
                  <p className="text-[10px] text-slate-400 font-bold">DHL Bélgica o QuickShipping USA</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCotizadorMobile(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Selector Tabs */}
            <div className="p-4 overflow-y-auto space-y-4">
              {/* DHL Section */}
              <div className={`p-4 rounded-2xl border transition-all ${activeProvider === 'dhl' ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center">
                      <img src="/dhl.svg" alt="DHL" className="w-6 h-auto object-contain" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase">DHL Express Bélgica</h4>
                      <p className="text-[9px] text-slate-400 font-bold">Tarifa por peso volumétrico (kg)</p>
                    </div>
                  </div>
                  {appliedProvider === 'dhl' && (
                    <span className="bg-blue-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                      En uso
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Peso (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full p-2 border border-slate-200 rounded-lg font-bold text-sm bg-white text-slate-800 outline-none focus:border-blue-500"
                      value={dhlWeight}
                      onChange={handleNumericInput(setDhlWeight)}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Zona</label>
                    <div className="p-2 border border-slate-200 rounded-lg font-bold text-xs bg-slate-100 text-slate-700 h-9 flex items-center justify-between">
                      <span>Zona {dhlZoneId}</span>
                      <span className="text-[8px] text-slate-400 uppercase">Auto</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase block">Facturable</span>
                    <span className="text-xs font-black text-slate-700">{dhlResults.chargeableWeight ? Number(dhlResults.chargeableWeight).toFixed(2) : '0.00'} kg</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-black text-slate-400 uppercase block">Costo DHL</span>
                    <span className="text-base font-black text-slate-900">${dhlResults.totalUsd ? dhlResults.totalUsd.toFixed(2) : '0.00'}</span>
                  </div>
                  <button
                    type="button"
                    disabled={!(dhlResults.totalUsd > 0)}
                    onClick={() => {
                      setFlete(Number(dhlResults.totalUsd.toFixed(2)));
                      setAppliedProvider('dhl');
                      setActiveProvider('dhl');
                      setModalCotizadorMobile(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[10px] font-black px-3.5 py-2 rounded-lg uppercase tracking-wide transition-colors"
                  >
                    {appliedProvider === 'dhl' ? 'Aplicado' : 'Aplicar'}
                  </button>
                </div>
              </div>

              {/* QS USA Section */}
              <div className={`p-4 rounded-2xl border transition-all ${activeProvider === 'qs' ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center">
                      <img src="/quickshipping.png" alt="QS" className="w-6 h-auto object-contain" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase">QS USA</h4>
                      <p className="text-[9px] text-slate-400 font-bold">$2.80/lb (mínimo $10.00)</p>
                    </div>
                  </div>
                  {appliedProvider === 'qs' && (
                    <span className="bg-blue-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                      En uso
                    </span>
                  )}
                </div>

                <div className="mb-3">
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Peso (libras)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold text-sm bg-white text-slate-800 outline-none focus:border-blue-500"
                    value={qsWeight}
                    onChange={handleNumericInput(setQsWeight)}
                    onFocus={(e) => e.target.select()}
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase block">Tarifa</span>
                    <span className="text-xs font-black text-slate-700">{parseFloat(qsWeight) > 10 ? '$2.80/lb' : 'Mínimo fijo'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-black text-slate-400 uppercase block">Costo QS</span>
                    <span className="text-base font-black text-slate-900">${qsResults.totalUsd ? qsResults.totalUsd.toFixed(2) : '0.00'}</span>
                  </div>
                  <button
                    type="button"
                    disabled={!(qsResults.totalUsd > 0)}
                    onClick={() => {
                      setFlete(Number(qsResults.totalUsd.toFixed(2)));
                      setAppliedProvider('qs');
                      setActiveProvider('qs');
                      setModalCotizadorMobile(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[10px] font-black px-3.5 py-2 rounded-lg uppercase tracking-wide transition-colors"
                  >
                    {appliedProvider === 'qs' ? 'Aplicado' : 'Aplicar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

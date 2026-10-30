import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle, Ban, Calendar, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft,
  Clock, FileText, Link as LinkIcon, MessageCircleQuestion, MessageSquare, Minus, MoreVertical,
  Package, Paperclip, Pencil, Plane, Plus, Printer, Ship, ShoppingCart, Square, Tag,
  Trash2, TrendingDown, X
} from 'lucide-react';
import CotizacionDocumento from '../../../components/CotizacionDocumento';
import { StickyActionBar } from '../../../components/mobile';
import { DetalleRFQAcciones } from './DetalleRFQAcciones';
import { DetalleRFQModales } from './DetalleRFQModales';
import { DetalleRFQProductos } from './DetalleRFQProductos';
import { SeguimientoClienteBanner } from '../../../components/seguimiento/SeguimientoClienteBanner';
import { PanelCriteriosProrroga } from '../../../components/seguimiento/PanelCriteriosProrroga';
import { ContextBar } from '../../../components/detalle/ContextBar';
import './detalleRFQResponsive.css';

export const DetalleRFQVista = ({ viewModel }) => {
  const {
    renderLegacyActions,
    id,
    navigate,
    colors,
    rfq,
    enviandoPedido,
    mensajePedido,
    verPreview,
    seleccionados,
    setSeleccionados,
    linkOC,
    setLinkOC,
    notasPedido,
    setNotasPedido,
    archivosAdjuntos,
    documentacionOpen,
    setDocumentacionOpen,
    modalidadesOpen,
    setModalidadesOpen,
    modalAnulacion,
    setModalAnulacion,
    motivoAnulacionVisible,
    setMotivoAnulacionVisible,
    modalVentaPerdidaOpen,
    setModalVentaPerdidaOpen,
    itemsVentaPerdidaSeleccionados,
    setItemsVentaPerdidaSeleccionados,
    consultaVentaPerdidaData,
    setConsultaVentaPerdidaData,
    consultaDecisionData,
    setConsultaDecisionData,
    handleAnularItem,
    totalVentasPerdidasPendientes,
    esAnulado,
    motivoAnulacion,
    pedidoYaCreado,
    esPropietarioDeRFQ,
    puedeConfirmarPedido,
    totalItemsSeleccionables,
    totalItemsSeleccionados,
    puedeConfirmarOEnviar,
    seraParcial,
    hayDecisionesEnParcial,
    hayVentaPerdidaEnParcial,
    abrirConsultaDecisionParcial,
    debeMostrarBotonVentaPerdida, accionesPrincipalesRef, mostrarStickyMovil,
    productosDelPedido,
    getTextoModalidad,
    desgloseVendedor,
    totalPedidoActual,
    handleAdjuntarArchivos,
    handleEliminarArchivo,
    handleAbrirVentaPerdida,
    handleConfirmarVentaPerdidaStaged,
    abrirConsultaVentaPerdida,
    handleCrearPedido,
    handleVolver,
    itemsCotizadosCount,
    totalProductosCount,
    totalGeneralA,
    totalGeneralM,
    role,
    setVerPreview,
    modalSeguimientoClienteOpen,
    setModalSeguimientoClienteOpen,
    planSeguimientoCliente,
    handleConfirmarPlanSeguimiento,
    handleAbrirSeguimientoCliente,
    guardandoSeguimientoCliente,
    diasValidezSeguimiento,
    accionSeguimiento,
    resumenSeguimientoCliente,
  } = viewModel;

  const [accionMovilExpandida, setAccionMovilExpandida] = useState(null);
  const [opcionesMovilesAbiertas, setOpcionesMovilesAbiertas] = useState(false);
  const [stickyArrastrando, setStickyArrastrando] = useState(false);
  const [stickyPosicion, setStickyPosicion] = useState(() => ({
    x: typeof window === 'undefined' ? 16 : Math.max(8, window.innerWidth - 60),
    y: typeof window === 'undefined' ? 240 : Math.max(90, window.innerHeight - 180)
  }));
  const accionesCabeceraRef = useRef(null);
  const opcionesMovilesRef = useRef(null);
  const estadoMovilRef = useRef(null);
  const stickyDragRef = useRef(null);
  const bloquearClickStickyRef = useRef(false);

  useEffect(() => {
    const cerrarAlTocarFuera = (event) => {
      if (!accionesCabeceraRef.current?.contains(event.target) && !opcionesMovilesRef.current?.contains(event.target) && !estadoMovilRef.current?.contains(event.target)) {
        setAccionMovilExpandida(null);
        setOpcionesMovilesAbiertas(false);
      }
    };

    document.addEventListener('pointerdown', cerrarAlTocarFuera);
    return () => document.removeEventListener('pointerdown', cerrarAlTocarFuera);
  }, []);

  useEffect(() => {
    const moverSticky = (event) => {
      if (!stickyDragRef.current) return;
      const { startX, startY, originX, originY } = stickyDragRef.current;
      const maxX = Math.max(8, window.innerWidth - 52);
      const maxY = Math.max(72, window.innerHeight - 60);
      setStickyPosicion({
        x: Math.max(8, Math.min(maxX, originX + event.clientX - startX)),
        y: Math.max(72, Math.min(maxY, originY + event.clientY - startY))
      });
      stickyDragRef.current.semovio = Math.abs(event.clientX - startX) > 4 || Math.abs(event.clientY - startY) > 4;
    };

    const soltarSticky = () => {
      if (!stickyDragRef.current) return;
      const { semovio } = stickyDragRef.current;
      stickyDragRef.current = null;
      setStickyArrastrando(false);
      if (semovio) {
        bloquearClickStickyRef.current = true;
        setStickyPosicion((actual) => ({
          ...actual,
          x: actual.x + 26 < window.innerWidth / 2 ? 8 : Math.max(8, window.innerWidth - 52)
        }));
      }
    };

    document.addEventListener('pointermove', moverSticky);
    document.addEventListener('pointerup', soltarSticky);
    return () => {
      document.removeEventListener('pointermove', moverSticky);
      document.removeEventListener('pointerup', soltarSticky);
    };
  }, []);

  const iniciarArrastreSticky = (event) => {
    setStickyArrastrando(true);
    stickyDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: stickyPosicion.x,
      originY: stickyPosicion.y,
      semovio: false
    };
  };

  const opcionesMovilesCount = [
    rfq?.estado !== 'Pendiente',
    hayDecisionesEnParcial,
    hayVentaPerdidaEnParcial
  ].filter(Boolean).length;
  const alturaMenuMovil = opcionesMovilesCount * 52 + Math.max(0, opcionesMovilesCount - 1) * 8;
  const menuHaciaAbajo = stickyPosicion.y < alturaMenuMovil + 24;

  return (
    <div className="@container/rfq rfq-detail-container w-full min-w-0 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Modal Anulación */}
      {modalAnulacion.open && typeof document !== 'undefined' && createPortal((
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-lg font-black text-slate-800 mb-2">Anular Ítem</h3>
            <p className="text-sm text-slate-500 mb-4">Ingresa el motivo de la anulación. Esta acción es irreversible.</p>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all resize-none text-sm font-medium h-24 mb-4"
              placeholder="Motivo (obligatorio)..."
              value={modalAnulacion.motivo}
              onChange={e => setModalAnulacion(prev => ({...prev, motivo: e.target.value}))}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setModalAnulacion({open: false, index: null, motivo: '', enviando: false})}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAnularItem}
                disabled={modalAnulacion.enviando || !modalAnulacion.motivo.trim()}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
              >
                {modalAnulacion.enviando ? 'Anulando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {motivoAnulacionVisible !== null && typeof document !== 'undefined' && createPortal((
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-800">Motivo de anulación</h3>
              <button
                type="button"
                onClick={() => setMotivoAnulacionVisible(null)}
                aria-label="Cerrar motivo de anulación"
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>
            <div className="border-l-4 border-rose-500 px-5 py-5">
              <p className="text-sm leading-relaxed text-slate-700">
                {motivoAnulacionVisible || 'Sin motivo registrado.'}
              </p>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={() => setMotivoAnulacionVisible(null)}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      <div className="mb-4 flex flex-col gap-3 md:mb-8 md:flex-row md:items-center md:justify-between md:gap-4">
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
        <div
          ref={accionesCabeceraRef}
          onClickCapture={(event) => {
            if (window.innerWidth >= 768) return;
            const control = event.target.closest('button, [title]');
            if (!control) return;
            const esBoton = control.tagName === 'BUTTON';
            const etiqueta = (control.getAttribute('aria-label') || control.getAttribute('title') || '').toLowerCase();
            const clave = etiqueta.includes('ventas perdidas')
              ? 'consultaVP'
              : etiqueta.includes('motivos')
                ? 'consulta'
                : etiqueta.includes('cotización parcial')
                  ? 'parcial'
                  : etiqueta.includes('pedido ya generado')
                    ? 'pedidoGenerado'
                : 'exportar';
            if (!esBoton) {
              event.preventDefault();
              setAccionMovilExpandida((actual) => actual === clave ? null : clave);
              return;
            }
            if (accionMovilExpandida !== clave) {
              event.preventDefault();
              event.stopPropagation();
              setAccionMovilExpandida(clave);
            } else {
              setAccionMovilExpandida(null);
            }
          }}
          className="hidden w-full min-w-0 flex-wrap items-center justify-end gap-1.5 md:flex md:w-auto md:flex-nowrap md:gap-2"
        >
          {rfq?.estado !== 'Pendiente' && (
            <button 
              data-accion-cabecera="exportar"
              onClick={() => setVerPreview(true)}
              aria-label="Ver cotización o imprimir"
              title="Ver cotización o imprimir"
              className={`flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-slate-900 py-2 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 md:min-h-0 md:px-4 md:py-2.5 ${accionMovilExpandida === 'exportar' ? 'min-w-[6rem] px-3' : 'min-w-9 px-2.5'}`}
            >
              <Printer size={14} /> <span className="hidden md:inline">Ver Cotización / Imprimir</span><span className="sr-only md:hidden">Exportar</span>
              {accionMovilExpandida === 'exportar' && <span className="md:hidden">Exportar</span>}
            </button>
          )}
          {rfq?.estado?.includes('Parcial') && (
            <div title="Cotización parcial" className="flex min-h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-2 py-1.5 text-[10px] font-black uppercase text-white md:min-h-0 md:min-w-0 md:px-4 md:py-2">
              <AlertCircle size={14} /> <span className="hidden md:inline">Cotización Parcial</span>
              {accionMovilExpandida === 'parcial' && <span className="max-w-32 overflow-hidden whitespace-nowrap text-[9px] transition-all duration-200 md:hidden">Cotización parcial</span>}
            </div>
          )}
          {hayDecisionesEnParcial && (
            <button type="button" onClick={abrirConsultaDecisionParcial} aria-label="Consultar motivos de los ítems afectados" className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1.5 text-[9px] font-bold uppercase text-slate-600 hover:bg-slate-50 md:min-h-0 md:min-w-0 md:px-3" title="Consultar motivos de los ítems afectados">
              <MessageCircleQuestion size={14} /> <span className={`${accionMovilExpandida === 'consulta' ? 'max-w-32 opacity-100' : 'max-w-0 opacity-0'} overflow-hidden whitespace-nowrap transition-all duration-200 md:max-w-none md:opacity-100`}>Consulta</span>
            </button>
          )}
          {hayVentaPerdidaEnParcial && (
            <button type="button" onClick={() => abrirConsultaVentaPerdida()} aria-label="Consultar motivos de ventas perdidas" className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1.5 text-[9px] font-bold uppercase text-slate-600 hover:bg-slate-50 md:min-h-0 md:min-w-0 md:px-3" title="Consultar motivos de ventas perdidas">
              <TrendingDown size={14} /> <span className={`${accionMovilExpandida === 'consultaVP' ? 'max-w-32 opacity-100' : 'max-w-0 opacity-0'} overflow-hidden whitespace-nowrap transition-all duration-200 md:max-w-none md:opacity-100`}>Consulta VP</span>
            </button>
          )}
          {pedidoYaCreado && (
            <div title="Pedido ya generado" className="flex min-h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-2 py-1.5 text-[10px] font-black uppercase text-white md:min-h-0 md:min-w-0 md:px-4 md:py-2">
              <CheckCircle2 size={14} /> <span className="hidden md:inline">Pedido ya generado</span>
              {accionMovilExpandida === 'pedidoGenerado' && <span className="max-w-32 overflow-hidden whitespace-nowrap text-[9px] transition-all duration-200 md:hidden">Pedido ya generado</span>}
            </div>
          )}
        </div>
      </div>

      <SeguimientoClienteBanner
        resumen={resumenSeguimientoCliente}
        solicitud={{ ...rfq, id: rfq?.id || id }}
        role={role}
        puedeMarcarRevision={accionSeguimiento.disponible}
        onMarcarRevision={handleAbrirSeguimientoCliente}
        etiquetaAccion={accionSeguimiento.etiqueta}
        cantidadItemsAccion={accionSeguimiento.cantidad}
        prorrogaPendiente={resumenSeguimientoCliente.prorrogaPendiente}
      />
      {role === 'comprador' && (
        <PanelCriteriosProrroga solicitud={{ ...rfq, id: rfq?.id || id }} resumen={resumenSeguimientoCliente} />
      )}
      {!puedeConfirmarPedido && !pedidoYaCreado && !esAnulado && !esPropietarioDeRFQ && (
        <div className="mb-4">
          <ContextBar readOnly ownerName={rfq?.vendedorNombre || rfq?.vendedorEmail || 'otro vendedor'} />
        </div>
      )}

      {/* Resumen Móvil (< md): Metadatos y Totales Cotizados */}
      {(rfq?.estado?.includes('Parcial') || pedidoYaCreado) && (
        <div ref={estadoMovilRef} className="mb-3 flex flex-wrap items-center gap-2 md:hidden">
          {rfq?.estado?.includes('Parcial') && (
            <button type="button" onClick={() => setAccionMovilExpandida((actual) => actual === 'parcial' ? null : 'parcial')} className="flex min-h-9 items-center gap-1.5 rounded-full bg-blue-600 px-2.5 py-1.5 text-[10px] font-black uppercase text-white transition-all duration-200">
              <AlertCircle size={14} />
              <span className={`${accionMovilExpandida === 'parcial' ? 'max-w-32 opacity-100' : 'max-w-0 opacity-0'} overflow-hidden whitespace-nowrap transition-all duration-200`}>Cotización parcial</span>
            </button>
          )}
          {pedidoYaCreado && (
            <button type="button" onClick={() => setAccionMovilExpandida((actual) => actual === 'pedidoGenerado' ? null : 'pedidoGenerado')} className="flex min-h-9 items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1.5 text-[10px] font-black uppercase text-white transition-all duration-200">
              <CheckCircle2 size={14} />
              <span className={`${accionMovilExpandida === 'pedidoGenerado' ? 'max-w-32 opacity-100' : 'max-w-0 opacity-0'} overflow-hidden whitespace-nowrap transition-all duration-200`}>Pedido ya generado</span>
            </button>
          )}
        </div>
      )}

      {typeof document !== 'undefined' && createPortal((
      <div ref={opcionesMovilesRef} style={{ left: stickyPosicion.x, top: stickyPosicion.y }} className={`fixed z-40 flex flex-col items-end md:hidden ${stickyArrastrando ? '' : 'transition-[left,top] duration-300 ease-out'}`}>
        {opcionesMovilesAbiertas && (
          <div className={`absolute right-0 flex flex-col items-end gap-2 origin-bottom-right [&>button:first-child>span]:hidden animate-in duration-200 ${menuHaciaAbajo ? 'top-[calc(100%+0.75rem)] slide-in-from-top-3' : 'bottom-[calc(100%+0.75rem)] slide-in-from-bottom-3'}`}>
            {rfq?.estado !== 'Pendiente' && (
              <button type="button" aria-label="Exportar cotización" title="Exportar cotización" onClick={() => { setOpcionesMovilesAbiertas(false); setVerPreview(true); }} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-xl shadow-slate-900/15">
                <span>Exportar cotización</span><Printer size={17} className="text-slate-700" />
              </button>
            )}
            {rfq?.estado?.includes('Parcial') && (
              <div className="hidden">
                <span>Cotización parcial</span><AlertCircle size={17} />
              </div>
            )}
            {hayDecisionesEnParcial && (
              <button type="button" aria-label="Consultar motivos" title="Consultar motivos" onClick={() => { setOpcionesMovilesAbiertas(false); abrirConsultaDecisionParcial(); }} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-xl shadow-slate-900/15">
                <MessageCircleQuestion size={18} />
              </button>
            )}
            {hayVentaPerdidaEnParcial && (
              <button type="button" aria-label="Consultar ventas perdidas" title="Consultar ventas perdidas" onClick={() => { setOpcionesMovilesAbiertas(false); abrirConsultaVentaPerdida(); }} className="flex h-11 w-11 items-center justify-center gap-0.5 rounded-2xl border border-orange-200 bg-white text-orange-700 shadow-xl shadow-orange-900/15">
                <TrendingDown size={17} /><span className="text-[9px] font-black">VP</span>
              </button>
            )}
            {pedidoYaCreado && (
              <div className="hidden">
                <span>Pedido ya generado</span><CheckCircle2 size={17} />
              </div>
            )}
          </div>
        )}
        <button type="button" aria-label={opcionesMovilesAbiertas ? 'Cerrar opciones' : 'Abrir opciones'} aria-expanded={opcionesMovilesAbiertas} onPointerDown={iniciarArrastreSticky} onClick={() => { if (bloquearClickStickyRef.current) { bloquearClickStickyRef.current = false; return; } setOpcionesMovilesAbiertas((abiertas) => !abiertas); }} className={`flex h-11 w-11 touch-none items-center justify-center rounded-full text-white shadow-xl shadow-slate-900/25 transition-all duration-200 ${opcionesMovilesAbiertas ? 'rotate-90 bg-slate-700' : 'bg-slate-900'}`}>
          {opcionesMovilesAbiertas ? <X size={23} /> : <MoreVertical size={23} />}
        </button>
      </div>
      ), document.body)}

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
          <p className={`text-xs font-bold uppercase mt-0.5 line-clamp-2 break-words ${colors.text}`}>
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

      {/* Banner anulación */}
      {esAnulado && (
        <div className="mb-5 border border-slate-300 border-l-4 border-l-slate-800 rounded-r-xl px-5 py-4 bg-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Solicitud anulada · solo lectura</p>
          {motivoAnulacion ? (
            <p className="text-sm font-bold text-slate-800 leading-snug">{motivoAnulacion}</p>
          ) : (
            <p className="text-xs text-slate-400 italic">Sin motivo registrado.</p>
          )}
        </div>
      )}

      {/* Banner Venta Perdida */}
      {rfq?.estado === 'Venta Perdida' && (
        <div className="mb-5 border border-slate-300 border-l-4 border-l-slate-700 rounded-r-lg px-5 py-3.5 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
              Cotización cerrada como venta perdida
            </p>
            <p className="text-xs font-semibold text-slate-700">
              {(rfq?.productos || []).filter(p => p.estadoItem === 'Venta Perdida').length > 0
                ? `${(rfq?.productos || []).filter(p => p.estadoItem === 'Venta Perdida').length} ítems registrados como venta perdida`
                : 'Todos los ítems cerrados como venta perdida'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => abrirConsultaVentaPerdida(null)}
            className="inline-flex min-h-6 items-center gap-1 self-start sm:self-center rounded-md border border-slate-200/80 bg-white px-2.5 py-1 font-semibold text-slate-600 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 active:translate-y-px text-[10px] cursor-pointer"
            title="Consultar motivos de venta perdida"
          >
            <MessageCircleQuestion size={12} />
            <span>Consulta</span>
          </button>
        </div>
      )}

      <DetalleRFQProductos viewModel={viewModel} />

      <div className="rfq-detail-lower-grid">
        <div className="rfq-documentation-panel bg-white rounded-2xl sm:rounded-[2.5rem] border border-slate-200 shadow-sm sm:shadow-xl overflow-hidden transition-all duration-300 self-start w-full">
          <button type="button" onClick={() => setDocumentacionOpen(!documentacionOpen)} className="w-full p-4 sm:p-8 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors cursor-pointer text-left focus:outline-none">
            <h2 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2"><LinkIcon size={18} className="text-emerald-500" /> Documentación Extra</h2>
            <div className={`transform transition-transform duration-300 text-slate-400 ${documentacionOpen ? 'rotate-180' : ''}`}><ChevronDown size={20} /></div>
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
        <div className={`@container/resumen rfq-summary-panel bg-white rounded-2xl sm:rounded-[2.5rem] border border-slate-200 shadow-sm sm:shadow-xl flex-col justify-between ${puedeConfirmarPedido ? 'hidden md:flex' : 'flex'} self-start w-full`}>
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
          <DetalleRFQAcciones
            enviandoPedido={enviandoPedido}
            mensajePedido={mensajePedido}
            debeMostrarBotonVentaPerdida={debeMostrarBotonVentaPerdida}
            handleAbrirVentaPerdida={handleAbrirVentaPerdida}
            handleCrearPedido={handleCrearPedido}
            totalItemsSeleccionados={totalItemsSeleccionados}
            totalVentasPerdidasPendientes={totalVentasPerdidasPendientes}
            puedeConfirmarOEnviar={puedeConfirmarOEnviar}
            pedidoYaCreado={pedidoYaCreado}
            totalItemsSeleccionables={totalItemsSeleccionables}
            totalPedidoActual={totalPedidoActual}
          />
          {renderLegacyActions && (<div
            ref={accionesPrincipalesRef}
            className="rfq-summary-actions mt-8"
          >
            {debeMostrarBotonVentaPerdida && (
              <button
                type="button"
                onClick={() => handleAbrirVentaPerdida()}
                disabled={enviandoPedido}
                className="rfq-summary-action rfq-summary-action--secondary px-5 sm:px-6 py-4 rounded-2xl border-2 border-rose-300 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
              >
                <TrendingDown size={18} className="text-rose-600 shrink-0" />
                <span className="rfq-summary-action__label">
                  {totalItemsSeleccionados > 0
                    ? `Venta Perdida (${totalItemsSeleccionados})`
                    : 'Registrar Venta Perdida'}
                </span>
              </button>
            )}

            <button 
              onClick={handleCrearPedido}
              disabled={enviandoPedido || !puedeConfirmarOEnviar}
              className={`rfq-summary-action rfq-summary-action--primary py-4 px-5 sm:px-6 rounded-2xl font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[48px] text-xs sm:text-sm ${
                totalItemsSeleccionados === 0 && totalVentasPerdidasPendientes > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/20'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-900/20'
              }`}
            >
              {totalItemsSeleccionados === 0 && totalVentasPerdidasPendientes > 0 ? (
                <TrendingDown size={18} className="shrink-0" />
              ) : (
                <ShoppingCart size={18} className="shrink-0" />
              )}
              <span className="rfq-summary-action__label">
                {puedeConfirmarOEnviar
                  ? (enviandoPedido
                      ? (mensajePedido || 'PROCESANDO...')
                      : totalItemsSeleccionados > 0 && totalVentasPerdidasPendientes > 0
                        ? `CONFIRMAR (${totalItemsSeleccionados} PEDIDO · ${totalVentasPerdidasPendientes} VTA. PERDIDA)`
                        : totalVentasPerdidasPendientes > 0
                          ? `ENVIAR VENTAS PERDIDAS (${totalVentasPerdidasPendientes})`
                          : 'CONFIRMAR Y ENVIAR PEDIDO'
                    )
                  : (pedidoYaCreado ? 'PEDIDO YA GENERADO' : 'SOLO VISUALIZACION')}
              </span>
            </button>
          </div>
          )}
        </div></div>

      {/* Barra fija inferior en Móvil para confirmar pedido */}
      {renderLegacyActions && ((puedeConfirmarOEnviar || debeMostrarBotonVentaPerdida) && typeof document !== 'undefined' && createPortal((
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
            mostrarStickyMovil
              ? 'max-h-40 opacity-100 translate-y-0'
              : 'max-h-0 opacity-0 translate-y-6 pointer-events-none'
          }`}
          aria-hidden={!mostrarStickyMovil}
        >
          <StickyActionBar
            className={`overflow-hidden transition-all duration-300 ease-out ${
              mostrarStickyMovil
                ? 'max-h-40 opacity-100 translate-y-0'
                : 'max-h-0 opacity-0 translate-y-6 pointer-events-none p-0'
            }`}
            summary={
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                  {totalItemsSeleccionados > 0 && `${totalItemsSeleccionados} ped.`}
                  {totalItemsSeleccionados > 0 && totalVentasPerdidasPendientes > 0 && ' · '}
                  {totalVentasPerdidasPendientes > 0 && `${totalVentasPerdidasPendientes} vta. perd.`}
                  {totalItemsSeleccionados === 0 && totalVentasPerdidasPendientes === 0 && `${totalItemsSeleccionables} cotizados`}
                </div>
                <div className="text-base font-black text-slate-900">
                  ${totalPedidoActual.toFixed(2)}
                </div>
              </div>
            }
            primaryAction={
              <div className="flex items-center gap-1.5 sm:gap-2">
                {debeMostrarBotonVentaPerdida && (
                  <button
                    type="button"
                    onClick={() => handleAbrirVentaPerdida()}
                    disabled={enviandoPedido}
                    className="border border-rose-300 bg-rose-50 active:bg-rose-100 text-rose-700 px-2.5 py-2.5 sm:px-3 sm:py-3 rounded-xl flex items-center justify-center gap-1 active:scale-95 shadow-xs font-black text-xs whitespace-nowrap cursor-pointer disabled:opacity-50 shrink-0 min-h-[48px]"
                    title={totalItemsSeleccionados > 0 ? `Registrar Venta Perdida (${totalItemsSeleccionados} sel.)` : "Registrar Venta Perdida"}
                  >
                    <TrendingDown size={15} className="text-rose-600 shrink-0" />
                    <span className="hidden xs:inline">
                      {totalItemsSeleccionados > 0
                        ? `Vta. Perdida (${totalItemsSeleccionados})`
                        : 'Vta. Perdida'}
                    </span>
                    <span className="xs:hidden">
                      {totalItemsSeleccionados > 0
                        ? `Perdida (${totalItemsSeleccionados})`
                        : 'Perdida'}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCrearPedido}
                  disabled={enviandoPedido || !puedeConfirmarOEnviar}
                  className={`active:scale-95 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 shadow-md disabled:opacity-50 whitespace-nowrap min-h-[48px] ${
                    totalItemsSeleccionados === 0 && totalVentasPerdidasPendientes > 0
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                      : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                  }`}
                >
                  {totalItemsSeleccionados === 0 && totalVentasPerdidasPendientes > 0 ? (
                    <TrendingDown size={16} />
                  ) : (
                    <ShoppingCart size={16} />
                  )}
                  <span>
                    {enviandoPedido
                      ? (mensajePedido || 'Procesando...')
                      : totalItemsSeleccionados > 0 && totalVentasPerdidasPendientes > 0
                        ? `Confirmar (${totalItemsSeleccionados} + ${totalVentasPerdidasPendientes} VP)`
                        : totalVentasPerdidasPendientes > 0
                          ? `Enviar VP (${totalVentasPerdidasPendientes})`
                          : 'Confirmar'}
                  </span>
                </button>
              </div>
            }
          />
        </div>
      ), document.body))}

      {/* Modal de Vista Previa y Exportación */}
      {verPreview && typeof document !== 'undefined' && createPortal((
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-100 rounded-2xl sm:rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
            <div className="bg-slate-900 px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between text-white">
              <div>
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento Oficial</p>
                <h3 className="text-sm sm:lg font-black tracking-tight uppercase">Vista Previa de Cotización</h3>
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
      ), document.body)}

      {typeof document !== 'undefined' && createPortal(<DetalleRFQModales
        id={id}
        rfq={rfq}
        modalVentaPerdidaOpen={modalVentaPerdidaOpen}
        setModalVentaPerdidaOpen={setModalVentaPerdidaOpen}
        itemsVentaPerdidaSeleccionados={itemsVentaPerdidaSeleccionados}
        setItemsVentaPerdidaSeleccionados={setItemsVentaPerdidaSeleccionados}
        handleConfirmarVentaPerdidaStaged={handleConfirmarVentaPerdidaStaged}
        handleVentaPerdidaExito={() => {
          setSeleccionados({});
          setItemsVentaPerdidaSeleccionados(null);
          navigate('/vendedor');
        }}
        consultaVentaPerdidaData={consultaVentaPerdidaData}
        setConsultaVentaPerdidaData={setConsultaVentaPerdidaData}
        consultaDecisionData={consultaDecisionData}
        setConsultaDecisionData={setConsultaDecisionData}
        modalSeguimientoClienteOpen={modalSeguimientoClienteOpen}
        setModalSeguimientoClienteOpen={setModalSeguimientoClienteOpen}
        planSeguimientoCliente={planSeguimientoCliente}
        handleConfirmarPlanSeguimiento={handleConfirmarPlanSeguimiento}
        guardandoSeguimientoCliente={guardandoSeguimientoCliente}
        diasValidezSeguimiento={diasValidezSeguimiento}
      />, document.body)}
    </div>
  );
};

export default DetalleRFQVista;

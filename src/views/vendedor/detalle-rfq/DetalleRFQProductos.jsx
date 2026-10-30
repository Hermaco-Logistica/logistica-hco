import React from 'react';
import { Ban, CheckCircle2, CheckSquare, Clock, MessageCircleQuestion, MessageSquare, Minus, Package, Pencil, Plane, Plus, Ship, Square, Tag, TrendingDown, X } from 'lucide-react';
import { crearContextoProducto } from './productoContext';
import { SeguimientoItemCondicion } from '../../../components/seguimiento/SeguimientoItemCondicion';

/** Props: viewModel contiene los datos y handlers del flujo de detalle RFQ. */
export const DetalleRFQProductos = ({ viewModel }) => {
  const { rfq, seleccionados, setSeleccionados, contraOfertas, setContraOfertas, enviandoContraOferta, modalidades, setModalidades, setModalAnulacion, setMotivoAnulacionVisible, editandoCant, setEditandoCant, ventasPerdidasPendientes, handleGuardarCant, enviarContraOferta, esItemYaPedido, esItemVentaPerdida, esItemDenegado, esItemAnulado, esVentaPerdida, puedeConfirmarPedido, puedeRegistrarVentaPerdida, obtenerFechaEstimada, handleAbrirVentaPerdida, handleCancelarVentaPerdidaPendiente, abrirConsultaVentaPerdida, role, obtenerPropsSeguimientoItem } = viewModel;
  const productos = rfq?.productos || [];
  // Solo ítems cotizados y aún abiertos tienen vigencia que seguir.
  const propsSeguimiento = (producto, indice, contexto) => {
    const abierto = contexto.estaCotizado && !contexto.yaFuePedido && !contexto.stagedVP
      && !contexto.fueVentaPerdida && !contexto.fueDenegado && !contexto.estaAnulado;
    const props = abierto ? obtenerPropsSeguimientoItem(producto, indice) : null;
    return props?.detalle ? props : null;
  };
  const mostrarColumnaAcciones = productos.some((producto, indice) => {
    const contexto = crearContextoProducto({
      producto,
      indice,
      rfq,
      ventasPerdidasPendientes,
      seleccionados,
      esItemYaPedido,
      esItemVentaPerdida,
      esItemDenegado,
      esItemAnulado
    });
    const puedeAnular = role === 'comprador'
      && ['Cotizado', 'Pedido'].includes(producto.estadoItem)
      && !producto.numOC
      && !contexto.estaAnulado;
    const puedeConsultarMotivo = role === 'comprador'
      && contexto.estaAnulado
      && Boolean(producto.motivoAnulacion);
    const puedeGestionarVentaPerdida = puedeRegistrarVentaPerdida
      && (contexto.stagedVP || (!contexto.yaFuePedido && !contexto.fueDenegado && !contexto.fueVentaPerdida && !contexto.estaAnulado));

    return puedeAnular || puedeConsultarMotivo || puedeGestionarVentaPerdida;
  });

  return (
    <>
      {/* Vista Móvil (< md): Tarjetas de Productos */}
      <div className="rfq-products-mobile space-y-3.5 mb-8">
        {rfq?.productos?.map((p, idx) => {
          const {
            estaCotizado,
            yaFuePedido,
            stagedVP,
            fueVentaPerdida,
            fueDenegado,
            estaAnulado,
            ventaA,
            ventaM,
            isSelected
          } = crearContextoProducto({
            producto: p,
            indice: idx,
            rfq,
            ventasPerdidasPendientes,
            seleccionados,
            esItemYaPedido,
            esItemVentaPerdida,
            esItemDenegado,
            esItemAnulado
          });

          return (
            <div
              key={idx}
              className={`bg-white rounded-2xl p-4 border transition-all relative touch-manipulation active:scale-[0.98] ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                  : yaFuePedido
                  ? 'border-emerald-200 shadow-sm'
                  : stagedVP
                  ? 'border-rose-300 ring-2 ring-rose-400/20 bg-rose-50/20 shadow-sm'
                  : (fueVentaPerdida || fueDenegado)
                  ? 'border-rose-100 bg-rose-50/10'
                  : 'border-slate-100 hover:shadow-md hover:border-slate-200'
              } ${(!estaCotizado || estaAnulado || fueVentaPerdida || fueDenegado) ? 'opacity-70' : ''}`}
            >
              {/* Header: Checkbox (Izq) y Status (Der) */}
              <div className="flex items-start justify-between mb-1.5 gap-2">
                <div className="flex items-center gap-2">
                  {yaFuePedido ? (
                    <div className="w-6 h-6 rounded bg-emerald-500 text-white flex items-center justify-center shadow-xs" title="Ítem ya pedido">
                      <CheckCircle2 size={14} />
                    </div>
                  ) : stagedVP ? (
                    <div className="w-6 h-6 rounded bg-rose-50 border border-rose-300 text-rose-700 flex items-center justify-center shadow-xs" title="Venta Perdida por enviar">
                      <TrendingDown size={12} />
                    </div>
                  ) : fueVentaPerdida ? (
                    <div className="w-6 h-6 rounded bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shadow-xs" title="Venta Perdida">
                      <TrendingDown size={12} />
                    </div>
                  ) : fueDenegado ? (
                    <div className="w-6 h-6 rounded bg-rose-500 text-white flex items-center justify-center shadow-xs" title="Ítem denegado">
                      <X size={14} />
                    </div>
                  ) : estaCotizado && !esVentaPerdida && !estaAnulado ? (
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

                <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                  {stagedVP ? (
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-sm">
                        <TrendingDown size={11} />
                        <span>Por enviar</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => abrirConsultaVentaPerdida(p, idx)}
                        className="inline-flex min-h-6 items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-0.5 font-semibold text-slate-600 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 active:translate-y-px text-[9px] cursor-pointer"
                        title="Consultar motivo de venta perdida"
                      >
                        <MessageCircleQuestion size={11} />
                        <span>Consulta</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelarVentaPerdidaPendiente(idx)}
                        className="text-[10px] font-bold text-slate-400 hover:text-rose-600 underline cursor-pointer"
                      >
                        Deshacer
                      </button>
                    </div>
                  ) : fueVentaPerdida ? (
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-sm">
                        <TrendingDown size={11} />
                        <span>Venta Perdida</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => abrirConsultaVentaPerdida(p, idx)}
                        className="inline-flex min-h-6 items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-0.5 font-semibold text-slate-600 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 active:translate-y-px text-[9px] cursor-pointer"
                        title="Consultar motivo de venta perdida"
                      >
                        <MessageCircleQuestion size={11} />
                        <span>Consulta</span>
                      </button>
                    </div>
                  ) : estaAnulado ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-rose-500">
                      <X size={12} strokeWidth={3} />
                      <span>Anulado</span>
                    </span>
                  ) : yaFuePedido ? (
                    <span className={`inline-flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest border ${(!p.modalidad || p.modalidad === 'Aéreo') ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-blue-50 text-blue-700 border-blue-200/60'}`}>
                      <CheckCircle2 size={12} className={(!p.modalidad || p.modalidad === 'Aéreo') ? 'text-emerald-500' : 'text-blue-500'} />
                      <span>Confirmado</span>
                      <span className={`border-l pl-1.5 flex items-center ${(!p.modalidad || p.modalidad === 'Aéreo') ? 'border-emerald-200/80' : 'border-blue-200/80'}`}>
                        {(!p.modalidad || p.modalidad === 'Aéreo') ? <Plane size={12} /> : <Ship size={12} />}
                      </span>
                    </span>
                  ) : fueDenegado ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-sm">
                      <X size={11} />
                      <span>Denegado</span>
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

                  {puedeRegistrarVentaPerdida && !yaFuePedido && !fueDenegado && !fueVentaPerdida && !estaAnulado && !stagedVP && (
                    <button
                      type="button"
                      onClick={() => handleAbrirVentaPerdida([idx])}
                      className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-md transition-colors shadow-2xs cursor-pointer"
                      title="Registrar Venta Perdida"
                    >
                      <TrendingDown size={11} />
                      <span>VP</span>
                    </button>
                  )}

                  {estaAnulado && p.motivoAnulacion && (
                    <button
                      type="button"
                      onClick={() => setMotivoAnulacionVisible(p.motivoAnulacion)}
                      className="mt-0.5 inline-flex text-[9px] font-bold text-slate-500 underline transition-colors hover:text-slate-800"
                    >
                      Ver motivo
                    </button>
                  )}

                  {role === 'comprador' && ['Cotizado', 'Pedido'].includes(p.estadoItem) && !p.numOC && !estaAnulado && (
                    <button
                      type="button"
                      title="Anular"
                      onClick={() => setModalAnulacion({ open: true, index: idx, motivo: '', enviando: false })}
                      className="ml-2 text-rose-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-full transition-all inline-flex items-center align-middle"
                    >
                      <Ban size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Body: Product Details */}
              <div className="mb-3 pr-2">
                <h4 className="font-black text-sm text-slate-800 uppercase leading-snug line-clamp-2">
                  {p.descripcion || p.desc}
                </h4>
                <div className="flex items-center justify-between mt-1.5 text-[10px]">
                  <div className="flex items-center min-w-0 pr-2">
                    {p.marca && (
                      <span className="font-bold text-blue-700 uppercase truncate italic flex items-center gap-1">
                        <Tag size={10} className="shrink-0" /> <span className="truncate">{p.marca}</span>
                      </span>
                    )}
                  </div>
                  <div className="shrink-0">
                    {rfq?.estado === 'Pendiente' && editandoCant.index === idx ? (
                      <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 shadow-inner">
                        <button onClick={(e) => { e.stopPropagation(); setEditandoCant(prev => ({ ...prev, value: Math.max(1, Number(prev.value) - 1) })); }} className="flex items-center justify-center w-8 h-8 bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-all active:scale-95"><Minus size={16}/></button>
                        
                        <input 
                          type="number" 
                          className="w-12 h-8 text-xs text-center font-black text-slate-800 outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          value={editandoCant.value}
                          onChange={(e) => setEditandoCant({ ...editandoCant, value: e.target.value })}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        <button onClick={(e) => { e.stopPropagation(); setEditandoCant(prev => ({ ...prev, value: Number(prev.value) + 1 })); }} className="flex items-center justify-center w-8 h-8 bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-all active:scale-95"><Plus size={16}/></button>

                        <div className="w-px h-6 bg-slate-200 mx-0.5"></div>
                        
                        <button onClick={(e) => { e.stopPropagation(); handleGuardarCant(idx); }} className="flex items-center justify-center w-8 h-8 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg shadow-sm transition-all active:scale-95"><CheckSquare size={16}/></button>
                        <button onClick={(e) => { e.stopPropagation(); setEditandoCant({ index: null, value: '' }); }} className="flex items-center justify-center w-8 h-8 bg-white text-rose-500 border border-slate-200 hover:bg-rose-50 rounded-lg shadow-sm transition-all active:scale-95"><X size={18}/></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-800 text-xs bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/60 shadow-xs flex items-center justify-center">
                          x{p.cant}
                        </span>
                        {rfq?.estado === 'Pendiente' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditandoCant({ index: idx, value: p.cant }); }} 
                            className="flex items-center justify-center w-8 h-8 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 rounded-full shadow-sm transition-all active:scale-95"
                            title="Editar cantidad"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {propsSeguimiento(p, idx, { estaCotizado, yaFuePedido, stagedVP, fueVentaPerdida, fueDenegado, estaAnulado }) && (
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                  <SeguimientoItemCondicion {...propsSeguimiento(p, idx, { estaCotizado, yaFuePedido, stagedVP, fueVentaPerdida, fueDenegado, estaAnulado })} className="pedido-item-seguimiento--plano" />
                </div>
              )}

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
      <div className="rfq-products-desktop bg-white rounded-3xl lg:rounded-4xl shadow-xl border border-slate-200 overflow-hidden mb-10 lg:mb-12">
        <div className="rfq-products-table-scroll overflow-x-auto">
          <table className="rfq-products-table w-full text-left border-collapse">
            <colgroup>
              <col className="w-16" />
              <col className="w-48" />
              <col className="w-[5rem]" />
              <col className="w-32" />
              <col className="w-32" />
              <col className="w-40" />
              <col className="w-48" />
              {mostrarColumnaAcciones && <col className="w-24" />}
            </colgroup>
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
                <th className="p-5 text-center">Pedir</th>
                <th className="p-5">Producto / Marca</th>
                <th className="p-5 text-center">Cant.</th>
                <th className="p-5 text-center bg-emerald-800">Venta Aéreo</th>
                <th className="p-5 text-center bg-blue-800">Venta Marítimo</th>
                <th className="p-5 text-center">Elegir Modalidad</th>
                <th className="p-5">Tiempos y Entrega</th>
                {mostrarColumnaAcciones && <th className="p-5 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="text-xs">
              {rfq?.productos?.map((p, idx) => {
                const {
                  estaCotizado,
                  yaFuePedido,
                  stagedVP,
                  fueVentaPerdida,
                  fueDenegado,
                  estaAnulado,
                  ventaA,
                  ventaM
                } = crearContextoProducto({
                  producto: p,
                  indice: idx,
                  rfq,
                  ventasPerdidasPendientes,
                  seleccionados,
                  esItemYaPedido,
                  esItemVentaPerdida,
                  esItemDenegado,
                  esItemAnulado
                });

                const seguimiento = propsSeguimiento(p, idx, { estaCotizado, yaFuePedido, stagedVP, fueVentaPerdida, fueDenegado, estaAnulado });

                return (
                  <React.Fragment key={idx}>
                  <tr className={`${seguimiento ? '' : 'border-b border-slate-100'} ${seleccionados[idx] ? 'bg-slate-50' : (yaFuePedido ? 'bg-emerald-50/20' : stagedVP ? 'bg-rose-50/30' : (fueVentaPerdida || fueDenegado) ? 'bg-rose-50/20' : 'bg-white')} hover:bg-slate-50/50 transition-colors ${(!estaCotizado || fueDenegado || fueVentaPerdida || estaAnulado) ? 'opacity-60 bg-slate-50/30' : ''}`}>
                    <td className="p-5 text-center">
                      {yaFuePedido ? (
                        <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-sm" title="Ítem ya pedido previamente">
                          <CheckCircle2 size={16} />
                        </div>
                      ) : stagedVP ? (
                        <div className="w-7 h-7 rounded-sm bg-rose-50 border border-rose-300 text-rose-700 flex items-center justify-center mx-auto shadow-xs" title="Venta Perdida por enviar">
                          <TrendingDown size={14} />
                        </div>
                      ) : fueVentaPerdida ? (
                        <div className="w-7 h-7 rounded-sm bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto shadow-xs" title="Venta Perdida">
                          <TrendingDown size={14} />
                        </div>
                      ) : fueDenegado ? (
                        <div className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center mx-auto shadow-sm" title="Ítem denegado por Compras">
                          <X size={16} />
                        </div>
                      ) : estaCotizado && !esVentaPerdida && !estaAnulado ? (
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
                      {estaAnulado ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase mt-2 tracking-widest text-rose-500">
                          <X size={12} strokeWidth={3} />
                          <span>Anulado</span>
                        </span>
                      ) : stagedVP ? (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-sm">
                            <TrendingDown size={10} />
                            <span>Por enviar</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => abrirConsultaVentaPerdida(p, idx)}
                            className="inline-flex min-h-6 items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-0.5 font-semibold text-slate-600 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 active:translate-y-px text-[9px] cursor-pointer"
                            title="Consultar motivo de venta perdida"
                          >
                            <MessageCircleQuestion size={11} />
                            <span>Consulta</span>
                          </button>
                        </div>
                      ) : fueVentaPerdida ? (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-sm">
                            <TrendingDown size={10} />
                            <span>Venta Perdida</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => abrirConsultaVentaPerdida(p, idx)}
                            className="inline-flex min-h-6 items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-0.5 font-semibold text-slate-600 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 active:translate-y-px text-[9px] cursor-pointer"
                            title="Consultar motivo de venta perdida"
                          >
                            <MessageCircleQuestion size={11} />
                            <span>Consulta</span>
                          </button>
                        </div>
                      ) : yaFuePedido ? (
                        <span className={`inline-flex items-center gap-1.5 text-[8px] px-2 py-0.5 rounded-full font-black uppercase mt-2 tracking-widest ${(!p.modalidad || p.modalidad === 'Aéreo') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-blue-50 text-blue-700 border-blue-200/60'}`}>
                          <CheckCircle2 size={10} className={(!p.modalidad || p.modalidad === 'Aéreo') ? 'text-emerald-500' : 'text-blue-500'} />
                          <span>Confirmado</span>
                          <span className={`border-l pl-1.5 flex items-center ${(!p.modalidad || p.modalidad === 'Aéreo') ? 'border-emerald-200/80' : 'border-blue-200/80'}`}>
                            {(!p.modalidad || p.modalidad === 'Aéreo') ? <Plane size={10} /> : <Ship size={10} />}
                          </span>
                        </span>
                      ) : fueDenegado ? (
                        <span className="inline-flex items-center gap-1.5 text-[8px] px-2 py-0.5 rounded-full font-black uppercase mt-2 tracking-widest bg-rose-50 text-rose-700 border border-rose-200/60">
                          <X size={10} className="text-rose-500" />
                          <span>Denegado</span>
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
                    <td className="p-5 text-center font-black text-slate-400 text-lg">
                      {rfq?.estado === 'Pendiente' && editandoCant.index === idx ? (
                        <div className="flex items-center justify-center gap-2">
                          <input 
                            type="number" 
                            className="w-16 px-2 py-1 border rounded text-sm font-bold text-slate-700 outline-none" 
                            value={editandoCant.value}
                            onChange={(e) => setEditandoCant({ ...editandoCant, value: e.target.value })}
                            autoFocus
                          />
                          <button onClick={() => handleGuardarCant(idx)} className="text-emerald-600 hover:text-emerald-700"><CheckSquare size={18}/></button>
                          <button onClick={() => setEditandoCant({ index: null, value: '' })} className="text-rose-600 hover:text-rose-700"><X size={18}/></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          {p.cant}
                          {rfq?.estado === 'Pendiente' && (
                            <button title="Editar la cantidad" onClick={(e) => { e.stopPropagation(); setEditandoCant({ index: idx, value: p.cant }); }} className="text-slate-300 hover:text-blue-500 transition-colors">
                              <Pencil size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    {rfq?.tipo === 'Pedido Manual' ? (
                      <td className="p-5 text-center bg-emerald-50/30">
                        {estaCotizado ? (
                          p.estadoItem === 'Cotizado' ? (
                            <div className="flex flex-col gap-2">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input
                                  type="number"
                                  value={contraOfertas[idx]?.fob !== undefined ? contraOfertas[idx].fob : p.fob}
                                  onChange={(e) => setContraOfertas(prev => ({ ...prev, [idx]: { ...prev[idx], fob: e.target.value } }))}
                                  className="w-24 pl-6 p-1.5 bg-white border border-emerald-300 rounded outline-none focus:border-emerald-500 font-bold text-emerald-700 text-sm mx-auto block"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-emerald-700 font-black text-base">${ventaA.toFixed(2)}</div>
                          )
                        ) : <span className="text-slate-300 italic font-bold">---</span>}
                      </td>
                    ) : (
                      <>
                        <td className="p-5 text-center bg-emerald-50/30">
                          {estaCotizado ? <><div className="text-emerald-700 font-black text-base">${ventaA.toFixed(2)}</div><div className="text-[9px] text-emerald-500 font-bold uppercase">Total: ${(ventaA * p.cant).toFixed(2)}</div></> : <span className="text-slate-300 italic font-bold">---</span>}
                        </td>
                        <td className="p-5 text-center bg-blue-50/30">
                          {estaCotizado ? <><div className="text-blue-700 font-black text-base">${ventaM.toFixed(2)}</div><div className="text-[9px] text-blue-500 font-bold uppercase">Total: ${(ventaM * p.cant).toFixed(2)}</div></> : <span className="text-slate-300 italic font-bold">---</span>}
                        </td>
                      </>
                    )}
                    <td className="p-5 text-center">
                      {yaFuePedido ? (
                        <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          {p.modalidad || 'Aéreo'}
                        </span>
                      ) : seleccionados[idx] ? (
                        rfq?.tipo === 'Pedido Manual' ? (
                          <span className="text-emerald-600 font-black uppercase text-xs">Aceptado</span>
                        ) : (
                          <select
                            value={modalidades[idx]}
                            onChange={(e) => setModalidades(prev => ({ ...prev, [idx]: e.target.value }))}
                            disabled={!puedeConfirmarPedido}
                            className="bg-slate-100 border-none rounded-lg p-2 font-black text-[10px] uppercase text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="A">Aéreo</option><option value="M">Marítimo</option>
                          </select>
                        )
                      ) : <span className="text-slate-300 italic text-[10px]">{estaCotizado ? 'Elegir para pedir' : 'Esperando'}</span>}
                    </td>
                    <td className="p-5">
                      {estaCotizado ? (
                        rfq?.tipo === 'Pedido Manual' ? (
                          <div className="flex flex-col gap-2">
                            {p.estadoItem === 'Cotizado' ? (
                              <>
                                <input
                                  type="text"
                                  value={contraOfertas[idx]?.fechaCompromiso !== undefined ? contraOfertas[idx].fechaCompromiso : (p.fechaCompromiso || p.entregaA || '')}
                                  onChange={(e) => setContraOfertas(prev => ({ ...prev, [idx]: { ...prev[idx], fechaCompromiso: e.target.value } }))}
                                  className="w-full p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-emerald-500 font-bold text-slate-700 text-sm"
                                />
                                {(contraOfertas[idx]?.fob !== undefined || contraOfertas[idx]?.fechaCompromiso !== undefined) && (
                                  <button
                                    type="button"
                                    onClick={() => enviarContraOferta(idx)}
                                    disabled={enviandoContraOferta}
                                    className="mt-1 text-[10px] uppercase font-black tracking-widest text-white bg-amber-500 hover:bg-amber-600 p-1.5 rounded-md transition-colors"
                                  >
                                    Reenviar a Compras
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="font-bold text-slate-700">{p.fechaCompromiso || p.entregaA || 'N/A'}</span>
                            )}
                          </div>
                        ) : (
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
                        )
                      ) : '—'}
                    </td>
                    {mostrarColumnaAcciones && <td className="p-5 text-center">
                      {role === 'comprador' && (
                        <>
                          {['Cotizado', 'Pedido'].includes(p.estadoItem) && !p.numOC && !estaAnulado && (
                            <button
                              type="button"
                              title="Anular"
                              onClick={() => setModalAnulacion({ open: true, index: idx, motivo: '', enviando: false })}
                              className="text-rose-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-full transition-all mx-auto block"
                            >
                              <Ban size={16} />
                            </button>
                          )}
                          {estaAnulado && p.motivoAnulacion && (
                            <button
                              type="button"
                              onClick={() => setMotivoAnulacionVisible(p.motivoAnulacion)}
                              className="text-[9px] font-bold text-slate-500 underline transition-colors hover:text-slate-800"
                            >
                              Ver motivo
                            </button>
                          )}
                        </>
                      )}
                      {puedeRegistrarVentaPerdida && (
                        <>
                          {stagedVP ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] font-bold text-rose-600 uppercase">Por enviar</span>
                              <button
                                type="button"
                                onClick={() => handleCancelarVentaPerdidaPendiente(idx)}
                                className="text-[10px] font-bold text-slate-400 hover:text-rose-600 underline cursor-pointer"
                              >
                                Deshacer
                              </button>
                            </div>
                          ) : (
                            !yaFuePedido && !fueDenegado && !fueVentaPerdida && !estaAnulado && (
                              <button
                                type="button"
                                onClick={() => handleAbrirVentaPerdida([idx])}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[9px] uppercase tracking-wide mx-auto transition-all cursor-pointer shadow-xs"
                                title="Registrar Venta Perdida"
                              >
                                <TrendingDown size={12} />
                                <span>VP</span>
                              </button>
                            )
                          )}
                        </>
                      )}
                    </td>}
                  </tr>
                  {seguimiento && (
                    <tr className="border-b border-slate-100 bg-slate-50/40">
                      <td colSpan={mostrarColumnaAcciones ? 8 : 7} className="px-5 pb-3 pt-0">
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <SeguimientoItemCondicion {...seguimiento} className="pedido-item-seguimiento--plano" />
                        </div>
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
    </>
  );
};

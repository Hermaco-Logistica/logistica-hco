import React, { useEffect } from 'react';
import { X, Loader2, PlusCircle } from 'lucide-react';

export const NuevoPedidoMobileCard = ({
  idx, p, productosLen, removeFila, updateProducto,
  intentoGuardar, errores,
  // Producto Autocomplete
  sugerenciasProducto, buscandoProducto, mostrarSugerenciasProducto, indiceSugerenciaProducto,
  setMostrarSugerenciasProducto, setIndiceSugerenciaProducto,
  updateMarcaState, buscarProductosConDebounce, manejarTeclasProducto, seleccionarSugerenciaProducto,
  setModalNuevoProd,
  // Marca Autocomplete
  sugerenciasMarca, buscandoMarca, mostrarSugerenciasMarca, indiceSugerenciaMarca,
  setMostrarSugerenciasMarca, setIndiceSugerenciaMarca,
  buscarMarcasConDebounce, manejarTeclasMarca, seleccionarSugerenciaMarca, errorMarca
}) => {
  // Ir al inicio al montar el primer ítem (cuando carga la vista)
  useEffect(() => {
    if (idx === 0) (document.querySelector('main') || window).scrollTo({ top: 0, behavior: 'instant' });
  }, [idx]);

  return (
    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3 relative">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
          Ítem #{idx + 1}
        </span>
        {productosLen > 1 && (
          <button 
            type="button"
            onClick={() => removeFila(idx)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-all font-bold"
            aria-label="Eliminar ítem"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div>
        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">
          Descripción del Repuesto
        </label>
        <div className="relative">
          <input 
            type="text" 
            required
            className={`w-full p-3 rounded-xl outline-none font-bold uppercase text-base transition-all shadow-xs ${intentoGuardar && errores?.desc ? 'border border-rose-500 bg-rose-50 text-rose-700 placeholder-rose-300' : 'bg-white border border-slate-200 text-slate-700 focus:border-emerald-500'}`}
            placeholder="SKU o nombre del ítem..."
            value={p.desc}
            onFocus={() => {
              updateMarcaState(setMostrarSugerenciasProducto, idx, true);
              if ((sugerenciasProducto || []).length > 0 && indiceSugerenciaProducto < 0) {
                updateMarcaState(setIndiceSugerenciaProducto, idx, 0);
              }
            }}
            onBlur={() =>
              setTimeout(() => {
                updateMarcaState(setMostrarSugerenciasProducto, idx, false);
                updateMarcaState(setIndiceSugerenciaProducto, idx, -1);
              }, 200)
            }
            onKeyDown={(e) => manejarTeclasProducto(e, idx)}
            onChange={(e) => {
              updateProducto(idx, 'desc', e.target.value.toUpperCase());
              updateMarcaState(setMostrarSugerenciasProducto, idx, true);
              buscarProductosConDebounce(idx, e.target.value);
            }}
          />
          {buscandoProducto && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 size={16} className="animate-spin text-slate-400" />
            </div>
          )}

          {mostrarSugerenciasProducto && String(p.desc || '').trim().length >= 1 && (
            <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1">
              {buscandoProducto && (
                <div className="px-4 py-2 flex items-center gap-2 text-xs font-medium text-slate-400 italic">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Buscando en catálogo...</span>
                </div>
              )}

              {!buscandoProducto && (sugerenciasProducto || []).length === 0 && (
                <div className="px-4 py-2 text-xs font-medium text-slate-400 italic">Sin resultados. Se guardará como texto libre.</div>
              )}

              {!buscandoProducto && (sugerenciasProducto || []).map((s, sIdx) => (
                <button
                  key={s.id}
                  type="button"
                  className={`w-full text-left px-4 py-2 transition-colors ${
                    sIdx === indiceSugerenciaProducto ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                  onMouseEnter={() => updateMarcaState(setIndiceSugerenciaProducto, idx, sIdx)}
                  onMouseDown={() => seleccionarSugerenciaProducto(idx, s)}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-black text-slate-900 tracking-tight">{s.s}</span>
                      {s.local && <span className="text-[10px] px-1.5 rounded border border-slate-200 text-slate-400 italic">local</span>}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase truncate mt-0.5">{s.n}</span>
                    <span className="text-[10px] font-medium text-slate-400 mt-0.5">{s.m} — {s.c}</span>
                  </div>
                </button>
              ))}
              {!buscandoProducto && (sugerenciasProducto || []).length === 0 && (
                <div className="p-2 border-t border-slate-100 bg-slate-50 rounded-b-lg">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded flex items-center gap-2 transition-colors"
                    onMouseDown={() => {
                      setModalNuevoProd({ isOpen: true, idx, sku: p.desc || '', producto: '', marca: p.marca || '', saving: false });
                      updateMarcaState(setMostrarSugerenciasProducto, idx, false);
                    }}
                  >
                    <PlusCircle size={14} />
                    Agregar "{p.desc}" al catálogo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-3">
        <div className="col-span-2">
          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">
            Marca / Referencia
          </label>
          <div className="relative">
            <input 
              type="text" 
              className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-blue-600 text-base italic focus:border-emerald-500 transition-all shadow-xs"
              placeholder="Marca..."
              value={p.marca}
              onFocus={() => {
                updateMarcaState(setMostrarSugerenciasMarca, idx, true);
                if ((sugerenciasMarca || []).length > 0 && indiceSugerenciaMarca < 0) {
                  updateMarcaState(setIndiceSugerenciaMarca, idx, 0);
                }
              }}
              onBlur={() =>
                setTimeout(() => {
                  updateMarcaState(setMostrarSugerenciasMarca, idx, false);
                  updateMarcaState(setIndiceSugerenciaMarca, idx, -1);
                }, 120)
              }
              onKeyDown={(e) => manejarTeclasMarca(e, idx)}
              onChange={(e) => {
                const marcaEnMayusculas = e.target.value.toUpperCase();
                updateProducto(idx, 'marca', marcaEnMayusculas);
                updateMarcaState(setMostrarSugerenciasMarca, idx, true);
                buscarMarcasConDebounce(idx, marcaEnMayusculas);
              }}
            />

            {mostrarSugerenciasMarca && String(p.marca || '').trim().length >= 2 && (
              <div className="absolute z-50 mt-2 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                {buscandoMarca && (
                  <div className="px-4 py-3 text-xs font-bold text-slate-500">Buscando marcas guardadas...</div>
                )}

                {!buscandoMarca && !errorMarca && (sugerenciasMarca || []).length === 0 && (
                  <div className="px-4 py-3 text-xs font-bold text-slate-500">No hay coincidencias. Se guardará como nueva al enviar.</div>
                )}

                {!buscandoMarca && errorMarca && (
                  <div className="px-4 py-3 text-xs font-bold text-rose-600">{errorMarca}</div>
                )}

                {!buscandoMarca && (sugerenciasMarca || []).map((s, sIdx) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`w-full text-left px-4 py-3 border-b last:border-b-0 border-slate-100 ${
                      sIdx === indiceSugerenciaMarca ? 'bg-slate-50' : 'hover:bg-slate-50'
                    }`}
                    onMouseEnter={() => updateMarcaState(setIndiceSugerenciaMarca, idx, sIdx)}
                    onMouseDown={() => seleccionarSugerenciaMarca(idx, s.nombre || '')}
                  >
                    <p className="text-sm font-black text-slate-700 uppercase">{s.nombre}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">
            Cant.
          </label>
          <input 
            type="number" 
            min="1"
            className={`w-full p-3 rounded-xl text-center font-black text-base outline-none transition-all shadow-xs ${intentoGuardar && errores?.cant ? 'border border-rose-500 bg-rose-50 text-rose-700' : 'bg-white border border-slate-200 text-slate-700 focus:border-emerald-500'}`}
            value={p.cant}
            onChange={(e) => updateProducto(idx, 'cant', parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3 border-t border-slate-100 pt-3">
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">
            Precio Venta (OC)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
            <input 
              type="number" 
              min="0" step="0.01"
              className={`w-full p-3 pl-7 rounded-xl font-black text-base outline-none transition-all shadow-xs ${intentoGuardar && errores?.precio ? 'border border-rose-500 bg-rose-50 text-rose-700 placeholder-rose-300' : 'bg-white border border-slate-200 text-emerald-700 focus:border-emerald-500'}`}
              value={p.precio || ''}
              onChange={(e) => {
                let val = parseFloat(e.target.value);
                if (val < 0) val = Math.abs(val);
                updateProducto(idx, 'precio', isNaN(val) ? '' : val);
              }}
              placeholder="0.00"
            />
          </div>
        </div>
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">
            Tiempo Entrega
          </label>
          <input 
            type="number" min="0" step="1"
            className={`w-full p-3 rounded-xl font-bold text-base outline-none transition-all shadow-xs ${intentoGuardar && errores?.tiempoEntrega ? 'border border-rose-500 bg-rose-50 text-rose-700 placeholder-rose-300' : 'bg-white border border-slate-200 text-slate-700 focus:border-emerald-500'}`}
            value={p.tiempoEntrega || ''}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              updateProducto(idx, 'tiempoEntrega', val);
            }}
            placeholder="Ej: 10"
          />
        </div>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">
          Modalidad
        </label>
        <select
          value={p.modalidad || 'Aéreo'}
          onChange={(e) => updateProducto(idx, 'modalidad', e.target.value)}
          className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-slate-700 text-sm outline-none focus:border-emerald-500 transition-all shadow-xs"
        >
          <option value="Aéreo">Aéreo</option>
          <option value="Marítimo">Marítimo</option>
        </select>
      </div>
    </div>
  );
};

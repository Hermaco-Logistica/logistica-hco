import React from 'react';

export const NuevaRFQView = ({ viewModel }) => {
  const { Loader2, PlusCircle, X, Package, StickyActionBar, ModalBloqueoCotizaciones, guardarProductoLocal, addFila, buscandoCliente, buscandoMarca, buscandoProducto, buscarMarcasConDebounce, buscarProductosConDebounce, cliente, comentariosVendedor, errorCliente, errorMarca, indiceSugerenciaActiva, indiceSugerenciaMarca, indiceSugerenciaProducto, loading, manejarTeclasCliente, manejarTeclasMarca, manejarTeclasProducto, modalNuevoProd, mostrarSugerencias, mostrarSugerenciasMarca, mostrarSugerenciasProducto, productos, removeFila, seleccionarSugerenciaCliente, seleccionarSugerenciaMarca, seleccionarSugerenciaProducto, setCliente, setComentariosVendedor, setIndiceSugerenciaActiva, setIndiceSugerenciaMarca, setIndiceSugerenciaProducto, setModalNuevoProd, setMostrarSugerencias, setMostrarSugerenciasMarca, setMostrarSugerenciasProducto, setValidez, sugerenciasCliente, sugerenciasMarca, sugerenciasProducto, updateMarcaState, updateProducto, validez, guardarRFQ } = viewModel;

  return (
    <div className="@container max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter italic">NUEVA SOLICITUD</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Detalles para el equipo de compras</p>
        </div>
        <button 
          type="button"
          onClick={() => window.history.back()} 
          className="text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest"
        >
          Cancelar
        </button>
      </div>

      <form onSubmit={guardarRFQ} className="space-y-6">
        {/* Card Cliente */}
        <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-4xl border border-slate-200 shadow-xl shadow-slate-100">
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nombre del Cliente / Empresa</label>
          <div className="relative">
            <input 
              type="text" 
              required
              className="w-full text-xl sm:text-2xl font-black outline-none border-b-4 border-slate-100 focus:border-emerald-500 transition-all pb-2 uppercase text-slate-700"
              placeholder="EJ: KIMBERLY CLARK"
              value={cliente}
              onKeyDown={manejarTeclasCliente}
              onFocus={() => {
                setMostrarSugerencias(true);
                if (sugerenciasCliente.length > 0 && indiceSugerenciaActiva < 0) {
                  setIndiceSugerenciaActiva(0);
                }
              }}
              onBlur={() =>
                setTimeout(() => {
                  setMostrarSugerencias(false);
                  setIndiceSugerenciaActiva(-1);
                }, 120)
              }
              onChange={(e) => setCliente(e.target.value)}
            />

            {mostrarSugerencias && cliente.trim().length >= 2 && (
              <div className="absolute z-20 mt-2 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {buscandoCliente && (
                  <div className="px-4 py-3 text-xs font-bold text-slate-500">Buscando clientes guardados...</div>
                )}

                {!buscandoCliente && !errorCliente && sugerenciasCliente.length === 0 && (
                  <div className="px-4 py-3 text-xs font-bold text-slate-500">No hay coincidencias. Se guardará como nuevo al enviar.</div>
                )}

                {!buscandoCliente && errorCliente && (
                  <div className="px-4 py-3 text-xs font-bold text-rose-600">{errorCliente}</div>
                )}

                {!buscandoCliente && sugerenciasCliente.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`w-full text-left px-4 py-3 border-b last:border-b-0 border-slate-100 ${
                      idx === indiceSugerenciaActiva ? 'bg-slate-50' : 'hover:bg-slate-50'
                    }`}
                    onMouseEnter={() => setIndiceSugerenciaActiva(idx)}
                    onMouseDown={() => {
                      seleccionarSugerenciaCliente(s.nombre || '');
                    }}
                  >
                    <p className="text-sm font-black text-slate-700 uppercase">{s.nombre}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Si el cliente no existe, se crea automáticamente al enviar la solicitud.
          </p>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Validez de la Oferta</label>
            <input 
              type="text" 
              required
              className="w-full text-base sm:text-lg font-bold outline-none border-b-2 border-slate-100 focus:border-emerald-500 transition-all pb-1 text-slate-700"
                      placeholder="EJ: 5 DÍAS HÁBILES, 15 DÍAS"
              value={validez}
              onChange={(e) => setValidez(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-4xl border border-slate-200 shadow-xl shadow-slate-100">
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest" htmlFor="comentarios-vendedor">
            Comentarios del Vendedor
          </label>
          <textarea
            id="comentarios-vendedor"
            rows={4}
            maxLength={2000}
            className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4 text-base md:text-sm font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
                      placeholder="Información adicional para Compras..."
            value={comentariosVendedor}
            onChange={(e) => setComentariosVendedor(e.target.value)}
          />
        </div>

        {/* Listado de Productos */}
        <div className="bg-white rounded-3xl sm:rounded-4xl border border-slate-200 shadow-xl shadow-slate-100 overflow-visible">
          <div className="p-4 sm:p-6 bg-slate-900 flex justify-between items-center rounded-t-3xl sm:rounded-t-4xl">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Items Solicitados</span>
            <button 
              type="button"
              onClick={addFila}
              className="hidden md:flex bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-900/20 items-center gap-1.5"
            >
              <PlusCircle size={14} />
              Añadir Ítem
            </button>
          </div>
          
          {/* Vista Móvil (< md): Tarjetas de Ítems */}
          <div className="p-3 sm:p-4 md:hidden space-y-4">
            {productos.map((p, idx) => (
              <div key={idx} className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3 relative">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Ítem #{idx + 1}
                  </span>
                  {productos.length > 1 && (
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
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-700 uppercase text-base focus:border-emerald-500 transition-all shadow-xs"
                      placeholder="SKU o nombre del ítem..."
                      value={p.desc}
                      onFocus={() => {
                        updateMarcaState(setMostrarSugerenciasProducto, idx, true);
                        if ((sugerenciasProducto[idx] || []).length > 0 && indiceSugerenciaProducto[idx] < 0) {
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
                    {buscandoProducto[idx] && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 size={16} className="animate-spin text-slate-400" />
                      </div>
                    )}

                    {mostrarSugerenciasProducto[idx] && String(p.desc || '').trim().length >= 1 && (
                      <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                        {buscandoProducto[idx] && (
                          <div className="px-4 py-2 flex items-center gap-2 text-xs font-medium text-slate-400 italic">
                            <Loader2 size={14} className="animate-spin" />
                            <span>Buscando en catálogo...</span>
                          </div>
                        )}

                        {!buscandoProducto[idx] && (sugerenciasProducto[idx] || []).length === 0 && (
                          <div className="px-4 py-2 text-xs font-medium text-slate-400 italic">Sin resultados. Se guardará como texto libre.</div>
                        )}

                        {!buscandoProducto[idx] && (sugerenciasProducto[idx] || []).map((s, sIdx) => (
                          <button
                            key={s.id}
                            type="button"
                            className={`w-full text-left px-4 py-2 transition-colors ${
                              sIdx === indiceSugerenciaProducto[idx] ? 'bg-slate-100' : 'hover:bg-slate-50'
                            }`}
                            onMouseEnter={() => updateMarcaState(setIndiceSugerenciaProducto, idx, sIdx)}
                            onMouseDown={() => {
                              seleccionarSugerenciaProducto(idx, s);
                            }}
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
                        {!buscandoProducto[idx] && (sugerenciasProducto[idx] || []).length === 0 && (
                          <div className="p-2 border-t border-slate-100 bg-slate-50 rounded-b-lg">
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded flex items-center gap-2 transition-colors"
                              onMouseDown={() => {
                                setModalNuevoProd({ isOpen: true, idx, sku: p.desc || '', producto: '', marca: productos[idx]?.marca || '', saving: false });
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

                <div className="grid grid-cols-3 gap-3">
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
                          if ((sugerenciasMarca[idx] || []).length > 0 && indiceSugerenciaMarca[idx] < 0) {
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

                      {mostrarSugerenciasMarca[idx] && String(p.marca || '').trim().length >= 2 && (
                        <div className="absolute z-50 mt-2 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                          {buscandoMarca[idx] && (
                            <div className="px-4 py-3 text-xs font-bold text-slate-500">Buscando marcas guardadas...</div>
                          )}

                          {!buscandoMarca[idx] && !errorMarca[idx] && (sugerenciasMarca[idx] || []).length === 0 && (
                            <div className="px-4 py-3 text-xs font-bold text-slate-500">No hay coincidencias. Se guardará como nueva al enviar.</div>
                          )}

                          {!buscandoMarca[idx] && errorMarca[idx] && (
                            <div className="px-4 py-3 text-xs font-bold text-rose-600">{errorMarca[idx]}</div>
                          )}

                          {!buscandoMarca[idx] && (sugerenciasMarca[idx] || []).map((s, sIdx) => (
                            <button
                              key={s.id}
                              type="button"
                              className={`w-full text-left px-4 py-3 border-b last:border-b-0 border-slate-100 ${
                                sIdx === indiceSugerenciaMarca[idx] ? 'bg-slate-50' : 'hover:bg-slate-50'
                              }`}
                              onMouseEnter={() => updateMarcaState(setIndiceSugerenciaMarca, idx, sIdx)}
                              onMouseDown={() => {
                                seleccionarSugerenciaMarca(idx, s.nombre || '');
                              }}
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
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-center font-black text-slate-700 text-base outline-none focus:border-emerald-500 transition-all shadow-xs"
                      value={p.cant}
                      onChange={(e) => updateProducto(idx, 'cant', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addFila}
              className="w-full py-3.5 px-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-xs"
            >
              <PlusCircle size={16} />
              Añadir Ítem
            </button>
          </div>

          {/* Vista Escritorio (>= md): Tabla tradicional */}
          <div className="p-2 hidden md:block">
            <table className="w-full">
              <thead className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                <tr>
                  <th className="p-4 text-left">Descripción del Repuesto</th>
                  <th className="p-4 text-left">Marca / Referencia</th>
                  <th className="p-4 text-center w-24">Cant.</th>
                  <th className="p-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productos.map((p, idx) => (
                  <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="p-2">
                      <div className="relative">
                        <input 
                          type="text" 
                          required
                          className="w-full p-3 bg-transparent outline-none font-bold text-slate-700 uppercase text-sm"
                          placeholder="SKU o nombre del ítem..."
                          value={p.desc}
                          onFocus={() => {
                            updateMarcaState(setMostrarSugerenciasProducto, idx, true);
                            if ((sugerenciasProducto[idx] || []).length > 0 && indiceSugerenciaProducto[idx] < 0) {
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
                        {buscandoProducto[idx] && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 size={16} className="animate-spin text-slate-400" />
                          </div>
                        )}

                        {mostrarSugerenciasProducto[idx] && String(p.desc || '').trim().length >= 1 && (
                          <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                            {buscandoProducto[idx] && (
                              <div className="px-4 py-2 flex items-center gap-2 text-xs font-medium text-slate-400 italic">
                                <Loader2 size={14} className="animate-spin" />
                                <span>Buscando en catálogo...</span>
                              </div>
                            )}

                            {!buscandoProducto[idx] && (sugerenciasProducto[idx] || []).length === 0 && (
                              <div className="px-4 py-2 text-xs font-medium text-slate-400 italic">Sin resultados. Se guardará como texto libre.</div>
                            )}

                            {!buscandoProducto[idx] && (sugerenciasProducto[idx] || []).map((s, sIdx) => (
                              <button
                                key={s.id}
                                type="button"
                                className={`w-full text-left px-4 py-2 transition-colors ${
                                  sIdx === indiceSugerenciaProducto[idx] ? 'bg-slate-100' : 'hover:bg-slate-50'
                                }`}
                                onMouseEnter={() => updateMarcaState(setIndiceSugerenciaProducto, idx, sIdx)}
                                onMouseDown={() => {
                                  seleccionarSugerenciaProducto(idx, s);
                                }}
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
                            {!buscandoProducto[idx] && (sugerenciasProducto[idx] || []).length === 0 && (
                              <div className="p-2 border-t border-slate-100 bg-slate-50 rounded-b-lg">
                                <button
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded flex items-center gap-2 transition-colors"
                                  onMouseDown={() => {
                                    setModalNuevoProd({ isOpen: true, idx, sku: p.desc || '', producto: '', marca: productos[idx]?.marca || '', saving: false });
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
                    </td>
                    <td className="p-2">
                      <div className="relative">
                        <input 
                          type="text" 
                          className="w-full p-3 bg-transparent outline-none font-bold text-blue-600 text-sm italic"
                          placeholder="Marca..."
                          value={p.marca}
                          onFocus={() => {
                            updateMarcaState(setMostrarSugerenciasMarca, idx, true);
                            if ((sugerenciasMarca[idx] || []).length > 0 && indiceSugerenciaMarca[idx] < 0) {
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

                        {mostrarSugerenciasMarca[idx] && String(p.marca || '').trim().length >= 2 && (
                          <div className="absolute z-50 mt-2 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                            {buscandoMarca[idx] && (
                              <div className="px-4 py-3 text-xs font-bold text-slate-500">Buscando marcas guardadas...</div>
                            )}

                            {!buscandoMarca[idx] && !errorMarca[idx] && (sugerenciasMarca[idx] || []).length === 0 && (
                              <div className="px-4 py-3 text-xs font-bold text-slate-500">No hay coincidencias. Se guardará como nueva al enviar.</div>
                            )}

                            {!buscandoMarca[idx] && errorMarca[idx] && (
                              <div className="px-4 py-3 text-xs font-bold text-rose-600">{errorMarca[idx]}</div>
                            )}

                            {!buscandoMarca[idx] && (sugerenciasMarca[idx] || []).map((s, sIdx) => (
                              <button
                                key={s.id}
                                type="button"
                                className={`w-full text-left px-4 py-3 border-b last:border-b-0 border-slate-100 ${
                                  sIdx === indiceSugerenciaMarca[idx] ? 'bg-slate-50' : 'hover:bg-slate-50'
                                }`}
                                onMouseEnter={() => updateMarcaState(setIndiceSugerenciaMarca, idx, sIdx)}
                                onMouseDown={() => {
                                  seleccionarSugerenciaMarca(idx, s.nombre || '');
                                }}
                              >
                                <p className="text-sm font-black text-slate-700 uppercase">{s.nombre}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        min="1"
                        className="w-full p-3 bg-slate-100 rounded-xl text-center font-black text-slate-600 outline-none focus:bg-emerald-50 focus:text-emerald-600 transition-all"
                        value={p.cant}
                        onChange={(e) => updateProducto(idx, 'cant', parseInt(e.target.value) || 1)}
                      />
                    </td>
                    <td className="p-2 text-center">
                      {productos.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => removeFila(idx)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-red-300 hover:bg-red-50 hover:text-red-500 transition-all font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <StickyActionBar
          className="mt-6"
          primaryAction={
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-4 sm:py-5 px-6 rounded-2xl sm:rounded-3xl font-black text-white uppercase tracking-[0.2em] shadow-2xl transition-all transform active:scale-[0.98] ${
                loading 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-slate-900 hover:bg-emerald-600 shadow-emerald-200'
              }`}
            >
              {loading ? 'PROCESANDO ENVÍO...' : 'ENVIAR A COMPRAS'}
            </button>
          }
        />
      </form>

      {/* Modal Agregar Producto Local */}
      {modalNuevoProd.isOpen && (
        <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />
            <div className="p-5 sm:p-6 overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
              <div className="flex justify-between items-center mb-5 sm:mb-6">
                <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase">Nuevo Producto Local</h3>
                <button 
                  type="button" 
                  onClick={() => setModalNuevoProd(prev => ({...prev, isOpen: false}))} 
                  className="text-slate-400 hover:text-slate-600 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg touch-manipulation cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código (SKU)</label>
                  <input 
                    type="text" 
                    value={modalNuevoProd.sku} 
                    onChange={e => setModalNuevoProd(prev => ({...prev, sku: e.target.value.toUpperCase()}))} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-base sm:text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                    placeholder="SKU..." 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre / Descripción</label>
                  <input 
                    type="text" 
                    value={modalNuevoProd.producto} 
                    onChange={e => setModalNuevoProd(prev => ({...prev, producto: e.target.value.toUpperCase()}))} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-base sm:text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                    placeholder="DESCRIPCIÓN..." 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Marca</label>
                  <input 
                    type="text" 
                    value={modalNuevoProd.marca} 
                    onChange={e => setModalNuevoProd(prev => ({...prev, marca: e.target.value.toUpperCase()}))} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-base sm:text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                    placeholder="MARCA..." 
                  />
                </div>
              </div>
              <div className="mt-6 sm:mt-8 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setModalNuevoProd(prev => ({...prev, isOpen: false}))} 
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 min-h-[44px] touch-manipulation cursor-pointer text-xs sm:text-sm uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  disabled={modalNuevoProd.saving || !modalNuevoProd.sku || !modalNuevoProd.producto} 
                  onClick={async () => {
                    setModalNuevoProd(prev => ({...prev, saving: true}));
                    try {
                      const nuevo = await guardarProductoLocal(modalNuevoProd.sku, modalNuevoProd.producto, modalNuevoProd.marca);
                      seleccionarSugerenciaProducto(modalNuevoProd.idx, nuevo);
                      setModalNuevoProd(prev => ({...prev, isOpen: false}));
                    } catch (e) {
                      console.error(e);
                      alert('Error guardando producto');
                    } finally {
                      setModalNuevoProd(prev => ({...prev, saving: false}));
                    }
                  }} 
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2 min-h-[44px] touch-manipulation cursor-pointer text-xs sm:text-sm uppercase tracking-wider"
                >
                  {modalNuevoProd.saving ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

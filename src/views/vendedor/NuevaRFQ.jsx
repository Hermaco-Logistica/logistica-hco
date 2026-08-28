import React, { useEffect, useRef, useState } from 'react';
import { auth } from '../../firebase';
import { serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  buscarClientesGuardados,
  guardarClienteSiNoExiste,
  normalizarNombreCliente,
} from '../../services/clientesService';
import {
  buscarMarcasGuardadas,
  guardarMarcaSiNoExiste,
  normalizarNombreMarca,
} from '../../services/marcasService';

export const NuevaRFQ = ({ onFinalizar }) => {
  const navigate = useNavigate();
  const [cliente, setCliente] = useState('');
  const [sugerenciasCliente, setSugerenciasCliente] = useState([]);
  const [indiceSugerenciaActiva, setIndiceSugerenciaActiva] = useState(-1);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [errorCliente, setErrorCliente] = useState('');
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [productos, setProductos] = useState([{ desc: '', marca: '', cant: 1 }]);
  const [sugerenciasMarca, setSugerenciasMarca] = useState([[]]);
  const [indiceSugerenciaMarca, setIndiceSugerenciaMarca] = useState([-1]);
  const [buscandoMarca, setBuscandoMarca] = useState([false]);
  const [errorMarca, setErrorMarca] = useState(['']);
  const [mostrarSugerenciasMarca, setMostrarSugerenciasMarca] = useState([false]);
  const [loading, setLoading] = useState(false);
  const [validez, setValidez] = useState('5 días hábiles');
  const debounceRef = useRef(null);
  const marcasDebounceRef = useRef([]);

  useEffect(() => {
    const termino = cliente.trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (termino.length < 2) {
      setSugerenciasCliente([]);
      setIndiceSugerenciaActiva(-1);
      setBuscandoCliente(false);
      setErrorCliente('');
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setBuscandoCliente(true);
        setErrorCliente('');
        const resultados = await buscarClientesGuardados(termino);
        setSugerenciasCliente(resultados);
        setIndiceSugerenciaActiva(resultados.length > 0 ? 0 : -1);
      } catch (error) {
        setErrorCliente('No se pudo buscar clientes guardados.');
        setSugerenciasCliente([]);
        setIndiceSugerenciaActiva(-1);
      } finally {
        setBuscandoCliente(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cliente]);

  // Añadir una nueva fila de producto
  const addFila = () => {
    setProductos([...productos, { desc: '', marca: '', cant: 1 }]);
    setSugerenciasMarca((prev) => [...prev, []]);
    setIndiceSugerenciaMarca((prev) => [...prev, -1]);
    setBuscandoMarca((prev) => [...prev, false]);
    setErrorMarca((prev) => [...prev, '']);
    setMostrarSugerenciasMarca((prev) => [...prev, false]);
  };

  // Eliminar una fila
  const removeFila = (index) => {
    const nuevos = productos.filter((_, i) => i !== index);
    setProductos(nuevos);
    if (marcasDebounceRef.current[index]) {
      clearTimeout(marcasDebounceRef.current[index]);
    }
    setSugerenciasMarca((prev) => prev.filter((_, i) => i !== index));
    setIndiceSugerenciaMarca((prev) => prev.filter((_, i) => i !== index));
    setBuscandoMarca((prev) => prev.filter((_, i) => i !== index));
    setErrorMarca((prev) => prev.filter((_, i) => i !== index));
    setMostrarSugerenciasMarca((prev) => prev.filter((_, i) => i !== index));
  };

  // Actualizar campos específicos
  const updateProducto = (index, campo, valor) => {
    const nuevos = [...productos];
    nuevos[index][campo] = valor;
    setProductos(nuevos);
  };

  const updateMarcaState = (setter, index, value) => {
    setter((prev) => {
      const next = [...prev];
      const resolved = typeof value === 'function' ? value(next[index]) : value;
      next[index] = resolved;
      return next;
    });
  };

  const seleccionarSugerenciaMarca = (index, nombre) => {
    updateProducto(index, 'marca', nombre || '');
    updateMarcaState(setMostrarSugerenciasMarca, index, false);
    updateMarcaState(setIndiceSugerenciaMarca, index, -1);
  };

  const manejarTeclasMarca = (e, index) => {
    const mostrar = mostrarSugerenciasMarca[index];
    const buscando = buscandoMarca[index];
    const sugerencias = sugerenciasMarca[index] || [];

    if (!mostrar || buscando || sugerencias.length === 0) {
      if (e.key === 'Escape') {
        updateMarcaState(setMostrarSugerenciasMarca, index, false);
        updateMarcaState(setIndiceSugerenciaMarca, index, -1);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      updateMarcaState(setIndiceSugerenciaMarca, index, (prev) => {
        const base = prev < 0 ? 0 : prev;
        return Math.min(base + 1, sugerencias.length - 1);
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      updateMarcaState(setIndiceSugerenciaMarca, index, (prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
      return;
    }

    if (e.key === 'Enter') {
      if (indiceSugerenciaMarca[index] >= 0 && indiceSugerenciaMarca[index] < sugerencias.length) {
        e.preventDefault();
        seleccionarSugerenciaMarca(index, sugerencias[indiceSugerenciaMarca[index]].nombre || '');
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      updateMarcaState(setMostrarSugerenciasMarca, index, false);
      updateMarcaState(setIndiceSugerenciaMarca, index, -1);
    }
  };

  const buscarMarcasConDebounce = (index, texto) => {
    const termino = texto.trim();

    if (marcasDebounceRef.current[index]) {
      clearTimeout(marcasDebounceRef.current[index]);
    }

    if (termino.length < 2) {
      updateMarcaState(setSugerenciasMarca, index, []);
      updateMarcaState(setIndiceSugerenciaMarca, index, -1);
      updateMarcaState(setBuscandoMarca, index, false);
      updateMarcaState(setErrorMarca, index, '');
      return;
    }

    marcasDebounceRef.current[index] = setTimeout(async () => {
      try {
        updateMarcaState(setBuscandoMarca, index, true);
        updateMarcaState(setErrorMarca, index, '');
        const resultados = await buscarMarcasGuardadas(termino);
        updateMarcaState(setSugerenciasMarca, index, resultados);
        updateMarcaState(setIndiceSugerenciaMarca, index, resultados.length > 0 ? 0 : -1);
      } catch (error) {
        updateMarcaState(setErrorMarca, index, 'No se pudo buscar marcas guardadas.');
        updateMarcaState(setSugerenciasMarca, index, []);
        updateMarcaState(setIndiceSugerenciaMarca, index, -1);
      } finally {
        updateMarcaState(setBuscandoMarca, index, false);
      }
    }, 250);
  };

  const seleccionarSugerenciaCliente = (nombre) => {
    setCliente(nombre || '');
    setMostrarSugerencias(false);
    setIndiceSugerenciaActiva(-1);
  };

  const manejarTeclasCliente = (e) => {
    if (!mostrarSugerencias || buscandoCliente || sugerenciasCliente.length === 0) {
      if (e.key === 'Escape') {
        setMostrarSugerencias(false);
        setIndiceSugerenciaActiva(-1);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceSugerenciaActiva((prev) => {
        const base = prev < 0 ? 0 : prev;
        return Math.min(base + 1, sugerenciasCliente.length - 1);
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceSugerenciaActiva((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
      return;
    }

    if (e.key === 'Enter') {
      if (indiceSugerenciaActiva >= 0 && indiceSugerenciaActiva < sugerenciasCliente.length) {
        e.preventDefault();
        seleccionarSugerenciaCliente(sugerenciasCliente[indiceSugerenciaActiva].nombre || '');
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setMostrarSugerencias(false);
      setIndiceSugerenciaActiva(-1);
    }
  };

  const guardarRFQ = async (e) => {
    e.preventDefault();
    if (!cliente || productos.some(p => !p.desc)) return alert("Llena los campos obligatorios");

    setLoading(true);
    try {
      const clienteNormalizado = normalizarNombreCliente(cliente);
      await guardarClienteSiNoExiste(clienteNormalizado, auth.currentUser);
      const marcasNormalizadas = Array.from(
        new Set(productos.map((p) => normalizarNombreMarca(p.marca)).filter(Boolean))
      );
      if (marcasNormalizadas.length > 0) {
        await Promise.all(marcasNormalizadas.map((marca) => guardarMarcaSiNoExiste(marca, auth.currentUser)));
      }

      const correlativo = `RFQ-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      // Preparamos el objeto exacto que espera la base de datos
      const dataParaGuardar = {
        cliente: clienteNormalizado,
        correlativo,
        validez,
        vendedorId: auth.currentUser.uid,
        vendedorEmail: auth.currentUser.email,
        vendedorNombre: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
        estado: 'Pendiente',
        fechaS: serverTimestamp(),
        productos: productos.map(p => ({
          ...p,
          marca: normalizarNombreMarca(p.marca),
          descripcion: p.desc, // Aseguramos compatibilidad con la calculadora
          disponible: false,
          fob: 0,
          fva: 1.30,
          fvm: 1.25,
          selected: true
        }))
      };

      // Delegamos el guardado al padre (App.jsx) para evitar el doble mensaje
      await onFinalizar(dataParaGuardar);
      navigate('/vendedor');
      
    } catch (error) {
      console.error("Error al procesar RFQ:", error);
      alert("Error crítico al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500 pb-10">
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
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-100">
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nombre del Cliente / Empresa</label>
          <div className="relative">
            <input 
              type="text" 
              required
              className="w-full text-2xl font-black outline-none border-b-4 border-slate-100 focus:border-emerald-500 transition-all pb-2 uppercase text-slate-700"
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
            Si el cliente no existe, se crea automaticamente al enviar la solicitud.
          </p>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Validez de la Oferta</label>
            <input 
              type="text" 
              required
              className="w-full text-lg font-bold outline-none border-b-2 border-slate-100 focus:border-emerald-500 transition-all pb-1 text-slate-700"
              placeholder="EJ: 5 DÍAS HÁBILES, 15 DÍAS"
              value={validez}
              onChange={(e) => setValidez(e.target.value)}
            />
          </div>
        </div>

        {/* Listado de Productos */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-100 overflow-visible">
          <div className="p-6 bg-slate-900 flex justify-between items-center rounded-t-[2rem]">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Items Solicitados</span>
            <button 
              type="button"
              onClick={addFila}
              className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-900/20"
            >
              + Añadir Item
            </button>
          </div>
          
          <div className="p-2">
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
                      <input 
                        type="text" 
                        required
                        className="w-full p-3 bg-transparent outline-none font-bold text-slate-700 uppercase text-sm"
                        placeholder="Nombre del ítem..."
                        value={p.desc}
                        onChange={(e) => updateProducto(idx, 'desc', e.target.value)}
                      />
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
                              <div className="px-4 py-3 text-xs font-bold text-slate-500">No hay coincidencias. Se guardara como nueva al enviar.</div>
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
                        onChange={(e) => updateProducto(idx, 'cant', parseInt(e.target.value))}
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

        <button 
          type="submit" 
          disabled={loading}
          className={`w-full py-5 rounded-[1.5rem] font-black text-white uppercase tracking-[0.2em] shadow-2xl transition-all transform active:scale-[0.98] ${
            loading 
              ? 'bg-slate-400 cursor-not-allowed' 
              : 'bg-slate-900 hover:bg-emerald-600 shadow-emerald-200'
          }`}
        >
          {loading ? 'PROCESANDO ENVÍO...' : 'ENVIAR A COMPRAS'}
        </button>
      </form>
    </div>
  );
};

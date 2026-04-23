import React, { useState } from 'react';
import { auth } from '../../firebase';
import { serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export const NuevaRFQ = ({ onFinalizar }) => {
  const navigate = useNavigate();
  const [cliente, setCliente] = useState('');
  const [productos, setProductos] = useState([{ desc: '', marca: '', cant: 1 }]);
  const [loading, setLoading] = useState(false);

  // Añadir una nueva fila de producto
  const addFila = () => {
    setProductos([...productos, { desc: '', marca: '', cant: 1 }]);
  };

  // Eliminar una fila
  const removeFila = (index) => {
    const nuevos = productos.filter((_, i) => i !== index);
    setProductos(nuevos);
  };

  // Actualizar campos específicos
  const updateProducto = (index, campo, valor) => {
    const nuevos = [...productos];
    nuevos[index][campo] = valor;
    setProductos(nuevos);
  };

  const guardarRFQ = async (e) => {
    e.preventDefault();
    if (!cliente || productos.some(p => !p.desc)) return alert("Llena los campos obligatorios");

    setLoading(true);
    try {
      const correlativo = `RFQ-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      // Preparamos el objeto exacto que espera la base de datos
      const dataParaGuardar = {
        cliente: cliente.toUpperCase(),
        correlativo,
        vendedorId: auth.currentUser.uid,
        vendedorEmail: auth.currentUser.email,
        vendedorNombre: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
        estado: 'Pendiente',
        fechaS: serverTimestamp(),
        productos: productos.map(p => ({
          ...p,
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
          <input 
            type="text" 
            required
            className="w-full text-2xl font-black outline-none border-b-4 border-slate-100 focus:border-emerald-500 transition-all pb-2 uppercase text-slate-700"
            placeholder="EJ: KIMBERLY CLARK"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
          />
        </div>

        {/* Listado de Productos */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-100 overflow-hidden">
          <div className="p-6 bg-slate-900 flex justify-between items-center">
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
                      <input 
                        type="text" 
                        className="w-full p-3 bg-transparent outline-none font-bold text-blue-600 text-sm italic"
                        placeholder="Marca..."
                        value={p.marca}
                        onChange={(e) => updateProducto(idx, 'marca', e.target.value)}
                      />
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
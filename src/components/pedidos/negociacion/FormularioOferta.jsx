import React from 'react';
import { Send, Plane, Ship } from 'lucide-react';

export const FormularioOferta = ({ ofertaDraft, originalOferta, onChange, onCancel, onSubmit, title = 'Ajustar / Contraofertar', disabled = false }) => {
  const isUnchanged = originalOferta && 
    Number(ofertaDraft.precio) === Number(originalOferta.precio) && 
    String(ofertaDraft.tiempoEntrega) === String(originalOferta.tiempoEntrega) && 
    ofertaDraft.modalidad === originalOferta.modalidad;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col gap-3">
      <div className="text-xs font-black text-slate-700 uppercase tracking-widest">{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Precio ($)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            value={ofertaDraft.precio !== undefined ? ofertaDraft.precio : ''}
            onChange={(e) => onChange({ ...ofertaDraft, precio: e.target.value })}
            disabled={disabled}
            onKeyDown={(e) => e.key === 'Enter' && !isUnchanged && onSubmit()}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tiempo de entrega</label>
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            value={ofertaDraft.tiempoEntrega}
            onChange={(e) => onChange({ ...ofertaDraft, tiempoEntrega: e.target.value })}
            placeholder="Ej: 5 días"
            disabled={disabled}
            onKeyDown={(e) => e.key === 'Enter' && !isUnchanged && onSubmit()}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Modalidad</label>
          <div className="relative">
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pl-8 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none appearance-none"
              value={ofertaDraft.modalidad || 'Aéreo'}
              onChange={(e) => onChange({ ...ofertaDraft, modalidad: e.target.value })}
              disabled={disabled}
            >
              <option value="Aéreo">Aéreo</option>
              <option value="Marítimo">Marítimo</option>
            </select>
            {ofertaDraft.modalidad === 'Marítimo' ? (
              <Ship size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            ) : (
              <Plane size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-1">
        <button
          onClick={onCancel}
          disabled={disabled}
          className="px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onSubmit}
          disabled={disabled || isUnchanged}
          className="px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
        >
          Enviar <Send size={12} />
        </button>
      </div>
    </div>
  );
};

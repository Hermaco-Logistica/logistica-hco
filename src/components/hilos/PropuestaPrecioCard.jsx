import React, { useState } from 'react';
import { Send, Check, X, Plane, Ship } from 'lucide-react';

const ModalidadIcon = ({ mod, className }) => {
  if (mod === 'Marítimo') return <Ship size={14} className={className} />;
  return <Plane size={14} className={className} />;
};

export const PropuestaPrecioCard = ({ mensaje, currentUser, onAceptar, onContraofertar }) => {
  const [isContra, setIsContra] = useState(false);
  const [nuevoFob, setNuevoFob] = useState(mensaje.precioPropuesto || '');
  const [tiempoEntrega, setTiempoEntrega] = useState(mensaje.tiempoEntrega || '');
  const [nota, setNota] = useState('');
  const [modalidad, setModalidad] = useState(mensaje.modalidad || 'Aéreo');

  const userSide = (currentUser?.rol === 'comprador' || currentUser?.rol === 'administrador') ? 'comprador' : 'vendedor';
  const autorSide = (mensaje.autor?.rol === 'comprador' || mensaje.autor?.rol === 'administrador') ? 'comprador' : 'vendedor';
  const esAutor = mensaje.autor?.uid ? mensaje.autor.uid === currentUser?.uid : userSide === autorSide;
  
  const estado = mensaje.estadoPropuesta || 'pendiente'; // pendiente, aceptada, contraofertada

  const handleContraofertar = () => {
    if (Number(nuevoFob) <= 0) return alert('Precio inválido');
    
    const mismoPrecio = Number(nuevoFob) === Number(mensaje.precioPropuesto);
    const mismoTiempo = (tiempoEntrega || '').trim() === (mensaje.tiempoEntrega || '').trim();
    const sinNota = (nota || '').trim() === '';
    const mismaModalidad = modalidad === (mensaje.modalidad || 'Aéreo');
    
    if (mismoPrecio && mismoTiempo && sinNota && mismaModalidad) {
      return alert('Debes proponer un precio/tiempo distinto, cambiar la modalidad o agregar una nota justificando por qué devuelves la misma propuesta.');
    }
    // signature: onContraofertar(nuevoFob, precioAnterior, nota, propuestaId, tiempoEntrega, modalidad, tiempoEntregaAnterior, modalidadAnterior)
    onContraofertar(nuevoFob, mensaje.precioPropuesto, nota, mensaje.id, tiempoEntrega, modalidad, mensaje.tiempoEntrega, mensaje.modalidad);
    setIsContra(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm w-full max-w-[280px] my-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Propuesta de precio
        </span>
        {estado === 'aceptada' && (
          <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase px-2 py-0.5 rounded">
            Aceptada
          </span>
        )}
        {estado === 'contraofertada' && (
          <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase px-2 py-0.5 rounded">
            Contraofertada
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-2">
        {Number(mensaje.precioAnterior) > 0 && Number(mensaje.precioAnterior) !== Number(mensaje.precioPropuesto) && (
          <>
            <span className="text-slate-400 line-through font-bold text-xs">
              ${Number(mensaje.precioAnterior || 0).toFixed(2)}
            </span>
            <span className="text-slate-300 font-bold text-xs">&rarr;</span>
          </>
        )}
        <span className="text-emerald-600 font-black text-lg">
          ${Number(mensaje.precioPropuesto || 0).toFixed(2)}
        </span>
        <span className="text-slate-400 font-bold text-[10px]">c/u</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        {mensaje.tiempoEntrega && (
          <div className="text-xs font-medium text-slate-500">
            <span className="bg-slate-100 px-2 py-1 rounded flex items-center gap-1.5">
              Entrega:
              {mensaje.tiempoEntregaAnterior && mensaje.tiempoEntregaAnterior !== mensaje.tiempoEntrega && (
                <span className="line-through text-slate-400">{mensaje.tiempoEntregaAnterior}</span>
              )}
              <span className="font-bold">{!isNaN(mensaje.tiempoEntrega) ? `${mensaje.tiempoEntrega} días` : mensaje.tiempoEntrega}</span>
            </span>
          </div>
        )}

        {mensaje.modalidad && (
          <div className="text-xs font-medium text-slate-500">
            <span className="bg-slate-100 px-2 py-1 rounded flex items-center gap-1.5">
              {mensaje.modalidadAnterior && mensaje.modalidadAnterior !== mensaje.modalidad && (
                <>
                  <ModalidadIcon mod={mensaje.modalidadAnterior} className="text-slate-400" />
                  <span className="text-slate-300">&rarr;</span>
                </>
              )}
              <ModalidadIcon mod={mensaje.modalidad} className="text-slate-700" />
              <span className="font-bold">{mensaje.modalidad}</span>
            </span>
          </div>
        )}
      </div>

      {estado === 'pendiente' && !esAutor && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          {!isContra ? (
            <div className="flex items-center gap-2">
              {onAceptar && (
                <button
                  onClick={() => onAceptar(mensaje.id, mensaje.precioPropuesto, mensaje.tiempoEntrega, mensaje.modalidad)}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase py-2 rounded-xl transition-colors flex items-center justify-center gap-1"
                >
                  <Check size={12} /> Aceptar
                </button>
              )}
              {onContraofertar && (
                <button
                  onClick={() => setIsContra(true)}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[10px] uppercase py-2 rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1"
                >
                  Ajustar
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Nueva Contraoferta</span>
                <button onClick={() => setIsContra(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  value={nuevoFob}
                  onChange={(e) => setNuevoFob(e.target.value)}
                  placeholder="Precio"
                  className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold outline-none focus:border-blue-500"
                  autoFocus
                />
                <input
                  type="text"
                  value={tiempoEntrega}
                  onChange={(e) => setTiempoEntrega(e.target.value)}
                  placeholder="Tiempo entrega"
                  className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold outline-none focus:border-blue-500"
              >
                <option value="Aéreo">Aéreo</option>
                <option value="Marítimo">Marítimo</option>
              </select>
              <input
                type="text"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Nota (opcional)"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs outline-none focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleContraofertar();
                }}
              />
              <button
                onClick={handleContraofertar}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black text-[10px] uppercase py-2 rounded-xl transition-colors flex items-center justify-center gap-1"
              >
                <Send size={12} /> Enviar Propuesta
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

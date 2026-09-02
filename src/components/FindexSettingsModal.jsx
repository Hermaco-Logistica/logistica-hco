import React, { useState } from 'react';
import { X, Settings, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { auth } from '../firebase';

export const FindexSettingsModal = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const idToken = await auth.currentUser.getIdToken();
      
      const res = await fetch('/.netlify/functions/save-findex-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Error al guardar las credenciales');
      }

      // Validar las credenciales inmediatamente y obtener la cookie
      const loginRes = await fetch('/.netlify/functions/auto-findex-login', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!loginRes.ok) {
        throw new Error('Las credenciales se guardaron pero son incorrectas para Findex.');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setUsername('');
        setPassword('');
      }, 2000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <Settings className="text-white w-5 h-5" />
            </div>
            <h2 className="text-white font-black text-sm uppercase tracking-widest">
              Conexión con Findex
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-slate-500 mb-6 font-medium">
            Ingresa tus credenciales de Findex para habilitar la búsqueda en tiempo real. Se guardarán encriptadas de forma segura.
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Usuario de Findex
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ejemplo@hermaco.net"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-sm font-bold text-slate-700"
              />
            </div>

            <div className="relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-sm font-bold text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-xs font-bold">
                {error}
              </div>
            )}

            {success ? (
              <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Credenciales Guardadas
              </div>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'ENCRIPTANDO Y GUARDANDO...' : 'GUARDAR CREDENCIALES'}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

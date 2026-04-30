import React from 'react';

export const Login = ({ loginFn }) => {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-sm w-full">
        <h1 className="text-4xl font-extrabold mb-2 text-slate-800 tracking-tighter">logisticaHCO</h1>
        <p className="text-slate-400 mb-8 text-[10px] font-black uppercase tracking-[0.2em]">Logística y Compras</p>
        <button 
          onClick={loginFn}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-3"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
          Entrar con Google
        </button>
      </div>
    </div>
  );
};
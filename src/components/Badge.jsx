export const Badge = ({ estado }) => {
  const styles = {
    'Cotizado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Parcial': 'bg-blue-100 text-blue-700 border-blue-200', // Sincronizado con App.jsx
    'Pendiente': 'bg-rose-100 text-rose-700 border-rose-200'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${styles[estado] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {estado}
    </span>
  );
};
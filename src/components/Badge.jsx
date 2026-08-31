export const Badge = ({ estado }) => {
  const styles = {
    'Cotizado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Cotizado Parcial': 'bg-blue-100 text-blue-700 border-blue-200',
    'Parcial': 'bg-blue-100 text-blue-700 border-blue-200',
    'Pedido Parcial': 'bg-sky-100 text-sky-800 border-sky-300',
    'Pedido': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'Pendiente': 'bg-rose-100 text-rose-700 border-rose-200'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${styles[estado] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {estado}
    </span>
  );
};
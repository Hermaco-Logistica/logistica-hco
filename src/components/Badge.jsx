export const Badge = ({ estado, roleTheme, className = '' }) => {
  let colorClass = '';

  if (roleTheme?.flujoEstados) {
    if (estado === 'Pendiente') {
      colorClass = roleTheme.flujoEstados.pendiente.badge;
    } else if (estado === 'Cotizado' || estado === 'Cotizado Parcial' || estado === 'Parcial') {
      colorClass = roleTheme.flujoEstados.cotizadas.badge;
    } else if (estado === 'Pedido' || estado === 'Pedido Parcial' || estado === 'Comprado') {
      colorClass = roleTheme.flujoEstados.pedidos.badge;
    }
  }

  if (!colorClass) {
    const styles = {
      'Cotizado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Cotizado Parcial': 'bg-blue-100 text-blue-700 border-blue-200',
      'Parcial': 'bg-blue-100 text-blue-700 border-blue-200',
      'Pedido Parcial': 'bg-sky-100 text-sky-800 border-sky-300',
      'Pedido': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'Pendiente': 'bg-rose-100 text-rose-700 border-rose-200'
    };
    colorClass = styles[estado] || 'bg-slate-100 text-slate-600 border-slate-200';
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${colorClass} ${className}`}>
      {estado}
    </span>
  );
};
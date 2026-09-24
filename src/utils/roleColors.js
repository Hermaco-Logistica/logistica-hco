export const getRoleColors = (role) => {
  switch (role) {
    case 'vendedor':
      return {
        text: 'text-violet-600',
        bg: 'bg-violet-100',
        border: 'border-t-violet-500',
        hoverText: 'hover:text-violet-700',
        focusBorder: 'focus:border-violet-500',
        hoverBg: 'hover:bg-violet-100',
        bgSoft: 'bg-violet-50',
      };
    case 'gerente':
      return {
        text: 'text-emerald-600',
        bg: 'bg-emerald-100',
        border: 'border-t-emerald-500',
        hoverText: 'hover:text-emerald-700',
        focusBorder: 'focus:border-emerald-500',
        hoverBg: 'hover:bg-emerald-100',
        bgSoft: 'bg-emerald-50',
      };
    case 'administrador':
      return {
        text: 'text-rose-600',
        bg: 'bg-rose-100',
        border: 'border-t-rose-500',
        hoverText: 'hover:text-rose-700',
        focusBorder: 'focus:border-rose-500',
        hoverBg: 'hover:bg-rose-100',
        bgSoft: 'bg-rose-50',
      };
    case 'comprador':
    default:
      return {
        text: 'text-blue-600',
        bg: 'bg-blue-100',
        border: 'border-t-blue-500',
        hoverText: 'hover:text-blue-700',
        focusBorder: 'focus:border-blue-500',
        hoverBg: 'hover:bg-blue-100',
        bgSoft: 'bg-blue-50',
      };
  }
};

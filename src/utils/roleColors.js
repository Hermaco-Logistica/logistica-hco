export const getRoleColors = (role) => {
  switch (role) {
    case 'vendedor':
      return {
        text: 'text-nav-accent-strong',
        bg: 'bg-violet-100',
        border: 'border-t-violet-500',
        hoverText: 'hover:text-nav-accent-hover',
        focusBorder: 'focus:border-violet-500',
        hoverBg: 'hover:bg-violet-100',
        bgSoft: 'bg-violet-50',
      };
    case 'gerente':
      return {
        text: 'text-nav-accent-strong',
        bg: 'bg-emerald-100',
        border: 'border-t-emerald-500',
        hoverText: 'hover:text-nav-accent-hover',
        focusBorder: 'focus:border-emerald-500',
        hoverBg: 'hover:bg-emerald-100',
        bgSoft: 'bg-emerald-50',
      };
    case 'administrador':
      return {
        text: 'text-nav-accent-strong',
        bg: 'bg-rose-100',
        border: 'border-t-rose-500',
        hoverText: 'hover:text-nav-accent-hover',
        focusBorder: 'focus:border-rose-500',
        hoverBg: 'hover:bg-rose-100',
        bgSoft: 'bg-rose-50',
      };
    case 'comprador':
    default:
      return {
        text: 'text-nav-accent-strong',
        bg: 'bg-blue-100',
        border: 'border-t-blue-500',
        hoverText: 'hover:text-nav-accent-hover',
        focusBorder: 'focus:border-blue-500',
        hoverBg: 'hover:bg-blue-100',
        bgSoft: 'bg-blue-50',
      };
  }
};

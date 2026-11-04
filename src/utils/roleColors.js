export const getRoleColors = (role) => {
  switch (role) {
    case 'vendedor':
      return {
        text: 'text-nav-accent-strong',
        hoverText: 'hover:text-nav-accent-hover',
      };
    case 'gerente':
      return {
        text: 'text-nav-accent-strong',
        hoverText: 'hover:text-nav-accent-hover',
      };
    case 'administrador':
      return {
        text: 'text-nav-accent-strong',
        hoverText: 'hover:text-nav-accent-hover',
      };
    case 'comprador':
    default:
      return {
        text: 'text-nav-accent-strong',
        hoverText: 'hover:text-nav-accent-hover',
      };
  }
};

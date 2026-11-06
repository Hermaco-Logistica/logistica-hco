import React from 'react';

// Superficie base: utilidad `surface` (fondo, radio de tarjeta y sombra de reposo, sin borde) y padding de 24px (20px en 'sm').
const PADDINGS = { none: '', sm: 'p-5', md: 'p-6' };

export const Card = ({ as = 'div', padding = 'md', className = '', children, ...rest }) =>
  React.createElement(
    as,
    {
      className: `surface ${PADDINGS[padding] ?? PADDINGS.md} ${className}`.trim(),
      ...rest
    },
    children
  );

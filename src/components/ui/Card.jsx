import React from 'react';

// Superficie base: radio de tarjeta, sombra difusa sin borde y padding de 24px (20px en 'sm').
const PADDINGS = { none: '', sm: 'p-5', md: 'p-6' };

export const Card = ({ as = 'div', padding = 'md', className = '', children, ...rest }) =>
  React.createElement(
    as,
    {
      className: `rounded-[var(--radius-card)] bg-[var(--tf-color-surface)] shadow-[var(--tf-shadow-card)] ${PADDINGS[padding] ?? PADDINGS.md} ${className}`,
      ...rest
    },
    children
  );

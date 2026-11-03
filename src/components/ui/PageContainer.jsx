import React from 'react';

// Ancho máximo y arranque comunes de todas las vistas. El padding horizontal lo aporta <main> con
// .tf-gutter-x (App.jsx), el mismo que usa la barra superior; aquí no se duplica.
// size: 'default' (1440px) | 'form' (formularios angostos) | 'wide' (Calculadora, Nuevo pedido).
const ANCHOS = {
  default: 'max-w-[var(--content-max)]',
  form: 'max-w-[var(--content-max-form)]',
  wide: 'max-w-[var(--content-max-wide)]'
};

export const PageContainer = ({ size = 'default', className = '', children }) => (
  <div className={`mx-auto w-full min-w-0 ${ANCHOS[size] || ANCHOS.default} ${className}`}>{children}</div>
);

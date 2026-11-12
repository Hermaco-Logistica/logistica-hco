import React from 'react';

/**
 * Botón con las variantes y tamaños del proyecto. Todas las clases están escritas completas
 * (Tailwind no ve clases construidas con plantillas).
 *
 * - primary: acción principal, sigue el color del rol (bg-primary).
 * - secondary: neutro (fondo blanco y sombra de botón, sin borde).
 * - secondaryBrand: fondo suave del rol con texto del rol.
 * - danger / dangerSoft: acción destructiva (color de estado, no sigue al rol).
 * - link: texto interactivo del rol, igual que linkClass de Análisis.
 *
 * `disabled` se pinta en gris y el botón nativo bloquea onClick.
 * Para ancho o flex del contenedor (flex-1, w-full…) usa `className`; no repitas aquí clases de tamaño.
 */
const BASE = 'inline-flex items-center justify-center cursor-pointer transition-all';

// Sombra de botón (token --shadow-boton*, tintada con el rol): reposo, hover con levante mínimo y active reducida. La variante `link` no la lleva.
const SOMBRA = 'shadow-boton hover:shadow-boton-hover hover:-translate-y-px active:translate-y-0 active:shadow-boton-activo';

const DISABLED = 'disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed disabled:active:scale-100';

const VARIANTES = {
  primary: 'bg-primary hover:bg-primary-strong text-primary-foreground',
  secondary: 'bg-white text-slate-700 hover:bg-slate-50',
  secondaryBrand: 'bg-primary-soft text-primary-strong hover:bg-primary/15',
  danger: 'bg-danger hover:bg-danger-strong text-white',
  dangerSoft: 'bg-danger-soft text-danger hover:bg-danger/10',
  link: 'bg-transparent text-analysis-accent hover:text-nav-accent-hover disabled:bg-transparent',
};

const TAMANOS = {
  sm: 'font-bold px-2.5 py-1 rounded-lg text-[11px] gap-1.5',
  md: 'font-bold px-3 py-1.5 rounded-xl text-[10px] uppercase gap-1.5',
  lg: 'px-5 py-2 rounded-xl text-[10px] font-black uppercase gap-2',
  cta: 'font-bold px-4 py-2.5 sm:px-5 rounded-xl text-[11px] sm:text-xs uppercase tracking-wider gap-2 active:scale-95',
  block: 'font-bold w-full py-2 rounded-xl text-xs gap-2',
  pill: 'font-bold px-5 py-2.5 rounded-full text-[10px] uppercase tracking-wider gap-2 active:scale-95',
  xl: 'font-black px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl text-xs uppercase tracking-wide leading-none min-h-[48px]',
  icon: 'font-bold w-10 h-10 rounded-xl',
  iconSm: 'font-bold w-[34px] h-[34px] rounded-xl',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  type = 'button',
  onClick,
  disabled = false,
  title,
  className = '',
  children,
  ...rest
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={[BASE, VARIANTES[variant], variant === 'link' ? '' : SOMBRA, TAMANOS[size], DISABLED, className].filter(Boolean).join(' ')}
    {...rest}
  >
    {children}
  </button>
);

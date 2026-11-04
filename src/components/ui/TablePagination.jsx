import React from 'react';

/**
 * Paginación de las listas: tarjeta propia debajo de la tarjeta de la tabla (referencia: Panel de Vendedor).
 * No renderiza nada si hay una sola página. `page` es la página ya acotada (1..totalPages).
 * `onPageChange` recibe el número de la página nueva. `className` reemplaza el margen superior (por defecto mt-6)
 * cuando el contenedor ya aporta su propio espaciado.
 */
export const TablePagination = ({ page, totalPages, totalItems, noun, onPageChange, className = 'mt-6' }) => {
  if (totalPages <= 1) return null;
  return (
    <div className={`tf-surface-panel flex flex-col sm:flex-row justify-between items-center gap-3 ${className} p-3 sm:px-4 text-slate-700 select-none`}>
      <div className="flex items-center justify-between w-full sm:w-auto gap-3">
        <button
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page === 1}
          className="flex-1 sm:flex-none h-10 px-4 text-[13.5px] font-semibold bg-neutral-200/70 text-neutral-700 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-[background-color,scale] duration-150 active:scale-[0.96] cursor-pointer"
        >
          Anterior
        </button>
        <span className="sm:hidden text-xs font-medium text-slate-500">
          {page} de {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          disabled={page === totalPages}
          className="flex-1 sm:flex-none h-10 px-4 text-[13.5px] font-semibold bg-neutral-200/70 text-neutral-700 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-[background-color,scale] duration-150 active:scale-[0.96] cursor-pointer"
        >
          Siguiente
        </button>
      </div>
      <span className="hidden sm:inline-block text-[13px] text-slate-500">
        Página {page} de {totalPages} ({totalItems} {noun})
      </span>
    </div>
  );
};

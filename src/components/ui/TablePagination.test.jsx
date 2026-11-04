import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { TablePagination } from './TablePagination';

// Copia literal del bloque que había en DashboardVendedor, DashboardCompras, DashboardPedidos y GestionOC
// antes de usar el componente. El componente debe producir exactamente el mismo DOM.
const PaginacionAnterior = ({ safeCurrentPage, totalPages, total, noun, setCurrentPage }) => (
  totalPages > 1 && (
    <div className="tf-surface-panel flex flex-col sm:flex-row justify-between items-center gap-3 mt-6 p-3 sm:px-4 text-slate-700 select-none">
      <div className="flex items-center justify-between w-full sm:w-auto gap-3">
        <button
          onClick={() => setCurrentPage(Math.max(safeCurrentPage - 1, 1))}
          disabled={safeCurrentPage === 1}
          className="flex-1 sm:flex-none h-10 px-4 text-[13.5px] font-semibold bg-neutral-200/70 text-neutral-700 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-[background-color,scale] duration-150 active:scale-[0.96] cursor-pointer"
        >
          Anterior
        </button>
        <span className="sm:hidden text-xs font-medium text-slate-500">
          {safeCurrentPage} de {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(Math.min(safeCurrentPage + 1, totalPages))}
          disabled={safeCurrentPage === totalPages}
          className="flex-1 sm:flex-none h-10 px-4 text-[13.5px] font-semibold bg-neutral-200/70 text-neutral-700 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-[background-color,scale] duration-150 active:scale-[0.96] cursor-pointer"
        >
          Siguiente
        </button>
      </div>
      <span className="hidden sm:inline-block text-[13px] text-slate-500">
        Página {safeCurrentPage} de {totalPages} ({total} {noun})
      </span>
    </div>
  )
);

const casos = [
  ['solicitudes', 1, 3, 25],
  ['solicitudes', 2, 3, 25],
  ['solicitudes', 3, 3, 25],
  ['ítems', 1, 2, 11],
  ['órdenes', 2, 5, 48]
];

describe('TablePagination', () => {
  it.each(casos)('mismo DOM que el bloque anterior (%s, página %i de %i)', (noun, page, totalPages, total) => {
    const anterior = render(<PaginacionAnterior safeCurrentPage={page} totalPages={totalPages} total={total} noun={noun} setCurrentPage={() => {}} />);
    const nuevo = render(<TablePagination page={page} totalPages={totalPages} totalItems={total} noun={noun} onPageChange={() => {}} />);
    expect(nuevo.container.innerHTML).toBe(anterior.container.innerHTML);
    expect(nuevo.container.innerHTML).not.toBe('');
  });

  it('no renderiza nada con una sola página', () => {
    const { container } = render(<TablePagination page={1} totalPages={1} totalItems={4} noun="solicitudes" onPageChange={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('los botones llaman a onPageChange con el número de página (acotado)', () => {
    const onPageChange = vi.fn();
    const { getByText, rerender } = render(<TablePagination page={2} totalPages={3} totalItems={25} noun="x" onPageChange={onPageChange} />);
    fireEvent.click(getByText('Anterior'));
    fireEvent.click(getByText('Siguiente'));
    expect(onPageChange.mock.calls).toEqual([[1], [3]]);
    rerender(<TablePagination page={1} totalPages={3} totalItems={25} noun="x" onPageChange={onPageChange} />);
    expect(getByText('Anterior').disabled).toBe(true);
    rerender(<TablePagination page={3} totalPages={3} totalItems={25} noun="x" onPageChange={onPageChange} />);
    expect(getByText('Siguiente').disabled).toBe(true);
  });

  it('className reemplaza el margen superior', () => {
    const { container } = render(<TablePagination page={1} totalPages={2} totalItems={12} noun="x" onPageChange={() => {}} className="mt-0" />);
    expect(container.firstChild.className).toContain('mt-0');
    expect(container.firstChild.className).not.toContain('mt-6');
  });
});

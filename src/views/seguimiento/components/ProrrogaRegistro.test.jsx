// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProrrogaRegistro } from './ProrrogaRegistro';

const ahora = new Date();
const solicitud = {
  id: 's1',
  correlativo: 'RFQ-0001',
  cliente: 'Cliente de prueba',
  vendedorNombre: 'Pablo',
  vendedorEmail: 'pablo@hermaco.net',
  tipo: 'RFQ',
  productos: [{ descripcion: 'A' }, { descripcion: 'B' }]
};
const prorroga = {
  estado: 'pendiente',
  ronda: 2,
  motivo: 'El cliente necesita más tiempo para revisar la propuesta.',
  diasSolicitados: 5,
  fechaSolicitud: ahora,
  indicesItems: [0],
  fechasVencimientoOriginales: { 0: ahora }
};
const record = {
  tipo: 'prorroga', solicitud, prorroga, clave: 'k1',
  cobertura: { completa: false, itemsAfectados: 1, totalItems: 2 },
  cantidadRevisiones: 0, cantidadProrrogas: 1
};

const montar = (props = {}) => render(
  <table><tbody>
    <ProrrogaRegistro record={record} view="desktop" puedeResponder={false} onAtender={() => {}} onResponder={() => {}} {...props} />
  </tbody></table>
);

describe('ProrrogaRegistro (escritorio)', () => {
  it('muestra vendedor, ronda dentro del estado y el icono de consulta del motivo', () => {
    const { container } = montar();
    expect(container.querySelectorAll('td')).toHaveLength(6);
    expect(container.textContent).toContain('Pablo');
    expect(container.textContent).toContain('Ronda 2');
    expect(screen.getByRole('button', { name: /consulta/i })).toBeTruthy();
  });

  it('sin vendedor la columna desaparece', () => {
    const { container } = montar({ mostrarVendedor: false });
    expect(container.querySelectorAll('td')).toHaveLength(5);
    expect(container.textContent).not.toContain('pablo@hermaco.net');
  });

  it('Ver ítems monta la fila de ítems y la anima al abrir y cerrar', () => {
    const { container } = montar();
    expect(container.querySelector('.prorrogas-expanded-row')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /ver ítems/i }));
    const expansion = container.querySelector('.prorrogas-expand');
    expect(expansion.getAttribute('data-abierto')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /ocultar ítems/i }));
    expect(container.querySelector('.prorrogas-expand').getAttribute('data-abierto')).toBe('false');
  });
});

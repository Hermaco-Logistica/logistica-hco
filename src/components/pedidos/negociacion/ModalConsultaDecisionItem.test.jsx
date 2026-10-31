// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../../utils/decisionItemHelpers', async (importOriginal) => ({
  ...(await importOriginal()),
  buscarMotivoDecisionMensajes: vi.fn(async () => null)
}));

import { ModalConsultaDecisionItem } from './ModalConsultaDecisionItem';

describe('ModalConsultaDecisionItem', () => {
  it.each(['rechazo', 'denegacion', 'anulacion'])('se pinta con una decisión de tipo %s', (tipoDecision) => {
    render(
      <ModalConsultaDecisionItem
        data={{ items: [{ producto: 'Contactor', marca: 'ABB', tipoDecision, badgeLabel: 'Etiqueta de prueba', motivo: 'Motivo claro y específico', fecha: new Date() }] }}
        onClose={() => {}}
      />
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(document.body.textContent).toContain('Etiqueta de prueba');
  });
});

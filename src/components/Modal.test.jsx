// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Modal, ModalBoton, ModalConfirmar, ModalCuerpo, ModalEncabezado, ModalPie } from './Modal';
import { DURACION_SALIDA_MS } from '../utils/modales';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const terminarSalida = () => act(() => { vi.advanceTimersByTime(DURACION_SALIDA_MS + 20); });

describe('Modal', () => {
  it('se pinta en document.body con rol de diálogo y bloquea el scroll de la página', () => {
    const { container, unmount } = render(<Modal etiqueta="Prueba"><ModalCuerpo>Contenido</ModalCuerpo></Modal>);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    const dialogo = screen.getByRole('dialog', { name: 'Prueba' });
    expect(dialogo.parentElement.parentElement).toBe(document.body);
    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('Escape anima la salida y luego avisa al padre', () => {
    const onCerrar = vi.fn();
    render(<Modal etiqueta="Prueba" onCerrar={onCerrar} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCerrar).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog').getAttribute('data-saliendo')).toBe('true');
    terminarSalida();
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('el clic en el fondo cierra, pero un clic dentro del panel no', () => {
    const onCerrar = vi.fn();
    render(<Modal etiqueta="Prueba" onCerrar={onCerrar}><ModalCuerpo>Dentro</ModalCuerpo></Modal>);
    const dialogo = screen.getByRole('dialog');
    fireEvent.mouseDown(screen.getByText('Dentro'));
    fireEvent.click(screen.getByText('Dentro'));
    terminarSalida();
    expect(onCerrar).not.toHaveBeenCalled();
    fireEvent.mouseDown(dialogo.parentElement);
    fireEvent.click(dialogo.parentElement);
    terminarSalida();
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('bloqueado ignora Escape y el clic fuera', () => {
    const onCerrar = vi.fn();
    render(<Modal etiqueta="Prueba" onCerrar={onCerrar} bloqueado />);
    fireEvent.keyDown(document, { key: 'Escape' });
    terminarSalida();
    expect(onCerrar).not.toHaveBeenCalled();
  });

  it('con dos modales abiertos, Escape cierra solo el de arriba', () => {
    const abajo = vi.fn();
    const arriba = vi.fn();
    render(<><Modal etiqueta="Abajo" onCerrar={abajo} /><Modal etiqueta="Arriba" capa="anidado" onCerrar={arriba} /></>);
    fireEvent.keyDown(document, { key: 'Escape' });
    terminarSalida();
    expect(arriba).toHaveBeenCalledTimes(1);
    expect(abajo).not.toHaveBeenCalled();
  });

  it('como="form" convierte el panel en formulario y envía onSubmit', () => {
    const onSubmit = vi.fn((evento) => evento.preventDefault());
    render(<Modal etiqueta="Formulario" como="form" onSubmit={onSubmit}><ModalBoton type="submit">Enviar</ModalBoton></Modal>);
    expect(screen.getByRole('dialog').tagName).toBe('FORM');
    fireEvent.click(screen.getByText('Enviar'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('no pinta nada con abierto=false', () => {
    render(<Modal etiqueta="Prueba" abierto={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('piezas del modal', () => {
  it('el encabezado muestra título, subtítulo y botón de cerrar', () => {
    const onCerrar = vi.fn();
    render(<Modal etiqueta="x"><ModalEncabezado titulo="Título" subtitulo="Subtítulo" onCerrar={onCerrar} /></Modal>);
    expect(screen.getByText('Título')).toBeTruthy();
    expect(screen.getByText('Subtítulo')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Cerrar'));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('ModalConfirmar llama a confirmar y a cancelar', () => {
    const onConfirmar = vi.fn();
    const onCancelar = vi.fn();
    render(<ModalConfirmar titulo="¿Seguro?" mensaje="Esto no se puede deshacer." variante="peligro" textoConfirmar="Eliminar" onConfirmar={onConfirmar} onCancelar={onCancelar} />);
    fireEvent.click(screen.getByText('Eliminar'));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onConfirmar).toHaveBeenCalledTimes(1);
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it('el pie agrupa las acciones', () => {
    render(<Modal etiqueta="x"><ModalPie><ModalBoton>Cancelar</ModalBoton></ModalPie></Modal>);
    expect(screen.getByText('Cancelar')).toBeTruthy();
  });
});

import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { MemoryRouter } from 'react-router-dom';
import { BottomDockProvider } from '../context/BottomDockContext';
import { BottomDock } from '../components/mobile/BottomDock';
import { BottomActionBar } from '../components/mobile/BottomActionBar';

// Polyfills para jsdom
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver;

describe('Layout & Scroll Integrity - Reglas Arquitecturales', () => {
  it('App.jsx define el scroller vertical único en <main> con min-h-0', () => {
    const appPath = path.resolve(__dirname, '../App.jsx');
    const appContent = fs.readFileSync(appPath, 'utf-8');

    // Extraer la etiqueta <main ...>
    const mainMatch = appContent.match(/<main[^>]*className=["']([^"']+)["'][^>]*>/s);
    expect(mainMatch).not.toBeNull();

    const mainClassNames = mainMatch[1];

    // min-h-0 es obligatorio para que flex-col permita a overflow-y-auto funcionar
    expect(mainClassNames).toContain('min-h-0');
    expect(mainClassNames).toContain('flex-1');
    expect(mainClassNames).toContain('min-w-0');
    expect(mainClassNames).toContain('overflow-y-auto');
    expect(mainClassNames).toContain('@container');

    // Debe aplicar el padding dinámico del dock
    expect(appContent).toContain('pb-[calc(var(--bottom-dock-h,0px)+16px)]');
  });

  it('Ninguna vista en src/views/ usa h-screen, min-h-screen o h-dvh dentro del layout principal', () => {
    const viewsDir = path.resolve(__dirname, '../views');
    
    function getFiles(dir) {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getFiles(filePath));
        } else if (file.endsWith('.jsx')) {
          results.push(filePath);
        }
      });
      return results;
    }

    const viewFiles = getFiles(viewsDir);
    const violatingFiles = [];

    viewFiles.forEach(file => {
      // Ignorar vista de Login ya que no se renderiza dentro del shell con <main>
      if (file.includes('Login.jsx')) return;

      const content = fs.readFileSync(file, 'utf-8');
      
      // Buscar clases que rompen el scroller de <main>
      const hasHScreen = /\b(h-screen|min-h-screen|h-dvh)\b/.test(content);
      if (hasHScreen) {
        violatingFiles.push(path.basename(file));
      }
    });

    expect(violatingFiles, `Las siguientes vistas tienen clases de altura de pantalla fija: ${violatingFiles.join(', ')}`).toEqual([]);
  });

  it('BottomActionBar portaliza en BottomDock sin provocar loops de re-render en cascada', () => {
    let renderCount = 0;

    const DynamicCounterView = () => {
      const [count, setCount] = useState(0);
      renderCount++;

      return (
        <div>
          <button data-testid="inc-btn" onClick={() => setCount(c => c + 1)}>
            Increment {count}
          </button>
          {/* Barra con JSX en línea que antes causaba loop infinito */}
          <BottomActionBar hideNav={true}>
            <div data-testid="docked-action-item">
              <span>Count is: {count}</span>
            </div>
          </BottomActionBar>
        </div>
      );
    };

    render(
      <MemoryRouter initialEntries={['/vendedor']}>
        <BottomDockProvider>
          <BottomDock role="vendedor" onOpenDrawer={() => {}} />
          <main>
            <DynamicCounterView />
          </main>
        </BottomDockProvider>
      </MemoryRouter>
    );

    // Render inicial
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('docked-action-item')).not.toBeNull();
    expect(screen.getByTestId('docked-action-item').textContent).toContain('Count is: 0');

    // Simular actualización de estado de la vista
    act(() => {
      screen.getByTestId('inc-btn').click();
    });

    // Debe haberse renderizado exactamente una vez más sin loop
    expect(renderCount).toBe(2);
    expect(screen.getByTestId('docked-action-item').textContent).toContain('Count is: 1');
  });
});

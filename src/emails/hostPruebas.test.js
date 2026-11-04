import { describe, expect, it } from 'vitest';
import { esHostDePruebas } from './destinatarios';

describe('esHostDePruebas (desvío de correos a DESTINO_PRUEBAS)', () => {
  it.each([
    ['localhost', true],
    ['127.0.0.1', true],
    ['deploy-preview-12--sitio.netlify.app', true],
    ['rediseno-coherencia--sitio.netlify.app', true],
    ['sitio.netlify.app', false],
    ['app.ejemplo.com', false],
    ['', false],
    [undefined, false]
  ])('%s -> %s', (host, esperado) => {
    expect(esHostDePruebas(host)).toBe(esperado);
  });

  it('no distingue mayúsculas', () => {
    expect(esHostDePruebas('Deploy-Preview-3--Sitio.Netlify.App')).toBe(true);
  });
});

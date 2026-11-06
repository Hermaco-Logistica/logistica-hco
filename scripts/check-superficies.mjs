#!/usr/bin/env node
/**
 * Guarda de superficies ("trinquete"): evita que entren superficies fuera del sistema (surface, surface-flotante, surface-plana, Card).
 *
 * Cuenta por archivo (src/**\/*.jsx y src/**\/*.css):
 *   - bordes:      border completo (no de estado ni separador) en una superficie (bg-white, bg-surface o surface, con radio xl o mayor).
 *   - sombras:     shadow-(xs|sm|md|lg|xl|2xl|inner) y sombras arbitrarias en esa misma superficie.
 *   - sinSurface:  superficie hecha a mano (fondo blanco + radio xl o mayor + sombra) sin Card, surface ni surface-flotante/plana.
 *   - css:         reglas CSS con border, background y border-radius a la vez (selectores de botones, campos, chips y pestañas excluidos).
 *   - anidadas:    surface dentro de otra superficie, de un modal o de un popover, en el mismo archivo (debe ser surface-plana).
 *
 * Los conteos de scripts/superficies-baseline.json son el TOPE: solo pueden bajar. Falla si un archivo lo supera o si aparece un archivo
 * nuevo con conteo mayor que 0. Para fijar una mejora:  npm run check:superficies -- --update
 *
 * Exclusiones: src/emails/, CotizacionDocumento.jsx, CotizacionPDF.jsx, pruebas y styles/tokens.css. Por tipo de elemento solo se miran
 * div, section, article, aside, header, footer, form, main y li: botones, inputs, selects, chips (span), avatares y etiquetas quedan fuera.
 * Tampoco cuentan los bordes dashed, transparent, de estado (rose, emerald, amber, primary, danger…), los separadores (border-t/b/l/r/x/y),
 * los de variante de estado (hover:, focus:, focus-within:, group-hover:, aria-, disabled:) ni rounded-full.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = join(RAIZ, 'scripts', 'superficies-baseline.json');
const require = createRequire(join(RAIZ, 'package.json'));
let espree;
try { espree = require('espree'); } catch { console.error('check-superficies necesita espree (viene con eslint): ejecuta npm install.'); process.exit(1); }

const TAGS = new Set(['div', 'section', 'article', 'aside', 'header', 'footer', 'form', 'main', 'li']);
const SUP = /(^|\s)(surface|surface-flotante|surface-plana|tf-tabla-card|tf-surface-panel)(\s|$)/;
const REPOSO = /(^|\s)(surface|tf-tabla-card|tf-surface-panel)(\s|$)/;
const FONDO = /^(?:(?:sm|md|lg|xl):)?bg-(?:white|surface|\[var\(--detalle-surface\)\])$/;
const RADIO_XL = /^(?:(?:sm|md|lg|xl):)?rounded-(?:xl|2xl|3xl|4xl|\[(?:1[2-9]|[2-9]\d)px\]|\[\d+(?:\.\d+)?rem\]|\[var\(--radius-(?:card|inner)\)\])$/;
const BORDE_COMPLETO = /^(?:(?:sm|md|lg|xl):)?border(?:-(?:slate|gray|neutral|zinc|stone)-\d{2,3}(?:\/\d+)?|-white(?:\/\d+)?|-\[var\(--detalle-border\)\])?$/;
const SOMBRA = /^(?:(?:sm|md|lg|xl):)?shadow-(?:2xs|xs|sm|md|lg|xl|2xl|inner)$/;
const SOMBRA_ARB = /^(?:(?:sm|md|lg|xl):)?shadow-\[(?!var\(--shadow-)(.+)\]$/;
const EXCL_ARCHIVO = (r) => r.startsWith('src/emails/') || r === 'src/styles/tokens.css' || /(^|\/)(CotizacionDocumento|CotizacionPDF)\.jsx$/.test(r) || /\.(test|spec)\.[jt]sx?$/.test(r);
const SELECTOR_CONTROL = /btn|button|input|campo|search|segmented|chip|status|badge|avatar|tab(?![a-z]*-card)|select|toggle|pill|dot|icon/i;

function* recorrer(dir) {
  for (const nombre of readdirSync(dir)) {
    const completa = join(dir, nombre);
    if (statSync(completa).isDirectory()) yield* recorrer(completa);
    else if (['.jsx', '.css'].includes(extname(nombre))) yield completa;
  }
}
function txt(n) {
  if (!n) return '';
  switch (n.type) {
    case 'Literal': return typeof n.value === 'string' ? n.value : '';
    case 'TemplateLiteral': return n.quasis.map((q) => q.value.cooked).join(' ') + ' ' + n.expressions.map(txt).join(' ');
    case 'ConditionalExpression': return txt(n.consequent) + ' ' + txt(n.alternate);
    case 'LogicalExpression': case 'BinaryExpression': return txt(n.left) + ' ' + txt(n.right);
    case 'JSXExpressionContainer': return txt(n.expression);
    default: return '';
  }
}
const clsDe = (el) => { const a = el.openingElement.attributes.find((x) => x.type === 'JSXAttribute' && x.name.name === 'className'); return a && a.value ? txt(a.value) : ''; };
const nombreDe = (el) => el.openingElement.name.name || (el.openingElement.name.property && el.openingElement.name.property.name) || '?';

function analizarJsx(ruta) {
  const hall = { bordes: [], sombras: [], sinSurface: [], anidadas: [] };
  let ast;
  try { ast = espree.parse(readFileSync(join(RAIZ, ruta), 'utf8'), { ecmaVersion: 2023, sourceType: 'module', ecmaFeatures: { jsx: true }, loc: true }); } catch { return hall; }
  (function visita(n, anc) {
    if (!n || typeof n.type !== 'string') return;
    let nuevo = anc;
    if (n.type === 'JSXElement') {
      const nombre = nombreDe(n); const cls = clsDe(n); const toks = cls.split(/\s+/).filter(Boolean);
      const esCard = nombre === 'Card'; const esSup = esCard || SUP.test(cls);
      const candidato = esSup || (TAGS.has(nombre) && toks.some((t) => FONDO.test(t)) && toks.some((t) => RADIO_XL.test(t)));
      const linea = n.loc.start.line;
      if (candidato && (TAGS.has(nombre) || esCard) && !toks.includes('rounded-full') && !toks.some((t) => /^border-dashed$/.test(t))) {
        const bordes = toks.filter((t) => BORDE_COMPLETO.test(t));
        const sombras = toks.filter((t) => SOMBRA.test(t) || SOMBRA_ARB.test(t));
        bordes.forEach((b) => hall.bordes.push({ linea, texto: b }));
        sombras.forEach((s) => hall.sombras.push({ linea, texto: s }));
        const conSombraPropia = toks.some((t) => /^(?:(?:sm|md|lg):)?shadow-/.test(t) && !/^(?:hover|focus)/.test(t));
        if (!esSup && conSombraPropia && toks.some((t) => FONDO.test(t)) && !toks.some((t) => /^(?:absolute|fixed)$/.test(t))) hall.sinSurface.push({ linea, texto: toks.filter((t) => FONDO.test(t) || /shadow-/.test(t)).join(' ') });
      }
      if (esSup && (REPOSO.test(cls) || esCard) && !/tf-tabla-card--plana/.test(cls)) {
        const a = anc.find((x) => x.sup || x.modal);
        if (a) hall.anidadas.push({ linea, texto: `surface dentro de ${a.modal ? 'modal o popover' : 'otra superficie'} (${a.nom}:${a.linea})` });
      }
      nuevo = anc.concat([{ nom: nombre, linea, sup: esSup, modal: /^Modal/.test(nombre) || /modal-panel|hilo-panel|fixed inset-0|surface-flotante/.test(cls) }]);
    }
    for (const k of Object.keys(n)) { if (k === 'loc' || k === 'range') continue; const v = n[k]; if (Array.isArray(v)) v.forEach((c) => visita(c, nuevo)); else if (v && typeof v.type === 'string') visita(v, nuevo); }
  })(ast, []);
  return hall;
}
function analizarCss(ruta) {
  const t = readFileSync(join(RAIZ, ruta), 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const hall = { css: [] };
  const re = /([^{}]+)\{([^{}]*)\}/g; let m;
  while ((m = re.exec(t))) {
    const sel = m[1].trim(); const cuerpo = m[2];
    if (SELECTOR_CONTROL.test(sel) || sel.startsWith('@')) continue;
    const borde = /(^|;|\s)border\s*:\s*(?!0|none)[^;]*\d+px/.test(cuerpo) || /(^|;|\s)border-color\s*:/.test(cuerpo) && /border-width/.test(cuerpo);
    if (borde && /background(?:-color)?\s*:/.test(cuerpo) && /border-radius\s*:/.test(cuerpo)) hall.css.push({ linea: t.slice(0, m.index).split('\n').length, texto: sel.split('\n').pop().trim().slice(0, 60) });
  }
  return hall;
}
function lineasNuevas(ruta) {
  try {
    const s = execFileSync('git', ['diff', '-U0', 'HEAD', '--', ruta], { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    let n = 0; const out = new Set();
    for (const l of s.split('\n')) { const c = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)/); if (c) { n = Number(c[1]); continue; } if (l.startsWith('+') && !l.startsWith('+++')) { out.add(n); n += 1; } }
    return out;
  } catch { return new Set(); }
}
const GUIA = [
  'Guía rápida:',
  '  una superficie nueva → usa <Card> o la clase surface (sin bg-*, shadow-* ni border decorativo)',
  '  dentro de modales, menús o popovers, o dentro de otra superficie → surface-plana',
  '  lo que flota (modal, menú, popover, tooltip) → surface-flotante',
  '  botones → shadow-boton y sin borde (<Button>)',
  '  el borde de estado (selección, error, foco, dashed) y los separadores sí se permiten',
  'Detalle: docs/superficies.md. Si es legítimo y baja otro archivo, fija el tope: npm run check:superficies -- --update'
].join('\n');
const CATEGORIAS = [['bordes', 'border completo en superficie'], ['sombras', 'sombra suelta en superficie'], ['sinSurface', 'superficie a mano sin Card ni surface'], ['css', 'regla CSS con borde, fondo y radio'], ['anidadas', 'superficie anidada (usa surface-plana)']];
const archivos = [...recorrer(join(RAIZ, 'src'))].map((p) => relative(RAIZ, p).split('\\').join('/')).filter((r) => !EXCL_ARCHIVO(r)).sort();
const actual = {}; const detalle = {};
for (const ruta of archivos) {
  const h = ruta.endsWith('.css') ? analizarCss(ruta) : analizarJsx(ruta);
  const c = {}; for (const [k] of CATEGORIAS) c[k] = (h[k] || []).length;
  if (Object.values(c).some((v) => v > 0)) { actual[ruta] = c; detalle[ruta] = h; }
}
const suma = (k) => Object.values(actual).reduce((t, v) => t + (v[k] || 0), 0);
if (process.argv.includes('--update')) {
  const totales = {}; for (const [k] of CATEGORIAS) totales[k] = suma(k);
  writeFileSync(BASELINE, `${JSON.stringify({ aviso: 'Tope de superficies sueltas por archivo (trinquete: solo puede bajar). Regenerar con: npm run check:superficies -- --update', totales, archivos: actual }, null, 2)}\n`);
  console.log(`Tope actualizado: ${Object.keys(actual).length} archivos. ${CATEGORIAS.map(([k]) => `${k} ${totales[k]}`).join(' | ')}`);
  process.exit(0);
}
if (!existsSync(BASELINE)) { console.error('Falta scripts/superficies-baseline.json. Genera el tope con: npm run check:superficies -- --update'); process.exit(1); }
const tope = JSON.parse(readFileSync(BASELINE, 'utf8')).archivos;
let errores = 0; let bajas = 0;
for (const ruta of Object.keys(actual)) {
  const perm = tope[ruta] || {};
  for (const [k, etiqueta] of CATEGORIAS) {
    const n = actual[ruta][k] || 0; const p = perm[k] || 0;
    if (n <= p) continue;
    errores += 1;
    const nuevas = lineasNuevas(ruta); const todas = detalle[ruta][k];
    const marcadas = todas.filter((d) => nuevas.has(d.linea)); const mostrar = (marcadas.length ? marcadas : todas).slice(0, 10);
    console.error(`\n✗ ${ruta}: ${n} × ${etiqueta} (tope ${p}, +${n - p})${tope[ruta] ? '' : ' — archivo nuevo'}`);
    console.error(marcadas.length ? '  Líneas nuevas:' : '  Líneas (no se pudo aislar las nuevas con git diff):');
    for (const d of mostrar) console.error(`    ${ruta}:${d.linea}  ${d.texto}`);
  }
}
for (const ruta of Object.keys(tope)) for (const [k] of CATEGORIAS) if ((actual[ruta]?.[k] || 0) < (tope[ruta][k] || 0)) bajas += 1;
if (errores) { console.error(`\n${errores} exceso(s) sobre el tope de superficies.\n${GUIA}`); process.exit(1); }
console.log(`Superficies: OK. ${Object.keys(actual).length} archivos con hallazgos tolerados. ${CATEGORIAS.map(([k]) => `${k} ${suma(k)}`).join(' | ')} (≤ tope).`);
if (bajas) console.log(`Hay ${bajas} contador(es) por debajo del tope: fija la mejora con npm run check:superficies -- --update.`);

#!/usr/bin/env node
/**
 * Guarda de colores ("trinquete"): evita que entren colores sueltos fuera del sistema de tokens.
 *
 * Cuenta por archivo, en src/**\/*.{js,jsx,css}:
 *   - clases:    clases Tailwind de paleta cromática con tono (red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky,
 *                blue, indigo, violet, purple, fuchsia, pink, rose) con cualquier prefijo (bg-, text-, border-, ring-, from-, via-,
 *                to-, shadow-, accent-, fill-, stroke-, divide-, outline-...), variante (hover:, md:...) y /opacidad.
 *   - literales: hex, rgb(), rgba(), hsl() y hsla() (sin contar el blanco y el negro puros).
 * Los neutros (slate, gray, zinc, neutral, stone, white, black) son válidos y no se cuentan.
 *
 * Los conteos de scripts/colores-baseline.json son el TOPE: solo pueden bajar. Falla si un archivo supera su tope o si aparece
 * un archivo nuevo con conteo mayor que 0. Cuando bajes colores, regenera el tope con:  npm run check:colores -- --update
 *
 * Excluidos: src/emails/, CotizacionDocumento.jsx, CotizacionPDF.jsx, pruebas (*.test.*), src/styles/tokens.css (ahí se definen).
 * src/views/analisis/theme.js y src/utils/etiquetas.js tienen su propio tope como cualquier archivo (excepciones conocidas).
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(RAIZ, 'src');
const BASELINE = join(RAIZ, 'scripts', 'colores-baseline.json');
const EXTENSIONES = new Set(['.js', '.jsx', '.css']);
const EXCEPCIONES_CONOCIDAS = ['src/views/analisis/theme.js', 'src/utils/etiquetas.js'];

const FAMILIAS = 'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const PREFIJOS = 'bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|from|via|to|shadow|accent|fill|stroke|divide|outline|decoration|caret|placeholder';
const RE_CLASE = new RegExp(`(?<![\\w-])(?:${PREFIJOS})-(?:${FAMILIAS})-\\d{2,3}(?:\\/[\\w.%\\[\\]-]+)?`, 'g');
const RE_HEX = /(?<![\w&#-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![\w-])/g;
const RE_FUNC = /\b(?:rgba?|hsla?)\(\s*[^)]*\)/g;

const esExcluido = (ruta) => (
  ruta.startsWith('src/emails/')
  || ruta === 'src/styles/tokens.css'
  || /(^|\/)(CotizacionDocumento|CotizacionPDF)\.jsx$/.test(ruta)
  || /\.(test|spec)\.[jt]sx?$/.test(ruta)
);

function* recorrer(dir) {
  for (const nombre of readdirSync(dir)) {
    const completa = join(dir, nombre);
    if (statSync(completa).isDirectory()) yield* recorrer(completa);
    else if (EXTENSIONES.has(extname(nombre))) yield completa;
  }
}

/** Sustituye los comentarios por espacios conservando los saltos de línea (los números de línea no cambian). */
function sinComentarios(texto, esCss) {
  const blanquear = (m) => m.replace(/[^\n]/g, ' ');
  let t = texto.replace(/\/\*[\s\S]*?\*\//g, blanquear);
  if (!esCss) t = t.replace(/(^|[^:\w'"`])\/\/[^\n]*/g, (m, previo) => previo + blanquear(m.slice(previo.length)));
  return t;
}

const esBlancoNegro = (literal) => {
  const l = literal.toLowerCase().replace(/\s+/g, '');
  if (/^#(000|fff|0000|ffff|000000|ffffff|00000000|ffffffff)$/.test(l)) return true;
  if (/^(?:rgba?|hsla?)\(/.test(l)) {
    const nums = l.match(/-?\d*\.?\d+%?/g) || [];
    if (l.startsWith('rgb')) { const [r, g, b] = nums.slice(0, 3).map(Number); return (r === 0 && g === 0 && b === 0) || (r === 255 && g === 255 && b === 255); }
    if (l.startsWith('hsl')) { const luz = parseFloat(nums[2]); return luz === 0 || luz === 100; }
  }
  return false;
};

function analizar(ruta) {
  const texto = readFileSync(join(RAIZ, ruta), 'utf8');
  const lineas = sinComentarios(texto, ruta.endsWith('.css')).split('\n');
  const clases = []; const literales = [];
  lineas.forEach((linea, i) => {
    for (const m of linea.matchAll(RE_CLASE)) clases.push({ linea: i + 1, texto: m[0] });
    for (const m of linea.matchAll(RE_HEX)) {
      const solo = m[0].slice(1);
      if (/^\d+$/.test(solo) && ![6, 8].includes(solo.length)) continue; // "#123": numeración, no color
      if (!esBlancoNegro(m[0])) literales.push({ linea: i + 1, texto: m[0] });
    }
    for (const m of linea.matchAll(RE_FUNC)) if (!/var\(|from\s/.test(m[0]) && !esBlancoNegro(m[0])) literales.push({ linea: i + 1, texto: m[0] });
  });
  return { clases, literales };
}

function lineasNuevas(ruta) {
  try {
    const salida = execFileSync('git', ['diff', '-U0', 'HEAD', '--', ruta], { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    let numero = 0; const nuevas = [];
    for (const l of salida.split('\n')) {
      const cab = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
      if (cab) { numero = Number(cab[1]); continue; }
      if (l.startsWith('+') && !l.startsWith('+++')) { nuevas.push(numero); numero += 1; }
    }
    return new Set(nuevas);
  } catch { return new Set(); }
}

const GUIA = [
  'Guía rápida (en vez de un color suelto):',
  '  marca o acción        → bg-primary, text-primary-strong, <Button>',
  '  estados               → success, warning, danger, info (bg-success-soft, text-danger…) o <StatusChip>',
  '  etiquetas             → <Etiqueta tono="…" />',
  '  dominio aéreo/marítimo → text-mode-air-strong, bg-mode-sea-soft…',
  '  seguimiento           → bg-seguimiento, text-seguimiento, bg-seguimiento-soft',
  '  neutros               → slate-* (válidos)',
  'Si el color es legítimo y no tiene token, añade el token (docs/colores.md) o, como último recurso, regenera el tope: npm run check:colores -- --update'
].join('\n');

const archivos = [...recorrer(SRC)].map((p) => relative(RAIZ, p).split('\\').join('/')).filter((r) => !esExcluido(r)).sort();
const actual = {};
const detalle = {};
for (const ruta of archivos) {
  const { clases, literales } = analizar(ruta);
  if (clases.length || literales.length) { actual[ruta] = { clases: clases.length, literales: literales.length }; detalle[ruta] = { clases, literales }; }
}
const suma = (obj, campo) => Object.values(obj).reduce((t, v) => t + v[campo], 0);

if (process.argv.includes('--update')) {
  const salida = { aviso: 'Tope de colores sueltos por archivo (trinquete: solo puede bajar). Regenerar con: npm run check:colores -- --update', excepcionesConocidas: EXCEPCIONES_CONOCIDAS, totales: { clases: suma(actual, 'clases'), literales: suma(actual, 'literales') }, archivos: actual };
  writeFileSync(BASELINE, `${JSON.stringify(salida, null, 2)}\n`);
  console.log(`Tope actualizado: ${Object.keys(actual).length} archivos, ${salida.totales.clases} clases de paleta y ${salida.totales.literales} literales.`);
  process.exit(0);
}

if (!existsSync(BASELINE)) { console.error('Falta scripts/colores-baseline.json. Genera el tope con: npm run check:colores -- --update'); process.exit(1); }
const tope = JSON.parse(readFileSync(BASELINE, 'utf8')).archivos;
let errores = 0; const bajas = [];
for (const ruta of Object.keys(actual)) {
  const permitido = tope[ruta] || { clases: 0, literales: 0 };
  for (const [campo, etiqueta] of [['clases', 'clases de paleta'], ['literales', 'literales hex/rgb/hsl']]) {
    if (actual[ruta][campo] <= permitido[campo]) continue;
    errores += 1;
    const exceso = actual[ruta][campo] - permitido[campo];
    const nuevas = lineasNuevas(ruta);
    const todas = detalle[ruta][campo];
    const marcadas = todas.filter((d) => nuevas.has(d.linea));
    const mostrar = (marcadas.length ? marcadas : todas).slice(0, 12);
    console.error(`\n✗ ${ruta}: ${actual[ruta][campo]} ${etiqueta} (tope ${permitido[campo]}, +${exceso})${tope[ruta] ? '' : ' — archivo nuevo con colores sueltos'}`);
    console.error(marcadas.length ? '  Líneas nuevas:' : '  Líneas con color suelto (no se pudo aislar las nuevas con git diff):');
    for (const d of mostrar) console.error(`    ${ruta}:${d.linea}  ${d.texto}`);
  }
}
for (const ruta of Object.keys(tope)) {
  const a = actual[ruta] || { clases: 0, literales: 0 };
  if (a.clases < tope[ruta].clases || a.literales < tope[ruta].literales) bajas.push(ruta);
}
if (errores) { console.error(`\n${errores} exceso(s) sobre el tope de colores.\n${GUIA}`); process.exit(1); }
console.log(`Colores: OK. ${Object.keys(actual).length} archivos con colores sueltos, ${suma(actual, 'clases')} clases de paleta y ${suma(actual, 'literales')} literales (por debajo o igual al tope).`);
if (bajas.length) console.log(`Ya bajaron ${bajas.length} archivo(s) respecto al tope: regenera el tope para fijar la mejora (npm run check:colores -- --update).`);

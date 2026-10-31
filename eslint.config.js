import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

const MENSAJE_ETIQUETA = 'Etiqueta con estilo propio: usa <Etiqueta /> (src/components/Etiqueta.jsx) y define el estilo en src/utils/etiquetas.js.'
// Firma de una etiqueta: redondeo + padding + texto diminuto (+ color o borde cuando la clase es fija).
const FIRMA_ETIQUETA_ESTATICA = String.raw`/^(?=.*rounded)(?=.*px-[0-9.]+)(?=.*py-[0-9.]+)(?=.*text-\[[0-9.]+px\])(?=.*(bg|border)-)/`
const FIRMA_ETIQUETA_DINAMICA = String.raw`/^(?=.*rounded)(?=.*px-[0-9.]+)(?=.*text-\[[0-9.]+px\])/`

const MENSAJE_MODAL = 'Overlay de modal propio: usa <Modal /> (src/components/Modal.jsx) y define el estilo en src/utils/modales.js.'
const REGLAS_MODAL = [
  { selector: "JSXAttribute[name.name='className'] Literal[value=/fixed inset-0/]", message: MENSAJE_MODAL },
  { selector: "JSXAttribute[name.name='className'] TemplateElement[value.raw=/fixed inset-0/]", message: MENSAJE_MODAL }
]
const REGLAS_ETIQUETA = [
  {
    selector: `JSXOpeningElement[name.name='span'] JSXAttribute[name.name='className'] Literal[value=${FIRMA_ETIQUETA_ESTATICA}]`,
    message: MENSAJE_ETIQUETA
  },
  {
    selector: `JSXOpeningElement[name.name='span'] JSXAttribute[name.name='className'] TemplateElement[value.raw=${FIRMA_ETIQUETA_DINAMICA}]`,
    message: MENSAJE_ETIQUETA
  }
]
// Paneles con un comportamiento propio que <Modal /> no cubre (menú lateral y panel de mensajes con gestos de arrastre).
// Cualquier otro overlay debe usar <Modal />.
const ARCHIVOS_CON_OVERLAY_PROPIO = [
  'src/components/hilos/HiloComentariosItem.jsx',
  'src/components/Sidebar.jsx'
]

export default defineConfig([
  globalIgnores(['dist/**', '.netlify/**', 'api/**']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Reglas de diseño centralizado: las etiquetas viven en src/utils/etiquetas.js (<Etiqueta />) y los modales en
    // src/utils/modales.js (<Modal />).
    files: ['src/**/*.jsx'],
    ignores: ARCHIVOS_CON_OVERLAY_PROPIO,
    rules: { 'no-restricted-syntax': ['error', ...REGLAS_ETIQUETA, ...REGLAS_MODAL] }
  },
  {
    // Excepciones documentadas: conservan su overlay propio.
    files: ARCHIVOS_CON_OVERLAY_PROPIO,
    rules: { 'no-restricted-syntax': ['error', ...REGLAS_ETIQUETA] }
  },
  {
    files: ['netlify/functions/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])

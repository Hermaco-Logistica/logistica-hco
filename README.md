# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Notas de desarrollo

### Netlify Dev y tracking DHL

- El comando recomendado para desarrollo local es `npm run dev`, que usa Netlify Dev.
- La function `tracking-status` requiere variables de entorno del backend (sin prefijo `VITE_`).
- Para habilitar cache y rate limit en la function, es necesario configurar `FIREBASE_SERVICE_ACCOUNT`.

Variables requeridas (backend):

```dotenv
DHL_TRACKING_API_URL=https://api-eu.dhl.com/track/shipments
DHL_API_KEY=...
DHL_API_SECRET=...
FIREBASE_SERVICE_ACCOUNT={...}
```

### npm audit (firebase-admin)

- `firebase-admin` puede reportar vulnerabilidades transitivas en `npm audit`.
- No se recomienda ejecutar `npm audit fix --force` porque puede forzar versiones con cambios incompatibles.
- Si necesitas actualizar, hazlo de forma controlada y valida las functions en Netlify.

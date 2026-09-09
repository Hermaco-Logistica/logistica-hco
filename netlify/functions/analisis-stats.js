import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const CACHE_COLLECTION = 'analisis_cache';
const CACHE_TTL_MS = 5 * 60 * 1000;

/* ── firebase-admin init (same cascade as tracking-status.js) ── */
const initAdmin = () => {
  if (admin.apps?.length) return admin.app();

  const tryFile = (p) => {
    if (fs.existsSync(p)) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(p, 'utf8'))) });
      return true;
    }
    return false;
  };

  if (tryFile(path.resolve(process.cwd(), 'service_account_dev.json'))) return admin.app();

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
    return admin.app();
  }

  if (tryFile(path.resolve(process.cwd(), 'service_account.json'))) return admin.app();

  throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
};

const getAuthToken = (event) => {
  const h = event.headers?.authorization || event.headers?.Authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
};

/* ── helpers ── */
const parseDate = (val) => {
  if (!val) return null;
  if (typeof val.toDate === 'function') try { return val.toDate(); } catch { return null; }
  if (typeof val._seconds === 'number') return new Date(val._seconds * 1000);
  if (typeof val.seconds === 'number') return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const normalizar = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/* ── Firestore query builder ── */
const buildQuery = (db, { periodo, fechaInicio, fechaFin, anio }) => {
  let q = db.collection('solicitudes');
  const now = new Date();

  if (periodo === 'custom' && fechaInicio) {
    q = q.where('fechaS', '>=', new Date(`${fechaInicio}T00:00:00-06:00`));
    if (fechaFin) q = q.where('fechaS', '<=', new Date(`${fechaFin}T23:59:59.999-06:00`));
  } else if (periodo === 'historico' && anio && anio !== 'todos') {
    const y = parseInt(anio, 10);
    q = q.where('fechaS', '>=', new Date(`${y}-01-01T00:00:00-06:00`));
    q = q.where('fechaS', '<=', new Date(`${y}-12-31T23:59:59.999-06:00`));
  } else if (periodo === 'this_year') {
    // Use El Salvador timezone for "current year"
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/El_Salvador', year: 'numeric' });
    const y = parseInt(fmt.format(now), 10);
    q = q.where('fechaS', '>=', new Date(`${y}-01-01T00:00:00-06:00`));
    q = q.where('fechaS', '<=', new Date(`${y}-12-31T23:59:59.999-06:00`));
  } else if (['7d', '30d', '90d'].includes(periodo)) {
    const days = { '7d': 7, '30d': 30, '90d': 90 }[periodo];
    q = q.where('fechaS', '>=', new Date(now.getTime() - days * 86400000));
  }
  // 'all', 'historico' with 'todos' → no date filter

  return q;
};

/* ── aggregation (mirrors client-side useMemo logic) ── */
const aggregate = (solicitudes, vendedorFilter) => {
  let data = solicitudes;
  if (vendedorFilter) data = data.filter(s => s.vendedorNombre === vendedorFilter);

  // ── metricas ──
  let pendientes = 0, cotizadas = 0, cotizadasParcial = 0, pedidos = 0, pedidosParcial = 0;
  let montoCotizadoTotal = 0, montoPedidoTotal = 0;
  let totalDiasCot = 0, cotConTiempo = 0;

  data.forEach(s => {
    const est = s.estado || 'Pendiente';
    if (est === 'Pendiente') pendientes++;
    else if (est === 'Cotizado') cotizadas++;
    else if (est === 'Cotizado Parcial') cotizadasParcial++;
    else if (est === 'Pedido') pedidos++;
    else if (est === 'Pedido Parcial') pedidosParcial++;

    if (Array.isArray(s.productos)) {
      s.productos.forEach(p => {
        const cant = Number(p.cant || 1);
        const fob = Number(p.fob || 0);
        let unitario = Number(p.precioUnitario || p.precio || 0);
        if (!unitario && p.subtotal && cant > 0) {
          unitario = Number(p.subtotal) / cant;
        }
        if (!unitario && fob > 0) {
          unitario = fob;
        }

        if (unitario > 0) {
          montoCotizadoTotal += unitario * cant;
        }

        const esItemPedido = p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado' || 
          (est === 'Pedido' && p.estadoItem !== 'Cotizado' && p.estadoItem !== 'Pendiente');
        if (esItemPedido && unitario > 0) {
          montoPedidoTotal += unitario * cant;
        }
      });
    }

    const fI = parseDate(s.fechaS || s.fechaCreacion);
    const fC = parseDate(s.fechaCotizacion);
    if (fI && fC && fC >= fI) {
      totalDiasCot += (fC.getTime() - fI.getTime()) / 86400000;
      cotConTiempo++;
    }
  });

  const totalCotDir = cotizadas + cotizadasParcial + pedidos + pedidosParcial;

  const metricas = {
    total: data.length,
    pendientes,
    cotizadas: cotizadas + cotizadasParcial,
    cotizadasCompletas: cotizadas,
    cotizadasParciales: cotizadasParcial,
    pedidos,
    pedidosCompletos: pedidos,
    pedidosParciales: pedidosParcial,
    tasaConversion: totalCotDir > 0 ? ((pedidos / totalCotDir) * 100).toFixed(1) : 0,
    montoCotizadoTotal,
    montoPedidoTotal,
    tiempoPromedioDias: cotConTiempo > 0 ? totalDiasCot / cotConTiempo : null,
  };

  // ── topProductos ──
  const prodMap = {};
  data.forEach(s => {
    if (!Array.isArray(s.productos)) return;
    s.productos.forEach(p => {
      const desc = (p.desc || p.descripcion || 'Sin descripción').trim().toUpperCase();
      const key = normalizar(desc);
      if (!key) return;
      const cant = Number(p.cant || 1);
      const marca = (p.marca || '').trim();
      const ganado = p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado' || 
        (s.estado === 'Pedido' && p.estadoItem !== 'Cotizado' && p.estadoItem !== 'Pendiente');
      if (!prodMap[key]) prodMap[key] = { desc, marca, veces: 0, unidades: 0, ganadas: 0, unidadesGanadas: 0 };
      prodMap[key].veces++;
      prodMap[key].unidades += cant;
      if (ganado) { prodMap[key].ganadas++; prodMap[key].unidadesGanadas += cant; }
      if (!prodMap[key].marca && marca) prodMap[key].marca = marca;
    });
  });
  const topProductos = Object.values(prodMap).sort((a, b) => b.veces - a.veces || b.unidades - a.unidades);

  // ── statsVendedores ──
  const vMap = {};
  data.forEach(s => {
    const v = s.vendedorNombre || 'Sin asignar';
    if (!vMap[v]) vMap[v] = { nombre: v, total: 0, cotizadas: 0, pedidos: 0, pedidosParciales: 0 };
    vMap[v].total++;
    if (['Cotizado', 'Cotizado Parcial', 'Pedido', 'Pedido Parcial'].includes(s.estado)) vMap[v].cotizadas++;
    if (s.estado === 'Pedido' || s.estado === 'Comprado') vMap[v].pedidos++;
    else if (s.estado === 'Pedido Parcial') vMap[v].pedidosParciales++;
  });
  const statsVendedores = Object.values(vMap).sort((a, b) => b.total - a.total);

  // ── topClientes ──
  const cMap = {};
  data.forEach(s => {
    const c = (s.cliente || '').trim() || 'Desconocido';
    if (!cMap[c]) cMap[c] = { cliente: c, total: 0, pedidos: 0, pedidosParciales: 0 };
    cMap[c].total++;
    if (s.estado === 'Pedido' || s.estado === 'Comprado') cMap[c].pedidos++;
    else if (s.estado === 'Pedido Parcial') cMap[c].pedidosParciales++;
  });
  const topClientes = Object.values(cMap).sort((a, b) => b.total - a.total);

  // ── vendedoresDisponibles (from ALL solicitudes, not filtered by vendedor) ──
  const vendedoresDisponibles = [...new Set(solicitudes.map(s => s.vendedorNombre).filter(Boolean))].sort();

  return { metricas, topProductos, statsVendedores, topClientes, vendedoresDisponibles };
};

/* ── handler ── */
export const handler = async (event) => {
  const H = { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' };

  try {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: H, body: '' };

    const token = getAuthToken(event);
    if (!token) return { statusCode: 401, headers: H, body: JSON.stringify({ message: 'auth_required' }) };

    const app = initAdmin();
    const decoded = await app.auth().verifyIdToken(token);
    if (!decoded?.uid) return { statusCode: 401, headers: H, body: JSON.stringify({ message: 'auth_invalid' }) };

    const db = app.firestore();
    const qs = event.queryStringParameters || {};
    const periodo = qs.periodo || '30d';
    const fechaInicio = qs.fechaInicio || '';
    const fechaFin = qs.fechaFin || '';
    const anio = qs.anio || '';
    const vendedorFilter = qs.vendedor || '';

    // Cache (v2 with montoCotizadoTotal fix)
    const cacheKey = `v2_${periodo}:${fechaInicio}:${fechaFin}:${anio}:${vendedorFilter}`.replace(/[/\\#.[\]*]/g, '_');
    const cacheRef = db.collection(CACHE_COLLECTION).doc(cacheKey);
    const cacheSnap = await cacheRef.get();
    const cd = cacheSnap.exists ? cacheSnap.data() : null;

    if (cd?.payload && cd?.lastCheckedAt?.toMillis) {
      if (Date.now() - cd.lastCheckedAt.toMillis() < CACHE_TTL_MS) {
        return { statusCode: 200, headers: H, body: JSON.stringify({ ...cd.payload, cached: true }) };
      }
    }

    // Query + aggregate
    const q = buildQuery(db, { periodo, fechaInicio, fechaFin, anio });
    const snap = await q.limit(2000).get();
    const solicitudes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const payload = aggregate(solicitudes, vendedorFilter);

    // Write cache
    await cacheRef.set({
      payload,
      lastCheckedAt: admin.firestore.Timestamp.fromMillis(Date.now()),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { statusCode: 200, headers: H, body: JSON.stringify({ ...payload, cached: false }) };
  } catch (err) {
    console.error('analisis-stats error:', err);
    return { statusCode: 500, headers: H, body: JSON.stringify({ message: 'server_error', detail: err?.message }) };
  }
};

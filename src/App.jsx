import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db, provider } from './firebase'; 
import { onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { collection, query, onSnapshot, where, doc, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { emailConfig } from './config/emailConfig';


// Componentes y Vistas
import { Sidebar } from './components/Sidebar';
import { Login } from './views/auth/Login';
import { DashboardCompras } from './views/comprador/DashboardCompras';
import { Calculadora } from './views/comprador/Calculadora';
import { GestionOC } from './views/comprador/GestionOC';
import { DashboardVendedor } from './views/vendedor/DashboardVendedor';
import { NuevaRFQ } from './views/vendedor/NuevaRFQ';
import { DetalleRFQVendedor } from './views/vendedor/DetalleRFQVendedor';
import { DashboardPedidos } from './views/pedidos/DashboardPedidos';

const resolveRoleFromEmail = (email = '') => {
  const value = email.toLowerCase();
  if (value.includes('admin') || value.includes('administrador')) return 'administrador';
  if (value.includes('gerente')) return 'gerente';
  if (value.includes('compras')) return 'comprador';
  return 'vendedor';
};

// `selected` solo controla la interfaz de la calculadora y no representa un
// cambio comercial en la cotización.
const normalizarParaComparacion = (valor) => {
  if (Array.isArray(valor)) return valor.map(normalizarParaComparacion);
  if (valor && typeof valor === 'object' && !(valor instanceof Date)) {
    return Object.keys(valor)
      .filter((clave) => clave !== 'selected')
      .sort()
      .reduce((resultado, clave) => {
        resultado[clave] = normalizarParaComparacion(valor[clave]);
        return resultado;
      }, {});
  }
  return valor;
};

const sonIgualesParaCotizacion = (anterior, nuevo) =>
  JSON.stringify(normalizarParaComparacion(anterior)) === JSON.stringify(normalizarParaComparacion(nuevo));

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState([]);
  const [isFindexSettingsOpen, setIsFindexSettingsOpen] = useState(false);
  const [isFindexActive, setIsFindexActive] = useState(true);

  useEffect(() => {
    import('./services/apiClient').then(({ apiClient }) => {
      apiClient.onFindexAuthFailure = () => setIsFindexActive(false);
      apiClient.onFindexAuthSuccess = () => setIsFindexActive(true);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        if (u.email.endsWith('@hermaco.net')) {
          try {
            const userRef = doc(db, 'users', u.uid);
            const userSnap = await getDoc(userRef);
            
            let userRole = 'vendedor';
            
            if (userSnap.exists()) {
              const data = userSnap.data();
              userRole = data.role || data.rol || resolveRoleFromEmail(u.email);
              if (!data.findexCredentials) {
                setIsFindexSettingsOpen(true);
              }
              // Actualizar último login de forma no bloqueante
              updateDoc(userRef, { lastLoginAt: serverTimestamp() }).catch(() => {});
            } else {
              // Registro automático para usuarios nuevos y migración limpia de antiguos
              userRole = resolveRoleFromEmail(u.email);
              await setDoc(userRef, {
                uid: u.uid,
                email: u.email,
                displayName: u.displayName || u.email.split('@')[0],
                role: userRole,
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp()
              });
              setIsFindexSettingsOpen(true);
            }

            setUser(u);
            setRole(userRole);
            
          } catch (err) {
            console.error("Error al sincronizar usuario en Firestore:", err);
            // Fallback de seguridad en caso de error de red o permisos
            setUser(u);
            setRole(resolveRoleFromEmail(u.email));
          }
        } else {
          signOut(auth);
          alert("Acceso denegado. Solo se permiten correos de @hermaco.net");
          setUser(null);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !role) return;
    const q = (role === 'comprador' || role === 'gerente' || role === 'administrador')
      ? collection(db, "solicitudes") 
      : query(collection(db, "solicitudes"), where("vendedorId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snap) => {
      setSolicitudes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [user, role]);


  const handleGuardarCotizacion = async (items, fa, fm, fl, ad, ta, sc, ax, mj, sg, el, og, fletePicard, aduanaPicard, rfqId, pdfBase64) => {
    try {
      if (!rfqId) throw new Error("ID de RFQ no válido");
      
      const rfqDocRef = doc(db, "solicitudes", rfqId);
      const rfqSnap = await getDoc(rfqDocRef);
      let correlativo = "N/A";
      let cliente = "N/A"; void cliente;
      let vendedorNombre = "Vendedor";
      let vendedorEmail = "";
      let rfqData = {};
      if (rfqSnap.exists()) {
        rfqData = rfqSnap.data();
        correlativo = rfqData.correlativo || "N/A";
        cliente = rfqData.cliente || "N/A";
        vendedorNombre = rfqData.vendedorNombre || "Vendedor";
        vendedorEmail = rfqData.vendedorEmail || "";
      }

      // Una cotización finalizada es un documento cerrado: no debe guardarse
      // otra vez ni generar un correo duplicado desde una pantalla o URL abierta.
      if (rfqData.estado === 'Cotizado' || rfqData.estado === 'Pedido') {
        throw new Error("Esta solicitud ya está cotizada y no admite una nueva cotización.");
      }

      // Preservar datos de ítems previamente pedidos por el vendedor
      const productosGuardadosEnBD = rfqData.productos || [];
      const productosProcesados = items.map((newItem, idx) => {
        const itemExistenteBD = productosGuardadosEnBD[idx] || {};
        const esPedidoPrevio = itemExistenteBD.estadoItem === 'Pedido' || itemExistenteBD.estadoItem === 'Comprado' || (!!itemExistenteBD.modalidad && Number(itemExistenteBD.precioUnitario || 0) > 0);

        if (esPedidoPrevio) {
          // Mantener intactos todos los datos de la confirmación previa del vendedor
          return {
            ...newItem,
            ...itemExistenteBD,
            fob: Number(newItem.fob) > 0 ? newItem.fob : itemExistenteBD.fob
          };
        }
        return newItem;
      });

      // LÓGICA DE ESTADO GLOBAL DE LA SOLICITUD
      const hayPedidos = productosProcesados.some(p => p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado');
      const todosPedidos = productosProcesados.length > 0 && productosProcesados.every(p => p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado');
      const hayItemsSinCotizar = productosProcesados.some(p => !p.fob || Number(p.fob) <= 0);

      const tieneItemsCotizados = productosProcesados.some(p => Number(p.fob || 0) > 0);

      let estadoFinal = 'Cotizado';
      if (todosPedidos) {
        estadoFinal = 'Pedido';
      } else if (hayPedidos) {
        estadoFinal = 'Pedido Parcial';
      } else if (!tieneItemsCotizados) {
        estadoFinal = 'Pendiente';
      } else if (hayItemsSinCotizar) {
        estadoFinal = 'Cotizado Parcial';
      } else {
        estadoFinal = 'Cotizado';
      }
      
      const updatePayload = {
        productos: productosProcesados, 
        factorA: fa, 
        factorM: fm, 
        fleteAereo: fl, 
        aduanaAerea: ad,
        fleteAereoPicard: fletePicard,
        aduanaAereaPicard: aduanaPicard,
        tramiteAduanal: ta,
        scan: sc,
        adimex: ax,
        manejos: mj,
        seguro: sg,
        entregaLocal: el,
        otrosGastos: og,
        estado: estadoFinal, 
        fechaCotizacion: new Date()
      };

      if (rfqData.linkOC) updatePayload.linkOC = rfqData.linkOC;
      if (rfqData.notasPedido) updatePayload.notasPedido = rfqData.notasPedido;

      const camposComparables = [
        'productos', 'factorA', 'factorM', 'fleteAereo', 'aduanaAerea', 'fleteAereoPicard', 'aduanaAereaPicard',
        'tramiteAduanal', 'scan', 'adimex', 'manejos', 'seguro',
        'entregaLocal', 'otrosGastos', 'estado'
      ];
      const sinCambios = camposComparables.every((campo) =>
        sonIgualesParaCotizacion(rfqData[campo], updatePayload[campo])
      );

      if (sinCambios) {
        alert("No se detectaron cambios. La cotización ya estaba guardada y no se envió ningún correo.");
        return true;
      }

      await updateDoc(rfqDocRef, updatePayload);
      
      // Enviar correo automático con PDF adjunto SOLO si hay ítems cotizados con precio
      const mailConfig = emailConfig.cotizacionFinalizada;
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      // En local/sandbox (desarrollo): destinatarios y CC van ÚNICAMENTE a rvides@hermaco.net.
      // En producción: TO va al vendedor asignado y CC a la lista corporativa (compras, chernandez, fsalinas, oventura).
      const destinatarioTo = isLocal ? ["rvides@hermaco.net"] : (vendedorEmail ? [vendedorEmail] : (mailConfig.to || []));
      const ccEmails = isLocal ? ["rvides@hermaco.net"] : (mailConfig.cc || []);
      
      const senderFrom = isLocal ? 'rvides@hermaco.net <rvides@hermaco.net>' : 'compras@hermaco.net <compras@hermaco.net>';

      if (tieneItemsCotizados && destinatarioTo.length && pdfBase64) {
        const subject = `Cotización #${correlativo}`;
        const bodyHtml = `
          <p>Estimado ${vendedorNombre},</p>
          <p>Adjunto encontrará su cotización.</p>
          <p>Saludos cordiales.</p>
        `;
        
        const mailRes = await fetch('/.netlify/functions/send-quotation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdf: pdfBase64,
            from: senderFrom,
            to: destinatarioTo,
            cc: ccEmails,
            subject,
            filename: `cotizacion_${correlativo}.pdf`,
            bodyHtml
          })
        });

        if (!mailRes.ok) {
          const errData = await mailRes.json().catch(() => ({}));
          throw new Error(errData.detail || errData.message || "Error al enviar el correo");
        }
      }

      const esParcial = estadoFinal === 'Cotizado Parcial' || estadoFinal === 'Pedido Parcial';
      alert(esParcial ? "Avance Parcial Guardado" : "Cotización Finalizada");
      return true;
    } catch (e) { 
      console.error(e); 
      alert("Error al guardar cotización: " + e.message);
      return false;
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-300 animate-pulse uppercase tracking-[0.4em]">Cargando logisticaHCO...</div>;

  const isComprador = role === 'comprador';
  const isVendedor = role === 'vendedor';
  const isGerente = role === 'gerente';
  const isAdmin = role === 'administrador';

  const appThemeClass = `role-${role || 'default'}`;

  return (
    <Router>
      {!user ? (
        <Routes>
          <Route path="/login" element={<Login loginFn={() => signInWithPopup(auth, provider)} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <div className={`tf-app-shell ${appThemeClass} flex h-screen overflow-hidden`}>
          <Sidebar role={role} userEmail={user.email} onLogout={() => signOut(auth)} isFindexSettingsOpen={isFindexSettingsOpen} setIsFindexSettingsOpen={setIsFindexSettingsOpen} isFindexActive={isFindexActive} />
          <main className="flex-1 overflow-y-auto p-8">
            <Routes>
              {isComprador ? (
                <>
                  <Route path="/" element={<Navigate to="/compras" replace />} />
                  <Route path="/compras" element={<DashboardCompras solicitudes={solicitudes} readOnly={false} />} />
                  <Route path="/pedidos" element={<DashboardPedidos role={role} />} />
                  <Route path="/gestion-oc" element={<GestionOC readOnly={false} />} />
                  <Route 
                    path="/calculadora/:id" 
                    element={
                      <Calculadora onGuardar={(items, fa, fm, fl, ad, ta, sc, ax, mj, sg, el, og, fletePicard, aduanaPicard, pdfBase64) => {
                        const rfqId = window.location.pathname.split('/').pop();
                        return handleGuardarCotizacion(items, fa, fm, fl, ad, ta, sc, ax, mj, sg, el, og, fletePicard, aduanaPicard, rfqId, pdfBase64);
                      }} />
                    } 
                  />
                  <Route path="*" element={<Navigate to="/compras" replace />} />
                </>
              ) : isVendedor ? (
                <>
                  <Route path="/" element={<Navigate to="/vendedor" replace />} />
                  <Route path="/vendedor" element={<DashboardVendedor solicitudes={solicitudes} canCreate role={role} />} />
                  <Route path="/vendedor/nueva" element={<NuevaRFQ />} />
                  <Route path="/vendedor/detalle/:id" element={<DetalleRFQVendedor canGenerarPedido />} />
                  <Route path="/pedidos" element={<DashboardPedidos role={role} />} />
                  <Route path="*" element={<Navigate to="/vendedor" replace />} />
                </>
              ) : isGerente ? (
                <>
                  <Route path="/" element={<Navigate to="/vendedor" replace />} />
                  <Route path="/vendedor" element={<DashboardVendedor solicitudes={solicitudes} canCreate title="Solicitudes Globales" role={role} />} />
                  <Route path="/vendedor/nueva" element={<NuevaRFQ />} />
                  <Route path="/vendedor/detalle/:id" element={<DetalleRFQVendedor canGenerarPedido={false} />} />
                  <Route path="/compras" element={<DashboardCompras solicitudes={solicitudes} readOnly />} />
                  <Route path="/pedidos" element={<DashboardPedidos role={role} />} />
                  <Route path="*" element={<Navigate to="/vendedor" replace />} />
                </>
              ) : isAdmin ? (
                <>
                  <Route path="/" element={<Navigate to="/vendedor" replace />} />
                  <Route path="/vendedor" element={<DashboardVendedor solicitudes={solicitudes} canCreate={false} title="Solicitudes Globales" role={role} />} />
                  <Route path="/vendedor/nueva" element={<NuevaRFQ />} />
                  <Route path="/vendedor/detalle/:id" element={<DetalleRFQVendedor canGenerarPedido={false} />} />
                  <Route path="/compras" element={<DashboardCompras solicitudes={solicitudes} readOnly />} />
                  <Route path="/pedidos" element={<DashboardPedidos role={role} />} />
                  <Route path="/gestion-oc" element={<GestionOC readOnly />} />
                  <Route path="*" element={<Navigate to="/vendedor" replace />} />
                </>
              ) : (
                <Route path="*" element={<Navigate to="/login" replace />} />
              )}
            </Routes>
          </main>
        </div>
      )}
    </Router>
  );
}

export default App;

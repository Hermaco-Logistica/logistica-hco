import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db, provider } from './firebase'; 
import { onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { collection, query, onSnapshot, where, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
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

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u && u.email.endsWith('@hermaco.net')) {
        setUser(u);
        setRole(resolveRoleFromEmail(u.email));
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

  const handleNuevaSolicitud = async (datos) => {
    try {
      await addDoc(collection(db, "solicitudes"), datos);
      alert("Solicitud Creada");
    } catch (e) { console.error(e); }
  };

  const handleGuardarCotizacion = async (items, fa, fm, fl, ad, rfqId, pdfBase64) => {
    try {
      if (!rfqId) throw new Error("ID de RFQ no válido");
      
      const rfqDocRef = doc(db, "solicitudes", rfqId);
      const rfqSnap = await getDoc(rfqDocRef);
      let correlativo = "N/A";
      let cliente = "N/A";
      let vendedorNombre = "Vendedor";
      let vendedorEmail = "";
      if (rfqSnap.exists()) {
        const rfqData = rfqSnap.data();
        correlativo = rfqData.correlativo || "N/A";
        cliente = rfqData.cliente || "N/A";
        vendedorNombre = rfqData.vendedorNombre || "Vendedor";
        vendedorEmail = rfqData.vendedorEmail || "";
      }

      // LÓGICA DE ESTADO: Si hay algún item con FOB 0 o vacío, es Parcial
      const esParcial = items.some(p => !p.fob || Number(p.fob) <= 0);
      const estadoFinal = esParcial ? 'Cotizado Parcial' : 'Cotizado';
      
      await updateDoc(rfqDocRef, {
        productos: items, 
        factorA: fa, 
        factorM: fm, 
        fleteAereo: fl, 
        aduanaAerea: ad,
        estado: estadoFinal, 
        fechaCotizacion: new Date()
      });
      
      // Enviar correo automático con PDF adjunto (requerido para éxito)
      const mailConfig = emailConfig.cotizacionFinalizada;
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      // En local/sandbox, forzar destinatario a compras@hermaco.net
      // En prod va al vendedor asignado
      const destinatarioTo = isLocal ? (mailConfig.to || []) : (vendedorEmail ? [vendedorEmail] : (mailConfig.to || []));
      
      // Si estamos en local, agregamos a rvides@hermaco.net en CC para desarrollo.
      // En prod usamos la lista de CC real configurada
      const ccEmails = isLocal ? ["rvides@hermaco.net"] : (mailConfig.cc || []);
      
      if (destinatarioTo.length && pdfBase64) {
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
          <Sidebar role={role} userEmail={user.email} onLogout={() => signOut(auth)} />
          <main className="flex-1 overflow-y-auto p-8">
            <Routes>
              {isComprador ? (
                <>
                  <Route path="/compras" element={<DashboardCompras solicitudes={solicitudes} readOnly={false} />} />
                  <Route path="/pedidos" element={<DashboardPedidos role={role} />} />
                  <Route path="/gestion-oc" element={<GestionOC readOnly={false} />} />
                  <Route 
                    path="/calculadora/:id" 
                    element={
                      <Calculadora onGuardar={(items, fa, fm, fl, ad, pdfBase64) => {
                        const rfqId = window.location.pathname.split('/').pop();
                        return handleGuardarCotizacion(items, fa, fm, fl, ad, rfqId, pdfBase64);
                      }} />
                    } 
                  />
                  <Route path="*" element={<Navigate to="/compras" replace />} />
                </>
              ) : isVendedor ? (
                <>
                  <Route path="/vendedor" element={<DashboardVendedor solicitudes={solicitudes} canCreate />} />
                  <Route path="/vendedor/nueva" element={<NuevaRFQ onFinalizar={handleNuevaSolicitud} />} />
                  <Route path="/vendedor/detalle/:id" element={<DetalleRFQVendedor canGenerarPedido />} />
                  <Route path="/pedidos" element={<DashboardPedidos role={role} />} />
                  <Route path="*" element={<Navigate to="/vendedor" replace />} />
                </>
              ) : isGerente ? (
                <>
                  <Route path="/vendedor" element={<DashboardVendedor solicitudes={solicitudes} canCreate title="Solicitudes Globales" />} />
                  <Route path="/vendedor/nueva" element={<NuevaRFQ onFinalizar={handleNuevaSolicitud} />} />
                  <Route path="/vendedor/detalle/:id" element={<DetalleRFQVendedor canGenerarPedido={false} />} />
                  <Route path="/compras" element={<DashboardCompras solicitudes={solicitudes} readOnly />} />
                  <Route path="/pedidos" element={<DashboardPedidos role={role} />} />
                  <Route path="/gestion-oc" element={<GestionOC readOnly />} />
                  <Route path="*" element={<Navigate to="/vendedor" replace />} />
                </>
              ) : isAdmin ? (
                <>
                  <Route path="/vendedor" element={<DashboardVendedor solicitudes={solicitudes} canCreate={false} title="Solicitudes Globales" />} />
                  <Route path="/vendedor/detalle/:id" element={<DetalleRFQVendedor canGenerarPedido={false} />} />
                  <Route path="/compras" element={<DashboardCompras solicitudes={solicitudes} readOnly />} />
                  <Route path="/pedidos" element={<DashboardPedidos role={role} />} />
                  <Route path="/gestion-oc" element={<GestionOC readOnly />} />
                  <Route path="*" element={<Navigate to="/compras" replace />} />
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
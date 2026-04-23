import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db, provider } from './firebase'; 
import { onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { collection, query, onSnapshot, where, addDoc, doc, updateDoc } from 'firebase/firestore';

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

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u && u.email.endsWith('@hermaco.net')) {
        setUser(u);
        setRole(u.email.includes('compras') ? 'comprador' : 'vendedor');
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
    const q = role === 'comprador' 
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

  const handleGuardarCotizacion = async (items, fa, fm, fl, ad, rfqId) => {
    try {
      if (!rfqId) throw new Error("ID de RFQ no válido");
      
      await updateDoc(doc(db, "solicitudes", rfqId), {
        productos: items, 
        factorA: fa, 
        factorM: fm, 
        fleteAereo: fl, 
        aduanaAerea: ad,
        estado: 'Cotizado', 
        fechaCotizacion: new Date()
      });
      alert("Cotización Guardada");
      return true;
    } catch (e) { 
      console.error(e); 
      alert("Error al guardar cotización");
      return false;
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-300 animate-pulse uppercase tracking-[0.4em]">Cargando TradeFlow...</div>;

  return (
    <Router>
      {!user ? (
        <Routes>
          <Route path="/login" element={<Login loginFn={() => signInWithPopup(auth, provider)} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <div className="tf-app-shell flex h-screen overflow-hidden">
          <Sidebar role={role} userEmail={user.email} onLogout={() => signOut(auth)} />
          <main className="flex-1 overflow-y-auto p-8">
            <Routes>
              {role === 'comprador' ? (
                <>
                  <Route path="/compras" element={<DashboardCompras solicitudes={solicitudes} />} />
                  <Route path="/pedidos" element={<DashboardPedidos role={role} />} />
                  <Route path="/gestion-oc" element={<GestionOC />} />
                  <Route 
                    path="/calculadora/:id" 
                    element={
                      <Calculadora onGuardar={(items, fa, fm, fl, ad) => {
                        const rfqId = window.location.pathname.split('/').pop();
                        return handleGuardarCotizacion(items, fa, fm, fl, ad, rfqId);
                      }} />
                    } 
                  />
                  <Route path="*" element={<Navigate to="/compras" replace />} />
                </>
              ) : (
                <>
                  <Route path="/vendedor" element={<DashboardVendedor solicitudes={solicitudes} />} />
                  <Route path="/vendedor/nueva" element={<NuevaRFQ onFinalizar={handleNuevaSolicitud} />} />
                  <Route path="/vendedor/detalle/:id" element={<DetalleRFQVendedor />} />
                  <Route path="/pedidos" element={<DashboardPedidos role={role} />} />
                  <Route path="*" element={<Navigate to="/vendedor" replace />} />
                </>
              )}
            </Routes>
          </main>
        </div>
      )}
    </Router>
  );
}

export default App;
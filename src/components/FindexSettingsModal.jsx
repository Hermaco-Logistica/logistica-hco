import React, { useState } from 'react';
import { AlertCircle, Settings, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Modal, ModalBoton, ModalCallout, ModalCampo, ModalCuerpo, ModalEncabezado, ModalPie, ModalSeccion } from './Modal';
import { auth } from '../firebase';

export const FindexSettingsModal = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const idToken = await auth.currentUser.getIdToken();
      
      const res = await fetch('/.netlify/functions/save-findex-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Error al guardar las credenciales');
      }

      // Validar las credenciales inmediatamente y obtener la cookie
      const loginRes = await fetch('/.netlify/functions/auto-findex-login', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!loginRes.ok) {
        throw new Error('Las credenciales se guardaron pero son incorrectas para Findex.');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setUsername('');
        setPassword('');
      }, 2000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal etiqueta="Conexión con Findex" variante="hoja" onCerrar={onClose} bloqueado={loading} como="form" onSubmit={handleSave}>
      <ModalEncabezado
        titulo="Conexión con Findex"
        subtitulo="Tus credenciales se guardan encriptadas de forma segura."
        icono={Settings}
        tono="exito"
        onCerrar={onClose}
        cerrarDeshabilitado={loading}
      />
      <ModalCuerpo>
        <p className="text-[13.5px] leading-[1.45] text-neutral-500">
          Ingresa tus credenciales de Findex para habilitar la búsqueda en tiempo real.
        </p>

        <ModalSeccion etiqueta="Usuario de Findex" htmlFor="findex-usuario">
          <ModalCampo id="findex-usuario" tono="exito" type="text" required value={username} onChange={(e) => setUsername(e.target.value)} />
        </ModalSeccion>

        <ModalSeccion etiqueta="Contraseña" htmlFor="findex-contrasena">
          <div className="relative">
            <ModalCampo id="findex-contrasena" tono="exito" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="pr-12" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-3 top-3 flex size-6 items-center justify-center text-neutral-400 transition-colors hover:text-neutral-600"
            >
              {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
            </button>
          </div>
        </ModalSeccion>

        {error && <ModalCallout tono="peligro" icono={AlertCircle} role="alert">{error}</ModalCallout>}
        {success && <ModalCallout tono="exito" icono={CheckCircle2}>Credenciales guardadas</ModalCallout>}
      </ModalCuerpo>
      <ModalPie>
        <ModalBoton onClick={onClose} disabled={loading}>Cerrar</ModalBoton>
        {!success && (
          <ModalBoton type="submit" variante="primario" tono="exito" icono={loading ? Loader2 : undefined} disabled={loading}>
            {loading ? 'Encriptando y guardando...' : 'Guardar credenciales'}
          </ModalBoton>
        )}
      </ModalPie>
    </Modal>
  );
};

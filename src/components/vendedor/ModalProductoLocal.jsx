import React from 'react';
import { Loader2, PlusCircle } from 'lucide-react';
import { Modal, ModalBoton, ModalCampo, ModalCuerpo, ModalEncabezado, ModalPie, ModalSeccion } from '../Modal';

/**
 * Alta de un producto local desde los formularios de nueva solicitud y nuevo pedido.
 * `estado`: { sku, producto, marca, saving }. `onCambiar` recibe un parche; `onGuardar` guarda y cierra.
 */
export const ModalProductoLocal = ({ estado, onCambiar, onGuardar, onCerrar }) => {
  const campo = (clave) => (evento) => onCambiar({ [clave]: evento.target.value.toUpperCase() });
  const guardando = Boolean(estado.saving);

  return (
    <Modal etiqueta="Nuevo producto local" variante="hoja" onCerrar={onCerrar} bloqueado={guardando}>
      <ModalEncabezado
        titulo="Nuevo producto local"
        subtitulo="Se guardará en tu catálogo para usarlo en futuras solicitudes."
        icono={PlusCircle}
        tono="rol"
        onCerrar={onCerrar}
        cerrarDeshabilitado={guardando}
      />
      <ModalCuerpo>
        <ModalSeccion etiqueta="Código (SKU)" htmlFor="producto-local-sku">
          <ModalCampo id="producto-local-sku" tono="rol" type="text" className="uppercase" value={estado.sku} onChange={campo('sku')} placeholder="SKU" autoFocus />
        </ModalSeccion>
        <ModalSeccion etiqueta="Nombre / descripción" htmlFor="producto-local-nombre">
          <ModalCampo id="producto-local-nombre" tono="rol" type="text" className="uppercase" value={estado.producto} onChange={campo('producto')} placeholder="Descripción" />
        </ModalSeccion>
        <ModalSeccion etiqueta="Marca" htmlFor="producto-local-marca">
          <ModalCampo id="producto-local-marca" tono="rol" type="text" className="uppercase" value={estado.marca} onChange={campo('marca')} placeholder="Marca" />
        </ModalSeccion>
      </ModalCuerpo>
      <ModalPie>
        <ModalBoton onClick={onCerrar} disabled={guardando}>Cancelar</ModalBoton>
        <ModalBoton variante="primario" tono="rol" icono={guardando ? Loader2 : PlusCircle} onClick={onGuardar} disabled={guardando || !estado.sku || !estado.producto}>
          Guardar
        </ModalBoton>
      </ModalPie>
    </Modal>
  );
};

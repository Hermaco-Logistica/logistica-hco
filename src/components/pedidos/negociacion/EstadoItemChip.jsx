import React from 'react';
import { Etiqueta } from '../../Etiqueta';

export const EstadoItemChip = ({ estado, pendingRole, stacked = false }) => (
  <div className={`flex gap-1.5 ${stacked ? 'flex-col items-center' : 'flex-col items-end sm:flex-row sm:items-center'}`}>
    <Etiqueta dominio="estadoItem" valor={estado} tamano={stacked ? 'compacta' : 'normal'} />
    {!!pendingRole && (
      <Etiqueta tono="suave" tamano={stacked ? 'compacta' : 'normal'}>
        Turno {pendingRole === 'compras' ? 'Compras' : 'Vendedor'}
      </Etiqueta>
    )}
  </div>
);

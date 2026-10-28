import React from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProrrogasBell = ({ count = 0, className = '' }) => (
  <Link
    to="/prorrogas"
    aria-label={`Ir a prórrogas${count ? `, ${count} por atender` : ''}`}
    title={`Prórrogas${count ? ` por atender: ${count}` : ''}`}
    className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${className}`}
  >
    <Bell size={19} aria-hidden="true" />
    {count > 0 && (
      <span className="absolute -right-0.5 -top-0.5 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-slate-900 bg-rose-600 px-1 text-[9px] font-black leading-none text-white">
        {count > 99 ? '99+' : count}
      </span>
    )}
  </Link>
);

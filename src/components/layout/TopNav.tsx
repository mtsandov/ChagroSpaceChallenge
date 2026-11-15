import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Database, LogIn, LogOut } from 'lucide-react';
import type { Basin } from '../../types';
import { useAuth } from '../../context/AuthContext';
import DataSourcesModal from './DataSourcesModal';
import { assetUrl } from '../../lib/api/client';

interface Props {
  basins?: Basin[];
  basinId?: string;
  onBasinChange?: (id: string) => void;
}

export default function TopNav({ basins, basinId, onBasinChange }: Props) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showSources, setShowSources] = useState(false);
  const isFarmer = user?.role === 'farmer';

  return (
    <header className="z-[1000] flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-4 py-2 shadow-sm">
      <Link to="/" className="flex items-center gap-2">
        <img src={assetUrl('favicon.svg')} alt="" className="h-8 w-8" />
        <div className="leading-tight">
          <div className="text-base font-bold text-brand-800">ChAgro</div>
          <div className="hidden text-[11px] text-slate-500 sm:block">SAR Water Transparency Monitor</div>
        </div>
      </Link>

      {basins && onBasinChange && (
        <select
          aria-label="Cuenca piloto"
          className="input max-w-[16rem] py-1.5"
          value={basinId}
          onChange={(e) => onBasinChange(e.target.value)}
        >
          {basins.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      )}

      <nav className="ml-auto flex items-center gap-1 text-sm">
        <NavLink to="/" end className={({ isActive }) => `btn-ghost px-3 py-1.5 ${isActive ? 'text-brand-700' : ''}`}>
          Visor
        </NavLink>
        {isFarmer && (
          <NavLink to="/farmer" className={({ isActive }) => `btn-ghost px-3 py-1.5 ${isActive ? 'text-brand-700' : ''}`}>
            Mis parcelas
          </NavLink>
        )}
        <button className="btn-ghost px-3 py-1.5" onClick={() => setShowSources(true)} title="Fuentes de datos">
          <Database size={16} />
          <span className="hidden md:inline">Fuentes</span>
        </button>

        <span className="hidden rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 lg:inline">
          Demo
        </span>

        {user ? (
          <div className="flex items-center gap-2 pl-2">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-xs font-semibold">{user.full_name}</div>
              <div className="text-[10px] text-slate-500">{user.role === 'farmer' ? 'Agricultor' : 'Comunidad'}</div>
            </div>
            <button
              className="btn-secondary px-2.5 py-1.5"
              onClick={() => {
                signOut();
                navigate('/');
              }}
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn-primary px-3 py-1.5">
            <LogIn size={16} /> Ingresar
          </Link>
        )}
      </nav>

      {showSources && <DataSourcesModal onClose={() => setShowSources(false)} />}
    </header>
  );
}

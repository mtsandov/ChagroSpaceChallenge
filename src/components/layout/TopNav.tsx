import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Database, LogIn, LogOut, Sprout } from 'lucide-react';
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
    <header className="z-[1000] flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 shadow-sm sm:gap-4 sm:px-4">
      <Link to="/" className="flex shrink-0 items-center gap-2">
        <img src={assetUrl('favicon.svg')} alt="" className="h-8 w-8" />
        <div className="hidden leading-tight min-[420px]:block">
          <div className="text-base font-bold text-brand-800">ChAgro</div>
          <div className="hidden text-[11px] text-slate-500 sm:block">SAR Water Transparency Monitor</div>
        </div>
      </Link>

      {basins && onBasinChange && (
        <select
          aria-label="Cuenca piloto"
          className="input min-w-0 flex-1 py-1.5 sm:max-w-[16rem] sm:flex-none"
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

      <nav className="ml-auto flex shrink-0 items-center gap-1 text-sm">
        <NavLink to="/" end className={({ isActive }) => `btn-ghost hidden px-3 py-1.5 sm:inline-flex ${isActive ? 'text-brand-700' : ''}`}>
          Visor
        </NavLink>
        {isFarmer && (
          <NavLink to="/farmer" className={({ isActive }) => `btn-ghost px-2 py-1.5 sm:px-3 ${isActive ? 'text-brand-700' : ''}`} title="Mis parcelas">
            <Sprout size={16} className="sm:hidden" />
            <span className="hidden sm:inline">Mis parcelas</span>
          </NavLink>
        )}
        <button className="btn-ghost px-2 py-1.5 sm:px-3" onClick={() => setShowSources(true)} title="Fuentes de datos">
          <Database size={16} />
          <span className="hidden md:inline">Fuentes</span>
        </button>

        <span className="hidden rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 lg:inline">
          Demo
        </span>

        {user ? (
          <div className="flex items-center gap-2 pl-1 sm:pl-2">
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
          <Link to="/login" className="btn-primary px-2.5 py-1.5 sm:px-3">
            <LogIn size={16} /> <span className="hidden sm:inline">Ingresar</span>
          </Link>
        )}
      </nav>

      {showSources && <DataSourcesModal onClose={() => setShowSources(false)} />}
    </header>
  );
}

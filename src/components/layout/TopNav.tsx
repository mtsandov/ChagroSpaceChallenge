import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Database, LogIn, LogOut, Sprout } from 'lucide-react';
import type { Basin } from '../../types';
import { useAuth } from '../../context/AuthContext';
import DataSourcesModal from './DataSourcesModal';
import { assetUrl } from '../../lib/api/client';
import { useI18n } from '../../i18n';
import LanguageToggle from './LanguageToggle';

const L = {
  es: { basin: 'Cuenca piloto', viewer: 'Visor', myParcels: 'Mis parcelas', sources: 'Fuentes', sourcesTitle: 'Fuentes de datos', farmer: 'Agricultor', community: 'Comunidad', farmerName: 'Agricultor Demo', communityName: 'Junta de Agua Demo', signOut: 'Cerrar sesión', signIn: 'Ingresar' },
  en: { basin: 'Pilot basin', viewer: 'Viewer', myParcels: 'My parcels', sources: 'Sources', sourcesTitle: 'Data sources', farmer: 'Farmer', community: 'Community', farmerName: 'Demo Farmer', communityName: 'Demo Water Board', signOut: 'Sign out', signIn: 'Sign in' },
};

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
  const { lang, tx } = useI18n();
  const s = L[lang];

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
          aria-label={s.basin}
          className="input min-w-0 flex-1 py-1.5 sm:max-w-[16rem] sm:flex-none"
          value={basinId}
          onChange={(e) => onBasinChange(e.target.value)}
        >
          {basins.map((b) => (
            <option key={b.id} value={b.id}>
              {tx(`basin.${b.id}.name`, b.name)}
            </option>
          ))}
        </select>
      )}

      <nav className="ml-auto flex shrink-0 items-center gap-1 text-sm">
        <NavLink to="/" end className={({ isActive }) => `btn-ghost hidden px-3 py-1.5 sm:inline-flex ${isActive ? 'text-brand-700' : ''}`}>
          {s.viewer}
        </NavLink>
        {isFarmer && (
          <NavLink to="/farmer" className={({ isActive }) => `btn-ghost px-2 py-1.5 sm:px-3 ${isActive ? 'text-brand-700' : ''}`} title={s.myParcels}>
            <Sprout size={16} className="sm:hidden" />
            <span className="hidden sm:inline">{s.myParcels}</span>
          </NavLink>
        )}
        <button className="btn-ghost px-2 py-1.5 sm:px-3" onClick={() => setShowSources(true)} title={s.sourcesTitle}>
          <Database size={16} />
          <span className="hidden md:inline">{s.sources}</span>
        </button>

        <LanguageToggle />

        <span className="hidden rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 lg:inline">
          Demo
        </span>

        {user ? (
          <div className="flex items-center gap-2 pl-1 sm:pl-2">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-xs font-semibold">{user.role === 'farmer' ? s.farmerName : s.communityName}</div>
              <div className="text-[10px] text-slate-500">{user.role === 'farmer' ? s.farmer : s.community}</div>
            </div>
            <button
              className="btn-secondary px-2.5 py-1.5"
              onClick={() => {
                signOut();
                navigate('/');
              }}
              title={s.signOut}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn-primary px-2.5 py-1.5 sm:px-3">
            <LogIn size={16} /> <span className="hidden sm:inline">{s.signIn}</span>
          </Link>
        )}
      </nav>

      {showSources && <DataSourcesModal onClose={() => setShowSources(false)} />}
    </header>
  );
}

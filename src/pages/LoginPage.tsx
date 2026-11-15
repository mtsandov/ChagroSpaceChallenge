import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Sprout, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { assetUrl } from '../lib/api/client';
import type { Role } from '../types';

export default function LoginPage() {
  const { signInDemo } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const enter = (r: Role) => {
    signInDemo(r);
    navigate(params.get('next') ?? (r === 'farmer' ? '/farmer' : '/'), { replace: true });
  };

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      {/* Panel de marca */}
      <div className="relative hidden flex-1 overflow-hidden bg-brand-800 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.35),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(74,222,128,0.25),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link to="/" className="flex items-center gap-2 text-sm text-brand-100 hover:text-white">
            <ArrowLeft size={16} /> Volver al visor público
          </Link>
          <div>
            <img src={assetUrl('favicon.svg')} alt="" className="mb-6 h-14 w-14" />
            <h1 className="text-4xl font-bold leading-tight">
              Agua transparente
              <br />
              para el agro del Guayas
            </h1>
            <p className="mt-4 max-w-md text-brand-100">
              ChAgro combina el radar SAR de la NASA con datos climáticos para que comunidades y agricultores vean dónde
              está el agua y cuánto riego hace falta en época seca.
            </p>
          </div>
          <div className="text-xs text-brand-200">NASA Space Apps Challenge · Guayaquil 2026 · Dancing with the SARs</div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-6 flex items-center gap-2 text-sm text-slate-500 lg:hidden">
            <ArrowLeft size={16} /> Volver al visor
          </Link>
          <h2 className="text-2xl font-bold text-slate-800">Entra a la demo</h2>
          <p className="mb-6 text-sm text-slate-500">
            El visor es público. Entra como agricultor para registrar tus parcelas y tu sistema de riego. Todo se guarda solo en
            este navegador.
          </p>
          <div className="space-y-3">
            <RoleButton onClick={() => enter('farmer')} icon={<Sprout size={20} />} title="Agricultor" desc="Mis parcelas, dibujo en el mapa y recomendación de riego" />
            <RoleButton onClick={() => enter('public')} icon={<Users size={20} />} title="Comunidad / Junta de Agua" desc="Visor de la cuenca y copiloto" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleButton(props: { onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-500 hover:ring-2 hover:ring-brand-500/20"
    >
      <div className="text-brand-600">{props.icon}</div>
      <div>
        <div className="font-semibold">{props.title}</div>
        <div className="text-xs text-slate-500">{props.desc}</div>
      </div>
    </button>
  );
}

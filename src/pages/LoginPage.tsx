import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Sprout, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

type Tab = 'login' | 'register';

export default function LoginPage() {
  const { signIn, signUp, signInDemo, isDemo } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('farmer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const goNext = (r: Role) => navigate(params.get('next') ?? (r === 'farmer' ? '/farmer' : '/'), { replace: true });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (tab === 'login') {
        await signIn(email, password);
        navigate(params.get('next') ?? '/', { replace: true });
      } else {
        const { needsConfirmation } = await signUp({ email, password, fullName, role });
        if (needsConfirmation) setInfo('Revisa tu correo para confirmar la cuenta y luego inicia sesión.');
        else goNext(role);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
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
            <img src="/favicon.svg" alt="" className="mb-6 h-14 w-14" />
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

      {/* Formulario */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-6 flex items-center gap-2 text-sm text-slate-500 lg:hidden">
            <ArrowLeft size={16} /> Volver al visor
          </Link>
          <h2 className="text-2xl font-bold text-slate-800">{tab === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</h2>
          <p className="mb-6 text-sm text-slate-500">
            El visor es público. Inicia sesión como agricultor para registrar tu sistema de riego y recibir recomendaciones.
          </p>

          <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-200/70 p-1 text-sm font-medium">
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                className={`rounded-md py-1.5 ${tab === t ? 'bg-white shadow' : 'text-slate-500'}`}
                onClick={() => {
                  setTab(t);
                  setError(null);
                  setInfo(null);
                }}
              >
                {t === 'login' ? 'Ingresar' : 'Registrarse'}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {tab === 'register' && (
              <>
                <div>
                  <label className="label" htmlFor="fullName">Nombre</label>
                  <input id="fullName" className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <span className="label">Tipo de cuenta</span>
                  <div className="grid grid-cols-2 gap-2">
                    <RoleOption active={role === 'farmer'} onClick={() => setRole('farmer')} icon={<Sprout size={18} />} title="Agricultor" desc="Registra parcelas y riego" />
                    <RoleOption active={role === 'public'} onClick={() => setRole('public')} icon={<Users size={18} />} title="Comunidad" desc="Visor y copiloto" />
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="label" htmlFor="email">Correo</label>
              <input id="email" type="email" autoComplete="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                className="input"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            {info && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</div>}

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy && <Loader2 size={16} className="animate-spin" />}
              {tab === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </form>

          {isDemo && (
            <div className="mt-6 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4">
              <div className="mb-1 text-xs font-semibold uppercase text-amber-700">Modo demo</div>
              <p className="mb-3 text-xs text-amber-800">
                Supabase no está configurado: las cuentas se guardan solo en este navegador.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn-secondary px-2 py-1.5 text-xs"
                  onClick={() => {
                    signInDemo('farmer');
                    goNext('farmer');
                  }}
                >
                  <Sprout size={14} /> Agricultor demo
                </button>
                <button
                  className="btn-secondary px-2 py-1.5 text-xs"
                  onClick={() => {
                    signInDemo('public');
                    goNext('public');
                  }}
                >
                  <Users size={14} /> Comunidad demo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RoleOption(props: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`rounded-lg border p-3 text-left transition ${
        props.active ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className={`mb-1 ${props.active ? 'text-brand-600' : 'text-slate-400'}`}>{props.icon}</div>
      <div className="text-sm font-semibold">{props.title}</div>
      <div className="text-[11px] text-slate-500">{props.desc}</div>
    </button>
  );
}

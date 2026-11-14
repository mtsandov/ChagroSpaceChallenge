import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="text-5xl font-bold text-brand-700">404</div>
      <p className="text-slate-500">Esta página no existe.</p>
      <Link to="/" className="btn-primary">
        Ir al visor
      </Link>
    </div>
  );
}

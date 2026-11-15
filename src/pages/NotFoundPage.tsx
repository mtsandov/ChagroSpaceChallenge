import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';

export default function NotFoundPage() {
  const { lang } = useI18n();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="text-5xl font-bold text-brand-700">404</div>
      <p className="text-slate-500">{lang === 'en' ? 'This page does not exist.' : 'Esta página no existe.'}</p>
      <Link to="/" className="btn-primary">
        {lang === 'en' ? 'Go to the viewer' : 'Ir al visor'}
      </Link>
    </div>
  );
}

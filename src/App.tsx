import { Navigate, Route, Routes } from 'react-router-dom';
import ViewerPage from './pages/ViewerPage';
import LoginPage from './pages/LoginPage';
import FarmerDashboardPage from './pages/FarmerDashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import { useAuth } from './context/AuthContext';
import type { ReactNode } from 'react';

function RequireFarmer({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login?next=/farmer" replace />;
  if (user.role !== 'farmer') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ViewerPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/farmer"
        element={
          <RequireFarmer>
            <FarmerDashboardPage />
          </RequireFarmer>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

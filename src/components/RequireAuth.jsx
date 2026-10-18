import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/useAuth';

export default function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user === undefined) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--t2)' }}>
        Carregando…
      </div>
    );
  }

  if (user === null) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}

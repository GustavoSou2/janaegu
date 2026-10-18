import { Routes, Route } from 'react-router-dom';
import Invite from './pages/Invite';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminFamilyForm from './pages/AdminFamilyForm';
import RequireAuth from './components/RequireAuth';
import ExternalRedirect from './components/ExternalRedirect';

const HOME_REDIRECT_URL = 'https://noivos.casar.com/vem-pro-nosso-sim-jana#/home';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ExternalRedirect to={HOME_REDIRECT_URL} />} />
      <Route path="/convite/:token" element={<Invite />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/familia/nova"
        element={
          <RequireAuth>
            <AdminFamilyForm />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/familia/:id"
        element={
          <RequireAuth>
            <AdminFamilyForm />
          </RequireAuth>
        }
      />
      <Route path="*" element={<div style={{ padding: 40 }}>Página não encontrada.</div>} />
    </Routes>
  );
}

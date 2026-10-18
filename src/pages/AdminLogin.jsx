import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { login } from '../lib/useAuth';
import { useAuth } from '../lib/useAuth';
import './Admin.css';

export default function AdminLogin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    const from = location.state?.from?.pathname || '/admin';
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.ok) {
      navigate('/admin', { replace: true });
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-form" onSubmit={handleSubmit}>
        <div className="invite-hero-rule" style={{ background: 'var(--ink-950)' }} />
        <h2>Painel dos noivos</h2>
        <p style={{ color: 'var(--t2)', margin: '6px 0 24px' }}>Só vocês dois entram aqui.</p>

        <label className="label" htmlFor="email" style={{ display: 'block', marginBottom: 5 }}>E-mail</label>
        <input
          id="email"
          type="email"
          className="field"
          style={{ marginBottom: 14 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
        />

        <label className="label" htmlFor="password" style={{ display: 'block', marginBottom: 5 }}>Senha</label>
        <input
          id="password"
          type="password"
          className="field"
          style={{ marginBottom: 20 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {error && <p style={{ color: 'var(--status-danger)', marginBottom: 14 }}>{error}</p>}

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>

        <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 16 }}>
          Sessão expirada leva de volta pra cá antes de qualquer dado aparecer.
        </p>
      </form>
    </div>
  );
}

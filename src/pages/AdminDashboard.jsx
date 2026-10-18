import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { logout } from '../lib/useAuth';
import {
  GUEST_LIMIT, listFamilies, deleteFamily, setWaitlist, setMessageApproved, downloadCsv, getFamilyWithGuests
} from '../lib/families';
import { watchSettings } from '../lib/settings';
import { buildWhatsAppLink } from '../lib/whatsapp';
import './Admin.css';

const STATUS_LABEL = {
  pendente: 'pendente',
  parcial: 'parcial',
  confirmado: 'confirmado',
  recusado: 'recusado'
};

const GUEST_STATUS = {
  true: { label: 'vai', className: 'is-yes' },
  false: { label: 'não vai', className: 'is-no' },
  null: { label: 'sem resposta', className: 'is-pending' }
};

function GuestChipList({ familyId }) {
  const [guests, setGuests] = useState(null);

  useEffect(() => {
    let active = true;
    getFamilyWithGuests(familyId).then((family) => {
      if (active) setGuests(family?.guests || []);
    });
    return () => {
      active = false;
    };
  }, [familyId]);

  if (guests === null) return <p style={{ fontSize: 12, color: 'var(--t3)' }}>Carregando…</p>;

  return (
    <ul className="guest-chip-list">
      {guests.map((g) => {
        const status = GUEST_STATUS[g.attending];
        return (
          <li key={g.id} className={`guest-chip ${status.className}`}>
            {g.name}
            {g.isChild && <span className="guest-chip-child">criança</span>}
            <span className="guest-chip-status">{status.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

function FamilyCard({ family: f, settings, onToggleWaitlist, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const waUrl = buildWhatsAppLink(f, {
    template: settings?.whatsappMessageTemplate,
    coupleNames: settings?.coupleNames
  });

  return (
    <article className="family-card">
      <div className="family-card-top">
        <h4 className="family-card-name">{f.familyName}</h4>
        <span className="status-badge">{STATUS_LABEL[f.status]}</span>
      </div>
      <div className="family-card-meta">
        <span>{f.confirmedCount ?? 0} de {f.guestCount ?? 0} confirmados</span>
        <span>·</span>
        <span>{f.isWaitlist ? 'lista reserva' : 'lista principal'}</span>
      </div>

      <button
        type="button"
        className="family-card-toggle"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        {expanded ? 'Ocultar convidados' : `Ver convidados (${f.guestCount ?? 0})`}
        <span aria-hidden="true">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && <GuestChipList familyId={f.id} />}

      <div className="family-card-actions">
        {waUrl ? (
          <a className="btn btn-ghost" href={waUrl} target="_blank" rel="noreferrer">WhatsApp</a>
        ) : (
          <span className="family-card-no-phone">sem telefone</span>
        )}
        <Link className="btn btn-ghost" to={`/admin/familia/${f.id}`}>Editar</Link>
        <button className="btn btn-ghost" onClick={onToggleWaitlist}>
          {f.isWaitlist ? 'mover p/ principal' : 'mover p/ reserva'}
        </button>
        <button className="btn btn-ghost" onClick={onDelete}>Remover</button>
      </div>
    </article>
  );
}

export default function AdminDashboard() {
  const [families, setFamilies] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => listFamilies(setFamilies), []);
  useEffect(() => watchSettings(setSettings), []);

  const totals = useMemo(() => {
    const principal = families.filter((f) => !f.isWaitlist);
    const reserve = families.filter((f) => f.isWaitlist);
    const sum = (list, field) => list.reduce((acc, f) => acc + (f[field] || 0), 0);
    return {
      principalWeight: sum(principal, 'weight'),
      reserveCount: reserve.length,
      confirmedCount: sum(families, 'confirmedCount'),
      childCount: sum(families, 'childCount'),
      byStatus: families.reduce((acc, f) => {
        acc[f.status] = (acc[f.status] || 0) + 1;
        return acc;
      }, {})
    };
  }, [families]);

  const familiesWithMessages = families.filter((f) => f.message);

  async function handleDelete(family) {
    if (!window.confirm(`Remover ${family.familyName}? Essa ação não pode ser desfeita.`)) return;
    await deleteFamily(family.id);
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <div className="label" style={{ color: 'var(--t2)' }}>Confirmação de presença · 18.12.2026</div>
          <h2>Painel administrativo</h2>
        </div>
        <div className="admin-header-actions">
          <Link className="btn btn-primary" to="/admin/familia/nova">+ Nova família</Link>
          <button className="btn btn-ghost" onClick={() => logout()}>Sair</button>
        </div>
      </header>

      <section className="admin-cards">
        <div className="admin-card">
          <div className="admin-card-value">{totals.principalWeight} / {GUEST_LIMIT}</div>
          <div className="label" style={{ color: 'var(--t2)' }}>lista principal (peso)</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-value">{totals.byStatus.confirmado || 0}</div>
          <div className="label" style={{ color: 'var(--t2)' }}>confirmadas</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-value">{totals.byStatus.parcial || 0}</div>
          <div className="label" style={{ color: 'var(--t2)' }}>parciais</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-value">{totals.byStatus.recusado || 0}</div>
          <div className="label" style={{ color: 'var(--t2)' }}>recusadas</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-value">{totals.byStatus.pendente || 0}</div>
          <div className="label" style={{ color: 'var(--t2)' }}>pendentes</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-value">{totals.reserveCount}</div>
          <div className="label" style={{ color: 'var(--t2)' }}>na reserva</div>
        </div>
      </section>

      <section className="admin-table-section">
        <div className="admin-table-toolbar">
          <h3 style={{ fontSize: 18 }}>Famílias</h3>
          <button className="btn btn-ghost" onClick={() => downloadCsv(families)}>Exportar CSV</button>
        </div>

        {/* Celular: cards empilhados, touch-friendly. Telas largas: tabela densa. */}
        <div className="admin-family-cards">
          {families.map((f) => (
            <FamilyCard
              key={f.id}
              family={f}
              settings={settings}
              onToggleWaitlist={() => setWaitlist(f.id, !f.isWaitlist)}
              onDelete={() => handleDelete(f)}
            />
          ))}
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Família</th>
                <th>Status</th>
                <th>Confirmados</th>
                <th>Lista</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {families.map((f) => {
                const waUrl = buildWhatsAppLink(f, {
                  template: settings?.whatsappMessageTemplate,
                  coupleNames: settings?.coupleNames
                });
                return (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600 }}>{f.familyName}</td>
                    <td><span className="status-badge">{STATUS_LABEL[f.status]}</span></td>
                    <td>{f.confirmedCount ?? 0} de {f.guestCount ?? 0}</td>
                    <td>{f.isWaitlist ? 'reserva' : 'principal'}</td>
                    <td className="admin-table-actions">
                      <button className="btn btn-ghost" onClick={() => setWaitlist(f.id, !f.isWaitlist)}>
                        {f.isWaitlist ? 'mover p/ principal' : 'mover p/ reserva'}
                      </button>
                      {waUrl ? (
                        <a className="btn btn-ghost" href={waUrl} target="_blank" rel="noreferrer">WhatsApp</a>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--t3)' }}>sem telefone</span>
                      )}
                      <Link className="btn btn-ghost" to={`/admin/familia/${f.id}`}>Editar</Link>
                      <button className="btn btn-ghost" onClick={() => handleDelete(f)}>Remover</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: 'var(--t2)', padding: '12px 0' }}>
          A reserva não é promovida sozinha quando uma vaga abre — mover é sempre manual.
        </p>
      </section>

      <section className="admin-table-section">
        <h3 style={{ fontSize: 18, marginBottom: 14 }}>Recados para moderar</h3>
        {familiesWithMessages.length === 0 ? (
          <p style={{ color: 'var(--t2)' }}>Nenhum recado recebido ainda.</p>
        ) : (
          <ul className="admin-messages-list">
            {familiesWithMessages.map((f) => (
              <li key={f.id}>
                <div style={{ flex: 1 }}>
                  <p>{f.message}</p>
                  <span className="label" style={{ color: 'var(--t3)' }}>{f.familyName}</span>
                </div>
                <label className="admin-message-approve">
                  <input
                    type="checkbox"
                    checked={!!f.messageApproved}
                    onChange={(e) => setMessageApproved(f.id, e.target.checked)}
                  />
                  mostrar no mural
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

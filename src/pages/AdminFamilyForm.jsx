import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  createFamily, updateFamily, deleteFamily, getFamilyWithGuests, getActivePrincipalWeight, computeWeight,
  GUEST_LIMIT
} from '../lib/families';
import { isValidPhone, formatPhoneHint } from '../lib/phone';
import './Admin.css';

let guestKeySeq = 0;
function newGuestKey() {
  guestKeySeq += 1;
  return `new-${Date.now()}-${guestKeySeq}`;
}

export default function AdminFamilyForm() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEditing);
  const [notFound, setNotFound] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [phone, setPhone] = useState('');
  const [guests, setGuests] = useState([{ key: newGuestKey(), name: '', isChild: false, isHalf: false }]);
  const [activeWeight, setActiveWeight] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getActivePrincipalWeight(id || null).then(setActiveWeight);
  }, [id]);

  useEffect(() => {
    if (!isEditing) return;
    let active = true;
    getFamilyWithGuests(id).then((family) => {
      if (!active) return;
      if (!family) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setFamilyName(family.familyName);
      setPhone(family.phone || '');
      setGuests(
        family.guests.length
          ? family.guests.map((g) => ({ key: g.id, name: g.name, isChild: !!g.isChild, isHalf: !!g.isHalf }))
          : [{ key: newGuestKey(), name: '', isChild: false, isHalf: false }]
      );
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id, isEditing]);

  if (loading) return <div className="admin-shell">Carregando…</div>;

  if (notFound) {
    return (
      <div className="admin-shell">
        <p>Família não encontrada. <Link to="/admin">Voltar para o painel</Link>.</p>
      </div>
    );
  }

  const currentWeight = computeWeight(guests.filter((g) => g.name.trim()));
  const projectedTotal = activeWeight + currentWeight;
  const willBeWaitlist = projectedTotal > GUEST_LIMIT;

  function updateGuest(key, patch) {
    setGuests((prev) => prev.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  }

  function addGuest() {
    setGuests((prev) => [...prev, { key: newGuestKey(), name: '', isChild: false, isHalf: false }]);
  }

  function removeGuest(key) {
    setGuests((prev) => prev.filter((g) => g.key !== key));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (phone.trim() && !isValidPhone(phone)) {
      setError(`Telefone em formato inválido. ${formatPhoneHint()}`);
      return;
    }
    const cleanGuests = guests
      .filter((g) => g.name.trim())
      .map((g) => ({ name: g.name.trim(), isChild: g.isChild, isHalf: g.isChild && g.isHalf }));

    setSaving(true);
    try {
      if (isEditing) {
        await updateFamily(id, { familyName: familyName.trim(), phone: phone.trim(), guests: cleanGuests });
      } else {
        await createFamily({ familyName: familyName.trim(), phone: phone.trim(), guests: cleanGuests });
      }
      navigate('/admin');
    } catch {
      setError('Não deu pra salvar agora. Tenta de novo.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Remover ${familyName || 'esta família'}? Essa ação não pode ser desfeita.`)) return;
    setDeleting(true);
    try {
      await deleteFamily(id);
      navigate('/admin');
    } catch {
      setError('Não deu pra remover agora. Tenta de novo.');
      setDeleting(false);
    }
  }

  return (
    <div className="admin-shell">
      <form onSubmit={handleSubmit}>
        <div className="admin-form-header">
          <div>
            <div className="label" style={{ color: 'var(--t2)' }}>
              {isEditing ? `/admin/familia/${id}` : '/admin/familia/nova'}
            </div>
            <h3 style={{ fontSize: 22 }}>{isEditing ? 'Editar família' : 'Nova família'}</h3>
          </div>
          <div className="admin-form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar família'}
            </button>
            <Link className="btn btn-ghost" to="/admin">Cancelar</Link>
          </div>
        </div>

        <div className="admin-form-grid">
          <div>
            <label className="label" htmlFor="familyName" style={{ display: 'block', marginBottom: 5 }}>
              Nome da família *
            </label>
            <input
              id="familyName"
              className="field"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="phone" style={{ display: 'block', marginBottom: 5 }}>
              Telefone (DDI + DDD)
            </label>
            <input id="phone" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 5 }}>{formatPhoneHint()}</div>
          </div>
        </div>

        <div className="admin-guests-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h6 style={{ margin: 0 }}>Convidados da família</h6>
            <span style={{ fontSize: 12, color: 'var(--t2)' }}>{guests.length} pessoas</span>
          </div>

          <div className="admin-guests-list">
            {guests.map((g, index) => (
              <div className="admin-guest-row" key={g.key}>
                <div className="admin-guest-row-main">
                  <span className="admin-guest-pos">{String(index + 1).padStart(2, '0')}</span>
                  <input
                    className="field"
                    style={{ flex: '1 1 auto' }}
                    value={g.name}
                    onChange={(e) => updateGuest(g.key, { name: e.target.value })}
                    placeholder="Nome do convidado"
                  />
                  <button
                    type="button"
                    className="admin-guest-remove"
                    onClick={() => removeGuest(g.key)}
                    aria-label="Remover convidado"
                  >
                    ×
                  </button>
                </div>
                <div className="admin-guest-row-tags">
                  <button
                    type="button"
                    className={'btn btn-ghost' + (g.isChild ? ' is-active' : '')}
                    onClick={() => updateGuest(g.key, { isChild: !g.isChild, isHalf: g.isChild ? false : g.isHalf })}
                  >
                    {g.isChild ? '✓ criança' : 'criança'}
                  </button>
                  {g.isChild && (
                    <button
                      type="button"
                      className={'btn btn-ghost' + (g.isHalf ? ' is-active' : '')}
                      onClick={() => updateGuest(g.key, { isHalf: !g.isHalf })}
                    >
                      {g.isHalf ? '✓ meia (0,5)' : 'conta como meia'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="admin-add-guest" onClick={addGuest}>
            + Adicionar convidado
          </button>

          <div className={'admin-waitlist-notice' + (willBeWaitlist ? ' is-over' : '')}>
            <strong>{willBeWaitlist ? 'Esta família entra na lista reserva' : 'Cabe na lista principal'}</strong>
            <br />
            {activeWeight} de peso já na lista principal + {currentWeight} desta família (criança marcada como meia
            conta 0,5) = {projectedTotal}
            {willBeWaitlist
              ? `, acima do limite de ${GUEST_LIMIT}. Ela recebe o link normalmente e pode ser movida depois.`
              : `, dentro do limite de ${GUEST_LIMIT}.`}
          </div>

          {error && <p style={{ color: 'var(--status-danger)', marginTop: 14 }}>{error}</p>}

          <p style={{ fontSize: 12, color: 'var(--t2)', marginTop: 16, maxWidth: '70ch' }}>
            Ao editar, convidados são casados por nome exato: nome igual preserva a resposta, nome novo entra sem
            resposta, nome removido apaga o registro. Evite dois convidados com o mesmo nome na mesma família.
          </p>
        </div>

        {isEditing && (
          <div className="admin-danger-zone">
            <div>
              <h6 style={{ margin: '0 0 4px' }}>Remover família</h6>
              <p style={{ fontSize: 12, color: 'var(--t2)', margin: 0 }}>
                Apaga a família, os convidados e a resposta do RSVP. Não pode ser desfeito.
              </p>
            </div>
            <button type="button" className="btn btn-ghost admin-danger-btn" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Removendo…' : 'Remover família'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

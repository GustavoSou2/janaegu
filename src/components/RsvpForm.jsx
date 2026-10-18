import { useState } from 'react';
import { submitPublicRsvp } from '../lib/families';

function initialGuestState(guests) {
  return guests.map((g) => ({ ...g }));
}

function summaryTitle(status) {
  if (status === 'confirmado') return 'Recebemos sua resposta!';
  if (status === 'recusado') return 'Que pena, vamos sentir falta!';
  return 'Recebemos sua resposta!';
}

function summarySubtitle(status, confirmedCount, total) {
  if (status === 'confirmado') return `Todo mundo confirmado: ${confirmedCount} de ${total}.`;
  if (status === 'recusado') return 'Anotado — obrigado por avisar.';
  return `${confirmedCount} de ${total} confirmados.`;
}

export default function RsvpForm({ token, family, settings, onUpdated }) {
  const hasRespondedBefore = family.status !== 'pendente';
  const [mode, setMode] = useState(hasRespondedBefore ? 'sent' : 'idle');
  const [guests, setGuests] = useState(() => initialGuestState(family.guests));
  const [message, setMessage] = useState(family.message || '');
  const [declineReason, setDeclineReason] = useState(family.declineReason || '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const pendingCount = guests.filter((g) => g.attending === null || g.attending === undefined).length;
  const allNoneAttending = guests.length > 0 && guests.every((g) => g.attending === false);
  const canSubmit = pendingCount === 0 && !sending;

  const declineAllowsMessage = settings?.declineAllowsMessage ?? true;

  function toggleGuest(id, attending) {
    setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, attending } : g)));
  }

  function markAll(attending) {
    setGuests((prev) => prev.map((g) => ({ ...g, attending })));
  }

  async function handleSubmit() {
    setSending(true);
    setError(null);
    try {
      const payload = {
        guests: guests.map((g) => ({ id: g.id, attending: !!g.attending })),
        message: message.trim() || null,
        declineReason: allNoneAttending ? declineReason.trim() || null : null
      };
      const result = await submitPublicRsvp(token, payload);
      setMode('sent');
      onUpdated(result);
    } catch {
      setError('Não deu pra enviar agora. Tenta de novo...');
    } finally {
      setSending(false);
    }
  }

  if (mode === 'sent') {
    return (
      <div className="rsvp-sent surface-card">
        <div className="rsvp-sent-check" aria-hidden="true">✓</div>
        <h4>{summaryTitle(family.status)}</h4>
        <p style={{ color: 'var(--t2)', marginTop: 6 }}>
          {summarySubtitle(family.status, family.confirmedCount, family.guestCount)}
        </p>
        <ul className="rsvp-summary-list">
          {family.guests.map((g) => (
            <li key={g.id}>
              <span>{g.name}</span>
              <span className={'rsvp-pill ' + (g.attending ? 'is-yes' : 'is-no')}>
                {g.attending ? 'vai' : 'não vai'}
              </span>
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 12 }}>
          Seu recado entra no mural depois que a gente ler. Pode mudar a resposta quando quiser.
        </p>
        <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => setMode('idle')}>
          Alterar resposta
        </button>
      </div>
    );
  }

  return (
    <div className="rsvp-form">
      {settings?.waitlistNoticeToGuest && family.isWaitlist && (
        <div className="rsvp-waitlist-notice">
          Vocês estão na lista reserva. Confirmem mesmo assim — avisamos assim que uma vaga abrir.
        </div>
      )}

      <div className="rsvp-shortcuts">
        <button type="button" className="btn btn-ghost" onClick={() => markAll(true)}>
          Vamos todos
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => markAll(false)}>
          Ninguém poderá ir
        </button>
      </div>

      <ul className="rsvp-guest-list">
        {guests.map((g) => (
          <li key={g.id} className="rsvp-guest-row">
            <span className="rsvp-guest-name">
              {g.name}
              {g.isChild && <span className="rsvp-child-tag">criança</span>}
            </span>
            <span className="rsvp-guest-buttons">
              <button
                type="button"
                className={'rsvp-toggle ' + (g.attending === true ? 'is-active' : '')}
                onClick={() => toggleGuest(g.id, true)}
              >
                Vai
              </button>
              <button
                type="button"
                className={'rsvp-toggle ' + (g.attending === false ? 'is-active' : '')}
                onClick={() => toggleGuest(g.id, false)}
              >
                Não vai
              </button>
            </span>
          </li>
        ))}
      </ul>

      <label className="label" htmlFor="rsvp-message" style={{ display: 'block', margin: '20px 0 6px' }}>
        Recado para os noivos (opcional)
      </label>
      <textarea
        id="rsvp-message"
        className="field"
        rows={3}
        placeholder="Escreva algo pra gente guardar."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      {allNoneAttending && declineAllowsMessage && (
        <div className="rsvp-decline-note">
          <p style={{ fontSize: 13, margin: '0 0 10px' }}>
            Sentiremos sua falta! Vocês não precisam se justificar — mas se quiserem contar um pouquinho o que
            rolou, a gente lê com carinho. Fica só entre a gente.
          </p>
          <label className="label" htmlFor="rsvp-reason" style={{ display: 'block', marginBottom: 6 }}>
            Quer contar mais alguma coisa? (sem compromisso)
          </label>
          <textarea
            id="rsvp-reason"
            className="field"
            rows={2}
            placeholder="Só se quiser — nada aqui é obrigatório."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
          />
        </div>
      )}

      {error && <p style={{ color: 'var(--status-danger)', marginTop: 12 }}>{error}</p>}

      <button
        type="button"
        className="btn btn-primary"
        style={{ width: '100%', marginTop: 20, justifyContent: 'space-between' }}
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {pendingCount > 0
          ? `Falta responder ${pendingCount} de ${guests.length}`
          : sending
            ? 'Enviando…'
            : 'Confirmar resposta'}
      </button>
    </div>
  );
}

// Lógica pura compartilhada pelas Cloud Functions do RSVP.
// Mantida em espelho com src/lib/families.js (computeStatus) no frontend —
// o frontend usa a mesma regra só para pré-visualização, quem grava de verdade é aqui.

function computeStatus(guests) {
  const total = guests.length;
  const responded = guests.filter((g) => g.attending !== null && g.attending !== undefined);
  if (responded.length === 0) return 'pendente';
  if (responded.length < total) return 'parcial';
  const confirmed = responded.filter((g) => g.attending === true).length;
  if (confirmed === total) return 'confirmado';
  if (confirmed === 0) return 'recusado';
  return 'parcial';
}

function validateRsvpPayload(body) {
  if (!body || typeof body.token !== 'string' || !body.token) return 'Token ausente.';
  if (!Array.isArray(body.guests) || body.guests.length === 0) return 'Lista de convidados vazia ou malformada.';
  for (const g of body.guests) {
    if (typeof g.id !== 'string' || typeof g.attending !== 'boolean') {
      return 'Lista de convidados malformada.';
    }
  }
  if (body.message != null && typeof body.message !== 'string') return 'Recado inválido.';
  if (body.declineReason != null && typeof body.declineReason !== 'string') return 'Motivo inválido.';
  return null;
}

module.exports = { computeStatus, validateRsvpPayload };

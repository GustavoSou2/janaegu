import { FUNCTIONS_BASE_URL } from './firebase';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options) {
  let res;
  try {
    res = await fetch(`${FUNCTIONS_BASE_URL}${path}`, options);
  } catch {
    throw new ApiError('Não deu pra enviar agora. Tenta de novo...', 0);
  }
  if (res.status === 404) throw new ApiError('Convite não encontrado. Confira o link recebido no WhatsApp.', 404);
  if (!res.ok) throw new ApiError('Não deu pra enviar agora. Tenta de novo...', res.status);
  return res.json();
}

export function getInvite(token) {
  return request(`/getInvite?token=${encodeURIComponent(token)}`, { method: 'GET' });
}

export function submitRsvp(token, payload) {
  return request('/submitRsvp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, ...payload })
  });
}

export function getMessages() {
  return request('/getMessages', { method: 'GET' });
}

export { ApiError };

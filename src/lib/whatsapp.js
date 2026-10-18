import { toWaDigits } from './phone';

export const DEFAULT_MESSAGE_TEMPLATE = `Oi, {nome_familia}! 💍
Faltam poucos dias para o nosso grande dia e adoraríamos ter vocês com a gente!

Confirme a presença de vocês neste link, com detalhes da festa, nossa história e tudo mais:
{link_convite}

Com carinho,
{nome_dos_noivos}`;

export function fillMessageTemplate(template, { familyName, inviteUrl, coupleNames }) {
  return (template || DEFAULT_MESSAGE_TEMPLATE)
    .replaceAll('{nome_familia}', familyName || '')
    .replaceAll('{link_convite}', inviteUrl || '')
    .replaceAll('{nome_dos_noivos}', coupleNames || 'Janaina e Gustavo');
}

export function buildInviteUrl(inviteToken) {
  return `${window.location.origin}/convite/${inviteToken}`;
}

// Retorna null quando não há telefone válido cadastrado, pra UI mostrar "sem telefone".
export function buildWhatsAppLink(family, { template, coupleNames } = {}) {
  if (!family?.phone || !toWaDigits(family.phone)) return null;
  const inviteUrl = buildInviteUrl(family.inviteToken);
  const text = fillMessageTemplate(template, { familyName: family.familyName, inviteUrl, coupleNames });
  return `https://wa.me/${toWaDigits(family.phone)}?text=${encodeURIComponent(text)}`;
}

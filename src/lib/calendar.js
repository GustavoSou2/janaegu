import { parseWeddingDate } from './date';

const EVENT_DURATION_HOURS = 5;

function toGoogleDate(date) {
  // Google Calendar quer UTC no formato YYYYMMDDTHHmmssZ
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function buildGoogleCalendarLink({ coupleNames, weddingDateIso, venueAddress }) {
  const start = parseWeddingDate(weddingDateIso);
  if (!start) return null;
  const end = new Date(start.getTime() + EVENT_DURATION_HOURS * 60 * 60 * 1000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: coupleNames ? `Casamento de ${coupleNames}` : 'Casamento',
    dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
    location: venueAddress || '',
    details: 'Confirme sua presença e veja todos os detalhes no convite digital.'
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

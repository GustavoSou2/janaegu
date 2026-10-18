const EVENT_DURATION_HOURS = 5;

function toGoogleDate(isoString) {
  // Google Calendar quer UTC no formato YYYYMMDDTHHmmssZ
  const d = new Date(isoString);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function buildGoogleCalendarLink({ coupleNames, weddingDateIso, venueAddress }) {
  if (!weddingDateIso) return null;
  const start = new Date(weddingDateIso);
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

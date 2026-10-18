// Horário de Campinas/SP (mesmo fuso do local do evento). Usado como fallback
// quando a data do evento é gravada sem offset explícito.
const VENUE_OFFSET = '-03:00';

const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/;

// new Date("2026-12-18T20:00:00") sem offset é interpretado no fuso LOCAL de quem
// executa o código — ou seja, a contagem regressiva ficaria diferente dependendo do
// fuso do navegador de cada convidado (ou de onde a página é renderizada). Forçando
// o offset de Campinas/SP quando ele falta, a data do evento vira sempre o mesmo
// instante exato, não importa quem está olhando.
export function parseWeddingDate(isoString) {
  if (!isoString) return null;
  const normalized = HAS_OFFSET.test(isoString) ? isoString : `${isoString}${VENUE_OFFSET}`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

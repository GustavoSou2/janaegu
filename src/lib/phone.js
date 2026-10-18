// Validação simples de telefone no formato DDI + DDD + número, pronto para wa.me.
// Ex.: "+55 11 98877-1200" -> "5511988771200"

export function onlyDigits(value) {
  return (value || '').replace(/\D/g, '');
}

// DDI (1-3 dígitos) + DDD (2 dígitos) + número (8 ou 9 dígitos) = 11 a 14 dígitos.
export function isValidPhone(value) {
  const digits = onlyDigits(value);
  return digits.length >= 11 && digits.length <= 14;
}

export function toWaDigits(value) {
  return onlyDigits(value);
}

export function formatPhoneHint() {
  return 'Use DDI + DDD + número, ex.: +55 11 98877-1200.';
}

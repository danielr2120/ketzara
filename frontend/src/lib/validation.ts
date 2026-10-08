export type FieldErrors = Record<string, string>;

const REQUIRED = "Este campo es obligatorio";

export function isBlank(value: string | null | undefined): boolean {
  return !value || !value.trim();
}

export function parseNumber(value: string): number | null {
  if (isBlank(value)) return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function validateRequired(errors: FieldErrors, key: string, value: string) {
  if (isBlank(value)) errors[key] = REQUIRED;
}

export function validatePhone(errors: FieldErrors, key: string, value: string) {
  if (isBlank(value)) {
    errors[key] = REQUIRED;
    return;
  }
  const digits = value.replace(/\D/g, "").length;
  if (digits < 7 || digits > 15) errors[key] = "Número de celular inválido (entre 7 y 15 dígitos)";
}

export function validateMoney(errors: FieldErrors, key: string, value: string, required = true) {
  if (isBlank(value)) {
    if (required) errors[key] = REQUIRED;
    return;
  }
  const n = parseNumber(value);
  if (n === null) errors[key] = "Debe ser un número válido";
  else if (n < 0) errors[key] = "Debe ser mayor o igual a 0";
}

export function validatePositiveInt(errors: FieldErrors, key: string, value: string) {
  const n = parseNumber(value);
  if (n === null) errors[key] = REQUIRED;
  else if (!Number.isInteger(n)) errors[key] = "Debe ser un número entero";
  else if (n <= 0) errors[key] = "Debe ser mayor que 0";
}

import { HttpError } from '../errors/http-error';

export function parseBody(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }
  return value as Record<string, unknown>;
}

export function requireString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `Field "${field}" is required and must be a non-empty string.`);
  }
  return value.trim();
}

export function optionalString(body: Record<string, unknown>, field: string): string | undefined {
  const value = body[field];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `Field "${field}" must be a non-empty string.`);
  }
  return value.trim();
}

export function requireIsoDate(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== 'string') {
    throw new HttpError(400, `Field "${field}" is required and must be an ISO 8601 date string.`);
  }

  // O fuso explícito evita que a data seja interpretada conforme o horário local do servidor.
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) {
    throw new HttpError(400, `Field "${field}" must be an ISO 8601 timestamp with a timezone.`);
  }

  // Validamos o calendário antes de criar o Date, que pode ajustar datas inexistentes, como 30/02.
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const timezone = match[8];
  const validTimezone = timezone === 'Z'
    || (Number(timezone.slice(1, 3)) <= 23 && Number(timezone.slice(4, 6)) <= 59);

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]
    || hour > 23 || minute > 59 || second > 59 || !validTimezone) {
    throw new HttpError(400, `Field "${field}" must be a valid ISO 8601 date string.`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `Field "${field}" must be a valid ISO 8601 date string.`);
  }
  return date.toISOString();
}

import { expect } from 'vitest';
import { HttpError } from '../src/errors/http-error';

export function expectHttpError(action: () => unknown, statusCode: number): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(statusCode);
    return;
  }

  throw new Error('Expected action to throw an HttpError, but it did not throw.');
}

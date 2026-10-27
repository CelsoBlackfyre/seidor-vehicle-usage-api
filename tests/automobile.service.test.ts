import { beforeEach, describe, expect, it } from 'vitest';
import { AutomobileRepository } from '../src/repositories/automobile.repository';
import { UsageRepository } from '../src/repositories/usage.repository';
import { AutomobileService } from '../src/services/automobile.service';
import { expectHttpError } from './test-helpers';

describe('AutomobileService', () => {
  let automobiles: AutomobileRepository;
  let usages: UsageRepository;
  let service: AutomobileService;

  beforeEach(() => {
    automobiles = new AutomobileRepository();
    usages = new UsageRepository();
    service = new AutomobileService(automobiles, usages);
  });

  it('creates an automobile with a generated id and normalized plate', () => {
    const automobile = service.create({ plate: ' abc1234 ', color: 'Red', brand: 'Toyota' });

    expect(automobile.id).toEqual(expect.any(String));
    expect(automobile).toMatchObject({ plate: 'ABC1234', color: 'Red', brand: 'Toyota' });
    expect(automobiles.findById(automobile.id)).toEqual(automobile);
  });

  it('does not create two automobiles with the same plate', () => {
    service.create({ plate: 'ABC1234', color: 'Red', brand: 'Toyota' });

    expectHttpError(() => service.create({ plate: 'abc1234', color: 'Blue', brand: 'Honda' }), 409);
  });

  it('requires plate, color and brand', () => {
    expectHttpError(() => service.create({ plate: 'ABC1234', color: 'Red' }), 400);
    expectHttpError(() => service.create({ plate: 'ABC1234', brand: 'Toyota' }), 400);
    expectHttpError(() => service.create({ color: 'Red', brand: 'Toyota' }), 400);
    expectHttpError(() => service.create({ plate: '   ', color: 'Red', brand: 'Toyota' }), 400);
  });

  it('finds an automobile by id', () => {
    const created = service.create({ plate: 'ABC1234', color: 'Red', brand: 'Toyota' });

    expect(service.findById(created.id)).toEqual(created);
  });

  it('throws 404 when the automobile does not exist', () => {
    expectHttpError(() => service.findById('missing-id'), 404);
  });

  it('lists all automobiles', () => {
    service.create({ plate: 'ABC1234', color: 'Red', brand: 'Toyota' });
    service.create({ plate: 'DEF5678', color: 'Blue', brand: 'Honda' });

    expect(service.list()).toHaveLength(2);
  });

  it('filters automobiles by brand, case-insensitively and partially', () => {
    service.create({ plate: 'ABC1234', color: 'Red', brand: 'Toyota' });
    service.create({ plate: 'DEF5678', color: 'Blue', brand: 'Honda' });

    expect(service.list('toyo')).toHaveLength(1);
    expect(service.list('TOYOTA')[0].plate).toBe('ABC1234');
    expect(service.list('ford')).toHaveLength(0);
  });

  it('updates only the provided fields', () => {
    const created = service.create({ plate: 'ABC1234', color: 'Red', brand: 'Toyota' });

    const updated = service.update(created.id, { color: 'Black' });

    expect(updated).toMatchObject({ id: created.id, plate: 'ABC1234', color: 'Black', brand: 'Toyota' });
    expect(automobiles.findById(created.id)).toEqual(updated);
  });

  it('requires at least one field to update', () => {
    const created = service.create({ plate: 'ABC1234', color: 'Red', brand: 'Toyota' });

    expectHttpError(() => service.update(created.id, {}), 400);
  });

  it('does not allow updating an automobile to an existing plate', () => {
    service.create({ plate: 'ABC1234', color: 'Red', brand: 'Toyota' });
    const second = service.create({ plate: 'DEF5678', color: 'Blue', brand: 'Honda' });

    expectHttpError(() => service.update(second.id, { plate: 'ABC1234' }), 409);
  });

  it('allows updating an automobile keeping its own plate', () => {
    const created = service.create({ plate: 'ABC1234', color: 'Red', brand: 'Toyota' });

    expect(service.update(created.id, { plate: 'ABC1234', color: 'White' }).color).toBe('White');
  });

  it('throws 404 when updating a missing automobile', () => {
    expectHttpError(() => service.update('missing-id', { color: 'Black' }), 404);
  });

  it('deletes an automobile', () => {
    const created = service.create({ plate: 'ABC1234', color: 'Red', brand: 'Toyota' });

    service.delete(created.id);

    expect(automobiles.findById(created.id)).toBeUndefined();
    expect(service.list()).toHaveLength(0);
  });

  it('throws 404 when deleting a missing automobile', () => {
    expectHttpError(() => service.delete('missing-id'), 404);
  });

  it('does not delete an automobile referenced by a usage record', () => {
    const created = service.create({ plate: 'ABC1234', color: 'Red', brand: 'Toyota' });
    usages.save({
      id: 'usage-id',
      automobileId: created.id,
      driverId: 'driver-id',
      startDate: '2026-01-10T08:00:00.000Z',
      endDate: null,
      reason: 'Delivery',
    });

    expectHttpError(() => service.delete(created.id), 409);
    expect(automobiles.findById(created.id)).toBeDefined();
  });
});

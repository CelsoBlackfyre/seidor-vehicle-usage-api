import { beforeEach, describe, expect, it } from 'vitest';
import { Driver } from '../src/domain/models';
import { InMemoryRepository } from '../src/repositories/in-memory.repository';
import { UsageRepository } from '../src/repositories/usage.repository';
import { DriverService } from '../src/services/driver.service';
import { expectHttpError } from './test-helpers';

describe('DriverService', () => {
  let drivers: InMemoryRepository<Driver>;
  let usages: UsageRepository;
  let service: DriverService;

  beforeEach(() => {
    drivers = new InMemoryRepository<Driver>();
    usages = new UsageRepository();
    service = new DriverService(drivers, usages);
  });

  it('creates a driver with a generated id', () => {
    const driver = service.create({ name: '  John Doe ' });

    expect(driver.id).toEqual(expect.any(String));
    expect(driver.name).toBe('John Doe');
    expect(drivers.findById(driver.id)).toEqual(driver);
  });

  it('requires the name', () => {
    expectHttpError(() => service.create({}), 400);
    expectHttpError(() => service.create({ name: '   ' }), 400);
    expectHttpError(() => service.create({ name: 42 }), 400);
  });

  it('finds a driver by id', () => {
    const created = service.create({ name: 'John Doe' });

    expect(service.findById(created.id)).toEqual(created);
  });

  it('throws 404 when the driver does not exist', () => {
    expectHttpError(() => service.findById('missing-id'), 404);
  });

  it('lists all drivers', () => {
    service.create({ name: 'John Doe' });
    service.create({ name: 'Jane Doe' });

    expect(service.list()).toHaveLength(2);
  });

  it('filters drivers by name, case-insensitively and partially', () => {
    service.create({ name: 'John Doe' });
    service.create({ name: 'Jane Smith' });

    expect(service.list('doe')).toHaveLength(1);
    expect(service.list('JANE')[0].name).toBe('Jane Smith');
    expect(service.list('mary')).toHaveLength(0);
  });

  it('updates the driver name', () => {
    const created = service.create({ name: 'John Doe' });

    const updated = service.update(created.id, { name: 'Johnny Doe' });

    expect(updated).toEqual({ id: created.id, name: 'Johnny Doe' });
    expect(drivers.findById(created.id)).toEqual(updated);
  });

  it('requires the name to update', () => {
    const created = service.create({ name: 'John Doe' });

    expectHttpError(() => service.update(created.id, {}), 400);
    expectHttpError(() => service.update(created.id, { name: '' }), 400);
  });

  it('throws 404 when updating a missing driver', () => {
    expectHttpError(() => service.update('missing-id', { name: 'John Doe' }), 404);
  });

  it('deletes a driver', () => {
    const created = service.create({ name: 'John Doe' });

    service.delete(created.id);

    expect(drivers.findById(created.id)).toBeUndefined();
  });

  it('throws 404 when deleting a missing driver', () => {
    expectHttpError(() => service.delete('missing-id'), 404);
  });

  it('does not delete a driver referenced by a usage record', () => {
    const created = service.create({ name: 'John Doe' });
    usages.save({
      id: 'usage-id',
      automobileId: 'automobile-id',
      driverId: created.id,
      startDate: '2026-01-10T08:00:00.000Z',
      endDate: null,
      reason: 'Delivery',
    });

    expectHttpError(() => service.delete(created.id), 409);
    expect(drivers.findById(created.id)).toBeDefined();
  });
});

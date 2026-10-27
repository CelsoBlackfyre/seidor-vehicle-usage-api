import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Driver } from '../src/domain/models';
import { AutomobileRepository } from '../src/repositories/automobile.repository';
import { InMemoryRepository } from '../src/repositories/in-memory.repository';
import { UsageRepository } from '../src/repositories/usage.repository';
import { UsageService } from '../src/services/usage.service';
import { expectHttpError } from './test-helpers';

describe('UsageService', () => {
  let usageRepository: UsageRepository;
  let automobileRepository: AutomobileRepository;
  let driverRepository: InMemoryRepository<Driver>;
  let service: UsageService;
  let automobileId: string;
  let secondAutomobileId: string;
  let driverId: string;
  let secondDriverId: string;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-12T18:30:00.000Z'));
    usageRepository = new UsageRepository();
    automobileRepository = new AutomobileRepository();
    driverRepository = new InMemoryRepository<Driver>();
    service = new UsageService(usageRepository, automobileRepository, driverRepository);

    automobileId = automobileRepository.save({ id: 'automobile-1', plate: 'ABC1234', color: 'Red', brand: 'Toyota' }).id;
    secondAutomobileId = automobileRepository.save({
      id: 'automobile-2',
      plate: 'DEF5678',
      color: 'Blue',
      brand: 'Honda',
    }).id;
    driverId = driverRepository.save({ id: 'driver-1', name: 'John Doe' }).id;
    secondDriverId = driverRepository.save({ id: 'driver-2', name: 'Jane Smith' }).id;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createUsage(overrides: Record<string, unknown> = {}) {
    return service.create({
      automobileId,
      driverId,
      startDate: '2026-01-10T08:00:00.000Z',
      reason: 'Delivery to client',
      ...overrides,
    });
  }

  it('registers the usage of an automobile by a driver', () => {
    const usage = createUsage();

    expect(usage).toMatchObject({
      automobile: { id: automobileId, plate: 'ABC1234', color: 'Red', brand: 'Toyota' },
      driver: { id: driverId, name: 'John Doe' },
      startDate: '2026-01-10T08:00:00.000Z',
      endDate: null,
      reason: 'Delivery to client',
    });
    expect(usage.id).toEqual(expect.any(String));
    expect(usageRepository.findById(usage.id)).toEqual({
      id: usage.id,
      automobileId,
      driverId,
      startDate: '2026-01-10T08:00:00.000Z',
      endDate: null,
      reason: 'Delivery to client',
    });
  });

  it('requires automobileId, driverId, startDate and reason', () => {
    expectHttpError(() => service.create({ driverId, startDate: '2026-01-10T08:00:00.000Z', reason: 'X' }), 400);
    expectHttpError(() => service.create({ automobileId, startDate: '2026-01-10T08:00:00.000Z', reason: 'X' }), 400);
    expectHttpError(() => service.create({ automobileId, driverId, reason: 'X' }), 400);
    expectHttpError(() => service.create({ automobileId, driverId, startDate: '2026-01-10T08:00:00.000Z' }), 400);
  });

  it('rejects an invalid start date', () => {
    expectHttpError(() => createUsage({ startDate: 'not-a-date' }), 400);
  });

  it('rejects a future start date without saving a usage', () => {
    expectHttpError(() => createUsage({ startDate: '2026-01-12T18:30:00.001Z' }), 400);
    expect(service.list()).toEqual([]);
  });

  it('accepts a start date equal to the current time', () => {
    expect(createUsage({ startDate: new Date().toISOString() }).endDate).toBeNull();
  });

  it('throws 404 when the automobile does not exist', () => {
    expectHttpError(() => createUsage({ automobileId: 'missing-automobile' }), 404);
  });

  it('throws 404 when the driver does not exist', () => {
    expectHttpError(() => createUsage({ driverId: 'missing-driver' }), 404);
  });

  it('does not allow an automobile to be used by two drivers at the same time', () => {
    createUsage();

    expectHttpError(() => createUsage({ driverId: secondDriverId }), 409);
  });

  it('does not allow a driver to use two automobiles at the same time', () => {
    createUsage();

    expectHttpError(() => createUsage({ automobileId: secondAutomobileId }), 409);
  });

  it('allows a finished usage to be registered again', () => {
    const usage = createUsage();
    const finished = service.finish(usage.id);

    const secondUsage = service.create({
      automobileId,
      driverId,
      startDate: finished.endDate,
      reason: 'Second delivery',
    });

    expect(secondUsage.endDate).toBeNull();
  });

  it.each(['before', 'during'] as const)('rejects automobile usage starting %s a completed usage', (position) => {
    const usage = createUsage();
    service.finish(usage.id);

    expectHttpError(() => createUsage({
      driverId: secondDriverId,
      startDate: position === 'before' ? '2026-01-09T08:00:00.000Z' : '2026-01-11T08:00:00.000Z',
    }), 409);
    expect(service.list()).toHaveLength(1);
  });

  it.each(['before', 'during'] as const)('rejects driver usage starting %s a completed usage', (position) => {
    const usage = createUsage();
    service.finish(usage.id);

    expectHttpError(() => createUsage({
      automobileId: secondAutomobileId,
      startDate: position === 'before' ? '2026-01-09T08:00:00.000Z' : '2026-01-11T08:00:00.000Z',
    }), 409);
    expect(service.list()).toHaveLength(1);
  });

  it('allows usage after the previous period ends', () => {
    const usage = createUsage();
    service.finish(usage.id);
    vi.setSystemTime(new Date('2026-01-13T18:30:00.000Z'));

    expect(createUsage({ startDate: '2026-01-13T08:00:00.000Z' }).endDate).toBeNull();
  });

  it('allows independent resources during the same period', () => {
    const usage = createUsage();
    service.finish(usage.id);

    expect(createUsage({ automobileId: secondAutomobileId, driverId: secondDriverId }).endDate).toBeNull();
  });

  it('finishes a usage storing the end date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T18:30:00.000Z'));
    const usage = createUsage();

    const finished = service.finish(usage.id);

    expect(finished.endDate).toBe('2026-01-10T18:30:00.000Z');
    expect(usageRepository.findById(usage.id)?.endDate).toBe('2026-01-10T18:30:00.000Z');
  });

  it('does not finish a usage twice', () => {
    const usage = createUsage();
    service.finish(usage.id);

    expectHttpError(() => service.finish(usage.id), 409);
  });

  it('does not finish before the start time if the system clock moves backwards', () => {
    const usage = createUsage();
    vi.setSystemTime(new Date('2026-01-10T07:59:59.999Z'));

    expectHttpError(() => service.finish(usage.id), 409);
    expect(usageRepository.findById(usage.id)?.endDate).toBeNull();

    vi.setSystemTime(new Date('2026-01-10T08:00:00.000Z'));
    expect(service.finish(usage.id).endDate).toBe(usage.startDate);
  });

  it('throws 404 when finishing a missing usage', () => {
    expectHttpError(() => service.finish('missing-id'), 404);
  });

  it('lists usages with automobile and driver details, most recent first', () => {
    createUsage({ startDate: '2026-01-10T08:00:00.000Z' });
    service.create({
      automobileId: secondAutomobileId,
      driverId: secondDriverId,
      startDate: '2026-01-12T08:00:00.000Z',
      reason: 'Later usage',
    });

    const usages = service.list();

    expect(usages).toHaveLength(2);
    expect(usages[0].startDate).toBe('2026-01-12T08:00:00.000Z');
    expect(usages[0].automobile.plate).toBe('DEF5678');
    expect(usages[0].driver.name).toBe('Jane Smith');
    expect(usages[1].automobile.plate).toBe('ABC1234');
  });

  it('returns an empty list when there are no usages', () => {
    expect(service.list()).toEqual([]);
  });
});

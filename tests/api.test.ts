import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { Automobile, Driver, UsageDetails } from '../src/domain/models';

describe('Vehicle usage API', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-12T18:30:00.000Z'));
    app = createApp();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function createAutomobile(overrides: Partial<Omit<Automobile, 'id'>> = {}): Promise<Automobile> {
    const response = await request(app)
      .post('/automobiles')
      .send({ plate: 'ABC1234', color: 'Red', brand: 'Toyota', ...overrides })
      .expect(201);
    return response.body;
  }

  async function createDriver(name = 'John Doe'): Promise<Driver> {
    const response = await request(app).post('/drivers').send({ name }).expect(201);
    return response.body;
  }

  async function createUsage(
    automobileId: string,
    driverId: string,
    overrides: Record<string, unknown> = {},
  ): Promise<UsageDetails> {
    const response = await request(app)
      .post('/usages')
      .send({
        automobileId,
        driverId,
        startDate: '2026-01-10T08:00:00.000Z',
        reason: 'Delivery to client',
        ...overrides,
      })
      .expect(201);
    return response.body;
  }

  describe('automobiles', () => {
    it('creates an automobile and retrieves it by id', async () => {
      const created = await createAutomobile();

      expect(created).toMatchObject({ plate: 'ABC1234', color: 'Red', brand: 'Toyota' });

      const response = await request(app).get(`/automobiles/${created.id}`).expect(200);
      expect(response.body).toEqual(created);
    });

    it('returns 400 when required fields are missing', async () => {
      const response = await request(app).post('/automobiles').send({ plate: 'ABC1234' }).expect(400);
      expect(response.body.error).toContain('color');
    });

    it('returns 409 when the plate is already registered', async () => {
      await createAutomobile();

      const response = await request(app)
        .post('/automobiles')
        .send({ plate: 'abc1234', color: 'Blue', brand: 'Honda' })
        .expect(409);
      expect(response.body.error).toContain('ABC1234');
    });

    it('lists automobiles and filters them by brand', async () => {
      await createAutomobile();
      await createAutomobile({ plate: 'DEF5678', color: 'Blue', brand: 'Honda' });

      const all = await request(app).get('/automobiles').expect(200);
      expect(all.body).toHaveLength(2);

      const filtered = await request(app).get('/automobiles').query({ brand: 'toyo' }).expect(200);
      expect(filtered.body).toHaveLength(1);
      expect(filtered.body[0].plate).toBe('ABC1234');
    });

    it('updates and deletes an automobile', async () => {
      const created = await createAutomobile();

      const updated = await request(app).put(`/automobiles/${created.id}`).send({ color: 'Black' }).expect(200);
      expect(updated.body).toMatchObject({ id: created.id, plate: 'ABC1234', color: 'Black', brand: 'Toyota' });

      await request(app).delete(`/automobiles/${created.id}`).expect(204);
      await request(app).get(`/automobiles/${created.id}`).expect(404);
    });

    it('returns 404 for an unknown automobile', async () => {
      await request(app).get('/automobiles/unknown-id').expect(404);
      await request(app).delete('/automobiles/unknown-id').expect(404);
      await request(app).put('/automobiles/unknown-id').send({ color: 'Black' }).expect(404);
    });

    it('returns 400 for an invalid JSON payload', async () => {
      const response = await request(app)
        .post('/automobiles')
        .set('Content-Type', 'application/json')
        .send('{"plate":')
        .expect(400);
      expect(response.body.error).toBe('Invalid JSON payload.');
    });
  });

  describe('drivers', () => {
    it('creates a driver and retrieves it by id', async () => {
      const created = await createDriver();

      expect(created.name).toBe('John Doe');

      const response = await request(app).get(`/drivers/${created.id}`).expect(200);
      expect(response.body).toEqual(created);
    });

    it('returns 400 when the name is missing', async () => {
      await request(app).post('/drivers').send({}).expect(400);
    });

    it('returns 413 for an oversized JSON body and continues serving requests', async () => {
      const response = await request(app).post('/drivers').send({ name: 'a'.repeat(110000) }).expect(413);

      expect(response.body).toEqual({ error: 'Request body exceeds the 100 KB limit.' });
      const drivers = await request(app).get('/drivers').expect(200);
      expect(drivers.body).toEqual([]);
      await createDriver();
    });

    it('lists drivers and filters them by name', async () => {
      await createDriver('John Doe');
      await createDriver('Jane Smith');

      const all = await request(app).get('/drivers').expect(200);
      expect(all.body).toHaveLength(2);

      const filtered = await request(app).get('/drivers').query({ name: 'smith' }).expect(200);
      expect(filtered.body).toHaveLength(1);
      expect(filtered.body[0].name).toBe('Jane Smith');
    });

    it('updates and deletes a driver', async () => {
      const created = await createDriver();

      const updated = await request(app).put(`/drivers/${created.id}`).send({ name: 'Johnny Doe' }).expect(200);
      expect(updated.body).toEqual({ id: created.id, name: 'Johnny Doe' });

      await request(app).delete(`/drivers/${created.id}`).expect(204);
      await request(app).get(`/drivers/${created.id}`).expect(404);
    });

    it('returns 404 for an unknown driver', async () => {
      await request(app).get('/drivers/unknown-id').expect(404);
      await request(app).put('/drivers/unknown-id').send({ name: 'John Doe' }).expect(404);
      await request(app).delete('/drivers/unknown-id').expect(404);
    });
  });

  describe('usages', () => {
    it('starts with an empty list', async () => {
      const response = await request(app).get('/usages').expect(200);
      expect(response.body).toEqual([]);
    });

    it('registers a usage and returns the automobile and driver details', async () => {
      const automobile = await createAutomobile();
      const driver = await createDriver();

      const usage = await createUsage(automobile.id, driver.id);

      expect(usage).toMatchObject({
        id: expect.any(String),
        automobile: { id: automobile.id, plate: 'ABC1234', color: 'Red', brand: 'Toyota' },
        driver: { id: driver.id, name: 'John Doe' },
        startDate: '2026-01-10T08:00:00.000Z',
        endDate: null,
        reason: 'Delivery to client',
      });
    });

    it('lists usages with the driver name and automobile information', async () => {
      const automobile = await createAutomobile();
      const driver = await createDriver();
      await createUsage(automobile.id, driver.id);

      const response = await request(app).get('/usages').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].driver.name).toBe('John Doe');
      expect(response.body[0].automobile).toMatchObject({ plate: 'ABC1234', color: 'Red', brand: 'Toyota' });
      expect(response.body[0].reason).toBe('Delivery to client');
    });

    it.each(['1', '2026-02-30T08:00:00Z', '2026-01-10T08:00:00', '2099-01-01T00:00:00Z'])(
      'returns 400 for an invalid or future start date: %s', async (startDate) => {
        const automobile = await createAutomobile();
        const driver = await createDriver();

        const response = await request(app).post('/usages').send({
          automobileId: automobile.id, driverId: driver.id, startDate, reason: 'Delivery',
        }).expect(400);

        expect(response.body.error).toContain('startDate');
        const usages = await request(app).get('/usages').expect(200);
        expect(usages.body).toEqual([]);
      },
    );

    it.each(['automobile', 'driver'] as const)('returns 409 for historical overlap involving the same %s', async (resource) => {
      const automobile = await createAutomobile();
      const driver = await createDriver();
      const usage = await createUsage(automobile.id, driver.id);
      await request(app).patch(`/usages/${usage.id}/finish`).expect(200);

      const nextAutomobile = resource === 'automobile' ? automobile : await createAutomobile({ plate: 'DEF5678' });
      const nextDriver = resource === 'driver' ? driver : await createDriver('Jane Smith');
      await request(app).post('/usages').send({
        automobileId: nextAutomobile.id,
        driverId: nextDriver.id,
        startDate: '2026-01-11T08:00:00.000Z',
        reason: 'Overlapping delivery',
      }).expect(409);

      const usages = await request(app).get('/usages').expect(200);
      expect(usages.body).toHaveLength(1);
    });

    it('does not allow an automobile to be used by two drivers at the same time', async () => {
      const automobile = await createAutomobile();
      const driver = await createDriver();
      const secondDriver = await createDriver('Jane Smith');
      await createUsage(automobile.id, driver.id);

      const response = await request(app)
        .post('/usages')
        .send({
          automobileId: automobile.id,
          driverId: secondDriver.id,
          startDate: '2026-01-10T09:00:00.000Z',
          reason: 'Another delivery',
        })
        .expect(409);

      expect(response.body.error).toContain('already in use');
    });

    it('does not allow a driver to use two automobiles at the same time', async () => {
      const automobile = await createAutomobile();
      const secondAutomobile = await createAutomobile({ plate: 'DEF5678', color: 'Blue', brand: 'Honda' });
      const driver = await createDriver();
      await createUsage(automobile.id, driver.id);

      const response = await request(app)
        .post('/usages')
        .send({
          automobileId: secondAutomobile.id,
          driverId: driver.id,
          startDate: '2026-01-10T09:00:00.000Z',
          reason: 'Another delivery',
        })
        .expect(409);

      expect(response.body.error).toContain('already using');
    });

    it('returns 404 when the automobile or the driver does not exist', async () => {
      const automobile = await createAutomobile();
      const driver = await createDriver();

      await request(app)
        .post('/usages')
        .send({
          automobileId: 'unknown-id',
          driverId: driver.id,
          startDate: '2026-01-10T08:00:00.000Z',
          reason: 'Delivery',
        })
        .expect(404);

      await request(app)
        .post('/usages')
        .send({
          automobileId: automobile.id,
          driverId: 'unknown-id',
          startDate: '2026-01-10T08:00:00.000Z',
          reason: 'Delivery',
        })
        .expect(404);
    });

    it('finishes a usage storing the end date and releases the resources', async () => {
      const automobile = await createAutomobile();
      const driver = await createDriver();
      const usage = await createUsage(automobile.id, driver.id);

      const finished = await request(app).patch(`/usages/${usage.id}/finish`).expect(200);

      expect(finished.body.endDate).toEqual(expect.any(String));
      expect(new Date(finished.body.endDate).getTime()).not.toBeNaN();

      const secondUsage = await createUsage(automobile.id, driver.id, {
        startDate: finished.body.endDate,
      });
      expect(secondUsage.endDate).toBeNull();
    });

    it('does not finish a usage twice', async () => {
      const automobile = await createAutomobile();
      const driver = await createDriver();
      const usage = await createUsage(automobile.id, driver.id);

      await request(app).patch(`/usages/${usage.id}/finish`).expect(200);
      await request(app).patch(`/usages/${usage.id}/finish`).expect(409);
    });

    it('returns 404 when finishing an unknown usage', async () => {
      await request(app).patch('/usages/unknown-id/finish').expect(404);
    });

    it('does not delete an automobile or a driver referenced by a usage', async () => {
      const automobile = await createAutomobile();
      const driver = await createDriver();
      await createUsage(automobile.id, driver.id);

      await request(app).delete(`/automobiles/${automobile.id}`).expect(409);
      await request(app).delete(`/drivers/${driver.id}`).expect(409);
    });
  });

  it('returns 404 for unknown routes and a health check for /health', async () => {
    await request(app).get('/unknown').expect(404);

    const response = await request(app).get('/health').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

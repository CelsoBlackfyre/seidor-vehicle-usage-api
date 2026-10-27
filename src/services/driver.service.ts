import { randomUUID } from 'node:crypto';
import { Driver } from '../domain/models';
import { HttpError } from '../errors/http-error';
import { InMemoryRepository } from '../repositories/in-memory.repository';
import { UsageRepository } from '../repositories/usage.repository';
import { optionalString, parseBody, requireString } from '../utils/validation';

export class DriverService {
  constructor(
    private readonly drivers: InMemoryRepository<Driver>,
    private readonly usages: UsageRepository,
  ) {}

  create(input: unknown): Driver {
    const body = parseBody(input);
    const name = requireString(body, 'name');

    return this.drivers.save({ id: randomUUID(), name });
  }

  list(name?: string): Driver[] {
    const drivers = this.drivers.findAll();
    if (name === undefined) {
      return drivers;
    }
    const term = name.trim().toLowerCase();
    return drivers.filter((driver) => driver.name.toLowerCase().includes(term));
  }

  findById(id: string): Driver {
    const driver = this.drivers.findById(id);
    if (!driver) {
      throw new HttpError(404, 'Driver not found.');
    }
    return driver;
  }

  update(id: string, input: unknown): Driver {
    const driver = this.findById(id);
    const body = parseBody(input);
    const name = optionalString(body, 'name');

    if (name === undefined) {
      throw new HttpError(400, 'Provide the "name" field to update.');
    }

    return this.drivers.save({ ...driver, name });
  }

  delete(id: string): void {
    this.findById(id);

    // Mesmo utilizações finalizadas precisam manter o vínculo com o motorista no histórico.
    if (this.usages.countByDriverId(id) > 0) {
      throw new HttpError(409, 'Driver cannot be deleted because it is referenced by usage records.');
    }

    this.drivers.delete(id);
  }
}

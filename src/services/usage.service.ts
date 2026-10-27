import { randomUUID } from 'node:crypto';
import { Driver, Usage, UsageDetails } from '../domain/models';
import { HttpError } from '../errors/http-error';
import { AutomobileRepository } from '../repositories/automobile.repository';
import { InMemoryRepository } from '../repositories/in-memory.repository';
import { UsageRepository } from '../repositories/usage.repository';
import { parseBody, requireIsoDate, requireString } from '../utils/validation';

export class UsageService {
  constructor(
    private readonly usages: UsageRepository,
    private readonly automobiles: AutomobileRepository,
    private readonly drivers: InMemoryRepository<Driver>,
  ) {}

  create(input: unknown): UsageDetails {
    const body = parseBody(input);
    const automobileId = requireString(body, 'automobileId');
    const driverId = requireString(body, 'driverId');
    const startDate = requireIsoDate(body, 'startDate');
    const reason = requireString(body, 'reason');

    if (Date.parse(startDate) > Date.now()) {
      throw new HttpError(400, 'Field "startDate" cannot be in the future.');
    }

    if (!this.automobiles.findById(automobileId)) {
      throw new HttpError(404, 'Automobile not found.');
    }

    if (!this.drivers.findById(driverId)) {
      throw new HttpError(404, 'Driver not found.');
    }

    // O histórico também entra na verificação para impedir sobreposições em registros retroativos.
    if (this.usages.findOverlappingByAutomobileId(automobileId, startDate)) {
      throw new HttpError(409, 'Automobile is already in use during the requested period.');
    }

    if (this.usages.findOverlappingByDriverId(driverId, startDate)) {
      throw new HttpError(409, 'Driver is already using an automobile during the requested period.');
    }

    const usage: Usage = {
      id: randomUUID(),
      automobileId,
      driverId,
      startDate,
      endDate: null,
      reason,
    };

    this.usages.save(usage);
    return this.toDetails(usage);
  }

  list(): UsageDetails[] {
    return this.usages
      .findAll()
      .sort((first, second) => second.startDate.localeCompare(first.startDate))
      .map((usage) => this.toDetails(usage));
  }

  finish(id: string): UsageDetails {
    const usage = this.usages.findById(id);
    if (!usage) {
      throw new HttpError(404, 'Usage not found.');
    }

    if (usage.endDate !== null) {
      throw new HttpError(409, 'Usage is already finished.');
    }

    const endDate = new Date();
    // Protege a ordem das datas mesmo se o relógio do servidor retroceder após o cadastro.
    if (endDate.getTime() < Date.parse(usage.startDate)) {
      throw new HttpError(409, 'Usage cannot finish before its start date.');
    }

    usage.endDate = endDate.toISOString();
    this.usages.save(usage);

    return this.toDetails(usage);
  }

  private toDetails(usage: Usage): UsageDetails {
    const automobile = this.automobiles.findById(usage.automobileId);
    const driver = this.drivers.findById(usage.driverId);

    // Uma referência ausente indica inconsistência interna, pois a exclusão de registros vinculados é bloqueada.
    if (!automobile || !driver) {
      throw new Error(`Data integrity error: missing records for usage "${usage.id}".`);
    }

    return {
      id: usage.id,
      automobile,
      driver,
      startDate: usage.startDate,
      endDate: usage.endDate,
      reason: usage.reason,
    };
  }
}

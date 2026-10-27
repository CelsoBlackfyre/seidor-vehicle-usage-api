import { Usage } from '../domain/models';
import { InMemoryRepository } from './in-memory.repository';

export class UsageRepository extends InMemoryRepository<Usage> {
  findOverlappingByAutomobileId(automobileId: string, startDate: string): Usage | undefined {
    return this.findAll().find((usage) => usage.automobileId === automobileId && this.overlapsOpenUsage(usage, startDate));
  }

  findOverlappingByDriverId(driverId: string, startDate: string): Usage | undefined {
    return this.findAll().find((usage) => usage.driverId === driverId && this.overlapsOpenUsage(usage, startDate));
  }

  private overlapsOpenUsage(usage: Usage, startDate: string): boolean {
    // A nova utilização fica em aberto até a finalização.
    // Há conflito se a utilização anterior ainda estiver aberta ou terminar após o novo início.
    return usage.endDate === null || Date.parse(usage.endDate) > Date.parse(startDate);
  }

  countByAutomobileId(automobileId: string): number {
    return this.findAll().filter((usage) => usage.automobileId === automobileId).length;
  }

  countByDriverId(driverId: string): number {
    return this.findAll().filter((usage) => usage.driverId === driverId).length;
  }
}

import { Automobile } from '../domain/models';
import { InMemoryRepository } from './in-memory.repository';

export class AutomobileRepository extends InMemoryRepository<Automobile> {
  findByPlate(plate: string): Automobile | undefined {
    return this.findAll().find((automobile) => automobile.plate === plate);
  }
}

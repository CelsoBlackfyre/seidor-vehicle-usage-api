import { randomUUID } from 'node:crypto';
import { Automobile } from '../domain/models';
import { HttpError } from '../errors/http-error';
import { AutomobileRepository } from '../repositories/automobile.repository';
import { UsageRepository } from '../repositories/usage.repository';
import { optionalString, parseBody, requireString } from '../utils/validation';

export class AutomobileService {
  constructor(
    private readonly automobiles: AutomobileRepository,
    private readonly usages: UsageRepository,
  ) {}

  create(input: unknown): Automobile {
    const body = parseBody(input);
    // A normalização impede placas duplicadas apenas por diferença entre maiúsculas e minúsculas.
    const plate = requireString(body, 'plate').toUpperCase();
    const color = requireString(body, 'color');
    const brand = requireString(body, 'brand');

    const existing = this.automobiles.findByPlate(plate);
    if (existing) {
      throw new HttpError(409, `An automobile with plate "${plate}" already exists.`);
    }

    return this.automobiles.save({ id: randomUUID(), plate, color, brand });
  }

  list(brand?: string): Automobile[] {
    const automobiles = this.automobiles.findAll();
    if (brand === undefined) {
      return automobiles;
    }
    const term = brand.trim().toLowerCase();
    return automobiles.filter((automobile) => automobile.brand.toLowerCase().includes(term));
  }

  findById(id: string): Automobile {
    const automobile = this.automobiles.findById(id);
    if (!automobile) {
      throw new HttpError(404, 'Automobile not found.');
    }
    return automobile;
  }

  update(id: string, input: unknown): Automobile {
    const automobile = this.findById(id);
    const body = parseBody(input);
    const plate = optionalString(body, 'plate')?.toUpperCase();
    const color = optionalString(body, 'color');
    const brand = optionalString(body, 'brand');

    if (plate === undefined && color === undefined && brand === undefined) {
      throw new HttpError(400, 'Provide at least one field to update: "plate", "color" or "brand".');
    }

    if (plate !== undefined) {
      const plateOwner = this.automobiles.findByPlate(plate);
      // Manter a própria placa é permitido; o conflito existe apenas se ela pertencer a outro automóvel.
      if (plateOwner && plateOwner.id !== id) {
        throw new HttpError(409, `An automobile with plate "${plate}" already exists.`);
      }
    }

    return this.automobiles.save({
      ...automobile,
      plate: plate ?? automobile.plate,
      color: color ?? automobile.color,
      brand: brand ?? automobile.brand,
    });
  }

  delete(id: string): void {
    this.findById(id);

    // Preserva os dados do automóvel necessários para consultar o histórico de utilizações.
    if (this.usages.countByAutomobileId(id) > 0) {
      throw new HttpError(409, 'Automobile cannot be deleted because it is referenced by usage records.');
    }

    this.automobiles.delete(id);
  }
}

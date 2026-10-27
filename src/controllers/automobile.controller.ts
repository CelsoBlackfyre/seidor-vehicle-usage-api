import { Request, Response } from 'express';
import { AutomobileService } from '../services/automobile.service';

type AutomobileParams = { id: string };

export class AutomobileController {
  constructor(private readonly service: AutomobileService) {}

  create = (request: Request, response: Response): void => {
    response.status(201).json(this.service.create(request.body));
  };

  list = (request: Request, response: Response): void => {
    const brand = typeof request.query.brand === 'string' ? request.query.brand : undefined;
    response.json(this.service.list(brand));
  };

  findById = (request: Request<AutomobileParams>, response: Response): void => {
    response.json(this.service.findById(request.params.id));
  };

  update = (request: Request<AutomobileParams>, response: Response): void => {
    response.json(this.service.update(request.params.id, request.body));
  };

  delete = (request: Request<AutomobileParams>, response: Response): void => {
    this.service.delete(request.params.id);
    response.status(204).send();
  };
}

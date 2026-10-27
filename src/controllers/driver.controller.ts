import { Request, Response } from 'express';
import { DriverService } from '../services/driver.service';

type DriverParams = { id: string };

export class DriverController {
  constructor(private readonly service: DriverService) {}

  create = (request: Request, response: Response): void => {
    response.status(201).json(this.service.create(request.body));
  };

  list = (request: Request, response: Response): void => {
    const name = typeof request.query.name === 'string' ? request.query.name : undefined;
    response.json(this.service.list(name));
  };

  findById = (request: Request<DriverParams>, response: Response): void => {
    response.json(this.service.findById(request.params.id));
  };

  update = (request: Request<DriverParams>, response: Response): void => {
    response.json(this.service.update(request.params.id, request.body));
  };

  delete = (request: Request<DriverParams>, response: Response): void => {
    this.service.delete(request.params.id);
    response.status(204).send();
  };
}

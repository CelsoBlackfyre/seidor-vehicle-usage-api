import { Request, Response } from 'express';
import { UsageService } from '../services/usage.service';

type UsageParams = { id: string };

export class UsageController {
  constructor(private readonly service: UsageService) {}

  create = (request: Request, response: Response): void => {
    response.status(201).json(this.service.create(request.body));
  };

  list = (_request: Request, response: Response): void => {
    response.json(this.service.list());
  };

  finish = (request: Request<UsageParams>, response: Response): void => {
    response.json(this.service.finish(request.params.id));
  };
}

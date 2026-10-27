import { Router } from 'express';
import { DriverController } from '../controllers/driver.controller';

export function createDriverRouter(controller: DriverController): Router {
  const router = Router();

  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.findById);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.delete);

  return router;
}

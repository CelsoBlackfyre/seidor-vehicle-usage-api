import { Router } from 'express';
import { AutomobileController } from '../controllers/automobile.controller';

export function createAutomobileRouter(controller: AutomobileController): Router {
  const router = Router();

  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.findById);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.delete);

  return router;
}

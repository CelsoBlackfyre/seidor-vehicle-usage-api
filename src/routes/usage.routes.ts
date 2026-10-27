import { Router } from 'express';
import { UsageController } from '../controllers/usage.controller';

export function createUsageRouter(controller: UsageController): Router {
  const router = Router();

  router.post('/', controller.create);
  router.get('/', controller.list);
  router.patch('/:id/finish', controller.finish);

  return router;
}

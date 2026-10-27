import express, { Express } from 'express';
import { AutomobileController } from './controllers/automobile.controller';
import { DriverController } from './controllers/driver.controller';
import { UsageController } from './controllers/usage.controller';
import { Driver } from './domain/models';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { AutomobileRepository } from './repositories/automobile.repository';
import { InMemoryRepository } from './repositories/in-memory.repository';
import { UsageRepository } from './repositories/usage.repository';
import { createAutomobileRouter } from './routes/automobile.routes';
import { createDriverRouter } from './routes/driver.routes';
import { createUsageRouter } from './routes/usage.routes';
import { AutomobileService } from './services/automobile.service';
import { DriverService } from './services/driver.service';
import { UsageService } from './services/usage.service';

export function createApp(): Express {
  // Cada instância da aplicação tem sua própria base em memória, isolando os dados entre testes.
  const automobileRepository = new AutomobileRepository();
  const driverRepository = new InMemoryRepository<Driver>();
  const usageRepository = new UsageRepository();

  const automobileService = new AutomobileService(automobileRepository, usageRepository);
  const driverService = new DriverService(driverRepository, usageRepository);
  const usageService = new UsageService(usageRepository, automobileRepository, driverRepository);

  const automobileController = new AutomobileController(automobileService);
  const driverController = new DriverController(driverService);
  const usageController = new UsageController(usageService);

  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/automobiles', createAutomobileRouter(automobileController));
  app.use('/drivers', createDriverRouter(driverController));
  app.use('/usages', createUsageRouter(usageController));

  // O 404 vem após as rotas; o tratamento de erros também recebe falhas do parser JSON.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

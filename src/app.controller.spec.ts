import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './modules/database/database.service';
import { HealthController } from './modules/health/health.controller';
import { HealthRepository } from './modules/health/health.repository';
import { HealthService } from './modules/health/health.service';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        HealthRepository,
        {
          provide: DatabaseService,
          useValue: {
            checkConnection: jest
              .fn()
              .mockResolvedValue({ status: 'up', latencyMs: 1 }),
          },
        },
      ],
    }).compile();

    healthController = app.get<HealthController>(HealthController);
  });

  describe('getHealth', () => {
    it('should return an ok health payload', async () => {
      const result = await healthController.getHealth();

      expect(result.status).toBe('ok');
      expect(typeof result.timestamp).toBe('string');
      expect(result.db.status).toBe('up');
    });
  });
});

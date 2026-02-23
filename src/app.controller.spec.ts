import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './modules/health/health.controller';
import { HealthRepository } from './modules/health/health.repository';
import { HealthService } from './modules/health/health.service';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService, HealthRepository],
    }).compile();

    healthController = app.get<HealthController>(HealthController);
  });

  describe('getHealth', () => {
    it('should return an ok health payload', () => {
      const result = healthController.getHealth();

      expect(result.status).toBe('ok');
      expect(typeof result.timestamp).toBe('string');
    });
  });
});

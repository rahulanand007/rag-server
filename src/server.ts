import { createApp } from './app';
import 'dotenv/config';
import { appConfig } from './config/app.config';

async function bootstrap() {
  const app = await createApp();
  await app.listen(appConfig.port);
  console.log(`Server is running on port ${appConfig.port}`);
}

bootstrap();

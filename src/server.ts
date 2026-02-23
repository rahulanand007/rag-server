import { createApp } from './app';
const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT || 3000;
async function bootstrap() {
  const app = await createApp();
  await app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
  });
}

bootstrap();

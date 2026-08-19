import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setMaxListeners } from 'node:events';

setMaxListeners(25);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:5173', 'https://rag-front-jizp.onrender.com'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3000;

  await app.listen(port, '0.0.0.0');

  console.log(`RAG Backend listening on ${port}`);

}
bootstrap();

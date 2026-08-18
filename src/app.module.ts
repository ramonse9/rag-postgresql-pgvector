import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsModule } from './documents/documents.module';
import { OpenaiService } from './openai/openai.service';
import { OpenaiModule } from './openai/openai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        ssl: {
          rejectUnauthorized: false, // Render usa certificados auto‑firmados
        },

        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASS'),
        database: configService.get<string>('DATABASE_NAME'),

        autoLoadEntities: true,
        synchronize: false,
      }),
    }),

    DocumentsModule,

    OpenaiModule
    
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    OpenaiService, 
  ],
})
export class AppModule {}

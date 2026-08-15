import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {

  constructor( private readonly dataSource: DataSource){}
  getHello(): string {
    //return 'Hello World!';
    return this.dataSource.isInitialized ? 'RAG API connected to PostgreSQL' : 'Database connection failed'
  }
}

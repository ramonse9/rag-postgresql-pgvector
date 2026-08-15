import 'dotenv/config';
import { join } from 'path';
import { DocumentChunk } from './../documents/entities/document-chunk.entity';
import { Document } from './../documents/entities/document.entity';
import { DataSource } from 'typeorm';


export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASS,
  database: process.env.DATABASE_NAME,
  schema: 'public',
  ssl: process.env.DB_SSL === 'true',
  extra: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined,
  entities: [
    Document,
    DocumentChunk
   ],
  migrations: [join(__dirname, './migrations', '*.{ts,js}')],
  synchronize: false,
  logging: false,
});
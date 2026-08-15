require('dotenv/config');
const { DataSource } = require('typeorm');

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASS,
  database: process.env.DATABASE_NAME,
  schema: 'public',

  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined,

  entities: [],
  synchronize: false,
});

async function test() {
  try {
    console.log('Connecting with TypeORM...');

    await dataSource.initialize();

    console.log('✅ TypeORM connection successful');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ TypeORM connection failed');
    console.error(error);
  }
}

test();
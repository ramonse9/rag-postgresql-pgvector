require('dotenv/config');
const { Client } = require('pg');

const client = new Client({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASS,
  database: process.env.DATABASE_NAME,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined,
});

async function test() {
  try {
    await client.connect();

    const result = await client.query('SELECT version()');

    console.log('✅ PostgreSQL connection successful');
    console.log(result.rows[0]);

    await client.end();
  } catch (error) {
    console.error('❌ PostgreSQL connection failed');
    console.error(error);
  }
}

test();
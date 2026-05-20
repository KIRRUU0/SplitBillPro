import pg from 'pg';
import fs from 'fs';

const connectionString = 'postgresql://postgres.hlvzdyolevhopxhrfihu:4drP6dclCQBqbcT9@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres';

const sql = fs.readFileSync('schema.sql', 'utf8');

const client = new pg.Client({ connectionString });

async function run() {
  await client.connect();
  console.log('Connected to Supabase database!');
  try {
    // Jalankan seluruh skema SQL
    await client.query(sql);
    console.log('Schema applied successfully!');
  } catch (err) {
    console.error('Error applying schema:', err);
  } finally {
    await client.end();
  }
}

run();

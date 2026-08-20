const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  
  try {
    await client.connect();
    console.log("Connected");
    const res = await client.query(`
      SELECT tgname, proname, prosrc 
      FROM pg_trigger 
      JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid 
      JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid 
      WHERE relname = 'inventions';
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Error", err);
  } finally {
    await client.end();
  }
}

main();

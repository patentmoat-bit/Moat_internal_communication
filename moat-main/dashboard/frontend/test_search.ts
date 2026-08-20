import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  try {
    const { searchPatentsFromBigQuery } = await import('./src/lib/bigquery.js');
    const results = await searchPatentsFromBigQuery("generative synthetic cyber threat");
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();

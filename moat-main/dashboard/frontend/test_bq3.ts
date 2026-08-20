import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  try {
    const { searchPatentsFromBigQuery } = await import('./src/lib/bigquery.js');
    console.log("Searching BigQuery for 'neuro vector symbolic artificial intelligence'...");
    const results = await searchPatentsFromBigQuery("neuro vector symbolic artificial intelligence");
    console.log(`Found ${results.length} results.`);
  } catch (err) {
    console.error("BigQuery Error:", err);
  }
}
run();

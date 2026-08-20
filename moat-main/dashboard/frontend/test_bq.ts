import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  try {
    const { searchPatentsFromBigQuery } = await import('./src/lib/bigquery.js');
    console.log("Searching BigQuery...");
    const results = await searchPatentsFromBigQuery("neuro symbolic");
    console.log(`Found ${results.length} results.`);
    if (results.length === 0) {
      console.log("No results found. This explains why it falls back to Perplexity.");
    }
  } catch (err) {
    console.error("BigQuery Error:", err);
  }
}
run();

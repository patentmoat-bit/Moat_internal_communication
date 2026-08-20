const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config({ path: '.env.local' });

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

async function query() {
  const q = `
    SELECT MAX(publication_date) as latest_date
    FROM \`patents-public-data.patents.publications\`
  `;

  try {
    const [rows] = await bigquery.query(q);
    console.log("LATEST_DATE:", rows[0].latest_date);
  } catch (err) {
    console.error(err);
  }
}

query();
